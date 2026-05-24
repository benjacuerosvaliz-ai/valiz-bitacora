import { NextResponse, type NextRequest } from "next/server";

import { sendCanjeConfirmation } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DENOMINACIONES_OK = new Set([5_000, 10_000, 20_000, 50_000]);

const ERROR_MAP: Record<string, string> = {
  P0001: "No tienes suficientes puntos.",
  P0002: "Sin stock para esa denominación. Pronto agregamos más.",
  P0003: "Denominación inválida.",
  P0004: "No encontramos tu cuenta.",
};

/**
 * POST /api/canje/redimir
 * Body: { denominacion: 5000 | 10000 | 20000 | 50000 }
 *
 * Llama fn_redimir_codigo() en Postgres para canje atómico (FOR UPDATE
 * SKIP LOCKED para evitar race conditions). Devuelve el código asignado.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const denominacion = Number(body?.denominacion);
  if (!Number.isFinite(denominacion) || !DENOMINACIONES_OK.has(denominacion)) {
    return NextResponse.json({ error: "Denominación inválida." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_redimir_codigo", {
    p_user_id: user.id,
    p_denominacion: denominacion,
  });

  if (error) {
    const friendly = ERROR_MAP[error.code ?? ""] ?? "No se pudo canjear.";
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  // Email de confirmación con el código (por si el user lo pierde en la web)
  const { data: profile } = await admin
    .from("user_profiles")
    .select("puntos_actuales")
    .eq("id", user.id)
    .maybeSingle();
  if (user.email && data) {
    sendCanjeConfirmation({
      userEmail: user.email,
      monto: denominacion,
      codigo: String(data),
      ptsRestantes: profile?.puntos_actuales ?? 0,
    }).catch((e) => console.error("[send canje email]", e));
  }

  return NextResponse.json({ ok: true, code: data });
}
