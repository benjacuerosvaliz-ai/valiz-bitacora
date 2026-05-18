import { NextResponse, type NextRequest } from "next/server";

import { EMAIL_FROM, getResend } from "@/lib/email/client";
import { tplDigestSemanal } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/digest
 *
 * Endpoint disparado por Vercel Cron cada lunes 9am Chile (13:00 UTC).
 * Manda el resumen semanal a cada user con welcomed_at NOT NULL.
 *
 * Autenticación: requiere header `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron envía este header automáticamente cuando hay `CRON_SECRET`
 * en las env vars del proyecto.
 *
 * Idempotente: si se ejecuta dos veces el mismo día, manda el mismo
 * resumen (no usamos dedup — el cron es una sola vez por semana en
 * producción y los duplicados accidentales son aceptables).
 *
 * Tolera fallos por destinatario: si Resend falla para uno, sigue con
 * el siguiente.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_N_BITACORAS = 5;

export async function GET(request: NextRequest) {
  // Auth: Vercel cron + manual trigger via curl autenticado
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en env" },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  const admin = createAdminClient();
  const since = new Date(Date.now() - WEEK_MS).toISOString();

  // Bitácoras de la semana (con sus relaciones)
  const { data: bitsRaw } = await admin
    .from("bitacora_entries")
    .select("id, user_id, sku, foto_url, lugar, texto, created_at")
    .eq("invalidated", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  const bits = (bitsRaw ?? []) as {
    id: string;
    user_id: string;
    sku: string | null;
    foto_url: string;
    lugar: string | null;
    texto: string | null;
    created_at: string;
  }[];

  // Reacciones por bitácora (si la tabla existe). Si no, todas en 0.
  const bitIds = bits.map((b) => b.id);
  let reactionsByBit = new Map<string, number>();
  if (bitIds.length > 0) {
    try {
      const { data } = await admin
        .from("bitacora_reaccion_counts")
        .select("bitacora_id, count")
        .in("bitacora_id", bitIds);
      reactionsByBit = new Map(
        ((data ?? []) as { bitacora_id: string; count: number }[]).map((r) => [
          r.bitacora_id,
          Number(r.count),
        ]),
      );
    } catch {
      // tabla no existe — ignoramos
    }
  }

  // Top N: por reacciones desc, fallback created_at desc
  const ranked = [...bits].sort((a, b) => {
    const ra = reactionsByBit.get(a.id) ?? 0;
    const rb = reactionsByBit.get(b.id) ?? 0;
    if (ra !== rb) return rb - ra;
    return b.created_at.localeCompare(a.created_at);
  });
  const top = ranked.slice(0, TOP_N_BITACORAS);

  // Resolver autor + familia/color para los top
  const userIds = [...new Set(top.map((b) => b.user_id))];
  const skus = [...new Set(top.map((b) => b.sku).filter(Boolean) as string[])];
  const [profsRes, prodsRes, famsRes] = await Promise.all([
    userIds.length > 0
      ? admin
          .from("user_profiles_public")
          .select("id, display_name, handle")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
    skus.length > 0
      ? admin
          .from("productos")
          .select("sku, color_valiz, familia_id")
          .in("sku", skus)
      : Promise.resolve({ data: [] }),
    admin.from("familias").select("id, name"),
  ]);
  const profById = new Map(
    ((profsRes.data ?? []) as {
      id: string;
      display_name: string | null;
      handle: string | null;
    }[]).map((p) => [p.id, p]),
  );
  const prodBySku = new Map(
    ((prodsRes.data ?? []) as {
      sku: string;
      color_valiz: string | null;
      familia_id: string | null;
    }[]).map((p) => [p.sku, p]),
  );
  const famNameById = new Map(
    ((famsRes.data ?? []) as { id: string; name: string }[]).map((f) => [
      f.id,
      f.name,
    ]),
  );

  const bitsResumen = top.map((b) => {
    const prof = profById.get(b.user_id);
    const prod = b.sku ? prodBySku.get(b.sku) : null;
    const famName = prod?.familia_id
      ? (famNameById.get(prod.familia_id) ?? null)
      : null;
    return {
      id: b.id,
      fotoUrl: b.foto_url,
      lugar: b.lugar,
      texto: b.texto,
      familiaName: famName,
      colorValiz: prod?.color_valiz ?? null,
      autorNombre: prof?.display_name ?? prof?.handle ?? "Anónimo",
      reacciones: reactionsByBit.get(b.id) ?? 0,
    };
  });

  // Ganador concurso anunciado esta semana (opcional)
  const { data: concursoRaw } = await admin
    .from("concursos")
    .select("titulo, slug, ganador_user_id, ganador_anunciado_at")
    .not("ganador_anunciado_at", "is", null)
    .gte("ganador_anunciado_at", since)
    .order("ganador_anunciado_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let ganadorConcurso: {
    titulo: string;
    ganadorNombre: string;
    concursoUrl: string;
  } | null = null;
  if (concursoRaw) {
    const c = concursoRaw as {
      titulo: string;
      slug: string;
      ganador_user_id: string | null;
    };
    let ganadorNombre = "Anónimo";
    if (c.ganador_user_id) {
      const { data } = await admin
        .from("user_profiles_public")
        .select("display_name, handle")
        .eq("id", c.ganador_user_id)
        .maybeSingle();
      const p = data as {
        display_name: string | null;
        handle: string | null;
      } | null;
      ganadorNombre = p?.display_name ?? p?.handle ?? "Anónimo";
    }
    ganadorConcurso = {
      titulo: c.titulo,
      ganadorNombre,
      concursoUrl: `${SITE_URL}/concursos/${c.slug}`,
    };
  }

  // Nuevas piezas vendidas esta semana
  const { count: nuevasPiezasCount } = await admin
    .from("orders")
    .select("name", { count: "exact", head: true })
    .gte("paid_at", since);

  // Destinatarios: users con welcomed_at NOT NULL y email
  const { data: usersRaw } = await admin
    .from("user_profiles")
    .select("id, email, display_name")
    .not("welcomed_at", "is", null)
    .not("email", "is", null);
  const users = (usersRaw ?? []) as {
    id: string;
    email: string;
    display_name: string | null;
  }[];

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      destinatarios: users.length,
      bitacorasEnDigest: bitsResumen.length,
      ganadorConcurso: ganadorConcurso?.titulo ?? null,
      nuevasPiezasCount: nuevasPiezasCount ?? 0,
    });
  }

  if (users.length === 0) {
    return NextResponse.json({
      sent: 0,
      reason: "no_users",
    });
  }

  // Si no hay nada (ni bitácoras ni concurso), no spam
  if (bitsResumen.length === 0 && !ganadorConcurso) {
    return NextResponse.json({
      sent: 0,
      reason: "no_content_to_share",
    });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no configurada" },
      { status: 500 },
    );
  }

  // Mandar de a uno, con catch individual
  let sent = 0;
  let failed = 0;
  for (const u of users) {
    const { subject, html } = tplDigestSemanal({
      nombre: u.display_name,
      bitacoras: bitsResumen,
      ganadorConcurso,
      nuevasPiezasCount: nuevasPiezasCount ?? 0,
      yoUrl: `${SITE_URL}/yo`,
      bitacoraUrl: `${SITE_URL}/bitacora`,
    });
    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [u.email],
        subject,
        html,
      });
      if (error) {
        console.error("[digest send error]", u.email, error);
        failed++;
      } else {
        sent++;
      }
    } catch (e) {
      console.error("[digest send fail]", u.email, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: users.length });
}
