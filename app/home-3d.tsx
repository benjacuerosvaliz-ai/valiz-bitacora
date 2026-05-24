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
 * Home3D — landing scroll-driven, optimizada para conversión.
 *
 * Paleta Valiz cream/cuero/tinta (NO dark) — coherente con el resto
 * de la app y permite que el globo Mapbox se funda con el fondo.
 *
 * Estructura (incentivo primero, historia después):
 *  1. INCENTIVO     → $2.000 + misiones + CTA crear cuenta (sin fade)
 *  2. PRUEBA SOCIAL → globo de bitácoras de la comunidad (Vida III)
 *  3. VIDA I        → cuero rescatado (por qué Valiz)
 *  4. VIDA II       → horas en taller (cómo se hace)
 *  5. CIERRE        → re-CTA crear cuenta al final del scroll
 */

export function Home3D({
  cartera,
  stats,
  points,
}: {
  cartera: Producto3D | null;
  stats: StatsGlobales;
  points: Point[];
}) {
  return (
    <main
      className="bg-fondo text-tinta"
      style={{ perspective: "1400px" } as React.CSSProperties}
    >
      {/* 1. HERO INCENTIVO — primero, sin fade. La gente quiere saber
            qué se lleva antes de leer la filosofía. */}
      <IncentivoHero />

      {/* 2. PRUEBA SOCIAL — el globo lleno de bitácoras de otros. Justo
            después del CTA muestra que el sistema ya está vivo. */}
      <VidaIIIBitacora stats={stats} points={points} />

      {/* 3. HISTORIA — para quien quiere saber por qué vale la pena.
            Cueros rescatados → horas en taller. */}
      <VidaCueroSection
        numero="I"
        tagline="Por qué Valiz"
        titulo="El cuero antes de ser tuyo."
        parrafo="Subproducto de la industria ganadera chilena. Curtido localmente, con procesos cuidadosos. Sin nosotros, descarte. Con nosotros, objeto que vivirá décadas."
        imagen="/images/vida-pasada.jpg"
        alt="Pila de cueros enrollados en distintos colores"
        stats={[
          {
            big: nf.format(stats.piesTotal),
            label: "pies² rescatados",
            hint: "en los últimos 12 meses",
          },
        ]}
        textOnRight={true}
      />
      {cartera && (
        <VidaSection
          numero="II"
          producto={cartera}
          tagline="Cómo se hace"
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

      {/* 4. CIERRE — re-CTA al final del scroll, ya con contexto. */}
      <CierreCTA />
    </main>
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
/* VIDA I CUERO — imagen libre (no producto) con scroll-driven motion      */
/* ------------------------------------------------------------------------ */
function VidaCueroSection({
  numero,
  tagline,
  titulo,
  parrafo,
  imagen,
  alt,
  stats,
  textOnRight,
}: {
  numero: string;
  tagline: string;
  titulo: string;
  parrafo: string;
  imagen: string;
  alt: string;
  stats: StatBlock[];
  textOnRight: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // La foto de cueros no necesita rotar tan fuerte (no es un objeto 3D
  // como una mochila) — usamos zoom + leve pan + tilt cursor para
  // "respirarla". Sensación de cuero vivo.
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1.18, 1.05]);
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [-30, 0, 30]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [0, 1, 1, 0.4],
  );

  const textX = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -80]);
  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0],
  );

  // Cursor parallax sutil
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
    tiltY.set(dx * 6);
    tiltX.set(-dy * 4);
  }
  function onMouseLeave() {
    tiltY.set(0);
    tiltX.set(0);
  }

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
          {/* Foto de cueros con frame minimal y movimiento */}
          <motion.div
            style={{ opacity, x, y }}
            className="relative flex items-center justify-center"
          >
            <motion.div
              style={{
                rotateY: tiltYSpring,
                rotateX: tiltXSpring,
                transformStyle: "preserve-3d" as const,
              }}
              className="relative aspect-[3/4] w-[78vw] max-w-[480px] overflow-hidden border border-piedra shadow-[0_30px_60px_rgba(26,26,26,0.18)] sm:w-[50vw]"
            >
              <motion.img
                src={imagen}
                alt={alt}
                style={{ scale }}
                className="h-full w-full object-cover"
                draggable={false}
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
/* INCENTIVO HERO + CIERRE CTA — primero y último, sin fade               */
/* ------------------------------------------------------------------------ */
/**
 * IncentivoHero — primera sección de la home. Sin fade, visible
 * inmediato. Header con logo Valiz girando, $2.000 + misiones + CTAs.
 * Al pie: "Conoce la historia ↓" que invita al scroll narrativo.
 */
function IncentivoHero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Logo Valiz girando sutil de fondo */}
      <div className="pointer-events-none absolute inset-0">
        <SpinningLogo
          size="55vw"
          duration={90}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center gap-7 px-6 py-16 text-center sm:gap-9 sm:px-12 sm:py-20">
        {/* Logo sello arriba para anclar la marca */}
        <SpinningLogo
          size="clamp(56px, 7vw, 90px)"
          duration={40}
          className="opacity-95"
        />

        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Valiz · Bitácora
        </p>
        <h1 className="max-w-4xl font-serif text-[10vw] leading-[0.95] tracking-[-0.03em] text-tinta sm:text-[6vw] lg:text-[5vw]">
          $2.000 al instante.
          <br />
          <span className="italic text-cuero">Hasta $10.000 si te involucras.</span>
        </h1>
        <p className="max-w-2xl font-serif text-lg italic leading-relaxed text-niebla sm:text-xl">
          Te damos dos mil pesos por crear tu cuenta. El resto los ganas
          completando tu bitácora y trayendo a tus amigos.
        </p>

        {/* Misiones — 2x2 en mobile, 4 cols en desktop */}
        <div className="mt-2 grid w-full max-w-5xl grid-cols-2 gap-5 border-y border-piedra py-8 text-left sm:gap-7 lg:grid-cols-4 lg:gap-9">
          <Mision
            premio="$2.000"
            titulo="Crear cuenta"
            cuerpo="Tu bienvenida. Aparecen al toque en tu equipaje."
          />
          <Mision
            premio="+$1.000"
            titulo="Completa tu perfil"
            cuerpo="Foto, Instagram y ciudad. Te da identidad en la bitácora."
          />
          <Mision
            premio="+$1.000"
            titulo="Tu primera bitácora"
            cuerpo="Foto, ubicación y un texto contando dónde fuiste con tu Valiz."
          />
          <Mision
            premio="+$1.000"
            titulo="Cada amigo invitado"
            cuerpo="Por cada amigo que crea cuenta con tu código. Sin tope."
          />
        </div>

        <p className="font-serif text-base italic text-niebla">
          Tus pesos en valiz.cl — canjeables en compras desde $25.000.
        </p>

        {/* CTAs duales: crear cuenta (primario) + iniciar sesión */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 bg-tinta px-10 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-fondo transition-colors hover:bg-cuero"
          >
            Crear cuenta gratis →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 border border-piedra bg-fondo px-8 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-tinta transition-colors hover:border-cuero hover:text-cuero"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.32em] text-niebla">
          Conoce la historia ↓
        </p>
      </div>
    </section>
  );
}

/**
 * CierreCTA — al final del scroll, después de las dos vidas. Re-CTA
 * crear cuenta para quien llegó hasta abajo enganchado por la
 * historia (que ya pasó por la prueba social del globo arriba).
 */
function CierreCTA() {
  return (
    <section className="relative border-t border-piedra bg-tinta/[0.02] px-6 py-20 text-center sm:px-12 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Sé parte
        </p>
        <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.025em] text-tinta sm:text-5xl">
          Ya sabes cómo se hace.
          <br />
          <span className="italic text-cuero">Ahora súmate.</span>
        </h2>
        <p className="mt-5 font-serif text-lg italic leading-relaxed text-niebla">
          $2.000 al instante por crear cuenta. Tu equipaje, tu bitácora,
          tu mapa.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 bg-tinta px-10 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-fondo transition-colors hover:bg-cuero"
          >
            Crear cuenta gratis →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 border border-piedra bg-fondo px-8 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-tinta transition-colors hover:border-cuero hover:text-cuero"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-10 font-sans text-[10px] uppercase tracking-[0.32em] text-niebla">
          Valiz · Since 2018
        </p>
      </div>
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
