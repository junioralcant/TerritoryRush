import { Injectable } from '@nestjs/common';
import { IngestActivityJob } from '../activities.types';
import { IngestActivityQueue } from '../ports/ingest-activity-queue.port';

const jobKey = (job: IngestActivityJob): string => `${job.provider}:${job.providerActivityId}`;

/**
 * Process-local queue used until the BullMQ/Redis implementation lands (Task 4).
 * Deduplicates by (provider, providerActivityId) and keeps the enqueued jobs so
 * integration tests can assert what the webhook produced.
 */
@Injectable()
export class InMemoryIngestActivityQueue implements IngestActivityQueue {
  private readonly seen = new Set<string>();
  private readonly jobs: IngestActivityJob[] = [];

  async enqueue(job: IngestActivityJob): Promise<boolean> {
    const key = jobKey(job);
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.add(key);
    this.jobs.push(job);
    return true;
  }

  enqueuedJobs(): IngestActivityJob[] {
    return [...this.jobs];
  }
}
