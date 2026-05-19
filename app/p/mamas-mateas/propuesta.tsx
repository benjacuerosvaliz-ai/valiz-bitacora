"use client";

import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useRef } from "react";

const nf = new Intl.NumberFormat("es-CL");

export type ColorVariant = {
  name: string;
  hint: string;
  foto: string;
};

/**
 * Propuesta comercial Valiz × Mamás Mateas — landing premium
 * scroll-driven, branded, hecha a medida para conquistar al cliente.
 *
 * Estructura:
 *  HERO — título + Mochila Alforja Mamá flotando con tilt
 *  CARTA — apertura cálida, voz Valiz
 *  EL PRODUCTO — specs en grid + foto sticky
 *  POR QUÉ ENCAJAMOS — 4 razones
 *  PALETA — los 10 colores como cards con foto + hint
 *  PROPUESTA COMERCIAL — tabla elegante con totales destacados
 *  CUMPLIMIENTO — 7 ✓ del checklist Mateas
 *  PRÓXIMOS PASOS + CONTACTO — CTAs grandes
 */

export function Propuesta({ colores }: { colores: ColorVariant[] }) {
  // Color principal del hero — Camel (top seller)
  const heroFoto = colores.find((c) => c.name === "Camel")?.foto ?? colores[0].foto;

  return (
    <main className="bg-fondo text-tinta">
      <HeroSection foto={heroFoto} />
      <CartaSection />
      <ProductoSection foto={heroFoto} />
      <PorQueSection />
      <PaletaSection colores={colores} />
      <PropuestaComercialSection />
      <CumplimientoSection />
      <ProximosPasosSection />
    </main>
  );
}

/* ------------------------------------------------------------------------ */
/* HERO                                                                    */
/* ------------------------------------------------------------------------ */
function HeroSection({ foto }: { foto: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);

  // Cursor tilt
  const tiltY = useMotionValue(0);
  const tiltX = useMotionValue(0);
  const tY = useSpring(tiltY, { stiffness: 140, damping: 18 });
  const tX = useSpring(tiltX, { stiffness: 140, damping: 18 });
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - r.left - r.width / 2) / r.width) * 14);
    tiltX.set(((e.clientY - r.top - r.height / 2) / r.height) * -10);
  }
  function onLeave() {
    tiltY.set(0);
    tiltX.set(0);
  }

  return (
    <section
      ref={ref}
      className="relative min-h-screen overflow-hidden"
      style={{ perspective: "1400px" } as React.CSSProperties}
    >
      {/* Logo Valiz girando de fondo */}
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
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-6 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:px-16">
          {/* Texto */}
          <div className="flex flex-col gap-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
              Propuesta comercial · Mayo 2026
            </p>
            <h1 className="font-serif text-[14vw] leading-[0.92] tracking-[-0.03em] sm:text-[8vw] lg:text-[6vw]">
              Para{" "}
              <span className="italic text-cuero">Mamás Mateas.</span>
            </h1>
            <p className="font-serif text-xl italic leading-relaxed text-niebla sm:text-2xl">
              Mochila Alforja Mamá — la pieza más esperada del catálogo
              Valiz.
            </p>
            <div className="mt-6 flex items-baseline gap-6 border-l-2 border-cuero pl-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-cuero">
                  De
                </p>
                <p className="font-serif text-xl text-tinta">Valiz SpA</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-cuero">
                  Para
                </p>
                <p className="font-serif text-xl text-tinta">Mamás Mateas</p>
              </div>
            </div>
          </div>

          {/* Foto Mochila Camel con tilt */}
          <motion.div
            style={{
              rotateY: tY,
              rotateX: tX,
              transformStyle: "preserve-3d" as const,
            }}
            className="relative mx-auto aspect-square w-[78vw] max-w-[520px] sm:w-[55vw] lg:w-[40vw]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto}
              alt="Mochila Alforja Mamá Camel"
              className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(26,26,26,0.18)]"
              draggable={false}
            />
            <div
              className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-tinta/20 blur-2xl"
              aria-hidden
            />
          </motion.div>
        </div>

        {/* Scroll hint */}
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-sans text-[10px] uppercase tracking-[0.32em] text-niebla">
          Continuar ↓
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* CARTA                                                                   */
/* ------------------------------------------------------------------------ */
function CartaSection() {
  return (
    <section className="border-t border-piedra px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Hola, equipo Mamás Mateas
        </p>
        <div className="mt-8 space-y-6 font-serif text-xl leading-relaxed text-tinta sm:text-2xl">
          <p>
            Somos <strong className="italic text-cuero">Valiz</strong>, una
            marca chilena de marroquinería artesanal con seis años de
            trayectoria. Diseñamos y producimos piezas de cuero genuino
            hechas a mano en talleres locales, con identidad de autor y
            durabilidad de años.
          </p>
          <p>
            Conocemos el trabajo de Mamás Mateas y nos parece que hay un{" "}
            <strong className="italic text-cuero">cruce natural</strong>{" "}
            entre las dos marcas: ustedes curan con cuidado los productos
            que recomiendan a la comunidad de mamás chilenas, y nosotros
            ponemos el mismo cuidado en cada pieza que sale del taller.
          </p>
          <p>
            Por eso queremos ofrecerles formalmente nuestra{" "}
            <strong className="italic text-cuero">Mochila Alforja Mamá</strong>{" "}
            — la pieza más esperada del catálogo Valiz y la que mejor encaja
            con su comunidad.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* PRODUCTO + SPECS                                                        */
/* ------------------------------------------------------------------------ */
function ProductoSection({ foto }: { foto: string }) {
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
          Diseñada específicamente para acompañar a las mamás en cada
          salida con su guagua, sin tener que renunciar al estilo. Lo que
          las mamás piden por DM y compran apenas tienen su segundo hijo.
        </p>

        <div className="mt-14 grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* Foto grande */}
          <div className="relative mx-auto aspect-square w-full max-w-[480px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto}
              alt=""
              className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(26,26,26,0.18)]"
              draggable={false}
            />
            <div
              className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-tinta/15 blur-2xl"
              aria-hidden
            />
          </div>

          {/* Specs */}
          <div className="space-y-8">
            <Spec
              tag="Material"
              titulo="100% cuero genuino chileno"
              cuerpo="Curtido al cromo · Hechura artesanal hecha a mano"
            />
            <Spec
              tag="Dimensiones"
              titulo="40 × 32 × 16 cm"
              cuerpo="Alto × Ancho × Profundidad · Peso aprox 1.400 g"
            />
            <Spec
              tag="Capacidad"
              titulo="9+ compartimentos internos"
              cuerpo="Sección impermeable para mudador · Espacio biberones · Bolsillos para llaves, celular y accesorios"
            />
          </div>
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
      <p className="mt-2 font-serif text-base leading-relaxed text-niebla">
        {cuerpo}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* POR QUÉ ENCAJAMOS                                                       */
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
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-14 sm:gap-y-12">
          {razones.map((r, i) => (
            <div key={r.titulo}>
              <p className="font-mono text-2xl font-semibold tracking-tight text-cuero">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-serif text-2xl leading-tight tracking-[-0.015em] sm:text-3xl">
                {r.titulo}
              </h3>
              <p className="mt-3 font-serif text-base leading-relaxed text-niebla sm:text-lg">
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
/* PALETA                                                                  */
/* ------------------------------------------------------------------------ */
function PaletaSection({ colores }: { colores: ColorVariant[] }) {
  return (
    <section className="border-t border-piedra bg-tinta/[0.02] px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Paleta de colores
        </p>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.02em] sm:text-5xl">
          Diez colores activos en producción permanente.
        </h2>
        <p className="mt-4 font-serif text-lg italic text-niebla">
          Todos disponibles para reposición continua.
        </p>

        <ul className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-5">
          {colores.map((c) => (
            <li key={c.name} className="group flex flex-col">
              <div className="relative aspect-square w-full overflow-hidden border border-piedra bg-fondo">
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
            </li>
          ))}
        </ul>
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
    { label: "Plazo de pago", valor: "30 días factura electrónica" },
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
    <section className="border-t border-piedra px-6 py-24 sm:px-12 sm:py-32">
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
          para los primeros 2-3 meses de venta. Después, programa de
          reposición mensual según rotación real.
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

        {/* Total destacado */}
        <div className="mt-10 flex items-baseline justify-between gap-6 bg-tinta px-7 py-7 text-fondo">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
            Total factura Mateas
          </p>
          <p className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
            ${nf.format(10948000)}
          </p>
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
      val: "Disponibles en valiz.cl + sesiones lifestyle de marca · Las entregamos en alta resolución",
    },
    {
      req: "Lista de precios distribuidor con margen acorde al mercado",
      val: "$92.000 neto / unidad · Margen Mateas 27% sobre PVP · 37% markup sobre costo",
    },
    {
      req: "Productos de calidad",
      val: "Cuero genuino chileno · Hechura artesanal a mano · Costura reforzada · Durabilidad de años",
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
      val: "Cada SKU lleva EAN-13 + etiqueta colgante con descripción",
    },
  ];

  return (
    <section className="border-t border-piedra bg-tinta/[0.02] px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
          Cumplimiento de requisitos
        </p>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.02em] sm:text-5xl">
          Revisamos su checklist. Valiz cumple los siete puntos.
        </h2>
        <ul className="mt-14 divide-y divide-piedra border-y border-piedra">
          {items.map((it) => (
            <li
              key={it.req}
              className="flex items-start gap-5 py-6"
            >
              <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cuero font-sans text-[12px] font-semibold text-fondo">
                ✓
              </span>
              <div>
                <p className="font-serif text-lg leading-tight tracking-[-0.01em] text-tinta sm:text-xl">
                  {it.req}
                </p>
                <p className="mt-1.5 font-serif text-base leading-relaxed text-niebla">
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
/* PRÓXIMOS PASOS + CONTACTO                                               */
/* ------------------------------------------------------------------------ */
function ProximosPasosSection() {
  return (
    <section className="border-t border-piedra px-6 py-24 text-center sm:px-12 sm:py-32">
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
          Nos encantaría agendar una reunión para presentar las piezas en
          persona y diseñar juntos el plan de lanzamiento.
        </p>
        <p className="mt-3 font-serif text-lg italic text-niebla">
          Esta semana o la próxima, en su oficina o donde sea más cómodo.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <a
            href="mailto:hola@valiz.cl?subject=Propuesta%20Valiz%20×%20Mam%C3%A1s%20Mateas&body=Hola%20Benja,%20vimos%20la%20propuesta%20de%20Valiz%20para%20Mam%C3%A1s%20Mateas%20y%20queremos%20agendar%20una%20reuni%C3%B3n."
            className="inline-flex items-center gap-3 bg-tinta px-9 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-fondo transition-colors hover:bg-cuero"
          >
            Agendar reunión →
          </a>
          <a
            href="https://wa.me/56000000000?text=Hola%20Benja,%20vimos%20la%20propuesta%20Valiz%20×%20Mam%C3%A1s%20Mateas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 border border-piedra bg-fondo px-7 py-5 font-sans text-xs font-semibold uppercase tracking-[0.28em] text-tinta transition-colors hover:border-cuero hover:text-cuero"
          >
            Escribir por WhatsApp
          </a>
        </div>

        {/* Firma */}
        <div className="mt-24 flex flex-col items-center gap-3 border-t border-piedra pt-12">
          <Image
            src="/images/valiz-logo.png"
            alt=""
            width={56}
            height={56}
            className="opacity-90"
          />
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-cuero">
            Valiz SpA
          </p>
          <p className="font-serif text-base italic text-niebla">
            Marroquinería de autor hecha en Chile · valiz.cl
          </p>
        </div>
      </div>
    </section>
  );
}
