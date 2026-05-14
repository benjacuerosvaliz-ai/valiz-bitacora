import type { Metadata } from "next";

import Sala, {
  type SalaShelving,
  type SalaVariant,
} from "@/components/tienda/sala";
import { createStaticClient } from "@/lib/supabase/static";

export const metadata: Metadata = {
  title: "Tienda · Valiz Bitácora",
  description: "Entra al espacio Valiz — los objetos en sus muebles.",
};

export const revalidate = 300;

// Manifest de fotos por SKU. Se va completando a medida que entran fotos
// optimizadas a /public/images/productos/<slug>/<sku>/01-front.webp
const KNOWN_FRONT_PHOTOS: Record<string, string> = {
  "MA-G-CRU": "/images/productos/mochila-alforja/MA-G-CRU/01-front.webp",
  "MA-G-MIEL": "/images/productos/mochila-alforja/MA-G-MIEL/01-front.webp",
  "MA-G-NE": "/images/productos/mochila-alforja/MA-G-NE/01-front.webp",
};

// Qué shelving va en qué pared. Por ahora las 3 alforjas en 3 paredes; la
// 4a pared queda libre para futura iteración (acessorios colgando, cuadros
// con historias, La Leo, etc.).
const SHELVING_LAYOUT: { slug: string; wall: SalaShelving["wall"] }[] = [
  { slug: "mochila-alforja", wall: "N" },
  { slug: "mochila-alforja-chica", wall: "E" },
  { slug: "mochila-alforja-mama", wall: "W" },
];

export default async function TiendaPage() {
  const sb = createStaticClient();

  const slugs = SHELVING_LAYOUT.map((s) => s.slug);

  const [familiasRes, productosRes] = await Promise.all([
    sb
      .from("familias")
      .select("id, slug, name")
      .in("slug", slugs),
    sb
      .from("productos")
      .select("sku, color_valiz, familia_id, status")
      .eq("status", "active"),
  ]);

  const familias = familiasRes.data ?? [];
  const productos = productosRes.data ?? [];

  const shelvings: SalaShelving[] = SHELVING_LAYOUT.map(({ slug, wall }) => {
    const familia = familias.find((f) => f.slug === slug);
    if (!familia) {
      return {
        slug,
        name: slug,
        variants: [],
        wall,
      };
    }
    const variants: SalaVariant[] = productos
      .filter((p) => p.familia_id === familia.id)
      .slice(0, 20) // máximo 20 cubbies (5×4)
      .map((p) => ({
        sku: p.sku as string,
        colorValiz: (p.color_valiz as string | null) ?? null,
        photoUrl: KNOWN_FRONT_PHOTOS[p.sku as string] ?? null,
      }));
    return {
      slug,
      name: familia.name as string,
      variants,
      wall,
    };
  });

  return <Sala shelvings={shelvings} />;
}
