"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";
import Image from "next/image";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Cursor-revealed image para "Las piezas" — estilo Akaru. Cuando el usuario
 * pasa sobre el nombre de una familia, una imagen pequeña aparece flotando
 * junto al cursor y lo sigue con leve delay (spring). Al salir, fade.
 *
 * Implementación:
 *  - Un context expone una API setHoveredImage(src?) que cualquier hijo puede
 *    llamar desde sus handlers onPointerEnter/Leave.
 *  - <FamilyHoverImageProvider> envuelve la sección y renderiza la imagen
 *    única que vive en fixed position siguiendo al cursor.
 *
 * Usar:
 *   <FamilyHoverImageProvider>
 *     <Trigger imageSrc="/images/.../01-front.webp">Mochila Alforja</Trigger>
 *   </FamilyHoverImageProvider>
 */

type CtxValue = {
  setHover: (src: string | null) => void;
};

const Ctx = createContext<CtxValue>({ setHover: () => {} });

export function FamilyHoverImageProvider({ children }: { children: ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  const x = useMotionValue(-300);
  const y = useMotionValue(-300);
  const springX = useSpring(x, { stiffness: 220, damping: 28, mass: 0.7 });
  const springY = useSpring(y, { stiffness: 220, damping: 28, mass: 0.7 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setEnabled(mq.matches);
    const listener = (e: MediaQueryListEvent) => setEnabled(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handleMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [enabled, x, y]);

  return (
    <Ctx.Provider value={{ setHover: enabled ? setSrc : () => {} }}>
      {children}
      <AnimatePresence>
        {enabled && src && (
          <motion.div
            key={src}
            style={{ x: springX, y: springY }}
            className="pointer-events-none fixed left-0 top-0 z-[80] -translate-x-1/2 -translate-y-[110%]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            <div className="relative h-64 w-48 overflow-hidden ring-1 ring-piedra">
              <Image
                src={src}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export function useFamilyHover() {
  return useContext(Ctx);
}

/**
 * Componente helper para envolver un trigger (el li/link de la familia).
 * Cuando el cursor entra, llama setHover(src); cuando sale, setHover(null).
 */
export function FamilyHoverTrigger({
  imageSrc,
  children,
}: {
  imageSrc?: string | null;
  children: ReactNode;
}) {
  const { setHover } = useFamilyHover();
  if (!imageSrc) return <>{children}</>;
  return (
    <span
      onPointerEnter={() => setHover(imageSrc)}
      onPointerLeave={() => setHover(null)}
    >
      {children}
    </span>
  );
}
