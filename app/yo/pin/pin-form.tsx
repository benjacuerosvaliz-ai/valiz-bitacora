"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PinForm({ tienePin }: { tienePin: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN tiene que ser de 4 dígitos.");
      return;
    }
    if (pin !== pin2) {
      setError("Los dos PINs no coinciden.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/pin/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo guardar el PIN.");
      return;
    }
    setDone(true);
    router.refresh();
    setTimeout(() => router.push("/yo"), 1200);
  }

  if (done) {
    return (
      <div className="rounded border border-musgo bg-fondo p-8">
        <p className="font-serif text-xl italic text-musgo">
          PIN guardado. Te llevamos de vuelta…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
          {tienePin ? "Nuevo PIN" : "Tu PIN"} (4 dígitos)
        </span>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="new-password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-2xl tracking-[0.5em] outline-none placeholder:text-niebla/40 focus:border-cuero"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
          Confirmar
        </span>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="new-password"
          value={pin2}
          onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-2xl tracking-[0.5em] outline-none placeholder:text-niebla/40 focus:border-cuero"
        />
      </label>

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="mt-2 bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
      >
        {loading ? "Guardando…" : tienePin ? "Actualizar PIN →" : "Guardar PIN →"}
      </button>
    </div>
  );
}
