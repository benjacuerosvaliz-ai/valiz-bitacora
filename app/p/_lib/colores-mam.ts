import type { ColorVariant } from "./propuesta-mochila";

/**
 * Configuración de los 10 colores activos de Mochila Alforja Mamá.
 * Compartido entre todas las propuestas que venden este producto.
 */
const SHOPIFY_BASE = "https://www.valiz.cl/products";

type ColorMAM = {
  sku: string;
  name: string;
  hint: string;
  shopifyHandle: string | null;
  fotoFallback?: string;
};

const COLORES_MAM: ColorMAM[] = [
  {
    sku: "MAM-G-CAM",
    name: "Camel",
    hint: "Clásico tierra · top seller",
    shopifyHandle: "mochila-alforja-mama-camel",
  },
  {
    sku: "MAM-G-NEGA",
    name: "Negro Gastado",
    hint: "Grafito moderno",
    shopifyHandle: "mochila-alforja-mama-negro-gastado",
  },
  {
    sku: "MAM-G-CAR",
    name: "Caramelo",
    hint: "Cálido medio",
    shopifyHandle: "mochila-alforja-mama-caramelo",
  },
  {
    sku: "MAM-G-CRU",
    name: "Crudo",
    hint: "Beige natural",
    shopifyHandle: "mochila-alforja-crudo-mama",
  },
  {
    sku: "MAM-G-CAFGA",
    name: "Café Gastado",
    hint: "Texturizado vintage",
    shopifyHandle: "mochila-alforja-mama-cafe-gastado",
  },
  {
    sku: "MAM-G-DEN",
    name: "Denim",
    hint: "Azul jeans único",
    shopifyHandle: "mochila-alforja-mama-denim",
  },
  {
    sku: "MAM-G-MOKA",
    name: "Moka",
    hint: "Chocolate suave",
    shopifyHandle: "mochila-alforja-mama-moka",
  },
  {
    sku: "MAM-G-MUS",
    name: "Musgo",
    hint: "Verde olivo natural",
    shopifyHandle: "mochila-alforja-musgo-mama",
  },
  {
    sku: "MAM-G-MUSE",
    name: "Mocha Mousse",
    hint: "Pantone 2025 chocolate",
    shopifyHandle: null,
    fotoFallback: "/images/productos/mochila-alforja/MA-G-MUSE/01-front.webp",
  },
  {
    sku: "MAM-G-CHA",
    name: "Charol",
    hint: "Negro intenso brillante",
    shopifyHandle: "mochila-alforja-mama-charol",
  },
];

export const COLORES_MOCHILA_MAMA: ColorVariant[] = COLORES_MAM.map((c) => ({
  name: c.name,
  hint: c.hint,
  foto:
    c.fotoFallback ??
    `/images/productos/mochila-alforja-mama/${c.sku}/01-front.webp`,
  href: c.shopifyHandle ? `${SHOPIFY_BASE}/${c.shopifyHandle}` : null,
}));
