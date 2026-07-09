import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { MapMatchingService } from '../src/modules/matching/matching.service';
import { MatchedEdge } from '../src/modules/matching/matching.types';
import { OSRM_CLIENT, OsrmClient } from '../src/modules/matching/ports/osrm-client.port';

const USER = '55555555-5555-5555-5555-555555555555';
const CITY_A = '66666666-6666-6666-6666-666666666666';
const STREET = '77777777-7777-7777-7777-777777777777';
const ACT1 = '88888888-8888-8888-8888-888888888888';
const ACT2 = '99999999-9999-9999-9999-999999999999';

const EDGES: MatchedEdge[] = [
  { streetName: 'Rua Maranhão', lengthM: 100, coordinate: [0, 0] },
  { streetName: 'Rua Maranhão', lengthM: 50, coordinate: [0, 0] },
  { streetName: '', lengthM: 30, coordinate: [0, 0] },
  { streetName: 'Rua Fantasma', lengthM: 20, coordinate: [0, 0] },
];

const fakeOsrm: OsrmClient = { match: async () => EDGES };

describe('Map-matching flow (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);

    await pool.query(
      `insert into public.city_ref (id, name, boundary)
       values ($1, 'Cidade A', ST_Multi(ST_GeomFromText('POLYGON((-1 -1, 1 -1, 1 1, -1 1, -1 -1))', 4326)))`,
      [CITY_A],
    );
    await pool.query(
      `insert into public.street (id, osm_name, city_id, geom)
       values ($1, 'Rua Maranhão', $2, ST_Multi(ST_GeomFromText('MULTILINESTRING((0 0, 0.1 0.1))', 4326)))`,
      [STREET, CITY_A],
    );
    await pool.query(
      `insert into public.activity (id, user_id, provider, provider_activity_id, status)
       values ($1, $2, 'strava', '901', 'processing'), ($3, $2, 'strava', '902', 'processing')`,
      [ACT1, USER, ACT2],
    );

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_JWT_SECRET = 'integration-secret-value-at-least-32-chars';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OSRM_CLIENT)
      .useValue(fakeOsrm)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await container?.stop();
  });

  it('resolves matched edges to a named street, deduping and dropping unmatched', async () => {
    const resolved = await app
      .get(MapMatchingService)
      .matchActivityStreets({ activityId: ACT1, userId: USER, trace: [{ lat: 0, lng: 0, t: 0 }, { lat: 0.1, lng: 0.1, t: 60 }] });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ streetId: STREET, matchedLengthM: 150, isFirstVisit: true });

    const rows = await pool.query(
      `select street_id, matched_length_m, is_first_visit from public.activity_street where activity_id = $1`,
      [ACT1],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].street_id).toBe(STREET);
    expect(Number(rows.rows[0].matched_length_m)).toBe(150);
    expect(rows.rows[0].is_first_visit).toBe(true);
  });

  it('marks a later activity on the same street as not a first visit', async () => {
    const resolved = await app
      .get(MapMatchingService)
      .matchActivityStreets({ activityId: ACT2, userId: USER, trace: [{ lat: 0, lng: 0, t: 0 }, { lat: 0.1, lng: 0.1, t: 60 }] });

    expect(resolved[0].isFirstVisit).toBe(false);

    const rows = await pool.query(
      `select is_first_visit from public.activity_street where activity_id = $1`,
      [ACT2],
    );
    expect(rows.rows[0].is_first_visit).toBe(false);
  });
});
