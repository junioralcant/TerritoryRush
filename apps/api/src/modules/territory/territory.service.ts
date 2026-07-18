import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../database/database.constants';
import { SCORING_ENGINE, ScoringEngine } from '../scoring/scoring-engine.port';
import { StreetScoringContext } from '../scoring/scoring.types';
import { computeStreak } from '../scoring/streak';
import { decideOwnership } from './territory-ownership';
import { ScoreActivityInput, TerritoryChange } from './territory.types';

type ProfileRow = { streak_days: number; last_active_on: Date | null; streak_bonus_tier: number };
type ScoreRow = { street_id: string; defended_since: Date | null; defense_tier: number };

@Injectable()
export class TerritoryService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(SCORING_ENGINE) private readonly engine: ScoringEngine,
  ) {}

  async scoreAndApply(input: ScoreActivityInput): Promise<TerritoryChange[]> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const changes = await this.applyWithinTransaction(client, input);
      await client.query('commit');
      return changes;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async applyWithinTransaction(
    client: PoolClient,
    input: ScoreActivityInput,
  ): Promise<TerritoryChange[]> {
    const alreadyScored = (
      await client.query<{ scored_at: Date | null }>(
        `select scored_at from public.activity where id = $1 for update`,
        [input.activityId],
      )
    ).rows[0]?.scored_at;
    if (alreadyScored) {
      return [];
    }

    await client.query(
      `insert into public.runner_profile (user_id) values ($1) on conflict (user_id) do nothing`,
      [input.userId],
    );
    const profile = (
      await client.query<ProfileRow>(
        `select streak_days, last_active_on, streak_bonus_tier
         from public.runner_profile where user_id = $1 for update`,
        [input.userId],
      )
    ).rows[0];
    const lastActiveOn = profile.last_active_on ? profile.last_active_on.toISOString().slice(0, 10) : null;
    const streak = computeStreak(lastActiveOn, input.activityDate, profile.streak_days);

    const streetIds = input.streets.map((street) => street.streetId);
    const existingScores = new Map(
      (
        await client.query<ScoreRow>(
          `select street_id, defended_since, defense_tier
           from public.street_score where user_id = $1 and street_id = any($2::uuid[])`,
          [input.userId, streetIds],
        )
      ).rows.map((row) => [row.street_id, row]),
    );

    const nowMs = Date.parse(input.now);
    const scoringStreets: StreetScoringContext[] = input.streets.map((street) => {
      const existing = existingScores.get(street.streetId);
      const ownershipDays = existing?.defended_since
        ? Math.floor((nowMs - existing.defended_since.getTime()) / 86_400_000)
        : null;
      return {
        streetId: street.streetId,
        isFirstVisit: street.isFirstVisit,
        ownershipDays,
        defenseTierAwarded: existing?.defense_tier ?? 0,
      };
    });

    const result = this.engine.compute({
      streets: scoringStreets,
      // Neighborhood bonuses are supported by the engine but deferred: the geo
      // model has cities, not neighborhoods. Wire newNeighborhoods when suburb
      // boundaries land in geo (see infra/geo/import).
      newNeighborhoods: 0,
      streakDays: streak.streakDays,
      streakBonusAwardedTier: profile.streak_bonus_tier,
    });

    await client.query(
      `update public.runner_profile
       set total_points = total_points + $2, streak_days = $3, last_active_on = $4,
           streak_bonus_tier = $5, updated_at = now()
       where user_id = $1`,
      [input.userId, result.totalPoints, streak.streakDays, streak.lastActiveOn, result.newStreakTier],
    );

    const changes: TerritoryChange[] = [];
    for (const award of result.streetAwards) {
      const streetPoints = award.explorationPoints + award.defensePoints;
      await client.query(
        `insert into public.street_score
           (street_id, user_id, points, first_visited_at, last_visited_at, defense_tier)
         values ($1, $2, $3, case when $4 then $5::timestamptz else null end, $5, $6)
         on conflict (street_id, user_id) do update set
           points = public.street_score.points + $3,
           first_visited_at = coalesce(public.street_score.first_visited_at, case when $4 then $5::timestamptz else null end),
           last_visited_at = $5,
           defense_tier = $6`,
        [award.streetId, input.userId, streetPoints, award.isFirstVisit, input.now, award.newDefenseTier],
      );
      await client.query(
        `update public.activity_street set points_awarded = $3 where activity_id = $1 and street_id = $2`,
        [input.activityId, award.streetId, streetPoints],
      );

      const change = await this.applyOwnership(client, award.streetId, input.now);
      if (change) {
        changes.push(change);
      }
    }

    await client.query(`update public.activity set scored_at = $2 where id = $1`, [
      input.activityId,
      input.now,
    ]);
    return changes;
  }

  private async applyOwnership(
    client: PoolClient,
    streetId: string,
    now: string,
  ): Promise<TerritoryChange | null> {
    const scores = (
      await client.query<{ user_id: string; points: string }>(
        `select user_id, points from public.street_score where street_id = $1`,
        [streetId],
      )
    ).rows.map((row) => ({ userId: row.user_id, points: Number(row.points) }));
    const currentOwner =
      (await client.query<{ owner_user_id: string | null }>(
        `select owner_user_id from public.street where id = $1 for update`,
        [streetId],
      )).rows[0]?.owner_user_id ?? null;

    const decision = decideOwnership(currentOwner, scores);
    if (!decision) {
      return null;
    }
    const topScore = scores.find((score) => score.userId === decision.ownerUserId)?.points ?? 0;

    if (!decision.changed) {
      await client.query(`update public.street set top_score = $2, updated_at = now() where id = $1`, [
        streetId,
        topScore,
      ]);
      return null;
    }

    if (currentOwner) {
      await client.query(
        `update public.street_ownership_history set lost_at = $3
         where street_id = $1 and user_id = $2 and lost_at is null`,
        [streetId, currentOwner, now],
      );
      await client.query(
        `update public.street_score set defended_since = null, defense_tier = 0
         where street_id = $1 and user_id = $2`,
        [streetId, currentOwner],
      );
    }
    await client.query(
      `update public.street
       set owner_user_id = $2, top_score = $3,
           disputes_count = disputes_count + case when $4 then 1 else 0 end, updated_at = now()
       where id = $1`,
      [streetId, decision.ownerUserId, topScore, currentOwner !== null],
    );
    await client.query(
      `insert into public.street_ownership_history (street_id, user_id, acquired_at) values ($1, $2, $3)`,
      [streetId, decision.ownerUserId, now],
    );
    await client.query(
      `update public.street_score set defended_since = $3, defense_tier = 0
       where street_id = $1 and user_id = $2`,
      [streetId, decision.ownerUserId, now],
    );
    return { streetId, previousOwnerId: currentOwner, newOwnerId: decision.ownerUserId };
  }
}
