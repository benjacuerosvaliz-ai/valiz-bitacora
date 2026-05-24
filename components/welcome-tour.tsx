"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Welcome tour de 4 pasos para el primer login. Aparece en /u/[handle]
 * cuando el visitante ES el dueño y welcomed_at es null. Al completarse
 * (o cerrarse) marca welcomed_at vía /api/auth/welcomed para no
 * volver a aparecer.
 *
 * Steps:
 *  1. Bienvenida + resumen del equipaje
 *  2. Sistema de puntos (1pt = 1 CLP, 200 por bitácora, 5% por referido)
 *  3. Tu código de referido + compartir
 *  4. Tu perfil (foto + handle público)
 */
export function WelcomeTour({
  nombre,
  piezas,
  horas,
  pies,
  puntosBienvenida,
  referidoCode,
  handle,
  tieneAvatar,
}: {
  nombre: string;
  piezas: number;
  horas: number;
  pies: number;
  puntosBienvenida: number; // típicamente 2000 (1 pt = $1 CLP)
  referidoCode: string | null;
  handle: string;
  tieneAvatar: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const primerNombre = nombre.split(/\s+/)[0];

  async function close() {
    setOpen(false);
    try {
      await fetch("/api/auth/welcomed", { method: "POST" });
      router.refresh();
    } catch {
      // no-op
    }
  }

  async function copyCode() {
    if (!referidoCode) return;
    try {
      await navigator.clipboard.writeText(referidoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  }

  const steps = [
    {
      tag: "Bienvenida",
      titulo: `Bienvenido a Valiz, ${primerNombre}.`,
      contenido: (
        <div className="space-y-4 font-serif text-lg leading-relaxed text-tinta sm:text-xl">
          {piezas > 0 ? (
            <>
              <p>
                Ya tienes{" "}
                <strong className="italic text-cuero">
                  {nf.format(piezas)} {piezas === 1 ? "pieza" : "piezas"}
                </strong>{" "}
                a tu nombre — eso son{" "}
                <strong className="italic text-cuero">
                  {nf.format(horas)} {horas === 1 ? "hora" : "horas"}
                </strong>{" "}
                de oficio y{" "}
                <strong className="italic text-cuero">
                  {nf.format(pies)} pies²
                </strong>{" "}
                de cuero rescatado.
              </p>
              <p className="font-serif italic text-niebla">
                Acá las vas a ver con sus detalles y vas a contar dónde han
                ido contigo.
              </p>
            </>
          ) : (
            <p>
              Esta es tu bitácora. Acá vas a registrar tus Valiz y los
              lugares por donde van. Cuanto más te involucres, más puntos
              acumulas.
            </p>
          )}
        </div>
      ),
    },
    {
      tag: "Tu regalo",
      titulo: `$${nf.format(puntosBienvenida)} de regalo para empezar.`,
      contenido: (
        <div className="space-y-5">
          <p className="font-serif text-lg leading-relaxed text-tinta sm:text-xl">
            Cada peso se canjea 1 a 1 en{" "}
            <strong className="italic text-cuero">valiz.cl</strong>, en
            compras desde $25.000.
          </p>
          <p className="font-serif text-lg italic text-niebla">
            Y hay hasta $8.000 más por completar tu bitácora:
          </p>
          <ul className="space-y-3 border-y border-piedra py-5">
            <Mision
              premio="+$1.000"
              titulo="Completa tu perfil"
              detalle="Foto, Instagram y ciudad."
            />
            <Mision
              premio="+$1.000"
              titulo="Tu primera bitácora con foto y lugar"
              detalle="Después +$200 por cada bitácora extra."
            />
            <Mision
              premio="+$1.000"
              titulo="Presenta tu equipaje"
              detalle="Confirma las piezas Valiz que ya tienes."
            />
            <Mision
              premio="+$1.000"
              titulo="Cada amigo invitado"
              detalle="Por cada amigo que crea cuenta con tu código. Sin tope."
            />
            <Mision
              premio="+$1.000"
              titulo="Tu primer canje"
              detalle="Cuando uses tus pesos por primera vez en valiz.cl."
            />
          </ul>
        </div>
      ),
    },
    {
      tag: "Tu código",
      titulo: referidoCode
        ? `Tu código es ${referidoCode}.`
        : "Tu código de referido.",
      contenido: (
        <div className="space-y-5">
          <p className="font-serif text-lg leading-relaxed text-tinta sm:text-xl">
            Compártelo con quien quieras. Si lo usa, obtiene{" "}
            <strong className="italic text-cuero">15% off</strong> en su
            primera compra Valiz, y tú te llevas{" "}
            <strong className="italic text-cuero">5% del subtotal en pesos</strong>.
          </p>
          {referidoCode ? (
            <button
              type="button"
              onClick={copyCode}
              className="group flex w-full items-center justify-between gap-3 border border-cuero bg-cuero/5 px-5 py-4 transition-colors hover:bg-cuero hover:text-fondo"
            >
              <span className="font-mono text-2xl font-semibold tracking-[0.18em] text-cuero group-hover:text-fondo">
                {referidoCode}
              </span>
              <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero group-hover:text-fondo">
                {copied ? "✓ Copiado" : "Copiar"}
              </span>
            </button>
          ) : (
            <p className="font-serif italic text-niebla">
              Pronto se te asigna uno automáticamente.
            </p>
          )}
          <p className="font-serif text-sm italic text-niebla">
            Tu perfil público también lo muestra grande — quien entre
            puede copiarlo y usarlo directo en valiz.cl.
          </p>
        </div>
      ),
    },
    {
      tag: "Tu identidad",
      titulo: "Esto es tu carta Valiz.",
      contenido: (
        <div className="space-y-5">
          <p className="font-serif text-lg leading-relaxed text-tinta sm:text-xl">
            Tu perfil en{" "}
            <code className="font-mono text-[14px] text-cuero">
              bitacora.valiz.cl/u/{handle}
            </code>{" "}
            es la cara que ven los demás. Cuando lo compartís por WhatsApp
            sale tu foto + equipaje + puntos + código.
          </p>
          <div className="border-t border-piedra pt-5">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
              {tieneAvatar ? "Tu foto ya está lista" : "Lo más importante"}
            </p>
            <p className="mt-2 font-serif text-base italic leading-relaxed text-niebla">
              {tieneAvatar
                ? "Si querés cambiarla más adelante, la editás desde Editar perfil."
                : "Subí una foto de perfil para que el preview compartido se vea con tu cara, no con un monograma."}
            </p>
            {!tieneAvatar && (
              <Image
                src="/images/valiz-logo.png"
                alt=""
                width={32}
                height={32}
                className="mt-3 opacity-30"
              />
            )}
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/95 px-5 py-10 backdrop-blur-md sm:px-6"
        >
          <motion.div
            key={step}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl border border-piedra bg-fondo p-7 shadow-[0_20px_60px_rgba(26,26,26,0.12)] sm:p-10"
          >
            {/* Progress dots + Skip */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i <= step ? "bg-cuero" : "bg-piedra"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={close}
                className="font-sans text-[10px] uppercase tracking-[0.22em] text-niebla transition-colors hover:text-tinta"
              >
                Saltar
              </button>
            </div>

            {/* Contenido */}
            <div className="mt-7">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                {current.tag}
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-[1.04] tracking-[-0.02em] sm:text-4xl">
                {current.titulo}
              </h2>
              <div className="mt-6">{current.contenido}</div>
            </div>

            {/* Botones */}
            <div className="mt-9 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={isFirst}
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla transition-colors hover:text-tinta disabled:opacity-30 disabled:hover:text-niebla"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLast) close();
                  else setStep((s) => s + 1);
                }}
                className="bg-tinta px-7 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
              >
                {isLast ? "Empezar" : "Siguiente →"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Mision({
  premio,
  titulo,
  detalle,
}: {
  premio: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex shrink-0 items-center justify-center border border-cuero bg-cuero/5 px-2 py-1 font-mono text-xs font-semibold text-cuero">
        {premio}
      </span>
      <div className="flex-1">
        <p className="font-serif text-base text-tinta">{titulo}</p>
        <p className="mt-0.5 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          {detalle}
        </p>
      </div>
    </li>
  );
}
