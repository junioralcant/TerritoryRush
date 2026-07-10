import { IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { StravaActivityClient } from './ports/strava-activity-client.port';
import { StravaBackfillService } from './strava-backfill.service';

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
  it('lists the athlete recent activities and enqueues an ingest job for each', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue(['555', '556']);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz');

    expect(client.listRecentActivities).toHaveBeenCalledWith('access-xyz', 30);
    expect(queue.enqueue).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      provider: 'strava',
      providerActivityId: '555',
    });
    expect(queue.enqueue).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      provider: 'strava',
      providerActivityId: '556',
    });
    expect(enqueued).toBe(2);
  });

  it('counts only newly enqueued jobs, skipping duplicates already in the queue', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue(['555', '556']);
    queue.enqueue.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz');

    expect(enqueued).toBe(1);
  });

  it('does not enqueue anything when the athlete has no recent activities', async () => {
    const client = makeClient();
    const queue = makeQueue();
    client.listRecentActivities.mockResolvedValue([]);

    const enqueued = await new StravaBackfillService(client, queue).backfillRecent('user-1', 'access-xyz');

    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(enqueued).toBe(0);
  });
});
