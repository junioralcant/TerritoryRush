import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { loadConfiguration } from '../../config/configuration';
import { PG_POOL } from '../../database/database.constants';
import { DatabaseModule } from '../../database/database.module';
import { GpsStreams } from '../../modules/activities/activities.types';
import { toGpsTrace } from '../../modules/matching/matching-aggregation';
import { MatchingModule } from '../../modules/matching/matching.module';
import { MapMatchingService } from '../../modules/matching/matching.service';
import { ScoringModule } from '../../modules/scoring/scoring.module';
import { TerritoryService } from '../../modules/territory/territory.service';
import { ObservabilityModule } from '../../observability/observability.module';

/**
 * Re-runs map-matching + scoring for every already-ingested activity, using the
 * GPS streams already stored in `public.activity.gps_streams` — no provider
 * re-fetch. Rebuilds `activity_street`, `street_score` and street ownership after
 * the street network was re-derived (see `geo:derive`), which cascade-wipes those
 * tables. Reuses the production services, so matching/scoring stay in one place.
 *
 * Idempotent: clears `scored_at` on the activities it will re-run and zeroes the
 * affected runners' aggregates first, so points do not double-count.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [loadConfiguration] }),
    ObservabilityModule,
    DatabaseModule,
    MatchingModule,
    ScoringModule,
  ],
  providers: [TerritoryService],
})
class ReprocessModule {}

type ActivityToReprocess = {
  id: string;
  user_id: string;
  gps_streams: GpsStreams;
  activity_date: Date;
};

const run = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(ReprocessModule, { logger: ['error', 'warn'] });
  const pool = app.get<Pool>(PG_POOL);
  const matching = app.get(MapMatchingService);
  const territory = app.get(TerritoryService);
  try {
    const { rows } = await pool.query<ActivityToReprocess>(
      `select id, user_id, gps_streams, coalesce(started_at, created_at) as activity_date
       from public.activity
       where status = 'processed'
         and gps_streams is not null
         and gps_streams ? 'latlng'
         and jsonb_array_length(gps_streams->'latlng') > 0
       order by coalesce(started_at, created_at) asc`,
    );
    if (rows.length === 0) {
      process.stdout.write('Nenhuma atividade processada com streams para reprocessar\n');
      return;
    }

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    await pool.query(
      `update public.runner_profile
       set total_points = 0, streak_days = 0, streak_bonus_tier = 0, last_active_on = null, updated_at = now()
       where user_id = any($1::uuid[])`,
      [userIds],
    );
    await pool.query(`update public.activity set scored_at = null where id = any($1::uuid[])`, [
      rows.map((row) => row.id),
    ]);

    let totalStreets = 0;
    let totalChanges = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const resolved = await matching.matchActivityStreets({
          activityId: row.id,
          userId: row.user_id,
          trace: toGpsTrace(row.gps_streams),
        });
        const now = new Date().toISOString();
        const changes = await territory.scoreAndApply({
          activityId: row.id,
          userId: row.user_id,
          activityDate: new Date(row.activity_date).toISOString(),
          now,
          streets: resolved.map((street) => ({
            streetId: street.streetId,
            cityId: street.cityId,
            isFirstVisit: street.isFirstVisit,
          })),
        });
        totalStreets += resolved.length;
        totalChanges += changes.length;
        process.stdout.write(`activity ${row.id}: ${resolved.length} ruas, ${changes.length} mudanças de dono\n`);
      } catch (error) {
        failed += 1;
        process.stderr.write(`activity ${row.id} falhou: ${(error as Error).message}\n`);
      }
    }

    await pool.query('refresh materialized view public.mv_city_ranking');
    await pool.query('refresh materialized view public.mv_explorer_ranking');
    process.stdout.write(
      `Reprocessadas ${rows.length - failed}/${rows.length} atividades: ${totalStreets} trechos casados, ${totalChanges} mudanças de dono${failed ? `, ${failed} falharam` : ''}\n`,
    );
  } finally {
    await app.close();
  }
};

if (require.main === module) {
  run().catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
