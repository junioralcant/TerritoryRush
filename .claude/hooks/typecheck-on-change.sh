#!/usr/bin/env bash
# PostToolUse hook: runs tsc --noEmit (AcquisitionNew scope) + eslint on the edited .ts/.tsx file.
# Reports only errors that touch the edited file (TS + ESLint errors, e.g. import/order).
# Silent when nothing to fix.

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || true)

[[ -z "${FILE_PATH:-}" || ! -f "$FILE_PATH" ]] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

[[ ! -x ./node_modules/.bin/tsc ]] && exit 0

REL_PATH="${FILE_PATH#$PROJECT_DIR/}"

case "$REL_PATH" in
  modernization/modules/AcquisitionNew/*|modules/gol-sdk/src/services/acquisitionNew/*) ;;
  *) exit 0 ;;
esac

CACHE_DIR="node_modules/.cache/claude-tsc"
mkdir -p "$CACHE_DIR"

cat > "$CACHE_DIR/tsconfig.json" <<'JSON'
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowJs": false
  },
  "include": [
    "../../../modernization/modules/AcquisitionNew/**/*.ts",
    "../../../modernization/modules/AcquisitionNew/**/*.tsx",
    "../../../modules/gol-sdk/src/services/acquisitionNew/**/*.ts"
  ]
}
JSON

# --- TypeScript (scope-wide tsc, filtered to the edited file) ---
TSC_OUTPUT=$(./node_modules/.bin/tsc -p "$CACHE_DIR/tsconfig.json" --noEmit --incremental --tsBuildInfoFile "$CACHE_DIR/tsbuildinfo" 2>&1) || true
TSC_FILTERED=$(printf '%s\n' "$TSC_OUTPUT" | grep -E "(^|/)${REL_PATH}\(" || true)

# --- ESLint (edited file only; --quiet => errors only, ignores warnings) ---
# --rule import/no-duplicates: equivalente ao SonarQube S3863 ("imported multiple times"),
# não habilitado no .eslintrc do projeto, então é forçado aqui sem alterar a config global.
ESLINT_FILTERED=""
if [[ -x ./node_modules/.bin/eslint ]]; then
  ESLINT_FILTERED=$(./node_modules/.bin/eslint --quiet --format compact \
    --rule '{"import/no-duplicates":"error"}' \
    "$REL_PATH" 2>/dev/null | grep -E ', (Error|Warning) -' || true)
fi

if [[ -n "$TSC_FILTERED" || -n "$ESLINT_FILTERED" ]]; then
  {
    echo "Erros introduzidos em $REL_PATH (corrija antes de continuar):"
    [[ -n "$TSC_FILTERED" ]] && { echo "[TypeScript]"; echo "$TSC_FILTERED"; }
    [[ -n "$ESLINT_FILTERED" ]] && { echo "[ESLint]"; echo "$ESLINT_FILTERED"; }
  } >&2
  exit 2
fi

exit 0
