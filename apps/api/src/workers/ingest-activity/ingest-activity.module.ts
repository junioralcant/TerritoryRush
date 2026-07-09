import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../../modules/activities/activities.module';
import { StravaIntegrationModule } from '../../modules/integrations/strava/strava.module';
import { MatchingModule } from '../../modules/matching/matching.module';
import { ActivityIngestionService } from './activity-ingestion.service';
import { IngestActivityWorker } from './ingest-activity.worker';

// Task 4.0: composition root for the async ingestion pipeline. Consumes the
// BullMQ queue and orchestrates persistence (activities) + provider fetch
// (strava) + map-matching (Task 5.0). Tasks 6.0/7.0 extend ActivityIngestionService
// with scoring and anti-cheat.
@Module({
  imports: [ActivitiesModule, StravaIntegrationModule, MatchingModule],
  providers: [ActivityIngestionService, IngestActivityWorker],
  exports: [ActivityIngestionService],
})
export class IngestActivityWorkerModule {}
