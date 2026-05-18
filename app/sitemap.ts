import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slugify";
import { createStaticClient } from "@/lib/supabase/static";

// Re-genera cada 1h. Suficiente: nuevas bitácoras/perfiles/concursos
// se indexan dentro de la hora.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = createStaticClient();
  const now = new Date();

  // Rutas estáticas
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/talleristas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/bitacora`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/bitacora/mapa`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/colecciones`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/concursos`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // /tienda escondida hasta etapa 2 — no se indexa
  ];

  // Talleristas individuales
  const { data: talleristas } = await sb.from("talleristas").select("name, created_at");
  const talleristaUrls: MetadataRoute.Sitemap = ((talleristas ?? []) as {
    name: string;
    created_at: string;
  }[]).map((t) => ({
    url: `${SITE_URL}/talleristas/${slugify(t.name)}`,
    lastModified: new Date(t.created_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Piezas (familias)
  const { data: familias } = await sb.from("familias").select("slug, updated_at, created_at");
  const familiaUrls: MetadataRoute.Sitemap = ((familias ?? []) as {
    slug: string;
    updated_at?: string | null;
    created_at?: string | null;
  }[]).map((f) => ({
    url: `${SITE_URL}/piezas/${f.slug}`,
    lastModified: f.updated_at ? new Date(f.updated_at) : f.created_at ? new Date(f.created_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Bitácoras (no invalidadas)
  const { data: bits } = await sb
    .from("bitacora_entries")
    .select("id, created_at")
    .eq("invalidated", false)
    .order("created_at", { ascending: false })
    .limit(1000);
  const bitUrls: MetadataRoute.Sitemap = ((bits ?? []) as {
    id: string;
    created_at: string;
  }[]).map((b) => ({
    url: `${SITE_URL}/bitacora/${b.id}`,
    lastModified: new Date(b.created_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Perfiles públicos
  const { data: profiles } = await sb
    .from("user_profiles_public")
    .select("handle, created_at")
    .not("handle", "is", null)
    .limit(1000);
  const profileUrls: MetadataRoute.Sitemap = ((profiles ?? []) as {
    handle: string;
    created_at: string;
  }[]).map((p) => ({
    url: `${SITE_URL}/u/${p.handle}`,
    lastModified: new Date(p.created_at),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  // Concursos
  const { data: concursos } = await sb
    .from("concursos")
    .select("slug, created_at, ganador_anunciado_at");
  const concursoUrls: MetadataRoute.Sitemap = ((concursos ?? []) as {
    slug: string;
    created_at: string;
    ganador_anunciado_at: string | null;
  }[]).map((c) => ({
    url: `${SITE_URL}/concursos/${c.slug}`,
    lastModified: new Date(c.ganador_anunciado_at ?? c.created_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticUrls,
    ...talleristaUrls,
    ...familiaUrls,
    ...bitUrls,
    ...profileUrls,
    ...concursoUrls,
  ];
}
