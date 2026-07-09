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
import { EXPO_PUSH_CLIENT, ExpoPushClient } from '../src/modules/notifications/ports/expo-push-client.port';
import { ExpoPushMessage } from '../src/modules/notifications/notifications.types';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const USER = '13131313-1313-1313-1313-131313131313';
const ATHLETE = 224466;
const CITY_A = '14141414-1414-1414-1414-141414141414';
const STREET = '15151515-1515-1515-1515-151515151515';

const token = (sub: string): string =>
  sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: 'authenticated', expiresIn: 3600 });

const ingested: IngestedActivityData = {
  metrics: { distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[0, 0], [0.01, 0.01]], time: [0, 60] },
};
const fakeGateway: ProviderActivityGateway = { provider: 'strava', fetchIngestData: async () => ingested };
const fakeOsrm: OsrmClient = {
  match: async () => [{ streetName: 'Rua Maranhão', lengthM: 200, coordinate: [0, 0] }],
};
const pushes: ExpoPushMessage[] = [];
const fakeExpo: ExpoPushClient = { send: async (_tokens, message) => { pushes.push(message); } };

const activityEvent = { object_type: 'activity', object_id: 4242, aspect_type: 'create', owner_id: ATHLETE, subscription_id: 1, event_time: 1_700_000_000 };

describe('Achievements + notifications (integration)', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let pool: Pool;
  let app: INestApplication;

  const waitForAchievement = async (timeoutMs = 25_000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await pool.query(`select count(*)::int as count from public.runner_achievement where user_id = $1`, [USER]);
      if (result.rows[0].count > 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('Timed out waiting for achievements to unlock');
  };

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    pool = new Pool({ connectionString: postgres.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);
    await pool.query(`insert into public.runner_profile (user_id, name) values ($1, 'Ana')`, [USER]);
    await pool.query(
      `insert into public.provider_connection (user_id, provider, provider_athlete_id, scopes) values ($1, 'strava', $2, '{}')`,
      [USER, String(ATHLETE)],
    );
    await pool.query(`insert into public.device_token (user_id, token, platform) values ($1, 'ExpoTok[xyz]', 'ios')`, [USER]);
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

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = 'verify';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STRAVA_ACTIVITY_GATEWAY).useValue(fakeGateway)
      .overrideProvider(OSRM_CLIENT).useValue(fakeOsrm)
      .overrideProvider(EXPO_PUSH_CLIENT).useValue(fakeExpo)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent).expect(200);
    await waitForAchievement();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await redis?.stop();
    await postgres?.stop();
    delete process.env.REDIS_URL;
  });

  it('unlocks milestone achievements after processing the activity', async () => {
    const codes = (await pool.query<{ achievement_code: string }>(
      `select achievement_code from public.runner_achievement where user_id = $1`,
      [USER],
    )).rows.map((row) => row.achievement_code);

    expect(codes).toEqual(expect.arrayContaining(['first_run', 'first_street', 'first_city']));
  });

  it('persists notifications and sends a push for the captured street', async () => {
    const types = (await pool.query<{ type: string }>(
      `select type from public.notification where user_id = $1`,
      [USER],
    )).rows.map((row) => row.type);

    expect(types).toEqual(expect.arrayContaining(['street_captured', 'achievement_unlocked', 'top10_city']));
    expect(pushes.length).toBeGreaterThan(0);
  });

  it('POST /me/device-tokens registers a device token', async () => {
    await request(app.getHttpServer())
      .post('/me/device-tokens')
      .set('Authorization', `Bearer ${token(USER)}`)
      .send({ token: 'ExpoTok[new-device]', platform: 'android' })
      .expect(204);

    const row = await pool.query(`select platform from public.device_token where token = 'ExpoTok[new-device]'`);
    expect(row.rows[0].platform).toBe('android');
  });

  it('GET /me/achievements shows unlocked and locked milestones', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/achievements')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(200);

    const firstStreet = response.body.find((a: { code: string }) => a.code === 'first_street');
    const streets1000 = response.body.find((a: { code: string }) => a.code === 'streets_1000');
    expect(firstStreet.unlocked).toBe(true);
    expect(streets1000.unlocked).toBe(false);
  });

  it('GET /me/notifications lists the runner notifications', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/notifications')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('POST /me/notifications/:id/read marks a notification as read', async () => {
    const list = await request(app.getHttpServer())
      .get('/me/notifications')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(200);
    const id = list.body[0].id;

    await request(app.getHttpServer())
      .post(`/me/notifications/${id}/read`)
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(204);

    const row = await pool.query(`select read_at from public.notification where id = $1`, [id]);
    expect(row.rows[0].read_at).not.toBeNull();
  });
});
