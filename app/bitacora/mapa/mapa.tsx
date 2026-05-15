"use client";

import { useState } from "react";
import { Map, Marker, Overlay } from "pigeon-maps";

type Point = {
  id: string;
  lat: number;
  lng: number;
  foto: string;
  lugar: string | null;
  texto: string | null;
};

const DEFAULT_CENTER: [number, number] = [-33.45, -70.65]; // Santiago
const DEFAULT_ZOOM = 4;

export function MapaColectivo({ points }: { points: Point[] }) {
  const [hovered, setHovered] = useState<Point | null>(null);

  // Centro del mapa: promedio si hay puntos, sino Santiago
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((s, p) => s + p.lat, 0) / points.length,
          points.reduce((s, p) => s + p.lng, 0) / points.length,
        ]
      : DEFAULT_CENTER;

  return (
    <Map
      defaultCenter={center}
      defaultZoom={points.length > 0 ? 5 : DEFAULT_ZOOM}
      attribution={false}
    >
      {points.map((p) => (
        <Marker
          key={p.id}
          width={32}
          color="#7a3b1f"
          anchor={[p.lat, p.lng]}
          onMouseOver={() => setHovered(p)}
          onMouseOut={() => setHovered(null)}
        />
      ))}
      {hovered && (
        <Overlay anchor={[hovered.lat, hovered.lng]} offset={[100, 220]}>
          <div className="pointer-events-none w-[200px] border border-piedra bg-fondo p-2 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hovered.foto}
              alt={hovered.lugar ?? ""}
              className="aspect-square w-full object-cover"
            />
            {hovered.lugar && (
              <p className="mt-2 font-serif text-sm italic text-cuero">
                {hovered.lugar}
              </p>
            )}
          </div>
        </Overlay>
      )}
    </Map>
  );
}
