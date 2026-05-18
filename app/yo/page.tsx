import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { ReferidoCodigo } from "@/components/referido-codigo";
import { getPhotoBySku } from "@/lib/product-photos";
import { getOrAssignReferidoCode } from "@/lib/referido";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { MapaColectivo, type Point } from "../bitacora/mapa/mapa";

import { EquipajeGrid, type EquipajePieza } from "./equipaje-grid";
import { WelcomeModal } from "./welcome-modal";

const nf = new Intl.NumberFormat("es-CL");

export const metadata: Metadata = {
  title: "Tu equipaje · Valiz Bitácora",
  description: "Tu bitácora personal de Valiz.",
};

export const dynamic = "force-dynamic";

type EquipajeRow = {
  user_id: string;
  sku: string;
  referencia: string;
  adquirido_at: string | null;
  source: string;
  verified: boolean;
};

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  p2: number | string | null;
  familia_id: string | null;
  precio: number | null;
  shopify_handle: string | null;
  tallerista_id: string | null;
  cuero: { display_name: string } | { display_name: string }[] | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

type TalleristaRow = { id: string; name: string };

type CompraManualRow = {
  id: string;
  sku: string | null;
  familia_slug: string | null;
  color_valiz: string | null;
  lugar_compra: string | null;
  fecha_compra: string | null;
  foto_url: string | null;
  verified: boolean;
  created_at: string;
};

type BitacoraRow = {
  id: string;
  sku: string | null;
  foto_url: string;
  lat: number | string | null;
  lng: number | string | null;
  lugar: string | null;
  texto: string | null;
  created_at: string;
};

export default async function YoPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select(
      "id, email, display_name, country, city, bio, puntos_actuales, welcomed_at, pin_hash, handle, instagram_handle, tiktok_handle",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=no_profile");

  // Equipaje
  const { data: equipajeRaw } = await sb
    .from("user_equipaje")
    .select("sku, referencia, adquirido_at, source, verified")
    .order("adquirido_at", { ascending: false });
  const equipaje = (equipajeRaw ?? []) as EquipajeRow[];
  const skus = [...new Set(equipaje.map((e) => e.sku))];

  // Familias + talleristas
  const [fRes, tRes] = await Promise.all([
    sb.from("familias").select("id, slug, name, hours_per_unit"),
    sb.from("talleristas").select("id, name"),
  ]);
  const familias = (fRes.data ?? []) as FamiliaRow[];
  const talleristas = (tRes.data ?? []) as TalleristaRow[];

  // Productos del equipaje
  let productos: ProductoRow[] = [];
  if (skus.length > 0) {
    const { data } = await sb
      .from("productos")
      .select(
        "sku, color_valiz, p2, familia_id, precio, shopify_handle, tallerista_id, cuero:cueros(display_name)",
      )
      .in("sku", skus);
    productos = (data ?? []) as ProductoRow[];
  }

  const photoBySku = getPhotoBySku();
  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaById = new Map(familias.map((f) => [f.id, f]));
  const talleristaById = new Map(talleristas.map((t) => [t.id, t]));

  // Impacto personal
  let totalHoras = 0;
  let totalPies = 0;
  const horasPorTallerista = new Map<string, number>();
  const cuerosUnicos = new Set<string>();
  for (const e of equipaje) {
    const p = productoBySku.get(e.sku);
    if (!p) continue;
    const fam = p.familia_id ? familiaById.get(p.familia_id) : null;
    const h = Number(fam?.hours_per_unit ?? 0);
    const pies = Number(p.p2 ?? 0);
    totalHoras += h;
    totalPies += pies;
    const cuero = pickOne(p.cuero);
    if (cuero?.display_name) cuerosUnicos.add(cuero.display_name);
    if (p.tallerista_id && h > 0) {
      const tName = talleristaById.get(p.tallerista_id)?.name ?? "?";
      horasPorTallerista.set(tName, (horasPorTallerista.get(tName) ?? 0) + h);
    }
  }
  const totalPiezas = equipaje.length;

  // Compras manuales pendientes
  const { data: pendientesRaw } = await sb
    .from("compras_manuales")
    .select(
      "id, sku, familia_slug, color_valiz, lugar_compra, fecha_compra, foto_url, verified, created_at",
    )
    .order("created_at", { ascending: false });
  const compras = (pendientesRaw ?? []) as CompraManualRow[];
  const pendientes = compras.filter((c) => !c.verified);

  // Bitácoras del user (con coords para el mapa personal)
  const { data: bitsRaw } = await sb
    .from("bitacora_entries")
    .select("id, sku, foto_url, lat, lng, lugar, texto, created_at")
    .eq("user_id", user.id)
    .eq("invalidated", false)
    .order("created_at", { ascending: false });
  const bitacoras = (bitsRaw ?? []) as BitacoraRow[];
  const bitacorasConGeo = bitacoras.filter(
    (b) => b.lat !== null && b.lng !== null,
  );

  // Map slug → name
  const familiaNamesBySlug = new Map(familias.map((f) => [f.slug, f.name]));

  // Resolver SKU para pendientes sin sku via familia+color
  const familiaIdBySlug = new Map(familias.map((f) => [f.slug, f.id]));
  const skuBySlugColor = new Map<string, string>();
  const pendientesSinSku = pendientes.filter(
    (p) => !p.sku && p.familia_slug && p.color_valiz,
  );
  if (pendientesSinSku.length > 0) {
    const famIds = [
      ...new Set(
        pendientesSinSku
          .map((p) => familiaIdBySlug.get(p.familia_slug ?? ""))
          .filter((x): x is string => !!x),
      ),
    ];
    if (famIds.length > 0) {
      const { data: prodMatch } = await sb
        .from("productos")
        .select("sku, color_valiz, familia_id")
        .in("familia_id", famIds)
        .eq("status", "active");
      for (const p of prodMatch ?? []) {
        if (!p.familia_id || !p.color_valiz) continue;
        const fam = familias.find((f) => f.id === p.familia_id);
        if (!fam) continue;
        const key = `${fam.slug}|${p.color_valiz.toLowerCase()}`;
        skuBySlugColor.set(key, p.sku);
      }
    }
  }

  // Puntos por referidos (resumen para card)
  const admin = createAdminClient();
  const { data: refMovs } = await admin
    .from("puntos_movimientos")
    .select("delta")
    .eq("user_id", user.id)
    .eq("motivo", "referido");
  const ptsReferidos = (refMovs ?? []).reduce(
    (s, m) => s + (m.delta as number),
    0,
  );

  // Código de referido (lazy-assign si no tiene)
  const referidoCode = await getOrAssignReferidoCode(user.id, true);

  // Concurso vigente
  const nowIso = new Date().toISOString();
  const { data: concursoVigente } = await sb
    .from("concursos")
    .select("slug, titulo, premio_descripcion, termina_at")
    .lte("inicia_at", nowIso)
    .gte("termina_at", nowIso)
    .limit(1)
    .maybeSingle();

  // Puntos para el mapa personal
  const pointsPersonal: Point[] = bitacorasConGeo.map((b) => {
    const p = b.sku ? productoBySku.get(b.sku) : null;
    const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
    // Foto del PRODUCTO si existe, fallback a la subida
    const fotoProducto = b.sku ? photoBySku.get(b.sku) : null;
    return {
      id: b.id,
      lat: Number(b.lat),
      lng: Number(b.lng),
      foto: fotoProducto ?? b.foto_url,
      lugar: b.lugar,
      texto: b.texto,
      familia: fam?.name ?? null,
      colorValiz: p?.color_valiz ?? null,
    };
  });

  const nombre = profile.display_name || profile.email.split("@")[0];
  const primerLogin = !profile.welcomed_at;

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      {primerLogin && (
        <WelcomeModal
          nombre={nombre}
          piezas={totalPiezas}
          horas={Math.round(totalHoras)}
          pies={Math.round(totalPies)}
          puntos={profile.puntos_actuales}
          horasPorTallerista={Array.from(horasPorTallerista.entries())}
        />
      )}

      <header className="flex items-center justify-between border-b border-piedra px-6 py-4 sm:px-16 sm:py-5">
        <BrandMark variant="back" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Tu equipaje
        </p>
      </header>

      {/* HERO PERSONAL ----------------------------------------------- */}
      <section className="px-6 pt-8 sm:px-16 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Hola
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-6xl">
            {nombre}.
          </h1>
          {profile.handle && (
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
              @{profile.handle}
            </p>
          )}

          {/* MINI THUMBS de piezas */}
          {totalPiezas > 0 && (
            <div className="mt-6">
              <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                Tus piezas
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {equipaje.slice(0, 24).map((e, i) => {
                  const foto = photoBySku.get(e.sku);
                  const p = productoBySku.get(e.sku);
                  const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
                  return (
                    <li
                      key={`${e.sku}-${i}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-piedra bg-fondo sm:h-10 sm:w-10"
                      title={`${fam?.name ?? e.sku}${p?.color_valiz ? " · " + p.color_valiz : ""}`}
                    >
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={foto}
                          alt={fam?.name ?? e.sku}
                          className="h-[80%] w-[80%] rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-[8px] italic text-niebla">
                          {e.sku.slice(0, 4)}
                        </span>
                      )}
                    </li>
                  );
                })}
                {equipaje.length > 24 && (
                  <li className="flex h-8 w-8 items-center justify-center rounded-full border border-piedra font-sans text-[9px] text-niebla sm:h-10 sm:w-10">
                    +{equipaje.length - 24}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 3 stats inline (sin "Piezas" — los thumbs ya lo cuentan) */}
          <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-3 border-t border-piedra pt-5 sm:gap-x-10">
            <Stat
              label="Horas de taller"
              big={nf.format(Math.round(totalHoras))}
            />
            <Stat
              label="Pies² rescatados"
              big={nf.format(Math.round(totalPies))}
            />
            <Stat
              label="Puntos"
              big={nf.format(profile.puntos_actuales)}
              subtle="1 pt = $1 CLP"
            />
          </div>

          {horasPorTallerista.size > 0 && (
            <p className="mt-4 max-w-2xl font-serif text-sm italic leading-relaxed text-niebla">
              {Array.from(horasPorTallerista.entries())
                .map(([name, h]) => `${Math.round(h)}h de ${name}`)
                .join(" · ")}
              {cuerosUnicos.size > 0 &&
                ` · ${cuerosUnicos.size} ${cuerosUnicos.size === 1 ? "cuero" : "cueros"} distintos`}
              .
            </p>
          )}

          {profile.bio && (
            <p className="mt-3 max-w-2xl font-serif text-base italic leading-relaxed text-niebla">
              {profile.bio}
            </p>
          )}

          {/* Acciones del perfil */}
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.instagram_handle && (
              <a
                href={`https://instagram.com/${profile.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-85"
                style={{
                  background:
                    "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 20%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)",
                }}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.92 5.92 0 0 0-2.13 1.39A5.92 5.92 0 0 0 .62 4.14c-.3.76-.5 1.64-.56 2.91C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13a5.92 5.92 0 0 0 2.13 1.39c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.92 5.92 0 0 0 2.13-1.39 5.92 5.92 0 0 0 1.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.92 5.92 0 0 0-1.39-2.13A5.92 5.92 0 0 0 19.86.62c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
                </svg>
                @{profile.instagram_handle}
              </a>
            )}
            {profile.tiktok_handle && (
              <a
                href={`https://tiktok.com/@${profile.tiktok_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-black px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-85"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
                </svg>
                @{profile.tiktok_handle}
              </a>
            )}
            <Link
              href="/yo/perfil"
              className="border border-piedra px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-niebla transition-colors hover:border-cuero hover:text-cuero"
            >
              Editar perfil
            </Link>
            {profile.handle && (
              <Link
                href={`/u/${profile.handle}`}
                className="border border-piedra px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-niebla transition-colors hover:border-cuero hover:text-cuero"
              >
                Perfil público
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* TU MUNDO (mapa flotante sin caja) --------------------------- */}
      <section className="px-2 pt-10 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-baseline justify-between gap-4 px-4 sm:px-8">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Tu mundo
            </p>
            {bitacorasConGeo.length > 0 && (
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                {bitacorasConGeo.length}{" "}
                {bitacorasConGeo.length === 1 ? "viaje" : "viajes"}
              </p>
            )}
          </div>
          {bitacorasConGeo.length === 0 ? (
            <div className="mx-4 p-6 text-center sm:mx-8 sm:p-8">
              <p className="font-serif italic leading-relaxed text-niebla">
                Tu mundo está esperándote. Sube tu primer viaje con foto +
                ubicación y aparece aquí como un punto en el globo.
              </p>
              <Link
                href="/yo/bitacora/nueva"
                className="mt-5 inline-block bg-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
              >
                + Agregar mi primer viaje
              </Link>
            </div>
          ) : (
            <div className="aspect-square w-full overflow-hidden sm:aspect-[16/9]">
              <MapaColectivo points={pointsPersonal} />
            </div>
          )}
        </div>
      </section>

      {/* ACCIONES + CARDS DESTACADAS (compactadas) -------------------- */}
      <section className="px-6 pt-10 sm:px-16 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          {/* Botones acción primarias */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link
              href="/yo/bitacora/nueva"
              className="flex items-center justify-between gap-3 bg-tinta px-4 py-4 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero sm:px-6 sm:text-[11px]"
            >
              <span>+ Viaje</span>
              <span>→</span>
            </Link>
            <Link
              href="/yo/agregar-pieza"
              className="flex items-center justify-between gap-3 border border-tinta px-4 py-4 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo sm:px-6 sm:text-[11px]"
            >
              <span>+ Pieza</span>
              <span>→</span>
            </Link>
          </div>

          {/* Bloque destacado: tu código de referido */}
          {referidoCode && (
            <div className="mt-3 border border-cuero/30 bg-cuero/[0.04] px-4 py-3 sm:px-5 sm:py-4">
              <ReferidoCodigo
                code={referidoCode}
                nombre={
                  (profile?.display_name ?? "Tu").split(/\s+/)[0]
                }
                showCopy
              />
              {ptsReferidos > 0 && (
                <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                  Ya ganaste {nf.format(ptsReferidos)} pts por
                  referidos.
                </p>
              )}
            </div>
          )}

          {/* Cards destacadas */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <DestacadoCard
              tag="Recomienda Valiz"
              titulo="Comparte tu link"
              descripcion={
                ptsReferidos > 0
                  ? `Has ganado ${nf.format(ptsReferidos)} pts por ventas referidas.`
                  : "Quien compre con tu link tiene 5% off. Tú recibes 5% en pts."
              }
              href="/yo/referir"
              ctaLabel="Ver mi link →"
            />
            <DestacadoCard
              tag="Canjear puntos"
              titulo={`${nf.format(profile.puntos_actuales)} pts`}
              descripcion="1 pt = $1 CLP. Canjea por descuento en valiz.cl."
              href="/yo/canje"
              ctaLabel="Canjear →"
            />
            {concursoVigente ? (
              <DestacadoCard
                tag="Concurso vigente"
                titulo={concursoVigente.titulo}
                descripcion={
                  concursoVigente.premio_descripcion
                    ? `Premio: ${concursoVigente.premio_descripcion}`
                    : "Postula una de tus bitácoras."
                }
                href={`/concursos/${concursoVigente.slug}`}
                ctaLabel="Ver concurso →"
                accent
              />
            ) : (
              <DestacadoCard
                tag="Valiz colectivo"
                titulo="El mundo Valiz"
                descripcion="Mira todas las bitácoras subidas por la comunidad."
                href="/bitacora"
                ctaLabel="Explorar →"
              />
            )}
          </div>
        </div>
      </section>

      {/* DETALLE DE PIEZAS (grande, al final) ----------------------- */}
      <section className="px-6 pt-12 pb-12 sm:px-16 sm:pt-16 sm:pb-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Detalle de tus piezas
          </p>
          {totalPiezas === 0 ? (
            <div className="mt-4 space-y-3 max-w-2xl font-serif italic leading-relaxed text-niebla">
              <p>
                Si compraste antes con otro correo,{" "}
                <Link href="/yo/email-alt" className="not-italic text-cuero underline">
                  vincúlalo aquí
                </Link>{" "}
                — te mandamos un código y movemos tu historial.
              </p>
              <p>
                Si compraste fuera de valiz.cl,{" "}
                <Link href="/yo/agregar-pieza" className="not-italic text-cuero underline">
                  agrégala manualmente
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                Click en una pieza para ver foto, cuero, tallerista, horas y más.
              </p>
              <EquipajeGrid
                piezas={equipaje.map<EquipajePieza>((e) => {
                  const p = productoBySku.get(e.sku);
                  const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
                  const tName = p?.tallerista_id
                    ? talleristaById.get(p.tallerista_id)?.name ?? null
                    : null;
                  const cuero = pickOne(p?.cuero ?? null);
                  return {
                    sku: e.sku,
                    source: e.source as EquipajePieza["source"],
                    adquiridoAt: e.adquirido_at,
                    fotoUrl: photoBySku.get(e.sku) ?? null,
                    fotoFallback: null,
                    familiaName: fam?.name ?? null,
                    familiaSlug: fam?.slug ?? null,
                    colorValiz: p?.color_valiz ?? null,
                    cueroName: cuero?.display_name ?? null,
                    precio: (p?.precio as number | null) ?? null,
                    pies2: p?.p2 != null ? Number(p.p2) : null,
                    talleristaName: tName,
                    horasPorUnidad: fam?.hours_per_unit
                      ? Number(fam.hours_per_unit)
                      : null,
                    shopifyHandle: p?.shopify_handle ?? null,
                  };
                })}
              />
            </>
          )}

          {/* Pendientes por validar */}
          {pendientes.length > 0 && (
            <div className="mt-10 border-t border-piedra pt-6">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Por validar
              </p>
              <p className="mt-1 font-serif text-sm italic text-niebla">
                Las revisamos y otorgamos puntos retroactivos cuando confirmemos.
              </p>
              <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
                {pendientes.map((p) => {
                  const fotoSubida = p.foto_url;
                  const skuResolved =
                    p.sku ??
                    (p.familia_slug && p.color_valiz
                      ? skuBySlugColor.get(
                          `${p.familia_slug}|${p.color_valiz.toLowerCase()}`,
                        ) ?? null
                      : null);
                  const fotoProducto = skuResolved
                    ? photoBySku.get(skuResolved)
                    : null;
                  const foto = fotoSubida ?? fotoProducto ?? null;
                  return (
                    <li key={p.id} className="flex flex-col items-center">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-niebla bg-fondo sm:h-20 sm:w-20">
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={foto}
                            alt={p.color_valiz ?? "Pieza"}
                            className="h-[78%] w-[78%] rounded-full object-cover"
                          />
                        ) : (
                          <span className="font-serif text-[9px] italic text-niebla">
                            sin foto
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-center font-sans text-[9px] uppercase tracking-[0.15em] text-niebla leading-tight">
                        {familiaNamesBySlug.get(p.familia_slug ?? "") ??
                          p.familia_slug}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Valiz · Since 2018
        </p>
      </footer>
    </main>
  );
}

function Stat({
  label,
  big,
  subtle,
}: {
  label: string;
  big: string;
  subtle?: string;
}) {
  return (
    <div>
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-none tracking-[-0.02em] sm:text-4xl">
        {big}
      </p>
      {subtle && (
        <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.15em] text-niebla">
          {subtle}
        </p>
      )}
    </div>
  );
}

function DestacadoCard({
  tag,
  titulo,
  descripcion,
  href,
  ctaLabel,
  accent,
}: {
  tag: string;
  titulo: string;
  descripcion: string;
  href: string;
  ctaLabel: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between gap-4 border p-5 transition-colors ${
        accent
          ? "border-cuero bg-cuero text-fondo hover:bg-tinta"
          : "border-piedra bg-fondo hover:border-cuero"
      }`}
    >
      <div>
        <p
          className={`font-sans text-[10px] font-semibold uppercase tracking-[0.22em] ${
            accent ? "text-fondo/70" : "text-cuero"
          }`}
        >
          {tag}
        </p>
        <h3
          className={`mt-3 font-serif text-2xl leading-tight ${
            accent ? "text-fondo" : "text-tinta"
          }`}
        >
          {titulo}
        </h3>
        <p
          className={`mt-3 font-serif text-sm italic leading-relaxed ${
            accent ? "text-fondo/85" : "text-niebla"
          }`}
        >
          {descripcion}
        </p>
      </div>
      <p
        className={`font-sans text-[10px] font-semibold uppercase tracking-[0.22em] transition-transform group-hover:translate-x-1 ${
          accent ? "text-fondo" : "text-cuero"
        }`}
      >
        {ctaLabel}
      </p>
    </Link>
  );
}
