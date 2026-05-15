import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/logout
 * Cierra la sesión del user actual. Borra las cookies de auth de
 * Supabase. Devuelve {ok: true} para que el cliente haga redirect.
 */
export async function POST() {
  const sb = await createClient();
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}
