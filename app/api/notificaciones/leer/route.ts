import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/notificaciones/leer
 *
 * Body opcional: `{ id?: string }`. Si `id` viene, marca solo esa
 * notif como leída; si no, marca TODAS las del user como leídas.
 *
 * RLS garantiza que solo se afecten notifs propias (el user solo puede
 * UPDATE las suyas según la policy).
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // sin body: marca todas
  }

  try {
    const now = new Date().toISOString();
    let query = sb
      .from("notificaciones")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (body.id) {
      query = query.eq("id", body.id);
    }
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notif leer] error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
