import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
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
    .select("display_name, handle")
    .eq("handle", handle)
    .maybeSingle();
  const nombre = data?.display_name ?? data?.handle ?? "Usuario";
  return {
    title: `${nombre} · Valiz Bitácora`,
    description: `Equipaje y bitácoras de ${nombre} en Valiz.`,
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
      .select("id, sku, foto_url, lugar, texto, created_at")
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

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/bitacora" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Perfil público
        </p>
      </header>

      {/* HERO PERSONA -------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-16 sm:px-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            @{profile.handle}
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            {nombre}.
          </h1>
          {ubicacion && (
            <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
              {ubicacion}
            </p>
          )}
          {profile.bio && (
            <p className="mt-8 max-w-2xl font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
              {profile.bio}
            </p>
          )}

          {(profile.instagram_handle || profile.tiktok_handle) && (
            <div className="mt-10 flex flex-wrap gap-3">
              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-tinta px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
                >
                  Instagram @{profile.instagram_handle} ↗
                </a>
              )}
              {profile.tiktok_handle && (
                <a
                  href={`https://tiktok.com/@${profile.tiktok_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-tinta px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
                >
                  TikTok @{profile.tiktok_handle} ↗
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* STATS DE IMPACTO --------------------------------------------- */}
      {equipaje.length > 0 && (
        <section className="border-b border-piedra px-8 py-12 sm:px-16 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Lo que ha movido
            </p>
            <div className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4">
              <Stat label="Piezas Valiz" big={nf.format(equipaje.length)} />
              <Stat
                label="Horas de taller"
                big={nf.format(Math.round(horasTotal))}
              />
              <Stat
                label="Pies² rescatados"
                big={nf.format(Math.round(piesTotal))}
              />
            </div>
          </div>
        </section>
      )}

      {/* SU EQUIPAJE COMPLETO ----------------------------------------- */}
      {equipaje.length > 0 && (
        <section className="border-b border-piedra px-8 py-16 sm:px-16">
          <div className="mx-auto max-w-4xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Su equipaje
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
              {equipaje.length === 1
                ? "Una pieza Valiz."
                : `${nf.format(equipaje.length)} piezas Valiz.`}
            </h2>
            <ul className="mt-10 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
              {equipaje.map((e, i) => {
                const p = productoBySku.get(e.sku);
                const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
                const foto = photoBySku.get(e.sku);
                return (
                  <li
                    key={`${e.sku}-${i}`}
                    className="flex flex-col items-center"
                  >
                    <Link
                      href={fam ? `/piezas/${fam.slug}` : "#"}
                      className="group flex h-16 w-16 items-center justify-center rounded-full border border-piedra bg-fondo transition-colors hover:border-cuero sm:h-20 sm:w-20"
                      title={`${fam?.name ?? e.sku}${
                        p?.color_valiz ? " · " + p.color_valiz : ""
                      }`}
                    >
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={foto}
                          alt={fam?.name ?? e.sku}
                          className="h-[78%] w-[78%] rounded-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="font-serif text-[10px] italic text-niebla">
                          {e.sku}
                        </span>
                      )}
                    </Link>
                    <p className="mt-2 text-center font-sans text-[9px] uppercase tracking-[0.15em] text-niebla leading-tight">
                      {fam?.name ?? e.sku}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* FEED DE BITÁCORAS ------------------------------------------- */}
      <section className="px-8 py-16 sm:px-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Sus bitácoras
          </p>
          {bitacoras.length === 0 ? (
            <p className="mt-6 font-serif italic text-niebla">
              {nombre} todavía no ha subido bitácoras.
            </p>
          ) : (
            <>
              <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
                {bitacoras.length}{" "}
                {bitacoras.length === 1 ? "entrada" : "entradas"}.
              </h2>
              <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {bitacoras.map((b) => {
                  const p = b.sku ? productoBySku.get(b.sku) : null;
                  const fam = p?.familia_id
                    ? familiaById.get(p.familia_id)?.name
                    : null;
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
                            {formatDate(b.created_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
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
      <p className="mt-2 font-serif text-3xl leading-none tracking-[-0.02em] text-tinta sm:text-4xl">
        {big}
      </p>
    </div>
  );
}
