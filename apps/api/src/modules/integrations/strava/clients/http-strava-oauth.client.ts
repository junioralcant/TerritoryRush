import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { StravaOAuthClient } from '../ports/strava-oauth-client.port';
import { StravaTokenResponse } from '../strava.types';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTHORIZE_URL = 'https://www.strava.com/oauth/deauthorize';

type StravaTokenPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
  scope?: string;
};

@Injectable()
export class HttpStravaOAuthClient implements StravaOAuthClient {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  exchangeAuthorizationCode(code: string): Promise<StravaTokenResponse> {
    return this.requestToken({ grant_type: 'authorization_code', code });
  }

  refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    return this.requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  async deauthorize(accessToken: string): Promise<void> {
    const response = await fetch(STRAVA_DEAUTHORIZE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Strava deauthorize failed with status ${response.status}`);
    }
  }

  private async requestToken(extra: Record<string, string>): Promise<StravaTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.get('stravaClientId', { infer: true }),
      client_secret: this.config.get('stravaClientSecret', { infer: true }),
      ...extra,
    });
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`Strava token request failed with status ${response.status}`);
    }
    const data = (await response.json()) as StravaTokenPayload;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete?.id ? String(data.athlete.id) : '',
      scopes: data.scope ? data.scope.split(/[,\s]+/).filter(Boolean) : [],
    };
  }
}
