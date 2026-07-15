import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import { Bbox, StreetRow } from '../geo.types';
import { StreetRepository } from '../ports/street-repository.port';

const SELECT_SUMMARY = `s.id, s.osm_name, s.city_id, s.owner_user_id, ST_AsGeoJSON(s.geom) as geojson`;

// Absorption of unnamed ways into a continuous named street (deriveStreetsFromOsmRoads).
// OSM splits a physical street into many ways and frequently drops the `name` tag on
// some pieces (junctions, bridges, short connectors). An unnamed piece is folded into
// the named street it *continues* — endpoints share an OSM node AND the two segments
// leave that node close to a straight line (a through-continuation, not a branch).
const STRAIGHT_MAX_DEFLECTION_DEG = 35;
// Junction match precision in decimal degrees of coordinate rounding (~0.11 m at the
// equator). Split ways share exact nodes, so this only needs to survive float noise.
const JUNCTION_SNAP_DECIMALS = 6;
// Cap on how far a named street may grow by absorbing unnamed continuations (meters of
// swallowed length, accumulated along the chain). Genuine street-splits are short; a
// long collinear unnamed way is a separate road (typically a rural highway span). Without
// this, chain-following runs a straight highway across municipalities into one street.
const ABSORB_MAX_CHAIN_M = 2000;

@Injectable()
export class PgStreetRepository implements StreetRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findInBbox(bbox: Bbox, limit: number): Promise<StreetRow[]> {
    const result = await this.pool.query<StreetRow>(
      `select ${SELECT_SUMMARY}
       from public.street s
       where s.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
         and ST_Intersects(s.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
       order by s.osm_name
       limit $5`,
      [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, limit],
    );
    return result.rows;
  }

  async findByNameAndCity(cityId: string, name: string): Promise<StreetRow | null> {
    const result = await this.pool.query<StreetRow>(
      `select ${SELECT_SUMMARY}
       from public.street s
       where s.city_id = $1 and s.osm_name = $2`,
      [cityId, name],
    );
    return result.rows[0] ?? null;
  }

  async coveredLengthByTrace(
    streetIds: string[],
    trace: Array<{ lat: number; lng: number }>,
    radiusMeters: number,
  ): Promise<Map<string, number>> {
    if (streetIds.length === 0 || trace.length === 0) {
      return new Map();
    }
    const result = await this.pool.query<{ id: string; covered_m: string }>(
      `with trace as (
         select ST_Buffer(ST_Collect(ST_SetSRID(ST_MakePoint(lng, lat), 4326))::geography, $2)::geometry as g
         from unnest($3::float8[], $4::float8[]) as t(lng, lat)
       )
       select s.id, coalesce(ST_Length(ST_Intersection(s.geom, trace.g)::geography), 0) as covered_m
       from public.street s, trace
       where s.id = any($1::uuid[])`,
      [streetIds, radiusMeters, trace.map((p) => p.lng), trace.map((p) => p.lat)],
    );
    return new Map(result.rows.map((row) => [row.id, Number(row.covered_m)]));
  }

  async findNearestStreets(points: Array<[number, number]>, maxMeters: number): Promise<Array<StreetRow | null>> {
    if (points.length === 0) {
      return [];
    }
    const result = await this.pool.query<StreetRow & { idx: string }>(
      `select p.idx, ${SELECT_SUMMARY}
       from unnest($1::float8[], $2::float8[]) with ordinality as p(lng, lat, idx)
       left join lateral (
         select * from public.street s
         where ST_DWithin(s.geom::geography, ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography, $3)
         order by s.geom <-> ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)
         limit 1
       ) s on true
       order by p.idx`,
      [points.map((point) => point[0]), points.map((point) => point[1]), maxMeters],
    );
    return result.rows.map((row) => (row.id ? { id: row.id, osm_name: row.osm_name, city_id: row.city_id, owner_user_id: row.owner_user_id, geojson: row.geojson } : null));
  }

  async findCityIdContaining(lng: number, lat: number): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      `select id from public.city_ref
       where ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       order by id asc
       limit 1`,
      [lng, lat],
    );
    return result.rows[0]?.id ?? null;
  }

  async resolveCitiesForOsmRoads(): Promise<number> {
    const result = await this.pool.query(
      `update geo.osm_road r
       set city_id = (
         select c.id
         from public.city_ref c
         where ST_Intersects(c.boundary, r.geom)
         order by ST_Length(ST_Intersection(c.boundary, r.geom)) desc, c.id asc
         limit 1
       )
       where r.city_id is null
         and exists (
           select 1 from public.city_ref c2 where ST_Intersects(c2.boundary, r.geom)
         )`,
    );
    return result.rowCount ?? 0;
  }

  async deriveStreetsFromOsmRoads(): Promise<number> {
    const result = await this.pool.query(
      `with recursive
       roads as (
         select
           row_number() over () as rid,
           osm_id,
           city_id,
           nullif(btrim(name), '') as nm,
           geom,
           ST_NPoints(geom) as npts
         from geo.osm_road
         where city_id is not null and highway is not null
       ),
       ends as (
         select rid, city_id, nm,
           ST_Length(geom::geography) as len_m,
           round(ST_X(ST_StartPoint(geom))::numeric, ${JUNCTION_SNAP_DECIMALS})
             || ',' || round(ST_Y(ST_StartPoint(geom))::numeric, ${JUNCTION_SNAP_DECIMALS}) as node_key,
           ST_Azimuth(ST_StartPoint(geom), ST_PointN(geom, 2)) as az
         from roads where npts >= 2
         union all
         select rid, city_id, nm,
           ST_Length(geom::geography) as len_m,
           round(ST_X(ST_EndPoint(geom))::numeric, ${JUNCTION_SNAP_DECIMALS})
             || ',' || round(ST_Y(ST_EndPoint(geom))::numeric, ${JUNCTION_SNAP_DECIMALS}) as node_key,
           ST_Azimuth(ST_EndPoint(geom), ST_PointN(geom, npts - 1)) as az
         from roads where npts >= 2
       ),
       prop as (
         select r.rid, r.city_id, r.nm as name, 0 as depth, 0::float8 as chain_m, array[r.rid] as path
         from roads r
         where r.nm is not null
         union all
         select eu.rid, eu.city_id, p.name, p.depth + 1, p.chain_m + eu.len_m, p.path || eu.rid
         from prop p
         join ends ef on ef.rid = p.rid
         join ends eu
           on eu.city_id = ef.city_id
          and eu.node_key = ef.node_key
          and eu.rid <> ef.rid
          and eu.nm is null
         where eu.rid <> all(p.path)
           and ef.az is not null
           and eu.az is not null
           and abs(pi() - least(abs(ef.az - eu.az), 2 * pi() - abs(ef.az - eu.az))) <= radians($1)
           and p.chain_m + eu.len_m <= $2
       ),
       absorbed as (
         select distinct on (rid) rid, name
         from prop
         where depth > 0
         order by rid, depth asc, name asc
       ),
       effective as (
         select
           coalesce(r.nm, a.name, 'Via sem nome (' || r.osm_id || ')') as osm_name,
           r.city_id,
           -- Fully-inside roads are kept as-is; only boundary-crossing roads are clipped.
           -- The guard avoids a GEOS 3.4 overlay quirk where ST_Intersection of a
           -- contained line and its polygon can return an empty geometry.
           case
             when ST_CoveredBy(r.geom, c.boundary) then r.geom
             else ST_Intersection(r.geom, c.boundary)
           end as clipped
         from roads r
         left join absorbed a on a.rid = r.rid
         join public.city_ref c on c.id = r.city_id
       ),
       clipped_streets as (
         select osm_name, city_id, ST_Multi(ST_CollectionExtract(ST_Collect(clipped), 2)) as geom
         from effective
         group by city_id, osm_name
       )
       insert into public.street (osm_name, city_id, geom)
       select osm_name, city_id, geom
       from clipped_streets
       where geom is not null and not ST_IsEmpty(geom)
       on conflict (city_id, osm_name)
       do update set geom = excluded.geom, updated_at = now()`,
      [STRAIGHT_MAX_DEFLECTION_DEG, ABSORB_MAX_CHAIN_M],
    );
    return result.rowCount ?? 0;
  }

  async clearDerivedStreets(): Promise<void> {
    await this.pool.query('truncate table public.street cascade');
  }
}
