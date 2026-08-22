#!/bin/bash
set -e

SOURCE_DIR="../../docs/public/llms"
LINKS_FILE="../../docs/public/all-links-llms.txt"
TARGET_DIR="data/corpus"
TARGET_LINKS="data/all-links.txt"

# Ensure we run from the code directory
cd "$(dirname "$0")/.."

if [ ! -d "$SOURCE_DIR" ]; then
  echo "ERROR: Source directory $SOURCE_DIR does not exist."
  echo "This script must be run in a workspace where the 'docs' repository is checked out next to 'liara-ai-assistant'."
  exit 1
fi

echo "Copying corpus from $SOURCE_DIR to $TARGET_DIR..."
mkdir -p "$TARGET_DIR"
cp -r "$SOURCE_DIR"/* "$TARGET_DIR/"

if [ -f "$LINKS_FILE" ]; then
  echo "Copying links file..."
  cp "$LINKS_FILE" "$TARGET_LINKS"
fi

echo "Corpus copy complete. $(find "$TARGET_DIR" -type f -name "*.md" | wc -l) markdown files copied."