# MarkItDown Importer for Obsidian

Current release version: `1.0.5`

## Overview / 简介

This is a cross-platform, desktop-only Obsidian plugin for importing files, folders, archives, images, audio, web pages, YouTube links, and Bilibili links into the current vault as Markdown notes.

这是一个跨平台、仅支持桌面端的 Obsidian 插件，用于把文件、文件夹、压缩包、图片、音频、网页、YouTube 链接和 Bilibili 链接导入当前 vault，并转换为 Markdown 笔记。

## Usage / 使用方法

1. Enable `MarkItDown Importer` in Obsidian community plugins.
2. Open the plugin settings and use `环境工具` to check or install the local Python environment.
3. Click the upload ribbon icon or run `打开 MarkItDown 导入器` from the command palette.
4. Pick or type the destination folder.
5. Drag files/folders into the drop area, choose a file/folder, or paste URLs into the URL box.

To install a local checkout into an existing vault, run `./install.sh /path/to/vault` or set `OBSIDIAN_VAULT=/path/to/vault` before running `./install.sh`. The script checks that the target contains `.obsidian`.

You can also drag a supported file, folder, or URL directly into the Markdown editor. The plugin converts it and inserts a wiki link at the cursor.

在 Obsidian 中启用插件后，可通过环境工具检查或安装本地 Python 环境，再从功能区或命令面板打开导入器。也可以把受支持的文件、文件夹或 URL 直接拖到 Markdown 编辑器中；插件会自动转换，并在当前光标位置插入 wiki 链接。

## Command Line / 命令行

The repository includes `cli.py` to run the plugin's conversion features from a terminal. Use a Python interpreter with the project dependencies installed. If they are in the vault's `.venv`, run:

仓库提供 `cli.py`，可在终端复用插件的转换能力。请使用已安装项目依赖的 Python；如果依赖位于 vault 的 `.venv`，可运行：

```bash
VAULT="/path/to/your/Obsidian vault"

"$VAULT/.venv/bin/python" /path/to/markitdown-obsidian-importer/cli.py \
  document.pdf ./reference https://example.com/article \
  --vault "$VAULT" \
  --dest "待整理/导入"
```

The CLI accepts files, folders, web page URLs, YouTube URLs, and Bilibili URLs. The current directory is the default vault, `00_Inbox/Imports` is the default destination, folders are recursive by default, and same-name notes receive numbered copies unless `--overwrite` is set.

支持文件、文件夹、网页 URL、YouTube URL 和 Bilibili URL。默认 vault 是当前工作目录，默认输出目录为 `00_Inbox/Imports`，文件夹默认递归处理；除非指定 `--overwrite`，同名笔记会生成带编号的副本。

```bash
python3 cli.py --help
python3 cli.py env --help
python3 cli.py env check --vault "$VAULT"
python3 cli.py env install --vault "$VAULT"
python3 cli.py document.pdf --vault "$VAULT" --json
python3 cli.py ./documents --vault "$VAULT" --no-recursive --overwrite
```

### Conversion options / 转换参数

| Option / 参数 | Description / 说明 |
| --- | --- |
| `SOURCE...` | One or more file paths, folder paths, or URLs. / 一个或多个文件路径、文件夹路径或 URL。 |
| `--vault PATH` | Vault root; defaults to the current directory. Output stays inside the vault. / Vault 根目录，默认当前目录；输出必须位于 vault 内。 |
| `--dest DIR` | Markdown output directory inside the vault; default: `00_Inbox/Imports`. / Vault 内 Markdown 输出目录，默认 `00_Inbox/Imports`。 |
| `--recursive` / `--no-recursive` | Recursively process folders; enabled by default. / 递归处理文件夹，默认开启；使用 `--no-recursive` 关闭。 |
| `--overwrite` | Replace same-name notes. By default, numbered copies preserve existing notes. / 覆盖同名笔记；默认生成带编号的副本以保留已有笔记。 |
| `--json` | Print per-source status, output path, or error as JSON. / 以 JSON 输出每个来源的状态、输出路径或错误。 |
| `--hooks-config FILE` | Hook text file or plugin `data.json`; defaults to `hooksText` in vault settings. / 指定 Hook 文本文件或插件 `data.json`；默认读取 vault 设置中的 `hooksText`。 |

Local paths and URLs can be mixed in one invocation. URLs need network access. Exit code `0` means every source converted, `1` means one or more failed, and `2` means invalid command-line arguments. The CLI runs the converter bridge as a subprocess, so conversion dependencies must be installed in the selected Python environment. Use `$VAULT/.venv/bin/python` on macOS/Linux or `$VAULT/.venv/Scripts/python.exe` on Windows.

本地路径和 URL 可以混合传入。访问 URL 需要网络。退出码 `0` 表示全部转换成功，`1` 表示至少一项失败，`2` 表示参数错误。CLI 会启动转换桥接脚本子进程，因此所选 Python 环境必须安装转换依赖。macOS/Linux 使用 `$VAULT/.venv/bin/python`，Windows 使用 `$VAULT/.venv/Scripts/python.exe`。

### Environment commands / 环境命令

`env check` reads the Python version and required dependencies in the vault's `.venv`. `env install` creates or updates `$VAULT/.venv`, installs plugin dependencies, and writes the Python path to plugin settings. Installation requires an existing Obsidian vault containing `.obsidian`.

`env check` 只读检查 vault `.venv` 中的 Python 版本和必需依赖。`env install` 创建或更新 `$VAULT/.venv`、安装插件依赖，并将 Python 路径写入插件设置。安装目标必须是包含 `.obsidian` 的 Obsidian vault。

| Command / 命令 | Option / 参数 | Description / 说明 |
| --- | --- | --- |
| `env check` | `--vault PATH` | Vault to inspect; defaults to the current directory. / 要检查的 vault，默认当前目录。 |
| `env check` | `--python PATH` | Python executable to inspect; defaults to `$VAULT/.venv/bin/python` (`Scripts/python.exe` on Windows). / 指定检查的 Python；默认使用 vault `.venv` 中的 Python。 |
| `env check` | `--json` | Print Python version, package states, and `ready` as JSON. Missing required items return `1`. / 以 JSON 输出 Python 版本、依赖状态和 `ready`；缺少必需项时返回 `1`。 |
| `env install` | `--vault PATH` | Vault where `.venv` is created or updated. / 创建或更新 `.venv` 的 vault。 |
| `env install` | `--python COMMAND_OR_PATH` | Python 3.10+ used to create the environment; auto-discovered if omitted. / 用于创建环境的 Python 3.10+；省略时自动查找。 |
| `env install` | `--index-url URL` | Package index for this pip upgrade/install only; global pip config is unchanged. / 仅为本次 pip 升级和安装指定软件源，不修改全局配置。 |

Installation includes `markitdown[all]`, `imageio-ffmpeg`, `youtube-transcript-api`, and `yt-dlp`; non-macOS systems also install `pytesseract`. The system Tesseract executable is separate; macOS image OCR uses Apple Vision. Only `pythonPath` is changed in plugin `data.json`; other settings, including Hooks, are preserved. Setup exit codes are `0` for success, `1` for Python discovery or installation failure, and `2` if the target is not a vault.

安装包含 `markitdown[all]`、`imageio-ffmpeg`、`youtube-transcript-api` 和 `yt-dlp`；非 macOS 还会安装 `pytesseract`。系统 Tesseract 程序需另行安装；macOS 图片 OCR 使用 Apple Vision。插件 `data.json` 只更新 `pythonPath`，其他设置（包括 Hooks）会保留。环境安装退出码：`0` 成功、`1` Python 查找或安装失败、`2` 目标不是 vault。

```bash
python3 cli.py env check --vault "$VAULT" --json
python3 cli.py env install --vault "$VAULT" --python python3.12
python3 cli.py env install --vault "$VAULT" --index-url https://pypi.org/simple
```

### Conversion Hooks / 转换 Hook

The CLI and Obsidian plugin share the same Hook configuration. Hooks default to the `hooksText` field in `$VAULT/.obsidian/plugins/markitdown-importer/data.json`; use `--hooks-config` to provide a standalone Hook text file. Hooks run local commands with the current user's permissions, so only configure scripts you trust.

CLI 与 Obsidian 插件共用 Hook 配置。默认读取 `$VAULT/.obsidian/plugins/markitdown-importer/data.json` 中的 `hooksText`；也可通过 `--hooks-config` 指定独立 Hook 文本文件。Hook 会以当前用户权限运行本地命令，请只配置可信脚本。

Each non-comment line defines one Hook, and Hooks run in line order. `before` receives a temporary copy of a local file and can clean source formats; `after` receives generated Markdown and can adjust frontmatter or content. URL sources can use `after` Hooks. A Hook may modify `{input}` in place or write to `{output}`. Hook failures or timeouts fail the current source.

每个非注释行定义一个 Hook，并按行顺序执行。`before` 接收本地文件的临时副本，可清洗源格式；`after` 接收生成的 Markdown，可整理 frontmatter 或正文。URL 来源可使用 `after` Hook。脚本可原位修改 `{input}` 或写入 `{output}`。Hook 失败或超时会使当前来源导入失败。

Hooks can extend the accepted file extensions when their selectors match; MarkItDown still performs the conversion. Selectors support extensions such as `.html`, MIME types such as `mime:text/html`, and `*`. Source types are `file`, `web`, `youtube`, `bilibili`, or `*`. Comma-separated selectors and source types are supported; extensions are case-insensitive, and specifying both an extension and MIME type requires both to match. The four columns are separated by `|`; shell-style quoting is used to split command arguments, but commands are executed directly without a shell.

配置 Hook 后，可按匹配的选择器扩展可导入的文件扩展名，实际转换仍由 MarkItDown 完成。选择器支持 `.html` 等扩展名、`mime:text/html` 等 MIME 类型和 `*`。来源类型可为 `file`、`web`、`youtube`、`bilibili` 或 `*`；选择器和来源类型可用逗号分隔。扩展名不区分大小写；同时指定扩展名和 MIME 时，两者都必须匹配。四列以 `|` 分隔，命令参数按常见 shell 引号规则拆分，但不会通过 shell 执行。

```text
# phase | source type | extension/MIME | command arguments
before | file | .html,.htm,mime:text/html | "/path/to/python" "/path/to/normalize_html.py" --input {input} --output {output}
after | * | * | "/path/to/python" "/path/to/postprocess.py" {input} {output}
```

Available placeholders: `{input}`, `{output}`, `{source}`, `{source_type}`, `{extension}`, `{mime_type}`, and `{phase}`. The same values are available through the matching `MARKITDOWN_HOOK_*` environment variables.

可用占位符：`{input}`、`{output}`、`{source}`、`{source_type}`、`{extension}`、`{mime_type}` 和 `{phase}`；也会通过对应的 `MARKITDOWN_HOOK_*` 环境变量提供。

## Supported Sources / 支持的来源

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

- PDF
- Word：`.doc`、`.docx`
- PowerPoint：`.ppt`、`.pptx`
- Excel：`.xls`、`.xlsx`、`.xlsm`
- 带 OCR 的图片：`.png`、`.jpg`、`.jpeg`、`.tif`、`.tiff`、`.bmp`、`.gif`、`.webp`
- 音频转录：`.wav`、`.mp3`、`.m4a`、`.flac`、`.ogg`、`.aac`
- 网页和文本格式：`.html`、`.htm`、`.txt`、`.md`、`.csv`、`.json`、`.xml`、`.rtf`
- ZIP 压缩包，支持递归转换其中的受支持文件
- 网页、YouTube 和 Bilibili URL；YouTube 优先提取公开/自动字幕和视频信息；Bilibili 提取标题、UP 主、简介、分 P 和公开/AI 字幕
- 整个文件夹，默认递归处理

## Notes / 环境说明

- The plugin runs `converter_bridge.py` with the vault-local Python environment.
- The settings page can create `.venv` in the current vault and install `markitdown[all]`.
- Python 3.10 or newer is required for the current MarkItDown package.
- macOS image OCR uses Apple Vision through `macos_ocr.swift` when available.
- Windows and Linux image OCR can use optional Tesseract OCR if it is installed on the system. Without Tesseract, image handling falls back to MarkItDown defaults.
- Audio conversion uses `imageio-ffmpeg` installed into the vault Python environment, so Homebrew is not required.
- YouTube imports use `yt-dlp` and `youtube-transcript-api`. If a video has no public captions, is region-unavailable, or the current network cannot access transcript endpoints, the note records a clear failure reason.
- Bilibili imports use public metadata/subtitle endpoints. They do not import danmaku and do not download audio. If no public or AI subtitle is available, the note records the reason and stops.

- 插件通过 vault 本地 Python 环境运行 `converter_bridge.py`。
- 设置页可以在当前 vault 创建 `.venv`，并安装 `markitdown[all]`。
- 当前 MarkItDown 包需要 Python 3.10 或更新版本。
- macOS 图片 OCR 在可用时通过 `macos_ocr.swift` 使用 Apple Vision。
- Windows 和 Linux 图片 OCR 可使用可选的 Tesseract OCR；未安装系统 Tesseract 时会退回 MarkItDown 默认处理。
- 音频转换使用 vault Python 环境中的 `imageio-ffmpeg`，不需要 Homebrew。
- YouTube 导入依赖 `yt-dlp` 和 `youtube-transcript-api`。无公开字幕、地区不可用或当前网络无法访问字幕接口时，插件会记录失败原因。
- Bilibili 导入使用公开接口读取元信息和字幕，不读取弹幕，也不下载音频；无公开或 AI 字幕时会记录原因并停止。

## Platform Setup / 平台安装

- macOS: install Python 3.10+ if the system Python is too old. The plugin can create `.venv/bin/python`.
- Windows: install Python 3.10+ from Python.org and enable `Add python.exe to PATH`, or use the Python launcher `py`. The plugin creates `.venv\Scripts\python.exe`.
- Linux: install Python 3.10+ with your distribution package manager. The plugin creates `.venv/bin/python`.

- macOS：如果系统 Python 版本太旧，请安装 Python 3.10+；插件可创建 `.venv/bin/python`。
- Windows：从 Python.org 安装 Python 3.10+ 并勾选 `Add python.exe to PATH`，或使用 Python Launcher `py`；插件会创建 `.venv\Scripts\python.exe`。
- Linux：通过发行版包管理器安装 Python 3.10+；插件会创建 `.venv/bin/python`。

## Settings / 设置项

| Setting / 设置 | Description / 说明 |
| --- | --- |
| Environment tools / 环境工具 | Check Python, MarkItDown, bridge, YouTube, OCR, and ffmpeg; create/update `.venv`. / 检查 Python、MarkItDown、桥接脚本、YouTube、OCR 和 ffmpeg；创建或更新 `.venv`。 |
| Python path / Python 路径 | Python executable used to run the bridge. / 用于运行桥接脚本的 Python。 |
| Default destination / 默认写入目录 | Output folder relative to the vault. / 相对于 vault 的输出目录。 |
| Recursive folders / 递归转换文件夹 | Recursively process supported files inside folders. / 递归处理文件夹中的受支持文件。 |
| Insert links on editor drop / 拖到编辑器时插入链接 | Convert dropped sources and insert wiki links. / 转换拖入的来源并插入 wiki 链接。 |
| Open first imported note / 导入后打开第一篇笔记 | Open the first note after conversion. / 转换后打开第一篇导入笔记。 |
| Overwrite same-name notes / 覆盖同名笔记 | Overwrite existing notes instead of creating numbered copies. / 覆盖已有笔记，而不是生成带编号副本。 |
| Conversion Hooks / 转换 Hook | Edit pre- and post-conversion scripts shared by the plugin and CLI. / 编辑插件和 CLI 共用的前置、后置脚本。 |
