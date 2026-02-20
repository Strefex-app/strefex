/**
 * Supabase client initialisation.
 *
 * Creates a singleton Supabase client used across the app for:
 *   - Authentication (email/password, magic link, OAuth)
 *   - Database queries (with Row Level Security)
 *   - Realtime subscriptions
 *   - Storage (file uploads)
 *
 * The client is only created when VITE_SUPABASE_URL is configured.
 */
import { createClient } from '@supabase/supabase-js'
import env from './env'

export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)

let supabase = null

if (isSupabaseConfigured) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export { supabase }
export default supabase
