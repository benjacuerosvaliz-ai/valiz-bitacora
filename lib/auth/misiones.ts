/**
 * Misiones de bienvenida: cada una da +$1.000 una sola vez por user.
 *
 * Las misiones se almacenan en puntos_movimientos con:
 *   motivo        = 'mision'
 *   referencia_id = <misionId>   (ver MISIONES más abajo)
 *
 * La idempotencia está garantizada por la unicidad de (user_id, motivo,
 * referencia_id) — si ya existe, no se inserta de nuevo.
 *
 * Caller responsibility: cada endpoint que potencialmente dispara una
 * misión debe llamar `otorgarMision()` después de su escritura principal.
 * Es fire-and-forget: si la misión falla, no rompe el flujo del caller.
 */

import { createAdminClient } from "@/lib/supabase/admin";

import { PUNTOS_RULES } from "./reconcile";

/** Catálogo de misiones (IDs estables — no cambiar). */
export const MISIONES = {
  PERFIL_COMPLETO: "perfil_completo",
  PRIMERA_BITACORA: "primera_bitacora",
  PRESENTAR_EQUIPAJE: "presentar_equipaje",
  PRIMER_CANJE: "primer_canje",
  /**
   * Amigo invitado: la referencia_id es `amigo_invitado:<friend_user_id>`
   * — una por amigo invitado, sin tope.
   */
  AMIGO_INVITADO_PREFIX: "amigo_invitado:",
} as const;

export type MisionId = (typeof MISIONES)[keyof typeof MISIONES] | string;

/**
 * Otorga una misión a un user si no la tiene ya. Devuelve true si insertó
 * (misión nueva), false si era idempotente. Nunca lanza — si falla, lo
 * loguea y devuelve false.
 */
export async function otorgarMision(
  userId: string,
  misionId: string,
): Promise<boolean> {
  if (!userId || !misionId) return false;
  const admin = createAdminClient();
  try {
    const { count } = await admin
      .from("puntos_movimientos")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId)
      .eq("motivo", "mision")
      .eq("referencia_id", misionId);
    if ((count ?? 0) > 0) return false;

    const { error } = await admin.from("puntos_movimientos").insert({
      user_id: userId,
      delta: PUNTOS_RULES.MISION_AMOUNT,
      motivo: "mision",
      referencia_id: misionId,
    });
    if (error) {
      console.error("[mision] insert error", misionId, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mision] unexpected", misionId, e);
    return false;
  }
}

/**
 * Considera "perfil completo" si tiene los 3 campos básicos:
 *   • avatar_url (subió foto)
 *   • city (puso ciudad)
 *   • instagram_handle O tiktok_handle (al menos una red)
 *
 * Llamar después de cualquier mutación de user_profiles. Idempotente.
 */
export async function evaluarPerfilCompleto(userId: string): Promise<boolean> {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("avatar_url, city, instagram_handle, tiktok_handle")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return false;
  const tieneFoto = !!data.avatar_url;
  const tieneCiudad = !!data.city;
  const tieneRed = !!data.instagram_handle || !!data.tiktok_handle;
  if (!(tieneFoto && tieneCiudad && tieneRed)) return false;
  return otorgarMision(userId, MISIONES.PERFIL_COMPLETO);
}
