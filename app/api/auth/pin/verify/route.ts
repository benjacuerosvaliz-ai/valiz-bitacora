import { NextResponse, type NextRequest } from "next/server";

import {
  comparePin,
  isLockedOut,
  isValidPinFormat,
  logPinAttempt,
} from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/pin/verify
 * Body: { email, pin }
 *
 * Verifica el PIN del email dado. Si match, genera un magic-link token
 * (server-side, via admin) y lo devuelve al frontend como `token_hash`
 * para que el cliente lo use con supabase.auth.verifyOtp(). Esto le
 * entrega sesión sin tener que mandar correo.
 *
 * Rate limit: 5 fallos en 15 min → 403 locked + obliga a magic link.
 * Mensajes de error genéricos para no revelar si el email existe.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").toLowerCase().trim();
  const pin = String(body?.pin ?? "");

  if (!email || !isValidPinFormat(pin)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (await isLockedOut(email)) {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos fallidos. Usa el magic link en tu correo para entrar.",
        locked: true,
      },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, pin_hash")
    .eq("email", email)
    .maybeSingle();

  // Error genérico — no revelamos si el email existe o si el PIN está mal.
  const genericFail = NextResponse.json(
    { error: "Email o PIN incorrecto." },
    { status: 401 },
  );

  if (!profile || !profile.pin_hash) {
    await logPinAttempt(email, false);
    return genericFail;
  }

  const ok = await comparePin(pin, profile.pin_hash);
  await logPinAttempt(email, ok);
  if (!ok) return genericFail;

  // Match — generar magic-link token sin enviar correo
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties) {
    return NextResponse.json(
      { error: "No se pudo generar la sesión, intenta de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    token_hash: link.properties.hashed_token,
  });
}
