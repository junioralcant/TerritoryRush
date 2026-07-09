#!/usr/bin/env bash
# Run sonar-scanner against the GOL App Mobile repo, optionally scoped to a path.
#
# Usage:
#   scripts/sonar-scan.sh [--key <projectKey>] [--path <relative/path>] [--with-coverage]
#
# Defaults:
#   --key   gol-app-mobile-passageiros if --path matches the Passageiros tree,
#           otherwise gol-app-mobile.
#   --path  unset → uses sonar.sources from sonar-project.properties.

set -euo pipefail

KEY=""
SCAN_PATH=""
RUN_COVERAGE=false

while [ "$#" -gt 0 ]; do
  case "$1" in
    --key) KEY="$2"; shift 2 ;;
    --path) SCAN_PATH="$2"; shift 2 ;;
    --with-coverage) RUN_COVERAGE=true; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "ERROR: unknown arg: $1" >&2; exit 64 ;;
  esac
done

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../../../.." && pwd)
PROPS_FILE="$REPO_ROOT/sonar-project.properties"

if ! command -v sonar-scanner >/dev/null 2>&1; then
  echo "ERROR: sonar-scanner not on PATH. Install via 'brew install sonar-scanner'." >&2
  exit 2
fi

if [ ! -f "$PROPS_FILE" ]; then
  echo "ERROR: $PROPS_FILE not found. The skill expects this file at the repo root." >&2
  exit 2
fi

# Resolve token (env wins; fallback to comment in properties file).
TOKEN=${SONAR_TOKEN:-}
if [ -z "$TOKEN" ]; then
  TOKEN=$(grep -oE '(sqa|squ|sqp)_[a-f0-9]+' "$PROPS_FILE" | tail -n 1 || true)
fi
if [ -z "$TOKEN" ]; then
  echo "ERROR: no SonarQube token. Set SONAR_TOKEN or add a comment with the token to sonar-project.properties." >&2
  exit 2
fi

# Resolve default project key from scope.
if [ -z "$KEY" ]; then
  if [ -n "$SCAN_PATH" ] && [[ "$SCAN_PATH" == *AcquisitionNew/screens/Passageiros* ]]; then
    KEY="gol-app-mobile-passageiros"
  elif [ -n "$SCAN_PATH" ]; then
    SLUG=$(basename "$SCAN_PATH" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/-\+/-/g; s/^-//; s/-$//')
    KEY="gol-app-mobile-${SLUG}"
  else
    KEY="gol-app-mobile"
  fi
fi

if [ "$RUN_COVERAGE" = true ]; then
  echo "INFO: regenerating coverage via 'yarn test:coverage' (may take a while)..."
  (cd "$REPO_ROOT" && yarn test:coverage)
fi

EXTRA_ARGS=()
if [ -n "$SCAN_PATH" ]; then
  EXTRA_ARGS+=("-Dsonar.sources=$SCAN_PATH" "-Dsonar.tests=$SCAN_PATH" "-Dsonar.exclusions=" "-Dsonar.coverage.exclusions=")
fi

echo "INFO: scanning projectKey=$KEY ${SCAN_PATH:+scope=$SCAN_PATH}"

(cd "$REPO_ROOT" && sonar-scanner \
  -Dsonar.projectKey="$KEY" \
  -Dsonar.host.url="${SONAR_HOST_URL:-http://localhost:9000}" \
  -Dsonar.token="$TOKEN" \
  "${EXTRA_ARGS[@]}")

echo "DONE: dashboard at ${SONAR_HOST_URL:-http://localhost:9000}/dashboard?id=$KEY"
