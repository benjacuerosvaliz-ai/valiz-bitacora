import { ImageResponse } from "next/og";

import { loadValizFonts } from "@/lib/og-fonts";
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

  const fonts = await loadValizFonts();

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
            fontSize: 56,
            fontFamily: "Newsreader, serif",
          }}
        >
          Bitácora · Valiz
        </div>
      ),
      { ...size, fonts },
    );
  }

  const [authorRes, prodRes] = await Promise.all([
    sb
      .from("user_profiles_public")
      .select("display_name, handle, avatar_url")
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
    | { display_name: string | null; handle: string | null; avatar_url: string | null }
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
    ? b.texto.length > 160
      ? b.texto.slice(0, 158) + "…"
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
          fontFamily: "Newsreader, serif",
        }}
      >
        {/* Foto bitácora (mitad izquierda) */}
        <div
          style={{
            width: 600,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ece6dc",
            position: "relative",
          }}
        >
          <img
            src={b.foto_url}
            alt=""
            width={600}
            height={630}
            style={{
              objectFit: "cover",
              width: 600,
              height: 630,
            }}
          />
        </div>

        {/* Panel derecho */}
        <div
          style={{
            flex: 1,
            padding: "60px 60px 60px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header marca + familia */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: COLORS.cuero,
                fontFamily: "Manrope, sans-serif",
                fontWeight: 600,
                display: "flex",
              }}
            >
              Valiz · Bitácora
            </div>
            {familia && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 18,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: COLORS.niebla,
                  fontFamily: "Manrope, sans-serif",
                  fontWeight: 600,
                  display: "flex",
                }}
              >
                {familia.name}
                {prod?.color_valiz && ` · ${prod.color_valiz}`}
              </div>
            )}
          </div>

          {/* Lugar grande + texto */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 68,
                lineHeight: 1.02,
                letterSpacing: "-0.022em",
                color: COLORS.tinta,
                display: "flex",
              }}
            >
              {b.lugar ?? "Sin lugar"}
            </div>
            {textoCorto && (
              <div
                style={{
                  marginTop: 22,
                  fontSize: 22,
                  fontStyle: "italic",
                  fontFamily: "Newsreader, serif",
                  lineHeight: 1.45,
                  color: COLORS.tinta,
                  maxWidth: 480,
                  display: "flex",
                }}
              >
                {textoCorto}
              </div>
            )}
          </div>

          {/* Footer: avatar + autor + fecha */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderTop: `1px solid ${COLORS.piedra}`,
              paddingTop: 22,
            }}
          >
            {author?.avatar_url ? (
              <img
                src={author.avatar_url}
                alt=""
                width={44}
                height={44}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `1px solid ${COLORS.piedra}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: COLORS.cuero,
                  color: COLORS.fondo,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontFamily: "Newsreader, serif",
                }}
              >
                {authorLabel.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontFamily: "Newsreader, serif",
                  color: COLORS.tinta,
                  display: "flex",
                }}
              >
                {authorLabel}
              </span>
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.niebla,
                  fontFamily: "Manrope, sans-serif",
                  fontWeight: 600,
                  marginTop: 2,
                  display: "flex",
                }}
              >
                {formatDate(b.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
