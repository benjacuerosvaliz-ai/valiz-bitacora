import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/concursos/ganador
 * Body: { concurso_id, bitacora_id }
 *
 * Admin only. Marca al ganador de un concurso. La bitácora_id tiene que
 * pertenecer a las participaciones del concurso.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "no_admin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const concursoId = String(body?.concurso_id ?? "").trim();
  const bitacoraId = String(body?.bitacora_id ?? "").trim();
  if (!concursoId || !bitacoraId)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const admin = createAdminClient();

  // Verificar que la bitácora está postulada al concurso
  const { data: part } = await admin
    .from("concurso_participaciones")
    .select("user_id, bitacora_id")
    .eq("concurso_id", concursoId)
    .eq("bitacora_id", bitacoraId)
    .maybeSingle();
  if (!part) {
    return NextResponse.json(
      { error: "Esa bitácora no está postulada al concurso." },
      { status: 400 },
    );
  }

  const { error } = await admin
    .from("concursos")
    .update({
      ganador_user_id: part.user_id,
      ganador_bitacora_id: bitacoraId,
      ganador_anunciado_at: new Date().toISOString(),
    })
    .eq("id", concursoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
