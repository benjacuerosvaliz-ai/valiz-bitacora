import { ImageResponse } from "next/og";

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

  // Stats de impacto (idéntica lógica que /u/[handle]/page.tsx, abreviada)
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
          fontFamily: "serif",
          padding: "64px 80px",
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
          Valiz Bitácora · Perfil
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
          }}
        >
          {/* Avatar circular (monograma fallback) */}
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
                border: `2px solid ${COLORS.piedra}`,
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
                fontSize: 110,
                fontFamily: "serif",
              }}
            >
              {inicial}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                fontSize: 72,
                lineHeight: 1.02,
                letterSpacing: "-0.022em",
                display: "flex",
              }}
            >
              {nombre}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 22,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: COLORS.niebla,
                fontFamily: "sans-serif",
                display: "flex",
              }}
            >
              @{profile?.handle ?? handle}
              {ubicacion && `  ·  ${ubicacion}`}
            </div>
            {profile?.bio && (
              <div
                style={{
                  marginTop: 22,
                  fontSize: 22,
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  color: COLORS.tinta,
                  display: "flex",
                  maxWidth: 720,
                }}
              >
                {profile.bio.length > 130
                  ? profile.bio.slice(0, 128) + "…"
                  : profile.bio}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 64,
            borderTop: `1px solid ${COLORS.piedra}`,
            paddingTop: 24,
          }}
        >
          <Stat label="Piezas" value={nf.format(piezasCount)} />
          <Stat label="Horas en taller" value={nf.format(horasTotal)} />
          <Stat label="Pies² rescatados" value={nf.format(piesTotal)} />
          <div
            style={{
              marginLeft: "auto",
              alignSelf: "flex-end",
              fontSize: 16,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLORS.tinta,
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 14,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: COLORS.niebla,
          fontFamily: "sans-serif",
          display: "flex",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 44,
          letterSpacing: "-0.01em",
          color: COLORS.tinta,
          display: "flex",
        }}
      >
        {value}
      </div>
    </div>
  );
}
