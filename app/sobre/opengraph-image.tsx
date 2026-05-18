import { ImageResponse } from "next/og";

import { loadValizFonts } from "@/lib/og-fonts";

export const runtime = "nodejs";
export const alt = "Sobre Valiz Bitácora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#8b6f47",
  niebla: "#6b6b6b",
  piedra: "#d9d3c7",
};

export default async function Image() {
  const fonts = await loadValizFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: COLORS.fondo,
          color: COLORS.tinta,
          fontFamily: "Newsreader, serif",
          padding: "72px 96px",
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
            fontFamily: "Manrope, sans-serif", fontWeight: 600,
            display: "flex",
          }}
        >
          Valiz Bitácora · Sobre
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.02,
              letterSpacing: "-0.022em",
              display: "flex",
            }}
          >
            Tres vidas del objeto.
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 30,
              fontStyle: "italic",
              color: COLORS.cuero,
              display: "flex",
              maxWidth: 920,
            }}
          >
            La que el cuero ya tuvo, la que pasa en taller, la que viene
            contigo.
          </div>
        </div>

        <div
          style={{
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COLORS.tinta,
            borderTop: `1px solid ${COLORS.piedra}`,
            paddingTop: 18,
            fontFamily: "Manrope, sans-serif", fontWeight: 600,
            display: "flex",
          }}
        >
          bitacora.valiz.cl
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
