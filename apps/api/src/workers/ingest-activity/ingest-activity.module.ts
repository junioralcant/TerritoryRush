import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../../modules/activities/activities.module';
import { AchievementsModule } from '../../modules/achievements/achievements.module';
import { AntiCheatModule } from '../../modules/anti-cheat/anti-cheat.module';
import { StravaIntegrationModule } from '../../modules/integrations/strava/strava.module';
import { MatchingModule } from '../../modules/matching/matching.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { RankingsModule } from '../../modules/rankings/rankings.module';
import { TerritoryModule } from '../../modules/territory/territory.module';
import { ActivityIngestionService } from './activity-ingestion.service';
import { IngestActivityWorker } from './ingest-activity.worker';

// Task 4.0: composition root for the async ingestion pipeline. Consumes the
// BullMQ queue and orchestrates persistence + provider fetch + anti-cheat +
// map-matching + scoring/territory + engagement (achievements/notifications, Task 9.0).
@Module({
  imports: [
    ActivitiesModule,
    AntiCheatModule,
    StravaIntegrationModule,
    MatchingModule,
    TerritoryModule,
    AchievementsModule,
    NotificationsModule,
    RankingsModule,
  ],
  providers: [ActivityIngestionService, IngestActivityWorker],
  exports: [ActivityIngestionService],
})
export class IngestActivityWorkerModule {}
