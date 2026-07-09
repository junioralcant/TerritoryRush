import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { loadConfiguration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { ObservabilityModule } from './observability/observability.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AntiCheatModule } from './modules/anti-cheat/anti-cheat.module';
import { AuthModule } from './modules/auth/auth.module';
import { GeoModule } from './modules/geo/geo.module';
import { GarminIntegrationModule } from './modules/integrations/garmin/garmin.module';
import { StravaIntegrationModule } from './modules/integrations/strava/strava.module';
import { MatchingModule } from './modules/matching/matching.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { TerritoryModule } from './modules/territory/territory.module';
import { IngestActivityWorkerModule } from './workers/ingest-activity/ingest-activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [loadConfiguration],
    }),
    ScheduleModule.forRoot(),
    ObservabilityModule,
    DatabaseModule,
    AuthModule,
    ProfileModule,
    GeoModule,
    StravaIntegrationModule,
    GarminIntegrationModule,
    ActivitiesModule,
    MatchingModule,
    ScoringModule,
    TerritoryModule,
    AntiCheatModule,
    RankingsModule,
    AchievementsModule,
    NotificationsModule,
    IngestActivityWorkerModule,
  ],
})
export class AppModule {}
