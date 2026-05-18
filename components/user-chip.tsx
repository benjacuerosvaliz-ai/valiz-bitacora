import Link from "next/link";

import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { NotifBell, type NotifItem } from "./notif-bell";
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
        className="fixed right-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-piedra bg-fondo/85 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:border-cuero hover:text-cuero sm:right-6 sm:top-6"
      >
        Entrar
      </Link>
    );
  }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("display_name, email, puntos_actuales, handle")
    .eq("id", user.id)
    .maybeSingle();

  const nombre =
    profile?.display_name ||
    profile?.email?.split("@")[0] ||
    "Tu equipaje";
  const pts = profile?.puntos_actuales ?? 0;
  const handle = profile?.handle ?? null;

  // Si soy admin, contar pendientes para mostrar badge.
  let pendientes = 0;
  const esAdmin = isAdmin(user.email);
  const admin = createAdminClient();
  if (esAdmin) {
    const { count } = await admin
      .from("compras_manuales")
      .select("id", { head: true, count: "exact" })
      .eq("verified", false);
    pendientes = count ?? 0;
  }

  // Notificaciones del user. Tolerar ausencia de tabla (migración aún
  // no aplicada → arrays vacíos).
  let notifsInitial: { items: NotifItem[]; unread: number } = {
    items: [],
    unread: 0,
  };
  try {
    const [{ data: items }, { count: unreadCount }] = await Promise.all([
      admin
        .from("notificaciones")
        .select("id, type, ref_id, ref_type, payload, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      admin
        .from("notificaciones")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    notifsInitial = {
      items: (items ?? []) as NotifItem[],
      unread: unreadCount ?? 0,
    };
  } catch {
    // tabla no existe — bell muestra panel vacío sin badge
  }

  return (
    <div className="fixed right-4 top-4 z-30 flex items-start gap-2 sm:right-6 sm:top-6">
      <NotifBell
        initialUnread={notifsInitial.unread}
        initialItems={notifsInitial.items}
      />
      <UserChipMenuPositioned
        nombre={nombre}
        pts={pts}
        pendientes={pendientes}
        esAdmin={esAdmin}
        handle={handle}
      />
    </div>
  );
}

/**
 * Wrapper para que el UserChipMenu se renderice en flujo normal dentro
 * del wrapper fixed de arriba — antes el componente tenía su propio
 * `fixed right-4 top-4`. Para evitar tocar todo el client, lo envuelvo
 * y reuso.
 */
function UserChipMenuPositioned(props: {
  nombre: string;
  pts: number;
  pendientes: number;
  esAdmin: boolean;
  handle: string | null;
}) {
  return <UserChipMenu {...props} />;
}
