import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PROVIDER_CONNECTION_REPOSITORY, ProviderConnectionRepository } from './ports/provider-connection-repository.port';
import { STRAVA_OAUTH_CLIENT, StravaOAuthClient } from './ports/strava-oauth-client.port';
import { TOKEN_CIPHER, TokenCipher } from './ports/token-cipher.port';
import { needsTokenRefresh } from './token-refresh';

@Injectable()
export class StravaTokenService {
  constructor(
    @Inject(PROVIDER_CONNECTION_REPOSITORY) private readonly connections: ProviderConnectionRepository,
    @Inject(STRAVA_OAUTH_CLIENT) private readonly oauth: StravaOAuthClient,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
  ) {}

  async getFreshAccessToken(userId: string): Promise<string> {
    const connection = await this.connections.findByUserAndProvider(userId, 'strava');
    if (!connection?.accessTokenEnc || !connection.refreshTokenEnc || !connection.expiresAt) {
      throw new NotFoundException('No Strava connection for user');
    }

    const expiresAtSeconds = Math.floor(new Date(connection.expiresAt).getTime() / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!needsTokenRefresh(expiresAtSeconds, nowSeconds)) {
      return this.cipher.decrypt(connection.accessTokenEnc);
    }

    const refreshed = await this.oauth.refreshAccessToken(this.cipher.decrypt(connection.refreshTokenEnc));
    await this.connections.upsert({
      userId,
      provider: 'strava',
      accessTokenEnc: this.cipher.encrypt(refreshed.accessToken),
      refreshTokenEnc: this.cipher.encrypt(refreshed.refreshToken),
      expiresAt: new Date(refreshed.expiresAt * 1000).toISOString(),
      athleteId: refreshed.athleteId || connection.athleteId || '',
      scopes: refreshed.scopes.length ? refreshed.scopes : connection.scopes,
    });
    return refreshed.accessToken;
  }
}
