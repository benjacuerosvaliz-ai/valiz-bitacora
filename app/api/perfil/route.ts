import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/perfil
 * Body: { display_name, country, city, bio, marketing_optin }
 *
 * Actualiza los campos editables del propio user_profile. Limpia strings
 * vacíos a null para que las queries puedan distinguir "vacío" de "set".
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const cleanString = (v: unknown, max = 280): string | null => {
    if (v == null) return null;
    const s = String(v).trim().slice(0, max);
    return s.length > 0 ? s : null;
  };

  const update = {
    display_name: cleanString(body?.display_name, 60),
    country: cleanString(body?.country, 60),
    city: cleanString(body?.city, 80),
    bio: cleanString(body?.bio, 280),
    marketing_optin: Boolean(body?.marketing_optin),
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
