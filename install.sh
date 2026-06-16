#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_DIR="/Users/renoir/Documents/Elek的知识库/Elek的知识库"
PLUGIN_DIR="$VAULT_DIR/.obsidian/plugins/markitdown-importer"

mkdir -p "$PLUGIN_DIR"
cp \
  "$PROJECT_DIR/manifest.json" \
  "$PROJECT_DIR/main.js" \
  "$PROJECT_DIR/styles.css" \
  "$PROJECT_DIR/converter_bridge.py" \
  "$PROJECT_DIR/macos_ocr.swift" \
  "$PROJECT_DIR/README.md" \
  "$PLUGIN_DIR/"

echo "Installed MarkItDown Importer to:"
echo "  $PLUGIN_DIR"
