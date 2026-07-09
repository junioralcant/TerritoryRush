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
import { GARMIN_ACTIVITY_GATEWAY } from '../src/modules/integrations/garmin/garmin-activity.gateway';
import { OSRM_CLIENT, OsrmClient } from '../src/modules/matching/ports/osrm-client.port';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const USER = '21212121-2121-2121-2121-212121212121';
const GARMIN_ATHLETE = 'garmin-user-1';

const token = (sub: string): string =>
  sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: 'authenticated', expiresIn: 3600 });

const ingested: IngestedActivityData = {
  metrics: { distanceM: 6000, movingTimeS: 1800, avgPaceSKm: 300, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[0, 0]], time: [0] },
};
const fakeGarminGateway: ProviderActivityGateway = { provider: 'garmin', fetchIngestData: async () => ingested };
const fakeOsrm: OsrmClient = { match: async () => [] };

const garminPush = { activities: [{ userId: GARMIN_ATHLETE, summaryId: 'g-555' }] };

describe('Garmin integration behind feature flag', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let pool: Pool;
  let appOn: INestApplication;
  let appOff: INestApplication;

  const waitForStatus = async (providerActivityId: string, timeoutMs = 25_000): Promise<string> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await pool.query(
        `select status from public.activity where provider = 'garmin' and provider_activity_id = $1`,
        [providerActivityId],
      );
      if (result.rows[0]?.status) {
        return result.rows[0].status;
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
       values ($1, 'garmin', $2, '{}')`,
      [USER, GARMIN_ATHLETE],
    );

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;

    process.env.GARMIN_ENABLED = 'true';
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    const onRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GARMIN_ACTIVITY_GATEWAY)
      .useValue(fakeGarminGateway)
      .overrideProvider(OSRM_CLIENT)
      .useValue(fakeOsrm)
      .compile();
    appOn = onRef.createNestApplication();
    appOn.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await appOn.init();

    delete process.env.GARMIN_ENABLED;
    delete process.env.REDIS_URL;
    const offRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    appOff = offRef.createNestApplication();
    appOff.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await appOff.init();
  });

  afterAll(async () => {
    await appOn?.close();
    await appOff?.close();
    await pool?.end();
    await redis?.stop();
    await postgres?.stop();
    delete process.env.REDIS_URL;
    delete process.env.GARMIN_ENABLED;
  });

  it('flag on: a Garmin push runs through the same ingestion pipeline', async () => {
    await request(appOn.getHttpServer()).post('/webhooks/garmin').send(garminPush).expect(200);

    expect(await waitForStatus('g-555')).toBe('processed');
    const row = await pool.query(
      `select user_id, distance_m from public.activity where provider = 'garmin' and provider_activity_id = 'g-555'`,
    );
    expect(row.rows[0].user_id).toBe(USER);
    expect(Number(row.rows[0].distance_m)).toBe(6000);
  });

  it('flag off: the Garmin webhook is inert (404)', async () => {
    await request(appOff.getHttpServer()).post('/webhooks/garmin').send(garminPush).expect(404);
  });

  it('flag off: the Garmin connection endpoint is inert (404)', async () => {
    await request(appOff.getHttpServer())
      .get('/integrations/garmin')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(404);
  });

  it('flag off: the Strava webhook remains available', async () => {
    await request(appOff.getHttpServer())
      .get('/webhooks/strava')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': 'x' })
      .expect(403);
  });
});
