import { Module } from '@nestjs/common';
import { INGEST_ACTIVITY_QUEUE } from './ports/ingest-activity-queue.port';
import { InMemoryIngestActivityQueue } from './queue/in-memory-ingest-activity.queue';

// Task 3.0 introduces the ingestion-queue contract with an in-memory
// implementation so the Strava webhook can enqueue. Task 4.0 replaces the
// implementation with BullMQ/Redis and adds the worker + activity persistence.
@Module({
  providers: [
    { provide: INGEST_ACTIVITY_QUEUE, useClass: InMemoryIngestActivityQueue },
  ],
  exports: [INGEST_ACTIVITY_QUEUE],
})
export class ActivitiesModule {}
