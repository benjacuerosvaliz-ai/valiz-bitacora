import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MapaColectivo } from "@/app/bitacora/mapa/mapa";
import {
  EquipajeGrid,
  type EquipajePieza,
} from "@/app/yo/equipaje-grid";
import { BrandMark } from "@/components/brand-mark";
import { ReferidoCodigo } from "@/components/referido-codigo";
import { ShareButton } from "@/components/share-button";
import { WelcomeTour } from "@/components/welcome-tour";
import {
  getPhotoBySku,
  isNonProductSku,
  resolveProductPhoto,
} from "@/lib/product-photos";
import { getOrAssignReferidoCode } from "@/lib/referido";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";

// `force-dynamic` en vez de revalidate: la página depende de
// `auth.getUser()` para detectar si el visitante es el dueño (`esElDueno`)
// y mostrar la barra "Acciones rápidas" + sus secciones exclusivas.
// Con ISR cacheada, todos los visitantes verían la versión sin sesión.
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");

type ProfilePublic = {
  id: string;
  handle: string;
  display_name: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  avatar_url: string | null;
};

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  p2: number | string | null;
  familia_id: string | null;
  shopify_handle: string | null;
};

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

type BitacoraRow = {
  id: string;
  sku: string | null;
  foto_url: string;
  lugar: string | null;
  texto: string | null;
  lat: number | string | null;
  lng: number | string | null;
  created_at: string;
};

type EquipajeItem = {
  sku: string;
  fecha: string | null;
  source: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const sb = createStaticClient();
  const { data } = await sb
    .from("user_profiles_public")
    .select("display_name, handle, bio, city, country")
    .eq("handle", handle)
    .maybeSingle();
  if (!data) return { title: "Perfil" };
  const nombre = data.display_name ?? data.handle ?? "Usuario";
  const ubicacion = [data.city, data.country].filter(Boolean).join(", ");
  const description =
    data.bio?.slice(0, 200) ??
    `Equipaje, viajes y bitácoras de ${nombre}${ubicacion ? ` en ${ubicacion}` : ""} — Valiz.`;
  const url = `/u/${handle}`;
  return {
    title: nombre,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: nombre,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: nombre,
      description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const sb = createStaticClient();

  const { data: profileRaw } = await sb
    .from("user_profiles_public")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();
  const profile = profileRaw as ProfilePublic | null;
  if (!profile) notFound();

  // Resolver equipaje completo del user via admin client (bypass RLS).
  // Esta página es pública, intencionalmente exponemos el equipaje
  // — son las piezas Valiz a su nombre, parte de la identidad pública.
  const admin = createAdminClient();
  const { data: privateProfile } = await admin
    .from("user_profiles")
    .select("email, secondary_emails")
    .eq("id", profile.id)
    .single();

  const allEmails: string[] = [
    privateProfile?.email,
    ...((privateProfile?.secondary_emails as string[] | null) ?? []),
  ].filter(Boolean) as string[];

  // Equipaje: orders por email + compras manuales verificadas
  const [ordersRes, manualesRes, bitsRes] = await Promise.all([
    allEmails.length > 0
      ? admin
          .from("orders")
          .select("name, paid_at, source, order_items(sku)")
          .in("email", allEmails)
      : Promise.resolve({ data: [] }),
    admin
      .from("compras_manuales")
      .select("sku, fecha_compra")
      .eq("user_id", profile.id)
      .eq("verified", true),
    sb
      .from("bitacora_entries")
      .select("id, sku, foto_url, lugar, texto, lat, lng, created_at")
      .eq("user_id", profile.id)
      .eq("invalidated", false)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const equipaje: EquipajeItem[] = [];
  for (const o of (ordersRes.data ?? []) as {
    paid_at: string | null;
    source: string;
    order_items: { sku: string | null }[] | null;
  }[]) {
    for (const i of o.order_items ?? []) {
      // Excluir vouchers / tarjetas regalo / IDs numéricos misceláneos
      if (i.sku && !isNonProductSku(i.sku)) {
        equipaje.push({ sku: i.sku, fecha: o.paid_at, source: o.source });
      }
    }
  }
  for (const m of (manualesRes.data ?? []) as {
    sku: string | null;
    fecha_compra: string | null;
  }[]) {
    if (m.sku && !isNonProductSku(m.sku)) {
      equipaje.push({ sku: m.sku, fecha: m.fecha_compra, source: "manual" });
    }
  }
  equipaje.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

  const bitacoras = (bitsRes.data ?? []) as BitacoraRow[];

  // Hidratar productos + familias para todos los SKUs vistos
  const allSkus = [
    ...new Set([
      ...equipaje.map((e) => e.sku),
      ...bitacoras.map((b) => b.sku).filter(Boolean) as string[],
    ]),
  ];
  let productos: ProductoRow[] = [];
  let familias: FamiliaRow[] = [];
  if (allSkus.length > 0) {
    const [pRes, fRes] = await Promise.all([
      sb
        .from("productos")
        .select("sku, color_valiz, p2, familia_id, shopify_handle")
        .in("sku", allSkus),
      sb.from("familias").select("id, slug, name, hours_per_unit"),
    ]);
    productos = (pRes.data ?? []) as ProductoRow[];
    familias = (fRes.data ?? []) as FamiliaRow[];
  }
  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaById = new Map(familias.map((f) => [f.id, f]));
  const photoBySku = getPhotoBySku();

  // Stats de impacto
  let horasTotal = 0;
  let piesTotal = 0;
  for (const e of equipaje) {
    const p = productoBySku.get(e.sku);
    if (!p) continue;
    const fam = p.familia_id ? familiaById.get(p.familia_id) : null;
    horasTotal += Number(fam?.hours_per_unit ?? 0);
    piesTotal += Number(p.p2 ?? 0);
  }

  const nombre = profile.display_name ?? profile.handle;
  const ubicacion = [profile.city, profile.country].filter(Boolean).join(", ");

  // Código de referido del dueño del perfil. Si visita su propio
  // perfil logueado y no tiene código, se le asigna uno automático del
  // pool. Para visitantes anónimos, solo mostramos el código si ya
  // estaba asignado (no consumimos pool por curiosos).
  //
  // IMPORTANTE: createStaticClient (sb) NO lee cookies — para detectar
  // al user logueado necesitamos el server client que sí las maneja.
  const serverSb = await createServerClient();
  const {
    data: { user: currentUser },
  } = await serverSb.auth.getUser();
  const esElDueno = currentUser?.id === profile.id;
  const referidoCode = await getOrAssignReferidoCode(
    profile.id,
    esElDueno,
  );

  // Saldo de puntos del dueño (público — motiva a otros a ganarlos)
  // También welcomed_at para saber si es primer login (mostrar tour).
  const { data: dueno } = await admin
    .from("user_profiles")
    .select("puntos_actuales, welcomed_at")
    .eq("id", profile.id)
    .maybeSingle();
  const puntosTotal = Number(dueno?.puntos_actuales ?? 0);
  const isFirstLogin = esElDueno && !dueno?.welcomed_at;

  // Si es primer login, otorgar 5000 pts de bienvenida (idempotente).
  // Doble chequeo: tanto si fue pre-poblado (motivo='bono_bienvenida')
  // como si lo otorgó esta misma ruta antes (motivo='ajuste_admin' con
  // refId 'bienvenida:<id>'), no volver a insertar.
  const PUNTOS_BIENVENIDA = 2000;
  if (isFirstLogin) {
    const refId = `bienvenida:${profile.id}`;
    const [{ count: yaAjuste }, { count: yaBono }] = await Promise.all([
      admin
        .from("puntos_movimientos")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", profile.id)
        .eq("motivo", "ajuste_admin")
        .eq("referencia_id", refId),
      admin
        .from("puntos_movimientos")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", profile.id)
        .eq("motivo", "bono_bienvenida"),
    ]);
    if ((yaAjuste ?? 0) === 0 && (yaBono ?? 0) === 0) {
      await admin.from("puntos_movimientos").insert({
        user_id: profile.id,
        delta: PUNTOS_BIENVENIDA,
        motivo: "ajuste_admin",
        referencia_id: refId,
      });
    }
  }

  // Datos EXTRA solo si es el dueño viendo su propio perfil:
  // compras manuales pendientes, equipaje detallado, concurso vigente.
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
  type ProductoEnriquecido = {
    sku: string;
    color_valiz: string | null;
    p2: number | string | null;
    familia_id: string | null;
    precio: number | null;
    shopify_handle: string | null;
    tallerista_id: string | null;
    cuero: { display_name: string } | { display_name: string }[] | null;
  };
  type TalleristaRow = { id: string; name: string };
  type ConcursoVigente = {
    slug: string;
    titulo: string;
    premio_descripcion: string | null;
  };
  let pendientes: CompraManualRow[] = [];
  let equipajeDetalle: EquipajePieza[] = [];
  let concursoVigente: ConcursoVigente | null = null;

  if (esElDueno) {
    const [pendRes, prodEnrRes, talleristasRes, concursoRes] =
      await Promise.all([
        admin
          .from("compras_manuales")
          .select(
            "id, sku, familia_slug, color_valiz, lugar_compra, fecha_compra, foto_url, verified, created_at",
          )
          .eq("user_id", profile.id)
          .eq("verified", false)
          .order("created_at", { ascending: false }),
        allSkus.length > 0
          ? sb
              .from("productos")
              .select(
                "sku, color_valiz, p2, familia_id, precio, shopify_handle, tallerista_id, cuero:cueros(display_name)",
              )
              .in("sku", allSkus)
          : Promise.resolve({ data: [] }),
        sb.from("talleristas").select("id, name"),
        (async () => {
          const nowIso = new Date().toISOString();
          return await sb
            .from("concursos")
            .select("slug, titulo, premio_descripcion")
            .lte("inicia_at", nowIso)
            .gte("termina_at", nowIso)
            .limit(1)
            .maybeSingle();
        })(),
      ]);

    pendientes = (pendRes.data ?? []) as CompraManualRow[];
    concursoVigente = (concursoRes.data ?? null) as ConcursoVigente | null;

    const prodEnrBySku = new Map(
      ((prodEnrRes.data ?? []) as ProductoEnriquecido[]).map((p) => [p.sku, p]),
    );
    const talleristaById = new Map(
      ((talleristasRes.data ?? []) as TalleristaRow[]).map((t) => [t.id, t]),
    );

    equipajeDetalle = equipaje.map((e) => {
      const p = prodEnrBySku.get(e.sku);
      const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
      const tallerista = p?.tallerista_id
        ? talleristaById.get(p.tallerista_id)
        : null;
      const cuero = Array.isArray(p?.cuero) ? p?.cuero[0] : p?.cuero;
      const fotoRes = resolveProductPhoto(e.sku);
      return {
        sku: e.sku,
        source: e.source as "shopify" | "manual",
        adquiridoAt: e.fecha,
        fotoUrl: fotoRes?.foto ?? null,
        fotoFallback: null,
        esHistorico: fotoRes?.esHistorico ?? false,
        familiaName: fam?.name ?? null,
        familiaSlug: fam?.slug ?? null,
        colorValiz: p?.color_valiz ?? null,
        cueroName: cuero?.display_name ?? null,
        precio: p?.precio ?? null,
        pies2: p ? Number(p.p2 ?? 0) : null,
        talleristaName: tallerista?.name ?? null,
        horasPorUnidad: fam ? Number(fam.hours_per_unit ?? 0) : null,
        shopifyHandle: p?.shopify_handle ?? null,
      };
    });
  }

  const primerNombre = nombre.split(/\s+/)[0];
  const shareTitle = referidoCode
    ? `${nombre} te regala 15% off en Valiz`
    : `${nombre} · Valiz Bitácora`;
  const shareText = referidoCode
    ? `Usa el código ${referidoCode} en valiz.cl y obtenés 15% off en tu primera compra Valiz. Es de ${primerNombre} — pásate a ver su bitácora.`
    : profile.bio ?? `Equipaje y bitácoras de ${nombre} en Valiz.`;

  // Puntos para el globo personal: solo SUS bitácoras con coords
  // Foto del globo = foto del PRODUCTO (PNG Valiz), no la del user.
  // resolveProductPhoto detecta SKUs antiguos por prefix de familia y
  // devuelve foto fallback (B&N para indicar "histórico color desconocido").
  const points = bitacoras
    .filter((b) => b.lat !== null && b.lng !== null)
    .map((b) => {
      const p = b.sku ? productoBySku.get(b.sku) : null;
      const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
      const fotoRes = resolveProductPhoto(b.sku);
      return {
        id: b.id,
        lat: Number(b.lat),
        lng: Number(b.lng),
        foto: fotoRes?.foto ?? b.foto_url,
        lugar: b.lugar,
        texto: b.texto,
        familia: fam?.name ?? null,
        colorValiz: p?.color_valiz ?? null,
      };
    });

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      {/* Tour de bienvenida — solo primer login del dueño */}
      {isFirstLogin && (
        <WelcomeTour
          nombre={nombre}
          piezas={equipaje.length}
          horas={Math.round(horasTotal)}
          pies={Math.round(piesTotal)}
          puntosBienvenida={PUNTOS_BIENVENIDA}
          referidoCode={referidoCode}
          handle={profile.handle}
          perfilActual={{
            avatarUrl: profile.avatar_url ?? null,
            displayName: profile.display_name ?? null,
            instagramHandle: profile.instagram_handle ?? null,
            tiktokHandle: profile.tiktok_handle ?? null,
            city: profile.city ?? null,
          }}
        />
      )}

      <header className="flex items-center justify-between border-b border-piedra px-6 py-4 sm:px-12 sm:py-5">
        <BrandMark variant="back" href="/bitacora" />
        <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
          {esElDueno ? "Tu perfil" : "Perfil"}
        </p>
      </header>

      {/* Barra del dueño (solo visible cuando el visitante es el dueño
          logueado). Accesos rápidos a las acciones más comunes. El CTA
          principal "+ Bitácora" va destacado como botón. */}
      {esElDueno && (
        <div className="border-b border-piedra bg-tinta/[0.025] px-5 py-3 sm:px-10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <Link
              href="/yo/bitacora/nueva"
              className="inline-flex items-center gap-2 bg-cuero px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta"
            >
              + Subir bitácora
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <Link
                href="/yo/agregar-pieza"
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-tinta transition-colors hover:text-cuero"
              >
                + Pieza
              </Link>
              <Link
                href="/yo/canje"
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-tinta transition-colors hover:text-cuero"
              >
                Canjear saldo
              </Link>
              <Link
                href="/yo/perfil"
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-tinta transition-colors hover:text-cuero"
              >
                Editar perfil
              </Link>
              <Link
                href="/yo/referir"
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cuero transition-colors hover:text-tinta"
              >
                Compartir mi link →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CONSTELACIÓN — identidad + medallas al lado del nombre +
          globo central + datos alrededor. Pensada para verse completa
          en 1 viewport sin scroll. */}
      <section className="border-b border-piedra px-4 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto max-w-6xl">
          {/* IDENTIDAD: avatar + (nombre/handle/ciudad + medallas) +
              redes a la derecha. En mobile las redes pasan a fila
              propia para no chocar con el handle largo. */}
          <div className="flex items-start gap-3 sm:gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={nombre}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-piedra object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-piedra bg-cuero font-serif text-2xl text-fondo sm:h-20 sm:w-20 sm:text-4xl">
                {nombre.trim().charAt(0).toUpperCase() || "V"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl leading-[1.02] tracking-[-0.02em] sm:text-3xl lg:text-4xl">
                {nombre}
              </h1>
              <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                <span className="text-cuero">@{profile.handle}</span>
                {ubicacion && <span> · {ubicacion}</span>}
              </p>

              {/* Medallas — al lado del nombre, dentro de la columna
                  de identidad. Wrap natural si hay muchas. */}
              {equipaje.length > 0 && (
                <div className="mt-2">
                  <EquipajeMedallas
                    equipaje={equipaje}
                    productoBySku={productoBySku}
                    familiaById={familiaById}
                    photoBySku={photoBySku}
                    size="md"
                    max={20}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Redes + Share — fila propia para no chocar con handles
              largos en mobile. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {profile.instagram_handle && (
              <a
                href={`https://instagram.com/${profile.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram @${profile.instagram_handle}`}
                title={`@${profile.instagram_handle}`}
                className="inline-flex h-8 w-8 items-center justify-center text-white transition-opacity hover:opacity-85"
                style={{
                  background:
                    "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 20%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)",
                }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.92 5.92 0 0 0-2.13 1.39A5.92 5.92 0 0 0 .62 4.14c-.3.76-.5 1.64-.56 2.91C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13a5.92 5.92 0 0 0 2.13 1.39c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.92 5.92 0 0 0 2.13-1.39 5.92 5.92 0 0 0 1.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.92 5.92 0 0 0-1.39-2.13A5.92 5.92 0 0 0 19.86.62c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
                </svg>
              </a>
            )}
            {profile.tiktok_handle && (
              <a
                href={`https://tiktok.com/@${profile.tiktok_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`TikTok @${profile.tiktok_handle}`}
                title={`@${profile.tiktok_handle}`}
                className="inline-flex h-8 w-8 items-center justify-center bg-black text-white transition-opacity hover:opacity-85"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
                </svg>
              </a>
            )}
            <ShareButton
              title={shareTitle}
              text={shareText}
              url={`/u/${profile.handle}`}
              label={referidoCode ? "Regalar 15% off" : "Compartir"}
              highlight={!!referidoCode}
            />
          </div>

          {profile.bio && (
            <p className="mt-3 max-w-2xl font-serif text-sm italic leading-relaxed text-tinta/75 sm:text-base">
              {profile.bio}
            </p>
          )}

          {/* CONSTELACIÓN: stats izq · GLOBO centro · saldo+código der.
              Mt reducido para que el globo quede cerca de la identidad
              y las medallas. */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-5">
            {/* IZQUIERDA — stats de impacto (desktop) */}
            <div className="hidden flex-col justify-center gap-6 lg:flex">
              {equipaje.length > 0 && (
                <>
                  <Stat
                    label="Piezas"
                    big={nf.format(equipaje.length)}
                  />
                  <Stat
                    label="Horas en taller"
                    big={nf.format(Math.round(horasTotal))}
                  />
                  <Stat
                    label="Pies² rescatados"
                    big={nf.format(Math.round(piesTotal))}
                  />
                </>
              )}
              {points.length > 0 && (
                <Stat
                  label={points.length === 1 ? "Lugar marcado" : "Lugares marcados"}
                  big={nf.format(points.length)}
                />
              )}
            </div>

            {/* CENTRO — el GLOBO, protagonista */}
            <div className="relative order-first lg:order-none">
              <p className="mb-1 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                {nombre.split(/\s+/)[0]} en el mundo
              </p>
              {points.length > 0 ? (
                <div className="aspect-square w-full overflow-hidden">
                  <MapaColectivo points={points} />
                </div>
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center bg-tinta/[0.02] p-8 text-center">
                  <p className="font-serif text-base italic leading-relaxed text-niebla">
                    {nombre.split(/\s+/)[0]} todavía no ha marcado
                    bitácoras en el mapa.
                  </p>
                  {esElDueno && (
                    <Link
                      href="/yo/bitacora/nueva"
                      className="mt-4 inline-flex items-center gap-2 bg-cuero px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta"
                    >
                      + Subir tu primera bitácora
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* DERECHA — saldo destacado + código de referido */}
            <div className="hidden flex-col justify-center gap-5 lg:flex">
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  Acumulado en valiz.cl
                </p>
                <p className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em] text-tinta">
                  ${nf.format(puntosTotal)}
                </p>
                <p className="mt-1 font-serif text-xs italic text-niebla">
                  Canjeable desde $25.000
                </p>
              </div>
              {referidoCode && (
                <div className="border-t border-piedra pt-5">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                    {primerNombre} regala 15% off
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.18em] text-cuero">
                    {referidoCode}
                  </p>
                  <p className="mt-1 font-serif text-xs italic text-niebla">
                    Usalo en valiz.cl en tu primera compra
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE — stats compactas debajo del globo (sin border-t
              para que queden pegadas al mapa) */}
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6 lg:hidden">
            {equipaje.length > 0 && (
              <>
                <Stat label="Piezas" big={nf.format(equipaje.length)} />
                <Stat
                  label="Horas en taller"
                  big={nf.format(Math.round(horasTotal))}
                />
                <Stat
                  label="Pies² rescatados"
                  big={nf.format(Math.round(piesTotal))}
                />
              </>
            )}
            <Stat
              label="Acumulado"
              big={`$${nf.format(puntosTotal)}`}
            />
          </div>

          {/* MOBILE — código de referido full-width */}
          {referidoCode && (
            <div className="mt-3 lg:hidden">
              <ReferidoCodigo
                code={referidoCode}
                nombre={primerNombre}
                showCopy
              />
            </div>
          )}
        </div>
      </section>

      {/* SUS BITÁCORAS — sección aparte, solo si tiene */}
      {bitacoras.length > 0 && (
        <section className="border-b border-piedra px-5 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Sus bitácoras
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {bitacoras.map((b) => {
                const p = b.sku ? productoBySku.get(b.sku) : null;
                const fam = p?.familia_id
                  ? familiaById.get(p.familia_id)?.name
                  : null;
                return (
                  <li key={b.id}>
                    <Link
                      href={`/bitacora/${b.id}`}
                      className="group block overflow-hidden border border-piedra transition-colors hover:border-cuero"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.foto_url}
                        alt={fam ?? "Bitácora"}
                        className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="bg-fondo px-2 py-2">
                        {fam && (
                          <p className="font-serif text-xs text-tinta">
                            {fam}
                          </p>
                        )}
                        {b.lugar && (
                          <p className="mt-0.5 font-sans text-[9px] uppercase tracking-[0.18em] text-niebla">
                            {b.lugar}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* SECCIONES EXCLUSIVAS DEL DUEÑO -------------------------------- */}
      {esElDueno && (
        <>
          {/* Concurso vigente como CTA */}
          {concursoVigente && (
            <section className="border-t border-piedra bg-cuero/5 px-5 py-6 sm:px-10 sm:py-8">
              <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                    Concurso vigente · postula tu bitácora
                  </p>
                  <p className="mt-1 font-serif text-xl leading-tight">
                    {concursoVigente.titulo}
                  </p>
                  {concursoVigente.premio_descripcion && (
                    <p className="mt-1 font-serif text-sm italic text-niebla">
                      Premio: {concursoVigente.premio_descripcion}
                    </p>
                  )}
                </div>
                <Link
                  href={`/concursos/${concursoVigente.slug}`}
                  className="border border-cuero bg-cuero px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta hover:border-tinta"
                >
                  Postular →
                </Link>
              </div>
            </section>
          )}

          {/* Pendientes por validar */}
          {pendientes.length > 0 && (
            <section className="border-t border-piedra px-5 py-8 sm:px-10 sm:py-10">
              <div className="mx-auto max-w-5xl">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  Por validar
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.015em] sm:text-3xl">
                  {pendientes.length === 1
                    ? "Una pieza esperando aprobación."
                    : `${pendientes.length} piezas esperando aprobación.`}
                </h2>
                <p className="mt-2 font-serif text-sm italic text-niebla">
                  Las revisamos manualmente. Te avisamos por mail cuando
                  estén listas.
                </p>
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {pendientes.slice(0, 8).map((p) => (
                    <li
                      key={p.id}
                      className="border border-piedra bg-fondo overflow-hidden"
                    >
                      {p.foto_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.foto_url}
                          alt={p.familia_slug ?? "Pendiente"}
                          className="aspect-square w-full object-cover"
                        />
                      )}
                      <div className="p-2">
                        <p className="font-serif text-sm leading-tight">
                          {p.familia_slug ?? "Pieza manual"}
                        </p>
                        {p.color_valiz && (
                          <p className="mt-0.5 font-sans text-[9px] uppercase tracking-[0.18em] text-cuero">
                            {p.color_valiz}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Equipaje detallado (cards grandes) */}
          {equipajeDetalle.length > 0 && (
            <section className="border-t border-piedra px-5 py-10 sm:px-10 sm:py-14">
              <div className="mx-auto max-w-5xl">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                      Tu equipaje en detalle
                    </p>
                    <h2 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.015em] sm:text-3xl">
                      Cada pieza, su historia.
                    </h2>
                    <p className="mt-2 font-serif text-sm italic text-niebla">
                      Toca una pieza para subir una bitácora con foto y
                      lugar. Cada bitácora suma $200 a tu saldo.
                    </p>
                  </div>
                  <Link
                    href="/yo/bitacora/nueva"
                    className="inline-flex items-center gap-2 border border-cuero bg-cuero px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta hover:border-tinta"
                  >
                    + Subir bitácora
                  </Link>
                </div>
                <div className="mt-6">
                  <EquipajeGrid piezas={equipajeDetalle} />
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Stat({ label, big }: { label: string; big: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-none tracking-[-0.02em] text-tinta sm:text-4xl">
        {big}
      </p>
    </div>
  );
}

/**
 * Medallas circulares con foto del producto, en fila. Va dentro del
 * bloque de identidad (debajo de la ubicación) para que el equipaje se
 * lea como parte de quién es la persona, no como sección aparte.
 */
function EquipajeMedallas({
  equipaje,
  productoBySku,
  familiaById,
  photoBySku,
  size,
  max,
}: {
  equipaje: EquipajeItem[];
  productoBySku: Map<string, ProductoRow>;
  familiaById: Map<string, FamiliaRow>;
  photoBySku: Map<string, string>;
  size: "sm" | "md";
  max: number;
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const overflow = equipaje.length - max;
  // Suppress unused warning — photoBySku se mantiene en la firma por
  // backwards compatibility pero ya usamos resolveProductPhoto
  void photoBySku;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {equipaje.slice(0, max).map((e, i) => {
        const p = productoBySku.get(e.sku);
        const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
        const fotoRes = resolveProductPhoto(e.sku);
        const tituloFam = fam?.name ?? null;
        const tituloColor = p?.color_valiz ?? null;
        const titulo = tituloFam
          ? `${tituloFam}${tituloColor ? " · " + tituloColor : ""}`
          : fotoRes?.esHistorico
            ? "Pieza histórica · color no identificado"
            : e.sku;
        // Link a Shopify: si tiene handle activo, va a la página del
        // producto. Si no (pieza vieja/discontinuada), va al home de
        // valiz.cl para que descubra el catálogo actual.
        const shopifyUrl = p?.shopify_handle
          ? `https://www.valiz.cl/products/${p.shopify_handle}`
          : "https://www.valiz.cl";
        return (
          <a
            key={`${e.sku}-${i}`}
            href={shopifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`${titulo} — comprar en valiz.cl`}
            className={`group flex ${dim} items-center justify-center overflow-hidden rounded-full border border-piedra bg-fondo transition-all hover:border-cuero hover:-translate-y-0.5`}
          >
            {fotoRes ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoRes.foto}
                alt=""
                className={`h-full w-full object-cover ${fotoRes.esHistorico ? "grayscale opacity-80" : ""}`}
              />
            ) : (
              <span className="font-serif text-[7px] italic text-niebla">
                {e.sku.slice(0, 3)}
              </span>
            )}
          </a>
        );
      })}
      {overflow > 0 && (
        <span className="ml-1 font-sans text-[9px] uppercase tracking-[0.18em] text-niebla">
          +{overflow}
        </span>
      )}
    </div>
  );
}
