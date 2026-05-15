import type { Metadata } from "next";
import Link from "next/link";

import { createStaticClient } from "@/lib/supabase/static";

export const metadata: Metadata = {
  title: "Bitácora colectiva · Valiz",
  description:
    "Las Valiz andando por el mundo — fotos, lugares e historias de quienes las llevan.",
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
  created_at: string;
};

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  familia_id: string | null;
};

type FamiliaRow = { id: string; name: string };
type ProfileRow = { id: string; display_name: string | null; email: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function authorLabel(p: ProfileRow | undefined): string {
  if (!p) return "Anónimo";
  if (p.display_name) return p.display_name;
  return p.email.split("@")[0];
}

export default async function BitacoraColectivaPage() {
  const sb = createStaticClient();

  const { data: bitsRaw } = await sb
    .from("bitacora_entries")
    .select("id, user_id, sku, foto_url, lat, lng, lugar, texto, created_at")
    .eq("invalidated", false)
    .order("created_at", { ascending: false })
    .limit(60);
  const bitacoras = (bitsRaw ?? []) as BitacoraRow[];

  const conGeo = bitacoras.filter(
    (b) => b.lat !== null && b.lng !== null,
  ).length;
  const skus = [...new Set(bitacoras.map((b) => b.sku).filter(Boolean) as string[])];
  const userIds = [...new Set(bitacoras.map((b) => b.user_id))];

  const [pRes, fRes, profRes] = await Promise.all([
    skus.length > 0
      ? sb
          .from("productos")
          .select("sku, color_valiz, familia_id")
          .in("sku", skus)
      : Promise.resolve({ data: [] }),
    sb.from("familias").select("id, name"),
    userIds.length > 0
      ? sb
          .from("user_profiles")
          .select("id, display_name, email")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  const productos = (pRes.data ?? []) as ProductoRow[];
  const familias = (fRes.data ?? []) as FamiliaRow[];
  const profiles = (profRes.data ?? []) as ProfileRow[];

  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaById = new Map(familias.map((f) => [f.id, f.name]));
  const profileByUser = new Map(profiles.map((p) => [p.id, p]));

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-6 sm:px-16 sm:py-8">
        <Link
          href="/"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
        >
          ← Valiz · Bitácora
        </Link>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Bitácora colectiva
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Vida futura
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Las Valiz por el mundo.
          </h1>
          <p className="mt-8 max-w-2xl font-serif text-xl italic leading-relaxed text-niebla">
            Cada Valiz tiene su propia historia después del taller. Quienes la
            llevan suben fotos, lugares y relatos. Esto es lo que va llegando.
          </p>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label="Entradas" big={nf.format(bitacoras.length)} />
            <Stat label="Con ubicación" big={nf.format(conGeo)} />
            <Stat label="Personas" big={nf.format(userIds.length)} />
          </div>
          {conGeo > 0 && (
            <Link
              href="/bitacora/mapa"
              className="mt-10 inline-flex items-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Ver mapa colectivo →
            </Link>
          )}
        </div>
      </section>

      <section className="px-8 py-20 sm:px-16">
        <div className="mx-auto max-w-6xl">
          {bitacoras.length === 0 ? (
            <p className="font-serif text-2xl italic text-niebla">
              Todavía no hay entradas. Si llevas una Valiz, sé el primero.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {bitacoras.map((b) => {
                const p = b.sku ? productoBySku.get(b.sku) : null;
                const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
                const author = profileByUser.get(b.user_id);
                return (
                  <li key={b.id} className="border border-piedra bg-fondo transition-colors hover:border-cuero">
                    <Link href={`/bitacora/${b.id}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.foto_url}
                        alt={b.lugar ?? "Bitácora Valiz"}
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <div className="px-5 py-5">
                        {b.lugar && (
                          <p className="font-serif text-lg italic text-cuero">
                            {b.lugar}
                          </p>
                        )}
                        {fam && (
                          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                            {fam}
                            {p?.color_valiz && ` · ${p.color_valiz}`}
                          </p>
                        )}
                        {b.texto && (
                          <p className="mt-3 line-clamp-3 font-serif text-base leading-relaxed">
                            {b.texto}
                          </p>
                        )}
                        <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                          {authorLabel(author)} · {formatDate(b.created_at)}
                        </p>
                      </div>
                    </Link>
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

function Stat({ label, big }: { label: string; big: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em]">
        {big}
      </p>
    </div>
  );
}
