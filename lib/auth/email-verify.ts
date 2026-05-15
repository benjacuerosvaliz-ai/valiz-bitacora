import bcrypt from "bcryptjs";

import { createAdminClient } from "@/lib/supabase/admin";

const CODE_LENGTH = 6;
const EXPIRES_MIN = 15;
const MAX_ATTEMPTS = 5;
const RATE_WINDOW_MIN = 60;
const RATE_MAX_REQUESTS = 3;

export function generateCode(): string {
  // 6 dígitos con padding de ceros
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(CODE_LENGTH, "0");
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function compareCode(code: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(code, hash);
  } catch {
    return false;
  }
}

/**
 * Rate limit: máx 3 envíos por hora por (user, email). Evita spam.
 */
export async function isRateLimited(args: {
  userId: string;
  email: string;
}): Promise<boolean> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await sb
    .from("email_verifications")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", args.userId)
    .eq("email", args.email.toLowerCase().trim())
    .gte("created_at", since);
  return (count ?? 0) >= RATE_MAX_REQUESTS;
}

export async function createVerification(args: {
  userId: string;
  email: string;
  code: string;
}): Promise<void> {
  const sb = createAdminClient();
  const expiresAt = new Date(Date.now() + EXPIRES_MIN * 60_000).toISOString();
  const code_hash = await hashCode(args.code);
  await sb.from("email_verifications").insert({
    user_id: args.userId,
    email: args.email.toLowerCase().trim(),
    code_hash,
    expires_at: expiresAt,
  });
}

/**
 * Valida el código contra el verification activo más reciente para
 * (user, email). Si OK: marca used=true y devuelve { ok: true }.
 * Si falla: incrementa attempts, devuelve { ok: false }.
 */
export async function consumeVerification(args: {
  userId: string;
  email: string;
  code: string;
}): Promise<
  | { ok: true }
  | { ok: false; reason: "no_pending" | "expired" | "too_many" | "wrong_code" }
> {
  const sb = createAdminClient();
  const emailLc = args.email.toLowerCase().trim();

  const { data: row } = await sb
    .from("email_verifications")
    .select("*")
    .eq("user_id", args.userId)
    .eq("email", emailLc)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, reason: "no_pending" };
  if (new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS)
    return { ok: false, reason: "too_many" };

  const match = await compareCode(args.code, row.code_hash);
  if (!match) {
    await sb
      .from("email_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, reason: "wrong_code" };
  }

  await sb.from("email_verifications").update({ used: true }).eq("id", row.id);
  return { ok: true };
}

export const EMAIL_VERIFY_CONFIG = {
  CODE_LENGTH,
  EXPIRES_MIN,
  MAX_ATTEMPTS,
};
