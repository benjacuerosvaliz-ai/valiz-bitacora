"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, Marker, Popup, type MapRef } from "react-map-gl/mapbox";

type Point = {
  id: string;
  lat: number;
  lng: number;
  foto: string;
  lugar: string | null;
  texto: string | null;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

// Defaults: Santiago de Chile
const DEFAULT_VIEW = {
  longitude: -70.65,
  latitude: -33.45,
  zoom: 3,
};

export function MapaColectivo({ points }: { points: Point[] }) {
  const mapRef = useRef<MapRef | null>(null);
  const [active, setActive] = useState<Point | null>(null);

  // Estado inicial: si hay puntos, centro promedio + zoom acercado;
  // si no, default Santiago.
  const initial = useMemo(() => {
    if (points.length === 0) return DEFAULT_VIEW;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { latitude: lat, longitude: lng, zoom: points.length === 1 ? 6 : 3 };
  }, [points]);

  // Cuando hay >1 punto, ajustar bounds para que todos sean visibles.
  useEffect(() => {
    if (!mapRef.current || points.length < 2) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    mapRef.current.fitBounds([sw, ne], {
      padding: 60,
      duration: 800,
      maxZoom: 10,
    });
  }, [points]);

  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center border border-piedra bg-fondo p-10 text-center">
        <p className="max-w-md font-serif italic text-niebla">
          El mapa está en pausa — falta configurar el token de Mapbox en las
          variables de entorno (
          <code className="font-mono text-sm">NEXT_PUBLIC_MAPBOX_TOKEN</code>).
        </p>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center border border-piedra bg-fondo p-10 text-center">
        <p className="max-w-md font-serif italic text-niebla">
          Todavía no hay bitácoras con ubicación. Sube la primera y aparece acá.
        </p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle={MAP_STYLE}
      initialViewState={initial}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      reuseMaps
    >
      {points.map((p) => (
        <Marker
          key={p.id}
          longitude={p.lng}
          latitude={p.lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setActive(p);
          }}
        >
          <button
            aria-label={p.lugar ?? "Bitácora"}
            className="group relative cursor-pointer"
          >
            <span className="block h-3 w-3 rounded-full border-2 border-fondo bg-cuero shadow-md transition-transform duration-200 group-hover:scale-125" />
          </button>
        </Marker>
      ))}

      {active && (
        <Popup
          longitude={active.lng}
          latitude={active.lat}
          anchor="bottom"
          offset={18}
          onClose={() => setActive(null)}
          closeButton={false}
          maxWidth="280px"
          className="valiz-popup"
        >
          <a
            href={`/bitacora/${active.id}`}
            className="block w-64 bg-fondo no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.foto}
              alt={active.lugar ?? "Bitácora"}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-3">
              {active.lugar && (
                <p className="font-serif text-base italic text-cuero">
                  {active.lugar}
                </p>
              )}
              {active.texto && (
                <p className="mt-1 line-clamp-2 font-serif text-sm leading-snug text-tinta">
                  {active.texto}
                </p>
              )}
              <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-cuero">
                Ver entrada →
              </p>
            </div>
          </a>
        </Popup>
      )}
    </Map>
  );
}
