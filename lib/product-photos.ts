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
