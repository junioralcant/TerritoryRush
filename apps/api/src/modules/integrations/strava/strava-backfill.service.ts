import { Inject, Injectable, Logger } from '@nestjs/common';
import { isAllowedSport } from '../../activities/is-allowed-sport';
import { INGEST_ACTIVITY_QUEUE, IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { STRAVA_ACTIVITY_CLIENT, StravaActivityClient } from './ports/strava-activity-client.port';

const BACKFILL_ACTIVITY_COUNT = 30;

@Injectable()
export class StravaBackfillService {
  private readonly logger = new Logger(StravaBackfillService.name);

  constructor(
    @Inject(STRAVA_ACTIVITY_CLIENT) private readonly client: StravaActivityClient,
    @Inject(INGEST_ACTIVITY_QUEUE) private readonly queue: IngestActivityQueue,
  ) {}

  async backfillRecent(userId: string, accessToken: string): Promise<number> {
    const summaries = await this.client.listRecentActivities(accessToken, BACKFILL_ACTIVITY_COUNT);
    const onFoot = summaries.filter((summary) => isAllowedSport(summary.sportType));
    let enqueued = 0;
    for (const { providerActivityId } of onFoot) {
      const added = await this.queue.enqueue({ userId, provider: 'strava', providerActivityId });
      if (added) {
        enqueued += 1;
      }
    }
    this.logger.log(
      `Strava backfill for user ${userId}: ${summaries.length} listadas, ${summaries.length - onFoot.length} não-a-pé ignoradas, ${enqueued} enfileiradas`,
    );
    return enqueued;
  }
}
