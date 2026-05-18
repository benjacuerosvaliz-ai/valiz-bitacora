import { ImageResponse } from "next/og";

import { loadValizFonts } from "@/lib/og-fonts";
import { createStaticClient } from "@/lib/supabase/static";

export const runtime = "nodejs";
export const alt = "Concurso · Valiz Bitácora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#8b6f47",
  niebla: "#6b6b6b",
  piedra: "#d9d3c7",
  musgo: "#5d6f3e",
};

type Concurso = {
  id: string;
  titulo: string;
  descripcion: string | null;
  premio_descripcion: string | null;
  inicia_at: string;
  termina_at: string;
  ganador_bitacora_id: string | null;
  ganador_user_id: string | null;
};

function estado(c: Concurso): "actual" | "futuro" | "cerrado" {
  const now = Date.now();
  if (now < new Date(c.inicia_at).getTime()) return "futuro";
  if (now > new Date(c.termina_at).getTime()) return "cerrado";
  return "actual";
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = createStaticClient();
  const { data: c } = await sb
    .from("concursos")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const fonts = await loadValizFonts();

  if (!c) {
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
            fontFamily: "Newsreader, serif",
          }}
        >
          Concurso · Valiz
        </div>
      ),
      { ...size, fonts },
    );
  }

  const concurso = c as Concurso;
  const st = estado(concurso);
  const stLabel =
    st === "actual" ? "Vigente" : st === "futuro" ? "Próximo" : "Cerrado";
  const stColor =
    st === "actual"
      ? COLORS.cuero
      : st === "futuro"
        ? COLORS.musgo
        : COLORS.niebla;

  // Si hay ganador, traer su bitácora + perfil para el split
  let ganadorFoto: string | null = null;
  let ganadorNombre: string | null = null;
  if (concurso.ganador_bitacora_id && concurso.ganador_user_id) {
    const [bRes, uRes] = await Promise.all([
      sb
        .from("bitacora_entries")
        .select("foto_url")
        .eq("id", concurso.ganador_bitacora_id)
        .maybeSingle(),
      sb
        .from("user_profiles_public")
        .select("display_name, handle")
        .eq("id", concurso.ganador_user_id)
        .maybeSingle(),
    ]);
    ganadorFoto = (bRes.data as { foto_url: string } | null)?.foto_url ?? null;
    const u = uRes.data as
      | { display_name: string | null; handle: string | null }
      | null;
    ganadorNombre = u?.display_name ?? u?.handle ?? null;
  }

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
        {ganadorFoto && (
          <div
            style={{
              width: "45%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ece6dc",
            }}
          >
            <img
              src={ganadorFoto}
              alt=""
              width={520}
              height={520}
              style={{ objectFit: "cover", width: 520, height: 520 }}
            />
          </div>
        )}

        <div
          style={{
            width: ganadorFoto ? "55%" : "100%",
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
              fontFamily: "Manrope, sans-serif", fontWeight: 600,
              display: "flex",
            }}
          >
            Valiz Bitácora · Concurso
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: stColor,
                fontFamily: "Manrope, sans-serif",
                fontWeight: 600,
                display: "flex",
              }}
            >
              {stLabel}
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: ganadorFoto ? 62 : 78,
                lineHeight: 1.02,
                letterSpacing: "-0.022em",
                display: "flex",
              }}
            >
              {concurso.titulo}
            </div>
            {ganadorNombre ? (
              <div
                style={{
                  marginTop: 28,
                  fontSize: 26,
                  fontStyle: "italic",
                  color: COLORS.cuero,
                  display: "flex",
                }}
              >
                Ganador: {ganadorNombre}
              </div>
            ) : concurso.premio_descripcion ? (
              <div
                style={{
                  marginTop: 28,
                  fontSize: 26,
                  fontStyle: "italic",
                  color: COLORS.cuero,
                  display: "flex",
                }}
              >
                Premio: {concurso.premio_descripcion}
              </div>
            ) : null}
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
      </div>
    ),
    { ...size, fonts },
  );
}
