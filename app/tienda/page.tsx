import fs from "node:fs";
import path from "node:path";

import type { Metadata } from "next";

import Sala, {
  type SalaShelving,
  type SalaVariant,
} from "@/components/tienda/sala";
import { createStaticClient } from "@/lib/supabase/static";

export const metadata: Metadata = {
  title: "Tienda · Valiz Bitácora",
  description: "Entra al espacio Valiz — los objetos en sus muebles.",
  // Escondida hasta etapa 2: no indexar, no listar links públicos
  robots: { index: false, follow: false },
};

export const revalidate = 300;

const PHOTOS_BASE = path.join(process.cwd(), "public", "images", "productos");

// Escanea /public/images/productos/<family-slug>/<sku>/01-front.webp y
// devuelve un map family-slug → map sku → url pública.
function scanPhotos(): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  if (!fs.existsSync(PHOTOS_BASE)) return out;

  for (const familySlug of fs.readdirSync(PHOTOS_BASE)) {
    const famDir = path.join(PHOTOS_BASE, familySlug);
    try {
      if (!fs.statSync(famDir).isDirectory()) continue;
    } catch {
      continue;
    }
    const skuMap = new Map<string, string>();
    for (const sku of fs.readdirSync(famDir)) {
      const skuDir = path.join(famDir, sku);
      try {
        if (!fs.statSync(skuDir).isDirectory()) continue;
      } catch {
        continue;
      }
      const front = path.join(skuDir, "01-front.webp");
      if (fs.existsSync(front)) {
        skuMap.set(
          sku,
          `/images/productos/${familySlug}/${sku}/01-front.webp`,
        );
      }
    }
    if (skuMap.size > 0) out.set(familySlug, skuMap);
  }
  return out;
}

// Round-robin entre las 4 paredes para no saturar una sola.
const WALLS: Array<SalaShelving["wall"]> = ["N", "E", "S", "W"];

export default async function TiendaPage() {
  const photos = scanPhotos();
  const familiesWithPhotos = Array.from(photos.keys());

  if (familiesWithPhotos.length === 0) {
    return <Sala shelvings={[]} />;
  }

  const sb = createStaticClient();
  const [familiasRes, productosRes] = await Promise.all([
    sb
      .from("familias")
      .select("id, slug, name")
      .in("slug", familiesWithPhotos),
    sb
      .from("productos")
      .select("sku, color_valiz, familia_id, status, precio, shopify_handle")
      .eq("status", "active"),
  ]);

  const familias = familiasRes.data ?? [];
  const productos = productosRes.data ?? [];

  // Orden alfabético estable; después podremos imponer un orden curado.
  const sortedFamilias = familias
    .slice()
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));

  // Pre-cálculo cuántas familias caen en cada pared (round-robin) para
  // que cada shelving sepa su totalInWall y se distribuyan uniformes.
  const wallCounts: Record<SalaShelving["wall"], number> = {
    N: 0,
    E: 0,
    S: 0,
    W: 0,
  };
  for (let i = 0; i < sortedFamilias.length; i++) {
    wallCounts[WALLS[i % 4]]++;
  }
  const wallSlots: Record<SalaShelving["wall"], number> = {
    N: 0,
    E: 0,
    S: 0,
    W: 0,
  };

  const shelvings: SalaShelving[] = sortedFamilias.map((familia, i) => {
    const wall = WALLS[i % 4];
    const slotIndex = wallSlots[wall]++;
    const totalInWall = wallCounts[wall];
    const photoMap = photos.get(String(familia.slug)) ?? new Map();

    const variants: SalaVariant[] = productos
      .filter((p) => p.familia_id === familia.id)
      .map((p) => ({
        sku: p.sku as string,
        colorValiz: (p.color_valiz as string | null) ?? null,
        photoUrl: photoMap.get(p.sku as string) ?? null,
        precio: (p.precio as number | null) ?? null,
        shopifyHandle: (p.shopify_handle as string | null) ?? null,
      }))
      // Solo variantes con foto: no queremos cubbies vacíos
      .filter((v) => v.photoUrl)
      .slice(0, 20); // máximo 20 cubbies (5×4)

    return {
      slug: String(familia.slug),
      name: String(familia.name),
      variants,
      wall,
      slotIndex,
      totalInWall,
    };
  });

  return <Sala shelvings={shelvings} />;
}
