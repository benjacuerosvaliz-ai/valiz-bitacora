import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Manifest PWA — habilita "Add to Home Screen" en mobile.
 * Cuando se instala, abre fullscreen sin chrome del navegador.
 *
 * Colores en sync con tailwind: bg-fondo (#f7f6f2), text-tinta (#1a1a1a).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Valiz",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f6f2",
    theme_color: "#f7f6f2",
    lang: "es-CL",
    categories: ["lifestyle", "shopping", "travel"],
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "1801x1801",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
