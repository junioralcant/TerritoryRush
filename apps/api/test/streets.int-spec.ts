import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sign } from 'jsonwebtoken';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { PgStreetRepository } from '../src/modules/geo/repositories/street.repository';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const JWT_AUD = 'authenticated';

const token = (sub: string): string =>
  sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: JWT_AUD, expiresIn: 3600 });

const CITY_A = '11111111-1111-1111-1111-111111111111';
const CITY_B = '22222222-2222-2222-2222-222222222222';

const seedCities = async (pool: Pool): Promise<void> => {
  await pool.query(
    `insert into public.city_ref (id, name, boundary) values
       ($1, 'Cidade A', ST_Multi(ST_GeomFromText('POLYGON((-1 -1, 1 -1, 1 1, -1 1, -1 -1))', 4326))),
       ($2, 'Cidade B', ST_Multi(ST_GeomFromText('POLYGON((9 9, 11 9, 11 11, 9 11, 9 9))', 4326)))`,
    [CITY_A, CITY_B],
  );
};

const seedRoads = async (pool: Pool): Promise<void> => {
  const roads: Array<[number, string | null, string | null, string]> = [
    [1, 'Rua Maranhão', 'residential', 'LINESTRING(0 0, 0.1 0.1)'],
    [2, 'Rua Maranhão', 'residential', 'LINESTRING(0.1 0.1, 0.2 0.2)'],
    [3, 'Avenida Brasil', 'primary', 'LINESTRING(0 0.5, 0.3 0.5)'],
    [4, null, 'residential', 'LINESTRING(0.5 0, 0.6 0.1)'],
    [5, 'Rua Maranhão', 'residential', 'LINESTRING(10 10, 10.1 10.1)'],
  ];
  for (const [osmId, name, highway, wkt] of roads) {
    await pool.query(
      `insert into geo.osm_road (osm_id, name, highway, geom)
       values ($1, $2, $3, ST_GeomFromText($4, 4326))`,
      [osmId, name, highway, wkt],
    );
  }
};

describe('Streets / geo flow (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await seedCities(pool);
    await seedRoads(pool);

    const repository = new PgStreetRepository(pool);
    await repository.resolveCitiesForOsmRoads();
    await repository.deriveStreetsFromOsmRoads();

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.SUPABASE_JWT_AUD = JWT_AUD;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await container?.stop();
  });

  it('collapses same-name segments per city and keeps distinct ways separate', async () => {
    const total = await pool.query('select count(*)::int as count from public.street');
    expect(total.rows[0].count).toBe(4);

    const cityA = await pool.query(
      'select osm_name from public.street where city_id = $1 order by osm_name',
      [CITY_A],
    );
    expect(cityA.rows.map((r) => r.osm_name)).toEqual([
      'Avenida Brasil',
      'Rua Maranhão',
      'Via sem nome (4)',
    ]);
  });

  it('resolves a street by name and city, and returns null for a miss', async () => {
    const repository = new PgStreetRepository(pool);

    const found = await repository.findByNameAndCity(CITY_A, 'Rua Maranhão');
    expect(found).not.toBeNull();
    expect(found?.osm_name).toBe('Rua Maranhão');
    expect(found?.city_id).toBe(CITY_A);

    const miss = await repository.findByNameAndCity(CITY_A, 'Rua Inexistente');
    expect(miss).toBeNull();
  });

  it('rejects GET /streets without a token (401)', async () => {
    await request(app.getHttpServer()).get('/streets?bbox=-0.5,-0.5,1,1').expect(401);
  });

  it('rejects GET /streets with an invalid bbox (400)', async () => {
    await request(app.getHttpServer())
      .get('/streets?bbox=not,a,valid,bbox')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .expect(400);
  });

  it('returns streets within the bbox with ownership state', async () => {
    const response = await request(app.getHttpServer())
      .get('/streets?bbox=-0.5,-0.5,1,1')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .expect(200);

    expect(response.body).toHaveLength(3);
    for (const street of response.body) {
      expect(street.ownership).toBe('unclaimed');
      expect(street.ownerUserId).toBeNull();
      expect(street.geometry.type).toBe('MultiLineString');
      expect(street.cityId).toBe(CITY_A);
    }
    expect(response.body.map((s: { name: string }) => s.name).sort()).toEqual([
      'Avenida Brasil',
      'Rua Maranhão',
      'Via sem nome (4)',
    ]);
  });

  it('returns an empty list for a bbox with no streets', async () => {
    const response = await request(app.getHttpServer())
      .get('/streets?bbox=5,5,6,6')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });
});
