import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://julnrlnlkpblhrfnbxmm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bG5ybG5sa3BibGhyZm5ieG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzAyNTMsImV4cCI6MjA3ODUwNjI1M30.IdOCT0XcdnMOLmANz19Mo2ppO0G0sl-pJVt0F7fwZcQ';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
