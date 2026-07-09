import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../database/database.constants';
import { Provider } from '../../../activities/activities.types';
import { ProviderConnectionRepository } from '../ports/provider-connection-repository.port';
import { ProviderConnection, ProviderConnectionRow, UpsertProviderConnectionInput } from '../strava.types';

const SELECT_COLUMNS = `user_id, provider, access_token, refresh_token, expires_at, provider_athlete_id, scopes`;

const toDomain = (row: ProviderConnectionRow): ProviderConnection => ({
  userId: row.user_id,
  provider: row.provider,
  accessTokenEnc: row.access_token,
  refreshTokenEnc: row.refresh_token,
  expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
  athleteId: row.provider_athlete_id,
  scopes: row.scopes ?? [],
});

@Injectable()
export class PgProviderConnectionRepository implements ProviderConnectionRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsert(input: UpsertProviderConnectionInput): Promise<void> {
    await this.pool.query(
      `insert into public.provider_connection
         (user_id, provider, access_token, refresh_token, expires_at, provider_athlete_id, scopes)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (user_id, provider) do update set
         access_token = excluded.access_token,
         refresh_token = excluded.refresh_token,
         expires_at = excluded.expires_at,
         provider_athlete_id = excluded.provider_athlete_id,
         scopes = excluded.scopes,
         updated_at = now()`,
      [
        input.userId,
        input.provider,
        input.accessTokenEnc,
        input.refreshTokenEnc,
        input.expiresAt,
        input.athleteId,
        input.scopes,
      ],
    );
  }

  async findByUserAndProvider(userId: string, provider: Provider): Promise<ProviderConnection | null> {
    const result = await this.pool.query<ProviderConnectionRow>(
      `select ${SELECT_COLUMNS} from public.provider_connection where user_id = $1 and provider = $2`,
      [userId, provider],
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findUserIdByAthlete(provider: Provider, athleteId: string): Promise<string | null> {
    const result = await this.pool.query<{ user_id: string }>(
      `select user_id from public.provider_connection where provider = $1 and provider_athlete_id = $2 limit 1`,
      [provider, athleteId],
    );
    return result.rows[0]?.user_id ?? null;
  }

  async delete(userId: string, provider: Provider): Promise<boolean> {
    const result = await this.pool.query(
      `delete from public.provider_connection where user_id = $1 and provider = $2`,
      [userId, provider],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
