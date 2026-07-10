import { AppConfig } from './app-config.type';

export const CONFIG_NAMESPACE = 'app';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const loadConfiguration = (): AppConfig => ({
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? '',
  osrmUrl: process.env.OSRM_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  supabaseJwtAud: process.env.SUPABASE_JWT_AUD ?? 'authenticated',
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? '',
  stravaClientId: process.env.STRAVA_CLIENT_ID ?? '',
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
  stravaWebhookVerifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? '',
  stravaWebhookCallbackUrl: process.env.STRAVA_WEBHOOK_CALLBACK_URL ?? '',
  garminEnabled: process.env.GARMIN_ENABLED === 'true',
  garminClientId: process.env.GARMIN_CLIENT_ID ?? '',
  garminClientSecret: process.env.GARMIN_CLIENT_SECRET ?? '',
  sentryDsn: process.env.SENTRY_DSN ?? '',
});
