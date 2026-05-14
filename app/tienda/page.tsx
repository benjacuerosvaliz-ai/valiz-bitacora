import type { Metadata } from "next";

import Sala, { type SalaFamily } from "@/components/tienda/sala";
import { createStaticClient } from "@/lib/supabase/static";

export const metadata: Metadata = {
  title: "Tienda · Valiz Bitácora",
  description: "Entra al espacio Valiz — un mueble por familia, los objetos colgados.",
};

export const revalidate = 300;

// Familias con foto de producto representativa (se va completando a medida
// que tengamos fotos por familia). El resto muestra placeholder vacío en su
// mueble — la estación sigue clickeable para entrar a la página editorial.
const FAMILY_PRODUCT_PHOTO: Record<string, string> = {
  "mochila-alforja":
    "/images/productos/mochila-alforja/MA-G-CRU/01-front.webp",
};

export default async function TiendaPage() {
  const sb = createStaticClient();
  const { data } = await sb
    .from("familias")
    .select("slug, name, display_order, hours_per_unit")
    .order("display_order");

  const families: SalaFamily[] = (data ?? []).map((f) => ({
    slug: f.slug as string,
    name: f.name as string,
    hoursPerUnit: f.hours_per_unit ? Number(f.hours_per_unit) : null,
    productPhoto: FAMILY_PRODUCT_PHOTO[f.slug as string] ?? null,
  }));

  return <Sala families={families} />;
}
