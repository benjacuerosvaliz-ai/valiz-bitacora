import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/compras/manual
 * multipart/form-data: familia_slug, color_valiz, lugar_compra,
 *                      fecha_compra, file (foto obligatoria)
 *
 * Crea una entrada en compras_manuales para el usuario logueado, con foto
 * obligatoria para que admin pueda validar visualmente.
 *
 * Si familia + color matchean un SKU activo en `productos`, lo guarda en
 * el campo sku para que el equipaje use el SKU canónico (y se muestre la
 * foto del PNG limpio). Si no, queda con la foto subida.
 *
 * verified=false por default. Admin valida en /admin.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "form_invalido" }, { status: 400 });
  }

  const familiaSlug = String(form.get("familia_slug") ?? "").trim();
  const colorValiz = String(form.get("color_valiz") ?? "").trim();
  const lugar = String(form.get("lugar_compra") ?? "").trim();
  const fecha = String(form.get("fecha_compra") ?? "").trim();
  const file = form.get("file");

  if (!familiaSlug)
    return NextResponse.json({ error: "Falta la familia." }, { status: 400 });
  if (!colorValiz)
    return NextResponse.json({ error: "Falta el color." }, { status: 400 });
  if (!lugar)
    return NextResponse.json({ error: "Falta el lugar." }, { status: 400 });
  if (!fecha)
    return NextResponse.json({ error: "Falta la fecha." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "Falta la foto." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "Foto muy pesada (max 8 MB)." }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });

  const admin = createAdminClient();

  // Match SKU exacto (familia + color con ilike)
  let matchedSku: string | null = null;
  const { data: famRow } = await admin
    .from("familias")
    .select("id")
    .eq("slug", familiaSlug)
    .maybeSingle();
  if (famRow) {
    const { data: prodRow } = await admin
      .from("productos")
      .select("sku")
      .eq("familia_id", famRow.id)
      .ilike("color_valiz", colorValiz)
      .eq("status", "active")
      .maybeSingle();
    if (prodRow) matchedSku = prodRow.sku;
  }

  // Subir foto a Storage. Reuso el bucket bitacora-fotos con prefijo
  // manual/ para distinguir. El bucket es público.
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `${user.id}/manual-${randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("bitacora-fotos")
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: `No se pudo subir la foto: ${uploadError.message}` },
      { status: 500 },
    );
  }
  const { data: pub } = admin.storage.from("bitacora-fotos").getPublicUrl(filename);
  const fotoUrl = pub.publicUrl;

  const { error } = await admin.from("compras_manuales").insert({
    user_id: user.id,
    sku: matchedSku,
    familia_slug: familiaSlug,
    color_valiz: colorValiz,
    lugar_compra: lugar,
    fecha_compra: fecha,
    foto_url: fotoUrl,
    verified: false,
  });

  if (error) {
    // cleanup foto si insert falla
    await admin.storage.from("bitacora-fotos").remove([filename]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, matched_sku: matchedSku });
}
