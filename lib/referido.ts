import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Devuelve el código de referido asignado a un user.
 * Si NO tiene uno y `autoAsignar` es true, toma uno del pool y se lo
 * asigna (lazy). Si el pool está vacío o falla, devuelve null.
 *
 * Diseñado para uso server-side desde páginas que quieren mostrar
 * "compartí este código para 5% off". El pool se sigue manejando con
 * el script cargar_codigos_referido.py.
 */
export async function getOrAssignReferidoCode(
  userId: string,
  autoAsignar = false,
): Promise<string | null> {
  try {
    const admin = createAdminClient();

    // ¿Ya tiene?
    const { data: existente } = await admin
      .from("codigos_referido")
      .select("code")
      .eq("assigned_to_user_id", userId)
      .maybeSingle();
    if (existente?.code) return existente.code;

    if (!autoAsignar) return null;

    // Asignación lazy desde el pool
    const { data: libre } = await admin
      .from("codigos_referido")
      .select("id, code")
      .is("assigned_to_user_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!libre) return null;

    const { error } = await admin
      .from("codigos_referido")
      .update({
        assigned_to_user_id: userId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", libre.id)
      .is("assigned_to_user_id", null);
    if (error) return null;

    return libre.code;
  } catch {
    return null;
  }
}
