import { createClient } from '@supabase/supabase-js';
import { getRequiredEnv, loadEnv } from '../utils/env.js';

let supabase;

export function getSupabase() {
  if (!supabase) {
    loadEnv();
    const url = getRequiredEnv('SUPABASE_URL');
    const serviceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}
