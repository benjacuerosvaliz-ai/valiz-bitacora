import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/bitacora/[id]/reaccionar
 *
 * Toggle: si el user ya reaccionó, borra; si no, inserta.
 * Devuelve `{ reacted: boolean, count: number }`.
 *
 * Idempotente desde el punto de vista del estado final.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Verificar que la bitácora existe y no está invalidada
  const { data: bit } = await admin
    .from("bitacora_entries")
    .select("id, invalidated")
    .eq("id", id)
    .maybeSingle();
  if (!bit || bit.invalidated) {
    return NextResponse.json({ error: "no_encontrada" }, { status: 404 });
  }

  // Toggle
  const { data: existing } = await admin
    .from("bitacora_reacciones")
    .select("bitacora_id", { head: false })
    .eq("bitacora_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  let reacted: boolean;
  if (existing) {
    await admin
      .from("bitacora_reacciones")
      .delete()
      .eq("bitacora_id", id)
      .eq("user_id", user.id);
    reacted = false;
  } else {
    await admin
      .from("bitacora_reacciones")
      .insert({ bitacora_id: id, user_id: user.id });
    reacted = true;
  }

  // Contar actuales
  const { count } = await admin
    .from("bitacora_reacciones")
    .select("bitacora_id", { count: "exact", head: true })
    .eq("bitacora_id", id);

  return NextResponse.json({ reacted, count: count ?? 0 });
}
