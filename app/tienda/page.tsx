import type { Metadata } from "next";

import Sala from "@/components/tienda/sala";

export const metadata: Metadata = {
  title: "Tienda · Valiz Bitácora",
  description: "Entra al espacio Valiz — los objetos y sus historias.",
};

export default function TiendaPage() {
  return <Sala />;
}
