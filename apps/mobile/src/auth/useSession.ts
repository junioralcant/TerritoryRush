import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getSupabaseClient } from './supabaseClient';

export type Provider = 'google' | 'apple';

export type UseSessionResult = {
  session: Session | null;
  authenticating: boolean;
  signInWith: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = (): UseSessionResult => {
  const [session, setSession] = useState<Session | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const signInWith = async (provider: Provider): Promise<void> => {
    setAuthenticating(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (data.url) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return { session, authenticating, signInWith, signOut };
};
