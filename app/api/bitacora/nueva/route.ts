import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const PUNTOS_BITACORA = 200;
const TEXTO_MIN = 30;

/**
 * POST /api/bitacora/nueva
 * multipart/form-data: file, sku, lugar, texto, lat?, lng?
 *
 * Sube la foto a Supabase Storage bajo `{user_id}/{uuid}.{ext}`. Inserta
 * bitacora_entries. Si califica (foto + lat/lng + texto >= 30 chars) Y es
 * la primera del mes para esa pieza, otorga 200 pts.
 *
 * Validación SKU: tiene que estar en el equipaje del user (orders por
 * email match o compras_manuales). Si no, 403.
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

  const file = form.get("file");
  const sku = String(form.get("sku") ?? "").trim();
  const lugar = String(form.get("lugar") ?? "").trim() || null;
  const texto = String(form.get("texto") ?? "").trim();
  const latStr = form.get("lat");
  const lngStr = form.get("lng");
  const lat = latStr ? Number(latStr) : null;
  const lng = lngStr ? Number(lngStr) : null;

  if (!sku) return NextResponse.json({ error: "Falta sku." }, { status: 400 });
  if (!texto) return NextResponse.json({ error: "Falta texto." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Falta foto." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Foto muy pesada (max 8 MB)." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verificar que el SKU está en el equipaje del user
  const { data: equipajeMatch } = await admin
    .from("user_equipaje")
    .select("sku")
    .eq("user_id", user.id)
    .eq("sku", sku)
    .limit(1);
  if (!equipajeMatch || equipajeMatch.length === 0) {
    return NextResponse.json(
      { error: "Esta pieza no está en tu equipaje." },
      { status: 403 },
    );
  }

  // Subir foto a Storage
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `${user.id}/${randomUUID()}.${ext}`;
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

  // Decidir puntos: foto + geo + texto >= 30 chars + primera del mes
  const calificaPorContenido = !!fotoUrl && lat !== null && lng !== null && texto.length >= TEXTO_MIN;
  let pointsAwarded = 0;

  if (calificaPorContenido) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count } = await admin
      .from("bitacora_entries")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", user.id)
      .eq("sku", sku)
      .eq("invalidated", false)
      .gt("points_awarded", 0)
      .gte("created_at", startOfMonth.toISOString());

    if ((count ?? 0) === 0) pointsAwarded = PUNTOS_BITACORA;
  }

  const { data: inserted, error: insertError } = await admin
    .from("bitacora_entries")
    .insert({
      user_id: user.id,
      sku,
      foto_url: fotoUrl,
      lat,
      lng,
      lugar,
      texto,
      points_awarded: pointsAwarded,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    // Cleanup foto si insert falló
    await admin.storage.from("bitacora-fotos").remove([filename]);
    return NextResponse.json(
      { error: insertError?.message ?? "no_insert" },
      { status: 500 },
    );
  }

  // Si hubo puntos, registrar en ledger
  if (pointsAwarded > 0) {
    await admin.from("puntos_movimientos").insert({
      user_id: user.id,
      delta: pointsAwarded,
      motivo: "bitacora",
      referencia_id: inserted.id,
    });
  }

  return NextResponse.json({
    ok: true,
    bitacora_id: inserted.id,
    points_awarded: pointsAwarded,
  });
}
