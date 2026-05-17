import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

export const metadata: Metadata = {
  title: "Concursos · Valiz Bitácora",
  description:
    "Concursos mensuales para los que llevan Valiz por el mundo. Foto, lugar e historia.",
};

export const revalidate = 60;

type ConcursoRow = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  premio_descripcion: string | null;
  inicia_at: string;
  termina_at: string;
  ganador_anunciado_at: string | null;
};

function estadoConcurso(c: ConcursoRow): "actual" | "futuro" | "cerrado" {
  const now = Date.now();
  const i = new Date(c.inicia_at).getTime();
  const t = new Date(c.termina_at).getTime();
  if (now < i) return "futuro";
  if (now > t) return "cerrado";
  return "actual";
}

function formatRango(inicia: string, termina: string): string {
  const i = new Date(inicia);
  const t = new Date(termina);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  return `${fmt(i)} → ${fmt(t)}`;
}

export default async function ConcursosPage() {
  const sb = createStaticClient();
  const { data: rows } = await sb
    .from("concursos")
    .select(
      "id, slug, titulo, descripcion, premio_descripcion, inicia_at, termina_at, ganador_anunciado_at",
    )
    .order("inicia_at", { ascending: false });

  const concursos = (rows ?? []) as ConcursoRow[];
  const actual = concursos.find((c) => estadoConcurso(c) === "actual");
  const cerrados = concursos.filter((c) => estadoConcurso(c) === "cerrado");
  const futuros = concursos.filter((c) => estadoConcurso(c) === "futuro");

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Concursos
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Cada mes
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Los concursos.
          </h1>
          <p className="mt-8 max-w-2xl font-serif text-xl italic leading-relaxed text-niebla">
            Un tema por mes. Los que llevan Valiz suben su foto + lugar +
            historia y postulan. El que más nos mueve se lleva un premio.
          </p>
        </div>
      </section>

      {actual && (
        <section className="border-b border-piedra px-8 py-16 sm:px-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <ConcursoCard concurso={actual} estado="actual" />
          </div>
        </section>
      )}

      {futuros.length > 0 && (
        <section className="border-b border-piedra px-8 py-16 sm:px-16">
          <div className="mx-auto max-w-4xl">
            <p className="mb-6 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              Próximos
            </p>
            <ul className="space-y-10">
              {futuros.map((c) => (
                <li key={c.id}>
                  <ConcursoCard concurso={c} estado="futuro" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {cerrados.length > 0 && (
        <section className="px-8 py-16 sm:px-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <p className="mb-6 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              Cerrados
            </p>
            <ul className="space-y-10">
              {cerrados.map((c) => (
                <li key={c.id}>
                  <ConcursoCard concurso={c} estado="cerrado" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {concursos.length === 0 && (
        <section className="px-8 py-20 sm:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-serif text-xl italic text-niebla">
              Todavía no hay concursos. Vuelve pronto.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

function ConcursoCard({
  concurso,
  estado,
}: {
  concurso: ConcursoRow;
  estado: "actual" | "futuro" | "cerrado";
}) {
  const badge =
    estado === "actual" ? "Actual" : estado === "futuro" ? "Próximo" : "Cerrado";
  const badgeColor =
    estado === "actual"
      ? "text-cuero"
      : estado === "futuro"
        ? "text-musgo"
        : "text-niebla";
  return (
    <Link href={`/concursos/${concurso.slug}`} className="group block">
      <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-[1fr_2fr] sm:gap-x-12">
        <div>
          <p
            className={`font-sans text-[11px] font-semibold uppercase tracking-[0.22em] ${badgeColor}`}
          >
            {badge}
          </p>
          <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            {formatRango(concurso.inicia_at, concurso.termina_at)}
          </p>
        </div>
        <div>
          <h2 className="font-serif text-3xl leading-[1.04] tracking-[-0.015em] transition-colors group-hover:text-cuero sm:text-4xl">
            {concurso.titulo}
          </h2>
          {concurso.descripcion && (
            <p className="mt-3 font-serif text-base italic leading-relaxed text-niebla sm:text-lg">
              {concurso.descripcion}
            </p>
          )}
          {concurso.premio_descripcion && (
            <p className="mt-3 font-sans text-[11px] uppercase tracking-[0.18em] text-cuero">
              Premio · {concurso.premio_descripcion}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
