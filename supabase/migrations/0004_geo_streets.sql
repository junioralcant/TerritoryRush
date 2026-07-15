-- 0004_geo_streets.sql
-- Geographic reference data and the territorial unit of the game.
--
-- geo.osm_road   : staging of OpenStreetMap road segments (populated by the
--                  osm2pgsql import pipeline in infra/geo/import).
-- public.city_ref: reference cities with an administrative boundary, used to
--                  attribute each road to a city.
-- public.street  : the territorial unit — a *named road aggregated per city*.
--                  Every segment sharing the same name within a city collapses
--                  into one street. Unnamed ways that continue a named street on
--                  the same line (shared node + near-straight angle) are folded
--                  into it; unnamed ways with no such continuation keep a
--                  deterministic per-way fallback label. Each street's geometry
--                  is clipped to its city boundary, so a road passing through the
--                  city contributes only its in-city portion.

create table if not exists public.city_ref (
  id       uuid                          primary key default gen_random_uuid(),
  name     text                          not null,
  region   text,
  country  text                          not null default 'BR',
  boundary geometry(MultiPolygon, 4326)  not null
);

create index if not exists idx_city_ref_boundary on public.city_ref using gist (boundary);
create index if not exists idx_city_ref_name on public.city_ref (name);

create table if not exists geo.osm_road (
  osm_id  bigint,
  name    text,
  highway text,
  city_id uuid,
  geom    geometry(LineString, 4326) not null
);

create index if not exists idx_osm_road_geom on geo.osm_road using gist (geom);
create index if not exists idx_osm_road_city on geo.osm_road (city_id);

create table if not exists public.street (
  id             uuid                             primary key default gen_random_uuid(),
  osm_name       text                             not null,
  city_id        uuid                             not null references public.city_ref (id) on delete cascade,
  geom           geometry(MultiLineString, 4326)  not null,
  owner_user_id  uuid,
  top_score      bigint                           not null default 0,
  disputes_count integer                          not null default 0,
  created_at     timestamptz                      not null default now(),
  updated_at     timestamptz                      not null default now(),
  unique (city_id, osm_name)
);

create index if not exists idx_street_geom on public.street using gist (geom);
create index if not exists idx_street_city on public.street (city_id);
create index if not exists idx_street_owner on public.street (owner_user_id);
