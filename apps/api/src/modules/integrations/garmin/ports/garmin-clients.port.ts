import { ActivityMetrics, GpsStreams } from '../../../activities/activities.types';
import { GarminTokenResponse } from '../garmin.types';

export const GARMIN_OAUTH_CLIENT = Symbol('GARMIN_OAUTH_CLIENT');
export const GARMIN_ACTIVITY_CLIENT = Symbol('GARMIN_ACTIVITY_CLIENT');

/**
 * Garmin OAuth 2.0 (PKCE) contract (external service). Mocked at this boundary.
 */
export interface GarminOAuthClient {
  exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<GarminTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<GarminTokenResponse>;
}

/**
 * Reads a Garmin activity's metrics and GPS streams (external service). Mocked.
 */
export interface GarminActivityClient {
  fetchActivity(summaryId: string, accessToken: string): Promise<ActivityMetrics>;
  fetchStreams(summaryId: string, accessToken: string): Promise<GpsStreams>;
}
