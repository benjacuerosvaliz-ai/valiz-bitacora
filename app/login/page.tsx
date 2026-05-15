import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Valiz Bitácora",
  description: "Entra a tu bitácora personal de Valiz.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Tu equipaje
        </p>
      </header>

      <section className="flex flex-1 items-center px-8 sm:px-16">
        <div className="mx-auto w-full max-w-md py-20">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Bitácora personal
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.04] tracking-[-0.022em] sm:text-6xl">
            Entra al equipaje.
          </h1>
          <p className="mt-6 font-serif italic leading-relaxed text-niebla">
            Si ya compraste con nosotros antes, vas a encontrar tu historia
            armada esperándote.
          </p>

          <div className="mt-8 border-l-2 border-cuero pl-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Si compraste antes
            </p>
            <p className="mt-2 font-serif text-base leading-relaxed">
              Idealmente entra con el correo que usaste para esas compras —
              ahí encontramos tu equipaje de inmediato. Si usas otro,
              después puedes <strong>vincular tus correos</strong> con un
              código de verificación y mover todo tu historial Valiz a tu
              bitácora.
            </p>
          </div>

          <div className="mt-10">
            <LoginForm />
          </div>
        </div>
      </section>

      <footer className="px-8 py-8 sm:px-16">
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Valiz · Since 2018
        </p>
      </footer>
    </main>
  );
}
