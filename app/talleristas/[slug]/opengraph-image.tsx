import { ImageResponse } from "next/og";

import { slugify } from "@/lib/slugify";
import { createStaticClient } from "@/lib/supabase/static";

export const runtime = "nodejs";
export const alt = "Tallerista · Valiz Bitácora";
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = createStaticClient();
  const { data: all } = await sb
    .from("talleristas")
    .select("id, name, role, portrait_url, specialties, manos_count");
  const list = (all ?? []) as {
    id: string;
    name: string;
    role: string | null;
    portrait_url: string | null;
    specialties: string[] | null;
    manos_count: number | null;
  }[];
  const t = list.find((x) => slugify(x.name) === slug);

  if (!t) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: COLORS.fondo,
            color: COLORS.tinta,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "serif",
            fontSize: 48,
          }}
        >
          Tallerista · Valiz
        </div>
      ),
      { ...size },
    );
  }

  // Stats: piezas y horas /año
  const { data: prodsRaw } = await sb
    .from("productos")
    .select("sales_total, familia_id")
    .eq("tallerista_id", t.id)
    .eq("status", "active");
  const { data: famsRaw } = await sb
    .from("familias")
    .select("id, hours_per_unit");
  const horasById = new Map(
    ((famsRaw ?? []) as { id: string; hours_per_unit: number | string | null }[]).map(
      (f) => [f.id, Number(f.hours_per_unit ?? 0)],
    ),
  );
  let unidadesTotal = 0;
  let horasTotal = 0;
  for (const p of (prodsRaw ?? []) as {
    sales_total: number | null;
    familia_id: string | null;
  }[]) {
    const u = Number(p.sales_total ?? 0);
    unidadesTotal += u;
    horasTotal += u * (p.familia_id ? (horasById.get(p.familia_id) ?? 0) : 0);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: COLORS.fondo,
          color: COLORS.tinta,
          fontFamily: "serif",
          padding: "64px 80px",
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
          Valiz Bitácora · Tallerista
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
          }}
        >
          {t.portrait_url ? (
            <img
              src={t.portrait_url}
              alt=""
              width={240}
              height={240}
              style={{
                width: 240,
                height: 240,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${COLORS.piedra}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: COLORS.cuero,
                color: COLORS.fondo,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 130,
                fontFamily: "serif",
              }}
            >
              {t.name.charAt(0)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {t.role && (
              <div
                style={{
                  fontSize: 20,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.cuero,
                  fontFamily: "sans-serif",
                  fontWeight: 600,
                  display: "flex",
                }}
              >
                {t.role}
              </div>
            )}
            <div
              style={{
                marginTop: 12,
                fontSize: 78,
                lineHeight: 1.02,
                letterSpacing: "-0.022em",
                display: "flex",
              }}
            >
              {t.name}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 22,
                color: COLORS.niebla,
                fontFamily: "sans-serif",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {t.manos_count ?? 0}{" "}
              {(t.manos_count ?? 0) === 1 ? "mano" : "manos"} en su taller
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 64,
            borderTop: `1px solid ${COLORS.piedra}`,
            paddingTop: 24,
          }}
        >
          <Stat label="Piezas/año" value={nf.format(unidadesTotal)} />
          <Stat label="Horas/año" value={nf.format(horasTotal)} />
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
