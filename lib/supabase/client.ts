import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components.
 * Uses the anon key — RLS policies in Supabase control what data is exposed.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
