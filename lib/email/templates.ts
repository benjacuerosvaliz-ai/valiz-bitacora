/**
 * Templates HTML para emails Valiz. Estética coherente con la web:
 *   - Logo Valiz arriba (caligrafía circular).
 *   - Newsreader serif para encabezados y párrafos.
 *   - Manrope sans para microcopia.
 *   - Paleta: cuero #7a3b1f / tinta #1a1a1a / fondo #f7f6f2 / piedra
 *     #d4d2cb / niebla #666666.
 *   - Voz: explicativa pero inteligente, sin marear.
 */

const FONDO = "#f7f6f2";
const TINTA = "#1a1a1a";
const CUERO = "#7a3b1f";
const NIEBLA = "#666666";
const PIEDRA = "#d4d2cb";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://bitacora.valiz.cl";
const LOGO_URL = `${APP_URL}/images/valiz-logo.png`;

function shell(opts: {
  preheader: string;
  title: string;
  intro?: string;
  body: string;
  cta?: { label: string; url: string };
  footer?: string;
}): string {
  const { preheader, title, intro, body, cta, footer } = opts;
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escape(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:${FONDO}; color:${TINTA}; -webkit-font-smoothing:antialiased; font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; font-size:0; line-height:0;">${escape(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${FONDO};">
      <tr>
        <td align="center" style="padding:48px 16px 24px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:0 0 32px 0;">
                <img src="${LOGO_URL}" alt="Valiz" width="64" height="64" style="display:block; width:64px; height:64px;" />
              </td>
            </tr>

            <!-- Brand microcopy -->
            <tr>
              <td align="center" style="padding:0 0 24px 0;">
                <p style="margin:0; font-size:11px; font-weight:600; letter-spacing:0.22em; text-transform:uppercase; color:${CUERO};">
                  Valiz · Bitácora
                </p>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding:0 8px;">
                <h1 style="margin:0 0 ${intro ? "20" : "32"}px 0; font-family:Georgia,'Times New Roman',serif; font-size:34px; line-height:1.08; letter-spacing:-0.015em; font-weight:400; color:${TINTA}; text-align:left;">
                  ${escape(title)}
                </h1>
              </td>
            </tr>

            ${
              intro
                ? `<tr>
              <td style="padding:0 8px 28px 8px;">
                <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:18px; line-height:1.5; color:${NIEBLA};">
                  ${escape(intro)}
                </p>
              </td>
            </tr>`
                : ""
            }

            <!-- Body -->
            <tr>
              <td style="padding:0 8px;">
                ${body}
              </td>
            </tr>

            ${
              cta
                ? `<tr>
              <td style="padding:32px 8px 0 8px;">
                <a href="${escape(cta.url)}" style="display:inline-block; padding:14px 28px; background:${TINTA}; color:${FONDO}; font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:0.22em; text-transform:uppercase; text-decoration:none;">
                  ${escape(cta.label)} &rarr;
                </a>
              </td>
            </tr>`
                : ""
            }

            <!-- Footer -->
            <tr>
              <td style="padding:56px 8px 0 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PIEDRA};">
                  <tr>
                    <td style="padding:20px 0 0 0;">
                      <p style="margin:0; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:${NIEBLA}; line-height:1.6;">
                        ${footer ?? "Cuero artesano. Manos chilenas. Valiz · Since 2018 · bitacora.valiz.cl"}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT_BODY =
  "Georgia,'Times New Roman',serif";
const FONT_MONO = "'Courier New',monospace";

const nf = new Intl.NumberFormat("es-CL");

// p() = párrafo serif del body. Centraliza estilos así no repetimos inline.
function p(content: string): string {
  return `<p style="margin:0 0 16px 0; font-family:${FONT_BODY}; font-size:17px; line-height:1.55; color:${TINTA};">${content}</p>`;
}

function code(content: string): string {
  return `<p style="margin:24px 0; text-align:center;"><code style="display:inline-block; padding:14px 22px; background:${FONDO}; border:1px solid ${PIEDRA}; font-family:${FONT_MONO}; font-size:20px; letter-spacing:0.08em; color:${TINTA};">${escape(content)}</code></p>`;
}

// ============================================================================
// Notificación admin: nueva pieza pendiente de validar
// ============================================================================
export function tplAdminCompraPendiente(args: {
  userEmail: string;
  familiaName: string;
  colorValiz: string;
  lugarCompra: string;
  fechaCompra: string;
  fotoUrl: string;
  matchedSku: string | null;
  adminUrl: string;
}): { subject: string; html: string } {
  const skuLine = args.matchedSku
    ? `Match con SKU <strong>${escape(args.matchedSku)}</strong> del catálogo.`
    : `Sin match con catálogo — revisar.`;
  const body = [
    p(
      `<strong>${escape(args.userEmail)}</strong> agregó a su equipaje:`,
    ),
    p(
      `<strong>${escape(args.familiaName)}</strong> · <em>${escape(args.colorValiz)}</em><br/>` +
        `Comprada en <em>${escape(args.lugarCompra)}</em> el ${escape(args.fechaCompra)}.<br/>` +
        skuLine,
    ),
    p(
      `<a href="${escape(args.fotoUrl)}" style="color:${CUERO}; text-decoration:underline;">Ver foto adjunta &rarr;</a>`,
    ),
  ].join("");
  return {
    subject: `Pieza por validar — ${args.familiaName} ${args.colorValiz}`,
    html: shell({
      preheader: `${args.userEmail} sumó una ${args.familiaName} ${args.colorValiz}`,
      title: "Pieza por validar.",
      intro:
        "Alguien sumó una Valiz a su equipaje. Mira la foto y confirma si va.",
      body,
      cta: { label: "Ir al admin", url: args.adminUrl },
    }),
  };
}

// ============================================================================
// Notificación admin: nueva bitácora subida
// ============================================================================
export function tplAdminBitacoraNueva(args: {
  userEmail: string;
  lugar: string;
  texto: string;
  fotoUrl: string;
  bitacoraUrl: string;
}): { subject: string; html: string } {
  const body = [
    p(
      `<strong>${escape(args.userEmail)}</strong> subió una entrada desde <em>${escape(args.lugar)}</em>.`,
    ),
    p(escape(args.texto)),
    p(
      `<a href="${escape(args.fotoUrl)}" style="color:${CUERO}; text-decoration:underline;">Ver foto &rarr;</a>`,
    ),
  ].join("");
  return {
    subject: `Nueva bitácora — ${args.lugar}`,
    html: shell({
      preheader: `${args.userEmail} subió bitácora desde ${args.lugar}`,
      title: "Bitácora nueva.",
      intro: "Una pieza Valiz dejó historia en algún lugar nuevo.",
      body,
      cta: { label: "Ver en la web", url: args.bitacoraUrl },
    }),
  };
}

// ============================================================================
// Confirmación al user: canje de puntos
// ============================================================================
export function tplCanjeConfirmacion(args: {
  monto: number;
  codigo: string;
  ptsRestantes: number;
  shopUrl: string;
}): { subject: string; html: string } {
  const body = [
    p(
      `Tu código de descuento por <strong>$${nf.format(args.monto)} CLP</strong> está listo:`,
    ),
    code(args.codigo),
    p(
      `Pégalo en el cupón al hacer checkout en <a href="${escape(args.shopUrl)}" style="color:${CUERO};">valiz.cl</a>. Es de un solo uso.`,
    ),
    p(
      `Saldo restante en tu bitácora: <strong>${nf.format(args.ptsRestantes)} pts</strong>.`,
    ),
  ].join("");
  return {
    subject: `Tu código Valiz — $${nf.format(args.monto)}`,
    html: shell({
      preheader: `Código de ${nf.format(args.monto)} CLP para usar en valiz.cl`,
      title: "Tu código está listo.",
      intro:
        "Te lo dejamos también acá por si lo pierdes en la web.",
      body,
      cta: { label: "Ir a comprar", url: args.shopUrl },
    }),
  };
}

// ============================================================================
// Código de verificación de email alternativo
// ============================================================================
export function tplCodigoVerificacion(args: {
  codigo: string;
  expiresInMin: number;
}): { subject: string; html: string } {
  const body = [
    p(
      `Este es el código para vincular este correo a tu bitácora Valiz:`,
    ),
    code(args.codigo),
    p(
      `Pégalo en la pantalla donde quedaste. Caduca en ${args.expiresInMin} minutos.`,
    ),
    p(
      `Si no fuiste tú quien lo pidió, ignora este mensaje — no pasa nada.`,
    ),
  ].join("");
  return {
    subject: `Tu código Valiz: ${args.codigo}`,
    html: shell({
      preheader: `Código: ${args.codigo}`,
      title: "Tu código de verificación.",
      intro: "Estamos sumando este correo a tu equipaje.",
      body,
    }),
  };
}

// ============================================================================
// Notificación al user: su pieza fue validada
// ============================================================================
export function tplCompraValidada(args: {
  familiaName: string;
  colorValiz: string;
  ptsOtorgados: number;
  yoUrl: string;
}): { subject: string; html: string } {
  const colorTxt = args.colorValiz
    ? ` <em>${escape(args.colorValiz)}</em>`
    : "";
  const ptsLine =
    args.ptsOtorgados > 0
      ? p(
          `Te dimos <strong>${nf.format(args.ptsOtorgados)} pts</strong> retroactivos por esta pieza, a tu saldo.`,
        )
      : p(
          `Sin puntos retroactivos esta vez, pero queda registrada en tu bitácora.`,
        );
  const body = [
    p(
      `Validamos tu <strong>${escape(args.familiaName)}</strong>${colorTxt}. Ya forma parte oficial de tu equipaje.`,
    ),
    ptsLine,
  ].join("");
  return {
    subject: `Validamos tu ${args.familiaName}`,
    html: shell({
      preheader: `Tu ${args.familiaName} ${args.colorValiz} fue validada`,
      title: "Pieza confirmada.",
      intro: "Bienvenida oficial a tu equipaje Valiz.",
      body,
      cta: { label: "Ver mi equipaje", url: args.yoUrl },
    }),
  };
}
