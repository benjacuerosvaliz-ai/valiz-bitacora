"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const SHOPIFY_BASE = "https://www.valiz.cl/products/";
const nf = new Intl.NumberFormat("es-CL");

type View = "front" | "side" | "interior";

const VIEW_LABEL: Record<View, string> = {
  front: "Frente",
  side: "Perfil",
  interior: "Interior",
};

const VIEW_FILE: Record<View, string> = {
  front: "01-front.webp",
  side: "02-side.webp",
  interior: "03-interior.webp",
};

type Hotspot = {
  id: string;
  label: string;
  description: string;
  /** Posición (left%, top%) por vista. Si una vista no aparece, el hotspot no se muestra en esa vista. */
  position: Partial<Record<View, [number, number]>>;
  /** Vista en la que se ve mejor — clickear el hotspot cambia a esta vista. */
  preferredView: View;
};

export type ExplorerVariant = {
  sku: string;
  color_valiz: string | null;
  precio: number | null;
  shopify_handle: string | null;
};

const HOTSPOTS_MOCHILA_ALFORJA: Hotspot[] = [
  {
    id: "zipper-top",
    label: "Cremallera continua",
    description:
      "Recorre el perímetro superior. Dos correderas — la abres del lado que quieras.",
    position: { front: [50, 32], side: [50, 33] },
    preferredView: "front",
  },
  {
    id: "side-pocket",
    label: "Bolsillo vertical",
    description:
      "Con su propio cierre. Accedes sin abrir la mochila completa.",
    position: { front: [62, 58], side: [58, 52] },
    preferredView: "side",
  },
  {
    id: "interior",
    label: "Compartimento principal",
    description:
      "Un solo espacio amplio, forrado en el mismo cuero. Sin divisiones, sin telas.",
    position: { interior: [50, 42] },
    preferredView: "interior",
  },
  {
    id: "strap",
    label: "Tira ajustable",
    description: "Hebilla de bronce envejecido. La ajustas al cuerpo.",
    position: { front: [56, 82], side: [72, 70] },
    preferredView: "side",
  },
];

/**
 * Mapa familia-slug → set de hotspots. Cada familia tiene sus propios puntos
 * porque la pieza es distinta. Por ahora solo Mochila Alforja Grande tiene
 * fotos y hotspots configurados.
 */
const HOTSPOTS_BY_FAMILY: Record<string, Hotspot[] | undefined> = {
  "mochila-alforja": HOTSPOTS_MOCHILA_ALFORJA,
};

/**
 * SKUs con set completo de fotos (front + side + interior). El explorer solo
 * muestra estas variantes; el resto del color list de la página de familia
 * sigue funcionando como antes para los SKUs sin fotos.
 */
const SKUS_WITH_PHOTOS: Record<string, Set<string>> = {
  "mochila-alforja": new Set(["MA-G-CRU", "MA-G-MIEL", "MA-G-NE"]),
};

/** Ángulo en el wedge para cada vista. 3 caras a 120° de distancia. */
const VIEW_ANGLE: Record<View, number> = {
  front: 0,
  side: -120,
  interior: -240,
};

export function FamilyExplorer({
  familySlug,
  familyName,
  variants,
}: {
  familySlug: string;
  familyName: string;
  variants: ExplorerVariant[];
}) {
  const hotspots = HOTSPOTS_BY_FAMILY[familySlug];
  const withPhotos = SKUS_WITH_PHOTOS[familySlug] ?? new Set<string>();
  const variantsWithPhotos = variants.filter((v) => withPhotos.has(v.sku));

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState(
    variantsWithPhotos[0]?.sku ?? "",
  );
  const [view, setView] = useState<View>("front");
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);

  const selectedVariant = variantsWithPhotos.find((v) => v.sku === selectedSku);
  const activeHotspot = hotspots?.find((h) => h.id === activeHotspotId);

  // Close on ESC + lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!hotspots || variantsWithPhotos.length === 0) {
    // Esta familia todavía no tiene fotos / hotspots configurados — no
    // mostramos el botón. La página sigue con la lista de colores normal.
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group inline-flex items-center gap-3 border border-tinta px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-all duration-500 hover:bg-tinta hover:text-fondo"
      >
        Explorar la pieza
        <span className="transition-transform duration-500 group-hover:translate-x-1">
          ↗
        </span>
      </button>

      <AnimatePresence>
        {isOpen && selectedVariant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col bg-fondo"
            role="dialog"
            aria-modal="true"
            aria-label={`Explorador de ${familyName}`}
          >
            {/* Header bar */}
            <div className="flex items-baseline justify-between border-b border-piedra px-6 py-5 sm:px-10 sm:py-6">
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  Pieza
                </p>
                <p className="mt-1 font-serif text-2xl leading-none tracking-[-0.015em] sm:text-3xl">
                  {familyName}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-piedra font-serif text-2xl text-niebla transition-colors hover:border-cuero hover:text-cuero"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Main: image + controls */}
            <div className="relative grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[3fr_1.4fr]">
              {/* Stage 3D — wedge con las 3 fotos como caras */}
              <Wedge3D
                familySlug={familySlug}
                familyName={familyName}
                selectedSku={selectedSku}
                colorValiz={selectedVariant.color_valiz}
                view={view}
                onViewChange={setView}
                hotspots={hotspots}
                activeHotspotId={activeHotspotId}
                onHotspotClick={(h) => {
                  if (view !== h.preferredView) setView(h.preferredView);
                  setActiveHotspotId((id) => (id === h.id ? null : h.id));
                }}
              />

              {/* Active hotspot callout — vive como overlay sobre el stage */}
              <AnimatePresence>
                {activeHotspot && (
                  <motion.div
                    key={activeHotspot.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none absolute inset-x-6 bottom-6 z-10 max-w-md rounded-md bg-fondo/95 p-5 ring-1 ring-piedra backdrop-blur-md sm:inset-x-10 sm:bottom-10"
                  >
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
                      {activeHotspot.label}
                    </p>
                    <p className="mt-2 font-serif italic leading-relaxed">
                      {activeHotspot.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls column */}
              <div className="flex flex-col justify-between gap-8 border-t border-piedra px-6 py-6 sm:px-10 lg:border-l lg:border-t-0 lg:py-10">
                <div className="flex flex-col gap-10">
                  {/* View tabs */}
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                      Vista
                    </p>
                    <div className="mt-4 flex gap-2">
                      {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
                        <button
                          key={v}
                          onClick={() => {
                            setView(v);
                            setActiveHotspotId(null);
                          }}
                          className={`flex-1 border px-4 py-3 font-sans text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                            view === v
                              ? "border-cuero text-cuero"
                              : "border-piedra text-niebla hover:border-tinta hover:text-tinta"
                          }`}
                        >
                          {VIEW_LABEL[v]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color selector */}
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                      Color · {selectedVariant.color_valiz ?? "—"}
                    </p>
                    <div className="mt-4 flex gap-3">
                      {variantsWithPhotos.map((v) => {
                        const isSel = v.sku === selectedSku;
                        return (
                          <button
                            key={v.sku}
                            onClick={() => {
                              setSelectedSku(v.sku);
                              setActiveHotspotId(null);
                            }}
                            className={`group/color relative aspect-square w-20 overflow-hidden ring-2 transition-all duration-300 ${
                              isSel
                                ? "ring-cuero"
                                : "ring-piedra hover:ring-tinta"
                            }`}
                            aria-label={v.color_valiz ?? v.sku}
                            aria-pressed={isSel}
                          >
                            <Image
                              src={`/images/productos/${familySlug}/${v.sku}/01-front.webp`}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 font-serif text-sm italic text-niebla">
                      Pronto: el resto de los colores. {variants.length -
                        variantsWithPhotos.length}{" "}
                      esperando foto.
                    </p>
                  </div>

                  {/* Hotspot index */}
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                      Detalles
                    </p>
                    <ul className="mt-4 space-y-2">
                      {hotspots.map((h) => (
                        <li key={h.id}>
                          <button
                            onClick={() => {
                              setView(h.preferredView);
                              setActiveHotspotId(h.id);
                            }}
                            className={`group/hotbtn flex items-baseline gap-3 text-left font-serif transition-colors duration-300 ${
                              activeHotspotId === h.id
                                ? "text-cuero"
                                : "text-tinta hover:text-cuero"
                            }`}
                          >
                            <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                              +
                            </span>
                            <span>{h.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="border-t border-piedra pt-6">
                  <p className="font-serif text-3xl leading-none tracking-[-0.015em]">
                    {selectedVariant.precio
                      ? `$${nf.format(selectedVariant.precio)}`
                      : "—"}
                    {selectedVariant.precio && (
                      <span className="ml-1 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                        CLP
                      </span>
                    )}
                  </p>
                  {selectedVariant.shopify_handle ? (
                    <a
                      href={`${SHOPIFY_BASE}${selectedVariant.shopify_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-3 bg-tinta px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors duration-300 hover:bg-cuero"
                    >
                      Llevar conmigo
                      <span>→</span>
                    </a>
                  ) : (
                    <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                      Próximamente en la tienda
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Wedge3D({
  familySlug,
  familyName,
  selectedSku,
  colorValiz,
  view,
  onViewChange,
  hotspots,
  activeHotspotId,
  onHotspotClick,
}: {
  familySlug: string;
  familyName: string;
  selectedSku: string;
  colorValiz: string | null;
  view: View;
  onViewChange: (v: View) => void;
  hotspots: Hotspot[];
  activeHotspotId: string | null;
  onHotspotClick: (h: Hotspot) => void;
}) {
  // Ángulo objetivo según la vista seleccionada por tabs.
  // El usuario también puede arrastrar para girar manualmente; el drag agrega
  // un offset que se suma al ángulo de la vista, y al soltar snapeamos a la
  // cara más cercana actualizando la vista correspondiente.
  const targetAngle = VIEW_ANGLE[view];
  const dragOffset = useMotionValue(0);
  const baseAngle = useMotionValue(targetAngle);

  // Sincronizar baseAngle cuando cambia la vista (anim spring suave)
  useEffect(() => {
    const controls = animate(baseAngle, targetAngle, {
      type: "spring",
      stiffness: 60,
      damping: 18,
      mass: 0.9,
    });
    return () => controls.stop();
  }, [targetAngle, baseAngle]);

  // Ángulo final aplicado al wedge = base + drag
  const wedgeRotateY = useTransform(
    [baseAngle, dragOffset],
    ([b, d]: number[]) => b + d,
  );

  // Idle floating Y bob — más amplio y lento
  const idleY = useMotionValue(0);
  useEffect(() => {
    const controls = animate(idleY, [-14, 14], {
      duration: 5,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    });
    return () => controls.stop();
  }, [idleY]);

  // Drag handlers
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; startOffset: number }>({
    active: false,
    startX: 0,
    startOffset: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      active: true,
      startX: e.clientX,
      startOffset: dragOffset.get(),
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const delta = e.clientX - dragState.current.startX;
    // 1px drag = 0.5° rotación
    dragOffset.set(dragState.current.startOffset + delta * 0.5);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // Snap a la vista más cercana según ángulo total
    const total = baseAngle.get() + dragOffset.get();
    // Normalizar a [-180, 180]
    const normalized = ((total % 360) + 540) % 360 - 180;
    // Encuentra la vista cuya VIEW_ANGLE está más cerca
    let bestView: View = "front";
    let bestDist = Infinity;
    (Object.entries(VIEW_ANGLE) as [View, number][]).forEach(([v, a]) => {
      const dist = Math.min(
        Math.abs(normalized - a),
        Math.abs(normalized - a + 360),
        Math.abs(normalized - a - 360),
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestView = v;
      }
    });
    // Animar dragOffset a 0 mientras cambia la vista
    animate(dragOffset, 0, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
    if (bestView !== view) onViewChange(bestView);
  };

  // Las 3 caras del wedge, cada una a 120° del centro
  const faces: { view: View; angle: number }[] = [
    { view: "front", angle: 0 },
    { view: "side", angle: 120 },
    { view: "interior", angle: 240 },
  ];

  return (
    <div
      ref={stageRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ perspective: 1800, touchAction: "none" }}
      className={`relative overflow-hidden bg-fondo select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <motion.div
        style={{
          rotateY: wedgeRotateY,
          y: idleY,
          transformStyle: "preserve-3d",
        }}
        className="absolute inset-0"
      >
        {faces.map((face) => (
          <div
            key={face.view}
            style={{
              position: "absolute",
              inset: 0,
              transform: `rotateY(${face.angle}deg) translateZ(280px)`,
              backfaceVisibility: "hidden",
            }}
          >
            <Image
              src={`/images/productos/${familySlug}/${selectedSku}/${VIEW_FILE[face.view]}`}
              alt={`${familyName} ${colorValiz ?? ""} vista ${VIEW_LABEL[face.view]}`}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain p-6 sm:p-10"
            />
          </div>
        ))}
      </motion.div>

      {/* Hotspots viven fuera del 3D, en una capa 2D encima del stage. Solo
          visibles cuando el wedge está quieto en la vista actual (no durante
          drag). Posicionados sobre la imagen visible (que ocupa el stage). */}
      {!isDragging &&
        hotspots.map((h) => {
          const pos = h.position[view];
          if (!pos) return null;
          const isActive = activeHotspotId === h.id;
          return (
            <motion.button
              key={`${view}-${h.id}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              onClick={(e) => {
                e.stopPropagation();
                onHotspotClick(h);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: `${pos[0]}%`,
                top: `${pos[1]}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-300 ${
                isActive
                  ? "bg-tinta text-fondo"
                  : "bg-fondo/85 text-tinta ring-1 ring-piedra hover:bg-fondo"
              }`}
              aria-label={h.label}
            >
              <span className="font-serif text-lg leading-none">
                {isActive ? "×" : "+"}
              </span>
            </motion.button>
          );
        })}

      {/* Hint discreto */}
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
        Arrastra para girar
      </p>
    </div>
  );
}
