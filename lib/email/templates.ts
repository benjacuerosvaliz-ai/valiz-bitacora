/**
 * Templates HTML para emails Valiz. Plain HTML (no React Email todavía,
 * por simplicidad). Estilo coherente con la web:
 *   - Newsreader serif para encabezados, Manrope sans para microcopia.
 *   - Paleta cuero/tinta/fondo.
 *   - Sin imágenes en el body por ahora (evita problemas de tracking en
 *     clientes de email).
 */

const FONDO = "#f7f6f2";
const TINTA = "#1a1a1a";
const CUERO = "#7a3b1f";
const NIEBLA = "#666666";
const PIEDRA = "#d4d2cb";

function shell(opts: {
  preheader: string;
  title: string;
  intro: string;
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
    <title>${escape(title)}</title>
    <style>
      body { margin: 0; padding: 0; background: ${FONDO}; color: ${TINTA}; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
      .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
      .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${CUERO}; }
      h1 { font-family: 'Newsreader', Georgia, serif; font-size: 36px; line-height: 1.05; letter-spacing: -0.015em; font-weight: 400; margin: 16px 0 24px; color: ${TINTA}; }
      p.intro { font-family: 'Newsreader', Georgia, serif; font-style: italic; font-size: 18px; line-height: 1.5; color: ${NIEBLA}; margin: 0 0 28px; }
      p.body { font-family: 'Newsreader', Georgia, serif; font-size: 17px; line-height: 1.55; margin: 0 0 16px; }
      a.cta { display: inline-block; margin-top: 24px; padding: 14px 24px; background: ${TINTA}; color: ${FONDO}; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; text-decoration: none; }
      .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid ${PIEDRA}; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: ${NIEBLA}; }
      .preheader { display: none; max-height: 0; overflow: hidden; opacity: 0; }
      code.codigo { display: inline-block; padding: 8px 14px; background: ${FONDO}; border: 1px solid ${PIEDRA}; font-family: 'Courier New', monospace; font-size: 18px; letter-spacing: 0.05em; }
    </style>
  </head>
  <body>
    <span class="preheader">${escape(preheader)}</span>
    <div class="container">
      <p class="brand">Valiz · Bitácora</p>
      <h1>${escape(title)}</h1>
      <p class="intro">${escape(intro)}</p>
      <div>${body}</div>
      ${cta ? `<a class="cta" href="${escape(cta.url)}">${escape(cta.label)} &rarr;</a>` : ""}
      <div class="footer">
        ${footer ?? "Valiz · MMXXVI · bitacora.valiz.cl"}
      </div>
    </div>
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

const nf = new Intl.NumberFormat("es-CL");

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
  const body = `
    <p class="body">
      <strong>${escape(args.userEmail)}</strong> agregó una pieza:
    </p>
    <p class="body">
      <strong>${escape(args.familiaName)}</strong> · ${escape(args.colorValiz)}<br/>
      Comprada en <em>${escape(args.lugarCompra)}</em> el ${escape(args.fechaCompra)}<br/>
      SKU match: ${args.matchedSku ? `<code>${escape(args.matchedSku)}</code>` : "<em>sin match</em>"}
    </p>
    <p class="body">
      <a href="${escape(args.fotoUrl)}">Ver foto adjunta &rarr;</a>
    </p>
  `;
  return {
    subject: `Pieza pendiente de validar — ${args.familiaName}`,
    html: shell({
      preheader: `${args.userEmail} agregó una ${args.familiaName} ${args.colorValiz}`,
      title: "Pieza por validar",
      intro: "Alguien sumó una Valiz a su equipaje. Revisa la foto y valida si va.",
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
  const body = `
    <p class="body">
      <strong>${escape(args.userEmail)}</strong> subió bitácora desde
      <em>${escape(args.lugar)}</em>.
    </p>
    <p class="body">${escape(args.texto)}</p>
    <p class="body">
      <a href="${escape(args.fotoUrl)}">Ver foto &rarr;</a>
    </p>
  `;
  return {
    subject: `Nueva bitácora — ${args.lugar}`,
    html: shell({
      preheader: `${args.userEmail} subió bitácora desde ${args.lugar}`,
      title: "Bitácora nueva",
      intro: "Una pieza nueva con historia subida al feed colectivo.",
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
  const body = `
    <p class="body">
      Tu código de descuento:
    </p>
    <p class="body">
      <code class="codigo">${escape(args.codigo)}</code>
    </p>
    <p class="body">
      Vale <strong>$${nf.format(args.monto)} CLP</strong> en tu próxima compra
      en valiz.cl. Pégalo en el cupón al checkout. Es de un solo uso.
    </p>
    <p class="body">
      Te quedan <strong>${nf.format(args.ptsRestantes)} pts</strong> en tu
      bitácora.
    </p>
  `;
  return {
    subject: `Tu código de descuento — $${nf.format(args.monto)}`,
    html: shell({
      preheader: `Código de ${nf.format(args.monto)} CLP para usar en valiz.cl`,
      title: "Tu código está listo",
      intro: "Aquí queda registrado por si lo pierdes en la web.",
      body,
      cta: { label: "Ir a comprar", url: args.shopUrl },
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
  const ptsTxt =
    args.ptsOtorgados > 0
      ? `Te dimos <strong>${nf.format(args.ptsOtorgados)} pts</strong> retroactivos.`
      : "Sin puntos retroactivos esta vez, pero la pieza queda registrada.";
  const body = `
    <p class="body">
      Validamos tu <strong>${escape(args.familiaName)}</strong>${
        args.colorValiz ? ` <em>${escape(args.colorValiz)}</em>` : ""
      }. Ya forma parte oficial de tu equipaje.
    </p>
    <p class="body">${ptsTxt}</p>
  `;
  return {
    subject: `Validamos tu ${args.familiaName}`,
    html: shell({
      preheader: `Tu ${args.familiaName} ${args.colorValiz} fue validada`,
      title: "Pieza confirmada",
      intro: "Bienvenida oficial a tu equipaje Valiz.",
      body,
      cta: { label: "Ver mi equipaje", url: args.yoUrl },
    }),
  };
}
