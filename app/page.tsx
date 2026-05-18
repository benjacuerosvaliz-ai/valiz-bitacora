import Image from "next/image";
import Link from "next/link";

import { AnimatedNumber } from "@/components/animations/animated-number";
import { ParallaxImage } from "@/components/animations/parallax-image";
import { SectionReveal } from "@/components/animations/section-reveal";
import { BrandMark } from "@/components/brand-mark";
import {
  FamilyHoverImageProvider,
  FamilyHoverTrigger,
} from "@/components/family-hover-image";
import { slugify } from "@/lib/slugify";
import { createStaticClient } from "@/lib/supabase/static";

const nf = new Intl.NumberFormat("es-CL");

export const revalidate = 300;

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
  tipo: "carryover" | "moda" | null;
  coleccion: string | null;
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
  description: string | null;
  hours_per_unit: number | string | null;
  display_order: number | null;
};

// Devuelve la primera frase de un texto (corta en el primer .!?). Si el
// texto es corto, lo devuelve completo. Sirve para usar las
// descripciones largas de familias.description como bajadas en la home.
function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : text).trim();
}

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
        .select("id, display_name, tipo, coleccion")
        .order("display_name"),
      sb
        .from("productos")
        .select("p2, sales_total, familia_id")
        .eq("status", "active"),
      sb
        .from("familias")
        .select("id, slug, name, description, hours_per_unit, display_order")
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

  const cuerosCarryover = cueros.filter((c) => c.tipo !== "moda");
  const cuerosModa = cueros.filter((c) => c.tipo === "moda");
  const coleccionActual = cuerosModa.find((c) => c.coleccion)?.coleccion;

  // Imagen hero por familia para el efecto cursor-reveal en "Las piezas".
  // Por ahora solo mochila-alforja tiene fotos editadas; el resto se va
  // sumando a medida que entran al sistema. Familias sin imagen siguen
  // funcionando como link normal sin hover-reveal.
  const FAMILY_HOVER_IMAGE: Record<string, string | undefined> = {
    "mochila-alforja":
      "/images/productos/mochila-alforja/MA-G-CRU/01-front.webp",
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* HERO ---------------------------------------------------------------- */}
      <section className="grid min-h-[100svh] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-between border-b border-piedra px-8 py-10 sm:px-16 sm:py-14 lg:order-1 lg:border-b-0 lg:border-r">
          <SectionReveal className="flex items-center justify-between">
            <BrandMark />
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
              Mayo 2026
            </p>
          </SectionReveal>

          <SectionReveal className="max-w-2xl py-16 lg:py-24" delay={0.2}>
            <p className="mb-10 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              Bitácora viva
            </p>
            <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-6xl xl:text-7xl">
              Cuero recuperado, manos chilenas, objetos hechos para envejecer
              bien.
            </h1>
            <p className="mt-10 max-w-xl font-serif text-xl italic leading-relaxed text-cuero sm:text-2xl">
              Cada Valiz vive tres vidas: la que el cuero ya tuvo, la que pasa
              en taller, la que viene contigo.
            </p>
          </SectionReveal>

          <SectionReveal delay={0.6}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
                Desliza ↓
              </p>
              <Link
                href="/tienda"
                className="group inline-flex items-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-all duration-500 hover:bg-tinta hover:text-fondo"
              >
                Entrar a la tienda
                <span className="transition-transform duration-500 group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
            </div>
          </SectionReveal>
        </div>

        <ParallaxImage
          src="/images/hero.jpg"
          alt="Valiz alforja en costa chilena"
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          intensity={14}
          className="aspect-[3/4] lg:order-2 lg:aspect-auto"
        />
      </section>

      {/* VIDA PASADA --------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-28 sm:px-16 sm:py-40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <SectionReveal>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              I · Vida pasada
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
              El cuero antes de ser tuyo.
            </h2>
            <p className="mt-6 max-w-xl font-serif italic leading-relaxed text-niebla">
              Subproducto de la industria ganadera chilena. Sin nosotros,
              descarte; con nosotros, objeto que vivirá décadas.
            </p>

            <p className="mt-16 font-serif text-[5.5rem] leading-[0.85] tracking-[-0.04em] sm:text-[8rem] xl:text-[10rem]">
              <AnimatedNumber value={piesTotal} />
            </p>
            <p className="mt-2 font-serif text-2xl italic leading-tight text-cuero sm:text-3xl">
              pies² de cuero chileno curtido en los últimos doce meses.
            </p>

            <p className="mt-12 max-w-xl font-serif text-lg leading-relaxed sm:text-xl">
              Curtido localmente con procesos cuidadosos — agua tratada,
              químicos certificados, residuos controlados. Lo trabajamos en{" "}
              {nf.format(cuerosCarryover.length)} cueros base que siempre vas
              a encontrar, y {cuerosModa.length} cueros de colección que
              pasan o se quedan.
            </p>
          </SectionReveal>

          <SectionReveal delay={0.15}>
            <ParallaxImage
              src="/images/vida-pasada.jpg"
              alt="Pila de cueros enrollados en distintos colores"
              sizes="(min-width: 1024px) 40vw, 100vw"
              intensity={8}
              className="aspect-[3/4] w-full"
            />
          </SectionReveal>
        </div>
      </section>

      {/* VIDA PRESENTE — sticky scroll storytelling ------------------------- */}
      <section className="border-b border-piedra px-8 sm:px-16">
        <div className="mx-auto max-w-7xl pt-28 sm:pt-40">
          <SectionReveal>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              II · Vida presente
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
              Las horas en taller.
            </h2>
            <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
              Tres talleres chilenos, sin máquinas industriales, sin apuro.
              Cada pieza pasa por las manos de Roberto, César o David antes de
              salir.
            </p>
          </SectionReveal>

          {/* Sticky-scroll: foto fija a la izquierda mientras el texto pasa */}
          <div className="mt-24 grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-20">
            <div className="lg:sticky lg:top-12 lg:h-[calc(100svh-6rem)] lg:self-start">
              <ParallaxImage
                src="/images/vida-presente.jpg"
                alt="Manos cortando cuero artesano con hilos de colores"
                sizes="(min-width: 1024px) 45vw, 100vw"
                intensity={8}
                className="h-full w-full"
              />
            </div>

            <div className="flex flex-col gap-[40vh] pb-[10vh] lg:py-[15vh]">
              <SectionReveal>
                <p className="font-serif text-[5rem] leading-[0.85] tracking-[-0.04em] sm:text-[7rem] xl:text-[9rem]">
                  <AnimatedNumber value={horasTotal} />
                </p>
                <p className="mt-2 font-serif text-2xl italic leading-tight text-cuero sm:text-3xl">
                  horas de oficio artesanal cosidas a mano.
                </p>
              </SectionReveal>

              <SectionReveal>
                <p className="font-serif text-4xl leading-tight tracking-[-0.015em] sm:text-5xl">
                  <AnimatedNumber value={unidadesTotal} /> piezas{" "}
                  <span className="italic text-cuero">
                    terminadas en el último año
                  </span>
                  .
                </p>
              </SectionReveal>

              <SectionReveal>
                <p className="font-serif text-4xl leading-tight tracking-[-0.015em] sm:text-5xl">
                  {talleresCount} talleres, {manosCount} manos.{" "}
                  <span className="italic text-cuero">
                    Una pieza pasa por todas antes de salir.
                  </span>
                </p>
              </SectionReveal>

              <SectionReveal>
                <p className="font-sans text-sm leading-relaxed text-niebla">
                  Cifras vivas — se mueven con cada venta, cada corte, cada
                  costura. Últimos doce meses.
                </p>
              </SectionReveal>
            </div>
          </div>

          <div className="h-28 sm:h-40" />
        </div>
      </section>

      {/* EL TALLER ----------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <SectionReveal>
            <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Los talleres
            </p>
            <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
              {talleresCount} talleres, {manosCount} manos.
            </h2>
            <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
              Roberto, César y David lideran cada uno su equipo. Cada pieza
              pasa por sus manos antes de salir.
            </p>
          </SectionReveal>

          <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-10">
            {talleristas.map((t, i) => (
              <SectionReveal key={t.id} delay={0.1 + i * 0.1}>
                <TalleristaCard t={t} />
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* LAS PIEZAS ---------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <SectionReveal>
            <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Las piezas
            </p>
            <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
              {familiasActivas.length}{" "}
              {familiasActivas.length === 1 ? "familia" : "familias"} de
              objetos.
            </h2>
            <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
              Cada familia es un capítulo. Mismo molde, distinto cuero,
              distinto color. Entra a cualquiera para ver sus variantes.
            </p>
          </SectionReveal>

          <FamilyHoverImageProvider>
            <ul className="mt-16 grid grid-cols-1 gap-x-10 gap-y-3">
              {familiasActivas.map((f, i) => {
                const horas = Number(f.hours_per_unit ?? 0);
                const hoverImg = FAMILY_HOVER_IMAGE[f.slug];
                const bajada = firstSentence(f.description);
                return (
                  <SectionReveal key={f.id} delay={i * 0.04}>
                    <li className="border-b border-piedra">
                      <FamilyHoverTrigger imageSrc={hoverImg}>
                        <Link
                          href={`/piezas/${f.slug}`}
                          className="group flex flex-col gap-2 py-5"
                        >
                          <div className="flex flex-col items-baseline justify-between gap-2 sm:flex-row sm:gap-6">
                            <span className="font-serif text-2xl leading-tight transition-colors duration-500 group-hover:text-cuero sm:text-3xl">
                              {f.name}
                            </span>
                            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                              {f.colores}{" "}
                              {f.colores === 1 ? "color" : "colores"}
                              {horas > 0 ? ` · ${horas} h por unidad` : ""}{" "}
                              <span className="text-cuero transition-transform duration-500 group-hover:translate-x-1 inline-block">
                                →
                              </span>
                            </span>
                          </div>
                          {bajada && (
                            <span className="max-w-2xl font-serif text-base italic leading-relaxed text-niebla">
                              {bajada}
                            </span>
                          )}
                        </Link>
                      </FamilyHoverTrigger>
                    </li>
                  </SectionReveal>
                );
              })}
            </ul>
          </FamilyHoverImageProvider>
        </div>
      </section>

      {/* LOS CUEROS ---------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <SectionReveal>
            <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Los cueros
            </p>
            <h2 className="font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
              {nf.format(cuerosCarryover.length)} cueros base
              {coleccionActual && (
                <>
                  {" "}· Colección{" "}
                  <span className="italic text-cuero">{coleccionActual}</span>
                </>
              )}
              .
            </h2>
            <p className="mt-6 max-w-2xl font-serif italic leading-relaxed text-niebla">
              Los cueros base son los que siempre vas a encontrar. Las
              colecciones traen cueros distintos por temporada — algunos
              pasan, otros se quedan.
            </p>
          </SectionReveal>

          <div className="mt-16">
            <p className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
              Base permanente
            </p>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {cuerosCarryover.map((c, i) => (
                <SectionReveal key={c.id} delay={i * 0.02}>
                  <li className="border-b border-piedra pb-3 font-serif text-xl leading-tight">
                    {c.display_name}
                  </li>
                </SectionReveal>
              ))}
            </ul>

            {cuerosModa.length > 0 && (
              <>
                <p className="mb-4 mt-16 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
                  De colección
                </p>
                <ul className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cuerosModa.map((c, i) => (
                    <SectionReveal key={c.id} delay={i * 0.02}>
                      <li className="border-b border-piedra pb-3 font-serif text-xl leading-tight">
                        {c.display_name}
                        {c.coleccion && (
                          <span className="ml-3 font-sans text-[10px] uppercase tracking-[0.18em] text-cuero">
                            {c.coleccion}
                          </span>
                        )}
                      </li>
                    </SectionReveal>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-12">
              <Link
                href="/colecciones"
                className="inline-flex items-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
              >
                Historial de colecciones
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* VIDA FUTURA --------------------------------------------------------- */}
      <section className="border-b border-piedra px-8 py-28 sm:px-16 sm:py-40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <SectionReveal>
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

            <p className="mt-10 max-w-xl font-serif text-xl leading-relaxed text-tinta sm:text-2xl">
              Crea tu cuenta y vas a encontrar tu equipaje armado: si compraste
              antes en valiz.cl, todas tus piezas aparecen automáticamente.
              Sumas puntos por cada compra, por cada bitácora con foto, y los
              canjeas como descuento real en la tienda.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-3 bg-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
              >
                Entrar a tu equipaje →
              </Link>
              <Link
                href="/bitacora"
                className="inline-flex items-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
              >
                Bitácora colectiva →
              </Link>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.15}>
            <ParallaxImage
              src="/images/vida-futura.jpg"
              alt="Mochila Valiz en un bosque con nieve"
              sizes="(min-width: 1024px) 40vw, 100vw"
              intensity={8}
              className="aspect-[3/4] w-full"
            />
          </SectionReveal>
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <div className="flex flex-col items-baseline justify-between gap-6 sm:flex-row">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <Link
              href="/sobre"
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-cuero"
            >
              Sobre Valiz
            </Link>
            <Link
              href="/talleristas"
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-cuero"
            >
              Talleristas
            </Link>
            <Link
              href="/bitacora"
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-cuero"
            >
              Bitácora
            </Link>
            <Link
              href="/concursos"
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-cuero"
            >
              Concursos
            </Link>
            <Link
              href="/tienda"
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-cuero"
            >
              Tienda
            </Link>
          </div>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Valiz · Since 2018
          </p>
        </div>
      </footer>
    </main>
  );
}

function TalleristaCard({ t }: { t: Tallerista }) {
  const manos = t.manos_count ?? 1;
  const slug = slugify(t.name);
  return (
    <Link
      href={`/talleristas/${slug}`}
      className="group block border-t border-piedra pt-6 transition-colors hover:text-cuero"
    >
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
      <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.22em] text-cuero opacity-0 transition-opacity group-hover:opacity-100">
        Ver perfil →
      </p>
    </Link>
  );
}
