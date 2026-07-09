import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { ActivityMetrics, GpsStreams } from '../../../activities/activities.types';
import { GarminActivityClient, GarminOAuthClient } from '../ports/garmin-clients.port';
import { GarminTokenResponse } from '../garmin.types';

const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
const GARMIN_API = 'https://apis.garmin.com/wellness-api/rest';

type GarminTokenPayload = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id?: string;
  scope?: string;
};

@Injectable()
export class HttpGarminOAuthClient implements GarminOAuthClient {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<GarminTokenResponse> {
    return this.requestToken({ grant_type: 'authorization_code', code, code_verifier: codeVerifier });
  }

  refreshAccessToken(refreshToken: string): Promise<GarminTokenResponse> {
    return this.requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async requestToken(extra: Record<string, string>): Promise<GarminTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.get('garminClientId', { infer: true }),
      client_secret: this.config.get('garminClientSecret', { infer: true }),
      ...extra,
    });
    const response = await fetch(GARMIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`Garmin token request failed with status ${response.status}`);
    }
    const data = (await response.json()) as GarminTokenPayload;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 0),
      userId: data.user_id ?? '',
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }
}

type GarminActivityPayload = {
  distanceInMeters?: number;
  durationInSeconds?: number;
  averageSpeedInMetersPerSecond?: number;
  startTimeInSeconds?: number;
  samples?: Array<{ latitudeInDegree?: number; longitudeInDegree?: number; heartRate?: number; timerDurationInSeconds?: number }>;
};

@Injectable()
export class HttpGarminActivityClient implements GarminActivityClient {
  async fetchActivity(summaryId: string, accessToken: string): Promise<ActivityMetrics> {
    const data = await this.get(summaryId, accessToken);
    const distanceM = data.distanceInMeters ?? null;
    const movingTimeS = data.durationInSeconds ?? null;
    const avgPaceSKm =
      data.averageSpeedInMetersPerSecond && data.averageSpeedInMetersPerSecond > 0
        ? 1000 / data.averageSpeedInMetersPerSecond
        : null;
    return {
      distanceM,
      movingTimeS,
      avgPaceSKm,
      startedAt: data.startTimeInSeconds ? new Date(data.startTimeInSeconds * 1000).toISOString() : null,
    };
  }

  async fetchStreams(summaryId: string, accessToken: string): Promise<GpsStreams> {
    const data = await this.get(summaryId, accessToken);
    const samples = data.samples ?? [];
    return {
      latlng: samples
        .filter((s) => s.latitudeInDegree !== undefined && s.longitudeInDegree !== undefined)
        .map((s) => [s.latitudeInDegree as number, s.longitudeInDegree as number]),
      time: samples.map((s) => s.timerDurationInSeconds ?? 0),
      heartrate: samples.some((s) => s.heartRate !== undefined)
        ? samples.map((s) => s.heartRate ?? 0)
        : undefined,
    };
  }

  private async get(summaryId: string, accessToken: string): Promise<GarminActivityPayload> {
    const response = await fetch(`${GARMIN_API}/activityDetails/${summaryId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Garmin fetch activity failed with status ${response.status}`);
    }
    return (await response.json()) as GarminActivityPayload;
  }
}
