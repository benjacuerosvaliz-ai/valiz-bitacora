import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/server";

import { AddPiezaForm } from "./form";

export const metadata: Metadata = {
  title: "Agregar pieza · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

export default async function AgregarPiezaPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [famRes, cueRes] = await Promise.all([
    sb.from("familias").select("slug, name").order("name"),
    sb.from("cueros").select("display_name").order("display_name"),
  ]);

  const familias = (famRes.data ?? []) as { slug: string; name: string }[];
  const cueros = (cueRes.data ?? []) as { display_name: string }[];

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/yo" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Agregar pieza
        </p>
      </header>

      <section className="flex flex-1 items-start px-8 sm:px-16">
        <div className="mx-auto w-full max-w-2xl py-16 sm:py-24">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Agregar pieza
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            ¿Tienes una Valiz que no aparece?
          </h1>
          <p className="mt-6 max-w-xl font-serif italic leading-relaxed text-niebla">
            Si la compraste fuera de valiz.cl (feria, regalo, segunda mano),
            agrégala acá y la sumamos a tu equipaje. Mientras la validamos no
            cuenta para puntos, pero sí aparece en tu bitácora.
          </p>

          <div className="mt-10">
            <AddPiezaForm familias={familias} cueros={cueros} />
          </div>
        </div>
      </section>
    </main>
  );
}
