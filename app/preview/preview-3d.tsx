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

import { MapaColectivo } from "@/app/bitacora/mapa/mapa";

import type { Point, Producto3D, StatsGlobales } from "./page";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Preview3D — narrativa Tres Vidas como landing scroll-driven.
 *
 * Estructura:
 *  HERO          → título "Cada Valiz tiene tres vidas"
 *  VIDA I        → cuero (Mochila Alforja flotando + pies² rescatados)
 *  VIDA II       → horas en taller (Cartera Zarga + horas + talleres)
 *  VIDA III      → bitácora colectiva (globo Mapbox + invitación)
 *  OUTRO         → CTAs entrar / bitácora + sistema de puntos explicado
 *
 * Para los productos flotantes: scroll-driven rotateY/rotateX/scale +
 * cursor tilt sutil con spring.
 * Para el globo: solo entra con fade+scale; el propio Mapbox tiene su
 * auto-spin interno. CSS transforms 3D rompen el rendering WebGL del
 * mapa, por eso no se le aplican rotaciones.
 */

export function Preview3D({
  mochila,
  cartera,
  stats,
  points,
}: {
  mochila: Producto3D | null;
  cartera: Producto3D | null;
  stats: StatsGlobales;
  points: Point[];
}) {
  return (
    <main
      className="bg-tinta text-fondo"
      style={{ perspective: "1400px" } as React.CSSProperties}
    >
      <HeroSection />
      {mochila && (
        <VidaSection
          numero="I"
          producto={mochila}
          tagline="Vida pasada"
          titulo="El cuero antes de ser tuyo."
          parrafo="Subproducto de la industria ganadera chilena. Curtido localmente, con procesos cuidadosos. Sin nosotros, descarte. Con nosotros, objeto que vivirá décadas."
          stats={[
            {
              big: nf.format(stats.piesTotal),
              label: "pies² rescatados",
              hint: "en los últimos 12 meses",
            },
          ]}
          textOnRight={true}
        />
      )}
      {cartera && (
        <VidaSection
          numero="II"
          producto={cartera}
          tagline="Vida presente"
          titulo="Las horas en taller."
          parrafo="Tres talleres chilenos. Roberto, César y David lideran cada uno el suyo. Cada pieza pasa por las manos de un equipo entero antes de salir — cortada, cosida, terminada sin atajos ni máquinas industriales."
          stats={[
            {
              big: nf.format(stats.horasTotal),
              label: "horas de oficio",
              hint: "cosidas a mano",
            },
            {
              big: nf.format(stats.piezasTotal),
              label: "piezas terminadas",
              hint: "en los últimos 12 meses",
            },
          ]}
          textOnRight={false}
        />
      )}
      <VidaIIIBitacora stats={stats} points={points} />
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
          Cada Valiz tiene
          <br />
          <span className="italic text-cuero">tres vidas.</span>
        </h1>
        <p className="mt-10 max-w-md font-serif text-base italic leading-relaxed text-fondo/60 sm:text-lg">
          La que el cuero ya tuvo, la que pasa en taller, la que viene
          contigo.
        </p>
        <p className="mt-16 font-sans text-[10px] uppercase tracking-[0.32em] text-fondo/40">
          Desliza ↓
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* VIDA I / II — producto flotando con stats                               */
/* ------------------------------------------------------------------------ */
type StatBlock = { big: string; label: string; hint?: string };

function VidaSection({
  numero,
  producto,
  tagline,
  titulo,
  parrafo,
  stats,
  textOnRight,
}: {
  numero: string;
  producto: Producto3D;
  tagline: string;
  titulo: string;
  parrafo: string;
  stats: StatBlock[];
  textOnRight: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [38, 0, -28]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [12, 0, -8]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1.05, 0.7]);
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [-60, 0, 60]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [0, 1, 1, 0],
  );

  const textX = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -80]);
  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0],
  );

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

  const totalRotY = useCombined(rotateY, tiltYSpring);
  const totalRotX = useCombined(rotateX, tiltXSpring);

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={`relative grid w-full grid-cols-1 items-center gap-10 px-6 sm:px-12 lg:grid-cols-2 lg:gap-16 lg:px-20 ${
            textOnRight ? "" : "lg:[direction:rtl] lg:[&>*]:[direction:ltr]"
          }`}
        >
          {/* Producto */}
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
                src={producto.photo}
                alt={`${producto.familiaName} ${producto.colorValiz ?? ""}`}
                className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
              <div
                className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/40 blur-2xl"
                aria-hidden
              />
            </motion.div>
          </motion.div>

          {/* Texto */}
          <motion.div
            style={{ x: textX, opacity: textOpacity }}
            className="relative flex flex-col gap-6"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
              {numero} · {tagline}
            </p>
            <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
              {titulo}
            </h2>
            <p className="max-w-xl font-serif text-lg leading-relaxed text-fondo/80 sm:text-xl">
              {parrafo}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-6 border-l border-fondo/15 pl-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-4xl leading-none tracking-[-0.015em] text-fondo sm:text-5xl">
                    {s.big}
                  </p>
                  <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                    {s.label}
                  </p>
                  {s.hint && (
                    <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-fondo/50">
                      {s.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* VIDA III — bitácora colectiva (globo Mapbox)                            */
/* ------------------------------------------------------------------------ */
function VidaIIIBitacora({
  stats,
  points,
}: {
  stats: StatsGlobales;
  points: Point[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // El globo NO rota con CSS transforms — eso rompe el rendering WebGL.
  // Solo fade + scale leve.
  const globeOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0.4],
  );
  const globeScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.7, 1, 0.9],
  );

  const textX = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -80]);
  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0],
  );

  return (
    <section ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="grid w-full grid-cols-1 items-center gap-10 px-6 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-20">
          {/* Globo */}
          <motion.div
            style={{ opacity: globeOpacity, scale: globeScale }}
            className="relative h-[55vh] w-full sm:h-[70vh]"
          >
            <MapaColectivo points={points} />
          </motion.div>

          {/* Texto */}
          <motion.div
            style={{ x: textX, opacity: textOpacity }}
            className="relative flex flex-col gap-6"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
              III · Vida futura
            </p>
            <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
              Tu bitácora.
            </h2>
            <p className="max-w-xl font-serif text-lg leading-relaxed text-fondo/80 sm:text-xl">
              Cuando una Valiz sale del taller, empieza su vida más larga.
              Cada lugar que visita, cada foto que le sacas — queda en el
              mapa, para siempre.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-4 border-l border-fondo/15 pl-5">
              <MiniStat big={nf.format(stats.bitacorasTotal)} label="Bitácoras" />
              <MiniStat
                big={nf.format(stats.personasUnicas)}
                label={stats.personasUnicas === 1 ? "Persona" : "Personas"}
              />
              <MiniStat
                big={nf.format(stats.lugaresUnicos)}
                label={stats.lugaresUnicos === 1 ? "Lugar" : "Lugares"}
              />
            </div>
            <p className="mt-6 max-w-xl font-serif text-base italic text-fondo/60 sm:text-lg">
              Y cada bitácora que sube te devuelve algo.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl leading-none tracking-[-0.015em] text-fondo sm:text-4xl">
        {big}
      </p>
      <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
        {label}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* OUTRO — sistema de puntos + CTAs                                        */
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
          Sé parte de la bitácora
        </p>
        <h2 className="max-w-4xl font-serif text-[9vw] leading-[0.95] tracking-[-0.03em] sm:text-[5.5vw] lg:text-[4.5vw]">
          Tu Valiz también
          <br />
          <span className="italic text-cuero">tiene historia.</span>
        </h2>

        {/* Sistema de puntos explicado */}
        <div className="mt-4 grid w-full max-w-3xl grid-cols-1 gap-6 border-y border-fondo/15 py-10 text-left sm:grid-cols-3 sm:gap-10">
          <PuntoStep
            n="1"
            titulo="Sube una bitácora"
            cuerpo="Foto, lugar y un texto contando dónde fuiste con tu Valiz."
          />
          <PuntoStep
            n="2"
            titulo="Gana 200 puntos"
            cuerpo="Por cada bitácora con ubicación y texto. 1 pt = $1 CLP de descuento."
          />
          <PuntoStep
            n="3"
            titulo="Canjea en valiz.cl"
            cuerpo="Tus puntos se convierten en código de descuento para tu próxima pieza."
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="border border-fondo bg-fondo px-8 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-cuero hover:border-cuero"
          >
            Crear cuenta →
          </Link>
          <Link
            href="/bitacora"
            className="border border-fondo/30 px-8 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:border-cuero hover:text-cuero"
          >
            Ver bitácora colectiva
          </Link>
        </div>

        <p className="mt-12 font-sans text-[10px] uppercase tracking-[0.32em] text-fondo/40">
          Valiz · Since 2018
        </p>
      </motion.div>
    </section>
  );
}

function PuntoStep({
  n,
  titulo,
  cuerpo,
}: {
  n: string;
  titulo: string;
  cuerpo: string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
        Paso {n}
      </p>
      <p className="mt-3 font-serif text-2xl leading-tight tracking-[-0.01em] text-fondo">
        {titulo}
      </p>
      <p className="mt-3 font-serif text-base leading-relaxed text-fondo/60">
        {cuerpo}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Helper                                                                  */
/* ------------------------------------------------------------------------ */
function useCombined(a: MotionValue<number>, b: MotionValue<number>) {
  return useTransform([a, b], (values) => {
    const [va, vb] = values as [number, number];
    return va + vb;
  });
}
