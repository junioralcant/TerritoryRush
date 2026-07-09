import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import {
  ActivityRecord,
  ActivityRow,
  ActivityStatus,
  CreateActivityInput,
  IngestedActivityData,
} from '../activities.types';
import { ActivityRepository } from '../ports/activity-repository.port';

const SELECT_COLUMNS = `id, user_id, provider, provider_activity_id, status, distance_m, moving_time_s, avg_pace_s_km, started_at, rejection_reason`;

const toDomain = (row: ActivityRow): ActivityRecord => ({
  id: row.id,
  userId: row.user_id,
  provider: row.provider,
  providerActivityId: row.provider_activity_id,
  status: row.status,
  distanceM: row.distance_m,
  movingTimeS: row.moving_time_s,
  avgPaceSKm: row.avg_pace_s_km,
  startedAt: row.started_at ? row.started_at.toISOString() : null,
  rejectionReason: row.rejection_reason,
});

@Injectable()
export class PgActivityRepository implements ActivityRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createIfAbsent(input: CreateActivityInput): Promise<ActivityRecord> {
    const inserted = await this.pool.query<ActivityRow>(
      `insert into public.activity (user_id, provider, provider_activity_id, status)
       values ($1, $2, $3, 'imported')
       on conflict (provider, provider_activity_id) do nothing
       returning ${SELECT_COLUMNS}`,
      [input.userId, input.provider, input.providerActivityId],
    );
    if (inserted.rows[0]) {
      return toDomain(inserted.rows[0]);
    }
    const existing = await this.findByProviderActivityId(input.provider, input.providerActivityId);
    if (!existing) {
      throw new Error(`Failed to create or load activity ${input.provider}:${input.providerActivityId}`);
    }
    return existing;
  }

  async updateStatus(id: string, status: ActivityStatus, rejectionReason: string | null = null): Promise<void> {
    await this.pool.query(
      `update public.activity set status = $2, rejection_reason = $3, updated_at = now() where id = $1`,
      [id, status, rejectionReason],
    );
  }

  async saveIngestedData(id: string, data: IngestedActivityData): Promise<void> {
    await this.pool.query(
      `update public.activity set
         distance_m = $2, moving_time_s = $3, avg_pace_s_km = $4, started_at = $5,
         gps_streams = $6, updated_at = now()
       where id = $1`,
      [
        id,
        data.metrics.distanceM,
        data.metrics.movingTimeS,
        data.metrics.avgPaceSKm,
        data.metrics.startedAt,
        JSON.stringify(data.streams),
      ],
    );
  }

  async findByUserAndStatus(userId: string, status?: ActivityStatus): Promise<ActivityRecord[]> {
    const result = await this.pool.query<ActivityRow>(
      `select ${SELECT_COLUMNS}
       from public.activity
       where user_id = $1 and ($2::public.activity_status is null or status = $2)
       order by started_at desc nulls last, created_at desc`,
      [userId, status ?? null],
    );
    return result.rows.map(toDomain);
  }

  async findByProviderActivityId(provider: string, providerActivityId: string): Promise<ActivityRecord | null> {
    const result = await this.pool.query<ActivityRow>(
      `select ${SELECT_COLUMNS} from public.activity where provider = $1 and provider_activity_id = $2`,
      [provider, providerActivityId],
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }
}
