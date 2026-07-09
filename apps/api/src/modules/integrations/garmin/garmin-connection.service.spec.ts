import { ProviderConnectionRepository } from '../strava/ports/provider-connection-repository.port';
import { TokenCipher } from '../strava/ports/token-cipher.port';
import { GarminOAuthClient } from './ports/garmin-clients.port';
import { GarminConnectionService } from './garmin-connection.service';

const cipher: TokenCipher = {
  encrypt: (plaintext) => `enc(${plaintext})`,
  decrypt: (ciphertext) => ciphertext.replace(/^enc\((.*)\)$/, '$1'),
};

const makeRepo = (): jest.Mocked<ProviderConnectionRepository> => ({
  upsert: jest.fn(),
  findByUserAndProvider: jest.fn(),
  findUserIdByAthlete: jest.fn(),
  delete: jest.fn().mockResolvedValue(true),
});

const makeOauth = (): jest.Mocked<GarminOAuthClient> => ({
  exchangeAuthorizationCode: jest.fn(),
  refreshAccessToken: jest.fn(),
});

describe('GarminConnectionService', () => {
  it('exchanges the PKCE code and persists an encrypted garmin connection', async () => {
    const repo = makeRepo();
    const oauth = makeOauth();
    oauth.exchangeAuthorizationCode.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 1_700_000_000,
      userId: 'garmin-1',
      scopes: ['activity'],
    });

    const state = await new GarminConnectionService(oauth, repo, cipher).connect('user-1', 'code', 'verifier');

    expect(oauth.exchangeAuthorizationCode).toHaveBeenCalledWith('code', 'verifier');
    expect(state).toMatchObject({ provider: 'garmin', connected: true, athleteId: 'garmin-1' });
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'garmin', accessTokenEnc: 'enc(a)', athleteId: 'garmin-1' }),
    );
  });

  it('disconnects the garmin connection', async () => {
    const repo = makeRepo();
    await new GarminConnectionService(makeOauth(), repo, cipher).disconnect('user-1');
    expect(repo.delete).toHaveBeenCalledWith('user-1', 'garmin');
  });

  it('reports a disconnected state when there is no connection', async () => {
    const repo = makeRepo();
    repo.findByUserAndProvider.mockResolvedValue(null);
    const state = await new GarminConnectionService(makeOauth(), repo, cipher).getConnectionState('user-1');
    expect(state).toEqual({ provider: 'garmin', connected: false, athleteId: null, scopes: [], expiresAt: null });
  });
});
