export type Provider = 'strava' | 'garmin';

export type IngestActivityJob = {
  userId: string;
  provider: Provider;
  providerActivityId: string;
};

export type ActivityStatus = 'imported' | 'processing' | 'processed' | 'rejected';

export type ActivityMetrics = {
  distanceM: number | null;
  movingTimeS: number | null;
  avgPaceSKm: number | null;
  startedAt: string | null;
};

export type GpsStreams = {
  latlng: Array<[number, number]>;
  time: number[];
  heartrate?: number[];
};

export type IngestedActivityData = {
  metrics: ActivityMetrics;
  streams: GpsStreams;
};

export type CreateActivityInput = {
  userId: string;
  provider: Provider;
  providerActivityId: string;
};

export type ActivityRecord = {
  id: string;
  userId: string;
  provider: Provider;
  providerActivityId: string;
  status: ActivityStatus;
  distanceM: number | null;
  movingTimeS: number | null;
  avgPaceSKm: number | null;
  startedAt: string | null;
  rejectionReason: string | null;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  provider: Provider;
  provider_activity_id: string;
  status: ActivityStatus;
  distance_m: number | null;
  moving_time_s: number | null;
  avg_pace_s_km: number | null;
  started_at: Date | null;
  rejection_reason: string | null;
};
