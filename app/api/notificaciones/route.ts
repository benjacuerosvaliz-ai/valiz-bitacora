import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notificaciones
 *
 * Lista las últimas 30 notificaciones del user actual, ordenadas por
 * `created_at` desc. Devuelve también el count de no leídas para el
 * badge del bell.
 *
 * Tolera ausencia de tabla (devuelve listas vacías) para que el bell
 * funcione antes de aplicar la migración.
 */
export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 });

  try {
    const [itemsRes, unreadRes] = await Promise.all([
      sb
        .from("notificaciones")
        .select("id, type, ref_id, ref_type, payload, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      sb
        .from("notificaciones")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    if (itemsRes.error) throw itemsRes.error;
    return NextResponse.json({
      items: itemsRes.data ?? [],
      unread: unreadRes.count ?? 0,
    });
  } catch {
    return NextResponse.json({ items: [], unread: 0 });
  }
}
