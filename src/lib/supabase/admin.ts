import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the secret key. Bypasses Row Level Security —
 * never import this from a Client Component and never send its responses to the
 * browser unfiltered. Use only in Server Actions / Route Handlers for trusted,
 * server-only operations (e.g. admin tasks, background jobs).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
