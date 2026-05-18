import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/auth/admin-guard";
import { notify } from "@/lib/notificaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/invalidar-bitacora
 * Body: { id: uuid }
 *
 * Solo admin. Marca bitacora_entries.invalidated=true (deja de aparecer
 * en feed público / mapa). Si tenía points_awarded > 0, registra
 * movimiento negativo para revertir los puntos.
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
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: bit, error: fetchErr } = await admin
    .from("bitacora_entries")
    .select("id, user_id, points_awarded, invalidated")
    .eq("id", id)
    .single();
  if (fetchErr || !bit) {
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  }
  if (bit.invalidated) {
    return NextResponse.json({ ok: true, already: true });
  }

  await admin.from("bitacora_entries").update({ invalidated: true }).eq("id", id);

  if (bit.points_awarded > 0) {
    // Idempotencia: si ya se revirtió antes, no duplicar
    const refRev = `revert:${id}`;
    const { count } = await admin
      .from("puntos_movimientos")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", bit.user_id)
      .eq("motivo", "ajuste_admin")
      .eq("referencia_id", refRev);
    if ((count ?? 0) === 0) {
      await admin.from("puntos_movimientos").insert({
        user_id: bit.user_id,
        delta: -bit.points_awarded,
        motivo: "ajuste_admin",
        referencia_id: refRev,
      });
    }
  }

  // Notificar al user
  await notify({
    userId: bit.user_id,
    type: "bitacora_invalidada",
    refId: id,
    refType: "bitacora",
    payload: {
      motivo: "No cumplió los requisitos del catálogo",
    },
  });

  return NextResponse.json({ ok: true });
}
