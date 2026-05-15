"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

export type EquipajePieza = {
  sku: string;
  source: "shopify" | "manual" | string;
  adquiridoAt: string | null;
  fotoUrl: string | null;
  fotoFallback: string | null; // ej. foto subida por user para manual
  familiaName: string | null;
  familiaSlug: string | null;
  colorValiz: string | null;
  cueroName: string | null;
  precio: number | null;
  pies2: number | null;
  talleristaName: string | null;
  horasPorUnidad: number | null;
  shopifyHandle: string | null;
};

export function EquipajeGrid({ piezas }: { piezas: EquipajePieza[] }) {
  const [active, setActive] = useState<EquipajePieza | null>(null);

  // Cerrar modal con Esc
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  if (piezas.length === 0) return null;

  return (
    <>
      <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {piezas.map((p, i) => (
          <li key={p.sku + "-" + i} className="flex flex-col items-center">
            <button
              onClick={() => setActive(p)}
              className="group relative flex h-28 w-28 items-center justify-center rounded-full border border-piedra bg-fondo transition-colors hover:border-cuero sm:h-32 sm:w-32"
              aria-label={`Ver detalle de ${p.familiaName ?? p.sku}`}
            >
              {p.fotoUrl || p.fotoFallback ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.fotoUrl ?? p.fotoFallback ?? ""}
                  alt={p.familiaName ?? p.sku}
                  className="h-[78%] w-[78%] rounded-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="font-serif text-xs italic text-niebla">
                  Sin foto
                </span>
              )}
            </button>
            <p className="mt-3 text-center font-serif text-sm leading-tight">
              {p.familiaName ?? p.sku}
            </p>
            {p.colorValiz && (
              <p className="text-center font-sans text-[10px] uppercase tracking-[0.18em] text-cuero">
                {p.colorValiz}
              </p>
            )}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/95 px-4 py-6 backdrop-blur-md sm:px-8"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative grid w-full max-w-4xl grid-cols-1 gap-8 overflow-hidden border border-piedra bg-fondo p-6 sm:grid-cols-[1.1fr_1fr] sm:gap-10 sm:p-10"
            >
              <button
                onClick={() => setActive(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-piedra bg-fondo font-serif text-2xl text-niebla transition-colors hover:border-cuero hover:text-cuero"
                aria-label="Cerrar"
              >
                ×
              </button>

              <div className="flex items-center justify-center">
                {active.fotoUrl || active.fotoFallback ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.fotoUrl ?? active.fotoFallback ?? ""}
                    alt={active.familiaName ?? active.sku}
                    className="max-h-[60vh] w-full object-contain"
                  />
                ) : (
                  <p className="font-serif italic text-niebla">Sin foto disponible.</p>
                )}
              </div>

              <div className="flex flex-col">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  {active.source === "manual" ? "Pieza agregada" : "Tu pieza"}
                </p>
                <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
                  {active.familiaName ?? active.sku}
                </h2>
                {active.colorValiz && (
                  <p className="mt-2 font-serif text-xl italic text-cuero">
                    {active.colorValiz}
                  </p>
                )}

                <dl className="mt-8 space-y-3">
                  <Row label="SKU" value={active.sku} />
                  <Row label="Cuero" value={active.cueroName} />
                  <Row
                    label="Pies² de cuero"
                    value={
                      active.pies2 != null
                        ? `${nf.format(active.pies2)} pie²`
                        : null
                    }
                  />
                  <Row label="Tallerista" value={active.talleristaName} />
                  <Row
                    label="Horas por unidad"
                    value={
                      active.horasPorUnidad
                        ? formatHoras(active.horasPorUnidad)
                        : null
                    }
                  />
                  <Row
                    label="Precio Shopify"
                    value={
                      active.precio
                        ? `$${nf.format(active.precio)} CLP`
                        : null
                    }
                  />
                  <Row
                    label="Adquirida"
                    value={
                      active.adquiridoAt
                        ? formatDate(active.adquiridoAt)
                        : null
                    }
                  />
                </dl>

                <div className="mt-8 flex flex-wrap gap-3">
                  {active.familiaSlug && (
                    <a
                      href={`/piezas/${active.familiaSlug}`}
                      className="border border-tinta px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
                    >
                      Historia de la pieza →
                    </a>
                  )}
                  {active.shopifyHandle && (
                    <a
                      href={`https://www.valiz.cl/products/${active.shopifyHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-cuero px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero transition-colors hover:bg-cuero hover:text-fondo"
                    >
                      Comprar otra ↗
                    </a>
                  )}
                  <a
                    href={`/yo/bitacora/nueva?sku=${encodeURIComponent(active.sku)}`}
                    className="border border-tinta px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
                  >
                    + Bitácora
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return (
      <div className="grid grid-cols-[1fr_2fr] gap-3 border-b border-piedra py-2">
        <dt className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          {label}
        </dt>
        <dd className="font-serif text-sm italic text-niebla">por llenar</dd>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[1fr_2fr] gap-3 border-b border-piedra py-2">
      <dt className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
        {label}
      </dt>
      <dd className="font-serif text-base">{value}</dd>
    </div>
  );
}

function formatHoras(h: number): string {
  const totalMin = Math.round(h * 60);
  const horas = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (horas === 0) return `${min} min`;
  if (min === 0) return `${horas} h`;
  return `${horas} h ${min.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
