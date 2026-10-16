#!/usr/bin/env python3
"""User-facing command line interface for MarkItDown Importer."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
BRIDGE_SCRIPT = PROJECT_DIR / "converter_bridge.py"
OCR_SCRIPT = PROJECT_DIR / "macos_ocr.swift"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "将文件、文件夹、网页、YouTube 和 Bilibili 来源转换为 Markdown 笔记，"
            "并写入指定的 Obsidian vault。复用插件现有的转换能力。"
        ),
        epilog=(
            "示例:\n"
            "  python cli.py ./资料/报告.pdf https://example.com --vault ~/Notes\n"
            "  python cli.py ./资料 --vault ~/Notes --dest 待整理/导入 --no-recursive\n"
            "  python cli.py video-url --vault ~/Notes --json\n\n"
            "请使用已安装项目依赖的 Python 环境。若依赖安装在 vault 的 .venv 中，"
            "macOS/Linux 可运行：\n"
            "  <vault>/.venv/bin/python cli.py <来源> --vault <vault>"
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
        help="Obsidian vault 根目录（默认：当前工作目录）。",
    )
    parser.add_argument(
        "--dest",
        default="00_Inbox/Imports",
        metavar="目录",
        help="vault 内的笔记输出目录（默认：00_Inbox/Imports）。",
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
        help="覆盖同名笔记（默认关闭；关闭时为新笔记自动添加编号）。",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="以 JSON 输出转换结果，供其他命令或脚本读取。",
    )
    return parser.parse_args()


def main() -> int:
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
