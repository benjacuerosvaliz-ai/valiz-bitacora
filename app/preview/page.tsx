import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";

import { getPhotoBySku } from "@/lib/product-photos";
import { createStaticClient } from "@/lib/supabase/static";

import { Preview3D } from "./preview-3d";

export const metadata: Metadata = {
  title: "Preview · Valiz",
  description:
    "Vista experimental de la bitácora — productos flotando, scroll-driven.",
  robots: { index: false, follow: false },
};

export const revalidate = 300;

/**
 * Página /preview — sandbox para probar el formato landing 3D antes de
 * eventualmente reemplazar la home. NO está en sitemap ni indexable
 * (robots noindex), porque es un experimento.
 *
 * Carga los 5 productos top sellers con foto disponible y los pasa al
 * cliente Preview3D que hace el scroll-driven pseudo-3D.
 */
type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  sales_total: number | null;
  familia_id: string | null;
  shopify_handle: string | null;
};

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

export default async function PreviewPage() {
  const sb = createStaticClient();
  const [prodsRes, famsRes] = await Promise.all([
    sb
      .from("productos")
      .select("sku, color_valiz, sales_total, familia_id, shopify_handle")
      .eq("status", "active")
      .order("sales_total", { ascending: false })
      .limit(40),
    sb.from("familias").select("id, slug, name, hours_per_unit"),
  ]);
  const productos = (prodsRes.data ?? []) as ProductoRow[];
  const familias = (famsRes.data ?? []) as FamiliaRow[];
  const famById = new Map(familias.map((f) => [f.id, f]));
  const photoBySku = getPhotoBySku();

  // Tomar primer producto con foto por cada familia distinta (variedad)
  // hasta llegar a 5
  const seen = new Set<string>();
  const heroes: {
    sku: string;
    photo: string;
    familiaName: string;
    familiaSlug: string;
    colorValiz: string | null;
    horas: number;
    shopifyHandle: string | null;
  }[] = [];
  for (const p of productos) {
    if (heroes.length >= 5) break;
    if (!p.familia_id) continue;
    if (seen.has(p.familia_id)) continue;
    const photo = photoBySku.get(p.sku);
    if (!photo) continue;
    // Verificar que el archivo existe en disco (defensivo)
    const localPath = path.join(process.cwd(), "public", photo);
    if (!existsSync(localPath)) continue;
    const fam = famById.get(p.familia_id);
    if (!fam) continue;
    seen.add(p.familia_id);
    heroes.push({
      sku: p.sku,
      photo,
      familiaName: fam.name,
      familiaSlug: fam.slug,
      colorValiz: p.color_valiz,
      horas: Number(fam.hours_per_unit ?? 0),
      shopifyHandle: p.shopify_handle,
    });
  }

  return <Preview3D heroes={heroes} />;
}
