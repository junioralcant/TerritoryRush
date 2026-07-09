import { Inject, Injectable, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app-config.type';
import { AuthModule } from '../auth/auth.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ACTIVITY_REPOSITORY } from './ports/activity-repository.port';
import { INGEST_ACTIVITY_QUEUE, IngestActivityQueue } from './ports/ingest-activity-queue.port';
import { BullMqIngestActivityQueue } from './queue/bullmq-ingest-activity.queue';
import { InMemoryIngestActivityQueue } from './queue/in-memory-ingest-activity.queue';
import { PgActivityRepository } from './repositories/activity.repository';

const ingestQueueProvider: Provider = {
  provide: INGEST_ACTIVITY_QUEUE,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>): IngestActivityQueue => {
    const redisUrl = config.get('redisUrl', { infer: true });
    return redisUrl ? new BullMqIngestActivityQueue(redisUrl) : new InMemoryIngestActivityQueue();
  },
};

@Injectable()
class IngestQueueCloser implements OnModuleDestroy {
  constructor(@Inject(INGEST_ACTIVITY_QUEUE) private readonly queue: IngestActivityQueue) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
    ingestQueueProvider,
    IngestQueueCloser,
    { provide: ACTIVITY_REPOSITORY, useClass: PgActivityRepository },
  ],
  exports: [INGEST_ACTIVITY_QUEUE, ACTIVITY_REPOSITORY, ActivitiesService],
})
export class ActivitiesModule {}
