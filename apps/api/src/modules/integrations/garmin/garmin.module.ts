import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../../activities/activities.module';
import { AuthModule } from '../../auth/auth.module';
import { StravaIntegrationModule } from '../strava/strava.module';
import { HttpGarminActivityClient, HttpGarminOAuthClient } from './clients/http-garmin.clients';
import { GARMIN_ACTIVITY_GATEWAY, GarminActivityGateway } from './garmin-activity.gateway';
import { GarminConnectionService } from './garmin-connection.service';
import { GarminFlagGuard } from './garmin-flag.guard';
import { GarminTokenService } from './garmin-token.service';
import { GarminWebhookController } from './garmin-webhook.controller';
import { GarminWebhookService } from './garmin-webhook.service';
import { IntegrationsGarminController } from './integrations-garmin.controller';
import { GARMIN_ACTIVITY_CLIENT, GARMIN_OAUTH_CLIENT } from './ports/garmin-clients.port';

// Task 12.0: Garmin integration behind the GARMIN_ENABLED flag. Reuses the shared
// provider_connection repository + token cipher (exported by the Strava module)
// and enqueues into the same ingestion pipeline via the provider-agnostic queue.
@Module({
  imports: [AuthModule, ActivitiesModule, StravaIntegrationModule],
  controllers: [IntegrationsGarminController, GarminWebhookController],
  providers: [
    { provide: GARMIN_OAUTH_CLIENT, useClass: HttpGarminOAuthClient },
    { provide: GARMIN_ACTIVITY_CLIENT, useClass: HttpGarminActivityClient },
    { provide: GARMIN_ACTIVITY_GATEWAY, useClass: GarminActivityGateway },
    GarminTokenService,
    GarminConnectionService,
    GarminWebhookService,
    GarminFlagGuard,
  ],
  exports: [GARMIN_ACTIVITY_GATEWAY],
})
export class GarminIntegrationModule {}
