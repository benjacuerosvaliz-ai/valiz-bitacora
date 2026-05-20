import type { Metadata } from "next";

import { COLORES_MOCHILA_MAMA } from "../_lib/colores-mam";
import {
  PropuestaMochila,
  type ClienteConfig,
} from "../_lib/propuesta-mochila";

export const metadata: Metadata = {
  title: "Valiz × SmartMom · Propuesta",
  description: "Propuesta comercial mayorista — Mochila Alforja Mamá",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

const cliente: ClienteConfig = {
  nombre: "SmartMom Chile",
  nombreCorto: "SmartMom",
  logo: null,
  saludo: "Hola, equipo SmartMom",
  cartaParrafo: (
    <>
      Somos <strong className="italic text-cuero">Valiz</strong>: marca
      chilena de marroquinería artesanal, seis años haciendo cuero
      genuino a mano en talleres locales. Vemos en SmartMom una
      curaduría única —{" "}
      <strong className="italic text-cuero">
        eco-friendly, marcas con propósito, mamás conscientes
      </strong>
      . Queremos ofrecerles nuestra Mochila Alforja Mamá, hecha 100%
      en Chile con cuero genuino chileno.
    </>
  ),
  porQueTitulo: "Cuero genuino para mamás conscientes.",
  razones: [
    {
      titulo: "Sustentabilidad real",
      cuerpo:
        "Cuero genuino chileno vs. fast fashion sintética. Una pieza que dura años, no temporadas.",
    },
    {
      titulo: "Trazabilidad chilena",
      cuerpo:
        "Hecha a mano en talleres locales con costuras reforzadas. Cada SKU sabemos quién lo cosió.",
    },
    {
      titulo: "Producto único en su mix",
      cuerpo:
        "SmartMom hoy importa marcas europeas. Valiz suma una alforja artesanal nacional sin equivalente.",
    },
    {
      titulo: "Vitacura, su mercado",
      cuerpo:
        "Mismo ecosistema demográfico que ya están construyendo. Producción estable, reposiciones mensuales.",
    },
  ],
  whatsappMessage:
    "Hola Benja, vimos la propuesta Valiz × SmartMom y queremos avanzar.",
};

export default function PropuestaSmartMomPage() {
  return <PropuestaMochila cliente={cliente} colores={COLORES_MOCHILA_MAMA} />;
}
