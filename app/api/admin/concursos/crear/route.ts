import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/concursos/crear
 * Body: { slug, titulo, descripcion, premio_descripcion, inicia_at, termina_at }
 *
 * Admin only. Crea un concurso nuevo.
 */
function clean(v: unknown, max = 280): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s.length > 0 ? s : null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_session" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "no_admin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const titulo = clean(body?.titulo, 120);
  if (!titulo)
    return NextResponse.json({ error: "Falta el título." }, { status: 400 });
  const descripcion = clean(body?.descripcion, 1000);
  const premio = clean(body?.premio_descripcion, 280);
  const inicia = clean(body?.inicia_at, 30);
  const termina = clean(body?.termina_at, 30);
  if (!inicia || !termina)
    return NextResponse.json(
      { error: "Faltan fechas inicia/termina." },
      { status: 400 },
    );

  const slug = clean(body?.slug, 80) || slugify(titulo);
  if (!slug)
    return NextResponse.json(
      { error: "Slug inválido — usa letras y números." },
      { status: 400 },
    );

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("concursos")
    .insert({
      slug,
      titulo,
      descripcion,
      premio_descripcion: premio,
      inicia_at: inicia,
      termina_at: termina,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un concurso con ese slug." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}
