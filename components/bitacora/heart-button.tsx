"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const nf = new Intl.NumberFormat("es-CL");

/**
 * Botón ♥ para bitácoras con optimistic update.
 *
 * Variants:
 *  - "compact" (default): para cards del feed — chico, vertical
 *  - "large": para página de detalle — más visible
 *
 * Si el user no tiene sesión, muestra el corazón pero al hacer click
 * redirige a /login (sin perder el conteo).
 */
export function HeartButton({
  bitacoraId,
  initialCount,
  initialReacted,
  loggedIn,
  variant = "compact",
}: {
  bitacoraId: string;
  initialCount: number;
  initialReacted: boolean;
  loggedIn: boolean;
  variant?: "compact" | "large";
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [pending, startTransition] = useTransition();
  const [errored, setErrored] = useState(false);

  const isLarge = variant === "large";

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        title="Inicia sesión para reaccionar"
        className={`group inline-flex items-center gap-2 font-sans font-semibold uppercase tracking-[0.18em] text-niebla transition-colors hover:text-cuero ${
          isLarge ? "text-[12px]" : "text-[10px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Heart filled={false} size={isLarge ? 22 : 16} />
        <span>{nf.format(count)}</span>
      </Link>
    );
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    // Optimistic
    const prevReacted = reacted;
    const prevCount = count;
    setReacted(!prevReacted);
    setCount(prevCount + (prevReacted ? -1 : 1));
    setErrored(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/bitacora/${bitacoraId}/reaccionar`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { reacted: boolean; count: number };
        setReacted(data.reacted);
        setCount(data.count);
        // Refresca server data del feed (counts ya guardados en DB)
        router.refresh();
      } catch {
        // Revertir
        setReacted(prevReacted);
        setCount(prevCount);
        setErrored(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={reacted}
      aria-label={reacted ? "Quitar reacción" : "Reaccionar"}
      title={errored ? "Error — intenta de nuevo" : undefined}
      className={`group inline-flex items-center gap-2 font-sans font-semibold uppercase tracking-[0.18em] transition-colors disabled:opacity-60 ${
        isLarge ? "text-[12px]" : "text-[10px]"
      } ${reacted ? "text-cuero" : "text-niebla hover:text-cuero"}`}
    >
      <Heart filled={reacted} size={isLarge ? 22 : 16} />
      <span>{nf.format(count)}</span>
    </button>
  );
}

function Heart({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition-transform group-active:scale-90"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
