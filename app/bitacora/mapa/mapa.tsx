"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap } from "mapbox-gl";
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

// Vista inicial: zoom bajísimo para ver el globo completo desde el inicio.
// Centro en el meridiano que muestra Sudamérica al frente.
const DEFAULT_VIEW = {
  longitude: -60,
  latitude: 15,
  zoom: 0.6,
};

// Auto-rotación: grados de longitud por segundo
const SPIN_DEGREES_PER_SECOND = 6;
// Tiempo de pausa después de interacción del user antes de reanudar
const RESUME_AFTER_MS = 3000;
// No spinear si el user zoomeó adentro (visiblemente investigando)
const SPIN_MAX_ZOOM = 4;

export function MapaColectivo({ points }: { points: Point[] }) {
  const mapRef = useRef<MapRef | null>(null);
  const [active, setActive] = useState<Point | null>(null);

  // Siempre arrancar viendo el globo completo (zoom 0.6). Si hay puntos,
  // el user puede zoomear, pero la vista de bienvenida es planeta entero.
  const initial = useMemo(() => DEFAULT_VIEW, []);

  // Auto-spin del globo. Pausa al interactuar, reanuda después de RESUME_AFTER_MS.
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap() as MapboxMap;
    let userInteracting = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTimestamp = performance.now();
    let rafId: number | null = null;

    const tick = (ts: number) => {
      const dt = (ts - lastTimestamp) / 1000;
      lastTimestamp = ts;
      if (!userInteracting) {
        const z = map.getZoom();
        if (z < SPIN_MAX_ZOOM) {
          const center = map.getCenter();
          center.lng -= SPIN_DEGREES_PER_SECOND * dt;
          map.setCenter(center);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const onInteractStart = () => {
      userInteracting = true;
      if (resumeTimer) clearTimeout(resumeTimer);
    };
    const onInteractEnd = () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        userInteracting = false;
        lastTimestamp = performance.now();
      }, RESUME_AFTER_MS);
    };

    map.on("mousedown", onInteractStart);
    map.on("touchstart", onInteractStart);
    map.on("wheel", onInteractStart);
    map.on("mouseup", onInteractEnd);
    map.on("touchend", onInteractEnd);
    // Después de zoom/pan via wheel también esperar
    map.on("moveend", () => {
      if (!userInteracting) return;
      onInteractEnd();
    });

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (resumeTimer) clearTimeout(resumeTimer);
      map.off("mousedown", onInteractStart);
      map.off("touchstart", onInteractStart);
      map.off("wheel", onInteractStart);
      map.off("mouseup", onInteractEnd);
      map.off("touchend", onInteractEnd);
    };
  }, []);

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

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle={MAP_STYLE}
      initialViewState={initial}
      projection={{ name: "globe" }}
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
            <span className="block h-3 w-3 rounded-full border-2 border-fondo bg-cuero shadow-md transition-transform duration-200 group-hover:scale-150" />
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
