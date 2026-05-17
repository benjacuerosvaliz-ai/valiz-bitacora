import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/yo/referido/asignar
 *
 * Asigna un código de referido del pool al user actual. Si ya tiene
 * uno, retorna el mismo (idempotente). Si el pool está vacío, retorna
 * 404 con mensaje al user.
 */
export async function POST() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const admin = createAdminClient();

  // ¿Ya tiene uno?
  const { data: existente } = await admin
    .from("codigos_referido")
    .select("code")
    .eq("assigned_to_user_id", user.id)
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ ok: true, code: existente.code });
  }

  // Tomar uno del pool
  const { data: libre } = await admin
    .from("codigos_referido")
    .select("id, code")
    .is("assigned_to_user_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!libre) {
    return NextResponse.json(
      {
        error:
          "No hay códigos disponibles en el pool. Avisa al admin para cargar más.",
      },
      { status: 404 },
    );
  }

  // Reservar atomicamente: update donde id = X AND assigned IS NULL
  const { data: claim, error } = await admin
    .from("codigos_referido")
    .update({
      assigned_to_user_id: user.id,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", libre.id)
    .is("assigned_to_user_id", null)
    .select("code")
    .maybeSingle();

  if (error || !claim) {
    // Race condition o error
    return NextResponse.json(
      { error: "No se pudo asignar el código, intenta de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, code: claim.code });
}
