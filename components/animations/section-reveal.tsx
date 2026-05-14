"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * SectionReveal — fade + leve lift cuando el bloque entra al viewport.
 *
 * Suave y cinematográfico: 1.1s, ease curva natural, sin rebote. Pensado para
 * que cada sección "respire" al aparecer en pantalla, no para sorprender.
 * Solo se anima una vez (al primer viewport entry); después queda fijo.
 */
export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
