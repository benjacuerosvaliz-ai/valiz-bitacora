import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Carga los contadores de reacciones para un set de bitácoras.
 *
 * Si la migración 20260518000000 aún no fue aplicada, la view no existe
 * y el query falla — devolvemos un Map vacío en vez de romper la página.
 */
export async function getReactionCounts(
  bitacoraIds: string[],
): Promise<Map<string, number>> {
  if (bitacoraIds.length === 0) return new Map();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("bitacora_reaccion_counts")
      .select("bitacora_id, count")
      .in("bitacora_id", bitacoraIds);
    if (error) return new Map();
    return new Map(
      ((data ?? []) as { bitacora_id: string; count: number }[]).map((r) => [
        r.bitacora_id,
        Number(r.count),
      ]),
    );
  } catch {
    return new Map();
  }
}

/**
 * Carga las bitácoras que un usuario ya reaccionó, dado un set candidato.
 *
 * Devuelve un Set<bitacora_id>. Mismo trato seguro si la tabla aún no
 * existe.
 */
export async function getUserReactedSet(
  userId: string | null,
  bitacoraIds: string[],
): Promise<Set<string>> {
  if (!userId || bitacoraIds.length === 0) return new Set();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("bitacora_reacciones")
      .select("bitacora_id")
      .eq("user_id", userId)
      .in("bitacora_id", bitacoraIds);
    if (error) return new Set();
    return new Set(
      ((data ?? []) as { bitacora_id: string }[]).map((r) => r.bitacora_id),
    );
  } catch {
    return new Set();
  }
}
