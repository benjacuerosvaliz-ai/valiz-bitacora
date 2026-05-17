"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CrearConcursoForm() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [premio, setPremio] = useState("");
  const [inicia, setInicia] = useState("");
  const [termina, setTermina] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!titulo.trim()) return setError("Pon un título.");
    if (!inicia || !termina) return setError("Pon las dos fechas.");
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/concursos/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        premio_descripcion: premio.trim() || null,
        inicia_at: new Date(inicia).toISOString(),
        termina_at: new Date(termina).toISOString(),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear el concurso.");
      return;
    }
    router.push(`/admin/concursos/${json.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Título" required>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Foto en montaña · mayo"
          maxLength={120}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-lg outline-none focus:border-cuero"
        />
      </Field>

      <Field label="Descripción (tema)">
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Tu Valiz en altura. Que la pieza se vea, que se note el lugar."
          rows={2}
          maxLength={1000}
          className="resize-none border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
        />
      </Field>

      <Field label="Premio">
        <input
          type="text"
          value={premio}
          onChange={(e) => setPremio(e.target.value)}
          placeholder="Strap de regalo + descuento $20.000 en valiz.cl"
          maxLength={280}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicia" required>
          <input
            type="datetime-local"
            value={inicia}
            onChange={(e) => setInicia(e.target.value)}
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
          />
        </Field>
        <Field label="Termina" required>
          <input
            type="datetime-local"
            value={termina}
            onChange={(e) => setTermina(e.target.value)}
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
          />
        </Field>
      </div>

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
      >
        {loading ? "Creando…" : "Crear concurso →"}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label} {required && <span className="text-cuero">*</span>}
      </span>
      {children}
    </label>
  );
}
