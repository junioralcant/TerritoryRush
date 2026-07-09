import { Queue } from 'bullmq';
import { IngestActivityJob } from '../activities.types';
import { IngestActivityQueue } from '../ports/ingest-activity-queue.port';
import { buildRedisConnection, INGEST_QUEUE_NAME } from './redis';

const jobId = (job: IngestActivityJob): string => `${job.provider}_${job.providerActivityId}`;

/**
 * BullMQ/Redis producer. Uses the (provider, providerActivityId) as jobId so a
 * duplicate webhook does not enqueue twice while a job is live; the durable dedup
 * is the DB unique constraint enforced by the worker.
 */
export class BullMqIngestActivityQueue implements IngestActivityQueue {
  private readonly queue: Queue;

  constructor(redisUrl: string) {
    this.queue = new Queue(INGEST_QUEUE_NAME, { connection: buildRedisConnection(redisUrl) });
  }

  async enqueue(job: IngestActivityJob): Promise<boolean> {
    await this.queue.add('ingest', job, {
      jobId: jobId(job),
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
    return true;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
