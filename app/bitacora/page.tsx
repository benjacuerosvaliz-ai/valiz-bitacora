import type { Metadata } from "next";
import Link from "next/link";

import { HeartButton } from "@/components/bitacora/heart-button";
import { BrandMark } from "@/components/brand-mark";
import { getReactionCounts, getUserReactedSet } from "@/lib/reacciones";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { createStaticClient } from "@/lib/supabase/static";

import { BitacoraFiltros } from "./bitacora-filtros";
import { MapaColectivo, type Point } from "./mapa/mapa";

export const metadata: Metadata = {
  title: "Bitácora colectiva · Valiz",
  description:
    "Las Valiz andando por el mundo — fotos, lugares e historias de las piezas en uso.",
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
  tallerista_id: string | null;
};

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

type TalleristaRow = { id: string; name: string };
type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};
type ProductoStats = {
  p2: number | string | null;
  sales_total: number | null;
  familia_id: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function authorLabel(p: ProfileRow | undefined): string {
  if (!p) return "Anónimo";
  return p.display_name ?? p.handle ?? "Anónimo";
}

type SearchParams = {
  q?: string;
  tallerista?: string;
  familia?: string;
};

export default async function BitacoraColectivaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const talleristaSlug = (sp.tallerista ?? "").trim();
  const familiaSlug = (sp.familia ?? "").trim();

  const sb = createStaticClient();

  // Datos base para filtros y mapeos (siempre se cargan)
  const [prodsRes, famsRes, profsRes, prodsStatsRes, talleristasRes] =
    await Promise.all([
      sb
        .from("productos")
        .select("sku, color_valiz, familia_id, tallerista_id"),
      sb.from("familias").select("id, slug, name, hours_per_unit"),
      sb.from("user_profiles_public").select("id, display_name, handle"),
      sb
        .from("productos")
        .select("p2, sales_total, familia_id")
        .eq("status", "active"),
      sb.from("talleristas").select("id, name").order("display_order"),
    ]);

  const productos = (prodsRes.data ?? []) as ProductoRow[];
  const familias = (famsRes.data ?? []) as FamiliaRow[];
  const profiles = (profsRes.data ?? []) as ProfileRow[];
  const productosStats = (prodsStatsRes.data ?? []) as ProductoStats[];
  const talleristas = (talleristasRes.data ?? []) as TalleristaRow[];

  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaNameById = new Map(familias.map((f) => [f.id, f.name]));
  const familiaIdBySlug = new Map(familias.map((f) => [f.slug, f.id]));
  const talleristaIdBySlug = new Map(
    talleristas.map((t) => [slugify(t.name), t.id]),
  );
  const profileByUser = new Map(profiles.map((p) => [p.id, p]));

  // Resolver SKUs filtrados según tallerista/familia ANTES de pedir
  // bitácoras — así limitamos el query principal.
  let skuFilter: string[] | null = null;
  if (talleristaSlug || familiaSlug) {
    const talleristaId = talleristaSlug
      ? talleristaIdBySlug.get(talleristaSlug)
      : null;
    const familiaId = familiaSlug ? familiaIdBySlug.get(familiaSlug) : null;
    skuFilter = productos
      .filter((p) => {
        if (talleristaId && p.tallerista_id !== talleristaId) return false;
        if (familiaId && p.familia_id !== familiaId) return false;
        return true;
      })
      .map((p) => p.sku);
    // Si el filtro produce cero SKUs, el feed quedará vacío.
  }

  // Query principal de bitácoras con filtros aplicados
  let bitsQuery = sb
    .from("bitacora_entries")
    .select("id, user_id, sku, foto_url, lat, lng, lugar, texto, created_at")
    .eq("invalidated", false)
    .order("created_at", { ascending: false })
    .limit(120);

  if (skuFilter !== null) {
    bitsQuery =
      skuFilter.length > 0
        ? bitsQuery.in("sku", skuFilter)
        : bitsQuery.eq("sku", "__no_match__"); // fuerza vacío
  }
  if (q) {
    // Escapar % y _ que son wildcards en LIKE
    const safe = q.replace(/[%_\\]/g, "\\$&");
    bitsQuery = bitsQuery.or(`lugar.ilike.%${safe}%,texto.ilike.%${safe}%`);
  }

  const bitsRes = await bitsQuery;
  const bitacoras = (bitsRes.data ?? []) as BitacoraRow[];

  // Reacciones: counts públicos + estado del user actual
  const userSb = await createClient();
  const {
    data: { user },
  } = await userSb.auth.getUser();
  const bitIds = bitacoras.map((b) => b.id);
  const [countsMap, reactedSet] = await Promise.all([
    getReactionCounts(bitIds),
    getUserReactedSet(user?.id ?? null, bitIds),
  ]);

  // Stats del overlay del globo (mismo cálculo que /bitacora/mapa)
  const hoursByFamilia = new Map(
    familias.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
  );
  const horasTotal = Math.round(
    productosStats.reduce(
      (s, p) =>
        s +
        Number(p.sales_total ?? 0) *
          (hoursByFamilia.get(p.familia_id ?? "") ?? 0),
      0,
    ),
  );
  const piesTotal = Math.round(
    productosStats.reduce(
      (s, p) => s + Number(p.p2 ?? 0) * Number(p.sales_total ?? 0),
      0,
    ),
  );
  const piezasTotal = productosStats.reduce(
    (s, p) => s + Number(p.sales_total ?? 0),
    0,
  );

  // Puntos para el mapa (solo bitácoras con coords)
  const points: Point[] = bitacoras
    .filter((b) => b.lat !== null && b.lng !== null)
    .map((b) => {
      const p = b.sku ? productoBySku.get(b.sku) : null;
      const fam = p?.familia_id ? familiaNameById.get(p.familia_id) : null;
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

  const personasUnicas = new Set(bitacoras.map((b) => b.user_id)).size;

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Bitácora colectiva
        </p>
      </header>

      {/* GLOBO COMO HERO ------------------------------------------------- */}
      {/* MOBILE: layout vertical normal (título → globo → stats → CTA) */}
      <section className="border-b border-piedra bg-fondo sm:hidden">
        <div className="px-6 pt-8">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Valiz por el mundo
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.04] tracking-[-0.022em] text-tinta">
            El cuero anda solo.
          </h1>
          <p className="mt-3 font-serif text-sm italic leading-relaxed text-niebla">
            Cada pieza después del taller deja huella en algún lugar. Esto es
            lo que vamos viendo.
          </p>
        </div>

        <div className="mt-6 aspect-square w-full overflow-hidden">
          <MapaColectivo points={points} />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-8">
          <StatCompact label="Horas artesanos" big={nf.format(horasTotal)} />
          <StatCompact label="Pies² rescatados" big={nf.format(piesTotal)} />
          <StatCompact label="Piezas viajando" big={nf.format(piezasTotal)} />
          <StatCompact
            label="Bitácoras"
            big={nf.format(points.length)}
            small={
              personasUnicas > 0
                ? `de ${personasUnicas} ${personasUnicas === 1 ? "persona" : "personas"}`
                : undefined
            }
          />
        </div>

        <div className="px-6 pb-8">
          <Link
            href="#feed"
            className="inline-flex w-full items-center justify-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
          >
            Ver entradas ↓
          </Link>
        </div>
      </section>

      {/* DESKTOP: full-bleed con overlays absolutos */}
      <section className="relative hidden overflow-hidden border-b border-piedra bg-fondo sm:block">
        <div className="h-[calc(100vh-78px)] w-full">
          <MapaColectivo points={points} />
        </div>

        <div className="pointer-events-none absolute left-12 top-12 max-w-md">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Valiz por el mundo
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.04] tracking-[-0.022em] text-tinta">
            El cuero anda solo.
          </h1>
          <p className="mt-3 max-w-xs font-serif text-base italic leading-relaxed text-niebla">
            Cada pieza después del taller deja huella en algún lugar. Esto es
            lo que vamos viendo.
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-12 left-12 grid grid-cols-4 gap-x-12">
          <Stat label="Horas de artesanos" big={nf.format(horasTotal)} />
          <Stat label="Pies² rescatados" big={nf.format(piesTotal)} />
          <Stat label="Piezas viajando" big={nf.format(piezasTotal)} />
          <Stat
            label="Bitácoras"
            big={nf.format(points.length)}
            small={
              personasUnicas > 0
                ? `de ${personasUnicas} ${personasUnicas === 1 ? "persona" : "personas"}`
                : undefined
            }
          />
        </div>

        <div className="pointer-events-none absolute bottom-12 right-12">
          <Link
            href="#feed"
            className="pointer-events-auto inline-flex items-center gap-3 border border-tinta bg-fondo/85 px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:bg-tinta hover:text-fondo"
          >
            Ver entradas ↓
          </Link>
        </div>

        {points.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-40 text-center">
            <p className="bg-fondo/85 px-5 py-3 font-serif text-base italic text-niebla backdrop-blur-sm">
              Aún no hay puntos. Sube la primera bitácora con ubicación.
            </p>
          </div>
        )}
      </section>

      {/* FILTROS ---------------------------------------------------------- */}
      <BitacoraFiltros
        talleristas={talleristas.map((t) => ({
          value: slugify(t.name),
          label: t.name,
        }))}
        familias={familias
          .filter((f) => productos.some((p) => p.familia_id === f.id))
          .map((f) => ({ value: f.slug, label: f.name }))
          .sort((a, b) => a.label.localeCompare(b.label))}
        qDefault={q}
        talleristaDefault={talleristaSlug}
        familiaDefault={familiaSlug}
      />

      {/* FEED DE ENTRADAS ------------------------------------------------- */}
      <section id="feed" className="px-8 py-20 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            {q || talleristaSlug || familiaSlug
              ? "Resultados"
              : "Últimas entradas"}
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-[1.1] tracking-[-0.015em] sm:text-4xl">
            {bitacoras.length === 0
              ? q || talleristaSlug || familiaSlug
                ? "Sin entradas con esos filtros."
                : "Todavía no hay entradas."
              : `${bitacoras.length} ${bitacoras.length === 1 ? "entrada" : "entradas"}.`}
          </h2>
          {bitacoras.length === 0 ? (
            <p className="mt-6 font-serif italic leading-relaxed text-niebla">
              {q || talleristaSlug || familiaSlug
                ? "Prueba sacar algún filtro o buscar otro término."
                : "Si llevas una Valiz, sé la primera. Sube tu pieza con ubicación y queda en el mapa."}
            </p>
          ) : (
            <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {bitacoras.map((b) => {
                const p = b.sku ? productoBySku.get(b.sku) : null;
                const fam = p?.familia_id
                  ? familiaNameById.get(p.familia_id)
                  : null;
                const author = profileByUser.get(b.user_id);
                return (
                  <li
                    key={b.id}
                    className="border border-piedra bg-fondo transition-colors hover:border-cuero"
                  >
                    <Link href={`/bitacora/${b.id}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.foto_url}
                        alt={fam ?? "Bitácora Valiz"}
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <div className="px-5 py-5">
                        {fam && (
                          <p className="font-serif text-lg text-tinta">
                            {fam}
                            {p?.color_valiz && (
                              <span className="ml-2 italic text-cuero">
                                · {p.color_valiz}
                              </span>
                            )}
                          </p>
                        )}
                        {b.lugar && (
                          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                            {b.lugar}
                          </p>
                        )}
                        {b.texto && (
                          <p className="mt-3 line-clamp-3 font-serif text-base italic leading-relaxed text-niebla">
                            {b.texto}
                          </p>
                        )}
                        <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                          {authorLabel(author)} · {formatDate(b.created_at)}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between border-t border-piedra px-5 py-3">
                      <HeartButton
                        bitacoraId={b.id}
                        initialCount={countsMap.get(b.id) ?? 0}
                        initialReacted={reactedSet.has(b.id)}
                        loggedIn={!!user}
                        variant="compact"
                      />
                      {author?.handle && (
                        <Link
                          href={`/u/${author.handle}`}
                          className="font-sans text-[10px] uppercase tracking-[0.18em] text-cuero transition-colors hover:text-tinta"
                        >
                          @{author.handle} →
                        </Link>
                      )}
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

function StatCompact({
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
      <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.18em] text-niebla">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl leading-none tracking-[-0.015em] text-tinta">
        {big}
      </p>
      {small && (
        <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.15em] text-niebla">
          {small}
        </p>
      )}
    </div>
  );
}
