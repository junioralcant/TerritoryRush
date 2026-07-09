import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sign } from 'jsonwebtoken';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const JWT_AUD = 'authenticated';

const tokenFor = (sub: string, email?: string): string =>
  sign({ sub, ...(email ? { email } : {}) }, JWT_SECRET, {
    algorithm: 'HS256',
    audience: JWT_AUD,
    expiresIn: 3600,
  });

describe('Profile flow (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
      .withDatabase('territory_rush')
      .withUsername('territory')
      .withPassword('territory')
      .start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);

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

  it('rejects GET /me/profile without a token (401)', async () => {
    await request(app.getHttpServer()).get('/me/profile').expect(401);
  });

  it('rejects GET /me/profile with an invalid token (401)', async () => {
    await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('creates the runner profile on first authenticated access (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${tokenFor('11111111-1111-1111-1111-111111111111', 'junior@example.com')}`)
      .expect(200);

    expect(response.body).toMatchObject({
      userId: '11111111-1111-1111-1111-111111111111',
      name: 'junior',
      totalDistanceM: 0,
      streakDays: 0,
    });

    const rows = await pool.query('select count(*)::int as count from public.runner_profile where user_id = $1', [
      '11111111-1111-1111-1111-111111111111',
    ]);
    expect(rows.rows[0].count).toBe(1);
  });

  it('is idempotent: a repeated request returns the same profile without duplicating it', async () => {
    const token = tokenFor('22222222-2222-2222-2222-222222222222', 'carla@example.com');

    const first = await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(second.body.id).toBe(first.body.id);

    const rows = await pool.query('select count(*)::int as count from public.runner_profile where user_id = $1', [
      '22222222-2222-2222-2222-222222222222',
    ]);
    expect(rows.rows[0].count).toBe(1);
  });

  it('creates a distinct profile per authenticated user', async () => {
    await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${tokenFor('33333333-3333-3333-3333-333333333333')}`)
      .expect(200);

    const distinct = await pool.query('select count(distinct user_id)::int as count from public.runner_profile');
    expect(distinct.rows[0].count).toBeGreaterThanOrEqual(3);
  });
});
