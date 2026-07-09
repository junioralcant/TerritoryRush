import { Inject, Injectable } from '@nestjs/common';
import { IngestedActivityData, Provider } from '../../activities/activities.types';
import { ProviderActivityGateway } from '../../activities/ports/provider-activity-gateway.port';
import { STRAVA_ACTIVITY_CLIENT, StravaActivityClient } from './ports/strava-activity-client.port';
import { StravaTokenService } from './strava-token.service';

@Injectable()
export class StravaActivityGateway implements ProviderActivityGateway {
  readonly provider: Provider = 'strava';

  constructor(
    private readonly tokenService: StravaTokenService,
    @Inject(STRAVA_ACTIVITY_CLIENT) private readonly client: StravaActivityClient,
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
