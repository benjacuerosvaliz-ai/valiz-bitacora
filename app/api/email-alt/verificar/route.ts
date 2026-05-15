import { NextResponse, type NextRequest } from "next/server";

import { consumeVerification } from "@/lib/auth/email-verify";
import { reconcileBonusesForEmail } from "@/lib/auth/reconcile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/email-alt/verificar
 * Body: { email, code }
 *
 * Valida el código contra el verification activo. Si OK: agrega el email
 * a secondary_emails del user_profile y dispara reconciliación retroactiva
 * de bonos (puntos por compras pasadas + bono familia nueva por familias
 * que aparezcan recién con este email).
 */
const REASON_MSG: Record<string, string> = {
  no_pending: "No hay código pendiente. Pide uno nuevo.",
  expired: "El código expiró. Pide uno nuevo.",
  too_many: "Demasiados intentos. Pide un nuevo código.",
  wrong_code: "Código incorrecto.",
};

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const result = await consumeVerification({
    userId: user.id,
    email,
    code,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MSG[result.reason] ?? "No se pudo verificar." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Agregar email a secondary_emails (array unique-merge)
  const { data: profile } = await admin
    .from("user_profiles")
    .select("secondary_emails")
    .eq("id", user.id)
    .single();
  const current = profile?.secondary_emails ?? [];
  if (!current.includes(email)) {
    await admin
      .from("user_profiles")
      .update({ secondary_emails: [...current, email] })
      .eq("id", user.id);
  }

  // Reconciliación retroactiva del email recién vinculado
  let resumen = { ptsOtorgados: 0, ordersMatched: 0 };
  try {
    resumen = await reconcileBonusesForEmail(user.id, email);
  } catch (e) {
    console.error("[reconcile email-alt]", e);
  }

  return NextResponse.json({
    ok: true,
    pts_otorgados: resumen.ptsOtorgados,
    orders_matched: resumen.ordersMatched,
  });
}
