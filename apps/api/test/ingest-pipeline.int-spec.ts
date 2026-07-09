import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { sign } from 'jsonwebtoken';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { IngestedActivityData } from '../src/modules/activities/activities.types';
import { ProviderActivityGateway } from '../src/modules/activities/ports/provider-activity-gateway.port';
import { STRAVA_ACTIVITY_GATEWAY } from '../src/modules/integrations/strava/strava-activity.gateway';
import { OSRM_CLIENT, OsrmClient } from '../src/modules/matching/ports/osrm-client.port';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const JWT_AUD = 'authenticated';
const USER = '44444444-4444-4444-4444-444444444444';
const ATHLETE = 778899;

const token = (sub: string): string =>
  sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: JWT_AUD, expiresIn: 3600 });

const INGESTED: IngestedActivityData = {
  metrics: { distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[-23.55, -46.63], [-23.56, -46.64]], time: [0, 60] },
};

const fetchCalls: string[] = [];
const fakeGateway: ProviderActivityGateway = {
  provider: 'strava',
  fetchIngestData: async (_userId: string, providerActivityId: string) => {
    fetchCalls.push(providerActivityId);
    return INGESTED;
  },
};

const fakeOsrm: OsrmClient = { match: async () => [] };

const activityEvent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  object_type: 'activity',
  object_id: 555,
  aspect_type: 'create',
  owner_id: ATHLETE,
  subscription_id: 1,
  event_time: 1_700_000_000,
  ...overrides,
});

describe('Ingestion pipeline (integration): webhook -> BullMQ -> worker -> DB', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let pool: Pool;
  let app: INestApplication;

  const waitForStatus = async (providerActivityId: string, status: string, timeoutMs = 25_000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await pool.query(
        `select status from public.activity where provider = 'strava' and provider_activity_id = $1`,
        [providerActivityId],
      );
      if (result.rows[0]?.status === status) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for activity ${providerActivityId} to reach status ${status}`);
  };

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;

    pool = new Pool({ connectionString: postgres.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await pool.query(
      `insert into public.provider_connection (user_id, provider, provider_athlete_id, scopes)
       values ($1, 'strava', $2, '{}')`,
      [USER, String(ATHLETE)],
    );

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = redisUrl;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.SUPABASE_JWT_AUD = JWT_AUD;
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = 'verify';
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STRAVA_ACTIVITY_GATEWAY)
      .useValue(fakeGateway)
      .overrideProvider(OSRM_CLIENT)
      .useValue(fakeOsrm)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await redis?.stop();
    await postgres?.stop();
    delete process.env.REDIS_URL;
  });

  it('processes a webhook activity end to end and stores metrics + streams', async () => {
    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent()).expect(200);

    await waitForStatus('555', 'processed');

    const row = await pool.query(
      `select user_id, distance_m, moving_time_s, gps_streams from public.activity where provider_activity_id = '555'`,
    );
    expect(row.rows[0].user_id).toBe(USER);
    expect(Number(row.rows[0].distance_m)).toBe(5000);
    expect(row.rows[0].moving_time_s).toBe(1500);
    expect(row.rows[0].gps_streams.latlng).toHaveLength(2);
  });

  it('exposes the processed activity via GET /activities?status=processed', async () => {
    const response = await request(app.getHttpServer())
      .get('/activities?status=processed')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ providerActivityId: '555', status: 'processed' });
  });

  it('rejects an invalid status filter (400)', async () => {
    await request(app.getHttpServer())
      .get('/activities?status=done')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(400);
  });

  it('is idempotent: a duplicate webhook does not create a second activity', async () => {
    const before = fetchCalls.length;
    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent()).expect(200);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const count = await pool.query(`select count(*)::int as count from public.activity where provider_activity_id = '555'`);
    expect(count.rows[0].count).toBe(1);
    expect(fetchCalls.length).toBe(before);
  });
});
