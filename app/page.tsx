import Link from "next/link";

import { createStaticClient } from "@/lib/supabase/static";

const nf = new Intl.NumberFormat("es-CL");

export const revalidate = 300; // 5 min; el sync corre pocas veces al día

type Tallerista = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  specialties: string[];
  manos_count: number | null;
};

type Cuero = {
  id: string;
  display_name: string;
};

type ProductoStats = {
  p2: number | string | null;
  sales_total: number | null;
  familia_id: string | null;
};

type Familia = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
  display_order: number | null;
};

export default async function Home() {
  const sb = createStaticClient();

  const [talleristasRes, cuerosRes, productosRes, familiasRes] =
    await Promise.all([
      sb
        .from("talleristas")
        .select("id, name, role, bio, specialties, manos_count")
        .order("display_order"),
      sb
        .from("cueros")
        .select("id, display_name")
        .order("display_name"),
      sb
        .from("productos")
        .select("p2, sales_total, familia_id")
        .eq("status", "active"),
      sb
        .from("familias")
        .select("id, slug, name, hours_per_unit, display_order")
        .order("display_order"),
    ]);

  const talleristas = (talleristasRes.data ?? []) as Tallerista[];
  const cueros = (cuerosRes.data ?? []) as Cuero[];
  const productos = (productosRes.data ?? []) as ProductoStats[];
  const familias = (familiasRes.data ?? []) as Familia[];

  const hoursByFamiliaId = new Map(
    familias.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
  );

  const piesTotal = Math.round(
    productos.reduce(
      (sum, p) => sum + Number(p.p2 ?? 0) * Number(p.sales_total ?? 0),
      0,
    ),
  );
  const unidadesTotal = productos.reduce(
    (sum, p) => sum + Number(p.sales_total ?? 0),
    0,
  );
  const horasTotal = Math.round(
    productos.reduce(
      (sum, p) =>
        sum +
        Number(p.sales_total ?? 0) *
          (hoursByFamiliaId.get(p.familia_id ?? "") ?? 0),
      0,
    ),
  );
  const talleresCount = talleristas.length;
  const manosCount = talleristas.reduce(
    (sum, t) => sum + (t.manos_count ?? 1),
    0,
  );

  // Conteo de SKUs activos por familia para listar solo las que tienen piezas vivas.
  const productosPorFamilia = new Map<string, number>();
  for (const p of productos) {
    if (!p.familia_id) continue;
    productosPorFamilia.set(
      p.familia_id,
      (productosPorFamilia.get(p.familia_id) ?? 0) + 1,
    );
  }
  const familiasActivas = familias
    .map((f) => ({ ...f, colores: productosPorFamilia.get(f.id) ?? 0 }))
    .filter((f) => f.colores > 0);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-8 sm:px-16 sm:py-12">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Valiz · Bitácora
        </p>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Mayo 2026
        </p>
      </header>

      {/* HERO ---------------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-32 sm:px-16 sm:py-40">
        <div className="max-w-4xl">
          <p className="mb-10 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Valiz · Bitácora viva
          </p>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Cuero recuperado, manos chilenas, objetos hechos para envejecer
            bien.
          </h1>
          <p className="mt-10 max-w-2xl font-serif text-xl italic leading-relaxed text-cuero sm:text-2xl">
            Cada Valiz vive tres vidas: la que el cuero ya tuvo, la que pasa en
            taller, la que viene contigo.
          </p>
        </div>
      </section>

      {/* VIDA PASADA --------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-28 sm:px-16 sm:py-40">
        <div className="max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            I · Vida pasada
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            El cuero antes de ser tuyo.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Subproducto de la industria ganadera chilena. Sin nosotros,
            descarte; con nosotros, objeto que vivirá décadas.
          </p>

          <p className="mt-16 font-serif text-[6rem] leading-[0.85] tracking-[-0.04em] sm:text-[10rem] lg:text-[13rem]">
            {nf.format(piesTotal)}
          </p>
          <p className="mt-2 font-serif text-2xl italic leading-tight text-cuero sm:mt-4 sm:text-4xl">
            pies² de cuero chileno curtido en los últimos doce meses.
          </p>

          <p className="mt-14 max-w-2xl font-serif text-lg leading-relaxed sm:text-xl">
            Curtido localmente con procesos cuidadosos — agua tratada, químicos
            certificados, residuos controlados. Lo trabajamos en{" "}
            {nf.format(cueros.length)} cueros con nombre propio, cada uno con
            su carácter, su tacto, su origen.
          </p>
        </div>
      </section>

      {/* VIDA PRESENTE ------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-28 sm:px-16 sm:py-40">
        <div className="max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            II · Vida presente
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            Las horas en taller.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Tres talleres chilenos, sin máquinas industriales, sin apuro. Cada
            pieza pasa por las manos de Roberto, César o David antes de salir.
          </p>

          <p className="mt-16 font-serif text-[7rem] leading-[0.85] tracking-[-0.04em] sm:text-[12rem] lg:text-[15rem]">
            {nf.format(horasTotal)}
          </p>
          <p className="mt-2 font-serif text-2xl italic leading-tight text-cuero sm:mt-4 sm:text-4xl">
            horas de oficio artesanal cosidas a mano.
          </p>

          <p className="mt-14 max-w-2xl font-serif text-lg leading-relaxed sm:text-xl">
            {nf.format(unidadesTotal)} piezas terminadas en{" "}
            {talleresCount} talleres, {manosCount} manos. Cifras de los últimos
            doce meses.
          </p>
        </div>
      </section>

      {/* EL TALLER ----------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="max-w-5xl">
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Los talleres
          </p>
          <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            {talleresCount} talleres, {manosCount} manos.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Roberto, César y David lideran cada uno su equipo. Cada pieza pasa
            por sus manos antes de salir.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-10">
            {talleristas.map((t) => (
              <TalleristaCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* LAS PIEZAS ---------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="max-w-5xl">
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Las piezas
          </p>
          <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            {familiasActivas.length}{" "}
            {familiasActivas.length === 1 ? "familia" : "familias"} de objetos.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Cada familia es un capítulo. Mismo molde, distinto cuero, distinto
            color. Entra a cualquiera para ver sus variantes.
          </p>

          <ul className="mt-16 grid grid-cols-1 gap-x-10 gap-y-3">
            {familiasActivas.map((f) => {
              const horas = Number(f.hours_per_unit ?? 0);
              return (
                <li
                  key={f.id}
                  className="border-b border-piedra"
                >
                  <Link
                    href={`/piezas/${f.slug}`}
                    className="group flex flex-col items-baseline justify-between gap-2 py-5 sm:flex-row sm:gap-6"
                  >
                    <span className="font-serif text-2xl leading-tight transition-colors group-hover:text-cuero sm:text-3xl">
                      {f.name}
                    </span>
                    <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                      {f.colores}{" "}
                      {f.colores === 1 ? "color" : "colores"}
                      {horas > 0 ? ` · ${horas} h por unidad` : ""}
                      {" "}
                      <span className="text-cuero">→</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* LOS CUEROS ---------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="max-w-5xl">
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Los cueros
          </p>
          <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            {nf.format(cueros.length)} cueros con nombre propio.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Curtidos en Chile, cada uno con su carácter. Los conoces por su
            tacto antes que por su nombre.
          </p>

          <ul className="mt-16 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {cueros.map((c) => (
              <li
                key={c.id}
                className="border-b border-piedra pb-3 font-serif text-xl leading-tight"
              >
                {c.display_name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* VIDA FUTURA --------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-28 sm:px-16 sm:py-40">
        <div className="max-w-5xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            III · Vida futura
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            Tu bitácora empieza aquí.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Cuando llevas una Valiz, su historia sigue contigo. Cada pieza se
            vuelve cuaderno vivo: lugares donde fue, gente que la cargó,
            momentos que vivió. Los Valiz no se reemplazan — se acumulan
            historia.
          </p>

          <p className="mt-16 font-serif text-3xl leading-tight tracking-[-0.015em] text-cuero sm:text-4xl">
            <em>Próximamente</em> — fotos georeferenciadas, mapa mundial de
            objetos en viaje, perfil Valiz para cada dueño. Cada bitácora suma
            a la bitácora colectiva.
          </p>
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Cuero, madera y manos chilenas
          </p>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Valiz · MMXXVI
          </p>
        </div>
      </footer>
    </main>
  );
}

function TalleristaCard({ t }: { t: Tallerista }) {
  const manos = t.manos_count ?? 1;
  return (
    <article className="border-t border-piedra pt-6">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        Taller de {t.name}
      </p>
      <h3 className="mt-3 font-serif text-4xl leading-none tracking-[-0.015em]">
        {t.name}
      </h3>
      <p className="mt-2 font-serif text-sm italic text-cuero">
        {t.role} · {manos} {manos === 1 ? "mano" : "manos"}
      </p>
      {t.specialties && t.specialties.length > 0 && (
        <p className="mt-5 font-serif text-base italic leading-relaxed text-niebla">
          {t.specialties.slice(0, 3).join(" · ")}
          {t.specialties.length > 3 && " ·  …"}
        </p>
      )}
    </article>
  );
}
