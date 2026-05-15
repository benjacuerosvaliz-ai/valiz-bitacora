import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/compras/manual
 * Body: { familia_slug, color_valiz, lugar_compra, fecha_compra, descripcion }
 *
 * Crea una entrada en compras_manuales para el usuario logueado.
 * Si familia + color matchean un SKU activo en `productos`, lo guarda en
 * el campo sku para que el equipaje use el SKU canónico. Si no, queda
 * solo como referencia textual (no aparece en user_equipaje pero sí en
 * compras_manuales para que el admin valide).
 *
 * verified=false por default — el admin valida y entonces se otorgan los
 * puntos retroactivos vía el endpoint admin (no acá).
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const familiaSlug = String(body?.familia_slug ?? "").trim();
  const colorValiz = body?.color_valiz ? String(body.color_valiz).trim() : null;
  const lugar = body?.lugar_compra ? String(body.lugar_compra).trim() : null;
  const fecha = body?.fecha_compra ? String(body.fecha_compra).trim() : null;
  const descripcion = body?.descripcion ? String(body.descripcion).trim() : null;

  if (!familiaSlug) {
    return NextResponse.json({ error: "Falta la familia." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Intentar matchear SKU exacto: familia + color
  let matchedSku: string | null = null;
  if (colorValiz) {
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
  }

  const { error } = await admin.from("compras_manuales").insert({
    user_id: user.id,
    sku: matchedSku,
    familia_slug: familiaSlug,
    color_valiz: colorValiz,
    lugar_compra: lugar,
    fecha_compra: fecha,
    descripcion,
    verified: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, matched_sku: matchedSku });
}
