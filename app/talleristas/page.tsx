import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { slugify } from "@/lib/slugify";
import { createStaticClient } from "@/lib/supabase/static";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Los talleristas",
  description:
    "Roberto, César y David. Las manos detrás de cada Valiz — tres talleres chilenos cosiendo sin máquinas industriales, sin apuro.",
  alternates: { canonical: "/talleristas" },
  openGraph: {
    type: "article",
    title: "Los talleristas · Valiz Bitácora",
    description:
      "Las manos detrás de cada Valiz — tres talleres chilenos.",
    url: "/talleristas",
  },
};

const nf = new Intl.NumberFormat("es-CL");

type Tallerista = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  portrait_url: string | null;
  specialties: string[] | null;
  manos_count: number | null;
  display_order: number | null;
};

type ProductoRow = {
  tallerista_id: string;
  sales_total: number | null;
  familia_id: string | null;
};

type FamiliaRow = { id: string; hours_per_unit: number | string | null };

export default async function TalleristasPage() {
  const sb = createStaticClient();
  const [tRes, pRes, fRes] = await Promise.all([
    sb
      .from("talleristas")
      .select(
        "id, name, role, bio, portrait_url, specialties, manos_count, display_order",
      )
      .order("display_order"),
    sb
      .from("productos")
      .select("tallerista_id, sales_total, familia_id")
      .eq("status", "active"),
    sb.from("familias").select("id, hours_per_unit"),
  ]);

  const talleristas = (tRes.data ?? []) as Tallerista[];
  const productos = (pRes.data ?? []) as ProductoRow[];
  const familias = (fRes.data ?? []) as FamiliaRow[];
  const horasById = new Map(
    familias.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
  );

  // Stats por tallerista: unidades + horas en los últimos 12 meses
  const statsByT = new Map<string, { unidades: number; horas: number }>();
  for (const p of productos) {
    if (!p.tallerista_id) continue;
    const unidades = Number(p.sales_total ?? 0);
    const horas = p.familia_id
      ? (horasById.get(p.familia_id) ?? 0) * unidades
      : 0;
    const entry = statsByT.get(p.tallerista_id);
    if (entry) {
      entry.unidades += unidades;
      entry.horas += horas;
    } else {
      statsByT.set(p.tallerista_id, { unidades, horas });
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Los talleristas
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Los talleres
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-6xl">
            {talleristas.length} talleres,{" "}
            {talleristas.reduce((s, t) => s + (t.manos_count ?? 0), 0)} manos.
          </h1>
          <p className="mt-10 max-w-2xl font-serif text-xl italic leading-relaxed text-cuero sm:text-2xl">
            Cada pieza pasa por las manos de un equipo entero antes de
            salir. Sin máquinas industriales, sin apuro.
          </p>
        </div>
      </section>

      <section className="px-8 py-20 sm:px-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3">
          {talleristas.map((t) => {
            const slug = slugify(t.name);
            const stats = statsByT.get(t.id) ?? { unidades: 0, horas: 0 };
            const bioPlaceholder =
              !t.bio || t.bio.toLowerCase().includes("placeholder");
            return (
              <Link
                key={t.id}
                href={`/talleristas/${slug}`}
                className="group flex flex-col gap-6 border border-piedra bg-fondo p-8 transition-colors hover:border-cuero"
              >
                {/* Retrato — placeholder cuero con inicial si falta */}
                <div className="flex items-center gap-5">
                  {t.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.portrait_url}
                      alt={t.name}
                      className="h-20 w-20 rounded-full border border-piedra object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cuero font-serif text-3xl text-fondo">
                      {t.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-serif text-2xl leading-tight tracking-[-0.01em]">
                      {t.name}
                    </p>
                    {t.role && (
                      <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                        {t.role}
                      </p>
                    )}
                  </div>
                </div>

                {bioPlaceholder ? (
                  <p className="font-serif text-sm italic leading-relaxed text-niebla">
                    Bio pendiente — la escribimos pronto.
                  </p>
                ) : (
                  <p className="line-clamp-4 font-serif text-base italic leading-relaxed text-niebla">
                    {t.bio}
                  </p>
                )}

                {t.specialties && t.specialties.length > 0 && (
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                      Especialista en
                    </p>
                    <p className="mt-2 font-serif text-sm leading-snug">
                      {t.specialties.slice(0, 3).join(" · ")}
                      {t.specialties.length > 3 &&
                        ` · +${t.specialties.length - 3}`}
                    </p>
                  </div>
                )}

                <div className="mt-auto grid grid-cols-3 gap-4 border-t border-piedra pt-5">
                  <Stat label="Manos" value={nf.format(t.manos_count ?? 0)} />
                  <Stat label="Piezas/año" value={nf.format(stats.unidades)} />
                  <Stat label="Horas/año" value={nf.format(stats.horas)} />
                </div>

                <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-cuero transition-transform group-hover:translate-x-1">
                  Ver perfil →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
          <Link
            href="/"
            className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
          >
            ← Volver
          </Link>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Valiz · Since 2018
          </p>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.18em] text-niebla">
        {label}
      </p>
      <p className="mt-1 font-serif text-lg leading-tight">{value}</p>
    </div>
  );
}
