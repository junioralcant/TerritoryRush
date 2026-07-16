import { IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { StravaActivityClient } from './ports/strava-activity-client.port';
import { StravaBackfillService } from './strava-backfill.service';

const SIGNED_UP_AT = '2026-07-10T00:00:00.000Z';

const makeClient = (): jest.Mocked<StravaActivityClient> => ({
  fetchActivity: jest.fn(),
  fetchStreams: jest.fn(),
  listRecentActivities: jest.fn().mockResolvedValue([]),
});

const makeQueue = (): jest.Mocked<IngestActivityQueue> => ({
  enqueue: jest.fn().mockResolvedValue(true),
  stats: jest.fn().mockResolvedValue({ depth: 0, oldestAgeSeconds: 0 }),
  close: jest.fn().mockResolvedValue(undefined),
});

describe('StravaBackfillService', () => {
  it('enqueues the recent on-foot runs before signup as the initial seed', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([
      { providerActivityId: '555', sportType: 'Run', startedAt: '2026-07-09T10:00:00Z' },
      { providerActivityId: '556', sportType: 'Walk', startedAt: '2026-07-08T10:00:00Z' },
    ]);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz', SIGNED_UP_AT);

    expect(client.listRecentActivities).toHaveBeenCalledWith('access-xyz', 30);
    expect(queue.enqueue).toHaveBeenNthCalledWith(1, { userId: 'user-1', provider: 'strava', providerActivityId: '555' });
    expect(queue.enqueue).toHaveBeenNthCalledWith(2, { userId: 'user-1', provider: 'strava', providerActivityId: '556' });
    expect(enqueued).toBe(2);
  });

  it('keeps only the 5 most recent runs before signup, ignoring older ones', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([
      { providerActivityId: 'a', sportType: 'Run', startedAt: '2026-07-09T10:00:00Z' },
      { providerActivityId: 'b', sportType: 'Run', startedAt: '2026-07-08T10:00:00Z' },
      { providerActivityId: 'c', sportType: 'Run', startedAt: '2026-07-07T10:00:00Z' },
      { providerActivityId: 'd', sportType: 'Run', startedAt: '2026-07-06T10:00:00Z' },
      { providerActivityId: 'e', sportType: 'Run', startedAt: '2026-07-05T10:00:00Z' },
      { providerActivityId: 'f', sportType: 'Run', startedAt: '2026-07-04T10:00:00Z' },
    ]);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz', SIGNED_UP_AT);

    const ids = queue.enqueue.mock.calls.map((call) => call[0].providerActivityId);
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(enqueued).toBe(5);
  });

  it('also enqueues runs made after signup (beyond the seed limit)', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([
      { providerActivityId: 'new1', sportType: 'Run', startedAt: '2026-07-12T10:00:00Z' },
      { providerActivityId: 'new2', sportType: 'Run', startedAt: '2026-07-11T10:00:00Z' },
      { providerActivityId: 'old1', sportType: 'Run', startedAt: '2026-07-09T10:00:00Z' },
    ]);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz', SIGNED_UP_AT);

    const ids = queue.enqueue.mock.calls.map((call) => call[0].providerActivityId);
    expect(ids).toEqual(expect.arrayContaining(['new1', 'new2', 'old1']));
    expect(enqueued).toBe(3);
  });

  it('skips non-foot activities (bike/swim) before selecting the seed', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([
      { providerActivityId: '555', sportType: 'Run', startedAt: '2026-07-09T10:00:00Z' },
      { providerActivityId: '900', sportType: 'Ride', startedAt: '2026-07-08T10:00:00Z' },
      { providerActivityId: '901', sportType: 'Swim', startedAt: '2026-07-07T10:00:00Z' },
    ]);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz', SIGNED_UP_AT);

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith({ userId: 'user-1', provider: 'strava', providerActivityId: '555' });
    expect(enqueued).toBe(1);
  });

  it('counts only newly enqueued jobs, skipping duplicates already in the queue', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([
      { providerActivityId: '555', sportType: 'Run', startedAt: '2026-07-09T10:00:00Z' },
      { providerActivityId: '556', sportType: 'Run', startedAt: '2026-07-08T10:00:00Z' },
    ]);
    queue.enqueue.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz', SIGNED_UP_AT);

    expect(enqueued).toBe(1);
  });

  it('does not enqueue anything when the athlete has no recent activities', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([]);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz', SIGNED_UP_AT);

    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(enqueued).toBe(0);
  });
});
