export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  osrmUrl: string;
  supabaseJwtSecret: string;
  supabaseJwtAud: string;
  tokenEncryptionKey: string;
  stravaClientId: string;
  stravaClientSecret: string;
  stravaWebhookVerifyToken: string;
  stravaWebhookCallbackUrl: string;
  garminEnabled: boolean;
  garminClientId: string;
  garminClientSecret: string;
  sentryDsn: string;
};
