import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import { ProfileRepository } from '../ports/profile-repository.port';
import {
  CreateRunnerProfileInput,
  RunnerProfile,
  RunnerProfileAggregates,
  RunnerProfileRow,
} from '../profile.types';

const SELECT_COLUMNS = `id, user_id, name, city, photo_url, total_distance_m, streak_days, last_active_on, created_at, updated_at`;

const toDomain = (row: RunnerProfileRow): RunnerProfile => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  city: row.city,
  photoUrl: row.photo_url,
  totalDistanceM: Number(row.total_distance_m),
  streakDays: row.streak_days,
  lastActiveOn: row.last_active_on ? row.last_active_on.toISOString().slice(0, 10) : null,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

@Injectable()
export class PgProfileRepository implements ProfileRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<RunnerProfile | null> {
    const result = await this.pool.query<RunnerProfileRow>(
      `select ${SELECT_COLUMNS} from public.runner_profile where user_id = $1`,
      [userId],
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async create(input: CreateRunnerProfileInput): Promise<RunnerProfile> {
    const inserted = await this.pool.query<RunnerProfileRow>(
      `insert into public.runner_profile (user_id, name)
       values ($1, $2)
       on conflict (user_id) do nothing
       returning ${SELECT_COLUMNS}`,
      [input.userId, input.name ?? null],
    );

    if (inserted.rows[0]) {
      return toDomain(inserted.rows[0]);
    }

    const existing = await this.findByUserId(input.userId);
    if (!existing) {
      throw new Error(`Failed to create or load runner profile for user ${input.userId}`);
    }
    return existing;
  }

  async ensureSignedUpAt(userId: string): Promise<string> {
    await this.pool.query(
      `insert into public.runner_profile (user_id) values ($1) on conflict (user_id) do nothing`,
      [userId],
    );
    const result = await this.pool.query<{ signed_up_at: Date }>(
      `select signed_up_at from public.runner_profile where user_id = $1`,
      [userId],
    );
    return result.rows[0].signed_up_at.toISOString();
  }

  async loadAggregates(userId: string): Promise<RunnerProfileAggregates> {
    const [owned, explored, total, national, primaryCity] = await Promise.all([
      this.pool.query<{ count: number }>(
        `select count(*)::int as count from public.street where owner_user_id = $1`,
        [userId],
      ),
      // streetsExplored (distinct streets visited) stands in for RF-6.2's
      // "neighborhoods explored": the geo model has cities, not neighborhoods yet.
      this.pool.query<{ count: number }>(
        `select count(distinct street_id)::int as count from public.street_score where user_id = $1`,
        [userId],
      ),
      this.pool.query<{ total_points: string }>(
        `select total_points from public.runner_profile where user_id = $1`,
        [userId],
      ),
      this.pool.query<{ rank: number }>(
        `select 1 + count(*)::int as rank from public.runner_profile
         where total_points > coalesce((select total_points from public.runner_profile where user_id = $1), 0)`,
        [userId],
      ),
      this.pool.query<{ city_id: string; count: number }>(
        `select city_id, count(*)::int as count from public.street
         where owner_user_id = $1 group by city_id order by count desc, city_id asc limit 1`,
        [userId],
      ),
    ]);

    let cityRank: number | null = null;
    const cityId = primaryCity.rows[0]?.city_id ?? null;
    if (primaryCity.rows[0]) {
      const { city_id, count } = primaryCity.rows[0];
      const rankResult = await this.pool.query<{ rank: number }>(
        `select 1 + count(*)::int as rank from (
           select owner_user_id, count(*) as owned from public.street
           where city_id = $1 and owner_user_id is not null group by owner_user_id
         ) ranked where ranked.owned > $2`,
        [city_id, count],
      );
      cityRank = rankResult.rows[0].rank;
    }

    return {
      totalPoints: Number(total.rows[0]?.total_points ?? 0),
      streetsOwned: owned.rows[0].count,
      streetsExplored: explored.rows[0].count,
      cityId,
      cityRank,
      nationalRank: national.rows[0].rank,
    };
  }
}
