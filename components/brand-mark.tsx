import Image from "next/image";
import Link from "next/link";

/**
 * Marca Valiz reutilizable. Logo circular + texto microcopy "Valiz ·
 * Bitácora" en cuero. Por default linkea a "/", se puede sobrescribir.
 *
 * Variantes:
 *   - default: logo + texto, ideal para headers internos.
 *   - back: logo + texto con flecha "←", ideal para sub-pages.
 *   - icon: solo logo, sin texto.
 */
export function BrandMark({
  size = 28,
  variant = "default",
  href = "/",
}: {
  size?: number;
  variant?: "default" | "back" | "icon";
  href?: string;
}) {
  const showText = variant !== "icon";
  const showBack = variant === "back";
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 transition-opacity hover:opacity-80"
      aria-label="Valiz · Bitácora"
    >
      {showBack && (
        <span
          className="font-sans text-base text-cuero transition-transform duration-300 group-hover:-translate-x-0.5"
          aria-hidden
        >
          ←
        </span>
      )}
      <Image
        src="/images/valiz-logo.png"
        alt=""
        width={size}
        height={size}
        priority
        className="block"
      />
      {showText && (
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Valiz · Bitácora
        </span>
      )}
    </Link>
  );
}
