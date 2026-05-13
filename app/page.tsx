import { createClient } from "@/lib/supabase/server";

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
  code: string;
  display_name: string;
};

type ProductoStats = {
  p2: number | string | null;
  sales_total: number | null;
  familia_id: string | null;
};

type FamiliaHours = {
  id: string;
  hours_per_unit: number | string | null;
};

export default async function Home() {
  const sb = await createClient();

  const [talleristasRes, cuerosRes, productosRes, familiasRes] =
    await Promise.all([
      sb
        .from("talleristas")
        .select("id, name, role, bio, specialties, manos_count")
        .order("display_order"),
      sb
        .from("cueros")
        .select("id, code, display_name")
        .order("display_name"),
      sb
        .from("productos")
        .select("p2, sales_total, familia_id")
        .eq("status", "active"),
      sb.from("familias").select("id, hours_per_unit"),
    ]);

  const talleristas = (talleristasRes.data ?? []) as Tallerista[];
  const cueros = (cuerosRes.data ?? []) as Cuero[];
  const productos = (productosRes.data ?? []) as ProductoStats[];
  const familias = (familiasRes.data ?? []) as FamiliaHours[];

  const hoursByFamiliaId = new Map(
    familias.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
  );

  const piesTotal = Math.round(
    productos.reduce(
      (sum, p) =>
        sum + Number(p.p2 ?? 0) * Number(p.sales_total ?? 0),
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

      <section className="border-b border-piedra px-8 py-32 sm:px-16 sm:py-40">
        <div className="max-w-4xl">
          <p className="mb-10 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Bitácora viva
          </p>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Cuero recuperado, manos chilenas, objetos hechos para envejecer
            bien.
          </h1>
          <p className="mt-10 max-w-2xl font-serif text-xl italic leading-relaxed text-cuero sm:text-2xl">
            Cada pieza Valiz nace en un taller real. Su historia empieza acá y
            sigue contigo.
          </p>
        </div>
      </section>

      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="max-w-5xl">
          <p className="mb-12 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Hasta hoy · el contador del oficio
          </p>
          <dl className="grid grid-cols-1 gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              number={nf.format(horasTotal)}
              unit="horas"
              label="de oficio artesanal"
            />
            <Stat
              number={nf.format(piesTotal)}
              unit="pies²"
              label="de cuero trabajados"
            />
            <Stat
              number={nf.format(unidadesTotal)}
              unit="piezas"
              label="terminadas en taller"
            />
            <Stat
              number={nf.format(manosCount)}
              unit="manos"
              label={`en los ${talleresCount} talleres`}
            />
          </dl>
          <p className="mt-12 max-w-2xl font-sans text-sm leading-relaxed text-niebla">
            Datos en vivo desde los talleres. Se mueven con cada venta, cada
            corte, cada costura. Cifra de los últimos doce meses.
          </p>
        </div>
      </section>

      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="max-w-5xl">
          <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            El Taller
          </p>
          <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            {talleresCount} talleres, {manosCount} manos.
          </h2>
          <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
            Roberto, César y David lideran cada uno su taller. Cada pieza pasa
            por sus manos antes de salir.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-10">
            {talleristas.map((t) => (
              <TalleristaCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

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

          <ul className="mt-16 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {cueros.map((c) => (
              <li
                key={c.id}
                className="flex items-baseline justify-between border-b border-piedra pb-3"
              >
                <span className="font-serif text-xl leading-tight">
                  {c.display_name}
                </span>
                <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                  {c.code.split(" ")[0]}
                </span>
              </li>
            ))}
          </ul>
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

function Stat({
  number,
  unit,
  label,
}: {
  number: string;
  unit: string;
  label: string;
}) {
  return (
    <div>
      <dt className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </dt>
      <dd className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-6xl leading-none tracking-[-0.025em] sm:text-7xl">
          {number}
        </span>
        <span className="font-serif text-xl italic text-cuero sm:text-2xl">
          {unit}
        </span>
      </dd>
    </div>
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
