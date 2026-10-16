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
VAULT="/path/to/your/Obsidian vault"

python3 cli.py --help
python3 cli.py env --help
python3 cli.py env check --vault "$VAULT"
python3 cli.py env install --vault "$VAULT"
python3 cli.py document.pdf --vault /path/to/vault --json
python3 cli.py ./documents --vault /path/to/vault --no-recursive --overwrite
```

### 转换命令参数

| 参数 | 作用 |
| --- | --- |
| `来源...` | 一个或多个文件路径、文件夹路径或 URL。支持类型见下方“支持的来源”。 |
| `--vault 路径` | Obsidian vault 根目录；默认当前工作目录。输出目录必须位于 vault 内。 |
| `--dest 目录` | vault 内的 Markdown 输出目录；默认 `00_Inbox/Imports`。 |
| `--recursive` / `--no-recursive` | 是否递归处理文件夹；默认开启。 |
| `--overwrite` | 覆盖同名笔记。默认关闭，自动在文件名后添加编号以保留已有笔记。 |
| `--json` | 输出每个来源的状态、输出路径或错误信息，供脚本读取。 |
| `--hooks-config 文件` | 指定 Hook 多行文本文件或插件 `data.json`；默认读取 vault 插件设置中的 `hooksText`。 |

一次可以混合传入多个本地路径和 URL。URL 需要当前网络可以访问；文件夹按递归设置处理。全部来源成功时退出码为 `0`，至少一项失败时为 `1`，命令参数错误时为 `2`。CLI 通过子进程调用转换桥接脚本，转换依赖必须安装在当前 CLI Python 中；使用 vault 环境时，macOS/Linux 的可执行文件是 `$VAULT/.venv/bin/python`，Windows 是 `$VAULT/.venv/Scripts/python.exe`。

`env check` 检查 vault `.venv` 中的 Python 版本、MarkItDown、音频和 YouTube 依赖。`env install` 会创建或更新 `$VAULT/.venv`，安装插件依赖，并将该 Python 路径写入插件设置；安装前需确保目标目录是 Obsidian vault（包含 `.obsidian`）。可用 `--python python3.12` 指定创建环境的 Python，或用 `--index-url URL` 为本次 pip 安装指定软件源。此命令只写 vault 内环境和插件设置，不修改全局 pip 配置。

| 环境命令 | 参数 | 作用 |
| --- | --- | --- |
| `env check` | `--vault 路径` | 检查该 vault 的 `.venv`；默认 vault 是当前工作目录。 |
| `env check` | `--python 路径` | 检查指定 Python 可执行文件，默认 `$VAULT/.venv/bin/python`（Windows 为 `Scripts/python.exe`）。 |
| `env check` | `--json` | 返回包含 Python 版本、依赖状态和 `ready` 的 JSON。缺少必需项目时退出码为 `1`。 |
| `env install` | `--vault 路径` | 创建或更新 `$VAULT/.venv`；目标必须已包含 `.obsidian`。 |
| `env install` | `--python 命令或路径` | 指定创建虚拟环境的 Python，要求 3.10 或更新版本；省略时自动查找。 |
| `env install` | `--index-url URL` | 仅为这次 pip 升级和依赖安装指定软件源，不改全局 pip 配置。 |

安装包含 `markitdown[all]`、`imageio-ffmpeg`、`youtube-transcript-api` 和 `yt-dlp`；非 macOS 还会安装 `pytesseract`。`pytesseract` 不包含系统 Tesseract 程序；macOS 图片 OCR 使用 Apple Vision。命令成功后只更新插件 `data.json` 中的 `pythonPath`，会保留 Hook 和其他设置。环境安装成功退出码为 `0`，找不到 Python 或安装失败为 `1`，目标不是 vault 为 `2`。

```bash
python3 cli.py env check --vault "$VAULT" --json
python3 cli.py env install --vault "$VAULT" --python /opt/homebrew/bin/python3.12
python3 cli.py env install --vault "$VAULT" --index-url https://pypi.org/simple
```

`--json` 输出可供脚本处理的结构化结果；有任一来源转换失败时，命令返回非零退出码。

CLI 与 Obsidian 插件共用 Hook 配置。默认读取 `$VAULT/.obsidian/plugins/markitdown-importer/data.json` 中的多行 `hooksText`；也可以用 `--hooks-config` 指定独立 Hook 文本文件。Hook 是本机脚本扩展点，命令以当前用户权限执行，请只配置自己信任的脚本。

The repository includes `cli.py` to run the plugin's conversion features from a terminal. Use a Python interpreter where the project dependencies are installed. If they are installed in the vault's `.venv`, on macOS/Linux run:

```bash
"$VAULT/.venv/bin/python" /path/to/markitdown-obsidian-importer/cli.py \
  document.pdf ./reference https://example.com/article \
  --vault "$VAULT" \
  --dest "待整理/导入"
```

The CLI accepts files, folders, web page URLs, YouTube URLs, and Bilibili URLs. The current directory is the default vault, `00_Inbox/Imports` is the default destination, and folders are processed recursively by default. Existing notes are preserved by creating numbered copies.

```bash
VAULT="/path/to/your/Obsidian vault"

python3 cli.py --help
python3 cli.py env --help
python3 cli.py env check --vault "$VAULT"
python3 cli.py env install --vault "$VAULT"
python3 cli.py document.pdf --vault /path/to/vault --json
python3 cli.py ./documents --vault /path/to/vault --no-recursive --overwrite
```

### Conversion command options

| Option | Description |
| --- | --- |
| `SOURCE...` | One or more file paths, folder paths, or URLs. See “Supported Sources” below. |
| `--vault PATH` | Obsidian vault root; defaults to the current directory. The output directory must stay inside the vault. |
| `--dest DIR` | Markdown output directory inside the vault; defaults to `00_Inbox/Imports`. |
| `--recursive` / `--no-recursive` | Recursively process folders; enabled by default. |
| `--overwrite` | Replace a same-name note. By default, numbered names are created to preserve existing notes. |
| `--json` | Print per-source status, output path, or error as machine-readable JSON. |
| `--hooks-config FILE` | Use a Hook text file or plugin `data.json`; defaults to `hooksText` in the vault plugin settings. |

Local paths and URLs can be mixed in one invocation. URLs require network access. Folder handling follows the recursive option. Exit code `0` means all sources converted, `1` means at least one failed, and `2` means invalid command-line arguments. The CLI invokes the converter bridge in a subprocess, so its Python interpreter must have the conversion dependencies installed. For the vault environment, use `$VAULT/.venv/bin/python` on macOS/Linux or `$VAULT/.venv/Scripts/python.exe` on Windows.

`env check` inspects the Python version and MarkItDown, audio, and YouTube dependencies in the vault's `.venv`. `env install` creates or updates `$VAULT/.venv`, installs the plugin dependencies, and writes its Python path to the plugin settings. The target must be an Obsidian vault containing `.obsidian`. Use `--python python3.12` to select the Python used to create the environment, or `--index-url URL` to choose a package index for this pip run. The command only changes the vault environment and plugin settings; it does not change global pip configuration.

| Environment command | Option | Description |
| --- | --- | --- |
| `env check` | `--vault PATH` | Check the vault's `.venv`; defaults to the current directory. |
| `env check` | `--python PATH` | Check a specific Python executable. Defaults to `$VAULT/.venv/bin/python` (`Scripts/python.exe` on Windows). |
| `env check` | `--json` | Return Python version, dependency states, and `ready` as JSON. Missing required items produce exit code `1`. |
| `env install` | `--vault PATH` | Create or update `$VAULT/.venv`; the directory must contain `.obsidian`. |
| `env install` | `--python COMMAND_OR_PATH` | Choose the Python used to create the venv; requires Python 3.10+. Automatically discovered if omitted. |
| `env install` | `--index-url URL` | Select the package index for this pip upgrade and install only; global pip config is unchanged. |

Installation includes `markitdown[all]`, `imageio-ffmpeg`, `youtube-transcript-api`, and `yt-dlp`; non-macOS systems also install `pytesseract`. `pytesseract` does not install the system Tesseract executable; macOS image OCR uses Apple Vision. On success, only `pythonPath` is updated in the plugin `data.json`, preserving Hooks and other settings. Exit code `0` means setup succeeded, `1` means Python discovery or installation failed, and `2` means the target is not a vault.

```bash
python3 cli.py env check --vault "$VAULT" --json
python3 cli.py env install --vault "$VAULT" --python /opt/homebrew/bin/python3.12
python3 cli.py env install --vault "$VAULT" --index-url https://pypi.org/simple
```

`--json` prints structured results for scripts. The command exits with a non-zero status if any source fails to convert.

The CLI and Obsidian plugin share the same hooks. By default, hooks are read from the `hooksText` field in `$VAULT/.obsidian/plugins/markitdown-importer/data.json`. Use `--hooks-config` to provide a standalone Hook text file. Hooks execute local commands with the current user's permissions, so only configure scripts you trust.

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
- `转换 Hook`：编辑并保存前置/后置脚本配置；插件和 CLI 共用。

- `环境工具`: check Python, MarkItDown, bridge scripts, YouTube caption tools, OCR, and ffmpeg; create/update `.venv`; optionally install ffmpeg into the vault Python environment.
- `Python 路径`: Python used to run the bridge.
- `默认写入目录`: destination folder relative to the vault.
- `递归转换文件夹`: convert supported files inside folders recursively.
- `拖到编辑器时插入链接`: convert editor drops and insert wiki links.
- `导入后打开第一篇笔记`: open the first imported note after conversion.
- `覆盖同名笔记`: overwrite existing notes instead of creating numbered copies.
- `转换 Hook`: edit and save pre-conversion and post-conversion hooks shared by the plugin and CLI.

### 转换 Hook / Conversion Hooks

Hook 配置使用多行文本，每个非注释行定义一个 Hook，按行顺序执行。`before` 接收文件的临时副本，适合按扩展名做源文件清洗；`after` 接收 MarkItDown 生成的 Markdown，适合整理标签、frontmatter 或正文。前置 Hook 只作用于本地文件；URL 来源可使用后置 Hook。脚本可以原位修改 `{input}`，也可以写入 `{output}`。原始文件不会被前置 Hook 改写。Hook 出错或超时会让当前来源导入失败。

配置 Hook 后，未列在内置格式表中的扩展名也可以通过插件和 CLI 导入；扩展名或 MIME 选择器需匹配相应 Hook，随后仍由 MarkItDown 负责实际转换。递归导入也会纳入这些已配置的扩展名。

```text
# 阶段 | 来源类型 | 扩展名/MIME | 命令 参数…
before | file | .html,.htm,mime:text/html | "/path/to/python" "/path/to/normalize_html.py" --input {input} --output {output}
after | * | * | "/path/to/python" "/path/to/postprocess.py" {input} {output}
```

四列以 `|` 分隔。阶段为 `before` 或 `after`；来源类型可用 `file`、`web`、`youtube`、`bilibili`，`*` 表示全部类型。选择器可写扩展名（如 `.html`）、MIME（如 `mime:text/*`）或 `*`；多个选择器/来源类型以逗号分隔。扩展名忽略大小写；同一行同时指定扩展名和 MIME 时需要同时匹配。命令使用常见引号规则拆分参数，不经过 shell；路径包含空格时加引号。

可用占位符：`{input}`、`{output}`、`{source}`、`{source_type}`、`{extension}`、`{mime_type}`、`{phase}`。这些值也会通过对应的 `MARKITDOWN_HOOK_*` 环境变量提供。
