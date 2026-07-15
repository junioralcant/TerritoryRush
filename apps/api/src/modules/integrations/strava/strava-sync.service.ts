import { Injectable } from '@nestjs/common';
import { StravaBackfillService } from './strava-backfill.service';
import { StravaTokenService } from './strava-token.service';
import { StravaSyncResult } from './strava.types';

/**
 * On-demand sync of a runner's recent Strava activities. Renews the access token
 * and re-runs the backfill (list recent → enqueue new for ingestion). Backs the
 * "Atualizar atividades" button in the app: in dev the Strava webhook cannot reach
 * localhost, so new runs only arrive via this manual trigger.
 */
@Injectable()
export class StravaSyncService {
  constructor(
    private readonly tokens: StravaTokenService,
    private readonly backfill: StravaBackfillService,
  ) {}

  async syncRecentActivities(userId: string): Promise<StravaSyncResult> {
    const accessToken = await this.tokens.getFreshAccessToken(userId);
    const enqueued = await this.backfill.backfillRecent(userId, accessToken);
    return { enqueued };
  }
}
