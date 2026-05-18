"use client";

import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { MapaColectivo } from "@/app/bitacora/mapa/mapa";

import type { Point, Producto3D, StatsGlobales } from "./page";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Preview3D — narrativa Tres Vidas como landing scroll-driven.
 *
 * Paleta Valiz cream/cuero/tinta (NO dark) — coherente con el resto
 * de la app y permite que el globo Mapbox se funda con el fondo.
 *
 * Estructura:
 *  HERO          → logos Valiz girando + título "Cada Valiz tiene tres vidas"
 *  VIDA I        → cuero (Mochila Alforja flotando + pies² rescatados)
 *  VIDA II       → horas en taller (Cartera Zarga + horas + talleres)
 *  VIDA III      → bitácora colectiva (globo Mapbox flotando)
 *  OUTRO         → 1000 pts al crear cuenta + misiones, SOLO CTA crear
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
      className="bg-fondo text-tinta"
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
/* HERO con logos Valiz girando                                            */
/* ------------------------------------------------------------------------ */
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section ref={ref} className="relative h-screen overflow-hidden">
      {/* Logos Valiz girando como fondo (sutiles, decorativos) */}
      <div className="pointer-events-none absolute inset-0">
        <SpinningLogo
          size="18vw"
          duration={45}
          reverse
          className="absolute left-[6%] top-[16%] opacity-25 sm:opacity-35"
        />
        <SpinningLogo
          size="14vw"
          duration={55}
          className="absolute right-[8%] top-[22%] opacity-25 sm:opacity-35"
        />
        <SpinningLogo
          size="10vw"
          duration={40}
          reverse
          className="absolute right-[14%] bottom-[16%] opacity-25 sm:opacity-35"
        />
        <SpinningLogo
          size="8vw"
          duration={50}
          className="absolute left-[12%] bottom-[20%] opacity-25 sm:opacity-35"
        />
      </div>

      <motion.div
        style={{ opacity, y }}
        className="relative sticky top-0 z-10 flex h-screen flex-col items-center justify-center px-6 text-center sm:px-12"
      >
        {/* Logo Valiz principal — sello central, prominente, girando */}
        <SpinningLogo
          size="clamp(80px, 11vw, 140px)"
          duration={40}
          className="opacity-95"
        />
        <p className="mt-5 font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Valiz · Bitácora
        </p>
        <h1 className="mt-5 font-serif text-[12vw] leading-[0.92] tracking-[-0.03em] text-tinta sm:text-[8vw] lg:text-[6.5vw]">
          Cada Valiz tiene
          <br />
          <span className="italic text-cuero">tres vidas.</span>
        </h1>
        <p className="mt-6 max-w-md font-serif text-base italic leading-relaxed text-niebla sm:text-lg">
          La que el cuero ya tuvo, la que pasa en taller, la que viene
          contigo.
        </p>
        <p className="mt-10 font-sans text-[10px] uppercase tracking-[0.32em] text-niebla">
          Desliza ↓
        </p>
      </motion.div>
    </section>
  );
}

function SpinningLogo({
  size,
  duration,
  reverse = false,
  className = "",
}: {
  size: string;
  duration: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    >
      <Image
        src="/images/valiz-logo.png"
        alt=""
        width={1801}
        height={1801}
        className="h-full w-full object-contain"
        priority
      />
    </motion.div>
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
    <section ref={ref} className="relative h-[150vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={`relative grid w-full grid-cols-1 items-center gap-8 px-6 sm:px-12 lg:grid-cols-2 lg:gap-14 lg:px-20 ${
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
                className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(26,26,26,0.18)]"
                draggable={false}
              />
              <div
                className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-tinta/15 blur-2xl"
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
            <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.025em] text-tinta sm:text-6xl lg:text-7xl">
              {titulo}
            </h2>
            <p className="max-w-xl font-serif text-lg leading-relaxed text-tinta/85 sm:text-xl">
              {parrafo}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-6 border-l border-piedra pl-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-4xl leading-none tracking-[-0.015em] text-tinta sm:text-5xl">
                    {s.big}
                  </p>
                  <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                    {s.label}
                  </p>
                  {s.hint && (
                    <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
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
/* VIDA III — bitácora colectiva (globo Mapbox flotando)                   */
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

  const globeOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0.5],
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
    <section ref={ref} className="relative h-[170vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="grid w-full grid-cols-1 items-center gap-8 px-6 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:px-20">
          {/* Globo (sobre bg-fondo, el space-color del fog del mapa
              ya es cream → se funde, no se ve cuadrado) */}
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
            <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.025em] text-tinta sm:text-6xl lg:text-7xl">
              Tu bitácora.
            </h2>
            <p className="max-w-xl font-serif text-lg leading-relaxed text-tinta/85 sm:text-xl">
              Cuando una Valiz sale del taller, empieza su vida más larga.
              Cada lugar que visita, cada foto que le sacas — queda en el
              mapa, para siempre.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-4 border-l border-piedra pl-5">
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
            <p className="mt-6 max-w-xl font-serif text-base italic text-niebla sm:text-lg">
              Y cada paso que sumas te devuelve algo.
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
      <p className="font-serif text-3xl leading-none tracking-[-0.015em] text-tinta sm:text-4xl">
        {big}
      </p>
      <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
        {label}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* OUTRO — 1000 pts al crear cuenta + misiones                             */
/* ------------------------------------------------------------------------ */
function OutroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  // Importante: SE ILUMINA al fondo del scroll. La opacity y el lift
  // suben de 0 a 1 conforme bajas, NO se hacen fade-out al final.
  const opacity = useTransform(scrollYProgress, [0, 0.4, 1], [0, 1, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden">
      {/* Logo Valiz girando sutil de fondo */}
      <div className="pointer-events-none absolute inset-0">
        <SpinningLogo
          size="55vw"
          duration={90}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-20 text-center sm:gap-10 sm:px-12 sm:py-24"
      >
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Sé parte de la bitácora
        </p>
        <h2 className="max-w-4xl font-serif text-[10vw] leading-[0.95] tracking-[-0.03em] text-tinta sm:text-[6vw] lg:text-[5vw]">
          1.000 puntos
          <br />
          <span className="italic text-cuero">por crear tu cuenta.</span>
        </h2>
        <p className="max-w-2xl font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
          Y cada misión que completas suma más. Concursos cada mes con
          piezas Valiz de regalo para los mejores viajes.
        </p>

        {/* Misiones rápidas — 2x2 en mobile, 4 cols en desktop */}
        <div className="mt-6 grid w-full max-w-5xl grid-cols-2 gap-6 border-y border-piedra py-10 text-left sm:gap-8 lg:grid-cols-4 lg:gap-10">
          <Mision
            premio="+1.000"
            titulo="Crear cuenta"
            cuerpo="Te damos la bienvenida con mil puntos en tu equipaje."
          />
          <Mision
            premio="+200"
            titulo="Cada bitácora"
            cuerpo="Foto, ubicación y un texto contando dónde fuiste."
          />
          <Mision
            premio="+5% pts"
            titulo="Recomienda"
            cuerpo="Si alguien compra con tu código, llevas 5% en puntos."
          />
          <Mision
            premio="Valiz"
            titulo="Concursos"
            cuerpo="Cada mes premiamos las mejores bitácoras con piezas nuevas."
          />
        </div>

        <p className="font-serif text-base italic text-niebla">
          1 punto = $1 CLP de descuento en valiz.cl
        </p>

        {/* CTAs duales: crear cuenta (primario) + iniciar sesión */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 bg-tinta px-10 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-fondo transition-colors hover:bg-cuero"
          >
            Crear cuenta →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 border border-piedra bg-fondo px-8 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-tinta transition-colors hover:border-cuero hover:text-cuero"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-8 font-sans text-[10px] uppercase tracking-[0.32em] text-niebla">
          Valiz · Since 2018
        </p>
      </motion.div>
    </section>
  );
}

function Mision({
  premio,
  titulo,
  cuerpo,
}: {
  premio: string;
  titulo: string;
  cuerpo: string;
}) {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold tracking-[-0.01em] text-cuero">
        {premio}
      </p>
      <p className="mt-2 font-serif text-xl leading-tight tracking-[-0.01em] text-tinta">
        {titulo}
      </p>
      <p className="mt-2 font-serif text-sm leading-relaxed text-niebla">
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
