"use client";

import Link from "next/link";
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
  // Si hay denominaciones bloqueadas por saldo insuficiente, mostramos
  // CTAs concretos para ganar más — el usuario está en el momento de
  // máxima intención de canje, no podemos dejarlo sin salida.
  const hayBloqueadas = opciones.some((o) => !o.puedePagar && o.stock > 0);
  const faltaParaMin = (() => {
    const minDispo = opciones
      .filter((o) => o.stock > 0)
      .map((o) => o.denominacion)
      .sort((a, b) => a - b)[0];
    if (!minDispo) return null;
    return minDispo - puntos;
  })();
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
              {o.stock === 0
                ? "Sin stock"
                : !o.puedePagar
                  ? `Te faltan $${nf.format(o.denominacion - puntos)}`
                  : `${o.stock} disponible${o.stock === 1 ? "" : "s"}`}
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

      {/* CTAs para desbloquear — solo si hay denominaciones bloqueadas
          por saldo insuficiente. */}
      {hayBloqueadas && (
        <div className="mt-2 border border-cuero bg-cuero/5 px-5 py-4">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Cómo desbloquear más saldo
            {faltaParaMin && faltaParaMin > 0 && (
              <>
                {" "}
                <span className="text-niebla">
                  · te faltan ${nf.format(faltaParaMin)} para canjear
                </span>
              </>
            )}
          </p>
          <ul className="mt-3 space-y-1.5">
            <CtaMision
              href="/yo/bitacora/nueva"
              titulo="Sube una bitácora con foto y lugar"
              monto="+$200"
              detalle="Inmediato. Después +$200 por cada nueva (1/mes/pieza)."
            />
            <CtaMision
              href="/yo/perfil"
              titulo="Completa tu perfil"
              monto="+$1.000"
              detalle="Foto + Instagram + ciudad. Solo se cobra una vez."
            />
            <CtaMision
              href="/yo/referir"
              titulo="Comparte tu código de referido"
              monto="5%"
              detalle="Cada amigo que compra con tu código te suma 5% del subtotal. Sin tope."
            />
          </ul>
        </div>
      )}
    </div>
  );
}

function CtaMision({
  href,
  titulo,
  monto,
  detalle,
}: {
  href: string;
  titulo: string;
  monto: string;
  detalle: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-baseline gap-3 rounded px-2 py-1.5 transition-colors hover:bg-cuero/10"
      >
        <span className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          {monto}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm text-tinta group-hover:text-cuero">
            {titulo}
          </p>
          <p className="font-serif text-xs italic text-niebla">{detalle}</p>
        </div>
        <span
          aria-hidden
          className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero"
        >
          →
        </span>
      </Link>
    </li>
  );
}
