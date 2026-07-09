#!/usr/bin/env bash
# Ensure the sonarqube-local container is running and the API reports UP.
#
# Exit codes:
#   0  ready (status=UP)
#   10 container does not exist (needs recreation)
#   11 timeout waiting for UP
#   12 docker daemon unreachable

set -euo pipefail

CONTAINER_NAME=${SONAR_CONTAINER:-sonarqube-local}
HOST=${SONAR_HOST_URL:-http://localhost:9000}
TIMEOUT_SECS=${SONAR_UP_TIMEOUT:-120}

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: docker daemon not reachable. Start Docker Desktop." >&2
  exit 12
fi

if ! docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "ERROR: container '$CONTAINER_NAME' does not exist. Recreate it (see references/runbook.md)." >&2
  exit 10
fi

running=$(docker container inspect -f '{{.State.Running}}' "$CONTAINER_NAME")
if [ "$running" != "true" ]; then
  echo "INFO: starting container '$CONTAINER_NAME'..."
  docker start "$CONTAINER_NAME" >/dev/null
fi

elapsed=0
interval=3
while [ $elapsed -lt $TIMEOUT_SECS ]; do
  status=$(curl -s "$HOST/api/system/status" 2>/dev/null | sed -nE 's/.*"status":"([A-Z]+)".*/\1/p' || true)
  case "$status" in
    UP)
      echo "READY: $HOST status=UP"
      exit 0
      ;;
    "")
      echo "INFO: $HOST not reachable yet (${elapsed}s)"
      ;;
    *)
      echo "INFO: $HOST status=$status (${elapsed}s)"
      ;;
  esac
  sleep $interval
  elapsed=$((elapsed + interval))
done

echo "ERROR: timed out after ${TIMEOUT_SECS}s waiting for $HOST to report UP." >&2
echo "Hint: docker logs $CONTAINER_NAME --tail 80" >&2
exit 11
