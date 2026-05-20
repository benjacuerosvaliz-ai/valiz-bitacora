import type { Metadata } from "next";

import { COLORES_MOCHILA_MAMA } from "../_lib/colores-mam";
import {
  PropuestaMochila,
  type ClienteConfig,
} from "../_lib/propuesta-mochila";

export const metadata: Metadata = {
  title: "Valiz × Mamás Mateas · Propuesta",
  description: "Propuesta comercial mayorista — Mochila Alforja Mamá",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

const cliente: ClienteConfig = {
  nombre: "Mamás Mateas",
  nombreCorto: "Mamás Mateas",
  logo: "/images/mamas-mateas-logo.png",
  saludo: "Hola, equipo Mamás Mateas",
  cartaParrafo: (
    <>
      Somos <strong className="italic text-cuero">Valiz</strong>: marca
      chilena de marroquinería artesanal, seis años haciendo cuero
      genuino a mano en talleres locales. Queremos ofrecerles formalmente
      nuestra{" "}
      <strong className="italic text-cuero">Mochila Alforja Mamá</strong>{" "}
      — la pieza más pedida de nuestro catálogo y la que mejor encaja
      con su comunidad.
    </>
  ),
  razones: [
    {
      titulo: "Cliente común",
      cuerpo:
        "La mamá chilena que valora curaduría, oficio y producto que dura.",
    },
    {
      titulo: "Posicionamiento curado",
      cuerpo:
        "Mamás Mateas no vende cualquier cosa, y nosotros tampoco fabricamos cualquier cosa.",
    },
    {
      titulo: "Producto único",
      cuerpo:
        "No hay otra mochila alforja mamá artesanal con la propuesta de Valiz en el mercado local.",
    },
    {
      titulo: "Reposiciones programadas",
      cuerpo:
        "Queremos ser un proveedor estable, no un one-shot. Producción permanente.",
    },
  ],
  // Mamás Mateas SÍ tiene checklist público de 7 puntos para proveedores
  cumplimientoCopy: {
    tag: "Cumplimiento de requisitos",
    titulo: "Revisamos su checklist. Valiz cumple los siete puntos.",
  },
};

export default function PropuestaMateasPage() {
  return <PropuestaMochila cliente={cliente} colores={COLORES_MOCHILA_MAMA} />;
}
