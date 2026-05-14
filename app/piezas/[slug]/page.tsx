import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const nf = new Intl.NumberFormat("es-CL");
const SHOPIFY_BASE = "https://www.valiz.cl/products/";

export const revalidate = 300;

export async function generateStaticParams() {
  const sb = await createClient();
  const { data } = await sb.from("familias").select("slug");
  return (data ?? []).map((f) => ({ slug: f.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = await createClient();
  const { data } = await sb
    .from("familias")
    .select("name")
    .eq("slug", slug)
    .single();
  return {
    title: data ? `${data.name} · Valiz Bitácora` : "Pieza · Valiz Bitácora",
  };
}

type Tallerista = { name: string; role: string };
type Cuero = { display_name: string; code: string };

type ProductoWithRels = {
  sku: string;
  color_valiz: string | null;
  p2: number | string | null;
  precio: number | null;
  sales_total: number | null;
  shopify_handle: string | null;
  cuero: Cuero | Cuero[] | null;
  tallerista: Tallerista | Tallerista[] | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function FamiliaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = await createClient();

  const { data: familia } = await sb
    .from("familias")
    .select("id, name, slug, description, hours_per_unit")
    .eq("slug", slug)
    .single();

  if (!familia) notFound();

  const { data: productosRaw } = await sb
    .from("productos")
    .select(
      "sku, color_valiz, p2, precio, sales_total, shopify_handle, cuero:cueros(display_name, code), tallerista:talleristas(name, role)",
    )
    .eq("familia_id", familia.id)
    .eq("status", "active")
    .order("color_valiz");

  const productos = (productosRaw ?? []) as ProductoWithRels[];

  // Tallerista lider: el más frecuente entre los productos.
  const talleristaCounts = new Map<string, { tallerista: Tallerista; n: number }>();
  for (const p of productos) {
    const t = pickOne(p.tallerista);
    if (!t) continue;
    const entry = talleristaCounts.get(t.name);
    if (entry) entry.n++;
    else talleristaCounts.set(t.name, { tallerista: t, n: 1 });
  }
  const lider = [...talleristaCounts.values()].sort((a, b) => b.n - a.n)[0]
    ?.tallerista;

  const horasPorUnidad = Number(familia.hours_per_unit ?? 0);
  const totalUnidades = productos.reduce(
    (s, p) => s + Number(p.sales_total ?? 0),
    0,
  );
  const totalHoras = Math.round(totalUnidades * horasPorUnidad);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-8 sm:px-16 sm:py-12">
        <Link
          href="/"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
        >
          ← Valiz · Bitácora
        </Link>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Pieza · {familia.name}
        </p>
      </header>

      {/* HERO familia ------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-32 sm:px-16 sm:py-40">
        <div className="max-w-4xl">
          <p className="mb-10 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            La pieza
          </p>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            {familia.name}
          </h1>
          {lider && horasPorUnidad > 0 && (
            <p className="mt-10 max-w-2xl font-serif text-xl italic leading-relaxed text-cuero sm:text-2xl">
              Hecha en el taller de {lider.name} · {horasPorUnidad}{" "}
              {horasPorUnidad === 1 ? "hora" : "horas"} por unidad.
            </p>
          )}
          {familia.description && (
            <p className="mt-10 max-w-2xl font-serif text-lg leading-relaxed sm:text-xl">
              {familia.description}
            </p>
          )}
        </div>
      </section>

      {/* Stats acumulados --------------------------------------------------- */}
      {productos.length > 0 && (
        <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-24">
          <div className="max-w-4xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              Hasta hoy
            </p>
            <p className="mt-6 font-serif text-3xl leading-tight sm:text-4xl">
              {nf.format(totalUnidades)}{" "}
              <span className="italic text-cuero">
                piezas terminadas en el último año
              </span>
              {totalHoras > 0 && (
                <>
                  {" "}· {nf.format(totalHoras)}{" "}
                  <span className="italic text-cuero">
                    horas acumuladas en esta familia
                  </span>
                </>
              )}
              .
            </p>
          </div>
        </section>
      )}

      {/* Variantes (colores) ------------------------------------------------ */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="max-w-5xl">
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Los colores
          </p>
          {productos.length === 0 ? (
            <>
              <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
                Próximamente.
              </h2>
              <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
                No hay piezas activas en esta familia ahora mismo. Vuelve
                pronto.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
                {productos.length}{" "}
                {productos.length === 1
                  ? "color disponible"
                  : "colores disponibles"}
                .
              </h2>
              <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
                Cada uno con un cuero distinto. Todos curtidos en Chile, todos
                cosidos en el mismo taller.
              </p>

              <ul className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2">
                {productos.map((p) => (
                  <ProductoCard key={p.sku} p={p} />
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
          <Link
            href="/"
            className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
          >
            ← Volver a la Bitácora
          </Link>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Valiz · MMXXVI
          </p>
        </div>
      </footer>
    </main>
  );
}

function ProductoCard({ p }: { p: ProductoWithRels }) {
  const cuero = pickOne(p.cuero);
  const handle = p.shopify_handle;
  const precio = p.precio
    ? `$${nf.format(p.precio)}`
    : null;
  const p2 = p.p2 != null ? Number(p.p2) : null;

  return (
    <li className="border-t border-piedra pt-8">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {p.color_valiz ?? "—"}
      </p>
      {cuero ? (
        <p className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em]">
          {cuero.display_name}
        </p>
      ) : (
        <p className="mt-3 font-serif text-3xl leading-tight italic text-niebla">
          Cuero por confirmar
        </p>
      )}
      <p className="mt-4 font-sans text-sm text-niebla">
        {p2 ? `${p2} pies² de cuero` : "—"}
        {precio ? ` · ${precio} CLP` : ""}
      </p>
      {handle ? (
        <a
          href={`${SHOPIFY_BASE}${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block border-b border-cuero pb-1 font-serif text-base italic text-cuero hover:text-tinta"
        >
          Llevar conmigo →
        </a>
      ) : (
        <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          Próximamente en la tienda
        </p>
      )}
    </li>
  );
}
