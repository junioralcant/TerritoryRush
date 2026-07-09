import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '../../observability/metrics.service';
import { INGEST_ACTIVITY_QUEUE, IngestActivityQueue } from './ports/ingest-activity-queue.port';

@Injectable()
export class QueueMetricsScheduler {
  private readonly logger = new Logger(QueueMetricsScheduler.name);

  constructor(
    @Inject(INGEST_ACTIVITY_QUEUE) private readonly queue: IngestActivityQueue,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS, { name: 'ingest-queue-metrics' })
  async collect(): Promise<void> {
    try {
      const stats = await this.queue.stats();
      this.metrics.setQueueDepth(stats.depth);
      this.metrics.setQueueOldestAge(stats.oldestAgeSeconds);
    } catch (error) {
      this.logger.warn(`Failed to collect queue metrics: ${(error as Error).message}`);
    }
  }
}
