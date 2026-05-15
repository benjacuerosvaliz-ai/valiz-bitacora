import { NextResponse, type NextRequest } from "next/server";

import { ensureProfileAndReconcile } from "@/lib/auth/reconcile";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback del magic link de Supabase. Llega como `?code=xxx`. Intercambia
 * el código por una sesión, asegura que exista el user_profile y dispara
 * la reconciliación retroactiva (puntos por compras pasadas + bono
 * bienvenida + bonos por familia).
 *
 * Después redirige a /yo (o a `next` si se mandó en el link).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/yo";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url));
  }

  const sb = await createClient();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message ?? "auth_fail")}`, url),
    );
  }

  try {
    await ensureProfileAndReconcile({
      userId: data.user.id,
      email: data.user.email ?? "",
    });
  } catch (e) {
    console.error("reconcile fail", e);
    // No bloqueamos el login si la reconciliación falla — el user igual
    // entra con sesión válida y puede ver su /yo (aunque sin equipaje).
  }

  return NextResponse.redirect(new URL(next, url));
}
