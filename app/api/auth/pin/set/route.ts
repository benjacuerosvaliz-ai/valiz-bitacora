import { NextResponse, type NextRequest } from "next/server";

import { hashPin, isValidPinFormat } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/pin/set
 * Body: { pin: "1234" }
 *
 * Requiere sesión válida (magic link). Hashea el PIN con bcrypt y lo
 * guarda en user_profiles.pin_hash. Sobre-escribe si ya existía.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const pin = String(body?.pin ?? "");
  if (!isValidPinFormat(pin)) {
    return NextResponse.json(
      { error: "El PIN debe ser exactamente 4 dígitos." },
      { status: 400 },
    );
  }

  const hash = await hashPin(pin);
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update({ pin_hash: hash })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
