export type Provider = 'strava' | 'garmin';

export type IngestActivityJob = {
  userId: string;
  provider: Provider;
  providerActivityId: string;
};
