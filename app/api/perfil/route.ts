import { NextResponse, type NextRequest } from "next/server";

import { evaluarPerfilCompleto } from "@/lib/auth/misiones";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/perfil
 * Body: { display_name, country, city, bio, instagram_handle,
 *         tiktok_handle }
 *
 * Actualiza los campos editables del propio user_profile. Limpia strings
 * vacíos a null. Sanitiza handles de IG/TikTok (quita @, URL completa,
 * trailing slash). marketing_optin se asume true por default — al
 * registrarse aceptan recibir comunicaciones; no exponemos toggle.
 */
function cleanString(v: unknown, max = 280): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s.length > 0 ? s : null;
}

function cleanHandle(v: unknown): string | null {
  const s = cleanString(v, 60);
  if (!s) return null;
  return s
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .split(/[?#]/)[0];
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);

  const update = {
    display_name: cleanString(body?.display_name, 60),
    country: cleanString(body?.country, 60),
    city: cleanString(body?.city, 80),
    bio: cleanString(body?.bio, 280),
    instagram_handle: cleanHandle(body?.instagram_handle),
    tiktok_handle: cleanHandle(body?.tiktok_handle),
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Misión "perfil completo" — fire-and-forget, idempotente.
  evaluarPerfilCompleto(user.id).catch((e) =>
    console.error("[perfil] evaluarPerfilCompleto", e),
  );

  return NextResponse.json({ ok: true });
}
