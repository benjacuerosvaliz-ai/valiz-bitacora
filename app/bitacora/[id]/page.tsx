import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

type BitacoraDetail = {
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sb = createStaticClient();
  const { data } = await sb
    .from("bitacora_entries")
    .select("lugar, texto, user_id")
    .eq("id", id)
    .eq("invalidated", false)
    .maybeSingle();
  if (!data) return { title: "Bitácora" };
  const title = data.lugar ?? "Bitácora";
  const description =
    data.texto?.slice(0, 200) ??
    `Bitácora desde ${data.lugar ?? "algún lugar"} en Valiz.`;
  const url = `/bitacora/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BitacoraDetailPage({ params }: Props) {
  const { id } = await params;
  const sb = createStaticClient();
  const { data } = await sb
    .from("bitacora_entries")
    .select("id, user_id, sku, foto_url, lat, lng, lugar, texto, created_at")
    .eq("id", id)
    .eq("invalidated", false)
    .maybeSingle();
  if (!data) notFound();
  const b = data as BitacoraDetail;

  const [profileRes, prodRes] = await Promise.all([
    sb
      .from("user_profiles_public")
      .select("display_name, handle")
      .eq("id", b.user_id)
      .maybeSingle(),
    b.sku
      ? sb
          .from("productos")
          .select("color_valiz, familia_id, shopify_handle, familias(slug, name)")
          .eq("sku", b.sku)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const author = profileRes.data as
    | { display_name: string | null; handle: string | null }
    | null;
  const prod = prodRes.data as
    | {
        color_valiz: string | null;
        familia_id: string | null;
        shopify_handle: string | null;
        familias: { slug: string; name: string } | { slug: string; name: string }[] | null;
      }
    | null;

  const familia = prod
    ? Array.isArray(prod.familias)
      ? prod.familias[0]
      : prod.familias
    : null;

  const authorLabel =
    author?.display_name ?? author?.handle ?? "Anónimo";

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/bitacora" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Bitácora
        </p>
      </header>

      <article className="px-8 py-12 sm:px-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[3fr_2fr] lg:gap-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.foto_url}
            alt={b.lugar ?? "Bitácora Valiz"}
            className="w-full border border-piedra object-cover"
          />

          <div>
            {familia && (
              <Link
                href={`/piezas/${familia.slug}`}
                className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
              >
                {familia.name}
                {prod?.color_valiz && ` · ${prod.color_valiz}`}
              </Link>
            )}
            <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              {b.lugar ?? "Sin lugar"}
            </h1>

            {b.texto && (
              <p className="mt-8 whitespace-pre-line font-serif text-lg leading-relaxed sm:text-xl">
                {b.texto}
              </p>
            )}

            <div className="mt-12 border-t border-piedra pt-6">
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                {author?.handle ? (
                  <Link
                    href={`/u/${author.handle}`}
                    className="text-cuero hover:text-tinta"
                  >
                    {authorLabel}
                  </Link>
                ) : (
                  authorLabel
                )}{" "}
                ·{" "}
                {new Date(b.created_at).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {b.lat !== null && b.lng !== null && (
                <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                  {Number(b.lat).toFixed(4)}, {Number(b.lng).toFixed(4)}
                </p>
              )}
            </div>

            {prod?.shopify_handle && (
              <a
                href={`https://www.valiz.cl/products/${prod.shopify_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
              >
                Ver pieza en valiz.cl →
              </a>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
