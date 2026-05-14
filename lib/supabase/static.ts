import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para reads públicos sin contexto de request.
 *
 * Usar en `generateStaticParams`, `generateMetadata`, y páginas que solo
 * leen datos públicos (filtrados por RLS con anon). Permite que Next.js
 * pre-renderice estáticamente sin opt-out por `cookies()`.
 *
 * Para páginas con auth o sesión de usuario, usar `createClient` de
 * `lib/supabase/server.ts` (que sí maneja cookies).
 */
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
