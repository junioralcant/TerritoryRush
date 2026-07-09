import { ActivityMetrics, GpsStreams } from '../../../activities/activities.types';

export const STRAVA_ACTIVITY_CLIENT = Symbol('STRAVA_ACTIVITY_CLIENT');

/**
 * Contract for reading a Strava activity's summary metrics and GPS streams
 * (external service). Mocked at this boundary in tests.
 */
export interface StravaActivityClient {
  fetchActivity(providerActivityId: string, accessToken: string): Promise<ActivityMetrics>;
  fetchStreams(providerActivityId: string, accessToken: string): Promise<GpsStreams>;
}
