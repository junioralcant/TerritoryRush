import { Module, Provider } from '@nestjs/common';
import { ActivitiesModule } from '../../modules/activities/activities.module';
import { AchievementsModule } from '../../modules/achievements/achievements.module';
import { AntiCheatModule } from '../../modules/anti-cheat/anti-cheat.module';
import {
  PROVIDER_GATEWAY_REGISTRY,
  ProviderGatewayRegistry,
} from '../../modules/activities/ports/provider-gateway-registry';
import { GARMIN_ACTIVITY_GATEWAY, GarminActivityGateway } from '../../modules/integrations/garmin/garmin-activity.gateway';
import { GarminIntegrationModule } from '../../modules/integrations/garmin/garmin.module';
import { STRAVA_ACTIVITY_GATEWAY, StravaActivityGateway } from '../../modules/integrations/strava/strava-activity.gateway';
import { StravaIntegrationModule } from '../../modules/integrations/strava/strava.module';
import { MatchingModule } from '../../modules/matching/matching.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { RankingsModule } from '../../modules/rankings/rankings.module';
import { TerritoryModule } from '../../modules/territory/territory.module';
import { ActivityIngestionService } from './activity-ingestion.service';
import { IngestActivityWorker } from './ingest-activity.worker';

const gatewayRegistryProvider: Provider = {
  provide: PROVIDER_GATEWAY_REGISTRY,
  inject: [STRAVA_ACTIVITY_GATEWAY, GARMIN_ACTIVITY_GATEWAY],
  useFactory: (strava: StravaActivityGateway, garmin: GarminActivityGateway): ProviderGatewayRegistry => {
    const registry: ProviderGatewayRegistry = new Map();
    for (const gateway of [strava, garmin]) {
      registry.set(gateway.provider, gateway);
    }
    return registry;
  },
};

// Task 4.0: composition root for the async ingestion pipeline. Resolves the
// provider gateway (Strava/Garmin) via a registry so the pipeline is
// provider-agnostic (Task 12.0). Orchestrates anti-cheat, matching, scoring/
// territory and engagement.
@Module({
  imports: [
    ActivitiesModule,
    AntiCheatModule,
    StravaIntegrationModule,
    GarminIntegrationModule,
    MatchingModule,
    TerritoryModule,
    AchievementsModule,
    NotificationsModule,
    RankingsModule,
  ],
  providers: [ActivityIngestionService, IngestActivityWorker, gatewayRegistryProvider],
  exports: [ActivityIngestionService],
})
export class IngestActivityWorkerModule {}
