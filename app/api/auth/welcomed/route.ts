import { NextResponse } from "next/server";

import { notifyAdminNuevoSignup } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/welcomed
 *
 * Marca welcomed_at = now() en user_profiles, para no volver a mostrar el
 * modal de bienvenida en próximos logins. Si era la primera vez (welcomed_at
 * estaba null), también dispara la notificación a admin (Benja) avisando
 * que entró un user nuevo a la bitácora — con email, handle, ubicación,
 * piezas en su equipaje y saldo inicial.
 */
export async function POST() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const admin = createAdminClient();

  // Snapshot del perfil ANTES del update (necesitamos welcomed_at para
  // saber si es la primera vez).
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      "email, handle, display_name, city, country, puntos_actuales, welcomed_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const esPrimeraVez = !!profile && !profile.welcomed_at;

  await admin
    .from("user_profiles")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("id", user.id);

  // Notificación admin: solo si era primera vez. Fire-and-forget.
  if (esPrimeraVez && profile?.email) {
    // Contar piezas del equipaje (orders pagadas con su email primary).
    const { count: piezas } = await admin
      .from("order_items")
      .select("id, orders!inner(email, financial_status)", {
        head: true,
        count: "exact",
      })
      .eq("orders.email", profile.email.toLowerCase())
      .in("orders.financial_status", ["paid", "partially_refunded"]);

    notifyAdminNuevoSignup({
      userEmail: profile.email,
      handle: profile.handle ?? null,
      displayName: profile.display_name ?? null,
      city: profile.city ?? null,
      country: profile.country ?? null,
      piezas: piezas ?? 0,
      saldoInicial: Number(profile.puntos_actuales ?? 0),
    }).catch((e) => console.error("[welcomed] notifyAdminNuevoSignup", e));
  }

  return NextResponse.json({ ok: true });
}
