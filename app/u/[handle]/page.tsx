import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MapaColectivo } from "@/app/bitacora/mapa/mapa";
import { BrandMark } from "@/components/brand-mark";
import { ShareButton } from "@/components/share-button";
import { getPhotoBySku } from "@/lib/product-photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStaticClient } from "@/lib/supabase/static";

export const revalidate = 60;

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
      if (i.sku) equipaje.push({ sku: i.sku, fecha: o.paid_at, source: o.source });
    }
  }
  for (const m of (manualesRes.data ?? []) as {
    sku: string | null;
    fecha_compra: string | null;
  }[]) {
    if (m.sku)
      equipaje.push({ sku: m.sku, fecha: m.fecha_compra, source: "manual" });
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
        .select("sku, color_valiz, p2, familia_id")
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

  // Puntos para el globo personal: solo SUS bitácoras con coords
  const points = bitacoras
    .filter((b) => b.lat !== null && b.lng !== null)
    .map((b) => {
      const p = b.sku ? productoBySku.get(b.sku) : null;
      const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
      return {
        id: b.id,
        lat: Number(b.lat),
        lng: Number(b.lng),
        foto: b.foto_url,
        lugar: b.lugar,
        texto: b.texto,
        familia: fam?.name ?? null,
        colorValiz: p?.color_valiz ?? null,
      };
    });

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-6 py-4 sm:px-12 sm:py-5">
        <BrandMark variant="back" href="/bitacora" />
        <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
          Perfil
        </p>
      </header>

      {/* HERO + STATS + EQUIPAJE — todo denso en 1 viewport ------------ */}
      <section className="border-b border-piedra px-5 py-6 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Fila 1: avatar + nombre/handle/bio + sociales */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
            <div className="flex items-center gap-4 sm:block">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={nombre}
                  className="h-20 w-20 shrink-0 rounded-full border-2 border-piedra object-cover sm:h-28 sm:w-28 lg:h-32 lg:w-32"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-piedra bg-cuero font-serif text-3xl text-fondo sm:h-28 sm:w-28 sm:text-5xl lg:h-32 lg:w-32 lg:text-6xl">
                  {nombre.trim().charAt(0).toUpperCase() || "V"}
                </div>
              )}
              {/* Mobile: nombre al lado del avatar */}
              <div className="min-w-0 flex-1 sm:hidden">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  @{profile.handle}
                </p>
                <h1 className="mt-1 font-serif text-2xl leading-[1.02] tracking-[-0.02em]">
                  {nombre}
                </h1>
                {ubicacion && (
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                    {ubicacion}
                  </p>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {/* Desktop: nombre/handle aparte */}
              <div className="hidden sm:block">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  @{profile.handle}
                  {ubicacion && (
                    <span className="ml-2 text-niebla">· {ubicacion}</span>
                  )}
                </p>
                <h1 className="mt-2 font-serif text-4xl leading-[1.02] tracking-[-0.02em] lg:text-5xl">
                  {nombre}
                </h1>
              </div>
              {profile.bio && (
                <p className="mt-3 font-serif text-sm italic leading-relaxed text-tinta/75 sm:mt-3 sm:text-base">
                  {profile.bio}
                </p>
              )}
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
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
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
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
                    </svg>
                  </a>
                )}
                <ShareButton
                  title={`${nombre} · Valiz Bitácora`}
                  text={
                    profile.bio ??
                    `Equipaje y bitácoras de ${nombre} en Valiz.`
                  }
                  url={`/u/${profile.handle}`}
                  label="Compartir"
                />
              </div>
            </div>
          </div>

          {/* Fila 2: stats inline horizontales */}
          {equipaje.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-piedra pt-4 sm:gap-6">
              <Stat label="Piezas" big={nf.format(equipaje.length)} />
              <Stat
                label="Horas en taller"
                big={nf.format(Math.round(horasTotal))}
              />
              <Stat
                label="Pies² rescatados"
                big={nf.format(Math.round(piesTotal))}
              />
            </div>
          )}

          {/* Fila 3: equipaje como medallas inline (chips redondos) */}
          {equipaje.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-piedra pt-4">
              <p className="mr-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Su equipaje:
              </p>
              {equipaje.slice(0, 14).map((e, i) => {
                const p = productoBySku.get(e.sku);
                const fam = p?.familia_id
                  ? familiaById.get(p.familia_id)
                  : null;
                const foto = photoBySku.get(e.sku);
                return (
                  <Link
                    key={`${e.sku}-${i}`}
                    href={fam ? `/piezas/${fam.slug}` : "#"}
                    title={`${fam?.name ?? e.sku}${p?.color_valiz ? " · " + p.color_valiz : ""}`}
                    className="group flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-piedra bg-fondo transition-all hover:border-cuero hover:-translate-y-0.5"
                  >
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={foto}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-serif text-[8px] italic text-niebla">
                        {e.sku}
                      </span>
                    )}
                  </Link>
                );
              })}
              {equipaje.length > 14 && (
                <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                  +{equipaje.length - 14}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* MUNDO PERSONAL — globo con SUS bitácoras + feed lado a lado --- */}
      <section className="border-b border-piedra px-5 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-10">
            {/* Globo personal */}
            <div className="order-1">
              <p className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                {nombre.split(/\s+/)[0]} en el mundo
              </p>
              {points.length > 0 ? (
                <div className="aspect-square w-full overflow-hidden sm:aspect-[4/3] lg:aspect-square">
                  <MapaColectivo points={points} />
                </div>
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center bg-tinta/[0.02] p-8 text-center sm:aspect-[4/3] lg:aspect-square">
                  <p className="font-serif text-lg italic leading-relaxed text-niebla">
                    {nombre.split(/\s+/)[0]} todavía no ha marcado
                    bitácoras en el mapa.
                  </p>
                </div>
              )}
              {points.length > 0 && (
                <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                  {points.length}{" "}
                  {points.length === 1
                    ? "lugar marcado"
                    : "lugares marcados"}
                </p>
              )}
            </div>

            {/* Bitácoras compactas al lado */}
            <div className="order-2">
              <p className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Sus bitácoras
              </p>
              {bitacoras.length === 0 ? (
                <p className="font-serif text-base italic leading-relaxed text-niebla">
                  {nombre} todavía no ha subido bitácoras.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                  {bitacoras.slice(0, 6).map((b) => {
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
                          {b.lugar && (
                            <p className="bg-fondo px-2 py-1.5 font-sans text-[9px] uppercase tracking-[0.18em] text-niebla">
                              {b.lugar}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {bitacoras.length > 6 && (
                <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                  +{bitacoras.length - 6} más
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEED COMPLETO — solo si tiene más de 6 */}
      {bitacoras.length > 6 && (
        <section className="px-5 py-10 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Todas sus bitácoras
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
