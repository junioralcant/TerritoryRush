import { Injectable } from '@nestjs/common';
import { ActivityMetrics, GpsStreams } from '../../../activities/activities.types';
import { StravaActivityClient } from '../ports/strava-activity-client.port';

const STRAVA_API = 'https://www.strava.com/api/v3';

type StravaActivityPayload = {
  distance?: number;
  moving_time?: number;
  start_date?: string;
  average_speed?: number;
};

type StravaStreamSet = {
  latlng?: { data: Array<[number, number]> };
  time?: { data: number[] };
  heartrate?: { data: number[] };
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
  async fetchActivity(providerActivityId: string, accessToken: string): Promise<ActivityMetrics> {
    const response = await fetch(`${STRAVA_API}/activities/${providerActivityId}`, {
      headers: authHeaders(accessToken),
    });
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
    return { distanceM, movingTimeS, avgPaceSKm, startedAt: data.start_date ?? null };
  }

  async fetchStreams(providerActivityId: string, accessToken: string): Promise<GpsStreams> {
    const response = await fetch(
      `${STRAVA_API}/activities/${providerActivityId}/streams?keys=latlng,time,heartrate&key_by_type=true`,
      { headers: authHeaders(accessToken) },
    );
    ensureOk(response, 'fetch streams');
    const data = (await response.json()) as StravaStreamSet;
    return {
      latlng: data.latlng?.data ?? [],
      time: data.time?.data ?? [],
      heartrate: data.heartrate?.data,
    };
  }
}
