"use client";

import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useRef, useState } from "react";

const nf = new Intl.NumberFormat("es-CL");
const WHATSAPP_NUMERO = "56966466977"; // +56 9 6646 6977
const WHATSAPP_TEXT =
  "Hola Benja, vimos la propuesta Valiz × Mamás Mateas y queremos avanzar.";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

const MATEAS_LOGO = "/images/mamas-mateas-logo.png";
const VIDEO_HERO = "/videos/mamas-alforja.mp4";

export type ColorVariant = {
  name: string;
  hint: string;
  foto: string;
  href: string | null;
};

/**
 * Propuesta Valiz × Mamás Mateas — landing scroll-driven privada.
 *
 * Flujo nuevo:
 *  HERO          — video Alforja Mama + título + Valiz × Mamás Mateas
 *  CARTA         — apertura breve (3 líneas)
 *  EL PRODUCTO   — specs + paleta (10 colores con CTA a valiz.cl) juntos
 *  POR QUÉ       — 4 razones de match
 *  COMERCIAL     — tabla + total destacado
 *  CUMPLIMIENTO  — 7 ✓ del checklist Mateas
 *  CIERRE        — "Esto puede ser un hitazo" + único CTA WhatsApp
 */
export function Propuesta({ colores }: { colores: ColorVariant[] }) {
  return (
    <main className="bg-fondo text-tinta">
      <HeroSection />
      <CartaSection />
      <ProductoYPaletaSection colores={colores} />
      <PorQueSection />
      <PropuestaComercialSection />
      <CumplimientoSection />
      <FaseDosSection />
      <CierreSection />
    </main>
  );
}

/* ------------------------------------------------------------------------ */
/* HERO con video                                                          */
/* ------------------------------------------------------------------------ */
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);

  function toggleMute() {
    if (!videoRef.current) return;
    const next = !muted;
    videoRef.current.muted = next;
    if (!next) {
      // Al activar audio, asegurar que esté reproduciendo desde algún
      // punto (no desde el inicio) — mejor UX
      videoRef.current.play().catch(() => {});
    }
    setMuted(next);
  }

  return (
    <section
      ref={ref}
      className="relative min-h-screen overflow-hidden"
    >
      {/* Logo Valiz girando sutil de fondo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        className="pointer-events-none absolute left-[-12%] top-[-12%] h-[55vw] w-[55vw] opacity-[0.05]"
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

      <motion.div
        style={{ opacity, y }}
        className="relative sticky top-0 flex h-screen items-center"
      >
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-12 lg:px-16">
          {/* Tag + H1 (siempre arriba) */}
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.32em] text-cuero sm:text-[11px]">
            Propuesta comercial · Mayo 2026
          </p>
          <h1 className="mt-3 font-serif text-[13vw] leading-[0.92] tracking-[-0.03em] sm:text-[8vw] lg:text-[6vw]">
            Para{" "}
            <span className="italic text-cuero">Mamás Mateas.</span>
          </h1>

          {/* MOBILE: video vertical IZQ + descripción/collab DER en row */}
          <div className="mt-6 grid grid-cols-[auto_1fr] items-start gap-4 lg:hidden">
            {/* Video vertical chico al lado del texto */}
            <div className="relative aspect-[9/16] w-[36vw] max-w-[170px] overflow-hidden shadow-[0_20px_40px_rgba(26,26,26,0.18)]">
              <video
                ref={videoRef}
                src={VIDEO_HERO}
                autoPlay
                loop
                muted={muted}
                playsInline
                poster="/images/productos/mochila-alforja-mama/MAM-G-CAM/01-front.webp"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Activar sonido" : "Silenciar"}
                className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-fondo/85 text-tinta backdrop-blur-sm transition-colors hover:bg-cuero hover:text-fondo"
              >
                {muted ? <SoundOffIcon /> : <SoundOnIcon />}
              </button>
            </div>

            {/* Texto + collab apilados, al lado del video */}
            <div className="flex flex-col gap-3">
              <p className="font-serif text-sm italic leading-snug text-niebla">
                Mochila Alforja Mamá — la pieza más esperada del catálogo
                Valiz.
              </p>
              <div className="flex flex-col gap-2 border-l-2 border-cuero pl-3">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/valiz-logo.png"
                    alt="Valiz"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta">
                    Valiz
                  </span>
                </div>
                <span className="font-serif text-base italic text-cuero leading-none">
                  ×
                </span>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={MATEAS_LOGO}
                    alt="Mamás Mateas"
                    className="h-7 w-7 rounded-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta">
                    Mamás Mateas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP: layout original (texto izq grande + video letterbox der) */}
          <div className="mt-10 hidden grid-cols-[1.1fr_1fr] items-center gap-14 lg:grid">
            <div className="flex flex-col gap-5">
              <p className="font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
                Mochila Alforja Mamá — la pieza más esperada del catálogo
                Valiz.
              </p>
              <div className="mt-2 flex items-center gap-5 border-l-2 border-cuero pl-5">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/valiz-logo.png"
                    alt="Valiz"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                  <span className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-tinta">
                    Valiz
                  </span>
                </div>
                <span className="font-serif text-2xl italic text-cuero">
                  ×
                </span>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={MATEAS_LOGO}
                    alt="Mamás Mateas"
                    className="h-10 w-10 rounded-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-tinta">
                    Mamás Mateas
                  </span>
                </div>
              </div>
            </div>

            {/* Video letterbox horizontal (desktop only) */}
            <div className="relative aspect-[5/4] w-full max-w-[560px] overflow-hidden bg-tinta shadow-[0_30px_60px_rgba(26,26,26,0.22)]">
              <video
                src={VIDEO_HERO}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                aria-hidden
              />
              <video
                src={VIDEO_HERO}
                autoPlay
                loop
                muted={muted}
                playsInline
                poster="/images/productos/mochila-alforja-mama/MAM-G-CAM/01-front.webp"
                className="relative h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Activar sonido" : "Silenciar"}
                className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-fondo/85 text-tinta backdrop-blur-sm transition-colors hover:bg-cuero hover:text-fondo"
              >
                {muted ? <SoundOffIcon /> : <SoundOnIcon />}
              </button>
            </div>
          </div>
        </div>

        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-sans text-[10px] uppercase tracking-[0.32em] text-niebla">
          Continuar ↓
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* CARTA — versión corta                                                   */
/* ------------------------------------------------------------------------ */
function CartaSection() {
  return (
    <section className="border-t border-piedra px-6 py-20 sm:px-12 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Hola, equipo Mamás Mateas
        </p>
        <p className="mt-7 font-serif text-2xl leading-relaxed text-tinta sm:text-3xl">
          Somos{" "}
          <strong className="italic text-cuero">Valiz</strong>: marca
          chilena de marroquinería artesanal, seis años haciendo cuero
          genuino a mano en talleres locales. Queremos ofrecerles
          formalmente nuestra{" "}
          <strong className="italic text-cuero">Mochila Alforja Mamá</strong>
          {" "}— la pieza más pedida de nuestro catálogo y la que mejor
          encaja con su comunidad.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* PRODUCTO + PALETA juntos                                                */
/* ------------------------------------------------------------------------ */
function ProductoYPaletaSection({ colores }: { colores: ColorVariant[] }) {
  return (
    <section className="border-t border-piedra bg-tinta/[0.02] px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          El producto
        </p>
        <h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
          Mochila Alforja Mamá.
        </h2>
        <p className="mt-6 max-w-2xl font-serif text-lg italic leading-relaxed text-niebla sm:text-xl">
          Diseñada para acompañar a las mamás en cada salida con su
          guagua, sin renunciar al estilo.
        </p>

        {/* Specs en grid horizontal */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          <Spec
            tag="Material"
            titulo="100% cuero genuino"
            cuerpo="Chileno · curtido al cromo · hechura artesanal a mano"
          />
          <Spec
            tag="Dimensiones"
            titulo="40 × 32 × 16 cm"
            cuerpo="Alto × Ancho × Profundidad · Peso aprox 1.400 g"
          />
          <Spec
            tag="Capacidad"
            titulo="9+ compartimentos"
            cuerpo="Sección impermeable para mudador · biberones · llaves, celular y accesorios"
          />
        </div>

        {/* Paleta 10 colores */}
        <div className="mt-20 border-t border-piedra pt-12">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
            Diez colores · producción permanente
          </p>
          <p className="mt-3 max-w-2xl font-serif text-base italic text-niebla">
            Todos disponibles para reposición continua.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-5">
            {colores.map((c) => (
              <li key={c.name} className="flex flex-col">
                <div className="group relative aspect-square w-full overflow-hidden border border-piedra bg-fondo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.foto}
                    alt={c.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 font-serif text-base leading-tight tracking-[-0.01em] text-tinta sm:text-lg">
                  {c.name}
                </p>
                <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                  {c.hint}
                </p>
                {c.href && (
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cuero transition-colors hover:text-tinta"
                  >
                    Ver en valiz.cl ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Spec({
  tag,
  titulo,
  cuerpo,
}: {
  tag: string;
  titulo: string;
  cuerpo: string;
}) {
  return (
    <div className="border-l-2 border-cuero pl-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-cuero">
        {tag}
      </p>
      <p className="mt-2 font-serif text-2xl leading-tight tracking-[-0.015em] sm:text-3xl">
        {titulo}
      </p>
      <p className="mt-2 font-serif text-sm leading-relaxed text-niebla">
        {cuerpo}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* POR QUÉ                                                                 */
/* ------------------------------------------------------------------------ */
function PorQueSection() {
  const razones = [
    {
      titulo: "Cliente común",
      cuerpo:
        "La mamá chilena que valora curaduría, oficio y producto que dura.",
    },
    {
      titulo: "Posicionamiento curado",
      cuerpo:
        "Mateas no vende cualquier cosa, y nosotros tampoco fabricamos cualquier cosa.",
    },
    {
      titulo: "Producto único",
      cuerpo:
        "No hay otra mochila alforja mamá artesanal con la propuesta de Valiz en el mercado local.",
    },
    {
      titulo: "Reposiciones programadas",
      cuerpo:
        "Queremos ser un proveedor estable, no un one-shot. Producción permanente.",
    },
  ];

  return (
    <section className="border-t border-piedra px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Por qué encajamos
        </p>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.02em] sm:text-5xl">
          Dos marcas con la misma filosofía.
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-14 sm:gap-y-12">
          {razones.map((r, i) => (
            <div key={r.titulo}>
              <p className="font-mono text-xl font-semibold tracking-tight text-cuero sm:text-2xl">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-serif text-lg leading-tight tracking-[-0.015em] sm:mt-3 sm:text-2xl lg:text-3xl">
                {r.titulo}
              </h3>
              <p className="mt-2 font-serif text-sm leading-relaxed text-niebla sm:mt-3 sm:text-base lg:text-lg">
                {r.cuerpo}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* PROPUESTA COMERCIAL                                                     */
/* ------------------------------------------------------------------------ */
function PropuestaComercialSection() {
  const filas: { label: string; valor: string; accent?: boolean }[] = [
    { label: "Producto", valor: "Mochila Alforja Mamá" },
    { label: "Colores disponibles", valor: "10 colores (paleta activa permanente)" },
    {
      label: "Cantidad propuesta",
      valor: "10 unidades por color × 10 colores = 100 unidades",
    },
    {
      label: "Precio neto a Mateas",
      valor: `$${nf.format(92000)} / unidad (sin IVA)`,
    },
    {
      label: "PVP retail sugerido",
      valor: `$${nf.format(149990)} con IVA`,
    },
    {
      label: "Margen Mateas sobre PVP",
      valor: "27% (markup 37% sobre costo)",
      accent: true,
    },
    {
      label: "Subtotal neto",
      valor: `$${nf.format(9200000)}`,
    },
    { label: "IVA 19%", valor: `$${nf.format(1748000)}` },
    {
      label: "Plazo de pago",
      valor: "60 días vía Lokal — sin comisión, transacción con respaldo",
      accent: true,
    },
    {
      label: "Plazo entrega inicial",
      valor: "45 días desde aceptación de OC",
    },
    {
      label: "Reposiciones",
      valor: "Mensuales según rotación · 21 días",
    },
  ];

  return (
    <section className="border-t border-piedra bg-tinta/[0.02] px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          La propuesta comercial
        </p>
        <h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.025em] sm:text-6xl">
          100 unidades.
          <br />
          <span className="italic text-cuero">
            ${nf.format(9200000)} neto.
          </span>
        </h2>
        <p className="mt-6 max-w-2xl font-serif text-lg italic leading-relaxed text-niebla">
          Stock robusto para sus tiendas físicas y eCommerce, suficiente
          para los primeros 2-3 meses. Después, programa de reposición
          mensual según rotación real.
        </p>

        <dl className="mt-14 divide-y divide-piedra border-y border-piedra">
          {filas.map((f) => (
            <div
              key={f.label}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <dt className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
                {f.label}
              </dt>
              <dd
                className={`font-serif text-lg leading-tight sm:text-right ${
                  f.accent ? "italic text-cuero" : "text-tinta"
                }`}
              >
                {f.valor}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex items-baseline justify-between gap-6 bg-tinta px-7 py-7 text-fondo">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
            Total factura Mateas
          </p>
          <p className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
            ${nf.format(10948000)}
          </p>
        </div>

        {/* Bloque Lokal — cómo se concreta el pago */}
        <div className="mt-10 border border-cuero/40 bg-cuero/[0.04] p-6 sm:p-7">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
            Cómo concretamos el pago
          </p>
          <p className="mt-3 font-serif text-lg leading-relaxed text-tinta sm:text-xl">
            Manejamos toda la transacción a través de{" "}
            <strong className="italic text-cuero">Lokal</strong> —
            plataforma B2B chilena que da respaldo, transparencia y
            permite pago a <strong>60 días sin comisión</strong> para
            ustedes.
          </p>
          <a
            href="https://somoslokal.cl/makers/valiz?referred=valiz"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 border border-cuero bg-cuero px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-tinta hover:border-tinta"
          >
            Ver perfil Valiz en Lokal ↗
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* CUMPLIMIENTO                                                            */
/* ------------------------------------------------------------------------ */
function CumplimientoSection() {
  const items = [
    {
      req: "Razón social, facturas y guías de despacho",
      val: "Valiz SpA · Facturación electrónica · Operativo desde 2020",
    },
    {
      req: "Fotos profesionales de los productos",
      val: "Disponibles en valiz.cl + sesiones lifestyle · Las entregamos en alta resolución",
    },
    {
      req: "Lista de precios distribuidor con margen acorde al mercado",
      val: "$92.000 neto / unidad · Margen Mateas 27% sobre PVP · 37% markup sobre costo",
    },
    {
      req: "Productos de calidad",
      val: "Cuero genuino chileno · Hechura artesanal a mano · Costura reforzada",
    },
    {
      req: "Productos relacionados con bebés, niños o maternidad",
      val: "Diseñada específicamente para mamás: 9+ compartimentos impermeables, mudador, biberones, accesorios — sin sacrificar estilo",
    },
    {
      req: "Packaging atractivo y protector",
      val: "Bolsa de tela Valiz + caja contenedora · Tarjeta de marca incluida",
    },
    {
      req: "Etiqueta con código de barras",
      val: "Cada SKU lleva código de barras universal propio + etiqueta colgante con descripción",
    },
  ];

  return (
    <section className="border-t border-piedra px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Cumplimiento de requisitos
        </p>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.02em] sm:text-5xl">
          Revisamos su checklist. Valiz cumple los siete puntos.
        </h2>
        <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8">
          {items.map((it) => (
            <li
              key={it.req}
              className="flex items-start gap-3 border-t border-piedra pt-5 sm:gap-4"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cuero font-sans text-[11px] font-semibold text-fondo sm:h-7 sm:w-7 sm:text-[12px]">
                ✓
              </span>
              <div>
                <p className="font-serif text-base leading-tight tracking-[-0.01em] text-tinta sm:text-lg">
                  {it.req}
                </p>
                <p className="mt-1.5 font-serif text-sm leading-relaxed text-niebla sm:text-base">
                  {it.val}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* FASE 2 — co-branded product                                             */
/* ------------------------------------------------------------------------ */
function FaseDosSection() {
  return (
    <section className="border-t border-piedra px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Fase 2 · Después
        </p>
        <h2 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-6xl">
          Y cuando esto camine bien,{" "}
          <span className="italic text-cuero">
            hagamos algo juntos.
          </span>
        </h2>

        {/* Collab grande visual */}
        <div className="mt-12 flex items-center justify-center gap-6 border-y border-piedra py-10 sm:gap-10">
          <Image
            src="/images/valiz-logo.png"
            alt="Valiz"
            width={72}
            height={72}
            className="h-14 w-14 object-contain sm:h-20 sm:w-20"
          />
          <span className="font-serif text-3xl italic text-cuero sm:text-5xl">
            ×
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MATEAS_LOGO}
            alt="Mamás Mateas"
            className="h-14 w-14 rounded-full object-contain sm:h-20 sm:w-20"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="space-y-5">
            <p className="font-serif text-lg leading-relaxed text-tinta sm:text-xl">
              Una vez validemos la rotación de la Alforja Mamá en sus
              tiendas, queremos dar el siguiente paso:{" "}
              <strong className="italic text-cuero">
                diseñar juntos un producto exclusivo Mamás Mateas × Valiz
              </strong>
              .
            </p>
            <p className="font-serif text-base italic leading-relaxed text-niebla sm:text-lg">
              Una pieza que solo se venda en sus puntos. Pensada con
              ustedes, hecha por nosotros. Co-firma en la etiqueta, co-
              comunicación en redes, co-historia en cada bitácora del
              cliente.
            </p>
          </div>

          <div className="space-y-5 border-l-2 border-cuero pl-6 sm:border-l-0 sm:border-t sm:border-piedra sm:pl-0 sm:pt-6 lg:border-l-2 lg:border-cuero lg:border-t-0 lg:pl-6 lg:pt-0">
            <Idea
              tag="Producto"
              titulo="Diseño co-creado"
              cuerpo="Brief en conjunto sobre lo que su comunidad pide y aún no encuentra."
            />
            <Idea
              tag="Exclusividad"
              titulo="Solo en Mateas"
              cuerpo="Edición limitada o permanente, vendida únicamente en sus canales."
            />
            <Idea
              tag="Marca"
              titulo="Co-firma en cada pieza"
              cuerpo="Etiqueta + tarjeta con ambos logos. Storytelling compartido."
            />
          </div>
        </div>

        <p className="mt-12 max-w-3xl font-serif text-base italic text-niebla sm:text-lg">
          No urge — primero veamos cómo recibe su público la Alforja
          Mamá. Pero queremos que sepan desde ya que la puerta está
          abierta para algo más grande.
        </p>
      </div>
    </section>
  );
}

function Idea({
  tag,
  titulo,
  cuerpo,
}: {
  tag: string;
  titulo: string;
  cuerpo: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-cuero">
        {tag}
      </p>
      <p className="mt-1 font-serif text-xl leading-tight tracking-[-0.01em] text-tinta sm:text-2xl">
        {titulo}
      </p>
      <p className="mt-1.5 font-serif text-sm leading-relaxed text-niebla sm:text-base">
        {cuerpo}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* CIERRE                                                                  */
/* ------------------------------------------------------------------------ */
function CierreSection() {
  return (
    <section className="border-t border-piedra bg-tinta/[0.02] px-6 py-24 text-center sm:px-12 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Próximos pasos
        </p>
        <h2 className="mt-6 font-serif text-5xl leading-[0.95] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
          Esto puede ser un{" "}
          <span className="italic text-cuero">hitazo</span>
          <br />
          para ambas marcas.
        </h2>
        <p className="mt-8 font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
          Conversemos. Esta semana o la próxima, en su oficina o donde
          sea más cómodo.
        </p>

        <div className="mt-12">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-tinta px-10 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-fondo transition-colors hover:bg-cuero"
          >
            <WhatsAppIcon />
            Hablemos por WhatsApp
          </a>
          <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
            +56 9 6646 6977 · Benja Donoso
          </p>
        </div>

        {/* Firma colab */}
        <div className="mt-24 flex flex-col items-center gap-5 border-t border-piedra pt-12">
          <div className="flex items-center gap-5">
            <Image
              src="/images/valiz-logo.png"
              alt="Valiz"
              width={48}
              height={48}
              className="opacity-90"
            />
            <span className="font-serif text-2xl italic text-cuero">
              ×
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MATEAS_LOGO}
              alt="Mamás Mateas"
              className="h-12 w-12 rounded-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
            Valiz SpA · Mayo 2026
          </p>
          <p className="font-serif text-base italic text-niebla">
            Marroquinería de autor hecha en Chile · valiz.cl
          </p>
        </div>
      </div>
    </section>
  );
}

function SoundOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.14 6.44 2.13 11.9c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.71 1.2c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 18.15h-.01c-1.47 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.24-8.22 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14 0-.31-.02-.48-.02-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.74 2.66 4.22 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}
