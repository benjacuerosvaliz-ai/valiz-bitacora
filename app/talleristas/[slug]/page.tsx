import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { slugify } from "@/lib/slugify";
import { createStaticClient } from "@/lib/supabase/static";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

type Tallerista = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  portrait_url: string | null;
  specialties: string[] | null;
  manos_count: number | null;
};

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  sales_total: number | null;
  familia_id: string | null;
  shopify_handle: string | null;
};

const nf = new Intl.NumberFormat("es-CL");

async function resolveTallerista(slug: string): Promise<Tallerista | null> {
  const sb = createStaticClient();
  const { data } = await sb
    .from("talleristas")
    .select(
      "id, name, role, bio, portrait_url, specialties, manos_count",
    );
  const all = (data ?? []) as Tallerista[];
  return all.find((t) => slugify(t.name) === slug) ?? null;
}

export async function generateStaticParams() {
  const sb = createStaticClient();
  const { data } = await sb.from("talleristas").select("name");
  return ((data ?? []) as { name: string }[]).map((t) => ({
    slug: slugify(t.name),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await resolveTallerista(slug);
  if (!t) return { title: "Tallerista" };
  const description =
    t.bio && !t.bio.toLowerCase().includes("placeholder")
      ? t.bio.slice(0, 200)
      : `${t.name} — ${t.role ?? "Tallerista"} en Valiz. ${t.manos_count ?? 0} manos en su taller.`;
  const url = `/talleristas/${slug}`;
  return {
    title: t.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: `${t.name} · Tallerista Valiz`,
      description,
      url,
    },
  };
}

export default async function TalleristaPage({ params }: Props) {
  const { slug } = await params;
  const t = await resolveTallerista(slug);
  if (!t) notFound();

  const sb = createStaticClient();
  const [pRes, fRes] = await Promise.all([
    sb
      .from("productos")
      .select(
        "sku, color_valiz, sales_total, familia_id, shopify_handle",
      )
      .eq("tallerista_id", t.id)
      .eq("status", "active"),
    sb.from("familias").select("id, slug, name, hours_per_unit"),
  ]);
  const productos = (pRes.data ?? []) as ProductoRow[];
  const familias = (fRes.data ?? []) as FamiliaRow[];
  const familiaById = new Map(familias.map((f) => [f.id, f]));

  // Stats acumulados
  let unidadesTotal = 0;
  let horasTotal = 0;
  for (const p of productos) {
    const u = Number(p.sales_total ?? 0);
    unidadesTotal += u;
    const fam = p.familia_id ? familiaById.get(p.familia_id) : null;
    horasTotal += u * Number(fam?.hours_per_unit ?? 0);
  }

  // Agrupar productos por familia para la sección "Lo que sale de su taller"
  const productosByFamilia = new Map<string, ProductoRow[]>();
  for (const p of productos) {
    if (!p.familia_id) continue;
    const list = productosByFamilia.get(p.familia_id) ?? [];
    list.push(p);
    productosByFamilia.set(p.familia_id, list);
  }

  const bioPlaceholder =
    !t.bio || t.bio.toLowerCase().includes("placeholder");

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/talleristas" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Tallerista
        </p>
      </header>

      {/* HERO -------------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-start gap-10 sm:flex-row sm:items-center sm:gap-12">
            {t.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.portrait_url}
                alt={t.name}
                className="h-36 w-36 rounded-full border border-piedra object-cover sm:h-44 sm:w-44"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-cuero font-serif text-6xl text-fondo sm:h-44 sm:w-44">
                {t.name.charAt(0)}
              </div>
            )}
            <div>
              {t.role && (
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  {t.role}
                </p>
              )}
              <h1 className="mt-3 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-6xl">
                {t.name}
              </h1>
              <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
                {t.manos_count ?? 0}{" "}
                {(t.manos_count ?? 0) === 1 ? "mano" : "manos"} en su taller
              </p>
            </div>
          </div>

          {/* Bio (o placeholder explícito) */}
          {bioPlaceholder ? (
            <div className="mt-12 max-w-2xl border-l-2 border-piedra pl-6">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                Bio pendiente
              </p>
              <p className="mt-2 font-serif text-base italic leading-relaxed text-niebla">
                Estamos escribiendo la bio definitiva de {t.name}. Pronto vas a
                poder leer su historia acá.
              </p>
            </div>
          ) : (
            <p className="mt-12 max-w-2xl font-serif text-xl leading-relaxed sm:text-2xl">
              {t.bio}
            </p>
          )}
        </div>
      </section>

      {/* STATS ------------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-16 sm:px-16 sm:py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-12">
          <BigStat
            label="Piezas/año"
            value={nf.format(unidadesTotal)}
            hint="terminadas en los últimos 12 meses"
          />
          <BigStat
            label="Horas/año"
            value={nf.format(horasTotal)}
            hint="acumuladas en su taller"
          />
          <BigStat
            label="Familias"
            value={nf.format(productosByFamilia.size)}
            hint={
              productosByFamilia.size === 1
                ? "tipo de pieza distinta"
                : "tipos de pieza distintos"
            }
          />
        </div>
      </section>

      {/* ESPECIALIDADES ---------------------------------------------------- */}
      {t.specialties && t.specialties.length > 0 && (
        <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Especialidades
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
              Las piezas que sabe hacer.
            </h2>
            <ul className="mt-10 flex flex-wrap gap-3">
              {t.specialties.map((s) => (
                <li
                  key={s}
                  className="border border-piedra px-4 py-2 font-serif text-base"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* LO QUE SALE DE SU TALLER ----------------------------------------- */}
      {productosByFamilia.size > 0 && (
        <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Lo que sale de su taller
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
              {productosByFamilia.size}{" "}
              {productosByFamilia.size === 1
                ? "familia activa"
                : "familias activas"}{" "}
              hoy.
            </h2>
            <ul className="mt-12 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
              {[...productosByFamilia.entries()].map(([famId, prods]) => {
                const fam = familiaById.get(famId);
                if (!fam) return null;
                const vendidas = prods.reduce(
                  (s, p) => s + Number(p.sales_total ?? 0),
                  0,
                );
                return (
                  <li key={famId} className="border-t border-piedra py-5">
                    <Link
                      href={`/piezas/${fam.slug}`}
                      className="group flex items-baseline justify-between gap-4 hover:text-cuero"
                    >
                      <span>
                        <span className="font-serif text-2xl leading-tight tracking-[-0.01em]">
                          {fam.name}
                        </span>
                        <span className="ml-3 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                          {prods.length}{" "}
                          {prods.length === 1 ? "color" : "colores"} ·{" "}
                          {nf.format(vendidas)} vendidas
                        </span>
                      </span>
                      <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-cuero transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <footer className="px-8 py-10 sm:px-16">
        <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
          <Link
            href="/talleristas"
            className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
          >
            ← Todos los talleristas
          </Link>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Valiz · Since 2018
          </p>
        </div>
      </footer>
    </main>
  );
}

function BigStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </p>
      <p className="mt-3 font-serif text-5xl leading-tight tracking-[-0.015em] sm:text-6xl">
        {value}
      </p>
      <p className="mt-2 font-serif text-sm italic leading-relaxed text-cuero">
        {hint}
      </p>
    </div>
  );
}
