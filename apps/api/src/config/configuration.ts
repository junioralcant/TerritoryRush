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
  supabaseJwtSecret: required('SUPABASE_JWT_SECRET'),
  supabaseJwtAud: process.env.SUPABASE_JWT_AUD ?? 'authenticated',
});
