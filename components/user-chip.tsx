import Link from "next/link";

import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { UserChipMenu } from "./user-chip-menu";

/**
 * Server component que resuelve los datos del user actual y los pasa al
 * dropdown menu (client). Si no hay sesión, muestra "Entrar" simple.
 */
export async function UserChip() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="fixed right-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-piedra bg-fondo/85 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:border-cuero hover:text-cuero sm:right-6 sm:top-6"
      >
        Entrar
      </Link>
    );
  }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("display_name, email, puntos_actuales")
    .eq("id", user.id)
    .maybeSingle();

  const nombre =
    profile?.display_name ||
    profile?.email?.split("@")[0] ||
    "Tu equipaje";
  const pts = profile?.puntos_actuales ?? 0;

  // Si soy admin, contar pendientes para mostrar badge.
  let pendientes = 0;
  const esAdmin = isAdmin(user.email);
  if (esAdmin) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("compras_manuales")
      .select("id", { head: true, count: "exact" })
      .eq("verified", false);
    pendientes = count ?? 0;
  }

  return (
    <UserChipMenu
      nombre={nombre}
      pts={pts}
      pendientes={pendientes}
      esAdmin={esAdmin}
    />
  );
}
