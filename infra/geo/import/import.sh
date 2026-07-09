#!/usr/bin/env bash
# import.sh — load a regional OpenStreetMap extract into PostGIS and derive the
# game's named-street network.
#
# Prerequisites:
#   - DATABASE_URL pointing at the target Postgres+PostGIS database
#   - a regional extract (.osm.pbf), e.g. from https://download.geofabrik.de
#   - reference cities already loaded into public.city_ref
#   - osm2pgsql available (natively or via Docker)
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/db ./import.sh path/to/region.osm.pbf
set -euo pipefail

EXTRACT="${1:?Usage: import.sh <region.osm.pbf>}"
: "${DATABASE_URL:?DATABASE_URL is required}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/3] Loading OSM extract with osm2pgsql (foot-relevant road network)"
osm2pgsql --create --slim --latlong \
  --database "$DATABASE_URL" \
  "$EXTRACT"

echo "==> [2/3] Staging planet_osm_line into geo.osm_road"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$HERE/staging.sql"

echo "==> [3/3] Resolving cities and deriving named streets"
npm --prefix "$HERE/../../../apps/api" run geo:derive

echo "==> Done."
