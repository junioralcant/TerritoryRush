import { IngestActivityJob } from '../activities.types';
import { InMemoryIngestActivityQueue } from './in-memory-ingest-activity.queue';

const job = (overrides: Partial<IngestActivityJob> = {}): IngestActivityJob => ({
  userId: 'user-1',
  provider: 'strava',
  providerActivityId: '100',
  ...overrides,
});

describe('InMemoryIngestActivityQueue', () => {
  it('enqueues a new job and records it', async () => {
    const queue = new InMemoryIngestActivityQueue();

    expect(await queue.enqueue(job())).toBe(true);
    expect(queue.enqueuedJobs()).toEqual([job()]);
  });

  it('deduplicates by (provider, providerActivityId)', async () => {
    const queue = new InMemoryIngestActivityQueue();

    expect(await queue.enqueue(job())).toBe(true);
    expect(await queue.enqueue(job({ userId: 'someone-else' }))).toBe(false);
    expect(queue.enqueuedJobs()).toHaveLength(1);
  });

  it('treats a different activity id as a new job', async () => {
    const queue = new InMemoryIngestActivityQueue();

    await queue.enqueue(job({ providerActivityId: '100' }));
    expect(await queue.enqueue(job({ providerActivityId: '200' }))).toBe(true);
    expect(queue.enqueuedJobs()).toHaveLength(2);
  });

  it('reports queue stats (depth reflects enqueued jobs)', async () => {
    const queue = new InMemoryIngestActivityQueue();
    await queue.enqueue(job({ providerActivityId: '100' }));

    expect(await queue.stats()).toEqual({ depth: 1, oldestAgeSeconds: 0 });
  });
});
