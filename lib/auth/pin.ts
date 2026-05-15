import bcrypt from "bcryptjs";

import { createAdminClient } from "@/lib/supabase/admin";

const SALT_ROUNDS = 12;
const PIN_REGEX = /^\d{4}$/;

const RATE_WINDOW_MIN = 15;
const RATE_MAX_FAILS = 5;

export function isValidPinFormat(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function comparePin(pin: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, hash);
  } catch {
    return false;
  }
}

/**
 * Rate limit del PIN: cuenta fallos en los últimos 15 min para ese email.
 * Si >= 5, está bloqueado y debe usar magic link.
 */
export async function isLockedOut(email: string): Promise<boolean> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await sb
    .from("pin_attempts")
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase().trim())
    .eq("success", false)
    .gte("created_at", since);
  return (count ?? 0) >= RATE_MAX_FAILS;
}

export async function logPinAttempt(email: string, success: boolean) {
  const sb = createAdminClient();
  await sb.from("pin_attempts").insert({
    email: email.toLowerCase().trim(),
    success,
  });
}
