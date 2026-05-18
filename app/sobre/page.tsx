import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = {
  title: "Sobre Valiz",
  description:
    "Una marca chilena de cuero artesanal y una bitácora que la sigue. Tres vidas del objeto: el cuero antes, las horas en taller, los viajes contigo.",
  alternates: { canonical: "/sobre" },
  openGraph: {
    type: "article",
    title: "Sobre Valiz",
    description:
      "Una marca chilena de cuero artesanal y una bitácora que la sigue.",
    url: "/sobre",
  },
};

export default function SobrePage() {
  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Sobre Valiz
        </p>
      </header>

      {/* Manifiesto ------------------------------------------------------- */}
      <section className="px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Manifiesto
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-6xl">
            Valiz es una marca chilena de cuero artesanal.
          </h1>
          <p className="mt-12 font-serif text-2xl italic leading-relaxed text-cuero sm:text-3xl">
            Esta bitácora es su capa digital — el lugar donde cada pieza
            cuenta lo que le pasa después de salir del taller.
          </p>

          <div className="mt-20 space-y-10 font-serif text-lg leading-relaxed sm:text-xl">
            <p>
              Trabajamos en cuero porque envejece bien. Porque guarda
              memoria. Porque una pieza buena pasa de mano en mano y
              queda mejor con los años, no peor.
            </p>
            <p>
              Cosemos a mano, sin máquinas industriales, sin apuro. Lo que
              sale del taller tiene una marca de quien lo hizo y, después,
              de quien lo lleva.
            </p>
            <p>
              No producimos por temporadas. Producimos para que dure.
            </p>
          </div>
        </div>
      </section>

      {/* Tres vidas -------------------------------------------------------- */}
      <section className="border-t border-piedra px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Tres vidas del objeto
          </p>
          <h2 className="mt-6 font-serif text-4xl leading-[1.1] tracking-[-0.015em] sm:text-5xl">
            Cada Valiz vive tres veces.
          </h2>

          <ol className="mt-16 space-y-16">
            <Vida
              numero="I"
              titulo="Vida pasada"
              subtitulo="El cuero antes de ser tuyo"
              cuerpo="Cuero que viene de la industria ganadera chilena. Curtido localmente, con procesos cuidadosos. Antes de pasar por nosotros, era descarte; con nosotros, materia de un objeto que durará décadas."
            />
            <Vida
              numero="II"
              titulo="Vida presente"
              subtitulo="Las horas en taller"
              cuerpo="Tres talleres chilenos. Roberto, César y David lideran cada uno el suyo. Una pieza pasa por las manos de un equipo entero antes de salir — cortada, cosida, terminada sin atajos."
            />
            <Vida
              numero="III"
              titulo="Vida futura"
              subtitulo="La bitácora contigo"
              cuerpo="Lo que pasa después es lo que más nos importa. Dónde fue, qué cargó, cómo se gastó. Esta bitácora es para eso: que las piezas tengan memoria pública y que quienes las llevan compartan el viaje."
            />
          </ol>
        </div>
      </section>

      {/* CTA -------------------------------------------------------------- */}
      <section className="border-t border-piedra px-8 py-20 sm:px-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Entradas
          </p>
          <h2 className="mt-6 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
            Por dónde empezar.
          </h2>

          <ul className="mt-12 divide-y divide-piedra border-y border-piedra">
            <CtaLink
              href="/bitacora"
              label="Bitácora colectiva"
              hint="Todos los viajes de todas las piezas — el mapa vivo."
            />
            <CtaLink
              href="/talleristas"
              label="Los talleristas"
              hint="Roberto, César y David. Las manos detrás."
            />
            <CtaLink
              href="/"
              label="Piezas y cueros"
              hint="Las familias, los colores, los talleres — todo en un scroll."
            />
            <CtaLink
              href="/tienda"
              label="Tienda valiz.cl"
              hint="Comprar una pieza. Empezar su tercera vida."
            />
          </ul>
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <div className="flex flex-col items-baseline justify-between gap-3 sm:flex-row">
          <Link
            href="/"
            className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
          >
            ← Volver
          </Link>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            Valiz · Since 2018
          </p>
        </div>
      </footer>
    </main>
  );
}

function Vida({
  numero,
  titulo,
  subtitulo,
  cuerpo,
}: {
  numero: string;
  titulo: string;
  subtitulo: string;
  cuerpo: string;
}) {
  return (
    <li>
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {numero} · {titulo}
      </p>
      <h3 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
        {subtitulo}.
      </h3>
      <p className="mt-6 font-serif text-lg leading-relaxed sm:text-xl">
        {cuerpo}
      </p>
    </li>
  );
}

function CtaLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-baseline justify-between gap-6 py-6 transition-colors hover:bg-tinta/[0.02]"
      >
        <div>
          <p className="font-serif text-2xl leading-tight tracking-[-0.01em] sm:text-3xl">
            {label}
          </p>
          <p className="mt-2 font-sans text-sm text-niebla">{hint}</p>
        </div>
        <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-cuero transition-transform group-hover:translate-x-1">
          Ir →
        </span>
      </Link>
    </li>
  );
}
