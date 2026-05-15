"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Initial = {
  display_name: string;
  country: string;
  city: string;
  bio: string;
  instagram_handle: string;
  tiktok_handle: string;
};

// Normaliza @user, https://instagram.com/user, etc. → "user"
function cleanHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .split(/[?#]/)[0];
}

export function PerfilForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function update<K extends keyof Initial>(k: K, v: Initial[K]) {
    setData((prev) => ({ ...prev, [k]: v }));
    setDone(false);
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const payload = {
      ...data,
      instagram_handle: cleanHandle(data.instagram_handle),
      tiktok_handle: cleanHandle(data.tiktok_handle),
    };
    const res = await fetch("/api/perfil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "No se pudo guardar.");
      return;
    }
    setData(payload);
    setDone(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Field label="Nombre público">
        <input
          type="text"
          value={data.display_name}
          onChange={(e) => update("display_name", e.target.value)}
          placeholder="Cómo quieres que te llamen"
          maxLength={60}
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-xl outline-none focus:border-cuero"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <Field label="País">
          <input
            type="text"
            value={data.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Chile"
            maxLength={60}
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero sm:text-lg"
          />
        </Field>
        <Field label="Ciudad">
          <input
            type="text"
            value={data.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Santiago"
            maxLength={80}
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero sm:text-lg"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <Field label="Instagram">
          <div className="flex items-baseline gap-1 border-b border-tinta px-1 py-2 focus-within:border-cuero">
            <span className="font-serif text-base text-niebla sm:text-lg">@</span>
            <input
              type="text"
              value={data.instagram_handle}
              onChange={(e) => update("instagram_handle", e.target.value)}
              placeholder="tuusuario"
              maxLength={60}
              autoCapitalize="off"
              autoComplete="off"
              className="flex-1 bg-transparent font-serif text-base outline-none placeholder:text-niebla/40 sm:text-lg"
            />
          </div>
        </Field>
        <Field label="TikTok">
          <div className="flex items-baseline gap-1 border-b border-tinta px-1 py-2 focus-within:border-cuero">
            <span className="font-serif text-base text-niebla sm:text-lg">@</span>
            <input
              type="text"
              value={data.tiktok_handle}
              onChange={(e) => update("tiktok_handle", e.target.value)}
              placeholder="tuusuario"
              maxLength={60}
              autoCapitalize="off"
              autoComplete="off"
              className="flex-1 bg-transparent font-serif text-base outline-none placeholder:text-niebla/40 sm:text-lg"
            />
          </div>
        </Field>
      </div>

      <Field label="Bio (opcional)">
        <textarea
          value={data.bio}
          onChange={(e) => update("bio", e.target.value)}
          placeholder="Algo de ti, una frase, lo que quieras."
          rows={3}
          maxLength={280}
          className="resize-none border-b border-tinta bg-transparent px-1 py-2 font-serif text-base outline-none focus:border-cuero"
        />
      </Field>

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}
      {done && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-musgo">
          ✓ Guardado
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
      >
        {loading ? "Guardando…" : "Guardar perfil →"}
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
