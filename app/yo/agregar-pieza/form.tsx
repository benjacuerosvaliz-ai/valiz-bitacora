"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Familia = { slug: string; name: string };
type Cuero = { display_name: string };

const MAX_FILE_MB = 8;

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const colorFinal = color === "__otro__" ? colorOtro.trim() : color;

  function valid(): string | null {
    if (!familiaSlug) return "Elige la familia.";
    if (!colorFinal) return "Indica el color del cuero.";
    if (!lugar.trim()) return "Indica dónde la conseguiste.";
    if (!fecha) return "Indica cuándo la compraste.";
    if (!file) return "Sube una foto de la pieza para validarla.";
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      return `La foto debe pesar menos de ${MAX_FILE_MB} MB.`;
    if (!file.type.startsWith("image/"))
      return "El archivo debe ser una imagen.";
    return null;
  }

  async function submit() {
    const v = valid();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);

    const fd = new FormData();
    fd.append("familia_slug", familiaSlug);
    fd.append("color_valiz", colorFinal);
    fd.append("lugar_compra", lugar.trim());
    fd.append("fecha_compra", fecha);
    fd.append("file", file!);

    const res = await fetch("/api/compras/manual", {
      method: "POST",
      body: fd,
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
      <Field label="Pieza" required>
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

      <Field label="Color del cuero" required>
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-xl outline-none focus:border-cuero"
        >
          <option value="">— Elige un color —</option>
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

      <Field label="¿Dónde la conseguiste?" required>
        <input
          type="text"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Feria, regalo, otra tienda…"
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-lg outline-none focus:border-cuero"
        />
      </Field>

      <Field label="¿Cuándo?" required>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-lg outline-none focus:border-cuero"
        />
      </Field>

      <Field label={`Foto de la pieza (max ${MAX_FILE_MB} MB)`} required>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="font-sans text-sm file:mr-3 file:cursor-pointer file:border file:border-tinta file:bg-transparent file:px-4 file:py-2 file:font-sans file:text-[11px] file:uppercase file:tracking-[0.18em] file:text-tinta hover:file:bg-tinta hover:file:text-fondo"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            className="mt-3 max-h-64 border border-piedra object-contain"
          />
        )}
        <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          Necesitamos verla para validarla. Foto del cuero, no de stock.
        </p>
      </Field>

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
        >
          {loading ? "Subiendo…" : "Agregar a mi equipaje →"}
        </button>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
          Aparece como pendiente. Una vez validada suma puntos retroactivos.
        </p>
      </div>
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
