import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '../config';

let client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!client) {
    const config = loadConfig();
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
};
