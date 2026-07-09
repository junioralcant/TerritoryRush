import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.constants';
import { computeTenureDays } from './tenure';
import {
  OwnershipHistoryEntry,
  StreetDetail,
  StreetRankingEntry,
} from './territory.types';

type StreetRow = {
  id: string;
  osm_name: string;
  city_id: string;
  owner_user_id: string | null;
  disputes_count: number;
  owner_name: string | null;
  owner_defended_since: Date | null;
};

@Injectable()
export class StreetDetailService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getStreetDetail(streetId: string): Promise<StreetDetail> {
    const street = (
      await this.pool.query<StreetRow>(
        `select s.id, s.osm_name, s.city_id, s.owner_user_id, s.disputes_count,
                owner_rp.name as owner_name, owner_ss.defended_since as owner_defended_since
         from public.street s
         left join public.runner_profile owner_rp on owner_rp.user_id = s.owner_user_id
         left join public.street_score owner_ss
           on owner_ss.street_id = s.id and owner_ss.user_id = s.owner_user_id
         where s.id = $1`,
        [streetId],
      )
    ).rows[0];
    if (!street) {
      throw new NotFoundException(`Street ${streetId} not found`);
    }

    const ranking = (
      await this.pool.query<{ user_id: string; name: string | null; points: string; rank: string }>(
        `select ss.user_id, rp.name, ss.points,
                rank() over (order by ss.points desc) as rank
         from public.street_score ss
         left join public.runner_profile rp on rp.user_id = ss.user_id
         where ss.street_id = $1
         order by ss.points desc`,
        [streetId],
      )
    ).rows.map<StreetRankingEntry>((row) => ({
      userId: row.user_id,
      name: row.name,
      points: Number(row.points),
      rank: Number(row.rank),
    }));

    const ownershipHistory = (
      await this.pool.query<{ user_id: string; name: string | null; acquired_at: Date; lost_at: Date | null }>(
        `select h.user_id, rp.name, h.acquired_at, h.lost_at
         from public.street_ownership_history h
         left join public.runner_profile rp on rp.user_id = h.user_id
         where h.street_id = $1
         order by h.acquired_at asc`,
        [streetId],
      )
    ).rows.map<OwnershipHistoryEntry>((row) => ({
      userId: row.user_id,
      name: row.name,
      acquiredAt: row.acquired_at.toISOString(),
      lostAt: row.lost_at ? row.lost_at.toISOString() : null,
    }));

    return {
      id: street.id,
      name: street.osm_name,
      cityId: street.city_id,
      owner: street.owner_user_id ? { userId: street.owner_user_id, name: street.owner_name } : null,
      disputesCount: street.disputes_count,
      tenureDays: computeTenureDays(
        street.owner_defended_since ? street.owner_defended_since.toISOString() : null,
        new Date().toISOString(),
      ),
      ranking,
      ownershipHistory,
    };
  }
}
