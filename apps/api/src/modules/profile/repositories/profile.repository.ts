import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import { ProfileRepository } from '../ports/profile-repository.port';
import { CreateRunnerProfileInput, RunnerProfile, RunnerProfileRow } from '../profile.types';

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
}
