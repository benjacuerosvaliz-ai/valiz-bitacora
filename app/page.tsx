import { getPhotoBySku } from "@/lib/product-photos";
import { createStaticClient } from "@/lib/supabase/static";

import { Home3D } from "./home-3d";

export const revalidate = 300;

/**
 * Home `/` — narrativa Tres Vidas como landing scroll-driven.
 *
 * Vida I (cuero): foto cueros enrollados respirando + pies² rescatados
 * Vida II (taller): Cartera Zarga flotando + horas + talleristas
 * Vida III (bitácora): globo Mapbox con bitácoras reales + CTA puntos
 * Outro: 1000 pts por crear cuenta + misiones + CTAs login/crear
 *
 * El metadata SEO de la home vive en app/layout.tsx (title, OG image
 * /opengraph-image.tsx). Sin metadata overrides acá → usa los defaults.
 */

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  sales_total: number | null;
  familia_id: string | null;
  shopify_handle: string | null;
  p2: number | string | null;
};

type FamiliaRow = {
  id: string;
  slug: string;
  name: string;
  hours_per_unit: number | string | null;
};

type BitacoraRow = {
  id: string;
  user_id: string;
  sku: string | null;
  foto_url: string;
  lat: number | string | null;
  lng: number | string | null;
  lugar: string | null;
  texto: string | null;
};

export type Producto3D = {
  sku: string;
  photo: string;
  familiaName: string;
  familiaSlug: string;
  colorValiz: string | null;
  horasPorUnidad: number;
};

export type Point = {
  id: string;
  lat: number;
  lng: number;
  foto: string;
  lugar: string | null;
  texto: string | null;
  familia: string | null;
  colorValiz: string | null;
};

export type StatsGlobales = {
  piesTotal: number;
  horasTotal: number;
  piezasTotal: number;
  bitacorasTotal: number;
  personasUnicas: number;
  lugaresUnicos: number;
  talleresCount: number;
};

async function resolveProducto(
  sb: ReturnType<typeof createStaticClient>,
  familiaSlug: string,
  photoBySku: Map<string, string>,
): Promise<Producto3D | null> {
  const { data: fam } = await sb
    .from("familias")
    .select("id, slug, name, hours_per_unit")
    .eq("slug", familiaSlug)
    .maybeSingle();
  if (!fam) return null;
  const f = fam as FamiliaRow;
  const { data: prods } = await sb
    .from("productos")
    .select("sku, color_valiz, sales_total, p2, familia_id, shopify_handle")
    .eq("familia_id", f.id)
    .eq("status", "active")
    .order("sales_total", { ascending: false })
    .limit(8);
  for (const p of (prods ?? []) as ProductoRow[]) {
    const photo = photoBySku.get(p.sku);
    if (photo) {
      return {
        sku: p.sku,
        photo,
        familiaName: f.name,
        familiaSlug: f.slug,
        colorValiz: p.color_valiz,
        horasPorUnidad: Number(f.hours_per_unit ?? 0),
      };
    }
  }
  return null;
}

export default async function HomePage() {
  const sb = createStaticClient();
  const photoBySku = getPhotoBySku();

  // Vida I usa la foto de cueros enrollados (no producto). Vida II
  // muestra la Cartera Zarga Grande flotando como pieza terminada.
  const cartera = await resolveProducto(
    sb,
    "cartera-zarga-grande",
    photoBySku,
  );

  // Stats globales
  const [prodsStatsRes, famsRes, bitsRes, talleristasRes] = await Promise.all([
    sb
      .from("productos")
      .select("p2, sales_total, familia_id")
      .eq("status", "active"),
    sb.from("familias").select("id, hours_per_unit"),
    sb
      .from("bitacora_entries")
      .select("id, user_id, sku, foto_url, lat, lng, lugar, texto")
      .eq("invalidated", false),
    sb.from("talleristas").select("id"),
  ]);

  const prodsStats = (prodsStatsRes.data ?? []) as {
    p2: number | string | null;
    sales_total: number | null;
    familia_id: string | null;
  }[];
  const fams = (famsRes.data ?? []) as {
    id: string;
    hours_per_unit: number | string | null;
  }[];
  const bits = (bitsRes.data ?? []) as BitacoraRow[];
  const hoursById = new Map(
    fams.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
  );

  const piezasTotal = prodsStats.reduce(
    (s, p) => s + Number(p.sales_total ?? 0),
    0,
  );
  const piesTotal = Math.round(
    prodsStats.reduce(
      (s, p) => s + Number(p.p2 ?? 0) * Number(p.sales_total ?? 0),
      0,
    ),
  );
  const horasTotal = Math.round(
    prodsStats.reduce(
      (s, p) =>
        s +
        Number(p.sales_total ?? 0) * (hoursById.get(p.familia_id ?? "") ?? 0),
      0,
    ),
  );
  const personasUnicas = new Set(bits.map((b) => b.user_id)).size;
  const lugaresUnicos = new Set(
    bits
      .filter((b) => b.lat !== null && b.lng !== null)
      .map(
        (b) =>
          `${Math.round(Number(b.lat) * 10) / 10},${
            Math.round(Number(b.lng) * 10) / 10
          }`,
      ),
  ).size;

  const stats: StatsGlobales = {
    piesTotal,
    horasTotal,
    piezasTotal,
    bitacorasTotal: bits.filter((b) => b.lat !== null && b.lng !== null).length,
    personasUnicas,
    lugaresUnicos,
    talleresCount: (talleristasRes.data ?? []).length,
  };

  // Puntos para el mapa
  const { data: prodsForMap } = await sb
    .from("productos")
    .select("sku, color_valiz, familia_id");
  const prodBySku = new Map(
    ((prodsForMap ?? []) as {
      sku: string;
      color_valiz: string | null;
      familia_id: string | null;
    }[]).map((p) => [p.sku, p]),
  );
  const { data: famNames } = await sb.from("familias").select("id, name");
  const famNameById = new Map(
    ((famNames ?? []) as { id: string; name: string }[]).map((f) => [
      f.id,
      f.name,
    ]),
  );

  const points: Point[] = bits
    .filter((b) => b.lat !== null && b.lng !== null)
    .map((b) => {
      const p = b.sku ? prodBySku.get(b.sku) : null;
      const fam = p?.familia_id ? famNameById.get(p.familia_id) : null;
      return {
        id: b.id,
        lat: Number(b.lat),
        lng: Number(b.lng),
        foto: b.foto_url,
        lugar: b.lugar,
        texto: b.texto,
        familia: fam ?? null,
        colorValiz: p?.color_valiz ?? null,
      };
    });

  return <Home3D cartera={cartera} stats={stats} points={points} />;
}
