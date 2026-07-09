#!/usr/bin/env bash
# Thin wrapper around the SonarQube Web API.
#
# Usage:
#   scripts/sonar-api.sh <path-with-query>            # GET
#   scripts/sonar-api.sh -X POST <path> [curl-args]   # other verbs
#
# Reads the token from $SONAR_TOKEN, or falls back to the last sqa_/squ_/sqp_
# value present as a comment inside sonar-project.properties at the repo root.
#
# Prints the response body to stdout (pretty-printed when JSON). Errors and
# HTTP status >= 400 are reported on stderr and produce a non-zero exit.

set -euo pipefail

HOST=${SONAR_HOST_URL:-http://localhost:9000}

# Resolve repo root (skill lives two levels below the project root).
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../../../.." && pwd)
PROPS_FILE="$REPO_ROOT/sonar-project.properties"

resolve_token() {
  if [ -n "${SONAR_TOKEN:-}" ]; then
    echo "$SONAR_TOKEN"
    return
  fi
  if [ -f "$PROPS_FILE" ]; then
    grep -oE '(sqa|squ|sqp)_[a-f0-9]+' "$PROPS_FILE" | tail -n 1
  fi
}

TOKEN=$(resolve_token || true)
if [ -z "${TOKEN:-}" ]; then
  echo "ERROR: no SonarQube token. Set SONAR_TOKEN env var or add the token as a comment to sonar-project.properties." >&2
  exit 2
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-with-query> [extra-curl-args...]" >&2
  exit 64
fi

# First arg may be an option (-X, -d, etc) — pass through if so.
if [[ "$1" == -* ]]; then
  curl_args=("$@")
  # The path must be present somewhere in args; we don't try to interpolate the host.
  echo "ERROR: when using custom curl args, supply the FULL URL yourself or use the default GET form." >&2
  exit 64
fi

API_PATH="$1"
shift

# Allow caller to override the verb / pass form fields, etc.
HTTP_OUT=$(mktemp)
trap 'rm -f "$HTTP_OUT"' EXIT

STATUS=$(curl -sS -o "$HTTP_OUT" -w '%{http_code}' \
  -u "$TOKEN:" \
  "$HOST$API_PATH" "$@")

if [ "$STATUS" -ge 400 ]; then
  echo "ERROR: HTTP $STATUS for $API_PATH" >&2
  cat "$HTTP_OUT" >&2 || true
  exit 1
fi

# Pretty-print JSON; otherwise raw passthrough.
if python3 -m json.tool < "$HTTP_OUT" 2>/dev/null; then
  :
else
  cat "$HTTP_OUT"
fi
