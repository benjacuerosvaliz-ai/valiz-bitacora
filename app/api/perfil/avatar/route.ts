import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { evaluarPerfilCompleto } from "@/lib/auth/misiones";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/perfil/avatar
 * multipart/form-data: file
 *
 * Sube la imagen a `avatars/{user_id}/{uuid}.{ext}` y actualiza
 * user_profiles.avatar_url con la URL pública. Si había un avatar
 * previo, lo borra del storage para no acumular basura.
 *
 * Límite: 5MB. Acepta image/jpeg, image/png, image/webp.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "formato_no_soportado" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "archivo_muy_grande" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = EXT_BY_MIME[file.type] ?? "jpg";
  const fileName = `${randomUUID()}.${ext}`;
  const path = `${user.id}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: publicUrlData } = admin.storage
    .from("avatars")
    .getPublicUrl(path);
  const publicUrl = publicUrlData.publicUrl;

  // Borrar avatar anterior si existía
  const { data: prev } = await admin
    .from("user_profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const prevUrl = (prev?.avatar_url ?? null) as string | null;
  if (prevUrl) {
    const oldPath = prevUrl.split("/avatars/")[1];
    if (oldPath) {
      await admin.storage.from("avatars").remove([oldPath]).catch(() => {});
    }
  }

  // Actualizar perfil
  const { error: dbErr } = await admin
    .from("user_profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Misión "perfil completo" — fire-and-forget, idempotente.
  evaluarPerfilCompleto(user.id).catch((e) =>
    console.error("[avatar] evaluarPerfilCompleto", e),
  );

  return NextResponse.json({ ok: true, url: publicUrl });
}

/**
 * DELETE /api/perfil/avatar — quitar avatar actual.
 */
export async function DELETE() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const admin = createAdminClient();
  const { data: prev } = await admin
    .from("user_profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const prevUrl = (prev?.avatar_url ?? null) as string | null;
  if (prevUrl) {
    const oldPath = prevUrl.split("/avatars/")[1];
    if (oldPath) {
      await admin.storage.from("avatars").remove([oldPath]).catch(() => {});
    }
  }
  await admin
    .from("user_profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
