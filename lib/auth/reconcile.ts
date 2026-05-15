import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reglas de puntos (Fase 1):
 *   • 5 pts por cada $1.000 CLP gastados.
 *   • +1.000 pts una sola vez al registrarte (bono bienvenida).
 *   • +500 pts la primera vez que tienes una pieza de cada familia distinta.
 *   • +200 pts por cada bitácora comprobable (max 1/pieza/mes — se aplica en
 *     el endpoint de subida de bitácora, no acá).
 *
 * 1 pt = $1 CLP al canjear.
 */
export const PUNTOS_RULES = {
  POR_MIL_CLP: 5,
  BONO_BIENVENIDA: 1000,
  BONO_FAMILIA_NUEVA: 500,
  POR_BITACORA: 200,
} as const;

/**
 * Crea el user_profile si no existe, otorga bono de bienvenida y dispara
 * la reconciliación retroactiva del email primary.
 */
export async function ensureProfileAndReconcile(args: {
  userId: string;
  email: string;
}): Promise<{ created: boolean }> {
  const sb = createAdminClient();
  const email = args.email.toLowerCase().trim();

  const { data: existing } = await sb
    .from("user_profiles")
    .select("id")
    .eq("id", args.userId)
    .maybeSingle();

  let created = false;
  if (!existing) {
    const { error } = await sb.from("user_profiles").insert({
      id: args.userId,
      email,
    });
    if (error) throw error;
    created = true;
  }

  if (!created) return { created };

  // Bono bienvenida (idempotente)
  await insertIfMissing(
    sb,
    args.userId,
    "bono_bienvenida",
    null,
    PUNTOS_RULES.BONO_BIENVENIDA,
  );

  // Reconciliación del email primary
  await reconcileBonusesForEmail(args.userId, email);

  return { created };
}

/**
 * Reconciliación de bonos para un email específico. Reusable cuando se
 * agrega un email alternativo: aplica puntos por compras pasadas + bono
 * por familia nueva. Idempotente — no duplica movimientos ya registrados.
 *
 * Devuelve cuántos puntos nuevos se otorgaron en esta corrida.
 */
export async function reconcileBonusesForEmail(
  userId: string,
  email: string,
): Promise<{ ptsOtorgados: number; ordersMatched: number }> {
  const sb = createAdminClient();
  const emailLc = email.toLowerCase().trim();

  const { data: orders } = await sb
    .from("orders")
    .select("name, total_clp, financial_status, order_items(sku)")
    .eq("email", emailLc);

  let ptsOtorgados = 0;
  const ordersMatched = orders?.length ?? 0;

  if (!orders || orders.length === 0) {
    return { ptsOtorgados, ordersMatched };
  }

  // Puntos por compras
  for (const o of orders) {
    if (
      o.financial_status !== "paid" &&
      o.financial_status !== "partially_refunded"
    )
      continue;
    const monto = Number(o.total_clp ?? 0);
    const pts = Math.floor((monto / 1000) * PUNTOS_RULES.POR_MIL_CLP);
    if (pts <= 0) continue;
    const inserted = await insertIfMissing(
      sb,
      userId,
      "compra_shopify",
      o.name,
      pts,
    );
    if (inserted) ptsOtorgados += pts;
  }

  // Bono por familia distinta
  const skus = [
    ...new Set(
      orders
        .flatMap((o) =>
          (o.order_items ?? []).map((i: { sku: string }) => i.sku),
        )
        .filter(Boolean),
    ),
  ];
  if (skus.length > 0) {
    const { data: prods } = await sb
      .from("productos")
      .select("sku, familia_id, familias(slug)")
      .in("sku", skus);
    const familiasUnicas = new Set<string>();
    for (const p of prods ?? []) {
      const fam = p.familias as
        | { slug?: string }
        | { slug: string }[]
        | null;
      const slug = Array.isArray(fam) ? fam[0]?.slug : fam?.slug;
      if (slug) familiasUnicas.add(slug);
    }
    for (const slug of familiasUnicas) {
      const inserted = await insertIfMissing(
        sb,
        userId,
        "bono_familia_nueva",
        slug,
        PUNTOS_RULES.BONO_FAMILIA_NUEVA,
      );
      if (inserted) ptsOtorgados += PUNTOS_RULES.BONO_FAMILIA_NUEVA;
    }
  }

  return { ptsOtorgados, ordersMatched };
}

/**
 * Inserta un movimiento de puntos solo si no existe ya un registro con el
 * mismo (user_id, motivo, referencia_id). Garantiza idempotencia.
 *
 * Devuelve true si insertó (movimiento nuevo), false si ya existía.
 */
async function insertIfMissing(
  sb: ReturnType<typeof createAdminClient>,
  userId: string,
  motivo: string,
  referenciaId: string | null,
  delta: number,
): Promise<boolean> {
  const q = sb
    .from("puntos_movimientos")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("motivo", motivo);
  const { count } = referenciaId
    ? await q.eq("referencia_id", referenciaId)
    : await q.is("referencia_id", null);
  if ((count ?? 0) > 0) return false;

  await sb.from("puntos_movimientos").insert({
    user_id: userId,
    motivo,
    referencia_id: referenciaId,
    delta,
  });
  return true;
}
