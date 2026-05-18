import { ImageResponse } from "next/og";

import { loadValizFonts } from "@/lib/og-fonts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStaticClient } from "@/lib/supabase/static";

export const runtime = "nodejs";
export const alt = "Perfil · Valiz Bitácora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#8b6f47",
  niebla: "#6b6b6b",
  piedra: "#d9d3c7",
};

const nf = new Intl.NumberFormat("es-CL");

/**
 * OG image cinemático para perfil público.
 *
 * Layout: avatar gigante a la izquierda (440x440) tipo álbum +
 * panel derecho con nombre, handle, ubicación, bio y stats grandes.
 * Pequeño tag "VALIZ BITÁCORA" arriba como marca.
 *
 * Fonts Newsreader (serif) + Manrope (sans) cargadas desde Google Fonts
 * con UA-trick para obtener TTF (next/og no soporta WOFF2).
 */
export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const sb = createStaticClient();
  const { data: profile } = await sb
    .from("user_profiles_public")
    .select("id, handle, display_name, country, city, bio, avatar_url")
    .eq("handle", handle)
    .maybeSingle();

  // Stats abreviadas (mismo cálculo que la página)
  let piezasCount = 0;
  let horasTotal = 0;
  let piesTotal = 0;
  if (profile) {
    const admin = createAdminClient();
    const { data: pp } = await admin
      .from("user_profiles")
      .select("email, secondary_emails")
      .eq("id", profile.id)
      .maybeSingle();
    const allEmails: string[] = [
      pp?.email,
      ...((pp?.secondary_emails as string[] | null) ?? []),
    ].filter(Boolean) as string[];

    const [ordersRes, manualesRes] = await Promise.all([
      allEmails.length > 0
        ? admin
            .from("orders")
            .select("order_items(sku)")
            .in("email", allEmails)
        : Promise.resolve({ data: [] }),
      admin
        .from("compras_manuales")
        .select("sku")
        .eq("user_id", profile.id)
        .eq("verified", true),
    ]);

    const skus: string[] = [];
    for (const o of (ordersRes.data ?? []) as {
      order_items: { sku: string | null }[] | null;
    }[]) {
      for (const i of o.order_items ?? []) {
        if (i.sku) skus.push(i.sku);
      }
    }
    for (const m of (manualesRes.data ?? []) as { sku: string | null }[]) {
      if (m.sku) skus.push(m.sku);
    }

    if (skus.length > 0) {
      const [pRes, fRes] = await Promise.all([
        sb.from("productos").select("sku, p2, familia_id").in("sku", skus),
        sb.from("familias").select("id, hours_per_unit"),
      ]);
      const productos = (pRes.data ?? []) as {
        sku: string;
        p2: number | string | null;
        familia_id: string | null;
      }[];
      const familias = (fRes.data ?? []) as {
        id: string;
        hours_per_unit: number | string | null;
      }[];
      const horasById = new Map(
        familias.map((f) => [f.id, Number(f.hours_per_unit ?? 0)]),
      );
      const prodBySku = new Map(productos.map((p) => [p.sku, p]));
      piezasCount = skus.length;
      for (const sku of skus) {
        const p = prodBySku.get(sku);
        if (!p) continue;
        piesTotal += Number(p.p2 ?? 0);
        horasTotal += p.familia_id ? (horasById.get(p.familia_id) ?? 0) : 0;
      }
    }
  }

  const nombre = profile?.display_name ?? profile?.handle ?? "Usuario";
  const inicial = nombre.trim().charAt(0).toUpperCase() || "V";
  const ubicacion =
    profile && (profile.city || profile.country)
      ? [profile.city, profile.country].filter(Boolean).join(", ")
      : null;
  const bio =
    profile?.bio && profile.bio.length > 130
      ? profile.bio.slice(0, 128) + "…"
      : profile?.bio;

  const fonts = await loadValizFonts();

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
          position: "relative",
        }}
      >
        {/* Tag superior izquierda como marca */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 48,
            fontSize: 16,
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

        {/* Avatar — protagonista, ~440px */}
        <div
          style={{
            width: 520,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 60,
          }}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              width={440}
              height={440}
              style={{
                width: 440,
                height: 440,
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${COLORS.piedra}`,
                boxShadow: "0 20px 60px rgba(26,26,26,0.18)",
              }}
            />
          ) : (
            <div
              style={{
                width: 440,
                height: 440,
                borderRadius: "50%",
                background: COLORS.cuero,
                color: COLORS.fondo,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 240,
                fontFamily: "Newsreader, serif",
                boxShadow: "0 20px 60px rgba(26,26,26,0.18)",
              }}
            >
              {inicial}
            </div>
          )}
        </div>

        {/* Panel derecho: nombre, info, stats */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 60px 60px 20px",
            gap: 0,
          }}
        >
          <div
            style={{
              fontSize: 17,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLORS.niebla,
              fontFamily: "Manrope, sans-serif",
              fontWeight: 600,
              display: "flex",
            }}
          >
            @{profile?.handle ?? handle}
            {ubicacion && (
              <span style={{ color: COLORS.cuero, marginLeft: 14 }}>
                · {ubicacion}
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: nombre.length > 18 ? 64 : 80,
              lineHeight: 1.0,
              letterSpacing: "-0.022em",
              color: COLORS.tinta,
              display: "flex",
            }}
          >
            {nombre}
          </div>

          {bio && (
            <div
              style={{
                marginTop: 22,
                fontSize: 22,
                fontStyle: "italic",
                fontFamily: "Newsreader, serif",
                lineHeight: 1.4,
                color: COLORS.tinta,
                maxWidth: 580,
                display: "flex",
              }}
            >
              {bio}
            </div>
          )}

          {/* Stats grid grande */}
          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 48,
              borderTop: `1px solid ${COLORS.piedra}`,
              paddingTop: 26,
            }}
          >
            <Stat label="Piezas" value={nf.format(piezasCount)} />
            <Stat label="Horas" value={nf.format(horasTotal)} />
            <Stat label="Pies²" value={nf.format(piesTotal)} />
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 60,
            fontSize: 15,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: COLORS.niebla,
            fontFamily: "Manrope, sans-serif",
            fontWeight: 600,
            display: "flex",
          }}
        >
          bitacora.valiz.cl/u/{profile?.handle ?? handle}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 13,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: COLORS.cuero,
          fontFamily: "Manrope, sans-serif",
          fontWeight: 600,
          display: "flex",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 54,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          color: COLORS.tinta,
          fontFamily: "Newsreader, serif",
          display: "flex",
        }}
      >
        {value}
      </div>
    </div>
  );
}
