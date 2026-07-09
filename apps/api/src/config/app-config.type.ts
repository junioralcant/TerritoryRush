export type AppConfig = {
  port: number;
  databaseUrl: string;
  supabaseJwtSecret: string;
  supabaseJwtAud: string;
};
