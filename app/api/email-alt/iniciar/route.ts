import { NextResponse, type NextRequest } from "next/server";

import {
  EMAIL_VERIFY_CONFIG,
  createVerification,
  generateCode,
  isRateLimited,
} from "@/lib/auth/email-verify";
import { sendCodigoVerificacion } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/email-alt/iniciar
 * Body: { email }
 *
 * Genera un código de 6 dígitos, lo hashea y guarda, y lo manda al email
 * indicado vía Resend. Rate limit: 3 envíos/hora por (user, email).
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Email inválido." },
      { status: 400 },
    );
  }

  // No puede vincular su mismo correo primary
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("email, secondary_emails")
    .eq("id", user.id)
    .single();

  if (profile?.email === email) {
    return NextResponse.json(
      { error: "Ese ya es tu correo principal." },
      { status: 400 },
    );
  }
  if (profile?.secondary_emails?.includes(email)) {
    return NextResponse.json(
      { error: "Ese correo ya está vinculado a tu cuenta." },
      { status: 400 },
    );
  }

  // No puede ser el primary email de OTRO user (un email = una sola cuenta)
  const { data: ajeno } = await admin
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (ajeno && ajeno.id !== user.id) {
    return NextResponse.json(
      {
        error:
          "Ese correo ya pertenece a otra cuenta Valiz. Si es tuyo, contáctanos.",
      },
      { status: 409 },
    );
  }

  if (await isRateLimited({ userId: user.id, email })) {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos en la última hora. Espera un poco antes de volver a intentar.",
      },
      { status: 429 },
    );
  }

  const code = generateCode();
  await createVerification({ userId: user.id, email, code });
  const sent = await sendCodigoVerificacion({
    email,
    codigo: code,
    expiresInMin: EMAIL_VERIFY_CONFIG.EXPIRES_MIN,
  });

  if (!sent) {
    return NextResponse.json(
      { error: "No pudimos enviar el código. Vuelve a intentar en un momento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
