#!/bin/bash

set -euo pipefail

FILE_PATH=$(jq -r '.tool_input.file_path')

case "$FILE_PATH" in
  *.js | *.ts | *.jsx | *.tsx | *.json | *.html | *.css | *.md)
    echo "Formatting $FILE_PATH with prettier"
    npx prettier --write "$FILE_PATH"
    ;;
  *)
    echo "Skipping formatting for $FILE_PATH"
    ;;
esac
