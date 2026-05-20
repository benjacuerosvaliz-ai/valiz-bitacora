import fs from "node:fs";
import path from "node:path";

const PHOTOS_BASE = path.join(process.cwd(), "public", "images", "productos");

/**
 * Escanea /public/images/productos/<familia-slug>/<sku>/01-front.webp y
 * devuelve un Map sku → URL pública. Server-only (usa node:fs).
 *
 * Cacheable a nivel proceso porque la imagen se materializa en build/deploy.
 */
let cache: Map<string, string> | null = null;

export function getPhotoBySku(): Map<string, string> {
  if (cache) return cache;
  const out = new Map<string, string>();
  if (!fs.existsSync(PHOTOS_BASE)) {
    cache = out;
    return out;
  }
  for (const familySlug of fs.readdirSync(PHOTOS_BASE)) {
    const famDir = path.join(PHOTOS_BASE, familySlug);
    try {
      if (!fs.statSync(famDir).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const sku of fs.readdirSync(famDir)) {
      const skuDir = path.join(famDir, sku);
      try {
        if (!fs.statSync(skuDir).isDirectory()) continue;
      } catch {
        continue;
      }
      const front = path.join(skuDir, "01-front.webp");
      if (fs.existsSync(front)) {
        out.set(sku, `/images/productos/${familySlug}/${sku}/01-front.webp`);
      }
    }
  }
  cache = out;
  return out;
}

/**
 * Mapping prefix SKU → familia slug. El SKU sigue el patrón
 * {FAMILIA-PREFIX}-{COLOR}. Si un SKU vendido no está en el catálogo
 * (variantes viejas/discontinuadas), usamos esta tabla para detectar
 * al menos su FAMILIA y mostrar la foto de un representante en blanco
 * y negro (para indicar "pieza histórica · color no identificado").
 */
const FAMILY_PREFIXES: Array<[RegExp, string]> = [
  // Orden importa: más específicos primero
  [/^MAM-G-/, "mochila-alforja-mama"],
  [/^MAC-G-/, "mochila-alforja-chica"],
  [/^MA-G-/, "mochila-alforja"],
  [/^M-C-/, "mochila-chica"],
  [/^B-G-/, "banano-grande"],
  [/^B-M-/, "banano-midi"],
  [/^B-C-/, "banano-chico"],
  [/^BI-G-/, "billetera-grande"],
  [/^CT-G-/, "cartera-zarga-grande"],
  [/^C-C-/, "cinturon-chico"],
  [/^T-S-/, "tabaquera"],
  [/^T-G-/, "tabaquera"],
  [/^T-/, "tabaquera"],
  [/^PP-/, "porta-pasaporte"],
  [/^TJ-/, "tarjetero"],
  [/^S-/, "strap"],
];

export type PhotoResult = {
  foto: string;
  /** true si es foto fallback de familia (B&N), no la del SKU exacto */
  esHistorico: boolean;
  familiaSlug: string;
} | null;

let familiaFallbackCache: Map<string, string> | null = null;

function buildFamiliaFallbackCache(): Map<string, string> {
  if (familiaFallbackCache) return familiaFallbackCache;
  const out = new Map<string, string>();
  const allPhotos = getPhotoBySku();
  for (const [, foto] of allPhotos) {
    const match = foto.match(/\/productos\/([^/]+)\//);
    if (!match) continue;
    const familia = match[1];
    if (!out.has(familia)) {
      out.set(familia, foto);
    }
  }
  familiaFallbackCache = out;
  return out;
}

/**
 * Dado un SKU, devuelve:
 *   - foto exacta del SKU si existe en catálogo (esHistorico: false)
 *   - foto fallback de la familia + esHistorico: true si el SKU no
 *     está catalogado pero se reconoce el prefix
 *   - null si no se reconoce nada (SKUs numéricos, vouchers, etc.)
 */
export function resolveProductPhoto(
  sku: string | null | undefined,
): PhotoResult {
  if (!sku) return null;

  // 1. SKU exacto
  const exact = getPhotoBySku().get(sku);
  if (exact) {
    const match = exact.match(/\/productos\/([^/]+)\//);
    return {
      foto: exact,
      esHistorico: false,
      familiaSlug: match?.[1] ?? "",
    };
  }

  // 2. Detectar familia por prefix
  for (const [regex, familiaSlug] of FAMILY_PREFIXES) {
    if (regex.test(sku)) {
      const fallback = buildFamiliaFallbackCache().get(familiaSlug);
      if (fallback) {
        return { foto: fallback, esHistorico: true, familiaSlug };
      }
    }
  }

  // 3. No reconocido (numérico, voucher, etc.)
  return null;
}

/**
 * True si el SKU es un voucher / tarjeta regalo / ID misceláneo de
 * Shopify (numérico), NO un producto físico. Útil para filtrar el
 * equipaje antes de mostrarlo.
 */
export function isNonProductSku(sku: string | null | undefined): boolean {
  if (!sku) return true;
  if (/^\d+$/.test(sku)) return true;
  return false;
}
