import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { PinForm } from "./pin-form";

export const metadata: Metadata = {
  title: "Tu PIN · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

export default async function PinPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select("pin_hash")
    .eq("id", user.id)
    .single();

  const tienePin = !!profile?.pin_hash;

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-baseline justify-between border-b border-piedra px-8 py-6 sm:px-16 sm:py-8">
        <Link
          href="/yo"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
        >
          ← Tu equipaje
        </Link>
      </header>

      <section className="flex flex-1 items-center px-8 sm:px-16">
        <div className="mx-auto w-full max-w-md py-20">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            {tienePin ? "Tu PIN" : "Crea tu PIN"}
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            {tienePin ? "Cámbialo cuando quieras." : "Entrá rápido la próxima vez."}
          </h1>
          <p className="mt-6 font-serif italic leading-relaxed text-niebla">
            Es un código de 4 dígitos que sirve para entrar a tu bitácora sin
            magic link. Si lo olvidas, igual puedes volver con el link al correo.
          </p>

          <div className="mt-10">
            <PinForm tienePin={tienePin} />
          </div>
        </div>
      </section>
    </main>
  );
}
