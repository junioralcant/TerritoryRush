# OSRM (foot profile) for map-matching

Self-hosted [OSRM](https://project-osrm.org/) serving `/match/v1/foot`, used by the
`matching` module to snap GPS traces to the road network.

## Build & run

OSRM needs a processed OSM extract. Download a regional `.osm.pbf` (e.g. Geofabrik),
then process it with the **foot** profile and serve it:

```bash
cd infra/osrm
# place ${OSRM_REGION}.osm.pbf in this directory (here: sao-mateus.osm.pbf)
OSRM_REGION=sao-mateus docker compose up
# OSRM is now on http://localhost:5000 -> set OSRM_URL=http://localhost:5000
```

On macOS, port 5000 is taken by the AirPlay Receiver, so map the routed service
elsewhere and point `OSRM_URL` at it:

```bash
OSRM_REGION=sao-mateus OSRM_PORT=5050 docker compose up
# -> set OSRM_URL=http://localhost:5050
```

`docker-compose.yml` runs, in order:
1. `osrm-extract -p /opt/foot.lua /data/${OSRM_REGION}.osm.pbf`
2. `osrm-partition` + `osrm-customize` (MLD pipeline)
3. `osrm-routed --algorithm mld` serving container port 5000 (mapped to `OSRM_PORT`)

The extract is intentionally not committed (large, region-specific). Re-run the
pipeline when the OSM data is refreshed.

## Comandos úteis (do `infra/osrm`)

```bash
docker compose logs -f osrm-routed           # logs
OSRM_REGION=sao-mateus docker compose down   # derrubar
```

## Notes

- The API talks to OSRM over HTTP with a short timeout and a circuit breaker
  (`HttpOsrmClient`); if OSRM is unavailable the activity stays `processing` and is
  retried by BullMQ — it is never lost.
- Integration tests mock the OSRM client at its port (a real OSRM requires this
  processed extract), while the street resolution and `activity_street` writes run
  against real PostGIS.
