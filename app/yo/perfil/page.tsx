import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/server";

import { PerfilForm } from "./perfil-form";

export const metadata: Metadata = {
  title: "Tu perfil · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select("email, display_name, country, city, bio, marketing_optin")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-piedra px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/yo" />
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Perfil personal
        </p>
      </header>

      <section className="flex flex-1 items-start px-8 sm:px-16">
        <div className="mx-auto w-full max-w-xl py-16 sm:py-24">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Tu perfil
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            Cómo te ven los demás.
          </h1>
          <p className="mt-6 font-serif italic leading-relaxed text-niebla">
            Tu correo es {profile?.email} (no se puede cambiar acá). El nombre
            que pongas es lo que aparece en tus bitácoras públicas.
          </p>

          <div className="mt-10">
            <PerfilForm
              initial={{
                display_name: profile?.display_name ?? "",
                country: profile?.country ?? "",
                city: profile?.city ?? "",
                bio: profile?.bio ?? "",
                marketing_optin: profile?.marketing_optin ?? false,
              }}
            />
          </div>

          <div className="mt-16 border-t border-piedra pt-8">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Otros correos
            </p>
            <p className="mt-3 font-serif italic leading-relaxed text-niebla">
              Si compraste antes con otro correo, vincúlalo y sumamos tu
              historial Valiz a esta cuenta.
            </p>
            <Link
              href="/yo/email-alt"
              className="mt-5 inline-block border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Vincular otro correo →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
