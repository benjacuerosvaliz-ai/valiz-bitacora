import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /yo ahora es un redirect a /u/[handle del user]. El perfil público
 * `/u/[handle]` ya muestra todo lo que antes vivía acá cuando el
 * visitante es el dueño (equipaje detalle, pendientes por validar,
 * concurso vigente, barra de acciones rápidas, código de referido).
 *
 * Si por algún motivo el user no tiene handle generado todavía (caso
 * raro porque el trigger fn_assign_handle lo asigna al crear el
 * profile), redirigimos a /yo/perfil para que termine de configurar.
 */
export default async function YoRedirect() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.handle) redirect("/yo/perfil");

  redirect(`/u/${profile.handle}`);
}
