"use client";

import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Link from "next/link";
import { useRef } from "react";

/**
 * Preview3D — landing experimental con productos flotando en pseudo-3D.
 * Inspiración: agency sites con scroll-driven product reveals.
 *
 * Estructura:
 * - Hero pantalla completa (sticky title)
 * - 1 sección por producto, cada uno con un sticky stage donde el
 *   producto flota y rota mientras el texto contextual scrollea
 * - Outro con CTAs a /bitacora y /sobre
 *
 * Técnicas:
 * - useScroll por sección + useTransform para mapear scroll → rotateY,
 *   scale, x, y
 * - CSS perspective + transform-style preserve-3d en el contenedor
 * - Cursor parallax sutil con useMotionValue (mousemove)
 *
 * Performance: 5 imágenes webp ya optimizadas; framer-motion usa
 * requestAnimationFrame; nothing 3D-engine-heavy.
 */

export type Hero = {
  sku: string;
  photo: string;
  familiaName: string;
  familiaSlug: string;
  colorValiz: string | null;
  horas: number;
  shopifyHandle: string | null;
};

export function Preview3D({ heroes }: { heroes: Hero[] }) {
  return (
    <main
      className="bg-tinta text-fondo"
      style={{ perspective: "1400px" } as React.CSSProperties}
    >
      {/* HERO ----------------------------------------------------------- */}
      <HeroSection />

      {/* PRODUCTOS ------------------------------------------------------ */}
      {heroes.map((h, i) => (
        <ProductStage key={h.sku} hero={h} index={i + 1} total={heroes.length} />
      ))}

      {/* OUTRO ---------------------------------------------------------- */}
      <OutroSection />
    </main>
  );
}

/* ------------------------------------------------------------------------ */
/* HERO                                                                    */
/* ------------------------------------------------------------------------ */
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);

  return (
    <section ref={ref} className="relative h-[110vh]">
      <motion.div
        style={{ opacity, y }}
        className="sticky top-0 flex h-screen flex-col items-center justify-center px-6 text-center sm:px-12"
      >
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Valiz · Bitácora
        </p>
        <h1 className="mt-8 font-serif text-[12vw] leading-[0.92] tracking-[-0.03em] text-fondo sm:text-[8vw] lg:text-[6.5vw]">
          Cuero recuperado.
          <br />
          <span className="italic text-cuero">Manos chilenas.</span>
        </h1>
        <p className="mt-10 max-w-md font-serif text-base italic leading-relaxed text-fondo/60 sm:text-lg">
          Cada Valiz vive tres vidas. Acá empieza la tercera.
        </p>
        <p className="mt-16 font-sans text-[10px] uppercase tracking-[0.32em] text-fondo/40">
          Desliza ↓
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* PRODUCT STAGE                                                           */
/* ------------------------------------------------------------------------ */
function ProductStage({
  hero,
  index,
  total,
}: {
  hero: Hero;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Producto entra rotado y se endereza al centro del scroll, luego sale
  // ligeramente rotado al otro lado.
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [38, 0, -28]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [12, 0, -8]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1.05, 0.7]);
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [-60, 0, 60]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [0, 1, 1, 0],
  );

  // Texto contextual desde la derecha
  const textX = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -80]);
  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0],
  );

  // Cursor parallax adicional (tilt sutil)
  const tiltY = useMotionValue(0);
  const tiltX = useMotionValue(0);
  const tiltYSpring = useSpring(tiltY, { stiffness: 140, damping: 18 });
  const tiltXSpring = useSpring(tiltX, { stiffness: 140, damping: 18 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    tiltY.set(dx * 12);
    tiltX.set(-dy * 8);
  }
  function onMouseLeave() {
    tiltY.set(0);
    tiltX.set(0);
  }

  // Combinar rotación de scroll + tilt
  const totalRotY = useCombined(rotateY, tiltYSpring);
  const totalRotX = useCombined(rotateX, tiltXSpring);

  const numero = String(index).padStart(2, "0");

  // Alterna lado del texto: impar derecha, par izquierda
  const textOnRight = index % 2 === 1;

  return (
    <section ref={ref} className="relative h-[180vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={`relative grid w-full grid-cols-1 items-center gap-8 px-6 sm:px-12 lg:grid-cols-2 lg:gap-16 lg:px-20 ${
            textOnRight ? "" : "lg:[direction:rtl] lg:[&>*]:[direction:ltr]"
          }`}
        >
          {/* Imagen del producto */}
          <motion.div
            style={{ opacity, x }}
            className="relative flex items-center justify-center"
          >
            <motion.div
              style={{
                rotateY: totalRotY,
                rotateX: totalRotX,
                scale,
                transformStyle: "preserve-3d" as const,
              }}
              className="relative aspect-square w-[78vw] max-w-[520px] sm:w-[55vw]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.photo}
                alt={`${hero.familiaName} ${hero.colorValiz ?? ""}`}
                className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
              {/* Sombra debajo, simulación piso */}
              <div
                className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/40 blur-2xl"
                aria-hidden
              />
            </motion.div>
          </motion.div>

          {/* Texto contextual */}
          <motion.div
            style={{ x: textX, opacity: textOpacity }}
            className="relative flex flex-col gap-6"
          >
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                #{numero}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fondo/40">
                / {String(total).padStart(2, "0")}
              </span>
            </div>
            <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
              {hero.familiaName}.
            </h2>
            {hero.colorValiz && (
              <p className="font-serif text-2xl italic text-cuero">
                {hero.colorValiz}
              </p>
            )}
            <div className="mt-4 space-y-3 border-l border-fondo/15 pl-5">
              {hero.horas > 0 && (
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-fondo/60">
                  {hero.horas} {hero.horas === 1 ? "hora" : "horas"} por unidad
                </p>
              )}
              <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-fondo/60">
                Cosida a mano en taller chileno
              </p>
              <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-fondo/60">
                Cuero curtido localmente
              </p>
            </div>
            <div className="mt-6">
              <Link
                href={`/piezas/${hero.familiaSlug}`}
                className="inline-flex items-center gap-2 border border-fondo/30 px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:border-cuero hover:text-cuero"
              >
                Ver pieza →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* OUTRO                                                                   */
/* ------------------------------------------------------------------------ */
function OutroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [80, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <section ref={ref} className="relative min-h-screen">
      <motion.div
        style={{ y, opacity }}
        className="flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-32 text-center sm:px-12"
      >
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Tres vidas del objeto
        </p>
        <h2 className="font-serif text-[10vw] leading-[0.95] tracking-[-0.03em] sm:text-[6vw] lg:text-[5vw]">
          La que el cuero ya tuvo.
          <br />
          <span className="text-fondo/40">La que pasa en taller.</span>
          <br />
          <span className="italic text-cuero">La que viene contigo.</span>
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/bitacora"
            className="border border-fondo bg-fondo px-7 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-cuero hover:border-cuero"
          >
            Ver bitácora colectiva →
          </Link>
          <Link
            href="/sobre"
            className="border border-fondo/30 px-7 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:border-cuero hover:text-cuero"
          >
            Sobre Valiz
          </Link>
        </div>
        <p className="mt-12 font-sans text-[10px] uppercase tracking-[0.32em] text-fondo/40">
          Valiz · Since 2018
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Helper: combina dos MotionValues sumándolos                             */
/* ------------------------------------------------------------------------ */
function useCombined(a: MotionValue<number>, b: MotionValue<number>) {
  return useTransform([a, b], (values) => {
    const [va, vb] = values as [number, number];
    return va + vb;
  });
}
