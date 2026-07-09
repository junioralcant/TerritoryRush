import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PROVIDER_CONNECTION_REPOSITORY, ProviderConnectionRepository } from '../strava/ports/provider-connection-repository.port';
import { TOKEN_CIPHER, TokenCipher } from '../strava/ports/token-cipher.port';
import { needsTokenRefresh } from '../strava/token-refresh';
import { GARMIN_OAUTH_CLIENT, GarminOAuthClient } from './ports/garmin-clients.port';

@Injectable()
export class GarminTokenService {
  constructor(
    @Inject(PROVIDER_CONNECTION_REPOSITORY) private readonly connections: ProviderConnectionRepository,
    @Inject(GARMIN_OAUTH_CLIENT) private readonly oauth: GarminOAuthClient,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
  ) {}

  async getFreshAccessToken(userId: string): Promise<string> {
    const connection = await this.connections.findByUserAndProvider(userId, 'garmin');
    if (!connection?.accessTokenEnc || !connection.refreshTokenEnc || !connection.expiresAt) {
      throw new NotFoundException('No Garmin connection for user');
    }
    const expiresAtSeconds = Math.floor(new Date(connection.expiresAt).getTime() / 1000);
    if (!needsTokenRefresh(expiresAtSeconds, Math.floor(Date.now() / 1000))) {
      return this.cipher.decrypt(connection.accessTokenEnc);
    }
    const refreshed = await this.oauth.refreshAccessToken(this.cipher.decrypt(connection.refreshTokenEnc));
    await this.connections.upsert({
      userId,
      provider: 'garmin',
      accessTokenEnc: this.cipher.encrypt(refreshed.accessToken),
      refreshTokenEnc: this.cipher.encrypt(refreshed.refreshToken),
      expiresAt: new Date(refreshed.expiresAt * 1000).toISOString(),
      athleteId: refreshed.userId || connection.athleteId || '',
      scopes: refreshed.scopes.length ? refreshed.scopes : connection.scopes,
    });
    return refreshed.accessToken;
  }
}
