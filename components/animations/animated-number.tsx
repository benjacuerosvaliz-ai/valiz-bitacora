"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

const nf = new Intl.NumberFormat("es-CL");

/**
 * AnimatedNumber — número que sube del 0 al final cuando entra al viewport.
 *
 * Cinematic, no chiclé: 2.4s, ease-out fuerte. Usado para el contador del
 * oficio (838 horas, 5.022 pies², etc.). Por defecto formatea es-CL.
 */
export function AnimatedNumber({
  value,
  duration = 2.4,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (latest) =>
    nf.format(Math.round(latest)),
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, value, duration, mv]);

  return (
    <motion.span ref={ref} className={className}>
      {formatted}
    </motion.span>
  );
}
