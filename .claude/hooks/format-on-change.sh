#!/usr/bin/env bash
# PostToolUse hook: runs prettier + eslint --fix on the file Claude just edited.
# Never blocks. Stays silent on success.

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || true)

[[ -z "${FILE_PATH:-}" || ! -f "$FILE_PATH" ]] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

if [[ -x ./node_modules/.bin/prettier ]]; then
  ./node_modules/.bin/prettier --write "$FILE_PATH" --log-level=warn >/dev/null 2>&1 || true
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    if [[ -x ./node_modules/.bin/eslint ]]; then
      ./node_modules/.bin/eslint --fix --quiet "$FILE_PATH" >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
