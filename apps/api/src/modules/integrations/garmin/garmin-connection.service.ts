import { Inject, Injectable } from '@nestjs/common';
import { PROVIDER_CONNECTION_REPOSITORY, ProviderConnectionRepository } from '../strava/ports/provider-connection-repository.port';
import { TOKEN_CIPHER, TokenCipher } from '../strava/ports/token-cipher.port';
import { GARMIN_OAUTH_CLIENT, GarminOAuthClient } from './ports/garmin-clients.port';
import { GarminConnectionState } from './garmin.types';

@Injectable()
export class GarminConnectionService {
  constructor(
    @Inject(GARMIN_OAUTH_CLIENT) private readonly oauth: GarminOAuthClient,
    @Inject(PROVIDER_CONNECTION_REPOSITORY) private readonly connections: ProviderConnectionRepository,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
  ) {}

  async connect(userId: string, code: string, codeVerifier: string): Promise<GarminConnectionState> {
    const tokens = await this.oauth.exchangeAuthorizationCode(code, codeVerifier);
    const expiresAt = new Date(tokens.expiresAt * 1000).toISOString();
    await this.connections.upsert({
      userId,
      provider: 'garmin',
      accessTokenEnc: this.cipher.encrypt(tokens.accessToken),
      refreshTokenEnc: this.cipher.encrypt(tokens.refreshToken),
      expiresAt,
      athleteId: tokens.userId,
      scopes: tokens.scopes,
    });
    return { provider: 'garmin', connected: true, athleteId: tokens.userId, scopes: tokens.scopes, expiresAt };
  }

  async disconnect(userId: string): Promise<void> {
    await this.connections.delete(userId, 'garmin');
  }

  async getConnectionState(userId: string): Promise<GarminConnectionState> {
    const connection = await this.connections.findByUserAndProvider(userId, 'garmin');
    if (!connection) {
      return { provider: 'garmin', connected: false, athleteId: null, scopes: [], expiresAt: null };
    }
    return {
      provider: 'garmin',
      connected: true,
      athleteId: connection.athleteId,
      scopes: connection.scopes,
      expiresAt: connection.expiresAt,
    };
  }
}
