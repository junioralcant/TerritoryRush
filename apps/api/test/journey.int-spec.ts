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
import { STRAVA_OAUTH_CLIENT, StravaOAuthClient } from '../src/modules/integrations/strava/ports/strava-oauth-client.port';
import { OSRM_CLIENT, OsrmClient } from '../src/modules/matching/ports/osrm-client.port';
import { RankingsService } from '../src/modules/rankings/rankings.service';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const USER = '41414141-4141-4141-4141-414141414141';
const ATHLETE = '990011';
const CITY = '42424242-4242-4242-4242-424242424242';
const STREET = '43434343-4343-4343-4343-434343434343';
const USER_B = '45454545-4545-4545-4545-454545454545';
const B_ATHLETE = '880022';

const bearer = (sub: string) => ({
  Authorization: `Bearer ${sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: 'authenticated', expiresIn: 3600 })}`,
});
const auth = bearer(USER);

const futureSec = Math.floor(Date.parse('2026-07-09T10:00:00Z') / 1000) + 21_600;
const fakeOauth: StravaOAuthClient = {
  exchangeAuthorizationCode: async () => ({ accessToken: 'a', refreshToken: 'r', expiresAt: futureSec, athleteId: ATHLETE, scopes: ['read'] }),
  refreshAccessToken: async () => ({ accessToken: 'a', refreshToken: 'r', expiresAt: futureSec, athleteId: ATHLETE, scopes: ['read'] }),
  deauthorize: async () => undefined,
};
const ingested: IngestedActivityData = {
  metrics: { distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[0, 0], [0.05, 0.05]], time: [0, 60] },
};
const fakeGateway: ProviderActivityGateway = { provider: 'strava', fetchIngestData: async () => ingested };
const fakeOsrm: OsrmClient = { match: async () => [{ streetName: 'Rua Maranhão', lengthM: 300, coordinate: [0, 0] }] };

describe('Full territory journey (integration E2E)', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    pool = new Pool({ connectionString: postgres.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await pool.query(
      `insert into public.city_ref (id, name, boundary)
       values ($1, 'Cidade E2E', ST_Multi(ST_GeomFromText('POLYGON((-1 -1, 1 -1, 1 1, -1 1, -1 -1))', 4326)))`,
      [CITY],
    );
    await pool.query(
      `insert into public.street (id, osm_name, city_id, geom)
       values ($1, 'Rua Maranhão', $2, ST_Multi(ST_GeomFromText('MULTILINESTRING((0 0, 0.1 0.1))', 4326)))`,
      [STREET, CITY],
    );

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = 'verify';
    process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(64);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STRAVA_OAUTH_CLIENT).useValue(fakeOauth)
      .overrideProvider(STRAVA_ACTIVITY_GATEWAY).useValue(fakeGateway)
      .overrideProvider(OSRM_CLIENT).useValue(fakeOsrm)
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

  it('connects Strava, processes an activity and reflects it across map, profile, ranking and notifications', async () => {
    const server = app.getHttpServer();

    await request(server).post('/integrations/strava/connect').set(auth).send({ code: 'auth-code' }).expect(201);

    await request(server)
      .post('/webhooks/strava')
      .send({ object_type: 'activity', object_id: 777, aspect_type: 'create', owner_id: Number(ATHLETE), subscription_id: 1, event_time: 1_700_000_000 })
      .expect(200);

    const deadline = Date.now() + 30_000;
    let processed = false;
    while (Date.now() < deadline && !processed) {
      const rows = await pool.query(`select status from public.activity where provider_activity_id = '777'`);
      processed = rows.rows[0]?.status === 'processed';
      if (!processed) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    expect(processed).toBe(true);

    const streets = await request(server).get('/streets?bbox=-0.5,-0.5,0.5,0.5').set(auth).expect(200);
    expect(streets.body.find((s: { name: string }) => s.name === 'Rua Maranhão').ownership).toBe('mine');

    const detail = await request(server).get(`/streets/${STREET}`).set(auth).expect(200);
    expect(detail.body.owner.userId).toBe(USER);

    const profile = await request(server).get('/me/profile').set(auth).expect(200);
    expect(profile.body.streetsOwned).toBeGreaterThanOrEqual(1);

    await app.get(RankingsService).refresh();
    const ranking = await request(server).get(`/rankings/city/${CITY}`).set(auth).expect(200);
    expect(ranking.body.find((entry: { userId: string }) => entry.userId === USER)).toBeTruthy();

    const notifications = await request(server).get('/me/notifications').set(auth).expect(200);
    expect(notifications.body.map((n: { type: string }) => n.type)).toContain('street_captured');
  });

  it('transfers the street to a second runner who overtakes, notifying the previous owner', async () => {
    const server = app.getHttpServer();
    await pool.query(
      `insert into public.provider_connection (user_id, provider, provider_athlete_id, scopes)
       values ($1, 'strava', $2, '{}')`,
      [USER_B, B_ATHLETE],
    );

    const runnerBActivity = (objectId: number) => ({
      object_type: 'activity',
      object_id: objectId,
      aspect_type: 'create',
      owner_id: Number(B_ATHLETE),
      subscription_id: 1,
      event_time: 1_700_000_000,
    });

    const waitProcessed = async (providerActivityId: string): Promise<void> => {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const rows = await pool.query(`select status from public.activity where provider_activity_id = $1`, [providerActivityId]);
        if (rows.rows[0]?.status === 'processed') {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Timed out waiting for ${providerActivityId}`);
    };

    await request(server).post('/webhooks/strava').send(runnerBActivity(801)).expect(200);
    await waitProcessed('801');
    await request(server).post('/webhooks/strava').send(runnerBActivity(802)).expect(200);
    await waitProcessed('802');

    const owner = await pool.query(`select owner_user_id, disputes_count from public.street where id = $1`, [STREET]);
    expect(owner.rows[0].owner_user_id).toBe(USER_B);
    expect(owner.rows[0].disputes_count).toBeGreaterThanOrEqual(1);

    const notifications = await request(server).get('/me/notifications').set(auth).expect(200);
    expect(notifications.body.map((n: { type: string }) => n.type)).toContain('street_lost');
  });
});
