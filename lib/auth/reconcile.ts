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
 * Crea el user_profile si no existe y detona la reconciliación retroactiva:
 *   - Busca orders por email match.
 *   - Otorga puntos por compras pasadas (5 por cada $1.000 gastados).
 *   - Otorga bono bienvenida (una sola vez).
 *   - Otorga bono "familia nueva" por cada familia distinta presente en el
 *     equipaje retroactivo.
 *
 * Idempotente: si el user ya existe y ya tiene esos movimientos registrados
 * (via referencia_id + motivo), no los duplica.
 */
export async function ensureProfileAndReconcile(args: {
  userId: string;
  email: string;
}): Promise<{ created: boolean }> {
  const sb = createAdminClient();
  const email = args.email.toLowerCase().trim();

  // 1. Crear o actualizar user_profile
  const { data: existing } = await sb
    .from("user_profiles")
    .select("id, email, welcomed_at")
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

  // 2. Reconciliación retroactiva — solo si recién creado, para no
  // recalcular en cada login.
  if (!created) return { created };

  // 2a. Bono bienvenida (idempotente vía unique combo motivo + user)
  await insertIfMissing(sb, args.userId, "bono_bienvenida", null, PUNTOS_RULES.BONO_BIENVENIDA);

  // 2b. Orders del email — calcular puntos retroactivos por gasto
  const { data: orders } = await sb
    .from("orders")
    .select("name, total_clp, financial_status, order_items(sku)")
    .eq("email", email);

  if (orders) {
    for (const o of orders) {
      // Solo orders pagadas suman puntos
      if (o.financial_status !== "paid" && o.financial_status !== "partially_refunded") continue;
      const monto = Number(o.total_clp ?? 0);
      const pts = Math.floor((monto / 1000) * PUNTOS_RULES.POR_MIL_CLP);
      if (pts <= 0) continue;
      await insertIfMissing(sb, args.userId, "compra_shopify", o.name, pts);
    }

    // 2c. Bono por cada familia distinta presente — necesito mapear SKUs a familia
    const skus = [...new Set(
      orders.flatMap((o) => (o.order_items ?? []).map((i: { sku: string }) => i.sku).filter(Boolean))
    )];
    if (skus.length > 0) {
      const { data: prods } = await sb
        .from("productos")
        .select("sku, familia_id, familias(slug)")
        .in("sku", skus);
      const familiasUnicas = new Set<string>();
      for (const p of prods ?? []) {
        const fam = p.familias as { slug?: string } | { slug: string }[] | null;
        const slug = Array.isArray(fam) ? fam[0]?.slug : fam?.slug;
        if (slug) familiasUnicas.add(slug);
      }
      for (const slug of familiasUnicas) {
        await insertIfMissing(sb, args.userId, "bono_familia_nueva", slug, PUNTOS_RULES.BONO_FAMILIA_NUEVA);
      }
    }
  }

  return { created };
}

/**
 * Inserta un movimiento de puntos solo si no existe ya un registro con el
 * mismo (user_id, motivo, referencia_id). Garantiza idempotencia.
 */
async function insertIfMissing(
  sb: ReturnType<typeof createAdminClient>,
  userId: string,
  motivo: string,
  referenciaId: string | null,
  delta: number,
) {
  const q = sb
    .from("puntos_movimientos")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("motivo", motivo);
  const { count } = referenciaId
    ? await q.eq("referencia_id", referenciaId)
    : await q.is("referencia_id", null);
  if ((count ?? 0) > 0) return;

  await sb.from("puntos_movimientos").insert({
    user_id: userId,
    motivo,
    referencia_id: referenciaId,
    delta,
  });
}
