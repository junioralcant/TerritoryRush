import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.constants';
import { CityRankingEntry, ExplorerRankingEntry } from './rankings.types';

const RANKING_VIEWS = ['public.mv_city_ranking', 'public.mv_explorer_ranking'];

@Injectable()
export class RankingsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getCityRanking(cityId: string, limit: number): Promise<CityRankingEntry[]> {
    const result = await this.pool.query<{ user_id: string; name: string | null; rank: string; streets_owned: string }>(
      `select mv.user_id, rp.name, mv.rank, mv.streets_owned
       from public.mv_city_ranking mv
       left join public.runner_profile rp on rp.user_id = mv.user_id
       where mv.city_id = $1
       order by mv.rank asc
       limit $2`,
      [cityId, limit],
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      rank: Number(row.rank),
      streetsOwned: Number(row.streets_owned),
    }));
  }

  async getExplorerRanking(limit: number): Promise<ExplorerRankingEntry[]> {
    const result = await this.pool.query<{ user_id: string; name: string | null; rank: string; streets_visited: string }>(
      `select mv.user_id, rp.name, mv.rank, mv.streets_visited
       from public.mv_explorer_ranking mv
       left join public.runner_profile rp on rp.user_id = mv.user_id
       order by mv.rank asc
       limit $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      rank: Number(row.rank),
      streetsVisited: Number(row.streets_visited),
    }));
  }

  async getUserCityRank(userId: string, cityId: string): Promise<number | null> {
    const result = await this.pool.query<{ rank: number | null }>(
      `with my as (
         select count(*)::int as owned from public.street where owner_user_id = $1 and city_id = $2
       )
       select case when (select owned from my) = 0 then null
         else 1 + (
           select count(*)::int from (
             select owner_user_id, count(*) as owned from public.street
             where city_id = $2 and owner_user_id is not null group by owner_user_id
           ) ranked where ranked.owned > (select owned from my)
         ) end as rank`,
      [userId, cityId],
    );
    return result.rows[0]?.rank ?? null;
  }

  async refresh(): Promise<void> {
    for (const view of RANKING_VIEWS) {
      await this.pool.query(`refresh materialized view concurrently ${view}`);
    }
  }
}
