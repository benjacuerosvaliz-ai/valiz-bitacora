import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { CrearConcursoForm } from "./crear-form";

export const metadata: Metadata = {
  title: "Concursos · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ConcursoRow = {
  id: string;
  slug: string;
  titulo: string;
  inicia_at: string;
  termina_at: string;
  ganador_anunciado_at: string | null;
};

function estado(c: ConcursoRow): "actual" | "futuro" | "cerrado" {
  const now = Date.now();
  if (now < new Date(c.inicia_at).getTime()) return "futuro";
  if (now > new Date(c.termina_at).getTime()) return "cerrado";
  return "actual";
}

export default async function AdminConcursosPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/admin/concursos");
  if (!isAdmin(user.email)) notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("concursos")
    .select("id, slug, titulo, inicia_at, termina_at, ganador_anunciado_at")
    .order("inicia_at", { ascending: false });
  const concursos = (rows ?? []) as ConcursoRow[];

  // Contar participaciones por concurso
  const ids = concursos.map((c) => c.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: parts } = await admin
      .from("concurso_participaciones")
      .select("concurso_id");
    for (const p of parts ?? []) {
      counts.set(p.concurso_id, (counts.get(p.concurso_id) ?? 0) + 1);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-tinta px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/admin" />
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Admin · Concursos
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-12 sm:px-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.015em] sm:text-5xl">
            Crear concurso
          </h1>
          <p className="mt-3 font-serif italic leading-relaxed text-niebla">
            Define tema, premio y fechas. El concurso queda visible en{" "}
            <code className="font-mono text-sm">/concursos</code> y los users
            pueden postular sus bitácoras mientras esté vigente.
          </p>
          <div className="mt-10">
            <CrearConcursoForm />
          </div>
        </div>
      </section>

      <section className="px-8 py-12 sm:px-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-serif text-2xl leading-tight sm:text-3xl">
            Concursos ({concursos.length})
          </h2>
          {concursos.length === 0 ? (
            <p className="mt-6 font-serif italic text-niebla">
              No hay concursos todavía.
            </p>
          ) : (
            <ul className="mt-8 space-y-4">
              {concursos.map((c) => {
                const e = estado(c);
                const n = counts.get(c.id) ?? 0;
                return (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 border border-piedra p-4 sm:flex-row sm:items-baseline sm:justify-between"
                  >
                    <div>
                      <p
                        className={`font-sans text-[10px] font-semibold uppercase tracking-[0.22em] ${
                          e === "actual"
                            ? "text-cuero"
                            : e === "futuro"
                              ? "text-musgo"
                              : "text-niebla"
                        }`}
                      >
                        {e === "actual"
                          ? "Vigente"
                          : e === "futuro"
                            ? "Próximo"
                            : "Cerrado"}
                      </p>
                      <p className="mt-1 font-serif text-xl">{c.titulo}</p>
                      <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                        {new Date(c.inicia_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        →{" "}
                        {new Date(c.termina_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {n}{" "}
                        {n === 1 ? "postulación" : "postulaciones"}
                        {c.ganador_anunciado_at && " · ✓ con ganador"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/concursos/${c.slug}`}
                        className="border border-piedra px-3 py-2 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla transition-colors hover:border-cuero hover:text-cuero"
                      >
                        Ver público
                      </Link>
                      <Link
                        href={`/admin/concursos/${c.id}`}
                        className="border border-tinta bg-tinta px-3 py-2 font-sans text-[10px] uppercase tracking-[0.18em] text-fondo transition-colors hover:bg-cuero"
                      >
                        Gestionar →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
