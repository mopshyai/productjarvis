import { createClient } from '@supabase/supabase-js';

// Support both Vite and Next.js env var formats (for Vercel/Supabase integration compatibility)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PRODUCTJARVIS_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_PRODUCTJARVIS_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_PRODUCTJARVIS_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_PRODUCTJARVIS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars — auth will not work in this environment');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-client-info': 'productjarvis-web',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;
