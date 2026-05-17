import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
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

  const [pendientesRes, bitsRes, canjesRes, profilesRes] = await Promise.all([
    admin
      .from("compras_manuales")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("bitacora_entries")
      .select(
        "id, user_id, sku, foto_url, lugar, texto, created_at, points_awarded, invalidated",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("recompensas_canjes")
      .select("id, user_id, monto_clp, shopify_discount_code, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("user_profiles")
      .select("id, email, display_name, puntos_actuales, created_at"),
  ]);

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <header className="flex items-center justify-between border-b border-tinta px-8 py-5 sm:px-16 sm:py-6">
        <BrandMark variant="back" href="/yo" />
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
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
            <Stat label="Por validar" big={pendientesRes.data?.length ?? 0} />
            <Stat label="Bitácoras" big={bitsRes.data?.length ?? 0} />
            <Stat label="Canjes hechos" big={canjesRes.data?.length ?? 0} />
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/admin/concursos"
              className="inline-flex items-center gap-3 border border-tinta px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta transition-colors hover:bg-tinta hover:text-fondo"
            >
              Gestionar concursos →
            </Link>
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
