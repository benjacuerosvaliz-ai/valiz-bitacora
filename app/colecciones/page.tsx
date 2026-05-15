import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

export const metadata: Metadata = {
  title: "Colecciones · Valiz Bitácora",
  description:
    "Historial de colecciones Valiz — carryover de siempre, modas que pasaron y la actual.",
};

export const revalidate = 300;

type Cuero = {
  display_name: string;
  tipo: "carryover" | "moda" | null;
  coleccion: string | null;
};

type Producto = {
  cuero_id: string | null;
  coleccion: string | null;
  status: string | null;
};

/**
 * Metadata curada por colección. Lo que NO se puede inferir desde la DB
 * (descripción de marca, año, foto representativa) vive acá. Cuando
 * Benja confirme fechas/copy, se actualiza.
 *
 * Orden: del más reciente al más antiguo en la lista visual.
 */
const COLECCIONES_META: Record<
  string,
  {
    estado: "actual" | "individual" | "promovida" | "base" | "pasada";
    badge: string;
    bajada: string;
    fecha?: string;
  }
> = {
  Trigo: {
    estado: "actual",
    badge: "Actual",
    bajada:
      "La colección vigente. Cueros nuevos por temporada — algunos terminan quedándose en la base, otros pasan.",
    fecha: "2026",
  },
  Cobra: {
    estado: "individual",
    badge: "Colección individual",
    bajada:
      "Una colección propia, de un solo cuero. Vive aparte de la base permanente.",
  },
  "Mocha Mousse": {
    estado: "promovida",
    badge: "Era moda · ahora base",
    bajada:
      "Empezó como colección temporal y le fue tan bien que la promovimos a base permanente. Hoy ya es parte de los cueros que siempre vas a encontrar.",
  },
  TT: {
    estado: "base",
    badge: "Base de siempre",
    bajada:
      "Los cueros que están desde el inicio. La base permanente — cualquier pieza Valiz parte por acá.",
  },
  ROJO: {
    estado: "pasada",
    badge: "Pasada",
    bajada:
      "Una colección que vino y pasó. No incorporó cueros nuevos a la base — fue un capítulo en torno al rojo sobre los cueros existentes.",
  },
};

const ORDEN: string[] = ["Trigo", "Cobra", "Mocha Mousse", "TT", "ROJO"];

export default async function ColeccionesPage() {
  const sb = createStaticClient();

  const [cuerosRes, prodsRes] = await Promise.all([
    sb
      .from("cueros")
      .select("display_name, tipo, coleccion")
      .order("display_name"),
    sb.from("productos").select("cuero_id, coleccion, status"),
  ]);

  const cueros = (cuerosRes.data ?? []) as Cuero[];
  const productos = (prodsRes.data ?? []) as Producto[];

  // Agrupar cueros por colección
  const cuerosPorColeccion = new Map<string, Cuero[]>();
  for (const c of cueros) {
    if (!c.coleccion) continue;
    const list = cuerosPorColeccion.get(c.coleccion) ?? [];
    list.push(c);
    cuerosPorColeccion.set(c.coleccion, list);
  }

  // Colecciones "huérfanas" (existen en productos pero sin cuero propio,
  // ej. ROJO usa cueros base): las detectamos para sumarlas al historial.
  const coleccionesEnProductos = new Set<string>();
  for (const p of productos) {
    if (p.coleccion) coleccionesEnProductos.add(p.coleccion);
  }
  const huerfanas = [...coleccionesEnProductos].filter(
    (c) => !cuerosPorColeccion.has(c) && COLECCIONES_META[c],
  );
  // MAM no es colección sino familia (Mochila Alforja Mama) — la
  // descartamos para que no aparezca como capítulo.
  const huerfanasFiltradas = huerfanas.filter((c) => c !== "MAM");

  // Mezclar y ordenar según ORDEN curado; las desconocidas al final.
  const todas = [
    ...new Set([
      ...ORDEN,
      ...cuerosPorColeccion.keys(),
      ...huerfanasFiltradas,
    ]),
  ].filter(
    (c) =>
      c !== "MAM" && (cuerosPorColeccion.has(c) || COLECCIONES_META[c]),
  );

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Colecciones
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-20 sm:px-16 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Capítulos
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Las colecciones.
          </h1>
          <p className="mt-8 max-w-2xl font-serif text-xl italic leading-relaxed text-niebla">
            Los cueros base son los que siempre encuentras. Las colecciones
            traen cueros distintos por temporada. Algunas pasan, otras se
            quedan. Acá viven todas.
          </p>
        </div>
      </section>

      <section className="px-8 py-20 sm:px-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <ul className="flex flex-col gap-16">
            {todas.map((nombre) => {
              const meta = COLECCIONES_META[nombre];
              const cuerosColeccion = cuerosPorColeccion.get(nombre) ?? [];
              const tieneCueros = cuerosColeccion.length > 0;
              return (
                <li
                  key={nombre}
                  className="grid grid-cols-1 gap-x-12 gap-y-6 border-t border-piedra pt-10 sm:grid-cols-[1fr_2fr]"
                >
                  <div>
                    {meta?.badge && (
                      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                        {meta.badge}
                      </p>
                    )}
                    <h2 className="mt-3 font-serif text-4xl leading-[1.04] tracking-[-0.015em] sm:text-5xl">
                      {nombre}
                    </h2>
                    {meta?.fecha && (
                      <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
                        {meta.fecha}
                      </p>
                    )}
                  </div>

                  <div>
                    {meta?.bajada && (
                      <p className="font-serif text-lg italic leading-relaxed text-niebla sm:text-xl">
                        {meta.bajada}
                      </p>
                    )}

                    {tieneCueros ? (
                      <div className="mt-6">
                        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                          Cueros ({cuerosColeccion.length})
                        </p>
                        <ul className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                          {cuerosColeccion.map((c) => (
                            <li
                              key={c.display_name}
                              className="border-b border-piedra pb-2 font-serif text-base"
                            >
                              {c.display_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                        Sin cueros propios — capítulo histórico.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-20 border-t border-piedra pt-10">
            <Link
              href="/"
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
            >
              ← Volver a la bitácora
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
