import { IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { ProviderConnectionRepository } from '../strava/ports/provider-connection-repository.port';
import { GarminWebhookService } from './garmin-webhook.service';

const makeRepo = (): jest.Mocked<ProviderConnectionRepository> => ({
  upsert: jest.fn(),
  findByUserAndProvider: jest.fn(),
  findUserIdByAthlete: jest.fn(),
  delete: jest.fn(),
});

const makeQueue = (): jest.Mocked<IngestActivityQueue> => ({
  enqueue: jest.fn().mockResolvedValue(true),
  close: jest.fn(),
});

describe('GarminWebhookService', () => {
  it('enqueues an ingest job for a known Garmin athlete', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findUserIdByAthlete.mockResolvedValue('user-1');

    await new GarminWebhookService(repo, queue).handlePush({ activities: [{ userId: 'g1', summaryId: 's1' }] });

    expect(repo.findUserIdByAthlete).toHaveBeenCalledWith('garmin', 'g1');
    expect(queue.enqueue).toHaveBeenCalledWith({ userId: 'user-1', provider: 'garmin', providerActivityId: 's1' });
  });

  it('skips activities from unknown athletes', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findUserIdByAthlete.mockResolvedValue(null);

    await new GarminWebhookService(repo, queue).handlePush({ activities: [{ userId: 'g9', summaryId: 's9' }] });

    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
