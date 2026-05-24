import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { createStaticClient } from "@/lib/supabase/static";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Valiz Bitácora",
  description:
    "Crea tu cuenta gratis: te damos $2.000 al instante y hasta $5.000 si completas tu bitácora.",
};

export const revalidate = 600; // 10 min — los stats no se mueven rápido

const nf = new Intl.NumberFormat("es-CL");

export default async function LoginPage() {
  // Prueba social: cuántos clientes ya están en la bitácora
  const sb = createStaticClient();
  const { count: comunidadCount } = await sb
    .from("user_profiles_public")
    .select("id", { head: true, count: "exact" });

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Tu equipaje
        </p>
      </header>

      <section className="flex flex-1 items-center px-6 sm:px-16">
        <div className="mx-auto w-full max-w-lg py-12 sm:py-20">
          {/* Premio destacado arriba — la razón por la que vienen */}
          <div className="border-l-2 border-cuero pl-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Tu regalo está listo
            </p>
            <p className="mt-3 font-serif text-3xl leading-[1.05] tracking-[-0.02em] sm:text-4xl">
              <span className="italic text-cuero">$2.000</span> al instante por
              entrar.
            </p>
            <p className="mt-2 font-serif text-base italic leading-relaxed text-niebla">
              Y hasta $5.000 más completando tu bitácora. Canjeables 1 a 1 en
              valiz.cl en compras desde $25.000.
            </p>
          </div>

          {/* Prueba social */}
          {comunidadCount && comunidadCount > 100 ? (
            <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
              Ya somos{" "}
              <span className="text-cuero">
                {nf.format(comunidadCount)}
              </span>{" "}
              en la bitácora.
            </p>
          ) : null}

          {/* Form */}
          <div className="mt-8">
            <LoginForm />
          </div>

          {/* Nota para reclamar compras viejas — más concisa */}
          <p className="mt-6 font-serif text-sm italic leading-relaxed text-niebla">
            Si ya compraste Valiz antes, entra con ese correo y tu equipaje
            aparece armado al toque. Si usas otro, lo puedes vincular después.
          </p>
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
