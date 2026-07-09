import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { AppConfig } from '../../config/app-config.type';
import { IngestActivityJob } from '../../modules/activities/activities.types';
import { buildRedisConnection, INGEST_QUEUE_NAME } from '../../modules/activities/queue/redis';
import { captureException } from '../../observability/sentry';
import { ActivityIngestionService } from './activity-ingestion.service';

@Injectable()
export class IngestActivityWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestActivityWorker.name);
  private worker?: Worker<IngestActivityJob>;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly ingestion: ActivityIngestionService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.config.get('redisUrl', { infer: true });
    if (!redisUrl) {
      this.logger.warn('Ingest worker disabled: REDIS_URL is not set');
      return;
    }
    this.worker = new Worker<IngestActivityJob>(
      INGEST_QUEUE_NAME,
      (job: Job<IngestActivityJob>) => this.ingestion.ingest(job.data),
      { connection: buildRedisConnection(redisUrl) },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Ingest job ${job?.id ?? 'unknown'} failed: ${error.message}`);
      captureException(error);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
