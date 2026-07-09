import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sign } from 'jsonwebtoken';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { RankingsService } from '../src/modules/rankings/rankings.service';

const JWT_SECRET = 'integration-secret-value-at-least-32-chars';
const USER_A = 'aaaa1111-aaaa-1111-aaaa-111111111111';
const USER_B = 'bbbb2222-bbbb-2222-bbbb-222222222222';
const CITY_A = 'cccc3333-cccc-3333-cccc-333333333333';
const STREET_1 = 'dddd4444-dddd-4444-dddd-444444444444';
const STREET_2 = 'eeee5555-eeee-5555-eeee-555555555555';

const token = (sub: string): string =>
  sign({ sub }, JWT_SECRET, { algorithm: 'HS256', audience: 'authenticated', expiresIn: 3600 });

describe('Read APIs (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);

    await pool.query(
      `insert into public.runner_profile (user_id, name, city, total_points) values
         ($1, 'Ana', 'São Paulo', 3000), ($2, 'Bruno', 'São Paulo', 1000)`,
      [USER_A, USER_B],
    );
    await pool.query(
      `insert into public.city_ref (id, name, boundary)
       values ($1, 'Cidade A', ST_Multi(ST_GeomFromText('POLYGON((-1 -1, 1 -1, 1 1, -1 1, -1 -1))', 4326)))`,
      [CITY_A],
    );
    await pool.query(
      `insert into public.street (id, osm_name, city_id, geom, owner_user_id, disputes_count) values
         ($1, 'Rua Maranhão', $3, ST_Multi(ST_GeomFromText('MULTILINESTRING((0 0, 0.1 0.1))', 4326)), $4, 2),
         ($2, 'Avenida Brasil', $3, ST_Multi(ST_GeomFromText('MULTILINESTRING((0.2 0.2, 0.3 0.3))', 4326)), $4, 0)`,
      [STREET_1, STREET_2, CITY_A, USER_A],
    );
    await pool.query(
      `insert into public.street_score (street_id, user_id, points, defended_since) values
         ($1, $3, 200, '2026-07-01T00:00:00Z'), ($1, $4, 100, null),
         ($2, $3, 50, '2026-07-01T00:00:00Z')`,
      [STREET_1, STREET_2, USER_A, USER_B],
    );
    await pool.query(
      `insert into public.street_ownership_history (street_id, user_id, acquired_at) values ($1, $2, '2026-07-01T00:00:00Z')`,
      [STREET_1, USER_A],
    );

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.get(RankingsService).refresh();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await container?.stop();
  });

  it('GET /streets/:id returns owner, ranking, history, tenure and disputes', async () => {
    const response = await request(app.getHttpServer())
      .get(`/streets/${STREET_1}`)
      .set('Authorization', `Bearer ${token(USER_A)}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: STREET_1,
      name: 'Rua Maranhão',
      owner: { userId: USER_A, name: 'Ana' },
      disputesCount: 2,
    });
    expect(response.body.tenureDays).toBeGreaterThanOrEqual(0);
    expect(response.body.ranking).toEqual([
      { userId: USER_A, name: 'Ana', points: 200, rank: 1 },
      { userId: USER_B, name: 'Bruno', points: 100, rank: 2 },
    ]);
    expect(response.body.ownershipHistory).toHaveLength(1);
  });

  it('GET /streets/:id returns 404 for an unknown street', async () => {
    await request(app.getHttpServer())
      .get('/streets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token(USER_A)}`)
      .expect(404);
  });

  it('GET /me/profile returns the enriched aggregates', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${token(USER_A)}`)
      .expect(200);

    expect(response.body).toMatchObject({
      userId: USER_A,
      totalPoints: 3000,
      streetsOwned: 2,
      streetsExplored: 2,
      cityRank: 1,
      nationalRank: 1,
    });
  });

  it('GET /rankings/city/:cityId returns the city leaderboard', async () => {
    const response = await request(app.getHttpServer())
      .get(`/rankings/city/${CITY_A}`)
      .set('Authorization', `Bearer ${token(USER_A)}`)
      .expect(200);

    expect(response.body).toEqual([{ userId: USER_A, name: 'Ana', rank: 1, streetsOwned: 2 }]);
  });

  it('GET /rankings/explorers ranks by distinct streets visited', async () => {
    const response = await request(app.getHttpServer())
      .get('/rankings/explorers')
      .set('Authorization', `Bearer ${token(USER_A)}`)
      .expect(200);

    expect(response.body).toEqual([
      { userId: USER_A, name: 'Ana', rank: 1, streetsVisited: 2 },
      { userId: USER_B, name: 'Bruno', rank: 2, streetsVisited: 1 },
    ]);
  });

  it('GET /rankings/city rejects an invalid limit', async () => {
    await request(app.getHttpServer())
      .get(`/rankings/city/${CITY_A}?limit=abc`)
      .set('Authorization', `Bearer ${token(USER_A)}`)
      .expect(400);
  });
});
