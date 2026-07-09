import { ActivityRecord, IngestActivityJob, IngestedActivityData } from '../../modules/activities/activities.types';
import { ActivityRepository } from '../../modules/activities/ports/activity-repository.port';
import { ProviderActivityGateway } from '../../modules/activities/ports/provider-activity-gateway.port';
import { ProviderGatewayRegistry } from '../../modules/activities/ports/provider-gateway-registry';
import { AchievementsService } from '../../modules/achievements/achievements.service';
import { AntiCheatService } from '../../modules/anti-cheat/anti-cheat.service';
import { MapMatchingService } from '../../modules/matching/matching.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { RankingsService } from '../../modules/rankings/rankings.service';
import { TerritoryService } from '../../modules/territory/territory.service';
import { MetricsService } from '../../observability/metrics.service';
import { ActivityIngestionService } from './activity-ingestion.service';

const noopMetrics = {
  incAntiCheatRejection: jest.fn(),
  observeIngestionDuration: jest.fn(),
  incDomainChanges: jest.fn(),
} as unknown as MetricsService;

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

const makeAchievements = () => ({ unlockForRunner: jest.fn().mockResolvedValue([]) });
const makeNotifications = () => ({ notify: jest.fn(), notifyCityOnce: jest.fn() });
const makeRankings = () => ({ getUserCityRank: jest.fn().mockResolvedValue(null) });

type Engagement = {
  achievements?: { unlockForRunner: jest.Mock };
  notifications?: { notify: jest.Mock; notifyCityOnce: jest.Mock };
  rankings?: { getUserCityRank: jest.Mock };
};

const makeService = (
  repo: ActivityRepository,
  gateway: ProviderActivityGateway,
  matching: { matchActivityStreets: jest.Mock },
  territory: { scoreAndApply: jest.Mock },
  antiCheat: { evaluate: jest.Mock } = makeAntiCheat(),
  engagement: Engagement = {},
): ActivityIngestionService =>
  new ActivityIngestionService(
    repo,
    new Map([[gateway.provider, gateway]]) as ProviderGatewayRegistry,
    antiCheat as unknown as AntiCheatService,
    matching as unknown as MapMatchingService,
    territory as unknown as TerritoryService,
    (engagement.achievements ?? makeAchievements()) as unknown as AchievementsService,
    (engagement.notifications ?? makeNotifications()) as unknown as NotificationsService,
    (engagement.rankings ?? makeRankings()) as unknown as RankingsService,
    noopMetrics,
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

  it('dispatches engagement after processing: captured/lost notifications + achievements', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const matching = makeMatching();
    const territory = makeTerritory();
    territory.scoreAndApply.mockResolvedValue([
      { streetId: 'street-1', previousOwnerId: 'user-2', newOwnerId: 'user-1' },
    ]);
    const achievements = { unlockForRunner: jest.fn().mockResolvedValue(['first_run']) };
    const notifications = { notify: jest.fn(), notifyCityOnce: jest.fn() };
    const rankings = { getUserCityRank: jest.fn().mockResolvedValue(1) };
    repo.createIfAbsent.mockResolvedValue(activity());
    gateway.fetchIngestData.mockResolvedValue(INGESTED);

    await makeService(repo, gateway, matching, territory, makeAntiCheat(), {
      achievements,
      notifications,
      rankings,
    }).ingest(JOB);

    expect(notifications.notify).toHaveBeenCalledWith('user-1', 'street_captured', { streetId: 'street-1' });
    expect(notifications.notify).toHaveBeenCalledWith('user-2', 'street_lost', { streetId: 'street-1' });
    expect(notifications.notify).toHaveBeenCalledWith('user-1', 'achievement_unlocked', { code: 'first_run' });
    expect(notifications.notifyCityOnce).toHaveBeenCalledWith('user-1', 'top10_city', 'city-a', expect.any(Object));
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
