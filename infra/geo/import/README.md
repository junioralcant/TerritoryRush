# OSM import → named-street network

Loads a regional OpenStreetMap extract into PostGIS and derives the game's
territorial unit: the **named road aggregated per city** (`public.street`).

## Pipeline

1. **osm2pgsql** loads a `.osm.pbf` extract into `planet_osm_line` (SRID 4326 via
   `--latlong`).
2. **`staging.sql`** copies the highway segments into the normalized staging
   table `geo.osm_road` (splitting multilinestrings into linestrings).
3. **`geo:derive`** (`apps/api`) resolves each road to a city by spatial join
   against `public.city_ref`, then aggregates segments by `(city, name)` into
   `public.street`. Unnamed ways get a deterministic `Via sem nome (<osm_id>)`
   label so distinct ways stay separate. The derivation SQL lives in
   `PgStreetRepository` (single source of truth; also exercised by integration
   tests) and is invoked here via the `derive-cli` entrypoint.

## Run

```bash
# reference cities must already be in public.city_ref
DATABASE_URL=postgres://territory:territory@localhost:5433/territory_rush \
  ./import.sh region.osm.pbf
```

The extract is intentionally not committed. Download a regional extract (e.g.
Geofabrik) sized to the pilot city. Re-running is safe: `street` upserts on
`(city_id, osm_name)` and `staging.sql` truncates `geo.osm_road` first.
