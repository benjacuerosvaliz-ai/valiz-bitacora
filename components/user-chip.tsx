import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

/**
 * Pill flotante arriba a la derecha. Muestra "Entrar" si no hay sesión,
 * o "Tu equipaje" + saldo de puntos si la hay. Se renderiza en el layout
 * raíz, fijo al viewport.
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

  return (
    <Link
      href="/yo"
      className="fixed right-4 top-4 z-40 inline-flex items-center gap-3 rounded-full border border-piedra bg-fondo/85 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:border-cuero hover:text-cuero sm:right-6 sm:top-6"
    >
      <span>{nombre}</span>
      <span className="text-cuero">{pts.toLocaleString("es-CL")} pts</span>
    </Link>
  );
}
