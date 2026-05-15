import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

import { MapaColectivo } from "./mapa";

export const metadata: Metadata = {
  title: "Mapa colectivo · Valiz Bitácora",
};

export const revalidate = 60;

type BitacoraRow = {
  id: string;
  user_id: string;
  sku: string | null;
  foto_url: string;
  lat: number | string | null;
  lng: number | string | null;
  lugar: string | null;
  texto: string | null;
  created_at: string;
};

export default async function MapaPage() {
  const sb = createStaticClient();

  const { data: bitsRaw } = await sb
    .from("bitacora_entries")
    .select("id, user_id, sku, foto_url, lat, lng, lugar, texto, created_at")
    .eq("invalidated", false)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const bitacoras = (bitsRaw ?? []) as BitacoraRow[];
  const points = bitacoras.map((b) => ({
    id: b.id,
    lat: Number(b.lat),
    lng: Number(b.lng),
    foto: b.foto_url,
    lugar: b.lugar,
    texto: b.texto,
  }));

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/bitacora" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Mapa colectivo
        </p>
      </header>

      <section className="px-8 pt-16 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Mapa colectivo
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            Las Valiz andando.
          </h1>
          <p className="mt-6 max-w-xl font-serif italic leading-relaxed text-niebla">
            {points.length === 0
              ? "Aún no hay puntos en el mapa. Sé la primera bitácora con ubicación."
              : `${points.length} ${points.length === 1 ? "punto registrado" : "puntos registrados"}.`}
          </p>
        </div>
      </section>

      <section className="flex-1 px-8 pb-16 pt-10 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="aspect-[16/10] w-full border border-piedra bg-fondo">
            <MapaColectivo points={points} />
          </div>
        </div>
      </section>
    </main>
  );
}
