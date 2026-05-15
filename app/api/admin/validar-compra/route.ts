import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/auth/admin-guard";
import { sendCompraValidada } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/validar-compra
 * Body: { id: uuid, award_pts: number }
 *
 * Solo admin. Marca compras_manuales.verified=true. Si award_pts > 0,
 * inserta puntos_movimientos con motivo "ajuste_admin" referenciando la
 * compra (idempotente — no duplica si ya hay).
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const awardPts = Math.max(0, Math.floor(Number(body?.award_pts ?? 0)));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: compra, error: fetchErr } = await admin
    .from("compras_manuales")
    .select("id, user_id, familia_slug, color_valiz, verified")
    .eq("id", id)
    .single();
  if (fetchErr || !compra) {
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  }
  if (compra.verified) {
    return NextResponse.json({ ok: true, already: true });
  }

  await admin.from("compras_manuales").update({ verified: true }).eq("id", id);

  if (awardPts > 0) {
    // Idempotencia: si ya hay un movimiento ajuste_admin con esta referencia, no duplicar
    const { count } = await admin
      .from("puntos_movimientos")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", compra.user_id)
      .eq("motivo", "ajuste_admin")
      .eq("referencia_id", id);
    if ((count ?? 0) === 0) {
      await admin.from("puntos_movimientos").insert({
        user_id: compra.user_id,
        delta: awardPts,
        motivo: "ajuste_admin",
        referencia_id: id,
      });
    }
  }

  // Notificar al user que su pieza fue validada
  const [{ data: userRow }, { data: famRow }] = await Promise.all([
    admin.from("user_profiles").select("email").eq("id", compra.user_id).maybeSingle(),
    compra.familia_slug
      ? admin.from("familias").select("name").eq("slug", compra.familia_slug).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (userRow?.email) {
    sendCompraValidada({
      userEmail: userRow.email,
      familiaName: famRow?.name ?? compra.familia_slug ?? "Pieza",
      colorValiz: compra.color_valiz ?? "",
      ptsOtorgados: awardPts,
    }).catch((e) => console.error("[send compra validada]", e));
  }

  return NextResponse.json({ ok: true });
}
