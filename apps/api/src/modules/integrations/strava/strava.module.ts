import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../../activities/activities.module';
import { AuthModule } from '../../auth/auth.module';
import { ProfileModule } from '../../profile/profile.module';
import { AesTokenCipher } from './cipher/aes-token-cipher';
import { HttpStravaActivityClient } from './clients/http-strava-activity.client';
import { HttpStravaOAuthClient } from './clients/http-strava-oauth.client';
import { HttpStravaSubscriptionClient } from './clients/http-strava-subscription.client';
import { IntegrationsStravaController } from './integrations-strava.controller';
import { PROVIDER_CONNECTION_REPOSITORY } from './ports/provider-connection-repository.port';
import { STRAVA_ACTIVITY_CLIENT } from './ports/strava-activity-client.port';
import { STRAVA_OAUTH_CLIENT } from './ports/strava-oauth-client.port';
import { STRAVA_SUBSCRIPTION_CLIENT } from './ports/strava-subscription-client.port';
import { TOKEN_CIPHER } from './ports/token-cipher.port';
import { PgProviderConnectionRepository } from './repositories/provider-connection.repository';
import { STRAVA_ACTIVITY_GATEWAY, StravaActivityGateway } from './strava-activity.gateway';
import { StravaBackfillService } from './strava-backfill.service';
import { StravaConnectionService } from './strava-connection.service';
import { StravaSyncService } from './strava-sync.service';
import { StravaTokenService } from './strava-token.service';
import { StravaWebhookController } from './strava-webhook.controller';
import { StravaWebhookService } from './strava-webhook.service';

@Module({
  imports: [AuthModule, ActivitiesModule, ProfileModule],
  controllers: [IntegrationsStravaController, StravaWebhookController],
  providers: [
    { provide: TOKEN_CIPHER, useClass: AesTokenCipher },
    { provide: STRAVA_OAUTH_CLIENT, useClass: HttpStravaOAuthClient },
    { provide: STRAVA_SUBSCRIPTION_CLIENT, useClass: HttpStravaSubscriptionClient },
    { provide: STRAVA_ACTIVITY_CLIENT, useClass: HttpStravaActivityClient },
    { provide: PROVIDER_CONNECTION_REPOSITORY, useClass: PgProviderConnectionRepository },
    { provide: STRAVA_ACTIVITY_GATEWAY, useClass: StravaActivityGateway },
    StravaConnectionService,
    StravaBackfillService,
    StravaTokenService,
    StravaSyncService,
    StravaWebhookService,
  ],
  exports: [StravaTokenService, PROVIDER_CONNECTION_REPOSITORY, TOKEN_CIPHER, STRAVA_ACTIVITY_GATEWAY],
})
export class StravaIntegrationModule {}
