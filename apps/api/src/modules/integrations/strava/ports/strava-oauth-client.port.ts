import { StravaTokenResponse } from '../strava.types';

export const STRAVA_OAUTH_CLIENT = Symbol('STRAVA_OAUTH_CLIENT');

/**
 * Contract for the Strava OAuth 2.0 endpoints (external service). Mocked at this
 * boundary in tests — never hit the real Strava API from a test.
 */
export interface StravaOAuthClient {
  exchangeAuthorizationCode(code: string): Promise<StravaTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse>;
  deauthorize(accessToken: string): Promise<void>;
}
