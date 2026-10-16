#!/usr/bin/env python3
"""MarkItDown Importer command-line interface. / MarkItDown Importer 命令行工具。"""

from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
BRIDGE_SCRIPT = PROJECT_DIR / "converter_bridge.py"
OCR_SCRIPT = PROJECT_DIR / "macos_ocr.swift"
PLUGIN_ID = "markitdown-importer"
REQUIRED_PACKAGES = {
    "markitdown": "markitdown",
    "imageio-ffmpeg": "imageio_ffmpeg",
    "youtube-transcript-api": "youtube_transcript_api",
    "yt-dlp": "yt_dlp",
}


class BilingualArgumentParser(argparse.ArgumentParser):
    """Show bilingual built-in argparse labels. / 将 argparse 内置标签显示为中英双语。"""

    def __init__(self, *args: object, **kwargs: object) -> None:
        kwargs["add_help"] = False
        super().__init__(*args, **kwargs)
        self.add_argument(
            "-h", "--help", action="help", default=argparse.SUPPRESS,
            help="Show this help message and exit / 显示帮助并退出",
        )
        self._positionals.title = "Positional arguments / 位置参数"
        self._optionals.title = "Options / 选项"


def vault_python_path(vault: Path) -> Path:
    """Return the vault-local Python path used by the plugin. / 返回插件使用的 vault 本地 Python 路径。"""
    if os.name == "nt":
        return vault / ".venv" / "Scripts" / "python.exe"
    return vault / ".venv" / "bin" / "python"


def python_version(python: str | Path, prefix_args: list[str] | None = None) -> tuple[int, int] | None:
    """Read the interpreter's major/minor version. / 读取 Python 主、次版本号。"""
    try:
        result = subprocess.run(
            [str(python), *(prefix_args or []), "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
        major, minor = result.stdout.strip().split(".", 1)
        return int(major), int(minor)
    except (OSError, subprocess.SubprocessError, ValueError):
        return None


def check_environment(vault: Path, python: Path, as_json: bool) -> int:
    """Check the plugin runtime without changing files. / 只读检查插件运行环境，不修改文件。"""
    packages: dict[str, bool] = {name: False for name in REQUIRED_PACKAGES}
    version: tuple[int, int] | None = None
    python_exists = python.is_file()
    if python_exists:
        version = python_version(python)
        if version:
            code = (
                "import importlib.util, json; "
                f"print(json.dumps({{name: importlib.util.find_spec(module) is not None for name, module in {REQUIRED_PACKAGES!r}.items()}}))"
            )
            try:
                result = subprocess.run(
                    [str(python), "-c", code], check=True, capture_output=True, text=True, timeout=30
                )
                packages = json.loads(result.stdout)
            except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
                packages = {name: False for name in REQUIRED_PACKAGES}

    report = {
        "vault": str(vault),
        "python": str(python),
        "python_exists": python_exists,
        "python_version": ".".join(map(str, version)) if version else None,
        "python_supported": bool(version and version >= (3, 10)),
        "packages": packages,
        "pytesseract": False,
        "system_ffmpeg": shutil.which("ffmpeg") is not None,
        "bridge_script": BRIDGE_SCRIPT.is_file(),
        "ocr_script": OCR_SCRIPT.is_file(),
    }
    if python_exists and version:
        try:
            result = subprocess.run(
                [str(python), "-c", "import importlib.util; print(importlib.util.find_spec('pytesseract') is not None)"],
                check=True, capture_output=True, text=True, timeout=10,
            )
            report["pytesseract"] = result.stdout.strip() == "True"
        except (OSError, subprocess.SubprocessError):
            pass
    report["ready"] = bool(
        report["python_exists"] and report["python_supported"] and all(packages.values()) and report["bridge_script"]
    )

    if as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"Vault / 知识库: {report['vault']}")
        print(f"Python: {report['python']} ({report['python_version'] or 'not found / 未找到'})")
        print(f"Python >= 3.10: {'ready / 就绪' if report['python_supported'] else 'missing or unsupported / 缺失或版本不支持'}")
        for name, installed in packages.items():
            print(f"{name}: {'installed / 已安装' if installed else 'missing / 缺失'}")
        print(f"pytesseract (optional / 可选): {'installed / 已安装' if report['pytesseract'] else 'missing / 缺失'}")
        print(f"System ffmpeg / 系统 ffmpeg: {'found / 已找到' if report['system_ffmpeg'] else 'not found / 未找到'}")
        print(f"Converter bridge / 转换桥接脚本: {'found / 已找到' if report['bridge_script'] else 'missing / 缺失'}")
        print(f"OCR script / OCR 脚本: {'found / 已找到' if report['ocr_script'] else 'missing / 缺失'}")
        print(f"Status / 状态: {'ready / 环境就绪' if report['ready'] else 'needs setup / 需要配置'}")
    return 0 if report["ready"] else 1


def find_bootstrap_python(requested: str | None) -> tuple[str, list[str], tuple[int, int]] | None:
    """Find Python 3.10+ for venv creation. / 查找用于创建虚拟环境的 Python 3.10+。"""
    candidates: list[tuple[str, list[str]]] = []
    if requested:
        candidates.append((requested, []))
    candidates.append((sys.executable, []))
    if os.name == "nt":
        candidates.extend([("py", [f"-3.{minor}"]) for minor in (13, 12, 11, 10)])
        candidates.extend((name, []) for name in ("python3", "python"))
    else:
        candidates.extend((f"python3.{minor}", []) for minor in (13, 12, 11, 10))
        candidates.append(("python3", []))
        candidates.append(("python", []))

    seen: set[tuple[str, tuple[str, ...]]] = set()
    for command, prefix_args in candidates:
        key = (command, tuple(prefix_args))
        if key in seen:
            continue
        seen.add(key)
        resolved = command if Path(command).is_file() else shutil.which(command)
        if not resolved:
            continue
        version = python_version(resolved, prefix_args)
        if version and version >= (3, 10):
            return resolved, prefix_args, version
    return None


def save_plugin_python_path(vault: Path, python: Path) -> None:
    """Update only pythonPath and preserve other plugin settings. / 仅更新 pythonPath，保留其他插件设置。"""
    data_path = vault / ".obsidian" / "plugins" / PLUGIN_ID / "data.json"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = json.loads(data_path.read_text(encoding="utf-8")) if data_path.exists() else {}
        if not isinstance(data, dict):
            raise ValueError("Plugin data.json must contain a JSON object / 插件 data.json 必须是 JSON 对象。")
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not read plugin settings at {data_path} / 无法读取插件设置：{exc}") from exc
    data["pythonPath"] = str(python)
    temporary_path = data_path.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(data_path)


def install_environment(vault: Path, bootstrap_python: str | None, index_url: str | None) -> int:
    """Create/update the vault venv and install plugin dependencies. / 创建或更新 vault 环境并安装插件依赖。"""
    if not vault.is_dir() or not (vault / ".obsidian").is_dir():
        print(f"Not an Obsidian vault (missing .obsidian directory) / 目标不是 Obsidian vault（缺少 .obsidian 目录）: {vault}", file=sys.stderr)
        return 2
    selected = find_bootstrap_python(bootstrap_python)
    if not selected:
        print("Python 3.10+ was not found; install it or pass --python / 未找到 Python 3.10+，请先安装或通过 --python 指定。", file=sys.stderr)
        return 1
    command, prefix_args, version = selected
    venv_dir = vault / ".venv"
    venv_python = vault_python_path(vault)
    print(f"Using Python {version[0]}.{version[1]} / 使用 Python: {command}")
    print(f"Creating or updating environment / 创建或更新环境: {venv_dir}")
    try:
        subprocess.run([command, *prefix_args, "-m", "venv", str(venv_dir)], check=True)
        print("Upgrading pip / 升级 pip...")
        pip_args = [str(venv_python), "-m", "pip", "install"]
        if index_url:
            pip_args.extend(("--index-url", index_url))
        subprocess.run([*pip_args, "--upgrade", "pip"], check=True)
        packages = ["markitdown[all]", "imageio-ffmpeg", "youtube-transcript-api", "yt-dlp"]
        if platform.system() != "Darwin":
            packages.append("pytesseract")
        print("Installing / 正在安装: " + ", ".join(packages))
        subprocess.run([*pip_args, *packages], check=True)
        save_plugin_python_path(vault, venv_python)
    except (OSError, subprocess.CalledProcessError, ValueError) as exc:
        print(f"Environment setup failed / 环境配置失败: {exc}", file=sys.stderr)
        return 1
    print(f"Environment ready / 环境就绪: {venv_python}")
    print("Plugin settings updated with the vault-local Python path / 已将 vault 本地 Python 路径写入插件设置。")
    return check_environment(vault, venv_python, as_json=False)


def environment_cli(argv: list[str]) -> int:
    """Parse environment-management commands. / 解析环境管理子命令。"""
    parser = BilingualArgumentParser(
        prog="cli.py env",
        description=(
            "Check or configure the local Python environment used by an Obsidian vault. "
            "Installation targets vault/.venv, the same environment used by the plugin settings page. / "
            "检查或设置 Obsidian vault 使用的本地 Python 环境。安装目标固定为 vault/.venv，与插件设置页使用同一环境。"
        ),
        epilog=(
            "Examples / 示例:\n"
            "  python3 cli.py env check --vault ~/Notes\n"
            "  python3 cli.py env check --vault ~/Notes --json\n"
            "  python3 cli.py env install --vault ~/Notes\n"
            "  python3 cli.py env install --vault ~/Notes --python python3.12\n\n"
            "Exit codes: 0 = ready or installed; 1 = environment is incomplete or installation failed; "
            "2 = invalid arguments or target is not an Obsidian vault. / "
            "退出码：0 = 环境就绪或安装成功；1 = 环境缺项或安装失败；2 = 参数错误或目标不是 Obsidian vault。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    commands = parser.add_subparsers(dest="action", required=True)
    check_parser = commands.add_parser(
        "check",
        help="Check the vault Python and plugin dependencies (read-only) / 只读检查 vault Python 与插件依赖。",
        description="Check the Python and dependencies used by the plugin in vault/.venv without changing files. / 检查 vault/.venv 中插件实际使用的 Python 和依赖，不安装或修改文件。",
        epilog=(
            "Checks / 检查项:\n"
            "  Required: Python 3.10+, markitdown, imageio-ffmpeg, youtube-transcript-api, yt-dlp, converter bridge.\n"
            "  Optional or informational: pytesseract (non-macOS image OCR), system ffmpeg, macOS OCR script.\n\n"
            "Exit codes: 0 = required items are ready; 1 = Python, a required dependency, or the bridge is missing.\n"
            "--json returns fields such as python, python_version, packages, and ready. / "
            "检查项：必需项为 Python 3.10+、markitdown、imageio-ffmpeg、youtube-transcript-api、yt-dlp 和转换桥接脚本；"
            "可选或提示项为 pytesseract、系统 ffmpeg 和 macOS OCR 脚本。\n"
            "退出码：0 = 必需项就绪；1 = 缺少 Python、必需依赖或桥接脚本。--json 返回 python、python_version、packages、ready 等字段。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    check_parser.add_argument("--vault", type=Path, default=Path.cwd(), metavar="PATH/路径", help="Obsidian vault root (default: current directory) / Obsidian vault 根目录（默认当前目录）。")
    check_parser.add_argument("--python", type=Path, metavar="PATH/路径", help="Python executable to check (default: vault/.venv) / 覆盖检测的 Python 可执行文件（默认检查 vault/.venv）。")
    check_parser.add_argument("--json", action="store_true", help="Print machine-readable check results as JSON / 以 JSON 输出机器可读的检查结果。")
    install_parser = commands.add_parser(
        "install",
        help="Create or update vault/.venv and install plugin dependencies / 创建或更新 vault/.venv 并安装插件依赖。",
        description=(
            "Create or update .venv in the target vault, install MarkItDown, audio, and YouTube dependencies, "
            "then save its Python path in the plugin data.json. / "
            "在目标 vault 创建或更新 .venv，安装 MarkItDown、音频和 YouTube 依赖，然后将 .venv 的 Python 路径写入插件 data.json。"
        ),
        epilog=(
            "Installation / 安装行为:\n"
            "  - Target must be an existing Obsidian vault containing .obsidian.\n"
            "  - Finds Python 3.10+ automatically; use --python to select an executable or command.\n"
            "  - Installs markitdown[all], imageio-ffmpeg, youtube-transcript-api, and yt-dlp; pytesseract is also installed off macOS.\n"
            "    A system Tesseract executable must be installed separately.\n"
            "  - Preserves other data.json settings and updates pythonPath; --index-url applies only to this pip run. /\n"
            "安装行为：目标必须是包含 .obsidian 的 Obsidian vault；自动查找 Python 3.10+，也可用 --python 指定；"
            "安装上述依赖（非 macOS 还安装 pytesseract，系统 Tesseract 需另装）；保留 data.json 其他设置，只更新 pythonPath。\n\n"
            "Examples / 示例:\n"
            "  python3 cli.py env install --vault ~/Notes --python /opt/homebrew/bin/python3.12\n"
            "  python3 cli.py env install --vault ~/Notes --index-url https://pypi.org/simple"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    install_parser.add_argument("--vault", type=Path, default=Path.cwd(), metavar="PATH/路径", help="Obsidian vault root (default: current directory) / Obsidian vault 根目录（默认当前目录）。")
    install_parser.add_argument("--python", metavar="COMMAND/命令或路径", help="Python executable used to create .venv (3.10+; auto-discovered if omitted) / 创建 .venv 使用的 Python（需为 3.10+；省略时自动查找）。")
    install_parser.add_argument("--index-url", metavar="URL", help="Package index for this pip run; global pip configuration is unchanged / 本次 pip 升级和安装使用的软件源，不修改全局配置。")
    args = parser.parse_args(argv)
    vault = args.vault.expanduser().resolve()
    if args.action == "check":
        python = args.python.expanduser().resolve() if args.python else vault_python_path(vault)
        return check_environment(vault, python, args.json)
    return install_environment(vault, args.python, args.index_url)


def parse_args() -> argparse.Namespace:
    """Build the import command parser. / 构建转换命令参数解析器。"""
    parser = BilingualArgumentParser(
        usage="%(prog)s <SOURCE/来源...> [OPTIONS/选项] | %(prog)s env <check|install> [OPTIONS/选项]",
        description=(
            "Convert files, folders, web pages, YouTube, and Bilibili sources to Markdown notes in an Obsidian vault. "
            "Uses the plugin's conversion features and does not require the Obsidian desktop app to be running. / "
            "将文件、文件夹、网页、YouTube 和 Bilibili 来源转换为 Markdown 笔记并写入指定 vault；不依赖 Obsidian 桌面进程。"
        ),
        epilog=(
            "Sources: PDF/Office/image/audio/text files, folders, HTTP(S) pages, YouTube, and Bilibili URLs.\n"
            "Local files remain in place; Markdown is written to the vault. Hooks can extend the file types that can be preprocessed. / "
            "来源：PDF/Office/图片/音频/文本文件、文件夹、HTTP(S) 网页、YouTube 和 Bilibili 链接。本地文件保留在原处，Markdown 写入 vault。\n\n"
            "Examples / 示例:\n"
            "  python cli.py ./资料/报告.pdf https://example.com --vault ~/Notes\n"
            "  python cli.py ./资料 --vault ~/Notes --dest 待整理/导入 --no-recursive\n"
            "  python cli.py video-url --vault ~/Notes --json\n"
            "  python cli.py ./资料 --vault ~/Notes --overwrite\n\n"
            "Environment management / 环境管理:\n"
            "  python cli.py env check --vault ~/Notes\n"
            "  python cli.py env install --vault ~/Notes\n"
            "  python cli.py env --help\n\n"
            "Hooks default to .obsidian/plugins/markitdown-importer/data.json in the vault; use --hooks-config to select another config. / "
            "Hook 默认读取 vault 的 .obsidian/plugins/markitdown-importer/data.json，也可用 --hooks-config 指定其他配置。\n\n"
            "Use a Python environment with the project dependencies. If they are installed in the vault .venv, run on macOS/Linux:\n"
            "  <vault>/.venv/bin/python cli.py <source> --vault <vault>\n"
            "On Windows: <vault>/.venv/Scripts/python.exe / Windows 对应路径：<vault>/.venv/Scripts/python.exe\n\n"
            "Exit codes: 0 = all sources converted; 1 = one or more sources failed or the converter could not start; "
            "2 = invalid command-line arguments. / 退出码：0 = 全部来源转换成功；1 = 至少一项失败或转换器无法启动；2 = 命令行参数错误。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "sources",
        nargs="+",
        metavar="SOURCE/来源",
        help="File, folder, or URL to convert; repeat for multiple sources / 要转换的文件路径、文件夹路径或 URL；可一次传入多个来源。",
    )
    parser.add_argument(
        "--vault",
        type=Path,
        default=Path.cwd(),
        metavar="PATH/路径",
        help="Vault root for converted notes (default: current directory) / Obsidian vault 根目录，转换结果写入该 vault（默认当前目录）。",
    )
    parser.add_argument(
        "--dest",
        default="00_Inbox/Imports",
        metavar="DIR/目录",
        help="Output folder inside the vault (default: 00_Inbox/Imports) / vault 内的笔记输出目录（默认：00_Inbox/Imports）。",
    )
    parser.add_argument(
        "--recursive",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Recursively process supported files in folders (enabled by default; disable with --no-recursive) / 递归处理文件夹中的受支持文件（默认开启；使用 --no-recursive 关闭）。",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite same-name Markdown notes; by default, add a number to preserve existing notes / 覆盖同名 Markdown 笔记；默认添加编号以保留已有内容。",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print per-source status, output path, and errors as JSON / 以 JSON 输出每个来源的状态、输出路径和错误信息。",
    )
    parser.add_argument(
        "--hooks-config",
        type=Path,
        metavar="FILE/文件",
        help="Hook text file or plugin data.json (default: hooksText in vault settings) / 指定 Hook 多行文本文件或插件 data.json（默认读取 vault 插件设置中的 hooksText）。",
    )
    return parser.parse_args()


def main() -> int:
    """Dispatch import or environment commands. / 分发转换或环境管理命令。"""
    if len(sys.argv) > 1 and sys.argv[1] == "env":
        return environment_cli(sys.argv[2:])
    args = parse_args()
    vault = args.vault.expanduser().resolve()

    bridge_args = [
        str(BRIDGE_SCRIPT),
        "--vault",
        str(vault),
        "--dest",
        args.dest,
        "--ocr-script",
        str(OCR_SCRIPT),
    ]
    if args.hooks_config:
        bridge_args.extend(("--hooks-config", str(args.hooks_config.expanduser().resolve())))
    if args.recursive:
        bridge_args.append("--recursive")
    if args.overwrite:
        bridge_args.append("--overwrite")
    for source in args.sources:
        bridge_args.extend(("--source", source))

    try:
        completed = subprocess.run(
            [sys.executable, *bridge_args],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30 * 60,
        )
    except subprocess.TimeoutExpired:
        print("Import timed out after 30 minutes / 导入超过 30 分钟，已超时。", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Could not start the converter / 无法启动转换器: {exc}", file=sys.stderr)
        return 1

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError:
        detail = completed.stderr.strip() or completed.stdout.strip() or "Converter returned no result / 转换器未返回结果。"
        print(detail, file=sys.stderr)
        return completed.returncode or 1

    results = payload.get("results", [])
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for result in results:
            if result.get("ok"):
                print(f"[OK / 成功] {result.get('source', '')} -> {result.get('output', '')}")
            else:
                print(f"[FAIL / 失败] {result.get('source', '')}: {result.get('error', 'Unknown error / 未知错误')}")
        succeeded = sum(bool(result.get("ok")) for result in results)
        print(f"Imported / 已导入: {succeeded}/{len(results)} item(s) / 项。")

    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
