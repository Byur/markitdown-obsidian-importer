#!/usr/bin/env python3
"""User-facing command line interface for MarkItDown Importer."""

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


def vault_python_path(vault: Path) -> Path:
    if os.name == "nt":
        return vault / ".venv" / "Scripts" / "python.exe"
    return vault / ".venv" / "bin" / "python"


def python_version(python: str | Path, prefix_args: list[str] | None = None) -> tuple[int, int] | None:
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
        print(f"Vault: {report['vault']}")
        print(f"Python: {report['python']} ({report['python_version'] or 'not found'})")
        print(f"Python >= 3.10: {'ready' if report['python_supported'] else 'missing/unsupported'}")
        for name, installed in packages.items():
            print(f"{name}: {'installed' if installed else 'missing'}")
        print(f"pytesseract (optional): {'installed' if report['pytesseract'] else 'missing'}")
        print(f"System ffmpeg: {'found' if report['system_ffmpeg'] else 'not found'}")
        print(f"Converter bridge: {'found' if report['bridge_script'] else 'missing'}")
        print(f"OCR script: {'found' if report['ocr_script'] else 'missing'}")
        print(f"Status: {'ready' if report['ready'] else 'needs setup'}")
    return 0 if report["ready"] else 1


def find_bootstrap_python(requested: str | None) -> tuple[str, list[str], tuple[int, int]] | None:
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
    data_path = vault / ".obsidian" / "plugins" / PLUGIN_ID / "data.json"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = json.loads(data_path.read_text(encoding="utf-8")) if data_path.exists() else {}
        if not isinstance(data, dict):
            raise ValueError("Plugin data.json must contain a JSON object.")
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not read plugin settings at {data_path}: {exc}") from exc
    data["pythonPath"] = str(python)
    temporary_path = data_path.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(data_path)


def install_environment(vault: Path, bootstrap_python: str | None, index_url: str | None) -> int:
    if not vault.is_dir() or not (vault / ".obsidian").is_dir():
        print(f"Not an Obsidian vault (missing .obsidian directory): {vault}", file=sys.stderr)
        return 2
    selected = find_bootstrap_python(bootstrap_python)
    if not selected:
        print("Python 3.10 or newer was not found. Install it or pass --python.", file=sys.stderr)
        return 1
    command, prefix_args, version = selected
    venv_dir = vault / ".venv"
    venv_python = vault_python_path(vault)
    print(f"Using Python {version[0]}.{version[1]}: {command}")
    print(f"Creating/updating environment: {venv_dir}")
    try:
        subprocess.run([command, *prefix_args, "-m", "venv", str(venv_dir)], check=True)
        print("Upgrading pip...")
        pip_args = [str(venv_python), "-m", "pip", "install"]
        if index_url:
            pip_args.extend(("--index-url", index_url))
        subprocess.run([*pip_args, "--upgrade", "pip"], check=True)
        packages = ["markitdown[all]", "imageio-ffmpeg", "youtube-transcript-api", "yt-dlp"]
        if platform.system() != "Darwin":
            packages.append("pytesseract")
        print("Installing: " + ", ".join(packages))
        subprocess.run([*pip_args, *packages], check=True)
        save_plugin_python_path(vault, venv_python)
    except (OSError, subprocess.CalledProcessError, ValueError) as exc:
        print(f"Environment setup failed: {exc}", file=sys.stderr)
        return 1
    print(f"Environment ready: {venv_python}")
    print("Plugin settings updated with the vault-local Python path.")
    return check_environment(vault, venv_python, as_json=False)


def environment_cli(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="cli.py env",
        description=(
            "检查或设置 Obsidian vault 使用的本地 Python 环境。安装目标固定为 vault/.venv，"
            "与插件设置页使用同一环境。"
        ),
        epilog=(
            "示例:\n"
            "  python3 cli.py env check --vault ~/Notes\n"
            "  python3 cli.py env check --vault ~/Notes --json\n"
            "  python3 cli.py env install --vault ~/Notes\n"
            "  python3 cli.py env install --vault ~/Notes --python python3.12\n\n"
            "退出码：0 表示检查/安装成功；1 表示环境未就绪或安装失败；2 表示参数错误或目标不是 Obsidian vault。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    commands = parser.add_subparsers(dest="action", required=True)
    check_parser = commands.add_parser(
        "check",
        help="只读检查 vault Python 与插件依赖。",
        description="检查 vault/.venv 中插件实际使用的 Python 和依赖，不安装或修改文件。",
        epilog=(
            "检查项:\n"
            "  必需：Python 3.10+、markitdown、imageio-ffmpeg、youtube-transcript-api、yt-dlp、转换桥接脚本。\n"
            "  可选/提示：pytesseract（非 macOS 图片 OCR）、系统 ffmpeg、macOS OCR 脚本。\n\n"
            "退出码：0 表示必需项就绪；1 表示缺少 Python、必需依赖或桥接脚本。\n"
            "--json 输出包含 python、python_version、packages、ready 等字段。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    check_parser.add_argument("--vault", type=Path, default=Path.cwd(), metavar="路径", help="Obsidian vault 根目录；默认当前目录。")
    check_parser.add_argument("--python", type=Path, metavar="路径", help="覆盖检测的 Python 可执行文件；默认检查 vault/.venv 中的 Python。")
    check_parser.add_argument("--json", action="store_true", help="以 JSON 输出机器可读的检查结果。")
    install_parser = commands.add_parser(
        "install",
        help="创建/更新 vault/.venv 并安装插件依赖。",
        description=(
            "在目标 vault 创建或更新 .venv，安装 MarkItDown、音频和 YouTube 依赖，"
            "然后将 .venv 的 Python 路径写入插件 data.json。"
        ),
        epilog=(
            "安装行为:\n"
            "  - 目标必须是已有 Obsidian vault（目录中含 .obsidian）。\n"
            "  - 自动查找 Python 3.10+；也可通过 --python 指定可执行文件/命令。\n"
            "  - 安装 markitdown[all]、imageio-ffmpeg、youtube-transcript-api 和 yt-dlp；\n"
            "    非 macOS 还会安装 pytesseract（系统 Tesseract 需另行安装）。\n"
            "  - 保留 data.json 中其他设置，只更新 pythonPath；--index-url 只影响本次 pip 调用。\n\n"
            "示例:\n"
            "  python3 cli.py env install --vault ~/Notes --python /opt/homebrew/bin/python3.12\n"
            "  python3 cli.py env install --vault ~/Notes --index-url https://pypi.org/simple"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    install_parser.add_argument("--vault", type=Path, default=Path.cwd(), metavar="路径", help="Obsidian vault 根目录；默认当前目录。")
    install_parser.add_argument("--python", metavar="命令或路径", help="创建 .venv 使用的 Python；需为 3.10+。省略时自动查找。")
    install_parser.add_argument("--index-url", metavar="URL", help="本次 pip 升级和依赖安装使用的软件源；不修改全局 pip 配置。")
    args = parser.parse_args(argv)
    vault = args.vault.expanduser().resolve()
    if args.action == "check":
        python = args.python.expanduser().resolve() if args.python else vault_python_path(vault)
        return check_environment(vault, python, args.json)
    return install_environment(vault, args.python, args.index_url)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        usage="%(prog)s <来源...> [选项] | %(prog)s env <check|install> [选项]",
        description=(
            "将文件、文件夹、网页、YouTube 和 Bilibili 来源转换为 Markdown 笔记，"
            "并写入指定的 Obsidian vault。复用插件现有的转换能力；本命令本身不依赖 Obsidian 桌面进程。"
        ),
        epilog=(
            "来源示例：PDF/Office/图片/音频/文本文件、文件夹、http(s) 网页、YouTube 或 Bilibili 链接。\n"
            "本地文件会保留在原处；输出 Markdown 写入 vault 内目录。未配置 Hook 的来源受内置格式支持范围限制。\n"
            "配置 Hook 后，可按 Hook 规则扩展可预处理的文件扩展名。\n\n"
            "示例:\n"
            "  python cli.py ./资料/报告.pdf https://example.com --vault ~/Notes\n"
            "  python cli.py ./资料 --vault ~/Notes --dest 待整理/导入 --no-recursive\n"
            "  python cli.py video-url --vault ~/Notes --json\n"
            "  python cli.py ./资料 --vault ~/Notes --overwrite\n\n"
            "环境管理:\n"
            "  python cli.py env check --vault ~/Notes\n"
            "  python cli.py env install --vault ~/Notes\n"
            "  python cli.py env --help\n\n"
            "Hook 配置默认读取 vault 的 .obsidian/plugins/markitdown-importer/data.json；\n"
            "可使用 --hooks-config 指定另一份插件数据或多行 Hook 文本文件。\n\n"
            "请使用已安装项目依赖的 Python 环境。若依赖安装在 vault 的 .venv 中，"
            "macOS/Linux 可运行：\n"
            "  <vault>/.venv/bin/python cli.py <来源> --vault <vault>\n"
            "Windows 对应路径为 <vault>/.venv/Scripts/python.exe。\n\n"
            "退出码：0 表示全部来源转换成功；1 表示至少一个来源失败或转换器启动失败；"
            "2 表示命令行参数错误。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "sources",
        nargs="+",
        metavar="来源",
        help="要转换的文件路径、文件夹路径或 URL；可一次传入多个来源。",
    )
    parser.add_argument(
        "--vault",
        type=Path,
        default=Path.cwd(),
        metavar="路径",
        help="Obsidian vault 根目录；转换结果写入该 vault（默认：当前工作目录）。",
    )
    parser.add_argument(
        "--dest",
        default="00_Inbox/Imports",
        metavar="目录",
        help="vault 内的笔记输出目录；不能越出 vault（默认：00_Inbox/Imports）。",
    )
    parser.add_argument(
        "--recursive",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="递归处理文件夹中的受支持文件（默认开启；使用 --no-recursive 关闭）。",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="覆盖已存在的同名 Markdown 笔记；默认关闭并自动添加编号，避免覆盖旧内容。",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="以 JSON 输出每个来源的成功状态、输出路径或错误信息，供脚本读取。",
    )
    parser.add_argument(
        "--hooks-config",
        type=Path,
        metavar="文件",
        help="指定 Hook 多行文本文件或插件 data.json；默认读取 vault 插件设置中的 hooksText。",
    )
    return parser.parse_args()


def main() -> int:
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
        print("Import timed out after 30 minutes.", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Could not start the converter: {exc}", file=sys.stderr)
        return 1

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError:
        detail = completed.stderr.strip() or completed.stdout.strip() or "Converter returned no result."
        print(detail, file=sys.stderr)
        return completed.returncode or 1

    results = payload.get("results", [])
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for result in results:
            if result.get("ok"):
                print(f"[OK] {result.get('source', '')} -> {result.get('output', '')}")
            else:
                print(f"[FAIL] {result.get('source', '')}: {result.get('error', 'Unknown error')}")
        succeeded = sum(bool(result.get("ok")) for result in results)
        print(f"Imported {succeeded}/{len(results)} item(s).")

    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
