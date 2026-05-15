import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

import { MapaColectivo } from "./mapa";

export const metadata: Metadata = {
  title: "Mapa colectivo · Valiz Bitácora",
  description:
    "Las Valiz andando por el mundo — un planeta lleno de cuero artesano chileno.",
};

export const revalidate = 60;

const nf = new Intl.NumberFormat("es-CL");

type BitacoraRow = {
  id: string;
  user_id: string;
  sku: string | null;
  foto_url: string;
  lat: number | string | null;
  lng: number | string | null;
  lugar: string | null;
  texto: string | null;
};

type ProductoLite = {
  sku: string;
  color_valiz: string | null;
  familia_id: string | null;
};

type FamiliaLite = { id: string; name: string };

type ProductoStats = {
  p2: number | string | null;
  sales_total: number | null;
  familia_id: string | null;
};

type FamiliaRow = {
  id: string;
  hours_per_unit: number | string | null;
};

export default async function MapaPage() {
  const sb = createStaticClient();

  const [bitsRes, prodsRes, famsRes, prodsForBitsRes] = await Promise.all([
    sb
      .from("bitacora_entries")
      .select("id, user_id, sku, foto_url, lat, lng, lugar, texto")
      .eq("invalidated", false)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    sb
      .from("productos")
      .select("p2, sales_total, familia_id")
      .eq("status", "active"),
    sb.from("familias").select("id, hours_per_unit, name"),
    sb.from("productos").select("sku, color_valiz, familia_id"),
  ]);

  const bitacoras = (bitsRes.data ?? []) as BitacoraRow[];
  const productos = (prodsRes.data ?? []) as ProductoStats[];
  const familias = (famsRes.data ?? []) as (FamiliaRow & { name?: string })[];
  const productosLite = (prodsForBitsRes.data ?? []) as ProductoLite[];

  // Mapas para enriquecer cada bitácora con familia + color
  const productoBySku = new Map(productosLite.map((p) => [p.sku, p]));
  const familiaById = new Map(
    familias.map((f) => [f.id, (f as FamiliaLite).name ?? ""]),
  );

  // Stats agregadas para el overlay del globo
  const hoursByFamilia = new Map(
    familias.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
  );
  const horasTotal = Math.round(
    productos.reduce(
      (s, p) =>
        s +
        Number(p.sales_total ?? 0) *
          (hoursByFamilia.get(p.familia_id ?? "") ?? 0),
      0,
    ),
  );
  const piesTotal = Math.round(
    productos.reduce(
      (s, p) => s + Number(p.p2 ?? 0) * Number(p.sales_total ?? 0),
      0,
    ),
  );
  const piezasTotal = productos.reduce(
    (s, p) => s + Number(p.sales_total ?? 0),
    0,
  );

  const points = bitacoras.map((b) => {
    const p = b.sku ? productoBySku.get(b.sku) : null;
    const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
    return {
      id: b.id,
      lat: Number(b.lat),
      lng: Number(b.lng),
      foto: b.foto_url,
      lugar: b.lugar,
      texto: b.texto,
      familia: fam ?? null,
      colorValiz: p?.color_valiz ?? null,
    };
  });

  const personas = new Set(bitacoras.map((b) => b.user_id)).size;

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/bitacora" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Mapa colectivo
        </p>
      </header>

      {/* GLOBO FULL-BLEED ---------------------------------------------------- */}
      <section className="relative flex-1 overflow-hidden bg-fondo">
        <div className="h-[calc(100vh-72px)] min-h-[600px] w-full sm:h-[calc(100vh-78px)]">
          <MapaColectivo points={points} />
        </div>

        {/* Overlay top-left: título grande */}
        <div className="pointer-events-none absolute left-6 top-6 max-w-md sm:left-12 sm:top-12">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Valiz por el mundo
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.04] tracking-[-0.022em] text-tinta sm:text-5xl">
            El cuero anda solo.
          </h1>
          <p className="mt-3 max-w-xs font-serif text-sm italic leading-relaxed text-niebla sm:text-base">
            Cada pieza después del taller deja huella en algún lugar. Esto es
            lo que vamos viendo.
          </p>
        </div>

        {/* Overlay bottom-left: stats Valiz */}
        <div className="pointer-events-none absolute bottom-6 left-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:bottom-12 sm:left-12 sm:grid-cols-4 sm:gap-x-12">
          <Stat label="Horas de artesanos" big={nf.format(horasTotal)} />
          <Stat label="Pies² rescatados" big={nf.format(piesTotal)} />
          <Stat label="Piezas viajando" big={nf.format(piezasTotal)} />
          <Stat
            label="Bitácoras"
            big={nf.format(points.length)}
            small={
              personas > 0
                ? `de ${personas} ${personas === 1 ? "persona" : "personas"}`
                : undefined
            }
          />
        </div>

        {/* Overlay bottom-right: link a lista */}
        <div className="pointer-events-none absolute bottom-6 right-6 sm:bottom-12 sm:right-12">
          <Link
            href="/bitacora"
            className="pointer-events-auto inline-flex items-center gap-3 border border-tinta bg-fondo/85 px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:bg-tinta hover:text-fondo"
          >
            Ver entradas
            <span>→</span>
          </Link>
        </div>

        {points.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-32 text-center sm:translate-y-40">
            <p className="bg-fondo/85 px-5 py-3 font-serif text-sm italic text-niebla backdrop-blur-sm sm:text-base">
              Aún no hay puntos. Sube la primera bitácora con ubicación.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  big,
  small,
}: {
  label: string;
  big: string;
  small?: string;
}) {
  return (
    <div>
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl leading-none tracking-[-0.02em] text-tinta sm:text-4xl">
        {big}
      </p>
      {small && (
        <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
          {small}
        </p>
      )}
    </div>
  );
}
