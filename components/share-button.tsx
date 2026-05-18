"use client";

import { useState } from "react";

/**
 * Botón Compartir reutilizable.
 *
 * Comportamiento:
 *  - Mobile (navigator.share disponible): abre sheet nativo de iOS/Android
 *    con WhatsApp, IG, Mensajes, etc.
 *  - Desktop / no support: copia el link al portapapeles y muestra
 *    "Link copiado" durante 2s.
 *
 * El share usa la URL completa basada en window.location, así funciona
 * sin saber si estamos en localhost, preview o prod.
 */
export function ShareButton({
  title,
  text,
  url,
  className = "",
  label = "Compartir",
  variant = "default",
  highlight = false,
}: {
  /** Título sugerido (aparece en el sheet nativo) */
  title: string;
  /** Texto adicional para el share */
  text?: string;
  /** URL relativa (ej "/bitacora/abc"). Si no se da, usa window.location.href */
  url?: string;
  className?: string;
  label?: string;
  variant?: "default" | "icon";
  /** Si true, usa el estilo cuero destacado (CTA principal). */
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const absoluteUrl = url
        ? new URL(url, window.location.origin).toString()
        : window.location.href;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text, url: absoluteUrl });
          return;
        } catch (e) {
          // Usuario canceló el share — no es error
          if ((e as Error).name === "AbortError") return;
          // Otros errores → fallback a copy
        }
      }

      // Fallback: copiar al portapapeles
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  const isIcon = variant === "icon";

  const baseClasses = isIcon
    ? ""
    : highlight
      ? "bg-cuero px-5 py-2.5 text-[11px] text-fondo hover:bg-tinta"
      : "border border-piedra px-4 py-2 text-[11px] text-tinta hover:border-cuero hover:text-cuero";

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      aria-label={label}
      className={`group inline-flex items-center gap-2 font-sans font-semibold uppercase tracking-[0.18em] transition-colors disabled:opacity-60 ${baseClasses} ${className}`}
    >
      {copied ? (
        <>
          <CheckIcon />
          <span>Link copiado</span>
        </>
      ) : (
        <>
          <ShareIcon />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
