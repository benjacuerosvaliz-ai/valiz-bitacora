import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { ElegirGanadorButton } from "./elegir-ganador";

export const metadata: Metadata = {
  title: "Concurso · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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

type ParticipacionWithBit = {
  bitacora_id: string;
  user_id: string;
  foto_url: string;
  lugar: string | null;
  texto: string | null;
  sku: string | null;
  user_email: string | null;
  user_display: string | null;
};

export default async function AdminConcursoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/admin/concursos");
  if (!isAdmin(user.email)) notFound();

  const admin = createAdminClient();
  const { data: cRaw } = await admin
    .from("concursos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!cRaw) notFound();
  const concurso = cRaw as Concurso;

  const { data: partsRaw } = await admin
    .from("concurso_participaciones")
    .select("bitacora_id, user_id")
    .eq("concurso_id", id);
  const parts = (partsRaw ?? []) as {
    bitacora_id: string;
    user_id: string;
  }[];
  const bitIds = parts.map((p) => p.bitacora_id);
  const userIds = [...new Set(parts.map((p) => p.user_id))];

  const [bitsRes, profsRes] = await Promise.all([
    bitIds.length > 0
      ? admin
          .from("bitacora_entries")
          .select("id, foto_url, lugar, texto, sku")
          .in("id", bitIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? admin
          .from("user_profiles")
          .select("id, email, display_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  const bitsById = new Map(
    ((bitsRes.data ?? []) as {
      id: string;
      foto_url: string;
      lugar: string | null;
      texto: string | null;
      sku: string | null;
    }[]).map((b) => [b.id, b]),
  );
  const profileById = new Map(
    ((profsRes.data ?? []) as {
      id: string;
      email: string;
      display_name: string | null;
    }[]).map((p) => [p.id, p]),
  );

  const filas: ParticipacionWithBit[] = parts.map((p) => {
    const b = bitsById.get(p.bitacora_id);
    const u = profileById.get(p.user_id);
    return {
      bitacora_id: p.bitacora_id,
      user_id: p.user_id,
      foto_url: b?.foto_url ?? "",
      lugar: b?.lugar ?? null,
      texto: b?.texto ?? null,
      sku: b?.sku ?? null,
      user_email: u?.email ?? null,
      user_display: u?.display_name ?? null,
    };
  });

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-tinta px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/admin/concursos" />
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Admin · {concurso.titulo}
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-12 sm:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            {concurso.slug}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.015em] sm:text-5xl">
            {concurso.titulo}
          </h1>
          {concurso.descripcion && (
            <p className="mt-3 font-serif italic text-niebla">
              {concurso.descripcion}
            </p>
          )}
          <p className="mt-5 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            {new Date(concurso.inicia_at).toLocaleString("es-CL")} →{" "}
            {new Date(concurso.termina_at).toLocaleString("es-CL")}
          </p>
          {concurso.ganador_bitacora_id && (
            <p className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-musgo">
              ✓ Ganador asignado
            </p>
          )}
        </div>
      </section>

      <section className="px-8 py-12 sm:px-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-2xl leading-tight">
            Postulaciones ({filas.length})
          </h2>
          {filas.length === 0 ? (
            <p className="mt-6 font-serif italic text-niebla">
              Aún no hay postulaciones.
            </p>
          ) : (
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filas.map((f) => {
                const esGanador = f.bitacora_id === concurso.ganador_bitacora_id;
                return (
                  <li
                    key={f.bitacora_id}
                    className={`border bg-fondo ${
                      esGanador ? "border-cuero" : "border-piedra"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.foto_url}
                      alt={f.lugar ?? "Postulación"}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="px-4 py-4">
                      <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                        {f.user_display ?? f.user_email}
                      </p>
                      {f.lugar && (
                        <p className="mt-1 font-serif text-base text-tinta">
                          {f.lugar}
                        </p>
                      )}
                      {f.texto && (
                        <p className="mt-2 line-clamp-2 font-serif text-sm italic text-niebla">
                          {f.texto}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/bitacora/${f.bitacora_id}`}
                          target="_blank"
                          className="border border-piedra px-3 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla transition-colors hover:border-cuero hover:text-cuero"
                        >
                          Ver entrada
                        </Link>
                        {esGanador ? (
                          <span className="border border-cuero bg-cuero px-3 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-fondo">
                            ✓ Ganador
                          </span>
                        ) : (
                          <ElegirGanadorButton
                            concursoId={concurso.id}
                            bitacoraId={f.bitacora_id}
                          />
                        )}
                      </div>
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
