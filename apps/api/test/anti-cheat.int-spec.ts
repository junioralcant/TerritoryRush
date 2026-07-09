import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { IngestedActivityData } from '../src/modules/activities/activities.types';
import { PROVIDER_ACTIVITY_GATEWAY, ProviderActivityGateway } from '../src/modules/activities/ports/provider-activity-gateway.port';
import { OSRM_CLIENT, OsrmClient } from '../src/modules/matching/ports/osrm-client.port';

const USER = '12121212-1212-1212-1212-121212121212';
const ATHLETE = 553311;

const validData: IngestedActivityData = {
  metrics: { distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[0, 0]], time: [0] },
};
const fraudData: IngestedActivityData = {
  metrics: { distanceM: 40_000, movingTimeS: 1500, avgPaceSKm: 37.5, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[0, 0]], time: [0] },
};

const fakeGateway: ProviderActivityGateway = {
  provider: 'strava',
  fetchIngestData: async (_userId, providerActivityId) => (providerActivityId === '701' ? fraudData : validData),
};
const fakeOsrm: OsrmClient = { match: async () => [] };

const activityEvent = (objectId: number): Record<string, unknown> => ({
  object_type: 'activity',
  object_id: objectId,
  aspect_type: 'create',
  owner_id: ATHLETE,
  subscription_id: 1,
  event_time: 1_700_000_000,
});

describe('Anti-cheat guard (integration)', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let pool: Pool;
  let app: INestApplication;

  const waitForStatus = async (providerActivityId: string, timeoutMs = 25_000): Promise<string> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await pool.query(
        `select status from public.activity where provider = 'strava' and provider_activity_id = $1`,
        [providerActivityId],
      );
      const status = result.rows[0]?.status;
      if (status === 'processed' || status === 'rejected') {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for activity ${providerActivityId}`);
  };

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    pool = new Pool({ connectionString: postgres.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await pool.query(
      `insert into public.provider_connection (user_id, provider, provider_athlete_id, scopes)
       values ($1, 'strava', $2, '{}')`,
      [USER, String(ATHLETE)],
    );

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    process.env.SUPABASE_JWT_SECRET = 'integration-secret-value-at-least-32-chars';
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = 'verify';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVIDER_ACTIVITY_GATEWAY)
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

  it('rejects a vehicle-speed activity with a persisted reason', async () => {
    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent(701)).expect(200);

    expect(await waitForStatus('701')).toBe('rejected');
    const row = await pool.query(`select rejection_reason from public.activity where provider_activity_id = '701'`);
    expect(row.rows[0].rejection_reason).toBe('Velocidade média incompatível com corrida');
  });

  it('processes a valid running activity', async () => {
    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent(702)).expect(200);

    expect(await waitForStatus('702')).toBe('processed');
    const row = await pool.query(`select rejection_reason from public.activity where provider_activity_id = '702'`);
    expect(row.rows[0].rejection_reason).toBeNull();
  });
});
