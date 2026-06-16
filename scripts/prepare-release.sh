#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PROJECT_DIR/manifest.json" | head -1)"
if [[ -z "$VERSION" ]]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi
OUT_DIR="$PROJECT_DIR/dist/markitdown-importer-$VERSION"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp "$PROJECT_DIR/main.js" "$PROJECT_DIR/manifest.json" "$PROJECT_DIR/styles.css" "$OUT_DIR/"

echo "Prepared Obsidian release assets:"
echo "  $OUT_DIR/main.js"
echo "  $OUT_DIR/manifest.json"
echo "  $OUT_DIR/styles.css"
