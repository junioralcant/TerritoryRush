import { StravaBackfillService } from './strava-backfill.service';
import { StravaSyncService } from './strava-sync.service';
import { StravaTokenService } from './strava-token.service';

const makeService = (tokens: Partial<StravaTokenService>, backfill: Partial<StravaBackfillService>): StravaSyncService =>
  new StravaSyncService(tokens as StravaTokenService, backfill as StravaBackfillService);

describe('StravaSyncService', () => {
  it('renews the token and backfills recent activities, returning the enqueued count', async () => {
    const tokens = { getFreshAccessToken: jest.fn().mockResolvedValue('fresh-token') };
    const backfill = { backfillRecent: jest.fn().mockResolvedValue(3) };
    const service = makeService(tokens, backfill);

    const result = await service.syncRecentActivities('user-1');

    expect(tokens.getFreshAccessToken).toHaveBeenCalledWith('user-1');
    expect(backfill.backfillRecent).toHaveBeenCalledWith('user-1', 'fresh-token');
    expect(result).toEqual({ enqueued: 3 });
  });

  it('does not backfill when there is no Strava connection', async () => {
    const tokens = { getFreshAccessToken: jest.fn().mockRejectedValue(new Error('No Strava connection for user')) };
    const backfill = { backfillRecent: jest.fn() };
    const service = makeService(tokens, backfill);

    await expect(service.syncRecentActivities('user-1')).rejects.toThrow('No Strava connection');
    expect(backfill.backfillRecent).not.toHaveBeenCalled();
  });
});
