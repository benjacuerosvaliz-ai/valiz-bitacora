"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * ParallaxImage — imagen full-bleed con parallax sutil al scroll.
 *
 * La imagen se mueve ~10% más lento que el scroll, dando sensación de
 * "fondo que respira". Sin exagerar — la regla es que se sienta, no se vea.
 */
export function ParallaxImage({
  src,
  alt,
  priority = false,
  sizes,
  className,
  intensity = 10,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** % de movimiento de la imagen vs scroll. 10 es suave; 20 es notorio. */
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${intensity / 2}%`, `${intensity / 2}%`],
  );

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      <motion.div
        style={{ y, height: `${100 + intensity}%`, top: `-${intensity / 2}%` }}
        className="absolute inset-x-0"
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      </motion.div>
    </div>
  );
}
