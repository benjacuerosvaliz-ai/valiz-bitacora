import type { Metadata } from "next";

import { Propuesta } from "./propuesta";

export const metadata: Metadata = {
  title: "Valiz × Mamás Mateas · Propuesta",
  description: "Propuesta comercial mayorista — Mochila Alforja Mamá",
  // Propuesta privada — solo accesible vía link directo
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

/**
 * /p/mamas-mateas — Propuesta comercial mayorista para distribución
 * de Mochila Alforja Mamá en Mamás Mateas (2 puntos físicos + e-com).
 *
 * Página privada (robots noindex), pero visible para cualquiera con el
 * link directo. No requiere login.
 */

const COLORES = [
  { sku: "MAM-G-CAM", name: "Camel", hint: "Clásico tierra · top seller" },
  { sku: "MAM-G-NEGA", name: "Negro Gastado", hint: "Grafito moderno" },
  { sku: "MAM-G-CAR", name: "Caramelo", hint: "Cálido medio" },
  { sku: "MAM-G-CRU", name: "Crudo", hint: "Beige natural" },
  { sku: "MAM-G-CAFGA", name: "Café Gastado", hint: "Texturizado vintage" },
  { sku: "MAM-G-DEN", name: "Denim", hint: "Azul jeans único" },
  { sku: "MAM-G-MOKA", name: "Moka", hint: "Chocolate suave" },
  { sku: "MAM-G-MUS", name: "Musgo", hint: "Verde olivo natural" },
  // Mocha Mousse no tiene foto propia en MAM — reusamos foto del color
  // idéntico de Mochila Alforja regular (mismo cuero, mismo tono).
  {
    sku: "MAM-G-MUSE",
    name: "Mocha Mousse",
    hint: "Pantone 2025 chocolate",
    fotoFallback: "/images/productos/mochila-alforja/MA-G-MUSE/01-front.webp",
  },
  { sku: "MAM-G-CHA", name: "Charol", hint: "Negro intenso brillante" },
];

export default function PropuestaPage() {
  // Resolvemos las URLs de las fotos en build (estático, sin DB)
  const colores = COLORES.map((c) => ({
    name: c.name,
    hint: c.hint,
    foto:
      c.fotoFallback ??
      `/images/productos/mochila-alforja-mama/${c.sku}/01-front.webp`,
  }));

  return <Propuesta colores={colores} />;
}
