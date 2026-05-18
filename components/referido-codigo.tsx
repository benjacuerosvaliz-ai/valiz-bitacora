"use client";

import { useState } from "react";

/**
 * Bloque CTA para mostrar el código de referido de una persona, con
 * botón "Copiar". Vive en el perfil público y en /yo.
 *
 * Mensaje principal: "{Nombre} te regala 5% off en valiz.cl".
 * Click copia el código al portapapeles y muestra confirmación 2s.
 */
export function ReferidoCodigo({
  code,
  nombre,
  showCopy = true,
}: {
  code: string;
  nombre: string;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silencioso
    }
  }

  return (
    <div className="mt-5 flex flex-col items-start gap-3 border-t border-piedra pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
          {nombre} te regala 5% off
        </p>
        <p className="font-serif text-sm italic leading-snug text-niebla">
          Usá este código en valiz.cl para tu primera compra Valiz.
        </p>
      </div>
      <button
        type="button"
        onClick={showCopy ? copy : undefined}
        disabled={!showCopy}
        className="group inline-flex items-center gap-2 border border-cuero bg-cuero/5 px-4 py-2.5 font-mono text-sm font-semibold tracking-[0.18em] text-cuero transition-colors hover:bg-cuero hover:text-fondo disabled:cursor-default disabled:hover:bg-cuero/5 disabled:hover:text-cuero"
        aria-label={`Copiar código ${code}`}
      >
        <span>{code}</span>
        {showCopy && (
          <span className="font-sans text-[9px] uppercase tracking-[0.22em]">
            {copied ? "✓ Copiado" : "Copiar"}
          </span>
        )}
      </button>
    </div>
  );
}
