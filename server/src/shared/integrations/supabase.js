import { createClient } from '@supabase/supabase-js';
import { config } from '../../config.js';

let supabaseClient = null;

/**
 * Returns the shared singleton Supabase client instance if configured, or null otherwise.
 * Reusable across any feature requiring database operations.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Checks if Supabase persistence credentials are fully configured.
 *
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceKey);
}
