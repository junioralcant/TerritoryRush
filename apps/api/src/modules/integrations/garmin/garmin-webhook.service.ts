import { Inject, Injectable } from '@nestjs/common';
import { INGEST_ACTIVITY_QUEUE, IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { PROVIDER_CONNECTION_REPOSITORY, ProviderConnectionRepository } from '../strava/ports/provider-connection-repository.port';
import { extractGarminActivities } from './garmin-webhook-extract';
import { GarminWebhookPayload } from './garmin.types';

@Injectable()
export class GarminWebhookService {
  constructor(
    @Inject(PROVIDER_CONNECTION_REPOSITORY) private readonly connections: ProviderConnectionRepository,
    @Inject(INGEST_ACTIVITY_QUEUE) private readonly queue: IngestActivityQueue,
  ) {}

  async handlePush(payload: GarminWebhookPayload): Promise<void> {
    for (const activity of extractGarminActivities(payload)) {
      const userId = await this.connections.findUserIdByAthlete('garmin', activity.userId);
      if (!userId) {
        continue;
      }
      await this.queue.enqueue({ userId, provider: 'garmin', providerActivityId: activity.summaryId });
    }
  }
}
