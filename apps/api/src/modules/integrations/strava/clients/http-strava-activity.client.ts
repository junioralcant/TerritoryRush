import { Injectable } from '@nestjs/common';
import { ActivityMetrics, GpsStreams } from '../../../activities/activities.types';
import { MetricsService } from '../../../../observability/metrics.service';
import { StravaActivityClient } from '../ports/strava-activity-client.port';
import { StravaActivitySummary } from '../strava.types';

const STRAVA_API = 'https://www.strava.com/api/v3';

type StravaActivityPayload = {
  distance?: number;
  moving_time?: number;
  start_date?: string;
  average_speed?: number;
  sport_type?: string;
  type?: string;
};

type StravaStreamSet = {
  latlng?: { data: Array<[number, number]> };
  time?: { data: number[] };
  heartrate?: { data: number[] };
};

type StravaSummaryActivity = {
  id?: number;
  sport_type?: string;
  type?: string;
  start_date?: string;
};

const authHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
});

const ensureOk = (response: Response, action: string): void => {
  if (response.ok) {
    return;
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') ?? 'unknown';
    throw new Error(`Strava ${action} rate limited (retry-after=${retryAfter})`);
  }
  throw new Error(`Strava ${action} failed with status ${response.status}`);
};

@Injectable()
export class HttpStravaActivityClient implements StravaActivityClient {
  constructor(private readonly metrics: MetricsService) {}

  private recordRateLimit(response: Response): void {
    if (response.status === 429) {
      this.metrics.incStravaRateLimitHit();
    }
  }

  async fetchActivity(providerActivityId: string, accessToken: string): Promise<ActivityMetrics> {
    const response = await fetch(`${STRAVA_API}/activities/${providerActivityId}`, {
      headers: authHeaders(accessToken),
    });
    this.recordRateLimit(response);
    ensureOk(response, 'fetch activity');
    const data = (await response.json()) as StravaActivityPayload;
    const distanceM = data.distance ?? null;
    const movingTimeS = data.moving_time ?? null;
    // Prefer Strava's reported average_speed (an independent field) so the
    // anti-cheat coherence check can compare it against the distance/time-derived
    // pace; fall back to deriving it only when average_speed is absent.
    const avgPaceSKm =
      data.average_speed && data.average_speed > 0
        ? 1000 / data.average_speed
        : distanceM && movingTimeS && distanceM > 0
          ? movingTimeS / (distanceM / 1000)
          : null;
    return {
      distanceM,
      movingTimeS,
      avgPaceSKm,
      startedAt: data.start_date ?? null,
      sportType: data.sport_type ?? data.type ?? null,
    };
  }

  async fetchStreams(providerActivityId: string, accessToken: string): Promise<GpsStreams> {
    const response = await fetch(
      `${STRAVA_API}/activities/${providerActivityId}/streams?keys=latlng,time,heartrate&key_by_type=true`,
      { headers: authHeaders(accessToken) },
    );
    this.recordRateLimit(response);
    ensureOk(response, 'fetch streams');
    const data = (await response.json()) as StravaStreamSet;
    return {
      latlng: data.latlng?.data ?? [],
      time: data.time?.data ?? [],
      heartrate: data.heartrate?.data,
    };
  }

  async listRecentActivities(accessToken: string, perPage: number): Promise<StravaActivitySummary[]> {
    const response = await fetch(`${STRAVA_API}/athlete/activities?per_page=${perPage}`, {
      headers: authHeaders(accessToken),
    });
    this.recordRateLimit(response);
    ensureOk(response, 'list activities');
    const data = (await response.json()) as StravaSummaryActivity[];
    return data
      .filter((activity) => activity.id != null)
      .map((activity) => ({
        providerActivityId: String(activity.id),
        sportType: activity.sport_type ?? activity.type ?? null,
        startedAt: activity.start_date ?? null,
      }));
  }
}
