import { ActivityRecord, IngestActivityJob, IngestedActivityData } from '../../modules/activities/activities.types';
import { ActivityRepository } from '../../modules/activities/ports/activity-repository.port';
import { ProviderActivityGateway } from '../../modules/activities/ports/provider-activity-gateway.port';
import { ActivityIngestionService } from './activity-ingestion.service';

const JOB: IngestActivityJob = { userId: 'user-1', provider: 'strava', providerActivityId: '555' };

const INGESTED: IngestedActivityData = {
  metrics: { distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300, startedAt: '2026-07-09T10:00:00.000Z' },
  streams: { latlng: [[0, 0]], time: [0] },
};

const activity = (overrides: Partial<ActivityRecord> = {}): ActivityRecord => ({
  id: 'activity-1',
  userId: 'user-1',
  provider: 'strava',
  providerActivityId: '555',
  status: 'imported',
  distanceM: null,
  movingTimeS: null,
  avgPaceSKm: null,
  startedAt: null,
  rejectionReason: null,
  ...overrides,
});

const makeRepo = (): jest.Mocked<ActivityRepository> => ({
  createIfAbsent: jest.fn(),
  updateStatus: jest.fn(),
  saveIngestedData: jest.fn(),
  findByUserAndStatus: jest.fn(),
  findByProviderActivityId: jest.fn(),
});

const makeGateway = (): jest.Mocked<ProviderActivityGateway> => ({
  provider: 'strava',
  fetchIngestData: jest.fn(),
});

describe('ActivityIngestionService', () => {
  it('processes a new activity through the full state machine', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    repo.createIfAbsent.mockResolvedValue(activity());
    gateway.fetchIngestData.mockResolvedValue(INGESTED);

    await new ActivityIngestionService(repo, gateway).ingest(JOB);

    expect(repo.updateStatus).toHaveBeenNthCalledWith(1, 'activity-1', 'processing');
    expect(gateway.fetchIngestData).toHaveBeenCalledWith('user-1', '555');
    expect(repo.saveIngestedData).toHaveBeenCalledWith('activity-1', INGESTED);
    expect(repo.updateStatus).toHaveBeenNthCalledWith(2, 'activity-1', 'processed');
  });

  it('is idempotent: skips an already-processed activity', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    repo.createIfAbsent.mockResolvedValue(activity({ status: 'processed' }));

    await new ActivityIngestionService(repo, gateway).ingest(JOB);

    expect(gateway.fetchIngestData).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('leaves the activity in processing (for retry) when the fetch fails', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    repo.createIfAbsent.mockResolvedValue(activity());
    gateway.fetchIngestData.mockRejectedValue(new Error('strava rate limited'));

    await expect(new ActivityIngestionService(repo, gateway).ingest(JOB)).rejects.toThrow('rate limited');

    expect(repo.updateStatus).toHaveBeenCalledTimes(1);
    expect(repo.updateStatus).toHaveBeenCalledWith('activity-1', 'processing');
    expect(repo.saveIngestedData).not.toHaveBeenCalled();
  });

  it('throws when no gateway handles the job provider', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    repo.createIfAbsent.mockResolvedValue(activity({ provider: 'garmin' }));

    await expect(
      new ActivityIngestionService(repo, gateway).ingest({ ...JOB, provider: 'garmin' }),
    ).rejects.toThrow('No ingestion gateway');
    expect(gateway.fetchIngestData).not.toHaveBeenCalled();
  });
});
