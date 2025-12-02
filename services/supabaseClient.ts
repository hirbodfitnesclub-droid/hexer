import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_URL : undefined);

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean);
  throw new Error(
    `Supabase configuration missing: ${missing.join(
      ', ',
    )}. Set these in your hosting environment (e.g., Google AI Studio env settings) or a local .env file.`,
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
