import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import { ActivityStreetRecord, UpsertActivityStreetInput } from '../matching.types';
import { ActivityStreetRepository } from '../ports/activity-street-repository.port';

type ActivityStreetRow = {
  activity_id: string;
  street_id: string;
  points_awarded: string;
  is_first_visit: boolean;
  matched_length_m: number | null;
};

@Injectable()
export class PgActivityStreetRepository implements ActivityStreetRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async hasUserVisitedStreet(userId: string, streetId: string, excludeActivityId: string): Promise<boolean> {
    const result = await this.pool.query(
      `select 1
       from public.activity_street ast
       join public.activity a on a.id = ast.activity_id
       where a.user_id = $1 and ast.street_id = $2 and ast.activity_id <> $3
       limit 1`,
      [userId, streetId, excludeActivityId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async upsert(input: UpsertActivityStreetInput): Promise<void> {
    await this.pool.query(
      `insert into public.activity_street (activity_id, street_id, is_first_visit, matched_length_m)
       values ($1, $2, $3, $4)
       on conflict (activity_id, street_id) do update set
         is_first_visit = excluded.is_first_visit,
         matched_length_m = excluded.matched_length_m`,
      [input.activityId, input.streetId, input.isFirstVisit, input.matchedLengthM],
    );
  }

  async findByActivity(activityId: string): Promise<ActivityStreetRecord[]> {
    const result = await this.pool.query<ActivityStreetRow>(
      `select activity_id, street_id, points_awarded, is_first_visit, matched_length_m
       from public.activity_street where activity_id = $1`,
      [activityId],
    );
    return result.rows.map((row) => ({
      activityId: row.activity_id,
      streetId: row.street_id,
      pointsAwarded: Number(row.points_awarded),
      isFirstVisit: row.is_first_visit,
      matchedLengthM: row.matched_length_m,
    }));
  }
}
