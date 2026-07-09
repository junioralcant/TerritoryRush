import { NotFoundException } from '@nestjs/common';
import { ProviderConnectionRepository } from './ports/provider-connection-repository.port';
import { StravaOAuthClient } from './ports/strava-oauth-client.port';
import { TokenCipher } from './ports/token-cipher.port';
import { ProviderConnection } from './strava.types';
import { StravaTokenService } from './strava-token.service';

const makeRepo = (): jest.Mocked<ProviderConnectionRepository> => ({
  upsert: jest.fn(),
  findByUserAndProvider: jest.fn(),
  findUserIdByAthlete: jest.fn(),
  delete: jest.fn(),
});

const makeOauth = (): jest.Mocked<StravaOAuthClient> => ({
  exchangeAuthorizationCode: jest.fn(),
  refreshAccessToken: jest.fn(),
  deauthorize: jest.fn(),
});

const cipher: TokenCipher = {
  encrypt: (plaintext: string) => `enc(${plaintext})`,
  decrypt: (ciphertext: string) => ciphertext.replace(/^enc\((.*)\)$/, '$1'),
};

const connection = (expiresAt: string): ProviderConnection => ({
  userId: 'user-1',
  provider: 'strava',
  accessTokenEnc: 'enc(access-current)',
  refreshTokenEnc: 'enc(refresh-current)',
  expiresAt,
  athleteId: '42',
  scopes: ['read', 'activity:read'],
});

describe('StravaTokenService', () => {
  it('returns the current access token when it is still fresh', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    repo.findByUserAndProvider.mockResolvedValue(connection(new Date(Date.now() + 86_400_000).toISOString()));

    const token = await new StravaTokenService(repo, oauth, cipher).getFreshAccessToken('user-1');

    expect(token).toBe('access-current');
    expect(oauth.refreshAccessToken).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('refreshes and persists when the token is expired', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    repo.findByUserAndProvider.mockResolvedValue(connection(new Date(Date.now() - 3_600_000).toISOString()));
    oauth.refreshAccessToken.mockResolvedValue({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
      expiresAt: Math.floor(Date.now() / 1000) + 21_600,
      athleteId: '',
      scopes: [],
    });

    const token = await new StravaTokenService(repo, oauth, cipher).getFreshAccessToken('user-1');

    expect(oauth.refreshAccessToken).toHaveBeenCalledWith('refresh-current');
    expect(token).toBe('access-new');
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'strava',
        accessTokenEnc: 'enc(access-new)',
        refreshTokenEnc: 'enc(refresh-new)',
        athleteId: '42',
        scopes: ['read', 'activity:read'],
      }),
    );
  });

  it('throws when the user has no Strava connection', async () => {
    const repo = makeRepo();
    repo.findByUserAndProvider.mockResolvedValue(null);

    await expect(new StravaTokenService(repo, makeOauth(), cipher).getFreshAccessToken('user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
