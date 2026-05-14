"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

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
    position: { front: [50, 27], side: [52, 26] },
    preferredView: "front",
  },
  {
    id: "side-pocket",
    label: "Bolsillo vertical",
    description:
      "Con su propio cierre. Accedes sin abrir la mochila completa.",
    position: { front: [68, 55], side: [55, 52] },
    preferredView: "side",
  },
  {
    id: "interior",
    label: "Compartimento principal",
    description:
      "Un solo espacio amplio, forrado en el mismo cuero. Sin divisiones, sin telas.",
    position: { interior: [55, 40] },
    preferredView: "interior",
  },
  {
    id: "strap",
    label: "Tira ajustable",
    description: "Hebilla de bronce envejecido. La ajustas al cuerpo.",
    position: { front: [85, 55], side: [82, 65] },
    preferredView: "front",
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
            <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[3fr_1.4fr]">
              {/* Image stage */}
              <div className="relative overflow-hidden bg-fondo">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedSku}-${view}`}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={`/images/productos/${familySlug}/${selectedSku}/${VIEW_FILE[view]}`}
                      alt={`${familyName} ${selectedVariant.color_valiz ?? ""} vista ${VIEW_LABEL[view]}`}
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      className="object-contain p-6 sm:p-10"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Hotspot buttons */}
                {hotspots.map((h) => {
                  const pos = h.position[view];
                  if (!pos) return null;
                  const isActive = activeHotspotId === h.id;
                  return (
                    <motion.button
                      key={h.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      onClick={() => {
                        if (view !== h.preferredView) setView(h.preferredView);
                        setActiveHotspotId(isActive ? null : h.id);
                      }}
                      style={{
                        position: "absolute",
                        left: `${pos[0]}%`,
                        top: `${pos[1]}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className={`group/dot flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
                        isActive
                          ? "bg-tinta text-fondo"
                          : "bg-fondo/85 text-tinta ring-1 ring-piedra hover:scale-110 hover:bg-fondo"
                      }`}
                      aria-label={h.label}
                    >
                      <span className="font-serif text-lg leading-none">
                        {isActive ? "×" : "+"}
                      </span>
                    </motion.button>
                  );
                })}

                {/* Active hotspot callout */}
                <AnimatePresence>
                  {activeHotspot && (
                    <motion.div
                      key={activeHotspot.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-x-6 bottom-6 max-w-md rounded-md bg-fondo/95 p-5 ring-1 ring-piedra backdrop-blur-md sm:inset-x-10 sm:bottom-10"
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
              </div>

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
