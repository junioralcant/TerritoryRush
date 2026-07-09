import { Injectable } from '@nestjs/common';
import { ActivityMetrics, GpsStreams } from '../../../activities/activities.types';
import { StravaActivityClient } from '../ports/strava-activity-client.port';

const STRAVA_API = 'https://www.strava.com/api/v3';

type StravaActivityPayload = {
  distance?: number;
  moving_time?: number;
  start_date?: string;
};

type StravaStreamSet = {
  latlng?: { data: Array<[number, number]> };
  time?: { data: number[] };
  heartrate?: { data: number[] };
};

const authHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
});

@Injectable()
export class HttpStravaActivityClient implements StravaActivityClient {
  async fetchActivity(providerActivityId: string, accessToken: string): Promise<ActivityMetrics> {
    const response = await fetch(`${STRAVA_API}/activities/${providerActivityId}`, {
      headers: authHeaders(accessToken),
    });
    if (!response.ok) {
      throw new Error(`Strava fetch activity failed with status ${response.status}`);
    }
    const data = (await response.json()) as StravaActivityPayload;
    const distanceM = data.distance ?? null;
    const movingTimeS = data.moving_time ?? null;
    const avgPaceSKm =
      distanceM && movingTimeS && distanceM > 0 ? movingTimeS / (distanceM / 1000) : null;
    return { distanceM, movingTimeS, avgPaceSKm, startedAt: data.start_date ?? null };
  }

  async fetchStreams(providerActivityId: string, accessToken: string): Promise<GpsStreams> {
    const response = await fetch(
      `${STRAVA_API}/activities/${providerActivityId}/streams?keys=latlng,time,heartrate&key_by_type=true`,
      { headers: authHeaders(accessToken) },
    );
    if (!response.ok) {
      throw new Error(`Strava fetch streams failed with status ${response.status}`);
    }
    const data = (await response.json()) as StravaStreamSet;
    return {
      latlng: data.latlng?.data ?? [],
      time: data.time?.data ?? [],
      heartrate: data.heartrate?.data,
    };
  }
}
