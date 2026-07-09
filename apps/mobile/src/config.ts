export type AppConfig = {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  stravaClientId: string;
};

export const loadConfig = (): AppConfig => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  stravaClientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '',
});
