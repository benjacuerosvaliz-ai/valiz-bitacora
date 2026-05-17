"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap } from "mapbox-gl";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Map, Marker, Popup, type MapRef } from "react-map-gl/mapbox";
import Supercluster, { type AnyProps, type ClusterFeature, type PointFeature } from "supercluster";

export type Point = {
  id: string;
  lat: number;
  lng: number;
  foto: string;
  lugar: string | null;
  texto: string | null;
  familia: string | null;
  colorValiz: string | null;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

const DEFAULT_VIEW = { longitude: -60, latitude: 15, zoom: 0.6 };
const SPIN_DEGREES_PER_SECOND = 6;
const RESUME_AFTER_MS = 3000;
const SPIN_MAX_ZOOM = 4;

type PointProps = AnyProps & { point: Point };

export function MapaColectivo({ points }: { points: Point[] }) {
  const mapRef = useRef<MapRef | null>(null);
  const [active, setActive] = useState<Point | null>(null);
  const [clusterDetail, setClusterDetail] = useState<{
    points: Point[];
    label: string;
  } | null>(null);
  const [bounds, setBounds] = useState<[number, number, number, number]>([
    -180, -85, 180, 85,
  ]);
  const [zoomState, setZoomState] = useState(DEFAULT_VIEW.zoom);

  // Indice de Supercluster — recalcula solo cuando cambian los puntos
  const cluster = useMemo(() => {
    const sc = new Supercluster<PointProps>({
      radius: 60,
      maxZoom: 14,
      minPoints: 2,
    });
    sc.load(
      points.map((p) => ({
        type: "Feature",
        properties: { point: p },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    );
    return sc;
  }, [points]);

  // Clusters visibles según viewport actual
  const visible = useMemo(() => {
    return cluster.getClusters(bounds, Math.floor(zoomState));
  }, [cluster, bounds, zoomState]);

  // Auto-spin (igual que antes)
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

  function onMoveEnd() {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap() as MapboxMap;
    const b = map.getBounds();
    if (!b) return;
    setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    setZoomState(map.getZoom());
  }

  // Al cargar el mapa: pintar el "espacio" (alrededor del globo) del mismo
  // color que la página para que parezca flotando en vez de en un cuadrado
  // blanco. También suaviza el horizonte para que el borde del globo se
  // funda con el fondo.
  function onLoad() {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap() as MapboxMap;
    map.setFog({
      "space-color": "#f7f6f2",
      "star-intensity": 0,
      "horizon-blend": 0.08,
      color: "#f7f6f2",
      "high-color": "#f7f6f2",
    });
    onMoveEnd();
  }

  function openCluster(c: ClusterFeature<PointProps>) {
    const leaves = cluster.getLeaves(c.id as number, Infinity, 0);
    const ps = leaves.map((l) => (l.properties as PointProps).point);
    // Label: si todos tienen el mismo `lugar`, úsalo; si no, "X piezas en
    // esta zona".
    const lugaresUnicos = new Set(ps.map((p) => p.lugar).filter(Boolean));
    const label =
      lugaresUnicos.size === 1
        ? (ps[0].lugar ?? `${ps.length} piezas en esta zona`)
        : `${ps.length} piezas en esta zona`;
    setClusterDetail({ points: ps, label });
  }

  function flyToClusterCenter(c: ClusterFeature<PointProps>) {
    if (!mapRef.current) return;
    const expansion = cluster.getClusterExpansionZoom(c.id as number);
    const [lng, lat] = c.geometry.coordinates;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: Math.min(expansion + 0.5, 12),
      duration: 1000,
      essential: true,
    });
  }

  // ESC cierra el modal de cluster
  useEffect(() => {
    if (!clusterDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClusterDetail(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clusterDetail]);

  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-fondo p-10 text-center">
        <p className="max-w-md font-serif italic text-niebla">
          El mapa está en pausa — falta configurar el token de Mapbox.
        </p>
      </div>
    );
  }

  return (
    <>
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      mapStyle={MAP_STYLE}
      initialViewState={DEFAULT_VIEW}
      projection={{ name: "globe" }}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      onLoad={onLoad}
      onMoveEnd={onMoveEnd}
      reuseMaps
    >
      {visible.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        // Cluster
        if ((feature.properties as { cluster?: boolean }).cluster) {
          const cf = feature as ClusterFeature<PointProps>;
          const count = cf.properties.point_count;
          const size =
            count >= 50 ? "h-16 w-16" : count >= 10 ? "h-14 w-14" : "h-12 w-12";
          return (
            <Marker
              key={`cluster-${cf.id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                openCluster(cf);
              }}
            >
              <button
                aria-label={`${count} bitácoras en esta zona`}
                className={`${size} flex cursor-pointer items-center justify-center rounded-full border-2 border-fondo bg-cuero font-serif text-fondo shadow-lg transition-transform duration-200 hover:scale-110`}
              >
                <span className="text-base font-semibold sm:text-lg">
                  {count}
                </span>
              </button>
            </Marker>
          );
        }

        // Punto individual: thumbnail circular con foto del producto
        const p = (feature as PointFeature<PointProps>).properties.point;
        return (
          <Marker
            key={p.id}
            longitude={lng}
            latitude={lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setActive(p);
            }}
          >
            <button
              aria-label={p.familia ?? "Bitácora Valiz"}
              className="group block cursor-pointer overflow-hidden rounded-full border-2 border-fondo bg-fondo shadow-lg transition-transform duration-200 hover:scale-110"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.foto}
                alt={p.familia ?? "Pieza Valiz"}
                className="h-12 w-12 object-cover sm:h-14 sm:w-14"
                loading="lazy"
              />
            </button>
          </Marker>
        );
      })}

      {active && (
        <Popup
          longitude={active.lng}
          latitude={active.lat}
          anchor="bottom"
          offset={32}
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
              alt={active.familia ?? "Bitácora"}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-3">
              {active.familia && (
                <p className="font-serif text-base text-tinta">
                  {active.familia}
                  {active.colorValiz && (
                    <span className="ml-2 italic text-cuero">
                      · {active.colorValiz}
                    </span>
                  )}
                </p>
              )}
              {active.lugar && (
                <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                  {active.lugar}
                </p>
              )}
              {active.texto && (
                <p className="mt-2 line-clamp-2 font-serif text-sm italic leading-snug text-niebla">
                  {active.texto}
                </p>
              )}
              <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-cuero">
                Ver entrada →
              </p>
            </div>
          </a>
        </Popup>
      )}
    </Map>

    {/* Modal de cluster: grid de las bitácoras de la zona */}
    <AnimatePresence>
      {clusterDetail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setClusterDetail(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden border border-piedra bg-fondo sm:max-h-[80vh]"
          >
            <header className="flex items-baseline justify-between gap-4 border-b border-piedra px-6 py-5 sm:px-10 sm:py-6">
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
                  En esta zona
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-tight tracking-[-0.015em] sm:text-3xl">
                  {clusterDetail.label}
                </h2>
              </div>
              <button
                onClick={() => setClusterDetail(null)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-piedra font-serif text-2xl text-niebla transition-colors hover:border-cuero hover:text-cuero"
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="max-h-[calc(85vh-120px)] overflow-y-auto px-6 py-6 sm:max-h-[calc(80vh-130px)] sm:px-10 sm:py-8">
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                {clusterDetail.points.map((p) => (
                  <li
                    key={p.id}
                    className="border border-piedra bg-fondo transition-colors hover:border-cuero"
                  >
                    <a
                      href={`/bitacora/${p.id}`}
                      className="block no-underline"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.foto}
                        alt={p.familia ?? "Bitácora"}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="p-3">
                        {p.familia && (
                          <p className="font-serif text-sm text-tinta">
                            {p.familia}
                            {p.colorValiz && (
                              <span className="ml-1 italic text-cuero">
                                · {p.colorValiz}
                              </span>
                            )}
                          </p>
                        )}
                        {p.lugar && (
                          <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.18em] text-niebla">
                            {p.lugar}
                          </p>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
