import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/concursos/postular
 * Body: { concurso_id, bitacora_id }
 *
 * Postula una bitácora del user al concurso indicado. Requiere:
 *  - Sesión válida.
 *  - La bitácora pertenece al user.
 *  - El concurso está vigente (now() entre inicia_at y termina_at).
 *  - No hay participación duplicada (unique en DB).
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const concursoId = String(body?.concurso_id ?? "").trim();
  const bitacoraId = String(body?.bitacora_id ?? "").trim();
  if (!concursoId || !bitacoraId) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validar concurso vigente
  const { data: concurso } = await admin
    .from("concursos")
    .select("id, inicia_at, termina_at")
    .eq("id", concursoId)
    .maybeSingle();
  if (!concurso) {
    return NextResponse.json({ error: "Concurso no existe." }, { status: 404 });
  }
  const now = Date.now();
  if (
    new Date(concurso.inicia_at).getTime() > now ||
    new Date(concurso.termina_at).getTime() < now
  ) {
    return NextResponse.json(
      { error: "El concurso no está vigente." },
      { status: 400 },
    );
  }

  // Validar bitácora del user
  const { data: bit } = await admin
    .from("bitacora_entries")
    .select("id, user_id, invalidated")
    .eq("id", bitacoraId)
    .maybeSingle();
  if (!bit || bit.user_id !== user.id || bit.invalidated) {
    return NextResponse.json(
      { error: "Bitácora no válida." },
      { status: 400 },
    );
  }

  // Insertar (unique constraint maneja duplicado)
  const { error } = await admin.from("concurso_participaciones").insert({
    concurso_id: concursoId,
    user_id: user.id,
    bitacora_id: bitacoraId,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Esta bitácora ya está postulada al concurso." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
