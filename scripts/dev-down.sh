#!/usr/bin/env bash
set -euo pipefail

# Derruba os serviços Docker da stack local (OSRM + Postgres + Redis).
# Os dados do Postgres ficam no volume (não são apagados). A API roda fora do
# Docker, então basta um Ctrl-C na janela dela.

OSRM_REGION="${OSRM_REGION:-sao-mateus}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo '==> OSRM'
(cd infra/osrm && OSRM_REGION="$OSRM_REGION" docker compose down)

echo '==> Postgres + Redis (infra)'
docker compose -f infra/docker-compose.yml down
