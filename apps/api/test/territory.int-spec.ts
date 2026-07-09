import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';
import { TerritoryService } from '../src/modules/territory/territory.service';

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CITY_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const STREET = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

describe('Scoring + territory flow (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  const seedActivity = async (activityId: string, userId: string, providerActivityId: string): Promise<void> => {
    await pool.query(
      `insert into public.activity (id, user_id, provider, provider_activity_id, status)
       values ($1, $2, 'strava', $3, 'processing')`,
      [activityId, userId, providerActivityId],
    );
    await pool.query(
      `insert into public.activity_street (activity_id, street_id, is_first_visit) values ($1, $2, true)`,
      [activityId, STREET],
    );
  };

  const apply = (activityId: string, userId: string, isFirstVisit: boolean) =>
    app.get(TerritoryService).scoreAndApply({
      activityId,
      userId,
      activityDate: '2026-07-09T10:00:00.000Z',
      now: '2026-07-09T10:00:00.000Z',
      streets: [{ streetId: STREET, cityId: CITY_A, isFirstVisit }],
    });

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

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_JWT_SECRET = 'integration-secret-value-at-least-32-chars';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    await container?.stop();
  });

  it('first activity: runner A claims the street with exploration + new-city points', async () => {
    await seedActivity('00000000-0000-0000-0000-0000000000a1', USER_A, '9001');
    const changes = await apply('00000000-0000-0000-0000-0000000000a1', USER_A, true);

    expect(changes).toEqual([{ streetId: STREET, previousOwnerId: null, newOwnerId: USER_A }]);

    const street = await pool.query(`select owner_user_id, disputes_count from public.street where id = $1`, [STREET]);
    expect(street.rows[0].owner_user_id).toBe(USER_A);
    expect(street.rows[0].disputes_count).toBe(0);

    const score = await pool.query(`select points from public.street_score where street_id = $1 and user_id = $2`, [STREET, USER_A]);
    expect(Number(score.rows[0].points)).toBe(100);

    const activityStreet = await pool.query(`select points_awarded from public.activity_street where activity_id = $1`, ['00000000-0000-0000-0000-0000000000a1']);
    expect(Number(activityStreet.rows[0].points_awarded)).toBe(100);

    const profile = await pool.query(`select total_points from public.runner_profile where user_id = $1`, [USER_A]);
    expect(Number(profile.rows[0].total_points)).toBe(100 + 2000);
  });

  it('tie keeps the current owner', async () => {
    await seedActivity('00000000-0000-0000-0000-0000000000b1', USER_B, '9002');
    const changes = await apply('00000000-0000-0000-0000-0000000000b1', USER_B, true);

    expect(changes).toEqual([]);

    const street = await pool.query(`select owner_user_id, disputes_count from public.street where id = $1`, [STREET]);
    expect(street.rows[0].owner_user_id).toBe(USER_A);
    expect(street.rows[0].disputes_count).toBe(0);
    const score = await pool.query(`select points from public.street_score where street_id = $1 and user_id = $2`, [STREET, USER_B]);
    expect(Number(score.rows[0].points)).toBe(100);
  });

  it('takeover: runner B overtakes, incrementing disputes and updating history', async () => {
    await seedActivity('00000000-0000-0000-0000-0000000000b2', USER_B, '9003');
    const changes = await apply('00000000-0000-0000-0000-0000000000b2', USER_B, false);

    expect(changes).toEqual([{ streetId: STREET, previousOwnerId: USER_A, newOwnerId: USER_B }]);

    const street = await pool.query(`select owner_user_id, disputes_count from public.street where id = $1`, [STREET]);
    expect(street.rows[0].owner_user_id).toBe(USER_B);
    expect(street.rows[0].disputes_count).toBe(1);

    const scoreB = await pool.query(`select points from public.street_score where street_id = $1 and user_id = $2`, [STREET, USER_B]);
    expect(Number(scoreB.rows[0].points)).toBe(110);

    const closed = await pool.query(
      `select lost_at from public.street_ownership_history where street_id = $1 and user_id = $2`,
      [STREET, USER_A],
    );
    expect(closed.rows[0].lost_at).not.toBeNull();
    const open = await pool.query(
      `select lost_at from public.street_ownership_history where street_id = $1 and user_id = $2 and lost_at is null`,
      [STREET, USER_B],
    );
    expect(open.rows).toHaveLength(1);
  });
});
