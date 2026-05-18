"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Avatar uploader. Muestra el avatar actual (o monograma cuero con
 * inicial como fallback) y permite cambiarlo / quitarlo.
 *
 * Flujo:
 *  1. Click en avatar o "Cambiar foto" → file picker
 *  2. Preview optimista + POST a /api/perfil/avatar
 *  3. Refresh para re-renderizar con la URL nueva
 *
 * Acepta jpg/png/webp hasta 5MB (validado server-side también).
 */
export function AvatarUpload({
  initialUrl,
  initialName,
}: {
  initialUrl: string | null;
  initialName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inicial = initialName.trim().charAt(0).toUpperCase() || "V";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Máximo 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo JPG, PNG o WebP.");
      return;
    }

    setError(null);
    setBusy(true);

    // Preview optimista mientras sube
    const tempUrl = URL.createObjectURL(file);
    setUrl(tempUrl);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/perfil/avatar", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "upload_failed");
      }
      setUrl(json.url ?? null);
      router.refresh();
    } catch (e) {
      setError(
        (e as Error).message === "archivo_muy_grande"
          ? "Archivo muy grande (máx 5 MB)."
          : "No se pudo subir. Probá otra foto.",
      );
      setUrl(initialUrl); // revert
    } finally {
      setBusy(false);
      URL.revokeObjectURL(tempUrl);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    if (!url) return;
    if (!confirm("¿Quitar tu foto de perfil?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/perfil/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      setUrl(null);
      router.refresh();
    } catch {
      setError("No se pudo quitar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5 sm:gap-6">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative h-24 w-24 overflow-hidden rounded-full border border-piedra transition-colors hover:border-cuero disabled:opacity-50 sm:h-28 sm:w-28"
        aria-label="Cambiar foto de perfil"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-cuero font-serif text-4xl text-fondo sm:text-5xl">
            {inicial}
          </span>
        )}
        {/* Overlay hover */}
        <span className="absolute inset-0 flex items-center justify-center bg-tinta/60 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-fondo opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? "Subiendo…" : url ? "Cambiar" : "Subir"}
        </span>
      </button>

      <div className="flex flex-col gap-2">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
          Foto de perfil
        </p>
        <p className="font-serif text-sm italic leading-relaxed text-tinta/70">
          Sale en tu perfil público y en la bitácora.
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero transition-colors hover:text-tinta disabled:opacity-50"
          >
            {url ? "Cambiar foto" : "Subir foto"}
          </button>
          {url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla transition-colors hover:text-[#a83a1f] disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>
        {error && (
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#a83a1f]">
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
