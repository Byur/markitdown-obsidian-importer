#!/usr/bin/env python3
"""Extended MarkItDown bridge for the Obsidian plugin."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import warnings
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".xlsm",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm",
    ".txt",
    ".md",
    ".rtf",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".gif",
    ".webp",
    ".wav",
    ".mp3",
    ".m4a",
    ".flac",
    ".ogg",
    ".aac",
    ".zip",
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"}
ZIP_EXTENSIONS = {".zip"}


def configure_bundled_ffmpeg() -> str | None:
    warnings.filterwarnings(
        "ignore",
        message="Couldn't find ffmpeg or avconv.*",
        category=RuntimeWarning,
    )
    try:
        import imageio_ffmpeg
    except Exception:
        return None

    try:
        ffmpeg_path = Path(imageio_ffmpeg.get_ffmpeg_exe()).resolve()
    except Exception:
        return None

    if not ffmpeg_path.exists():
        return None

    os.environ["PATH"] = f"{ffmpeg_path.parent}{os.pathsep}{os.environ.get('PATH', '')}"
    os.environ.setdefault("IMAGEIO_FFMPEG_EXE", str(ffmpeg_path))
    try:
        from pydub import AudioSegment

        AudioSegment.converter = str(ffmpeg_path)
        AudioSegment.ffmpeg = str(ffmpeg_path)
    except Exception:
        pass

    return str(ffmpeg_path)


def safe_note_name(name: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]+', "-", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or "Untitled"


def unique_output_path(directory: Path, stem: str, overwrite: bool) -> Path:
    output = directory / f"{stem}.md"
    if overwrite or not output.exists():
        return output
    index = 2
    while True:
        candidate = directory / f"{stem}-{index}.md"
        if not candidate.exists():
            return candidate
        index += 1


def assert_inside_vault(path: Path, vault: Path) -> None:
    try:
        path.relative_to(vault)
    except ValueError as exc:
        raise ValueError(f"Output directory must be inside the vault: {vault}") from exc


def is_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def note_stem_for_source(source: str | Path) -> str:
    raw = str(source)
    if is_url(raw):
        parsed = urlparse(raw)
        tail = parsed.path.rstrip("/").split("/")[-1] or parsed.netloc
        return safe_note_name(tail)
    return safe_note_name(Path(raw).stem)


def frontmatter_for(source: str | Path, converter: str) -> str:
    converted_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    lines = [
        "---",
        "tags:",
        "  - imported",
        "  - markitdown",
        f"source_file: {json.dumps(str(source), ensure_ascii=False)}",
        f"converted_at: {json.dumps(converted_at, ensure_ascii=False)}",
        f"converter: {json.dumps(converter, ensure_ascii=False)}",
        "---",
        "",
    ]
    return "\n".join(lines)


def markitdown() -> object:
    warnings.filterwarnings(
        "ignore",
        message="Couldn't find ffmpeg or avconv.*",
        category=RuntimeWarning,
    )
    configure_bundled_ffmpeg()
    from markitdown import MarkItDown

    try:
        return MarkItDown(enable_plugins=False)
    except TypeError:
        return MarkItDown()


def convert_with_markitdown(source: Path | str) -> str:
    md = markitdown()
    if isinstance(source, str) and is_url(source):
        result = md.convert_url(source)
    else:
        result = md.convert(str(source))
    return result.text_content.strip()


def extract_legacy_ppt(source: Path, tools_dir: Path | None) -> str | None:
    if not tools_dir:
        return extract_legacy_ppt_text(source)
    sys.path.insert(0, str(tools_dir))
    try:
        from markitdown_to_obsidian import convert_file

        return convert_file(source)
    except Exception:
        return extract_legacy_ppt_text(source)
    finally:
        try:
            sys.path.remove(str(tools_dir))
        except ValueError:
            pass


def clean_extracted_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x0b", "\n")
    text = re.sub(r"[\x00-\x08\x0c\x0e-\x1f]", "", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def looks_like_slide_text(text: str) -> bool:
    if len(text) < 2:
        return False
    if text.startswith(("C:\\", "__", "___")):
        return False
    if "单击此处编辑母版" in text:
        return False
    if re.fullmatch(r"[\W_]+", text):
        return False
    return True


def extract_legacy_ppt_text(source: Path) -> str | None:
    try:
        import olefile
    except Exception:
        return None

    try:
        with olefile.OleFileIO(str(source)) as ole:
            stream_name = next(
                (
                    entry
                    for entry in ole.listdir(streams=True, storages=False)
                    if entry and entry[-1] == "PowerPoint Document"
                ),
                None,
            )
            if stream_name is None:
                return None
            data = ole.openstream(stream_name).read()
    except Exception:
        return None

    chunks: list[str] = []
    seen: set[str] = set()

    def add_text(text: str) -> None:
        cleaned = clean_extracted_text(text)
        if not cleaned or not looks_like_slide_text(cleaned) or cleaned in seen:
            return
        seen.add(cleaned)
        chunks.append(cleaned)

    def walk_records(start: int, end: int) -> None:
        position = start
        while position + 8 <= end:
            record_version = data[position] & 0x0F
            record_type = int.from_bytes(data[position + 2 : position + 4], "little")
            record_len = int.from_bytes(data[position + 4 : position + 8], "little")
            payload_start = position + 8
            payload_end = payload_start + record_len

            if payload_end > end:
                return

            payload = data[payload_start:payload_end]
            if record_type == 4000:
                add_text(payload.decode("utf-16le", errors="ignore"))
            elif record_type == 4008:
                add_text(payload.decode("gbk", errors="ignore"))

            if record_version == 0x0F and record_len:
                walk_records(payload_start, payload_end)

            position = payload_end if record_len else position + 8

    walk_records(0, len(data))
    if not chunks:
        return None

    body = "\n\n---\n\n".join(chunks)
    return (
        "> Legacy .ppt fallback extraction was used because MarkItDown could not convert this file directly.\n\n"
        f"{body}"
    )


def run_macos_ocr(image: Path, ocr_script: Path) -> str | None:
    if not ocr_script.exists() or not shutil.which("swift"):
        return None
    result = subprocess.run(
        ["swift", str(ocr_script), str(image)],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    text = result.stdout.strip()
    if result.returncode == 0 and text:
        return text
    return None


def run_tesseract_ocr(image: Path) -> str | None:
    try:
        import pytesseract
        from PIL import Image
    except Exception:
        return None

    try:
        text = pytesseract.image_to_string(Image.open(image), lang="chi_sim+chi_tra+eng")
    except Exception:
        try:
            text = pytesseract.image_to_string(Image.open(image))
        except Exception:
            return None

    text = text.strip()
    return text or None


def convert_image(source: Path, ocr_script: Path) -> tuple[str, str]:
    ocr_text = run_macos_ocr(source, ocr_script)
    if ocr_text:
        return ocr_text, "macOS Vision OCR"
    ocr_text = run_tesseract_ocr(source)
    if ocr_text:
        return ocr_text, "Tesseract OCR"
    return convert_with_markitdown(source), "markitdown"


def convert_content(source: Path | str, tools_dir: Path | None, ocr_script: Path) -> tuple[str, str]:
    if isinstance(source, str) and is_url(source):
        return convert_with_markitdown(source), "markitdown"

    path = Path(source)
    suffix = path.suffix.lower()
    if suffix == ".ppt":
        legacy_text = extract_legacy_ppt(path, tools_dir)
        if legacy_text:
            return legacy_text, "markitdown + legacy ppt fallback"
    if suffix in IMAGE_EXTENSIONS:
        return convert_image(path, ocr_script)
    return convert_with_markitdown(path), "markitdown"


def write_note(source: str | Path, markdown: str, output_dir: Path, overwrite: bool, converter: str) -> Path:
    stem = note_stem_for_source(source)
    output = unique_output_path(output_dir, stem, overwrite)
    output.write_text(
        frontmatter_for(source, converter) + f"# {stem}\n\n" + markdown.strip() + "\n",
        encoding="utf-8",
    )
    return output


def convert_zip(source: Path, tools_dir: Path | None, ocr_script: Path) -> tuple[str, str]:
    sections: list[str] = []
    with tempfile.TemporaryDirectory(prefix="markitdown-zip-") as temp_dir:
        temp_root = Path(temp_dir)
        with zipfile.ZipFile(source) as archive:
            archive.extractall(temp_root)
        for child in sorted(temp_root.rglob("*")):
            if not child.is_file() or child.suffix.lower() not in SUPPORTED_EXTENSIONS - ZIP_EXTENSIONS:
                continue
            try:
                markdown, converter = convert_content(child, tools_dir, ocr_script)
                relative = child.relative_to(temp_root).as_posix()
                sections.append(f"## {relative}\n\n{markdown}\n\n<!-- converter: {converter} -->")
            except Exception as exc:
                relative = child.relative_to(temp_root).as_posix()
                sections.append(f"## {relative}\n\n> Conversion failed: {exc}")
    if not sections:
        raise RuntimeError("No supported files were found inside the ZIP archive.")
    return "\n\n---\n\n".join(sections), "zip recursive bridge"


def iter_directory_files(directory: Path, recursive: bool) -> list[Path]:
    iterator = directory.rglob("*") if recursive else directory.glob("*")
    return sorted(
        path
        for path in iterator
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def convert_one(
    source: str,
    output_dir: Path,
    overwrite: bool,
    recursive: bool,
    tools_dir: Path | None,
    ocr_script: Path,
) -> list[dict[str, object]]:
    if is_url(source):
        markdown, converter = convert_content(source, tools_dir, ocr_script)
        output = write_note(source, markdown, output_dir, overwrite, converter)
        return [{"ok": True, "source": source, "output": str(output)}]

    path = Path(source).expanduser().resolve()
    if path.is_dir():
        results: list[dict[str, object]] = []
        files = iter_directory_files(path, recursive)
        if not files:
            return [{"ok": False, "source": str(path), "error": "No supported files found in this folder."}]
        for child in files:
            results.extend(convert_one(str(child), output_dir, overwrite, recursive, tools_dir, ocr_script))
        return results

    if not path.is_file():
        return [{"ok": False, "source": source, "error": "Source does not exist."}]

    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return [{"ok": False, "source": str(path), "error": f"Unsupported file type: {path.suffix or 'none'}"}]

    if path.suffix.lower() in ZIP_EXTENSIONS:
        markdown, converter = convert_zip(path, tools_dir, ocr_script)
    else:
        markdown, converter = convert_content(path, tools_dir, ocr_script)
    output = write_note(path, markdown, output_dir, overwrite, converter)
    return [{"ok": True, "source": str(path), "output": str(output)}]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extended MarkItDown bridge for Obsidian.")
    parser.add_argument("--vault", required=True, type=Path)
    parser.add_argument("--dest", required=True)
    parser.add_argument("--source", action="append", default=[])
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--recursive", action="store_true")
    parser.add_argument("--tools-dir", type=Path, default=None)
    parser.add_argument("--ocr-script", type=Path, required=True)
    parser.add_argument("--result-file", type=Path, default=None)
    return parser.parse_args()


def emit_result(payload: dict[str, object], result_file: Path | None) -> None:
    text = json.dumps(payload, ensure_ascii=False)
    if result_file:
        result_file.parent.mkdir(parents=True, exist_ok=True)
        result_file.write_text(text, encoding="utf-8")
    else:
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
        print(text)


def main() -> int:
    args = parse_args()
    vault = args.vault.expanduser().resolve()
    output_dir = (vault / args.dest).resolve()
    results: list[dict[str, object]] = []

    try:
        assert_inside_vault(output_dir, vault)
        output_dir.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        emit_result({"results": [{"ok": False, "source": args.dest, "error": str(exc)}]}, args.result_file)
        return 1

    for source in args.source:
        try:
            results.extend(
                convert_one(
                    source,
                    output_dir,
                    args.overwrite,
                    args.recursive,
                    args.tools_dir.expanduser().resolve() if args.tools_dir else None,
                    args.ocr_script.expanduser().resolve(),
                )
            )
        except Exception as exc:
            results.append({"ok": False, "source": source, "error": str(exc)})

    emit_result({"results": results}, args.result_file)
    return 0 if all(result.get("ok") for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
