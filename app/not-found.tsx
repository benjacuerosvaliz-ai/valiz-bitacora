import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export const metadata = {
  title: "Página no encontrada",
};

/**
 * 404 — coherente con el lenguaje visual de la bitácora.
 * Encuentras esto si una pieza, perfil o bitácora ya no existe (o
 * nunca existió). Te ofrece volver a las rutas vivas.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          404
        </p>
      </header>

      <section className="flex flex-1 items-center px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-2xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Página perdida
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-7xl">
            Esto no está en la bitácora.
          </h1>
          <p className="mt-10 font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
            El link puede estar viejo, o la pieza tomó otro camino. Prueba
            por acá:
          </p>

          <ul className="mt-12 divide-y divide-piedra border-y border-piedra">
            <Salida
              href="/"
              label="Volver al inicio"
              hint="Las piezas, los cueros, los talleres."
            />
            <Salida
              href="/bitacora"
              label="Bitácora colectiva"
              hint="Todas las Valiz andando por el mundo."
            />
            <Salida
              href="/talleristas"
              label="Los talleristas"
              hint="Roberto, César y David."
            />
            <Salida
              href="/sobre"
              label="Sobre Valiz"
              hint="Las tres vidas de cada pieza."
            />
          </ul>
        </div>
      </section>

      <footer className="px-8 py-10 sm:px-16">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Valiz · Since 2018
        </p>
      </footer>
    </main>
  );
}

function Salida({
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
        className="group flex items-baseline justify-between gap-6 py-5 transition-colors hover:bg-tinta/[0.02]"
      >
        <div>
          <p className="font-serif text-xl leading-tight tracking-[-0.01em] sm:text-2xl">
            {label}
          </p>
          <p className="mt-1 font-sans text-sm text-niebla">{hint}</p>
        </div>
        <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-cuero transition-transform group-hover:translate-x-1">
          Ir →
        </span>
      </Link>
    </li>
  );
}
