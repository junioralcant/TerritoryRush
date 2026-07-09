export type GarminTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  scopes: string[];
};

export type GarminWebhookActivity = {
  userId: string;
  summaryId: string;
};

export type GarminWebhookPayload = {
  activities?: GarminWebhookActivity[];
};

export type GarminConnectionState = {
  provider: 'garmin';
  connected: boolean;
  athleteId: string | null;
  scopes: string[];
  expiresAt: string | null;
};
