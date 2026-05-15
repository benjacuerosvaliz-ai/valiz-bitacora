import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { WelcomeModal } from "./welcome-modal";

const nf = new Intl.NumberFormat("es-CL");

export const metadata: Metadata = {
  title: "Tu equipaje · Valiz Bitácora",
  description: "Tu bitácora personal de Valiz.",
};

export const dynamic = "force-dynamic"; // siempre fresh, hay datos por user

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
};

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

type TalleristaRow = { id: string; name: string };

type MovimientoRow = {
  id: string;
  delta: number;
  motivo: string;
  referencia_id: string | null;
  created_at: string;
};

type CompraManualRow = {
  id: string;
  familia_slug: string | null;
  color_valiz: string | null;
  lugar_compra: string | null;
  fecha_compra: string | null;
  verified: boolean;
  created_at: string;
};

type BitacoraRow = {
  id: string;
  sku: string | null;
  foto_url: string;
  lugar: string | null;
  texto: string | null;
  created_at: string;
  points_awarded: number;
};

const MOTIVO_LABEL: Record<string, string> = {
  compra_shopify: "Compra",
  bono_bienvenida: "Bono de bienvenida",
  bono_familia_nueva: "Bono por familia nueva",
  bitacora: "Entrada de bitácora",
  canje_descuento: "Canje de puntos",
  ajuste_admin: "Ajuste",
};

export default async function YoPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; bitacora?: string }>;
}) {
  const params = await searchParams;
  const flashAdded = params.added === "1";
  const flashBitacora = params.bitacora === "1";
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select(
      "id, email, display_name, puntos_actuales, welcomed_at, pin_hash",
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    // El callback debió crearlo; si no, hay un problema upstream.
    redirect("/login?error=no_profile");
  }

  // Equipaje
  const { data: equipajeRaw } = await sb
    .from("user_equipaje")
    .select("sku, referencia, adquirido_at, source, verified")
    .order("adquirido_at", { ascending: false });
  const equipaje = (equipajeRaw ?? []) as EquipajeRow[];
  const skus = [...new Set(equipaje.map((e) => e.sku))];

  // Familias y talleristas siempre se cargan (también las uso para mostrar
  // pendientes y para el header en otras secciones).
  const [fRes, tRes] = await Promise.all([
    sb.from("familias").select("id, slug, name, hours_per_unit"),
    sb.from("talleristas").select("id, name"),
  ]);
  const familias = (fRes.data ?? []) as FamiliaRow[];
  const talleristas = (tRes.data ?? []) as TalleristaRow[];

  // Productos solo cuando hay piezas en equipaje
  let productos: ProductoRow[] = [];
  if (skus.length > 0) {
    const { data } = await sb
      .from("productos")
      .select(
        "sku, color_valiz, p2, familia_id, precio, shopify_handle, tallerista_id",
      )
      .in("sku", skus);
    productos = (data ?? []) as ProductoRow[];
  }

  const productoBySku = new Map(productos.map((p) => [p.sku, p]));
  const familiaById = new Map(familias.map((f) => [f.id, f]));
  const talleristaById = new Map(talleristas.map((t) => [t.id, t]));

  // Cálculo de impacto personal
  let totalHoras = 0;
  let totalPies = 0;
  const horasPorTallerista = new Map<string, number>();

  for (const e of equipaje) {
    const p = productoBySku.get(e.sku);
    if (!p) continue;
    const fam = p.familia_id ? familiaById.get(p.familia_id) : null;
    const h = Number(fam?.hours_per_unit ?? 0);
    const pies = Number(p.p2 ?? 0);
    totalHoras += h;
    totalPies += pies;
    if (p.tallerista_id && h > 0) {
      const tName = talleristaById.get(p.tallerista_id)?.name ?? "?";
      horasPorTallerista.set(tName, (horasPorTallerista.get(tName) ?? 0) + h);
    }
  }
  const totalPiezas = equipaje.length;

  // Historial de puntos (últimos 20)
  const { data: movsRaw } = await sb
    .from("puntos_movimientos")
    .select("id, delta, motivo, referencia_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  const movs = (movsRaw ?? []) as MovimientoRow[];

  // Compras manuales pendientes (verified=false)
  const { data: pendientesRaw } = await sb
    .from("compras_manuales")
    .select("id, familia_slug, color_valiz, lugar_compra, fecha_compra, verified, created_at")
    .order("created_at", { ascending: false });
  const compras = (pendientesRaw ?? []) as CompraManualRow[];
  const pendientes = compras.filter((c) => !c.verified);

  // Bitácoras del user
  const { data: bitsRaw } = await sb
    .from("bitacora_entries")
    .select("id, sku, foto_url, lugar, texto, created_at, points_awarded")
    .eq("user_id", user.id)
    .eq("invalidated", false)
    .order("created_at", { ascending: false })
    .limit(12);
  const bitacoras = (bitsRaw ?? []) as BitacoraRow[];

  // Map slug → name para mostrar nombres
  const familiaNamesBySlug = new Map(familias.map((f) => [f.slug, f.name]));

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

      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-6 sm:px-16 sm:py-8">
        <Link
          href="/"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
        >
          ← Valiz · Bitácora
        </Link>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Tu equipaje
        </p>
      </header>

      {(flashAdded || flashBitacora) && (
        <div className="border-b border-musgo bg-musgo/5 px-8 py-4 sm:px-16">
          <p className="mx-auto max-w-5xl font-serif italic text-musgo">
            {flashAdded
              ? "Pieza agregada a tu equipaje. Te avisamos cuando la validemos para sumar puntos."
              : "Bitácora subida. Gracias por seguir contando la historia."}
          </p>
        </div>
      )}

      <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Hola
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            {nombre}.
          </h1>

          <div className="mt-12 grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Piezas Valiz" big={nf.format(totalPiezas)} />
            <Stat label="Horas de taller" big={nf.format(Math.round(totalHoras))} />
            <Stat label="Pies² de cuero" big={nf.format(Math.round(totalPies))} />
            <Stat label="Puntos" big={nf.format(profile.puntos_actuales)} subtle="1 pt = $1 CLP" />
          </div>

          {horasPorTallerista.size > 0 && (
            <p className="mt-10 max-w-2xl font-serif text-lg italic leading-relaxed text-niebla sm:text-xl">
              {Array.from(horasPorTallerista.entries())
                .map(([name, h]) => `${Math.round(h)}h del taller de ${name}`)
                .join(" · ")}
              .
            </p>
          )}
        </div>
      </section>

      {!profile.pin_hash && (
        <section className="border-b border-piedra bg-fondo/60 px-8 py-10 sm:px-16">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-serif text-lg italic text-tinta sm:text-xl">
              Crea un PIN de 4 dígitos para entrar más rápido la próxima vez.
            </p>
            <Link
              href="/yo/pin"
              className="border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Crear PIN →
            </Link>
          </div>
        </section>
      )}

      <section className="border-b border-piedra px-8 py-20 sm:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Tu equipaje
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
                {totalPiezas === 0
                  ? "Todavía no hay piezas a tu nombre."
                  : totalPiezas === 1
                    ? "Una pieza."
                    : `${nf.format(totalPiezas)} piezas.`}
              </h2>
            </div>
            <Link
              href="/yo/agregar-pieza"
              className="border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              + Agregar pieza
            </Link>
          </div>

          {totalPiezas === 0 ? (
            <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
              Si compraste antes con otro correo, agrega tus piezas manualmente
              o escríbenos para vincular el correo.
            </p>
          ) : (
            <ul className="mt-12 grid grid-cols-1 gap-x-10 gap-y-2">
              {equipaje.map((e) => {
                const p = productoBySku.get(e.sku);
                const fam = p?.familia_id ? familiaById.get(p.familia_id) : null;
                return (
                  <li key={e.referencia + e.sku} className="border-b border-piedra py-4">
                    <div className="flex flex-col items-baseline justify-between gap-1 sm:flex-row sm:gap-6">
                      <span className="font-serif text-2xl leading-tight">
                        {fam?.name ?? e.sku}
                        {p?.color_valiz && (
                          <span className="italic text-cuero"> · {p.color_valiz}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <Link
                          href={`/yo/bitacora/nueva?sku=${encodeURIComponent(e.sku)}`}
                          className="font-sans text-[11px] uppercase tracking-[0.18em] text-cuero hover:text-tinta"
                        >
                          + Bitácora
                        </Link>
                        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                          {e.source === "manual" ? "Manual" : "Shopify"}
                          {e.adquirido_at ? ` · ${formatDate(e.adquirido_at)}` : ""}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pendientes.length > 0 && (
            <div className="mt-12 border-t border-piedra pt-8">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Pendiente de validación
              </p>
              <p className="mt-2 font-serif italic text-niebla">
                Estas piezas aún no suman puntos. Las revisamos y otorgamos
                puntos retroactivos cuando confirmemos.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-y-2">
                {pendientes.map((p) => (
                  <li key={p.id} className="border-b border-piedra py-3">
                    <div className="flex flex-col items-baseline justify-between gap-1 sm:flex-row sm:gap-6">
                      <span className="font-serif text-lg italic text-niebla">
                        {familiaNamesBySlug.get(p.familia_slug ?? "") ?? p.familia_slug}
                        {p.color_valiz && ` · ${p.color_valiz}`}
                      </span>
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                        {p.lugar_compra ? `${p.lugar_compra} · ` : ""}
                        Pendiente
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-piedra px-8 py-20 sm:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                Tu bitácora
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
                {bitacoras.length === 0
                  ? "Tu bitácora está en blanco."
                  : bitacoras.length === 1
                    ? "1 entrada."
                    : `${nf.format(bitacoras.length)} entradas.`}
              </h2>
            </div>
            {totalPiezas > 0 && (
              <Link
                href="/yo/bitacora/nueva"
                className="border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
              >
                + Subir bitácora
              </Link>
            )}
          </div>
          {bitacoras.length === 0 ? (
            <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
              Cuando llevas tu Valiz a algún lado, súbele una foto y la
              historia. 200 pts por la primera del mes de cada pieza.
            </p>
          ) : (
            <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bitacoras.map((b) => (
                <li key={b.id} className="border border-piedra bg-fondo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.foto_url}
                    alt={b.lugar ?? ""}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="px-4 py-4">
                    {b.lugar && (
                      <p className="font-serif text-base italic text-cuero">
                        {b.lugar}
                      </p>
                    )}
                    {b.texto && (
                      <p className="mt-2 line-clamp-3 font-serif text-sm leading-relaxed">
                        {b.texto}
                      </p>
                    )}
                    <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                      {formatDate(b.created_at)}
                      {b.points_awarded > 0 && ` · +${b.points_awarded} pts`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-b border-piedra px-8 py-20 sm:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Movimiento de puntos
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-[1.1] tracking-[-0.015em] sm:text-4xl">
            Tu saldo: {nf.format(profile.puntos_actuales)} pts.
          </h2>
          {movs.length === 0 ? (
            <p className="mt-6 font-serif italic text-niebla">Sin movimientos todavía.</p>
          ) : (
            <ul className="mt-10">
              {movs.map((m) => (
                <li key={m.id} className="border-b border-piedra py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-serif text-base">
                      {MOTIVO_LABEL[m.motivo] ?? m.motivo}
                      {m.referencia_id && (
                        <span className="ml-2 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                          {m.referencia_id}
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-serif text-lg ${m.delta >= 0 ? "text-musgo" : "text-cuero"}`}
                    >
                      {m.delta >= 0 ? "+" : ""}
                      {nf.format(m.delta)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="px-8 py-8 sm:px-16">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Valiz · MMXXVI
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
      <p className="mt-3 font-serif text-5xl leading-none tracking-[-0.02em] sm:text-6xl">
        {big}
      </p>
      {subtle && (
        <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          {subtle}
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
