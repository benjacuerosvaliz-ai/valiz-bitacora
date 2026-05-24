"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const nf = new Intl.NumberFormat("es-CL");

type Step = "email" | "code" | "done";

export function EmailAltForm({ primaryEmail }: { primaryEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pts: number;
    orders: number;
  } | null>(null);

  async function iniciar() {
    if (!email.includes("@")) {
      setError("Email inválido.");
      return;
    }
    if (email.trim().toLowerCase() === primaryEmail.toLowerCase()) {
      setError("Ese ya es tu correo principal.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/email-alt/iniciar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No pudimos mandar el código.");
      return;
    }
    setStep("code");
  }

  async function verificar() {
    if (!/^\d{6}$/.test(code)) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/email-alt/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No pudimos verificar el código.");
      return;
    }
    setResult({
      pts: json.pts_otorgados ?? 0,
      orders: json.orders_matched ?? 0,
    });
    setStep("done");
    router.refresh();
  }

  if (step === "done" && result) {
    return (
      <div className="border border-musgo bg-fondo p-8">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-musgo">
          Correo vinculado
        </p>
        <h2 className="mt-4 font-serif text-3xl leading-tight">
          {email} es tuyo ahora.
        </h2>
        {result.orders > 0 ? (
          <p className="mt-4 font-serif text-lg leading-relaxed">
            Encontramos <strong>{result.orders}</strong>{" "}
            {result.orders === 1
              ? "compra histórica con ese correo"
              : "compras históricas con ese correo"}
            , y te dimos{" "}
            <strong className="text-cuero">
              ${nf.format(result.pts)} retroactivos
            </strong>
            .
          </p>
        ) : (
          <p className="mt-4 font-serif italic leading-relaxed text-niebla">
            No encontramos compras pasadas con ese correo en nuestro
            sistema. Sigue vinculado por si compras más adelante con él.
          </p>
        )}
        <a
          href="/yo"
          className="mt-8 inline-block bg-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero"
        >
          Ver mi equipaje →
        </a>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="flex flex-col gap-6">
        <p className="font-serif italic text-niebla">
          Te mandamos un código a <strong>{email}</strong>. Revisa tu inbox
          (y la carpeta de spam). El código caduca en 15 minutos.
        </p>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
            Código (6 dígitos)
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-3xl tracking-[0.4em] outline-none placeholder:text-niebla/40 focus:border-cuero"
          />
        </label>

        {error && (
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={verificar}
            disabled={loading || code.length !== 6}
            className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
          >
            {loading ? "Verificando…" : "Verificar y vincular →"}
          </button>
          <button
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla hover:text-cuero"
          >
            ← Usar otro correo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
          Correo a vincular
        </span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="otrocorreo@gmail.com"
          className="border-b border-tinta bg-transparent px-1 py-2 font-serif text-xl outline-none placeholder:text-niebla/40 focus:border-cuero"
        />
      </label>

      {error && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#a83a1f]">
          {error}
        </p>
      )}

      <button
        onClick={iniciar}
        disabled={loading || !email.includes("@")}
        className="bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors hover:bg-cuero disabled:opacity-40"
      >
        {loading ? "Mandando código…" : "Mandar código →"}
      </button>
    </div>
  );
}
