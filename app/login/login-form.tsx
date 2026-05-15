"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "email" | "pin" | "magic-sent";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink() {
    if (!email.includes("@")) {
      setError("Necesito un email válido.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMode("magic-sent");
  }

  async function handlePinVerify() {
    if (!email.includes("@")) {
      setError("Necesito un email válido.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN tiene que ser de 4 dígitos.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/pin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pin }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setLoading(false);
      setError(json.error ?? "No pude verificar el PIN.");
      return;
    }
    // Tenemos token_hash — pedimos sesión real
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: json.token_hash,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/yo");
    router.refresh();
  }

  if (mode === "magic-sent") {
    return (
      <div className="rounded border border-piedra bg-fondo p-8">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
          Revisa tu correo
        </p>
        <p className="mt-4 font-serif text-xl leading-snug">
          Te mandamos un link a <span className="italic">{email}</span>.
        </p>
        <p className="mt-3 font-serif text-base italic leading-relaxed text-niebla">
          Ábrelo desde el mismo dispositivo donde estás ahora. Caduca en una
          hora.
        </p>
        <button
          onClick={() => {
            setMode("email");
            setError(null);
          }}
          className="mt-6 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
        >
          ← Usar otro email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
          Tu correo
        </span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@gmail.com"
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-xl outline-none placeholder:text-niebla/40 focus:border-cuero"
        />
      </label>

      {mode === "pin" && (
        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Tu PIN (4 dígitos)
          </span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-2xl tracking-[0.5em] outline-none placeholder:text-niebla/40 focus:border-cuero"
          />
        </label>
      )}

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        {mode === "email" ? (
          <>
            <button
              onClick={handleMagicLink}
              disabled={loading}
              className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
            >
              {loading ? "Mandando…" : "Mándame un link al correo →"}
            </button>
            <button
              onClick={() => {
                setMode("pin");
                setError(null);
              }}
              className="border border-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Ya tengo un PIN
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handlePinVerify}
              disabled={loading}
              className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
            >
              {loading ? "Verificando…" : "Entrar con PIN →"}
            </button>
            <button
              onClick={() => {
                setMode("email");
                setPin("");
                setError(null);
              }}
              className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
            >
              ← Volver al magic link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
