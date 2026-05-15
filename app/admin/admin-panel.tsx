"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CompraManual = {
  id: string;
  user_id: string;
  familia_slug: string | null;
  color_valiz: string | null;
  lugar_compra: string | null;
  fecha_compra: string | null;
  descripcion: string | null;
  foto_url: string | null;
  sku: string | null;
  created_at: string;
};

type Bitacora = {
  id: string;
  user_id: string;
  sku: string | null;
  foto_url: string;
  lugar: string | null;
  texto: string | null;
  created_at: string;
  points_awarded: number;
  invalidated: boolean;
};

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  puntos_actuales: number;
  created_at: string;
};

export function AdminPanel({
  pendientes,
  bitacoras,
  profiles,
}: {
  pendientes: CompraManual[];
  bitacoras: Bitacora[];
  profiles: Profile[];
}) {
  const router = useRouter();

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  async function validarCompra(id: string, awardPts: number) {
    if (
      !confirm(
        awardPts > 0
          ? `Validar compra y otorgar ${awardPts} pts?`
          : "Validar compra (sin puntos retroactivos)?",
      )
    )
      return;
    const res = await fetch("/api/admin/validar-compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, award_pts: awardPts }),
    });
    if (!res.ok) {
      alert("Falló: " + (await res.text()));
      return;
    }
    router.refresh();
  }

  async function invalidarBitacora(id: string) {
    if (!confirm("Invalidar bitácora? Reverte los puntos otorgados.")) return;
    const res = await fetch("/api/admin/invalidar-bitacora", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      alert("Falló: " + (await res.text()));
      return;
    }
    router.refresh();
  }

  return (
    <>
      <section className="border-b border-piedra px-8 py-16 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Compras por validar ({pendientes.length})
          </p>
          {pendientes.length === 0 ? (
            <p className="mt-3 font-serif italic text-niebla">Nada por validar.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {pendientes.map((c) => {
                const u = profileById.get(c.user_id);
                return (
                  <li key={c.id} className="border border-piedra p-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {c.foto_url && (
                        <a
                          href={c.foto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.foto_url}
                            alt="Foto de la pieza"
                            className="h-32 w-32 border border-piedra object-cover sm:h-40 sm:w-40"
                          />
                        </a>
                      )}
                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-serif text-lg">
                            {c.familia_slug ?? "(sin familia)"}{" "}
                            {c.color_valiz && (
                              <span className="italic text-cuero">
                                · {c.color_valiz}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                            {u?.email ?? c.user_id}
                          </p>
                          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                            {c.lugar_compra && `${c.lugar_compra} · `}
                            {c.fecha_compra && `${c.fecha_compra} · `}
                            SKU match: {c.sku ?? "—"}
                          </p>
                          {c.descripcion && (
                            <p className="mt-2 font-serif text-sm italic text-niebla">
                              {c.descripcion}
                            </p>
                          )}
                        </div>
                        <CompraActions
                          onValidar={(pts) => validarCompra(c.id, pts)}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="border-b border-piedra px-8 py-16 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Bitácoras recientes
          </p>
          {bitacoras.length === 0 ? (
            <p className="mt-3 font-serif italic text-niebla">Sin bitácoras.</p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bitacoras.map((b) => {
                const u = profileById.get(b.user_id);
                return (
                  <li key={b.id} className="border border-piedra bg-fondo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.foto_url}
                      alt={b.lugar ?? ""}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="px-3 py-3">
                      <p className="font-serif text-sm italic text-cuero">
                        {b.lugar ?? "(sin lugar)"}
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                        {u?.email ?? b.user_id} · {new Date(b.created_at).toLocaleDateString("es-CL")}{" "}
                        {b.points_awarded > 0 && `· +${b.points_awarded} pts`}
                        {b.invalidated && " · INVALIDADA"}
                      </p>
                      {!b.invalidated && (
                        <button
                          onClick={() => invalidarBitacora(b.id)}
                          className="mt-3 border border-tinta px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-tinta hover:bg-tinta hover:text-fondo"
                        >
                          Invalidar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function CompraActions({ onValidar }: { onValidar: (pts: number) => void }) {
  const [pts, setPts] = useState("0");
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={pts}
        onChange={(e) => setPts(e.target.value)}
        placeholder="0"
        className="w-20 border border-piedra bg-fondo px-2 py-1 font-sans text-sm"
      />
      <button
        onClick={() => onValidar(Number(pts) || 0)}
        className="border border-musgo px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-musgo hover:bg-musgo hover:text-fondo"
      >
        Validar
      </button>
    </div>
  );
}
