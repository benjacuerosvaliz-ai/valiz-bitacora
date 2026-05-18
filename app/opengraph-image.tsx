import { ImageResponse } from "next/og";

import { loadValizFonts } from "@/lib/og-fonts";

export const runtime = "nodejs";
export const alt = "Valiz Bitácora — la marca chilena de cuero artesanal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#8b6f47",
  niebla: "#6b6b6b",
  piedra: "#d9d3c7",
};

/**
 * OG image para la home / cuando alguien comparte bitacora.valiz.cl.
 * Es la cara de marca: cream, tipografía Newsreader prominente,
 * frase central del manifesto y sello inferior.
 */
export default async function Image() {
  const fonts = await loadValizFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: COLORS.fondo,
          color: COLORS.tinta,
          fontFamily: "Newsreader, serif",
          padding: "80px 96px",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Tag marca */}
        <div
          style={{
            fontSize: 18,
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

        {/* Manifesto central */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 96,
              lineHeight: 0.98,
              letterSpacing: "-0.028em",
              color: COLORS.tinta,
              fontFamily: "Newsreader, serif",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Cada Valiz</span>
            <span>tiene tres vidas.</span>
          </div>
          <div
            style={{
              fontSize: 30,
              fontStyle: "italic",
              fontFamily: "Newsreader, serif",
              color: COLORS.cuero,
              lineHeight: 1.35,
              maxWidth: 880,
              display: "flex",
            }}
          >
            La que el cuero ya tuvo, la que pasa en taller, la que viene
            contigo.
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${COLORS.piedra}`,
            paddingTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: COLORS.tinta,
              fontFamily: "Manrope, sans-serif",
              fontWeight: 600,
              display: "flex",
            }}
          >
            bitacora.valiz.cl
          </div>
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: COLORS.niebla,
              fontFamily: "Manrope, sans-serif",
              fontWeight: 600,
              display: "flex",
            }}
          >
            Cuero artesano · Manos chilenas · Since 2018
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
