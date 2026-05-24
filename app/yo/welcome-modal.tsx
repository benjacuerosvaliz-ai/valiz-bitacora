"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Modal de bienvenida que muestra el resumen tras el primer login. Cierra
 * solo (click en X o en el botón), y en el cierre marca welcomed_at en la
 * DB para no volver a aparecer.
 */
export function WelcomeModal({
  nombre,
  piezas,
  horas,
  pies,
  puntos,
  horasPorTallerista,
}: {
  nombre: string;
  piezas: number;
  horas: number;
  pies: number;
  puntos: number;
  horasPorTallerista: [string, number][];
}) {
  const [open, setOpen] = useState(true);

  async function close() {
    setOpen(false);
    try {
      await fetch("/api/auth/welcomed", { method: "POST" });
    } catch {
      // no-op; el modal igual no se vuelve a abrir en esta sesión
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/95 px-6 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl border border-piedra bg-fondo p-10 sm:p-14"
          >
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Bienvenido
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              Tu bitácora ya estaba esperándote, {nombre}.
            </h2>

            {piezas > 0 ? (
              <div className="mt-10 space-y-4 font-serif text-lg leading-relaxed sm:text-xl">
                <p>
                  Tienes{" "}
                  <strong className="font-serif italic text-cuero">
                    {nf.format(piezas)} {piezas === 1 ? "pieza Valiz" : "piezas Valiz"}
                  </strong>{" "}
                  a tu nombre.
                </p>
                <p>
                  Eso son{" "}
                  <strong className="font-serif italic text-cuero">
                    {nf.format(horas)} {horas === 1 ? "hora" : "horas"} de trabajo artesanal
                  </strong>
                  {horasPorTallerista.length > 0 && (
                    <>
                      {" "}—{" "}
                      {horasPorTallerista
                        .map(([n, h]) => `${Math.round(h)}h del taller de ${n}`)
                        .join(", ")}
                    </>
                  )}
                  .
                </p>
                <p>
                  Y{" "}
                  <strong className="font-serif italic text-cuero">
                    {nf.format(pies)} pies² de cuero rescatados
                  </strong>{" "}
                  del descarte industrial gracias a tus compras.
                </p>
                {puntos > 0 && (
                  <p>
                    Te dimos{" "}
                    <strong className="font-serif italic text-cuero">
                      ${nf.format(puntos)}
                    </strong>{" "}
                    como reconocimiento. Canjeables 1 a 1 en valiz.cl, en
                    compras desde $25.000.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-10 space-y-5 font-serif text-lg leading-relaxed text-niebla sm:text-xl">
                <p>
                  Todavía no encontramos compras a este correo en nuestra
                  historia.
                </p>
                <p>
                  Si compraste antes con otro correo, puedes vincularlo en{" "}
                  <a
                    href="/yo/email-alt"
                    className="not-italic text-cuero underline"
                  >
                    /yo/email-alt
                  </a>
                  : te mandamos un código al correo nuevo y movemos tu
                  historial Valiz a tu bitácora.
                </p>
                {puntos > 0 && (
                  <p>
                    Te dejamos{" "}
                    <strong className="not-italic text-cuero">
                      ${nf.format(puntos)} de bienvenida
                    </strong>{" "}
                    de todos modos.
                  </p>
                )}
              </div>
            )}

            <div className="mt-12 flex flex-wrap gap-3">
              <button
                onClick={close}
                className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
              >
                {piezas > 0 ? "Entrar a mi equipaje" : "Cerrar"} →
              </button>
              {piezas === 0 && (
                <a
                  href="/yo/email-alt"
                  className="border border-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
                  onClick={async () => {
                    await fetch("/api/auth/welcomed", { method: "POST" });
                  }}
                >
                  Vincular otro correo →
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
