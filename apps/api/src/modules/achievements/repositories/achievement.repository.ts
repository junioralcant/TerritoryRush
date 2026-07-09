import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import { AchievementCatalogEntry, RunnerAchievementView, RunnerStats } from '../achievements.types';
import { AchievementRepository } from '../ports/achievement-repository.port';

@Injectable()
export class PgAchievementRepository implements AchievementRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async loadRunnerStats(userId: string): Promise<RunnerStats> {
    const result = await this.pool.query<{
      activity_count: number;
      streets_owned: number;
      total_distance_km: number;
      cities_explored: number;
    }>(
      `select
         (select count(*)::int from public.activity where user_id = $1 and status = 'processed') as activity_count,
         (select count(*)::int from public.street where owner_user_id = $1) as streets_owned,
         (select coalesce(sum(distance_m), 0) / 1000.0 from public.activity where user_id = $1 and status = 'processed') as total_distance_km,
         (select count(distinct s.city_id)::int from public.street_score ss
            join public.street s on s.id = ss.street_id where ss.user_id = $1) as cities_explored`,
      [userId],
    );
    const row = result.rows[0];
    return {
      activityCount: row.activity_count,
      streetsOwned: row.streets_owned,
      totalDistanceKm: Number(row.total_distance_km),
      citiesExplored: row.cities_explored,
    };
  }

  async findUnlockedCodes(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ achievement_code: string }>(
      `select achievement_code from public.runner_achievement where user_id = $1`,
      [userId],
    );
    return result.rows.map((row) => row.achievement_code);
  }

  async unlock(userId: string, codes: string[]): Promise<void> {
    if (codes.length === 0) {
      return;
    }
    await this.pool.query(
      `insert into public.runner_achievement (user_id, achievement_code)
       select $1, unnest($2::text[])
       on conflict (user_id, achievement_code) do nothing`,
      [userId, codes],
    );
  }

  async listForRunner(userId: string): Promise<RunnerAchievementView[]> {
    const result = await this.pool.query<{
      code: string;
      title: string;
      category: string;
      threshold: number;
      unlocked_at: Date | null;
    }>(
      `select a.code, a.title, a.category, a.threshold, ra.unlocked_at
       from public.achievement a
       left join public.runner_achievement ra on ra.achievement_code = a.code and ra.user_id = $1
       order by a.threshold asc, a.code asc`,
      [userId],
    );
    return result.rows.map((row) => ({
      code: row.code,
      title: row.title,
      category: row.category,
      threshold: row.threshold,
      unlocked: row.unlocked_at !== null,
      unlockedAt: row.unlocked_at ? row.unlocked_at.toISOString() : null,
    }));
  }

  async loadCatalog(): Promise<AchievementCatalogEntry[]> {
    const result = await this.pool.query<AchievementCatalogEntry>(
      `select code, title, category, threshold from public.achievement order by threshold asc`,
    );
    return result.rows;
  }
}
