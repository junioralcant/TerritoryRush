export type AppConfig = {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  stravaClientId: string;
  // Mirrors the backend GARMIN_ENABLED flag. Gates the Garmin connection UI
  // (added when the Garmin partner program is approved); off by default.
  garminEnabled: boolean;
};

export const loadConfig = (): AppConfig => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  stravaClientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '',
  garminEnabled: process.env.EXPO_PUBLIC_GARMIN_ENABLED === 'true',
});
