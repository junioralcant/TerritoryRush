import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runMigrations } from '../src/database/migration-runner';
import { PgStreetRepository } from '../src/modules/geo/repositories/street.repository';

const CITY = '11111111-1111-1111-1111-111111111111';
const USER = '33333333-3333-3333-3333-333333333333';

const seedCity = async (pool: Pool): Promise<void> => {
  await pool.query(
    `insert into public.city_ref (id, name, boundary) values
       ($1, 'Cidade A', ST_Multi(ST_GeomFromText('POLYGON((-1 -1, 1 -1, 1 1, -1 1, -1 -1))', 4326)))`,
    [CITY],
  );
};

const seedRoads = async (pool: Pool): Promise<void> => {
  const roads: Array<[number, string, string]> = [
    [1, 'Rua Alpha', 'LINESTRING(0 0, 0.1 0)'],
    [2, 'Avenida Brasil', 'LINESTRING(0 0.5, 0.3 0.5)'],
  ];
  for (const [osmId, name, wkt] of roads) {
    await pool.query(
      `insert into geo.osm_road (osm_id, name, highway, geom)
       values ($1, $2, 'residential', ST_GeomFromText($3, 4326))`,
      [osmId, name, wkt],
    );
  }
};

const seedGameplay = async (pool: Pool, streetId: string): Promise<void> => {
  const activity = await pool.query<{ id: string }>(
    `insert into public.activity (user_id, provider, provider_activity_id, status)
     values ($1, 'strava', 'act-1', 'processed') returning id`,
    [USER],
  );
  await pool.query(
    `insert into public.activity_street (activity_id, street_id, is_first_visit)
     values ($1, $2, true)`,
    [activity.rows[0].id, streetId],
  );
  await pool.query(
    `insert into public.street_score (street_id, user_id, points) values ($1, $2, 100)`,
    [streetId, USER],
  );
};

const count = async (pool: Pool, table: string): Promise<number> => {
  const result = await pool.query<{ n: number }>(`select count(*)::int as n from ${table}`);
  return result.rows[0].n;
};

describe('Street reset / full reload from scratch (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: PgStreetRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await seedCity(pool);
    await seedRoads(pool);

    repository = new PgStreetRepository(pool);
    await repository.resolveCitiesForOsmRoads();
    await repository.deriveStreetsFromOsmRoads();

    const alpha = await repository.findByNameAndCity(CITY, 'Rua Alpha');
    await seedGameplay(pool, alpha!.id);
  }, 120000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it('cascades the wipe through street, activity_street and street_score', async () => {
    expect(await count(pool, 'public.street')).toBeGreaterThan(0);
    expect(await count(pool, 'public.activity_street')).toBe(1);
    expect(await count(pool, 'public.street_score')).toBe(1);

    await repository.clearDerivedStreets();

    expect(await count(pool, 'public.street')).toBe(0);
    expect(await count(pool, 'public.activity_street')).toBe(0);
    expect(await count(pool, 'public.street_score')).toBe(0);
    expect(await count(pool, 'public.activity')).toBe(1);
  });

  it('rebuilds the street network from staging after the wipe', async () => {
    const derived = await repository.deriveStreetsFromOsmRoads();
    expect(derived).toBeGreaterThan(0);

    const rows = await pool.query('select osm_name from public.street order by osm_name');
    expect(rows.rows.map((r) => r.osm_name)).toEqual(['Avenida Brasil', 'Rua Alpha']);
  });
});
