"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Pieza = { sku: string; label: string };
type Concurso = { id: string; slug: string; titulo: string };

const MAX_FILE_MB = 8;

export function BitacoraForm({
  piezas,
  skuPreSelected,
  concurso,
}: {
  piezas: Pieza[];
  skuPreSelected: string | null;
  concurso: Concurso | null;
}) {
  const router = useRouter();
  const [sku, setSku] = useState(
    skuPreSelected && piezas.some((p) => p.sku === skuPreSelected)
      ? skuPreSelected
      : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lugar, setLugar] = useState("");
  const [texto, setTexto] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [postular, setPostular] = useState(!!concurso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8_000 },
    );
  }

  async function submit() {
    if (!sku) return setError("Elige una pieza.");
    if (!file) return setError("Sube una foto.");
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return setError(`La foto debe pesar menos de ${MAX_FILE_MB} MB.`);
    }
    if (!file.type.startsWith("image/")) {
      return setError("El archivo tiene que ser una imagen.");
    }
    if (!texto.trim()) return setError("Escribe algo de la historia.");

    setError(null);
    setLoading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("sku", sku);
    fd.append("lugar", lugar);
    fd.append("texto", texto);
    if (coords) {
      fd.append("lat", String(coords.lat));
      fd.append("lng", String(coords.lng));
    }

    const res = await fetch("/api/bitacora/nueva", {
      method: "POST",
      body: fd,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(json.error ?? "No se pudo subir la bitácora.");
      return;
    }

    // Postular al concurso si correspondía
    if (postular && concurso && json.bitacora_id) {
      try {
        await fetch("/api/concursos/postular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concurso_id: concurso.id,
            bitacora_id: json.bitacora_id,
          }),
        });
      } catch {
        // No bloquea — la bitácora ya está subida
      }
    }

    setLoading(false);
    router.push(postular && concurso ? `/concursos/${concurso.slug}` : "/yo?bitacora=1");
    router.refresh();
  }

  const textoLen = texto.trim().length;
  const calificaParaPuntos = !!file && !!coords && textoLen >= 30;

  return (
    <div className="flex flex-col gap-5">
      <Field label="¿Qué pieza?">
        <select
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero sm:text-lg"
        >
          <option value="">— Elige una pieza —</option>
          {piezas.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      {/* Lugar + ubicación en 2 columnas */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-3 sm:gap-5">
        <Field label="¿Dónde?">
          <input
            type="text"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Cajón del Maipo, Berlín…"
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Ubicación
          </span>
          {geoStatus === "ok" && coords ? (
            <p className="font-serif text-sm italic text-musgo">
              ✓ {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
            </p>
          ) : geoStatus === "loading" ? (
            <p className="font-serif text-sm italic text-niebla">Localizando…</p>
          ) : geoStatus === "denied" ? (
            <p className="font-serif text-sm italic text-niebla">
              Denegada — sin mapa.
            </p>
          ) : (
            <button
              onClick={pickLocation}
              className="self-start border border-tinta px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Usar mi GPS
            </button>
          )}
        </div>
      </div>

      <Field label={`Foto del producto (max ${MAX_FILE_MB} MB)`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="font-sans text-sm file:mr-3 file:cursor-pointer file:border file:border-tinta file:bg-transparent file:px-3 file:py-2 file:font-sans file:text-[10px] file:uppercase file:tracking-[0.18em] file:text-tinta hover:file:bg-tinta hover:file:text-fondo"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            className="mt-3 max-h-56 border border-piedra object-contain sm:max-h-72"
          />
        )}
        <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
          La foto tiene que mostrar la pieza Valiz claramente. Si no
          aparece el producto, no la publicamos.
        </p>
      </Field>

      <Field label={`Tu historia (${textoLen}/30 mínimo para 200 pts)`}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cómo llegó hasta acá, qué cargabas adentro, qué pasó ese día…"
          rows={4}
          className="resize-none border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
        />
      </Field>

      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
        {calificaParaPuntos
          ? "✓ Califica para 200 pts (si es la primera del mes para esta pieza)."
          : "Para 200 pts: foto + ubicación + 30 caracteres de historia."}
      </p>

      {concurso && (
        <label className="flex cursor-pointer items-start gap-3 border border-piedra bg-fondo/70 p-4">
          <input
            type="checkbox"
            checked={postular}
            onChange={(e) => setPostular(e.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer accent-tinta"
          />
          <span className="font-serif text-sm leading-relaxed">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Concurso vigente
            </span>
            <br />
            Postular esta bitácora al concurso{" "}
            <strong>«{concurso.titulo}»</strong>.
          </span>
        </label>
      )}

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading || !sku || !file || !texto.trim()}
        className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
      >
        {loading ? "Subiendo…" : "Publicar bitácora →"}
      </button>
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
