import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { runMigrations } from '../src/database/migration-runner';

describe('Observability (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    pool.on('error', () => undefined);
    await runMigrations(pool);

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

  it('exposes GET /metrics in Prometheus format with the domain metrics', async () => {
    const response = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(response.text).toContain('territory_rush_ingestion_job_duration_seconds');
    expect(response.text).toContain('territory_rush_osrm_match_latency_seconds');
    expect(response.text).toContain('territory_rush_anti_cheat_rejections_total');
    expect(response.text).toContain('territory_rush_domain_changes_total');
    expect(response.text).toContain('territory_rush_ingest_queue_depth');
    expect(response.text).toContain('territory_rush_process_cpu_seconds_total');
  });
});
