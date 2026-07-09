import { Inject, Injectable } from '@nestjs/common';
import { IngestedActivityData, Provider } from '../../activities/activities.types';
import { ProviderActivityGateway } from '../../activities/ports/provider-activity-gateway.port';
import { GARMIN_ACTIVITY_CLIENT, GarminActivityClient } from './ports/garmin-clients.port';
import { GarminTokenService } from './garmin-token.service';

export const GARMIN_ACTIVITY_GATEWAY = Symbol('GARMIN_ACTIVITY_GATEWAY');

@Injectable()
export class GarminActivityGateway implements ProviderActivityGateway {
  readonly provider: Provider = 'garmin';

  constructor(
    private readonly tokenService: GarminTokenService,
    @Inject(GARMIN_ACTIVITY_CLIENT) private readonly client: GarminActivityClient,
  ) {}

  async fetchIngestData(userId: string, providerActivityId: string): Promise<IngestedActivityData> {
    const accessToken = await this.tokenService.getFreshAccessToken(userId);
    const [metrics, streams] = await Promise.all([
      this.client.fetchActivity(providerActivityId, accessToken),
      this.client.fetchStreams(providerActivityId, accessToken),
    ]);
    return { metrics, streams };
  }
}
