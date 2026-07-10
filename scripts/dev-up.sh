#!/usr/bin/env bash
set -euo pipefail

# Sobe a stack local completa do Territory Rush em um comando:
#   Postgres + Redis (infra) -> OSRM (map-matching) -> API (foreground).
# Os serviços Docker sobem detached; a API roda em foreground (Ctrl-C encerra só
# a API — o Docker segue de pé). Use `npm run dev:down` para derrubar o Docker.
#
# Overrides: OSRM_REGION (default sao-mateus), OSRM_PORT (default 5050; no macOS
# a porta 5000 é do AirPlay).

OSRM_REGION="${OSRM_REGION:-sao-mateus}"
OSRM_PORT="${OSRM_PORT:-5050}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

wait_for() {
  local name=$1 host=$2 port=$3 i
  printf 'aguardando %s (%s:%s)' "$name" "$host" "$port"
  for i in $(seq 1 90); do
    if nc -z -w1 "$host" "$port" 2>/dev/null; then
      printf ' OK\n'
      return 0
    fi
    printf '.'
    sleep 1
  done
  printf ' TIMEOUT\n'
  return 1
}

echo '==> Postgres + Redis (infra)'
docker compose -f infra/docker-compose.yml up -d

echo "==> OSRM (${OSRM_REGION}, porta ${OSRM_PORT})"
(cd infra/osrm && OSRM_REGION="$OSRM_REGION" OSRM_PORT="$OSRM_PORT" docker compose up -d)

wait_for Postgres localhost 5433
wait_for Redis localhost 6380
wait_for OSRM localhost "$OSRM_PORT"

echo '==> API (start:dev) — Ctrl-C encerra a API; o Docker continua rodando.'
exec npm run api:dev
