import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

type Concurso = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  premio_descripcion: string | null;
  inicia_at: string;
  termina_at: string;
  ganador_user_id: string | null;
  ganador_bitacora_id: string | null;
  ganador_anunciado_at: string | null;
};

type ParticipacionRow = {
  bitacora_id: string;
  user_id: string;
};

type BitacoraRow = {
  id: string;
  foto_url: string;
  lugar: string | null;
  texto: string | null;
  sku: string | null;
  user_id: string;
};

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  familia_id: string | null;
};

type FamiliaRow = { id: string; name: string };

type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

function estadoConcurso(c: Concurso): "actual" | "futuro" | "cerrado" {
  const now = Date.now();
  if (now < new Date(c.inicia_at).getTime()) return "futuro";
  if (now > new Date(c.termina_at).getTime()) return "cerrado";
  return "actual";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sb = createStaticClient();
  const { data } = await sb
    .from("concursos")
    .select("titulo, descripcion")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: data ? `${data.titulo} · Concurso Valiz` : "Concurso · Valiz",
    description: data?.descripcion ?? undefined,
  };
}

export default async function ConcursoDetailPage({ params }: Props) {
  const { slug } = await params;
  const sb = createStaticClient();
  const { data: concursoRaw } = await sb
    .from("concursos")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!concursoRaw) notFound();
  const concurso = concursoRaw as Concurso;
  const estado = estadoConcurso(concurso);

  const { data: partsRaw } = await sb
    .from("concurso_participaciones")
    .select("bitacora_id, user_id")
    .eq("concurso_id", concurso.id);
  const parts = (partsRaw ?? []) as ParticipacionRow[];

  const bitIds = parts.map((p) => p.bitacora_id);
  const userIds = [...new Set(parts.map((p) => p.user_id))];

  const [bitsRes, profsRes] = await Promise.all([
    bitIds.length > 0
      ? sb
          .from("bitacora_entries")
          .select("id, foto_url, lugar, texto, sku, user_id")
          .in("id", bitIds)
          .eq("invalidated", false)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? sb
          .from("user_profiles_public")
          .select("id, display_name, handle")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  const bitacoras = (bitsRes.data ?? []) as BitacoraRow[];
  const profiles = (profsRes.data ?? []) as ProfileRow[];

  // Resolver familia + color
  const skus = [...new Set(bitacoras.map((b) => b.sku).filter(Boolean) as string[])];
  let productos: ProductoRow[] = [];
  let familias: FamiliaRow[] = [];
  if (skus.length > 0) {
    const [pRes, fRes] = await Promise.all([
      sb
        .from("productos")
        .select("sku, color_valiz, familia_id")
        .in("sku", skus),
      sb.from("familias").select("id, name"),
    ]);
    productos = (pRes.data ?? []) as ProductoRow[];
    familias = (fRes.data ?? []) as FamiliaRow[];
  }
  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaNameById = new Map(familias.map((f) => [f.id, f.name]));
  const profileByUser = new Map(profiles.map((p) => [p.id, p]));

  // Ganador
  const ganadorBit = concurso.ganador_bitacora_id
    ? bitacoras.find((b) => b.id === concurso.ganador_bitacora_id)
    : null;
  const ganadorProfile = concurso.ganador_user_id
    ? profileByUser.get(concurso.ganador_user_id)
    : null;

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/concursos" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Concurso
        </p>
      </header>

      {/* HERO */}
      <section className="border-b border-piedra px-8 py-16 sm:px-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p
            className={`font-sans text-[11px] font-semibold uppercase tracking-[0.22em] ${
              estado === "actual"
                ? "text-cuero"
                : estado === "futuro"
                  ? "text-musgo"
                  : "text-niebla"
            }`}
          >
            {estado === "actual"
              ? "Vigente"
              : estado === "futuro"
                ? "Próximo"
                : "Cerrado"}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            {concurso.titulo}
          </h1>
          {concurso.descripcion && (
            <p className="mt-8 max-w-2xl font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
              {concurso.descripcion}
            </p>
          )}
          <div className="mt-10 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                Inicio
              </p>
              <p className="mt-1 font-serif text-base">
                {formatFecha(concurso.inicia_at)}
              </p>
            </div>
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                Cierre
              </p>
              <p className="mt-1 font-serif text-base">
                {formatFecha(concurso.termina_at)}
              </p>
            </div>
            {concurso.premio_descripcion && (
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  Premio
                </p>
                <p className="mt-1 font-serif text-base italic">
                  {concurso.premio_descripcion}
                </p>
              </div>
            )}
          </div>

          {estado === "actual" && (
            <Link
              href="/yo/bitacora/nueva"
              className="mt-10 inline-flex items-center gap-3 bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
            >
              Postular una bitácora →
            </Link>
          )}
        </div>
      </section>

      {/* GANADOR */}
      {ganadorBit && (
        <section className="border-b border-piedra bg-tinta px-8 py-16 text-fondo sm:px-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Ganador
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
              {ganadorProfile?.display_name ?? ganadorProfile?.handle ?? "Anónimo"}
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr] lg:gap-12">
              <Link href={`/bitacora/${ganadorBit.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ganadorBit.foto_url}
                  alt={ganadorBit.lugar ?? "Ganador"}
                  className="aspect-[4/3] w-full object-cover"
                />
              </Link>
              <div>
                {ganadorBit.lugar && (
                  <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-fondo/70">
                    {ganadorBit.lugar}
                  </p>
                )}
                {ganadorBit.texto && (
                  <p className="mt-3 font-serif text-lg italic leading-relaxed text-fondo/85">
                    {ganadorBit.texto}
                  </p>
                )}
                {ganadorProfile?.handle && (
                  <Link
                    href={`/u/${ganadorProfile.handle}`}
                    className="mt-6 inline-block border border-fondo/40 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-fondo hover:text-tinta"
                  >
                    Ver perfil de {ganadorProfile.display_name ?? ganadorProfile.handle} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PARTICIPACIONES */}
      <section className="px-8 py-16 sm:px-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Participantes
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
            {bitacoras.length === 0
              ? "Aún no hay postulaciones."
              : `${bitacoras.length} ${bitacoras.length === 1 ? "postulación" : "postulaciones"}.`}
          </h2>
          {bitacoras.length > 0 && (
            <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {bitacoras.map((b) => {
                const p = b.sku ? productoBySku.get(b.sku) : null;
                const fam = p?.familia_id
                  ? familiaNameById.get(p.familia_id)
                  : null;
                const author = profileByUser.get(b.user_id);
                const esGanador = b.id === concurso.ganador_bitacora_id;
                return (
                  <li
                    key={b.id}
                    className={`border bg-fondo transition-colors hover:border-cuero ${
                      esGanador ? "border-cuero" : "border-piedra"
                    }`}
                  >
                    <Link href={`/bitacora/${b.id}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.foto_url}
                        alt={fam ?? "Bitácora"}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="p-3">
                        {esGanador && (
                          <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                            ✓ Ganador
                          </p>
                        )}
                        {fam && (
                          <p className="font-serif text-sm text-tinta">
                            {fam}
                            {p?.color_valiz && (
                              <span className="ml-1 italic text-cuero">
                                · {p.color_valiz}
                              </span>
                            )}
                          </p>
                        )}
                        {b.lugar && (
                          <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.18em] text-niebla">
                            {b.lugar}
                          </p>
                        )}
                        {author && (
                          <p className="mt-2 font-sans text-[9px] uppercase tracking-[0.18em] text-niebla">
                            {author.display_name ?? author.handle}
                          </p>
                        )}
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
