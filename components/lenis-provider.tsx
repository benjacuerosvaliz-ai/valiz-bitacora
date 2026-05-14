"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Lenis smooth scroll global.
 *
 * Sustituye el scroll nativo del navegador por una curva amortiguada — el
 * cambio se siente al primer wheel/drag. Pensado bien suave (no exagerado):
 * duración 1.2s, easing exponencial natural. Lenis es compatible con el
 * `useScroll` de motion, así que parallax y scroll-triggers siguen funcionando.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
        wheelMultiplier: 1,
      }}
    >
      {children}
    </ReactLenis>
  );
}
