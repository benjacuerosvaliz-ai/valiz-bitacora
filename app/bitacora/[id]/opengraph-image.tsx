import { ImageResponse } from "next/og";

import { createStaticClient } from "@/lib/supabase/static";

export const runtime = "nodejs";
export const alt = "Bitácora · Valiz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#8b6f47",
  niebla: "#6b6b6b",
  piedra: "#d9d3c7",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = createStaticClient();
  const { data: b } = await sb
    .from("bitacora_entries")
    .select("id, user_id, sku, foto_url, lugar, texto, created_at")
    .eq("id", id)
    .eq("invalidated", false)
    .maybeSingle();

  if (!b) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: COLORS.fondo,
            color: COLORS.tinta,
            fontSize: 48,
            fontFamily: "serif",
          }}
        >
          Bitácora · Valiz
        </div>
      ),
      { ...size },
    );
  }

  const [authorRes, prodRes] = await Promise.all([
    sb
      .from("user_profiles_public")
      .select("display_name, handle")
      .eq("id", b.user_id)
      .maybeSingle(),
    b.sku
      ? sb
          .from("productos")
          .select("color_valiz, familias(name)")
          .eq("sku", b.sku)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const author = authorRes.data as
    | { display_name: string | null; handle: string | null }
    | null;
  const prod = prodRes.data as
    | {
        color_valiz: string | null;
        familias: { name: string } | { name: string }[] | null;
      }
    | null;
  const familia = prod
    ? Array.isArray(prod.familias)
      ? prod.familias[0]
      : prod.familias
    : null;

  const authorLabel = author?.display_name ?? author?.handle ?? "Anónimo";
  const textoCorto = b.texto
    ? b.texto.length > 180
      ? b.texto.slice(0, 178) + "…"
      : b.texto
    : null;

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
        {/* Foto izquierda */}
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
            src={b.foto_url}
            alt=""
            width={600}
            height={600}
            style={{ objectFit: "cover", width: 600, height: 600 }}
          />
        </div>

        {/* Texto derecha */}
        <div
          style={{
            width: "50%",
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
            Valiz Bitácora · Bitácora
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {familia && (
              <div
                style={{
                  fontSize: 20,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.cuero,
                  marginBottom: 18,
                  fontFamily: "sans-serif",
                  display: "flex",
                }}
              >
                {familia.name}
                {prod?.color_valiz && ` · ${prod.color_valiz}`}
              </div>
            )}
            <div
              style={{
                fontSize: 68,
                lineHeight: 1.04,
                letterSpacing: "-0.022em",
                display: "flex",
              }}
            >
              {b.lugar ?? "Sin lugar"}
            </div>
            {textoCorto && (
              <div
                style={{
                  marginTop: 24,
                  fontSize: 22,
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  color: COLORS.niebla,
                  display: "flex",
                }}
              >
                {textoCorto}
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
              justifyContent: "space-between",
            }}
          >
            <span>{authorLabel}</span>
            <span style={{ color: COLORS.niebla }}>
              {formatDate(b.created_at)}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
