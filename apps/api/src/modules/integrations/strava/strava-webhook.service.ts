import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';
import { INGEST_ACTIVITY_QUEUE, IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { PROVIDER_CONNECTION_REPOSITORY, ProviderConnectionRepository } from './ports/provider-connection-repository.port';
import { STRAVA_SUBSCRIPTION_CLIENT, StravaSubscriptionClient } from './ports/strava-subscription-client.port';
import { StravaWebhookEvent, StravaWebhookValidationResponse } from './strava.types';
import { isIngestibleActivityEvent } from './strava-event';
import { resolveWebhookChallenge } from './webhook-challenge';

@Injectable()
export class StravaWebhookService {
  private readonly verifyToken: string;
  private readonly callbackUrl: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(PROVIDER_CONNECTION_REPOSITORY) private readonly connections: ProviderConnectionRepository,
    @Inject(INGEST_ACTIVITY_QUEUE) private readonly queue: IngestActivityQueue,
    @Inject(STRAVA_SUBSCRIPTION_CLIENT) private readonly subscriptions: StravaSubscriptionClient,
  ) {
    this.verifyToken = config.get('stravaWebhookVerifyToken', { infer: true });
    this.callbackUrl = config.get('stravaWebhookCallbackUrl', { infer: true });
  }

  verifyChallenge(query: Record<string, string | undefined>): StravaWebhookValidationResponse {
    return resolveWebhookChallenge(query, this.verifyToken);
  }

  async handleEvent(event: StravaWebhookEvent): Promise<void> {
    if (!isIngestibleActivityEvent(event)) {
      return;
    }
    const userId = await this.connections.findUserIdByAthlete('strava', String(event.ownerId));
    if (!userId) {
      return;
    }
    await this.queue.enqueue({
      userId,
      provider: 'strava',
      providerActivityId: String(event.objectId),
    });
  }

  async ensureSubscription(): Promise<number> {
    const existing = await this.subscriptions.listSubscriptions();
    if (existing.length > 0) {
      return existing[0];
    }
    return this.subscriptions.createSubscription(this.callbackUrl, this.verifyToken);
  }
}
