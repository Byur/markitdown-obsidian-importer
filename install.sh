#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_DIR="${1:-${OBSIDIAN_VAULT:-}}"
if [[ -z "$VAULT_DIR" ]]; then
  echo "Usage: $0 <obsidian-vault-path>" >&2
  echo "   or: OBSIDIAN_VAULT=<obsidian-vault-path> $0" >&2
  exit 2
fi
if [[ ! -d "$VAULT_DIR/.obsidian" ]]; then
  echo "Not an Obsidian vault (missing .obsidian directory): $VAULT_DIR" >&2
  exit 2
fi
VAULT_DIR="$(cd "$VAULT_DIR" && pwd)"
PLUGIN_DIR="$VAULT_DIR/.obsidian/plugins/markitdown-importer"

mkdir -p "$PLUGIN_DIR"
cp \
  "$PROJECT_DIR/manifest.json" \
  "$PROJECT_DIR/main.js" \
  "$PROJECT_DIR/styles.css" \
  "$PROJECT_DIR/converter_bridge.py" \
  "$PROJECT_DIR/cli.py" \
  "$PROJECT_DIR/macos_ocr.swift" \
  "$PROJECT_DIR/README.md" \
  "$PLUGIN_DIR/"

echo "Installed MarkItDown Importer to:"
echo "  $PLUGIN_DIR"
