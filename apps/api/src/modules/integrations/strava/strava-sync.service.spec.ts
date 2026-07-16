import { ProfileService } from '../../profile/profile.service';
import { StravaBackfillService } from './strava-backfill.service';
import { StravaSyncService } from './strava-sync.service';
import { StravaTokenService } from './strava-token.service';

const SIGNED_UP_AT = '2026-07-10T00:00:00.000Z';

const makeService = (
  tokens: Partial<StravaTokenService>,
  backfill: Partial<StravaBackfillService>,
  profiles: Partial<ProfileService> = { ensureSignedUpAt: jest.fn().mockResolvedValue(SIGNED_UP_AT) },
): StravaSyncService =>
  new StravaSyncService(tokens as StravaTokenService, backfill as StravaBackfillService, profiles as ProfileService);

describe('StravaSyncService', () => {
  it('renews the token and backfills recent activities from the signup date, returning the enqueued count', async () => {
    const tokens = { getFreshAccessToken: jest.fn().mockResolvedValue('fresh-token') };
    const backfill = { backfillRecent: jest.fn().mockResolvedValue(3) };
    const service = makeService(tokens, backfill);

    const result = await service.syncRecentActivities('user-1');

    expect(tokens.getFreshAccessToken).toHaveBeenCalledWith('user-1');
    expect(backfill.backfillRecent).toHaveBeenCalledWith('user-1', 'fresh-token', SIGNED_UP_AT);
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
