# Release Checklist

## 中文

1. 确认 `manifest.json` 中的 `version` 是本次发布版本，例如 `1.0.0`。
2. 运行语法检查：

   ```bash
   /Users/renoir/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check main.js
   python3 -m py_compile converter_bridge.py
   ```

3. 生成发布文件：

   ```bash
   ./scripts/prepare-release.sh
   ```

4. 在 GitHub 创建 tag/release，tag 必须和 `manifest.json` 的版本一致。
5. 上传 `dist/markitdown-importer-<version>/` 内的这三个附件：

   - `main.js`
   - `manifest.json`
   - `styles.css`

6. 到 `community.obsidian.md` 提交 GitHub 仓库 URL。

## English

1. Make sure `manifest.json` has the release version, for example `1.0.0`.
2. Run syntax checks.
3. Generate release assets with `./scripts/prepare-release.sh`.
4. Create a GitHub release whose tag exactly matches the manifest version.
5. Upload `main.js`, `manifest.json`, and `styles.css` from the generated `dist` folder.
6. Submit the GitHub repository URL at `community.obsidian.md`.
