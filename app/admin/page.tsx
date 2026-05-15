import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Admin · Valiz Bitácora",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user.email)) notFound();

  const admin = createAdminClient();

  const [
    pendientesRes,
    bitsRes,
    canjesRes,
    profilesRes,
    codigosRes,
    movimientosRes,
  ] = await Promise.all([
    admin
      .from("compras_manuales")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("bitacora_entries")
      .select("id, user_id, sku, foto_url, lugar, texto, created_at, points_awarded, invalidated")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("recompensas_canjes")
      .select("id, user_id, monto_clp, shopify_discount_code, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("user_profiles").select("id, email, display_name, puntos_actuales, created_at"),
    admin.from("codigos_disponibles").select("denominacion_clp, assigned_to_user_id"),
    admin.from("puntos_movimientos").select("id"),
  ]);

  const codigos = (codigosRes.data ?? []) as { denominacion_clp: number; assigned_to_user_id: string | null }[];
  const stockByDenom = new Map<number, number>();
  const usadosByDenom = new Map<number, number>();
  for (const c of codigos) {
    if (c.assigned_to_user_id === null) {
      stockByDenom.set(c.denominacion_clp, (stockByDenom.get(c.denominacion_clp) ?? 0) + 1);
    } else {
      usadosByDenom.set(c.denominacion_clp, (usadosByDenom.get(c.denominacion_clp) ?? 0) + 1);
    }
  }
  const allDenoms = [...new Set([...stockByDenom.keys(), ...usadosByDenom.keys()])].sort((a, b) => a - b);

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-baseline justify-between border-b border-tinta px-8 py-6 sm:px-16 sm:py-8">
        <Link
          href="/yo"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero hover:text-tinta"
        >
          ← Volver
        </Link>
        <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-tinta">
          Admin
        </p>
      </header>

      <section className="border-b border-piedra px-8 py-12 sm:px-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.015em] sm:text-5xl">
            Resumen
          </h1>
          <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4">
            <Stat label="Usuarios" big={profilesRes.data?.length ?? 0} />
            <Stat label="Compras manuales pendientes" big={pendientesRes.data?.length ?? 0} />
            <Stat label="Bitácoras" big={bitsRes.data?.length ?? 0} />
            <Stat label="Canjes hechos" big={canjesRes.data?.length ?? 0} />
          </div>

          <div className="mt-12">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
              Códigos de canje
            </p>
            {allDenoms.length === 0 ? (
              <p className="mt-3 font-serif italic text-niebla">
                Sin códigos cargados. Genera lote en Shopify y corre{" "}
                <code className="font-mono text-sm">scripts/cargar_codigos.py</code>.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {allDenoms.map((d) => (
                  <li key={d} className="border border-piedra p-3">
                    <p className="font-serif text-2xl">${d.toLocaleString("es-CL")}</p>
                    <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-niebla">
                      {stockByDenom.get(d) ?? 0} libres · {usadosByDenom.get(d) ?? 0} usados
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <AdminPanel
        pendientes={pendientesRes.data ?? []}
        bitacoras={bitsRes.data ?? []}
        profiles={profilesRes.data ?? []}
      />
    </main>
  );
}

function Stat({ label, big }: { label: string; big: number }) {
  return (
    <div>
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl leading-none tracking-[-0.02em]">
        {big.toLocaleString("es-CL")}
      </p>
    </div>
  );
}
