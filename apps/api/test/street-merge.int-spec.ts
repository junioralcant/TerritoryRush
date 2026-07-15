import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runMigrations } from '../src/database/migration-runner';
import { PgStreetRepository } from '../src/modules/geo/repositories/street.repository';

const CITY = '11111111-1111-1111-1111-111111111111';

const seedCity = async (pool: Pool): Promise<void> => {
  await pool.query(
    `insert into public.city_ref (id, name, boundary) values
       ($1, 'Cidade A', ST_Multi(ST_GeomFromText('POLYGON((-1 -1, 1 -1, 1 1, -1 1, -1 -1))', 4326)))`,
    [CITY],
  );
};

// Segments are ~0.005° (~550 m) so a short chain stays under the absorption cap.
// A named street running east along y=0 (osm 1), continued by two collinear unnamed
// ways (osm 2, 3) — a short chain, absorbed. An unnamed way turning 90° north off the
// junction (osm 4) is a branch, not the same line. Rua Beta (osm 7) is continued by a
// single long unnamed way (osm 8, ~5.5 km) that exceeds the cap, so it is NOT absorbed.
// A disconnected unnamed island sits apart (osm 6). Rua Borda (osm 9) runs past the east
// edge of the city polygon (x=1) and must be clipped to the boundary.
const seedRoads = async (pool: Pool): Promise<void> => {
  const roads: Array<[number, string | null, string]> = [
    [1, 'Rua Alpha', 'LINESTRING(0 0, 0.005 0)'],
    [2, null, 'LINESTRING(0.005 0, 0.010 0)'],
    [3, null, 'LINESTRING(0.010 0, 0.015 0)'],
    [4, null, 'LINESTRING(0.005 0, 0.005 0.005)'],
    [6, null, 'LINESTRING(0.7 0.7, 0.705 0.705)'],
    [7, 'Rua Beta', 'LINESTRING(0 0.5, 0.005 0.5)'],
    [8, null, 'LINESTRING(0.005 0.5, 0.055 0.5)'],
    [9, 'Rua Borda', 'LINESTRING(0.9 0, 1.5 0)'],
  ];
  for (const [osmId, name, wkt] of roads) {
    await pool.query(
      `insert into geo.osm_road (osm_id, name, highway, geom)
       values ($1, $2, 'residential', ST_GeomFromText($3, 4326))`,
      [osmId, name, wkt],
    );
  }
};

describe('Street merge / unnamed absorption (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await seedCity(pool);
    await seedRoads(pool);

    const repository = new PgStreetRepository(pool);
    await repository.resolveCitiesForOsmRoads();
    await repository.deriveStreetsFromOsmRoads();
  }, 120000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it('produces one street per continuous line, keeping branches, islands and over-cap spans separate', async () => {
    const rows = await pool.query('select osm_name from public.street order by osm_name');
    expect(rows.rows.map((r) => r.osm_name)).toEqual([
      'Rua Alpha',
      'Rua Beta',
      'Rua Borda',
      'Via sem nome (4)',
      'Via sem nome (6)',
      'Via sem nome (8)',
    ]);
  });

  it('folds the short collinear unnamed chain into the named street it continues', async () => {
    const repository = new PgStreetRepository(pool);
    const street = await repository.findByNameAndCity(CITY, 'Rua Alpha');

    expect(street).not.toBeNull();
    const coversAbsorbedTail = await pool.query<{ covered: boolean }>(
      `select ST_DWithin(s.geom::geography, ST_SetSRID(ST_MakePoint(0.012, 0), 4326)::geography, 5) as covered
       from public.street s where s.id = $1`,
      [street!.id],
    );
    expect(coversAbsorbedTail.rows[0].covered).toBe(true);
  });

  it('does not create a separate street for the absorbed unnamed ways', async () => {
    const orphans = await pool.query(
      `select osm_name from public.street where osm_name in ('Via sem nome (2)', 'Via sem nome (3)')`,
    );
    expect(orphans.rows).toHaveLength(0);
  });

  it('keeps a perpendicular unnamed branch as its own street', async () => {
    const repository = new PgStreetRepository(pool);
    const branch = await repository.findByNameAndCity(CITY, 'Via sem nome (4)');
    expect(branch).not.toBeNull();
  });

  it('does not absorb a long unnamed continuation beyond the cap', async () => {
    const repository = new PgStreetRepository(pool);
    const beta = await repository.findByNameAndCity(CITY, 'Rua Beta');
    expect(beta).not.toBeNull();

    const overCapStaysSeparate = await pool.query(
      `select osm_name from public.street where osm_name = 'Via sem nome (8)'`,
    );
    expect(overCapStaysSeparate.rows).toHaveLength(1);

    const betaExcludesFarEnd = await pool.query<{ covered: boolean }>(
      `select ST_DWithin(s.geom::geography, ST_SetSRID(ST_MakePoint(0.055, 0.5), 4326)::geography, 5) as covered
       from public.street s where s.id = $1`,
      [beta!.id],
    );
    expect(betaExcludesFarEnd.rows[0].covered).toBe(false);
  });

  it('clips a street to the city boundary, dropping the part outside', async () => {
    const repository = new PgStreetRepository(pool);
    const borda = await repository.findByNameAndCity(CITY, 'Rua Borda');
    expect(borda).not.toBeNull();

    const coverage = await pool.query<{ inside: boolean; outside: boolean }>(
      `select
         ST_DWithin(s.geom::geography, ST_SetSRID(ST_MakePoint(0.95, 0), 4326)::geography, 100) as inside,
         ST_DWithin(s.geom::geography, ST_SetSRID(ST_MakePoint(1.3, 0), 4326)::geography, 100) as outside
       from public.street s where s.id = $1`,
      [borda!.id],
    );
    expect(coverage.rows[0].inside).toBe(true);
    expect(coverage.rows[0].outside).toBe(false);
  });
});
