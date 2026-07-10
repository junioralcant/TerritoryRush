import { Inject, Injectable, Logger } from '@nestjs/common';
import { PROVIDER_CONNECTION_REPOSITORY, ProviderConnectionRepository } from './ports/provider-connection-repository.port';
import { STRAVA_OAUTH_CLIENT, StravaOAuthClient } from './ports/strava-oauth-client.port';
import { TOKEN_CIPHER, TokenCipher } from './ports/token-cipher.port';
import { StravaBackfillService } from './strava-backfill.service';
import { StravaConnectionState } from './strava.types';

const toIso = (epochSeconds: number): string => new Date(epochSeconds * 1000).toISOString();

@Injectable()
export class StravaConnectionService {
  private readonly logger = new Logger(StravaConnectionService.name);

  constructor(
    @Inject(STRAVA_OAUTH_CLIENT) private readonly oauth: StravaOAuthClient,
    @Inject(PROVIDER_CONNECTION_REPOSITORY) private readonly connections: ProviderConnectionRepository,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
    private readonly backfill: StravaBackfillService,
  ) {}

  async connect(userId: string, code: string): Promise<StravaConnectionState> {
    const tokens = await this.oauth.exchangeAuthorizationCode(code);
    const expiresAt = toIso(tokens.expiresAt);

    await this.connections.upsert({
      userId,
      provider: 'strava',
      accessTokenEnc: this.cipher.encrypt(tokens.accessToken),
      refreshTokenEnc: this.cipher.encrypt(tokens.refreshToken),
      expiresAt,
      athleteId: tokens.athleteId,
      scopes: tokens.scopes,
    });

    try {
      await this.backfill.backfillRecent(userId, tokens.accessToken);
    } catch (error) {
      this.logger.warn(`Strava backfill failed for user ${userId}: ${(error as Error).message}`);
    }

    return {
      provider: 'strava',
      connected: true,
      athleteId: tokens.athleteId,
      scopes: tokens.scopes,
      expiresAt,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const connection = await this.connections.findByUserAndProvider(userId, 'strava');
    if (connection?.accessTokenEnc) {
      try {
        await this.oauth.deauthorize(this.cipher.decrypt(connection.accessTokenEnc));
      } catch (error) {
        this.logger.warn(`Strava deauthorize failed for user ${userId}: ${(error as Error).message}`);
      }
    }
    await this.connections.delete(userId, 'strava');
  }

  async getConnectionState(userId: string): Promise<StravaConnectionState> {
    const connection = await this.connections.findByUserAndProvider(userId, 'strava');
    if (!connection) {
      return { provider: 'strava', connected: false, athleteId: null, scopes: [], expiresAt: null };
    }
    return {
      provider: 'strava',
      connected: true,
      athleteId: connection.athleteId,
      scopes: connection.scopes,
      expiresAt: connection.expiresAt,
    };
  }
}
