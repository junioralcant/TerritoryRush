import { Provider } from '../../activities/activities.types';

export type StravaTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId: string;
  scopes: string[];
};

export type StravaWebhookEvent = {
  objectType: string;
  objectId: number;
  aspectType: string;
  ownerId: number;
  subscriptionId: number;
  eventTime: number;
};

export type StravaWebhookValidationResponse = {
  'hub.challenge': string;
};

export type ProviderConnection = {
  userId: string;
  provider: Provider;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  expiresAt: string | null;
  athleteId: string | null;
  scopes: string[];
};

export type UpsertProviderConnectionInput = {
  userId: string;
  provider: Provider;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: string;
  athleteId: string;
  scopes: string[];
};

export type StravaConnectionState = {
  provider: 'strava';
  connected: boolean;
  athleteId: string | null;
  scopes: string[];
  expiresAt: string | null;
};

export type ProviderConnectionRow = {
  user_id: string;
  provider: Provider;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: Date | null;
  provider_athlete_id: string | null;
  scopes: string[];
};
