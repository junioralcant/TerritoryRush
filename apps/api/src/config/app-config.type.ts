export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  supabaseJwtSecret: string;
  supabaseJwtAud: string;
  tokenEncryptionKey: string;
  stravaClientId: string;
  stravaClientSecret: string;
  stravaWebhookVerifyToken: string;
  stravaWebhookCallbackUrl: string;
};
