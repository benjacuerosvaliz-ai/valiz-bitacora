import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createStaticClient } from "@/lib/supabase/static";

export const runtime = "nodejs";
export const alt = "Pieza · Valiz Bitácora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#8b6f47",
  niebla: "#6b6b6b",
  piedra: "#d9d3c7",
};

type ProductoRow = {
  sku: string;
  color_valiz: string | null;
  sales_total: number | null;
  tallerista: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

async function getFirstProductPhoto(familySlug: string): Promise<string | null> {
  const base = join(process.cwd(), "public", "images", "productos", familySlug);
  try {
    const fs = await import("node:fs/promises");
    const skuDirs = await fs.readdir(base);
    for (const sku of skuDirs) {
      const front = join(base, sku, "01-front.webp");
      try {
        const buf = await readFile(front);
        return `data:image/webp;base64,${buf.toString("base64")}`;
      } catch {
        // siguiente
      }
    }
  } catch {
    // sin fotos locales
  }
  return null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = createStaticClient();
  const { data: familia } = await sb
    .from("familias")
    .select("id, name, description, hours_per_unit")
    .eq("slug", slug)
    .maybeSingle();

  const { data: productosRaw } = familia
    ? await sb
        .from("productos")
        .select("sku, color_valiz, sales_total, tallerista:talleristas(name)")
        .eq("status", "active")
        .eq("familia_id", familia.id)
    : { data: [] };
  const productos = (productosRaw ?? []) as ProductoRow[];

  // Tallerista líder
  const counts = new Map<string, number>();
  for (const p of productos) {
    const t = pickOne(p.tallerista);
    if (t) counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
  }
  const lider = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const horasPorUnidad = Number(familia?.hours_per_unit ?? 0);
  const colores = productos.length;

  const photo = await getFirstProductPhoto(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: COLORS.fondo,
          color: COLORS.tinta,
          fontFamily: "serif",
        }}
      >
        {/* Foto del producto (mitad izquierda) */}
        {photo && (
          <div
            style={{
              width: "50%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ece6dc",
            }}
          >
            <img
              src={photo}
              alt=""
              width={520}
              height={520}
              style={{ objectFit: "cover", width: 520, height: 520 }}
            />
          </div>
        )}

        {/* Contenido derecho */}
        <div
          style={{
            width: photo ? "50%" : "100%",
            height: "100%",
            padding: "56px 64px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLORS.niebla,
              fontFamily: "sans-serif",
              display: "flex",
            }}
          >
            Valiz Bitácora · La pieza
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 78,
                lineHeight: 1.02,
                letterSpacing: "-0.022em",
                color: COLORS.tinta,
                display: "flex",
              }}
            >
              {familia?.name ?? "Pieza"}
            </div>
            {lider && horasPorUnidad > 0 && (
              <div
                style={{
                  marginTop: 28,
                  fontSize: 26,
                  fontStyle: "italic",
                  color: COLORS.cuero,
                  display: "flex",
                }}
              >
                Hecha en el taller de {lider} · {horasPorUnidad}{" "}
                {horasPorUnidad === 1 ? "hora" : "horas"} por unidad
              </div>
            )}
            {colores > 0 && (
              <div
                style={{
                  marginTop: 24,
                  fontSize: 22,
                  color: COLORS.niebla,
                  display: "flex",
                }}
              >
                {colores} {colores === 1 ? "color disponible" : "colores disponibles"}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLORS.tinta,
              borderTop: `1px solid ${COLORS.piedra}`,
              paddingTop: 18,
              fontFamily: "sans-serif",
              display: "flex",
            }}
          >
            bitacora.valiz.cl
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
