import { ProfileService } from '../../profile/profile.service';
import { ProviderConnectionRepository } from './ports/provider-connection-repository.port';
import { StravaOAuthClient } from './ports/strava-oauth-client.port';
import { TokenCipher } from './ports/token-cipher.port';
import { ProviderConnection } from './strava.types';
import { StravaBackfillService } from './strava-backfill.service';
import { StravaConnectionService } from './strava-connection.service';

const SIGNED_UP_AT = '2026-07-10T00:00:00.000Z';

const makeRepo = (): jest.Mocked<ProviderConnectionRepository> => ({
  upsert: jest.fn(),
  findByUserAndProvider: jest.fn(),
  findUserIdByAthlete: jest.fn(),
  delete: jest.fn().mockResolvedValue(true),
});

const makeOauth = (): jest.Mocked<StravaOAuthClient> => ({
  exchangeAuthorizationCode: jest.fn(),
  refreshAccessToken: jest.fn(),
  deauthorize: jest.fn().mockResolvedValue(undefined),
});

const cipher: TokenCipher = {
  encrypt: (plaintext) => `enc(${plaintext})`,
  decrypt: (ciphertext) => ciphertext.replace(/^enc\((.*)\)$/, '$1'),
};

const makeBackfill = (): jest.Mocked<StravaBackfillService> =>
  ({ backfillRecent: jest.fn().mockResolvedValue(0) }) as unknown as jest.Mocked<StravaBackfillService>;

const makeProfiles = (): jest.Mocked<Pick<ProfileService, 'ensureSignedUpAt'>> => ({
  ensureSignedUpAt: jest.fn().mockResolvedValue(SIGNED_UP_AT),
});

const makeService = (
  oauth: StravaOAuthClient,
  repo: ProviderConnectionRepository,
  backfill: StravaBackfillService,
  profiles = makeProfiles(),
): StravaConnectionService =>
  new StravaConnectionService(oauth, repo, cipher, backfill, profiles as unknown as ProfileService);

const connection = (): ProviderConnection => ({
  userId: 'user-1',
  provider: 'strava',
  accessTokenEnc: 'enc(access-current)',
  refreshTokenEnc: 'enc(refresh-current)',
  expiresAt: '2026-07-09T00:00:00.000Z',
  athleteId: '42',
  scopes: ['read'],
});

describe('StravaConnectionService', () => {
  it('exchanges the code and persists encrypted tokens on connect', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    oauth.exchangeAuthorizationCode.mockResolvedValue({
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
      expiresAt: 1_700_000_000,
      athleteId: '42',
      scopes: ['read', 'activity:read'],
    });

    const backfill = makeBackfill();
    const state = await makeService(oauth, repo, backfill).connect('user-1', 'code');

    expect(state).toEqual({
      provider: 'strava',
      connected: true,
      athleteId: '42',
      scopes: ['read', 'activity:read'],
      expiresAt: new Date(1_700_000_000 * 1000).toISOString(),
    });
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        accessTokenEnc: 'enc(access-xyz)',
        refreshTokenEnc: 'enc(refresh-xyz)',
        athleteId: '42',
      }),
    );
    expect(backfill.backfillRecent).toHaveBeenCalledWith('user-1', 'access-xyz', SIGNED_UP_AT);
  });

  it('still returns a connected state when the backfill fails (best effort)', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    const backfill = makeBackfill();
    oauth.exchangeAuthorizationCode.mockResolvedValue({
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
      expiresAt: 1_700_000_000,
      athleteId: '42',
      scopes: ['read', 'activity:read'],
    });
    backfill.backfillRecent.mockRejectedValue(new Error('strava down'));

    const state = await makeService(oauth, repo, backfill).connect('user-1', 'code');

    expect(state.connected).toBe(true);
    expect(repo.upsert).toHaveBeenCalled();
  });

  it('deauthorizes then deletes the connection on disconnect', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    repo.findByUserAndProvider.mockResolvedValue(connection());

    await makeService(oauth, repo, makeBackfill()).disconnect('user-1');

    expect(oauth.deauthorize).toHaveBeenCalledWith('access-current');
    expect(repo.delete).toHaveBeenCalledWith('user-1', 'strava');
  });

  it('still deletes the connection when deauthorize fails (best effort)', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    repo.findByUserAndProvider.mockResolvedValue(connection());
    oauth.deauthorize.mockRejectedValue(new Error('strava down'));

    await makeService(oauth, repo, makeBackfill()).disconnect('user-1');

    expect(repo.delete).toHaveBeenCalledWith('user-1', 'strava');
  });

  it('reports a disconnected state when there is no connection', async () => {
    const repo = makeRepo();
    repo.findByUserAndProvider.mockResolvedValue(null);

    const state = await makeService(makeOauth(), repo, makeBackfill()).getConnectionState('user-1');

    expect(state).toEqual({ provider: 'strava', connected: false, athleteId: null, scopes: [], expiresAt: null });
  });
});
