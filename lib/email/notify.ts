import {
  ADMIN_NOTIFY_EMAIL,
  EMAIL_FROM,
  getResend,
} from "@/lib/email/client";
import {
  tplAdminBitacoraNueva,
  tplAdminCompraPendiente,
  tplCanjeConfirmacion,
  tplCompraValidada,
} from "@/lib/email/templates";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://bitacora-valiz.vercel.app";

/**
 * Wrapper genérico de envío. Fire-and-forget: si Resend falla, lo
 * logueamos pero no rompemos el flujo del user. Los errores no se
 * propagan al caller.
 */
async function sendQuiet(args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    if (error) {
      console.error("[email send error]", args.subject, error);
    }
  } catch (e) {
    console.error("[email send fail]", args.subject, e);
  }
}

// ============================================================================
// Notificaciones admin (a Benja)
// ============================================================================

export async function notifyAdminCompraPendiente(args: {
  userEmail: string;
  familiaName: string;
  colorValiz: string;
  lugarCompra: string;
  fechaCompra: string;
  fotoUrl: string;
  matchedSku: string | null;
}): Promise<void> {
  const t = tplAdminCompraPendiente({
    ...args,
    adminUrl: `${APP_URL}/admin`,
  });
  await sendQuiet({
    to: ADMIN_NOTIFY_EMAIL,
    subject: t.subject,
    html: t.html,
    replyTo: args.userEmail,
  });
}

export async function notifyAdminBitacoraNueva(args: {
  bitacoraId: string;
  userEmail: string;
  lugar: string | null;
  texto: string | null;
  fotoUrl: string;
}): Promise<void> {
  const t = tplAdminBitacoraNueva({
    userEmail: args.userEmail,
    lugar: args.lugar ?? "(sin lugar)",
    texto: args.texto ?? "(sin texto)",
    fotoUrl: args.fotoUrl,
    bitacoraUrl: `${APP_URL}/bitacora/${args.bitacoraId}`,
  });
  await sendQuiet({
    to: ADMIN_NOTIFY_EMAIL,
    subject: t.subject,
    html: t.html,
    replyTo: args.userEmail,
  });
}

// ============================================================================
// Notificaciones a usuarios
// ============================================================================

export async function sendCanjeConfirmation(args: {
  userEmail: string;
  monto: number;
  codigo: string;
  ptsRestantes: number;
}): Promise<void> {
  const t = tplCanjeConfirmacion({
    monto: args.monto,
    codigo: args.codigo,
    ptsRestantes: args.ptsRestantes,
    shopUrl: "https://www.valiz.cl",
  });
  await sendQuiet({
    to: args.userEmail,
    subject: t.subject,
    html: t.html,
  });
}

export async function sendCompraValidada(args: {
  userEmail: string;
  familiaName: string;
  colorValiz: string;
  ptsOtorgados: number;
}): Promise<void> {
  const t = tplCompraValidada({
    familiaName: args.familiaName,
    colorValiz: args.colorValiz,
    ptsOtorgados: args.ptsOtorgados,
    yoUrl: `${APP_URL}/yo`,
  });
  await sendQuiet({
    to: args.userEmail,
    subject: t.subject,
    html: t.html,
  });
}
