import { Resend } from "resend";

/**
 * Cliente Resend lazy. Solo se inicializa cuando se llama, así si no
 * hay RESEND_API_KEY los routes no fallan al build.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY no configurada — emails desactivados.");
    return null;
  }
  return new Resend(key);
}

export const EMAIL_FROM =
  process.env.RESEND_FROM ?? "Valiz Bitácora <nocontestar@bitacora.valiz.cl>";

export const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL ?? "benja.cuerosvaliz@gmail.com";
