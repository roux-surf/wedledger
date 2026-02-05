import { useSession } from '@clerk/nextjs';
import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import { useMemo, useRef } from 'react';

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function useSupabaseClient() {
  const { session } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  return useMemo(() => {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

    return supabaseCreateClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          const token = await sessionRef.current?.getToken({ template: 'supabase' });
          const headers = new Headers(options.headers);
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return supabaseCreateClient(supabaseUrl, supabaseAnonKey);
}
