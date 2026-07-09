import { IngestActivityJob, QueueStats } from '../activities.types';

export const INGEST_ACTIVITY_QUEUE = Symbol('INGEST_ACTIVITY_QUEUE');

/**
 * Contract for enqueuing activity-ingestion jobs. `enqueue` is idempotent by
 * (provider, providerActivityId): a duplicate returns false without adding a
 * second job. The BullMQ/Redis implementation lands in Task 4; Task 3 uses an
 * in-memory implementation so the webhook is functional and testable.
 */
export interface IngestActivityQueue {
  enqueue(job: IngestActivityJob): Promise<boolean>;
  stats(): Promise<QueueStats>;
  close(): Promise<void>;
}
