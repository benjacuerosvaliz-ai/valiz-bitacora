import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/welcomed
 * Marca welcomed_at = now() en user_profiles, para no volver a mostrar el
 * modal de bienvenida en próximos logins.
 */
export async function POST() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("user_profiles")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
