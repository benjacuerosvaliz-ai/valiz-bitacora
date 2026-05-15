import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { EmailAltForm } from "./email-alt-form";

export const metadata: Metadata = {
  title: "Vincular correo · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

export default async function EmailAltPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select("email, secondary_emails")
    .eq("id", user.id)
    .single();

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

      <section className="flex flex-1 items-start px-8 sm:px-16">
        <div className="mx-auto w-full max-w-xl py-16 sm:py-24">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Vincular otro correo
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            ¿Compraste con otro correo?
          </h1>
          <p className="mt-6 font-serif italic leading-relaxed text-niebla">
            Vincula los correos que usaste antes en valiz.cl y vamos a sumar
            tu historial entero a tu bitácora. Te mandamos un código de 6
            dígitos al correo nuevo para confirmar que es tuyo.
          </p>

          {(profile?.secondary_emails?.length ?? 0) > 0 && (
            <div className="mt-8 border border-piedra p-4">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-niebla">
                Ya vinculados
              </p>
              <ul className="mt-2 space-y-1">
                {profile!.secondary_emails!.map((e: string) => (
                  <li key={e} className="font-serif text-base text-tinta">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10">
            <EmailAltForm primaryEmail={profile?.email ?? ""} />
          </div>
        </div>
      </section>
    </main>
  );
}
