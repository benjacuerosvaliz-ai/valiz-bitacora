"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Familia = { slug: string; name: string };
type Cuero = { display_name: string };

export function AddPiezaForm({
  familias,
  cueros,
}: {
  familias: Familia[];
  cueros: Cuero[];
}) {
  const router = useRouter();
  const [familiaSlug, setFamiliaSlug] = useState("");
  const [color, setColor] = useState("");
  const [colorOtro, setColorOtro] = useState("");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!familiaSlug) {
      setError("Elige una familia.");
      return;
    }
    const colorFinal = color === "__otro__" ? colorOtro.trim() : color;

    setError(null);
    setLoading(true);
    const res = await fetch("/api/compras/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familia_slug: familiaSlug,
        color_valiz: colorFinal || null,
        lugar_compra: lugar || null,
        fecha_compra: fecha || null,
        descripcion: descripcion || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo guardar la pieza.");
      return;
    }
    router.push("/yo?added=1");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Field label="Pieza">
        <select
          value={familiaSlug}
          onChange={(e) => setFamiliaSlug(e.target.value)}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-xl outline-none focus:border-cuero"
        >
          <option value="">— Elige una familia —</option>
          {familias.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Color (opcional)">
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-xl outline-none focus:border-cuero"
        >
          <option value="">— No sé / no aparece —</option>
          {cueros.map((c) => (
            <option key={c.display_name} value={c.display_name}>
              {c.display_name}
            </option>
          ))}
          <option value="__otro__">Otro (escribir)</option>
        </select>
        {color === "__otro__" && (
          <input
            type="text"
            value={colorOtro}
            onChange={(e) => setColorOtro(e.target.value)}
            placeholder="Ej: Café desconocido"
            className="mt-2 border-b border-tinta bg-transparent px-1 py-2 font-serif text-lg outline-none focus:border-cuero"
          />
        )}
      </Field>

      <Field label="¿Dónde la conseguiste? (opcional)">
        <input
          type="text"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Feria, regalo, otra tienda…"
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-lg outline-none focus:border-cuero"
        />
      </Field>

      <Field label="¿Cuándo? (opcional)">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-lg outline-none focus:border-cuero"
        />
      </Field>

      <Field label="Algo más que decir (opcional)">
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Detalle del cuero, historia de cómo llegó…"
          rows={3}
          className="resize-none border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
        />
      </Field>

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <button
          onClick={submit}
          disabled={loading || !familiaSlug}
          className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
        >
          {loading ? "Guardando…" : "Agregar a mi equipaje →"}
        </button>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          Tu pieza aparecerá como pendiente de validación. Una vez validada
          suma puntos retroactivos.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </span>
      {children}
    </label>
  );
}
