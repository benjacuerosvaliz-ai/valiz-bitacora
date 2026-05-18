/**
 * Constantes globales del sitio público.
 *
 * SITE_URL es la URL canónica de bitácora — se usa en metadataBase,
 * sitemap.xml, robots.txt y URLs absolutas de OG/Twitter cards.
 * Puede sobrescribirse vía env NEXT_PUBLIC_SITE_URL para preview/local.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://bitacora.valiz.cl";

export const SITE_NAME = "Valiz Bitácora";

export const SITE_DESCRIPTION =
  "La bitácora viva de Valiz — objetos de cuero artesanal chileno hechos para envejecer bien. Cada pieza tiene tres vidas: el cuero rescatado, las horas en taller y la bitácora de quien la lleva.";
