# MarkItDown Importer for Obsidian

Current release version: `1.0.5`

## 简介 / Overview

这是一个跨平台、仅支持桌面端的 Obsidian 插件，用于把文件、文件夹、压缩包、图片、音频、网页、YouTube 链接和 Bilibili 链接导入当前仓库，并转换为 Markdown 笔记。

This is a cross-platform, desktop-only Obsidian plugin for importing files, folders, archives, images, audio, web pages, YouTube links, and Bilibili links into the current vault as Markdown notes.

## 使用方法 / Usage

1. 在 Obsidian 社区插件中启用 `MarkItDown Importer`。
2. 打开插件设置页，使用 `环境工具` 检查或安装本地 Python 环境。
3. 点击左侧上传图标，或在命令面板运行 `打开 MarkItDown 导入器`。
4. 选择或输入写入目录。
5. 将文件/文件夹拖入上传区域，点击选择文件/文件夹，或把 URL 粘贴到链接输入框。

仓库维护者也可以把当前版本安装到已有 vault：`./install.sh /path/to/vault`，或设置 `OBSIDIAN_VAULT=/path/to/vault` 后运行 `./install.sh`。脚本会检查目标目录包含 `.obsidian`。

1. Enable `MarkItDown Importer` in Obsidian community plugins.
2. Open the plugin settings and use `环境工具` to check or install the local Python environment.
3. Click the upload ribbon icon or run `打开 MarkItDown 导入器` from the command palette.
4. Pick or type the destination folder.
5. Drag files/folders into the drop area, choose a file/folder, or paste URLs into the URL box.

To install a local checkout into an existing vault, run `./install.sh /path/to/vault` or set `OBSIDIAN_VAULT=/path/to/vault` before running `./install.sh`. The script checks for the vault's `.obsidian` directory.

你也可以把受支持的文件、文件夹或 URL 直接拖到 Markdown 编辑器中。插件会自动转换，并在当前光标位置插入 wiki 链接。

You can also drag a supported file, folder, or URL directly into the Markdown editor. The plugin converts it and inserts a wiki link at the cursor.

## 命令行 / Command Line

仓库提供 `cli.py`，可在终端复用插件的转换能力。请使用已安装项目依赖的 Python；如果依赖安装在 vault 的 `.venv`，macOS/Linux 示例：

```bash
"$VAULT/.venv/bin/python" /path/to/markitdown-obsidian-importer/cli.py \
  document.pdf ./reference https://example.com/article \
  --vault "$VAULT" \
  --dest "待整理/导入"
```

支持文件、文件夹、网页 URL、YouTube URL 和 Bilibili URL。默认 vault 是当前工作目录，默认输出目录是 `00_Inbox/Imports`，文件夹默认递归处理；同名笔记默认生成带编号的副本。

```bash
python3 cli.py --help
python3 cli.py document.pdf --vault /path/to/vault --json
python3 cli.py ./documents --vault /path/to/vault --no-recursive --overwrite
```

`--json` 输出可供脚本处理的结构化结果；有任一来源转换失败时，命令返回非零退出码。

The repository includes `cli.py` to run the plugin's conversion features from a terminal. Use a Python interpreter where the project dependencies are installed. If they are installed in the vault's `.venv`, on macOS/Linux run:

```bash
"$VAULT/.venv/bin/python" /path/to/markitdown-obsidian-importer/cli.py \
  document.pdf ./reference https://example.com/article \
  --vault "$VAULT" \
  --dest "待整理/导入"
```

The CLI accepts files, folders, web page URLs, YouTube URLs, and Bilibili URLs. The current directory is the default vault, `00_Inbox/Imports` is the default destination, and folders are processed recursively by default. Existing notes are preserved by creating numbered copies.

```bash
python3 cli.py --help
python3 cli.py document.pdf --vault /path/to/vault --json
python3 cli.py ./documents --vault /path/to/vault --no-recursive --overwrite
```

`--json` prints structured results for scripts. The command exits with a non-zero status if any source fails to convert.

## 支持的来源 / Supported Sources

- PDF
- Word：`.doc`、`.docx`
- PowerPoint：`.ppt`、`.pptx`
- Excel：`.xls`、`.xlsx`、`.xlsm`
- 带 OCR 的图片：`.png`、`.jpg`、`.jpeg`、`.tif`、`.tiff`、`.bmp`、`.gif`、`.webp`
- 音频转录：`.wav`、`.mp3`、`.m4a`、`.flac`、`.ogg`、`.aac`
- 网页和文本格式：`.html`、`.htm`、`.txt`、`.md`、`.csv`、`.json`、`.xml`、`.rtf`
- ZIP 压缩包，支持递归转换其中的受支持文件
- 网页、YouTube 和 Bilibili URL；YouTube 会优先提取公开字幕/自动字幕和视频元信息；Bilibili 会提取标题、UP 主、简介、分 P 和公开字幕/AI 字幕
- 整个文件夹，默认递归处理

- PDF
- Word: `.doc`, `.docx`
- PowerPoint: `.ppt`, `.pptx`
- Excel: `.xls`, `.xlsx`, `.xlsm`
- Images with OCR: `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.bmp`, `.gif`, `.webp`
- Audio transcription: `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.aac`
- Web and text formats: `.html`, `.htm`, `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.rtf`
- ZIP archives with recursive conversion of supported files inside
- Web pages, YouTube URLs, and Bilibili URLs; YouTube imports prefer public/manual or automatic captions plus video metadata; Bilibili imports extract title, uploader, description, pages, and public/AI subtitles
- Whole folders, recursively by default

## 环境说明 / Notes

- 插件通过当前仓库里的 Python 环境运行 `converter_bridge.py`。
- 设置页可以在当前仓库中创建 `.venv`，并安装 `markitdown[all]`。
- 当前 MarkItDown 包需要 Python 3.10 或更新版本。
- macOS 图片 OCR 会在可用时通过 `macos_ocr.swift` 使用 Apple Vision。
- Windows 和 Linux 图片 OCR 可以使用可选的 Tesseract OCR；如果没有安装 Tesseract，图片会退回 MarkItDown 默认处理。
- 音频转换使用安装在仓库 Python 环境中的 `imageio-ffmpeg`，不需要 Homebrew。
- YouTube 导入依赖 `yt-dlp` 和 `youtube-transcript-api`。如果视频没有公开字幕、地区不可用，或当前网络无法访问 YouTube 字幕接口，插件会写入明确的失败原因。
- Bilibili 导入使用公开接口读取元信息和字幕；不会读取弹幕，不会下载音频。没有公开字幕或 AI 字幕时，插件会写入放弃原因。

- The plugin runs `converter_bridge.py` with the vault-local Python environment.
- The settings page can create `.venv` in the current vault and install `markitdown[all]`.
- Python 3.10 or newer is required for the current MarkItDown package.
- macOS image OCR uses Apple Vision through `macos_ocr.swift` when available.
- Windows and Linux image OCR can use optional Tesseract OCR if it is installed on the system. Without Tesseract, image handling falls back to MarkItDown defaults.
- Audio conversion uses `imageio-ffmpeg` installed into the vault Python environment, so Homebrew is not required.
- YouTube imports use `yt-dlp` and `youtube-transcript-api`. If a video has no public captions, is region-unavailable, or the current network cannot access transcript endpoints, the note records a clear failure reason.
- Bilibili imports use public metadata/subtitle endpoints. They do not import danmaku and do not download audio. If no public or AI subtitle is available, the note records the reason and stops.

## 平台安装 / Platform Setup

- macOS：如果系统 Python 太旧，请安装 Python 3.10+。插件会创建 `.venv/bin/python`。
- Windows：从 Python.org 安装 Python 3.10+，并勾选 `Add python.exe to PATH`；也可以使用 Python Launcher `py`。插件会创建 `.venv\Scripts\python.exe`。
- Linux：通过发行版包管理器安装 Python 3.10+。插件会创建 `.venv/bin/python`。

- macOS: install Python 3.10+ if the system Python is too old. The plugin can create `.venv/bin/python`.
- Windows: install Python 3.10+ from Python.org and enable `Add python.exe to PATH`, or use the Python launcher `py`. The plugin creates `.venv\Scripts\python.exe`.
- Linux: install Python 3.10+ with your distribution package manager. The plugin creates `.venv/bin/python`.

## 设置项 / Settings

- `环境工具`：检查 Python、MarkItDown、桥接脚本、YouTube 字幕工具、OCR 和 ffmpeg；创建/更新 `.venv`；可选安装 ffmpeg 到仓库 Python 环境。
- `Python 路径`：用于运行桥接脚本的 Python。
- `默认写入目录`：相对于当前仓库的目标目录。
- `递归转换文件夹`：拖入或选择文件夹时，递归处理其中受支持的文件。
- `拖到编辑器时插入链接`：把来源拖到编辑器中时，转换后插入 wiki 链接。
- `导入后打开第一篇笔记`：转换完成后打开第一篇导入笔记。
- `覆盖同名笔记`：覆盖已有同名笔记；关闭时会自动生成带编号的副本。

- `环境工具`: check Python, MarkItDown, bridge scripts, YouTube caption tools, OCR, and ffmpeg; create/update `.venv`; optionally install ffmpeg into the vault Python environment.
- `Python 路径`: Python used to run the bridge.
- `默认写入目录`: destination folder relative to the vault.
- `递归转换文件夹`: convert supported files inside folders recursively.
- `拖到编辑器时插入链接`: convert editor drops and insert wiki links.
- `导入后打开第一篇笔记`: open the first imported note after conversion.
- `覆盖同名笔记`: overwrite existing notes instead of creating numbered copies.
