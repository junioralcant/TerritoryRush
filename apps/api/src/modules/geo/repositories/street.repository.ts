import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import { Bbox, StreetRow } from '../geo.types';
import { StreetRepository } from '../ports/street-repository.port';

const SELECT_SUMMARY = `s.id, s.osm_name, s.city_id, s.owner_user_id, ST_AsGeoJSON(s.geom) as geojson`;

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

  async resolveCitiesForOsmRoads(): Promise<number> {
    const result = await this.pool.query(
      `update geo.osm_road r
       set city_id = c.id
       from public.city_ref c
       where r.city_id is null and ST_Intersects(c.boundary, r.geom)`,
    );
    return result.rowCount ?? 0;
  }

  async deriveStreetsFromOsmRoads(): Promise<number> {
    const result = await this.pool.query(
      `insert into public.street (osm_name, city_id, geom)
       select
         coalesce(nullif(btrim(name), ''), 'Via sem nome (' || osm_id || ')') as osm_name,
         city_id,
         ST_Multi(ST_Collect(geom)) as geom
       from geo.osm_road
       where city_id is not null and highway is not null
       group by city_id, coalesce(nullif(btrim(name), ''), 'Via sem nome (' || osm_id || ')')
       on conflict (city_id, osm_name)
       do update set geom = excluded.geom, updated_at = now()`,
    );
    return result.rowCount ?? 0;
  }
}
