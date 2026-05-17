"use client";

import { useState } from "react";

const SHOP_BASE = "https://www.valiz.cl";

export function ReferirCliente({
  codigoInicial,
}: {
  codigoInicial: string | null;
}) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = codigo
    ? `${SHOP_BASE}/discount/${encodeURIComponent(codigo)}`
    : null;

  async function asignar() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/yo/referido/asignar", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear el link.");
      return;
    }
    setCodigo(json.code);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  }

  function shareWhatsApp() {
    if (!link) return;
    const text = `Encontré algo en Valiz que te puede gustar. Si entras con mi link tienes 5% de descuento: ${link}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function shareNative() {
    if (!link || typeof navigator.share !== "function") return;
    navigator
      .share({
        title: "Valiz · 5% de descuento",
        text: "Encontré algo en Valiz que te puede gustar.",
        url: link,
      })
      .catch(() => {});
  }

  if (!codigo) {
    return (
      <div className="border border-piedra bg-fondo p-8">
        <p className="font-serif leading-relaxed">
          Aún no tienes tu link de referido. Cuando lo crees queda asociado a
          ti — cada venta hecha con ese link te suma puntos.
        </p>
        {error && (
          <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
            {error}
          </p>
        )}
        <button
          onClick={asignar}
          disabled={loading}
          className="mt-6 bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
        >
          {loading ? "Creando…" : "Crear mi link →"}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-piedra bg-fondo p-6 sm:p-8">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
        Tu código
      </p>
      <p className="mt-2 font-serif text-3xl tracking-[0.04em]">{codigo}</p>

      <p className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
        Link compartible
      </p>
      <div className="mt-2 break-all border-b border-piedra pb-2 font-mono text-sm text-tinta">
        {link}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={copyLink}
          className="bg-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
        >
          {copied ? "✓ Copiado" : "Copiar link"}
        </button>
        <button
          onClick={shareWhatsApp}
          className="border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
        >
          WhatsApp
        </button>
        {typeof window !== "undefined" &&
          typeof navigator !== "undefined" &&
          "share" in navigator && (
            <button
              onClick={shareNative}
              className="border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Compartir…
            </button>
          )}
      </div>
    </div>
  );
}
