import { ActivityRecord, IngestActivityJob, IngestedActivityData } from '../../modules/activities/activities.types';
import { ActivityRepository } from '../../modules/activities/ports/activity-repository.port';
import { ProviderActivityGateway } from '../../modules/activities/ports/provider-activity-gateway.port';
import { AntiCheatService } from '../../modules/anti-cheat/anti-cheat.service';
import { MapMatchingService } from '../../modules/matching/matching.service';
import { TerritoryService } from '../../modules/territory/territory.service';
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

const makeMatching = () => ({
  matchActivityStreets: jest
    .fn()
    .mockResolvedValue([
      { streetId: 'street-1', streetName: 'Rua', cityId: 'city-a', matchedLengthM: 100, isFirstVisit: true },
    ]),
});

const makeTerritory = () => ({ scoreAndApply: jest.fn().mockResolvedValue([]) });

const makeAntiCheat = () => ({ evaluate: jest.fn().mockReturnValue({ approved: true }) });

const makeService = (
  repo: ActivityRepository,
  gateway: ProviderActivityGateway,
  matching: { matchActivityStreets: jest.Mock },
  territory: { scoreAndApply: jest.Mock },
  antiCheat: { evaluate: jest.Mock } = makeAntiCheat(),
): ActivityIngestionService =>
  new ActivityIngestionService(
    repo,
    gateway,
    antiCheat as unknown as AntiCheatService,
    matching as unknown as MapMatchingService,
    territory as unknown as TerritoryService,
  );

describe('ActivityIngestionService', () => {
  it('processes a new activity: fetch -> save -> match -> score -> processed', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const matching = makeMatching();
    const territory = makeTerritory();
    repo.createIfAbsent.mockResolvedValue(activity());
    gateway.fetchIngestData.mockResolvedValue(INGESTED);

    await makeService(repo, gateway, matching, territory).ingest(JOB);

    expect(repo.updateStatus).toHaveBeenNthCalledWith(1, 'activity-1', 'processing');
    expect(repo.saveIngestedData).toHaveBeenCalledWith('activity-1', INGESTED);
    expect(matching.matchActivityStreets).toHaveBeenCalled();
    expect(territory.scoreAndApply).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'activity-1',
        userId: 'user-1',
        streets: [{ streetId: 'street-1', cityId: 'city-a', isFirstVisit: true }],
      }),
    );
    expect(repo.updateStatus).toHaveBeenNthCalledWith(2, 'activity-1', 'processed');
  });

  it('rejects a fraudulent activity before matching or scoring', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const matching = makeMatching();
    const territory = makeTerritory();
    const antiCheat = { evaluate: jest.fn().mockReturnValue({ approved: false, reason: 'Velocidade média incompatível com corrida' }) };
    repo.createIfAbsent.mockResolvedValue(activity());
    gateway.fetchIngestData.mockResolvedValue(INGESTED);

    await makeService(repo, gateway, matching, territory, antiCheat).ingest(JOB);

    expect(repo.updateStatus).toHaveBeenLastCalledWith('activity-1', 'rejected', 'Velocidade média incompatível com corrida');
    expect(matching.matchActivityStreets).not.toHaveBeenCalled();
    expect(territory.scoreAndApply).not.toHaveBeenCalled();
  });

  it('is idempotent: skips an already-processed activity', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const matching = makeMatching();
    const territory = makeTerritory();
    repo.createIfAbsent.mockResolvedValue(activity({ status: 'processed' }));

    await makeService(repo, gateway, matching, territory).ingest(JOB);

    expect(gateway.fetchIngestData).not.toHaveBeenCalled();
    expect(matching.matchActivityStreets).not.toHaveBeenCalled();
    expect(territory.scoreAndApply).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('leaves the activity in processing (for retry) when matching fails', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const matching = makeMatching();
    const territory = makeTerritory();
    repo.createIfAbsent.mockResolvedValue(activity());
    gateway.fetchIngestData.mockResolvedValue(INGESTED);
    matching.matchActivityStreets.mockRejectedValue(new Error('OSRM circuit is open'));

    await expect(makeService(repo, gateway, matching, territory).ingest(JOB)).rejects.toThrow(
      'OSRM circuit is open',
    );

    expect(repo.updateStatus).toHaveBeenCalledTimes(1);
    expect(repo.updateStatus).toHaveBeenCalledWith('activity-1', 'processing');
    expect(territory.scoreAndApply).not.toHaveBeenCalled();
  });

  it('throws when no gateway handles the job provider', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const matching = makeMatching();
    const territory = makeTerritory();
    repo.createIfAbsent.mockResolvedValue(activity({ provider: 'garmin' }));

    await expect(
      makeService(repo, gateway, matching, territory).ingest({ ...JOB, provider: 'garmin' }),
    ).rejects.toThrow('No ingestion gateway');
    expect(gateway.fetchIngestData).not.toHaveBeenCalled();
  });
});
