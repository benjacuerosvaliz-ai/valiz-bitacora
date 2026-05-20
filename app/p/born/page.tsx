import type { Metadata } from "next";

import { COLORES_MOCHILA_MAMA } from "../_lib/colores-mam";
import {
  PropuestaMochila,
  type ClienteConfig,
} from "../_lib/propuesta-mochila";

export const metadata: Metadata = {
  title: "Valiz × BORN · Propuesta",
  description: "Propuesta comercial mayorista — Mochila Alforja Mamá",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

const cliente: ClienteConfig = {
  nombre: "BORN Concept Store",
  nombreCorto: "BORN",
  logo: null,
  saludo: "Hola, equipo BORN",
  cartaParrafo: (
    <>
      Somos <strong className="italic text-cuero">Valiz</strong>: marca
      chilena de marroquinería artesanal, seis años haciendo cuero
      genuino a mano en talleres locales. Vemos en BORN exactamente la
      curaduría que buscamos —{" "}
      <strong className="italic text-cuero">
        Stokke, Djeco y marcas premium para padres exigentes
      </strong>
      . Queremos ofrecerles formalmente nuestra Mochila Alforja Mamá,
      la pieza más pedida de nuestro catálogo.
    </>
  ),
  porQueTitulo: "Dos marcas que cuidan la curaduría.",
  razones: [
    {
      titulo: "Mismo piso, mismo público",
      cuerpo:
        "El Piso de Diseño de Parque Arauco es nuestra zona target: padres con poder adquisitivo que buscan piezas únicas para sus hijos.",
    },
    {
      titulo: "Curaduría reconocible",
      cuerpo:
        "BORN ya trabaja con Stokke, Djeco y marcas con historia. Valiz aporta la única alforja mamá artesanal del mercado local.",
    },
    {
      titulo: "Producto único en su mix",
      cuerpo:
        "Su catálogo cubre coches, juguetes y mobiliario premium. Falta el accesorio cuero artesanal para la mamá — Valiz lo completa.",
    },
    {
      titulo: "Reposiciones permanentes",
      cuerpo:
        "Producción estable en talleres propios. Reposiciones mensuales según rotación, sin one-shots.",
    },
  ],
  whatsappMessage:
    "Hola Benja, vimos la propuesta Valiz × BORN y queremos avanzar.",
};

export default function PropuestaBornPage() {
  return <PropuestaMochila cliente={cliente} colores={COLORES_MOCHILA_MAMA} />;
}
