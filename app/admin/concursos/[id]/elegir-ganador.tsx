"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ElegirGanadorButton({
  concursoId,
  bitacoraId,
}: {
  concursoId: string;
  bitacoraId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function elegir() {
    if (
      !confirm(
        "¿Marcar esta bitácora como ganadora? Esto reemplaza el ganador anterior si lo había.",
      )
    )
      return;
    setLoading(true);
    const res = await fetch("/api/admin/concursos/ganador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concurso_id: concursoId,
        bitacora_id: bitacoraId,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Error al marcar ganador.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={elegir}
      disabled={loading}
      className="border border-tinta bg-tinta px-3 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-fondo transition-colors hover:bg-cuero disabled:opacity-50"
    >
      {loading ? "…" : "Marcar ganador"}
    </button>
  );
}
