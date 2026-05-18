import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tipos de notificación que la app puede emitir. Sincronizado con el
 * enum `notif_type` en la migración 20260518100000.
 */
export type NotifType =
  | "bitacora_reaccion"
  | "compra_validada"
  | "referido_pts"
  | "concurso_ganador"
  | "bitacora_invalidada"
  | "sistema";

export type NotifInsert = {
  userId: string;
  type: NotifType;
  /** ID de la entidad asociada (bitácora, order, etc). Opcional. */
  refId?: string | null;
  /** Tipo de entidad (ej "bitacora", "order", "concurso"). Opcional. */
  refType?: string | null;
  /** Datos adicionales (snapshot, mensaje pre-formateado, etc). */
  payload?: Record<string, unknown>;
};

/**
 * Inserta una notificación. Fire-and-forget: si la tabla aún no existe
 * o el insert falla, lo logueamos pero NO rompemos el flujo del caller.
 *
 * No autoseteamos un usuario contra sí mismo (caso reacción a su propia
 * bitácora) — eso lo decide cada caller, no este helper.
 */
export async function notify(args: NotifInsert): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notificaciones").insert({
      user_id: args.userId,
      type: args.type,
      ref_id: args.refId ?? null,
      ref_type: args.refType ?? null,
      payload: args.payload ?? {},
    });
    if (error) {
      console.error("[notify] insert error", error);
    }
  } catch (e) {
    console.error("[notify] fail", e);
  }
}

/**
 * Versión "una vez": no inserta si ya existe una notif del mismo
 * (user_id, type, ref_id) sin leer todavía. Útil para eventos que
 * pueden dispararse múltiples veces pero queremos una sola notif
 * pendiente (ej. múltiples reacciones a la misma bitácora del mismo
 * fan dentro de poco tiempo — aunque idealmente eso se evita por DB
 * unique).
 */
export async function notifyOnce(args: NotifInsert): Promise<void> {
  try {
    const admin = createAdminClient();
    if (args.refId) {
      const { count } = await admin
        .from("notificaciones")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", args.userId)
        .eq("type", args.type)
        .eq("ref_id", args.refId)
        .is("read_at", null);
      if ((count ?? 0) > 0) return;
    }
    await notify(args);
  } catch (e) {
    console.error("[notifyOnce] fail", e);
  }
}
