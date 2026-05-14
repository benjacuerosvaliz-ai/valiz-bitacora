#!/usr/bin/env python3
"""
update_descriptions.py — Actualiza familias.description en Supabase con
los textos definidos abajo. Voz: observador cálido, ~50-60 palabras,
sin inventar (datos verificables: tallerista, horas, cueros, uso).

Para ajustar copy: editar DESC abajo, correr el script. dry-run por
default; --apply para escribir.

Uso:
    cd /Users/benja/valiz-bitacora
    .venv/bin/python scripts/update_descriptions.py          # dry-run
    .venv/bin/python scripts/update_descriptions.py --apply
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")

DESC = {
    "mochila-alforja": (
        "La Alforja sale del taller de Roberto en poco más de dos horas. "
        "Cuero rescatado del descarte industrial — Cobra Cresta Charol, "
        "Craque Jeans, Everest Trenzado Vicuña entre otros — que rota mes "
        "a mes. No hay dos iguales. Se cuelga al hombro, aguanta lo que "
        "sea. Para usarse fuerte, no para mirar."
    ),
    "mochila-alforja-mama": (
        "Roberto la hace en tres horas. Es la versión más grande de la "
        "línea Alforja — más volumen, mismo cuero rescatado del descarte "
        "industrial. Para los que cargan más de lo que cabe en una alforja "
        "normal: laptop, libros, una muda, lo que sea. Se llena, se vacía "
        "y vuelve a llenarse durante años."
    ),
    "mochila-alforja-chica": (
        "Roberto la termina en dos horas y cuarto. La versión chica de la "
        "Alforja, mismo cuero rescatado, misma rotación de cueros mes a "
        "mes. Para los que quieren la línea pero cargan poco — sale a la "
        "calle con la billetera, un libro, las llaves. Cabe en cualquier "
        "perchero sin estorbar."
    ),
    "mochila-grande": (
        "Línea descontinuada. Se hizo en hora y media, cuero rescatado "
        "del descarte industrial, formato mochila clásica de un "
        "compartimento. Quedaron en circulación las unidades que se "
        "vendieron en su momento — si te topas con una de segunda mano "
        "por ahí, eso es. Hoy el rol lo cubren la Mochila Chica y la "
        "Alforja."
    ),
    "mochila-chica": (
        "César la termina en 45 minutos. Mochila clásica de un "
        "compartimento, cuero rescatado del descarte industrial, sin "
        "tapas raras ni bolsillos de adorno. Para los que quieren mochila "
        "pero no se cuelgan una alforja: cabe una laptop chica, un par de "
        "libros, las llaves. Pesa lo que debe pesar."
    ),
    "cartera-zarga-grande": (
        "Hora y media en el taller de Roberto. Cartera grande de cuero "
        "rescatado, formato amplio, costura cruda. Roberto trabaja con "
        "cueros que rotan — la misma cartera no sale exactamente igual "
        "entre tandas. Para los que cargan más de lo que cabe en una "
        "billetera pero no quieren ir cargando un banano."
    ),
    "banano-midi": (
        "Roberto lo termina en una hora y diez minutos. Tamaño intermedio "
        "entre el Banano Chico y el Grande — un poco más de lugar sin "
        "pasarse al volumen del Grande. Cuero rescatado del descarte "
        "industrial, cierre firme, va al cuerpo. Para los que cargan "
        "billetera, llaves, teléfono y algo más que no cabe en el chico."
    ),
    "banano-grande": (
        "César lo termina en 45 minutos. Cuero rescatado, cierre firme, "
        "sin más. Va pegado al cuerpo, no al hombro, y crece lindo con el "
        "roce. Para los que andan ligeros y prefieren manos libres. Lo "
        "justo para lo que cabe en los bolsillos pero no en los bolsillos."
    ),
    "banano-chico": (
        "César lo termina en media hora. El más chico de la línea Banano "
        "— lo justo para billetera, llaves, teléfono y nada más. Cuero "
        "rescatado del descarte industrial, cierre firme, va pegado al "
        "cuerpo. Para los que ya no quieren cargar mochila ni que se note "
        "que llevan algo. Se ensucia bonito con el roce."
    ),
    "tabaquera": (
        "César la arma en una hora y diez minutos. Estuche pequeño de "
        "cuero rescatado del descarte industrial, formato cerrado, "
        "costura cruda. Pensada para tabaco — pero también sirve para "
        "cualquier cosa chica que quieras tener aparte: pluma, audífonos, "
        "USB, un papelito que importe. Funciona como guarda diaria que "
        "termina siendo parte del uniforme."
    ),
    "billetera-grande": (
        "César la termina en 45 minutos. Billetera de cuero rescatado del "
        "descarte industrial, formato amplio — cabe la plata grande, las "
        "tarjetas, el carnet, una foto y los recibos del mes sin "
        "amontonarse. Cierre simple. La que se ablanda con los meses "
        "hasta tomar exactamente la forma del bolsillo donde vive."
    ),
    "porta-pasaporte": (
        "César lo hace en media hora. Funda de cuero rescatado del "
        "descarte industrial para el pasaporte y los pasajes — formato "
        "vertical, cierre simple, sin compartimentos extra que sobren. "
        "Va en el bolsillo del abrigo o del jeans. Para los que viajan "
        "harto y prefieren que el pasaporte no ande dando vueltas en la "
        "mochila."
    ),
    "tarjetero": (
        "César lo termina en media hora. Tarjetero de cuero rescatado del "
        "descarte industrial, formato chato, cabe entre cuatro y ocho "
        "tarjetas según las apretes. Para los que ya no usan billetera, "
        "o cargan dos: una diaria, otra de salir. Vive en el bolsillo del "
        "pantalón, no en la mochila. Se gasta parejo."
    ),
    "cinturon-chico": (
        "David lo arma en 40 minutos. Una sola pieza de cuero macizo "
        "rescatado del descarte industrial, hebilla simple que no "
        "afloja. Lo que se le va sacando con los meses es marca, no "
        "desgaste. De los cinturones que duran años y terminan colgando "
        "en la pared del que los hereda."
    ),
    "strap": (
        "Roberto lo termina en media hora. Correa suelta de cuero "
        "rescatado del descarte industrial, pensada para combinar con la "
        "pieza que ya tienes — banano, mochila, cartera. Se intercambia, "
        "se rota, se hereda. Para los que quieren cambiarle el ánimo a "
        "una pieza sin cambiar de pieza, o tener dos opciones para la "
        "misma alforja."
    ),
    "estuche": (
        "Media hora de taller, cuero rescatado del descarte industrial. "
        "Estuche chico de función abierta: lápices, llaves, lentes, "
        "audífonos, lo que necesites tener junto y separado del resto. "
        "Cierre simple, sin compartimentos internos. De los que terminas "
        "usando para algo que no estaba pensado al comprarlo, y se queda "
        "en ese rol."
    ),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Ejecuta el UPDATE; sin esta flag es dry-run")
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    familias = sb.table("familias").select("slug, name, description").execute().data
    by_slug = {f["slug"]: f for f in familias}

    print(f"{'Familia':<26} {'Palabras':>9} {'Estado actual':>15}")
    print("-" * 60)
    for slug, text in DESC.items():
        fila = by_slug.get(slug)
        if not fila:
            print(f"⚠️  {slug}: no existe")
            continue
        wc = len(text.split())
        estado = "null" if not fila.get("description") else "ya tenía texto"
        print(f"{fila['name']:<26} {wc:>9} {estado:>15}")

    if not args.apply:
        print()
        print("ℹ️  dry-run; agrega --apply para escribir.")
        return

    print()
    print("🚀 Aplicando UPDATE…")
    for slug, text in DESC.items():
        sb.table("familias").update({"description": text}).eq("slug", slug).execute()
        print(f"  ✓ {slug}")
    print()
    print("✅ Listo.")


if __name__ == "__main__":
    main()
