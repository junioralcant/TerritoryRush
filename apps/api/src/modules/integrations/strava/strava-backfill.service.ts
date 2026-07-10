import { Inject, Injectable, Logger } from '@nestjs/common';
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
    const providerActivityIds = await this.client.listRecentActivities(accessToken, BACKFILL_ACTIVITY_COUNT);
    let enqueued = 0;
    for (const providerActivityId of providerActivityIds) {
      const added = await this.queue.enqueue({ userId, provider: 'strava', providerActivityId });
      if (added) {
        enqueued += 1;
      }
    }
    this.logger.log(
      `Strava backfill enqueued ${enqueued}/${providerActivityIds.length} activities for user ${userId}`,
    );
    return enqueued;
  }
}
