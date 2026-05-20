import type { Metadata } from "next";

import { COLORES_MOCHILA_MAMA } from "../_lib/colores-mam";
import {
  PropuestaMochila,
  type ClienteConfig,
} from "../_lib/propuesta-mochila";

export const metadata: Metadata = {
  title: "Valiz × Las Mellizas · Propuesta",
  description: "Propuesta comercial mayorista — Mochila Alforja Mamá",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

const cliente: ClienteConfig = {
  nombre: "Las Mellizas",
  nombreCorto: "Las Mellizas",
  logo: "/images/las-mellizas-logo.png",
  saludo: "Hola, equipo Las Mellizas",
  cartaParrafo: (
    <>
      Somos <strong className="italic text-cuero">Valiz</strong>: marca
      chilena de marroquinería artesanal, seis años haciendo cuero
      genuino a mano en talleres locales. Las Mellizas es referente
      multimarca para mamás en Vitacura y Ñuñoa —{" "}
      <strong className="italic text-cuero">
        exactamente donde queremos estar
      </strong>
      . Queremos ofrecerles nuestra Mochila Alforja Mamá, la pieza más
      pedida de nuestro catálogo.
    </>
  ),
  porQueTitulo: "El multimarca premium se completa con cuero artesanal.",
  razones: [
    {
      titulo: "Multimarca con criterio",
      cuerpo:
        "Su mix curado en accesorios para mamá es donde queremos vivir. Valiz es la pieza que les falta en cuero.",
    },
    {
      titulo: "Vitacura + Ñuñoa",
      cuerpo:
        "Dos sucursales en zonas exactas de nuestro target demográfico. Cobertura amplia sin canibalización entre puntos.",
    },
    {
      titulo: "Producto único",
      cuerpo:
        "No hay otra mochila alforja mamá artesanal en su mix. Diferenciación inmediata vs. mochilas técnicas sintéticas.",
    },
    {
      titulo: "Reposiciones programadas",
      cuerpo:
        "Producción permanente en talleres propios. Stock garantizado, reposiciones mensuales según rotación.",
    },
  ],
  comercialNota:
    "100 unidades es nuestra recomendación para asegurar presencia robusta en sus dos puntos físicos y e-com. Podemos conversar partir con una producción menor si prefieren testear primero — totalmente flexible.",
  whatsappMessage:
    "Hola Benja, vimos la propuesta Valiz × Las Mellizas y queremos avanzar.",
};

export default function PropuestaMellizasPage() {
  return <PropuestaMochila cliente={cliente} colores={COLORES_MOCHILA_MAMA} />;
}
