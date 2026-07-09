import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sign } from 'jsonwebtoken';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { INGEST_ACTIVITY_QUEUE } from '../src/modules/activities/ports/ingest-activity-queue.port';
import { InMemoryIngestActivityQueue } from '../src/modules/activities/queue/in-memory-ingest-activity.queue';
import { STRAVA_OAUTH_CLIENT, StravaOAuthClient } from '../src/modules/integrations/strava/ports/strava-oauth-client.port';
import { TOKEN_CIPHER, TokenCipher } from '../src/modules/integrations/strava/ports/token-cipher.port';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const JWT_AUD = 'authenticated';
const VERIFY_TOKEN = 'territory-rush-verify';
const ENCRYPTION_KEY = 'a'.repeat(64);

const USER = '33333333-3333-3333-3333-333333333333';
const ATHLETE = '778899';

const token = (sub: string): string =>
  sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: JWT_AUD, expiresIn: 3600 });

const fakeOauth: StravaOAuthClient = {
  exchangeAuthorizationCode: async () => ({
    accessToken: 'access-xyz',
    refreshToken: 'refresh-xyz',
    expiresAt: Math.floor(Date.now() / 1000) + 21_600,
    athleteId: ATHLETE,
    scopes: ['read', 'activity:read'],
  }),
  refreshAccessToken: async () => ({
    accessToken: 'access-new',
    refreshToken: 'refresh-new',
    expiresAt: Math.floor(Date.now() / 1000) + 21_600,
    athleteId: ATHLETE,
    scopes: ['read'],
  }),
  deauthorize: async () => undefined,
};

const activityEvent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  object_type: 'activity',
  object_id: 555,
  aspect_type: 'create',
  owner_id: Number(ATHLETE),
  subscription_id: 1,
  event_time: 1_700_000_000,
  ...overrides,
});

describe('Strava integration flow', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  const queue = (): InMemoryIngestActivityQueue =>
    app.get<InMemoryIngestActivityQueue>(INGEST_ACTIVITY_QUEUE);

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.SUPABASE_JWT_AUD = JWT_AUD;
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
    process.env.TOKEN_ENCRYPTION_KEY = ENCRYPTION_KEY;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STRAVA_OAUTH_CLIENT)
      .useValue(fakeOauth)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await container?.stop();
  });

  it('connects Strava and stores encrypted tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/integrations/strava/connect')
      .set('Authorization', `Bearer ${token(USER)}`)
      .send({ code: 'auth-code' })
      .expect(201);

    expect(response.body).toMatchObject({ provider: 'strava', connected: true, athleteId: ATHLETE });

    const row = await pool.query('select access_token, provider_athlete_id from public.provider_connection where user_id = $1', [USER]);
    expect(row.rows[0].provider_athlete_id).toBe(ATHLETE);
    expect(row.rows[0].access_token).not.toBe('access-xyz');
    expect(app.get<TokenCipher>(TOKEN_CIPHER).decrypt(row.rows[0].access_token)).toBe('access-xyz');
  });

  it('validates the webhook challenge and rejects a bad verify token', async () => {
    await request(app.getHttpServer())
      .get('/webhooks/strava')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': 'echo-me' })
      .expect(200)
      .expect({ 'hub.challenge': 'echo-me' });

    await request(app.getHttpServer())
      .get('/webhooks/strava')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'x' })
      .expect(403);
  });

  it('enqueues exactly one ingest job per new activity (idempotent)', async () => {
    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent()).expect(200);
    await request(app.getHttpServer()).post('/webhooks/strava').send(activityEvent()).expect(200);

    const jobs = queue().enqueuedJobs();
    expect(jobs).toEqual([{ userId: USER, provider: 'strava', providerActivityId: '555' }]);
  });

  it('acknowledges but does not enqueue non-create or unknown-athlete events', async () => {
    const before = queue().enqueuedJobs().length;

    await request(app.getHttpServer())
      .post('/webhooks/strava')
      .send(activityEvent({ object_id: 999, aspect_type: 'update' }))
      .expect(200);
    await request(app.getHttpServer())
      .post('/webhooks/strava')
      .send(activityEvent({ object_id: 888, owner_id: 111111 }))
      .expect(200);

    expect(queue().enqueuedJobs()).toHaveLength(before);
  });

  it('disconnects Strava and removes the connection', async () => {
    await request(app.getHttpServer())
      .delete('/integrations/strava/disconnect')
      .set('Authorization', `Bearer ${token(USER)}`)
      .expect(204);

    const row = await pool.query('select 1 from public.provider_connection where user_id = $1', [USER]);
    expect(row.rowCount).toBe(0);
  });
});
