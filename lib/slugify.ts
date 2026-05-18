/**
 * Normaliza un string a slug URL-safe.
 * "César" → "cesar", "Roberto Pérez" → "roberto-perez".
 *
 * Usado para derivar slugs de talleristas desde su nombre sin tener
 * que agregar una columna `slug` a la tabla.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita marcas diacríticas (acentos)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // solo alfanum + espacios + guiones
    .replace(/\s+/g, "-") // espacios → guion
    .replace(/-+/g, "-"); // colapsa guiones múltiples
}
