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
 * OG image centrado vertical — aguanta crops de WhatsApp y se ve
 * balanceado en cualquier red social.
 *
 * Composición:
 *  - Top tag VALIZ · BITÁCORA en cuero
 *  - Avatar circular grande centrado (260px)
 *  - Nombre serif gigante centrado
 *  - @handle · ubicación
 *  - Bio italic
 *  - 3 stats grandes inline horizontal centradas
 *  - Footer URL
 *
 * Todo se queda en el centro del 1200x630 — si WhatsApp recorta a
 * cuadrado, sigue viendo lo esencial (avatar + nombre + stats).
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
  horasTotal = Math.round(horasTotal);
  piesTotal = Math.round(piesTotal);

  const nombre = profile?.display_name ?? profile?.handle ?? "Usuario";
  const inicial = nombre.trim().charAt(0).toUpperCase() || "V";
  const ubicacion =
    profile && (profile.city || profile.country)
      ? [profile.city, profile.country].filter(Boolean).join(", ")
      : null;
  const bio =
    profile?.bio && profile.bio.length > 110
      ? profile.bio.slice(0, 108) + "…"
      : profile?.bio;

  const fonts = await loadValizFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.fondo,
          color: COLORS.tinta,
          fontFamily: "Newsreader, serif",
          padding: "40px 60px",
          position: "relative",
        }}
      >
        {/* Tag superior centrado */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 16,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: COLORS.cuero,
            fontFamily: "Manrope, sans-serif",
            fontWeight: 600,
          }}
        >
          Valiz · Bitácora
        </div>

        {/* Avatar centro */}
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            width={220}
            height={220}
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${COLORS.piedra}`,
              boxShadow: "0 16px 50px rgba(26,26,26,0.15)",
              marginBottom: 22,
            }}
          />
        ) : (
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: COLORS.cuero,
              color: COLORS.fondo,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 130,
              fontFamily: "Newsreader, serif",
              boxShadow: "0 16px 50px rgba(26,26,26,0.15)",
              marginBottom: 22,
            }}
          >
            {inicial}
          </div>
        )}

        {/* Nombre */}
        <div
          style={{
            fontSize: nombre.length > 18 ? 60 : 76,
            lineHeight: 1.02,
            letterSpacing: "-0.022em",
            color: COLORS.tinta,
            display: "flex",
            textAlign: "center",
            margin: 0,
          }}
        >
          {nombre}
        </div>

        {/* @handle · ubicación */}
        <div
          style={{
            marginTop: 8,
            fontSize: 18,
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

        {/* Bio */}
        {bio && (
          <div
            style={{
              marginTop: 18,
              fontSize: 22,
              fontStyle: "italic",
              fontFamily: "Newsreader, serif",
              lineHeight: 1.4,
              color: COLORS.tinta,
              maxWidth: 800,
              textAlign: "center",
              display: "flex",
            }}
          >
            {bio}
          </div>
        )}

        {/* Stats inline grandes */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 60,
            borderTop: `1px solid ${COLORS.piedra}`,
            borderBottom: `1px solid ${COLORS.piedra}`,
            padding: "20px 60px",
          }}
        >
          <Stat label="Piezas" value={nf.format(piezasCount)} />
          <Stat label="Horas" value={nf.format(horasTotal)} />
          <Stat label="Pies²" value={nf.format(piesTotal)} />
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 14,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: COLORS.niebla,
            fontFamily: "Manrope, sans-serif",
            fontWeight: 600,
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 46,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          color: COLORS.tinta,
          fontFamily: "Newsreader, serif",
          display: "flex",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
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
    </div>
  );
}
