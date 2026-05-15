import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/bitacora/[id]
 *
 * Borra una bitácora propia: row de bitacora_entries + foto del Storage +
 * revierte los puntos otorgados si tenía. Solo el dueño puede borrar.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: bit, error: fetchErr } = await admin
    .from("bitacora_entries")
    .select("id, user_id, foto_url, points_awarded")
    .eq("id", id)
    .single();
  if (fetchErr || !bit) {
    return NextResponse.json({ error: "no_encontrada" }, { status: 404 });
  }
  if (bit.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Extraer path de Storage desde la URL pública
  // URL formato: https://{ref}.supabase.co/storage/v1/object/public/bitacora-fotos/{path}
  const fotoPath = bit.foto_url.split("/bitacora-fotos/")[1] ?? null;

  // Revertir puntos si tenía
  if (bit.points_awarded > 0) {
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

  // Borrar row
  await admin.from("bitacora_entries").delete().eq("id", id);

  // Borrar foto (no fatal si falla)
  if (fotoPath) {
    await admin.storage.from("bitacora-fotos").remove([fotoPath]);
  }

  return NextResponse.json({ ok: true });
}
