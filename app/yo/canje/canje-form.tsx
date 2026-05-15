"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

type Opcion = {
  denominacion: number;
  stock: number;
  puedePagar: boolean;
};

export function CanjeForm({
  puntos,
  opciones,
}: {
  puntos: number;
  opciones: Opcion[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<{ code: string; monto: number } | null>(
    null,
  );

  async function canjear(denominacion: number) {
    setError(null);
    setLoading(denominacion);
    const res = await fetch("/api/canje/redimir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ denominacion }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok || !json.code) {
      setError(json.error ?? "No se pudo canjear.");
      return;
    }
    setCode({ code: json.code, monto: denominacion });
    router.refresh();
  }

  if (code) {
    return (
      <div className="border border-musgo bg-fondo p-8">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-musgo">
          Tu código está listo
        </p>
        <p className="mt-4 font-serif text-3xl tracking-[0.02em] text-tinta sm:text-4xl">
          {code.code}
        </p>
        <p className="mt-4 font-serif italic leading-relaxed text-niebla">
          Vale ${nf.format(code.monto)} CLP en tu próxima compra en{" "}
          <a
            href="https://www.valiz.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cuero underline"
          >
            valiz.cl
          </a>
          . Pégalo en el cupón al checkout. Es de un solo uso, así que cópialo
          ahora.
        </p>
        <button
          onClick={() => navigator.clipboard.writeText(code.code)}
          className="mt-6 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
        >
          Copiar código
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {opciones.map((o) => {
        const disabled =
          !o.puedePagar || o.stock === 0 || loading !== null;
        return (
          <button
            key={o.denominacion}
            onClick={() => canjear(o.denominacion)}
            disabled={disabled}
            className="flex items-baseline justify-between border border-tinta px-6 py-5 text-left transition-colors hover:bg-tinta hover:text-fondo disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-tinta"
          >
            <span className="font-serif text-2xl">
              ${nf.format(o.denominacion)} CLP
            </span>
            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
              {nf.format(o.denominacion)} pts
              {o.stock === 0
                ? " · Sin stock"
                : !o.puedePagar
                  ? ` · Te faltan ${nf.format(o.denominacion - puntos)}`
                  : ` · ${o.stock} disponible${o.stock === 1 ? "" : "s"}`}
              {loading === o.denominacion && " · Canjeando…"}
            </span>
          </button>
        );
      })}
      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}
    </div>
  );
}
