"use client";

import Link from "next/link";
import { useEffect } from "react";

import { BrandMark } from "@/components/brand-mark";

/**
 * Error boundary global. Captura crashes runtime y rendering errors
 * de cualquier ruta. Reemplaza la pantalla en blanco con UI Valiz +
 * acción de reintentar.
 *
 * Next.js inyecta `reset()` que vuelve a montar el segmento que tiró.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log para monitoring (Vercel captura console.error en logs)
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Algo se rompió
        </p>
      </header>

      <section className="flex flex-1 items-center px-8 py-24 sm:px-16 sm:py-32">
        <div className="mx-auto max-w-2xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Costura suelta
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-6xl">
            Esto se nos cayó del taller.
          </h1>
          <p className="mt-10 font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
            Algo no cargó como esperábamos. Suele resolverse intentando
            de nuevo. Si insiste, escríbenos.
          </p>

          {error.digest && (
            <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
              Referencia: {error.digest}
            </p>
          )}

          <div className="mt-12 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="border border-tinta bg-tinta px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero hover:border-cuero"
            >
              Intentar de nuevo
            </button>
            <Link
              href="/"
              className="border border-piedra px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:border-cuero hover:text-cuero"
            >
              Volver al inicio
            </Link>
          </div>
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
