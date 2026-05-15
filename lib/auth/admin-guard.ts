/**
 * Lista de emails con acceso al admin. Por ahora hardcoded; mover a env
 * var ADMIN_EMAILS (CSV) si crece.
 */
const ADMIN_EMAILS = new Set<string>([
  "benja.cuerosvaliz@gmail.com",
]);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase().trim());
}
