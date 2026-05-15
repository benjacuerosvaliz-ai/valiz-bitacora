import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { CanjeForm } from "./canje-form";

export const metadata: Metadata = {
  title: "Canjear puntos · Valiz Bitácora",
};

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");

const DENOMINACIONES = [5_000, 10_000, 15_000, 20_000, 50_000];

type Stock = { denominacion_clp: number };

export default async function CanjePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select("puntos_actuales")
    .eq("id", user.id)
    .single();

  // Stock disponible por denominación (admin client porque la tabla no expone RLS)
  const admin = createAdminClient();
  const { data: stockRaw } = await admin
    .from("codigos_disponibles")
    .select("denominacion_clp")
    .is("assigned_to_user_id", null);
  const stockRows = (stockRaw ?? []) as Stock[];
  const stockByDenom = new Map<number, number>();
  for (const r of stockRows) {
    stockByDenom.set(
      r.denominacion_clp,
      (stockByDenom.get(r.denominacion_clp) ?? 0) + 1,
    );
  }

  // Mis canjes recientes
  const { data: misCanjesRaw } = await sb
    .from("recompensas_canjes")
    .select("id, puntos_gastados, monto_clp, shopify_discount_code, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const misCanjes = (misCanjesRaw ?? []) as {
    id: string;
    puntos_gastados: number;
    monto_clp: number;
    shopify_discount_code: string;
    created_at: string;
  }[];

  const puntos = profile?.puntos_actuales ?? 0;

  const opciones = DENOMINACIONES.map((d) => ({
    denominacion: d,
    stock: stockByDenom.get(d) ?? 0,
    puedePagar: puntos >= d,
  }));

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

      <section className="border-b border-piedra px-8 py-20 sm:px-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Canjear puntos
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.022em] sm:text-5xl">
            Tu saldo: {nf.format(puntos)} pts.
          </h1>
          <p className="mt-6 max-w-xl font-serif italic leading-relaxed text-niebla">
            1 pt = $1 CLP. Eliges una denominación y te entregamos un código
            de descuento para usar en valiz.cl. El código aparece arriba al
            instante.
          </p>

          <div className="mt-12">
            <CanjeForm puntos={puntos} opciones={opciones} />
          </div>
        </div>
      </section>

      {misCanjes.length > 0 && (
        <section className="px-8 py-16 sm:px-16">
          <div className="mx-auto max-w-3xl">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Tus canjes
            </p>
            <ul className="mt-8">
              {misCanjes.map((c) => (
                <li key={c.id} className="border-b border-piedra py-4">
                  <div className="flex flex-col items-baseline justify-between gap-1 sm:flex-row sm:gap-6">
                    <span className="font-serif text-xl">
                      ${nf.format(c.monto_clp)} CLP
                      <span className="ml-3 font-sans text-sm uppercase tracking-[0.15em] text-cuero">
                        {c.shopify_discount_code}
                      </span>
                    </span>
                    <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                      {new Date(c.created_at).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
