import type { Metadata } from "next";

import { COLORES_MOCHILA_MAMA } from "../_lib/colores-mam";
import {
  PropuestaMochila,
  type ClienteConfig,
} from "../_lib/propuesta-mochila";

export const metadata: Metadata = {
  title: "Valiz × Wua-Wua · Propuesta",
  description: "Propuesta comercial mayorista — Mochila Alforja Mamá",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

const cliente: ClienteConfig = {
  nombre: "Wua-Wua",
  nombreCorto: "Wua-Wua",
  logo: "/images/wua-wua-logo.png",
  saludo: "Hola, equipo Wua-Wua",
  cartaParrafo: (
    <>
      Somos <strong className="italic text-cuero">Valiz</strong>: marca
      chilena de marroquinería artesanal, seis años haciendo cuero
      genuino a mano en talleres locales. Wua-Wua tiene{" "}
      <strong className="italic text-cuero">
        la red retail más extendida en zonas premium de Santiago
      </strong>{" "}
      — Ñuñoa, Vitacura, Lo Barnechea, Chicureo, Viña. Queremos ofrecerles
      nuestra Mochila Alforja Mamá para que viva en sus cinco puntos.
    </>
  ),
  porQueTitulo: "Cinco sucursales para una pieza artesanal única.",
  razones: [
    {
      titulo: "Cobertura geográfica única",
      cuerpo:
        "Cinco sucursales en Ñuñoa, Vitacura, Lo Barnechea, Chicureo y Viña. Ningún otro distribuidor cubre tanto.",
    },
    {
      titulo: "Reposición masiva escalable",
      cuerpo:
        "Producción permanente. Volumen para abastecer cinco puntos con reposiciones mensuales sin quiebres.",
    },
    {
      titulo: "Producto único en su catálogo",
      cuerpo:
        "Hoy ninguna mochila alforja mamá artesanal compite en su mix. Valiz suma la pieza premium que falta.",
    },
    {
      titulo: "Partnership de largo plazo",
      cuerpo:
        "Queremos ser un proveedor estable, con visión multi-temporada y co-creación en fase 2.",
    },
  ],
  whatsappMessage:
    "Hola Benja, vimos la propuesta Valiz × Wua-Wua y queremos avanzar.",
};

export default function PropuestaWuaWuaPage() {
  return <PropuestaMochila cliente={cliente} colores={COLORES_MOCHILA_MAMA} />;
}
