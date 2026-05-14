"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  type Group,
  MathUtils,
  type Mesh,
  type PerspectiveCamera,
  Vector3,
} from "three";

/**
 * Paleta Valiz traducida a Three.js
 */
const COL = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#7a3b1f",
  piedra: "#d4d2cb",
  niebla: "#666666",
  ambar: "#d97a00",
  paredCalida: "#ebe5d8", // cream cálido para paredes
  pisoMadera: "#3a2418", // madera oscura noble
  techo: "#f0ebe0", // crema suave techo
};

type Portal = {
  id: string;
  label: string;
  caption: string;
  imageUrl: string;
  href: string;
  /** [posición x, y, z] en la sala */
  position: [number, number, number];
  /** rotación en eje Y (para que la pintura mire al centro) */
  rotationY: number;
  /** tamaño del cuadro [ancho, alto] */
  size: [number, number];
};

const PORTALS: Portal[] = [
  {
    id: "bitacora",
    label: "La Bitácora",
    caption: "Las tres vidas del objeto",
    imageUrl: "/images/hero.jpg",
    href: "/",
    position: [0, 1.7, -4.9],
    rotationY: 0,
    size: [2, 2.4],
  },
  {
    id: "vida-pasada",
    label: "Vida pasada",
    caption: "El cuero antes de ser tuyo",
    imageUrl: "/images/vida-pasada.jpg",
    href: "/#vida-pasada",
    position: [-4.9, 1.7, -2],
    rotationY: Math.PI / 2,
    size: [1.6, 2],
  },
  {
    id: "vida-presente",
    label: "Vida presente",
    caption: "Las horas en taller",
    imageUrl: "/images/vida-presente.jpg",
    href: "/#vida-presente",
    position: [-4.9, 1.7, 1.5],
    rotationY: Math.PI / 2,
    size: [2.2, 1.7],
  },
  {
    id: "mochila-alforja",
    label: "Mochila Alforja",
    caption: "Conoce la pieza",
    imageUrl:
      "/images/productos/mochila-alforja/MA-G-CRU/01-front.webp",
    href: "/piezas/mochila-alforja",
    position: [4.9, 1.7, -1],
    rotationY: -Math.PI / 2,
    size: [1.6, 2],
  },
];

export default function Sala() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-fondo">
      <Canvas
        shadows
        camera={{ position: [0, 1.6, 2.5], fov: 55 }}
        gl={{ antialias: true }}
      >
        <Scene
          onPortalClick={(href) => router.push(href)}
        />
      </Canvas>

      {/* UI overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-baseline justify-between">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cuero">
            Valiz · Tienda
          </p>
          <a
            href="/"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-piedra bg-fondo/80 font-serif text-2xl text-niebla backdrop-blur-sm transition-colors hover:border-cuero hover:text-cuero"
            aria-label="Volver a la bitácora"
          >
            ×
          </a>
        </div>
        <p className="text-center font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
          Mueve el cursor para mirar alrededor · click en los cuadros para
          entrar
        </p>
      </div>
    </div>
  );
}

function Scene({ onPortalClick }: { onPortalClick: (href: string) => void }) {
  // Cursor-driven look-around: mover el mouse rota la cámara dentro de
  // límites confortables.
  const cursor = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handle = (e: PointerEvent) => {
      cursor.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handle);
    return () => window.removeEventListener("pointermove", handle);
  }, []);

  return (
    <>
      <CameraLook cursor={cursor} />
      <Lighting />
      <Room />
      {PORTALS.map((p) => (
        <Portal key={p.id} portal={p} onClick={() => onPortalClick(p.href)} />
      ))}
    </>
  );
}

function CameraLook({
  cursor,
}: {
  cursor: React.RefObject<{ x: number; y: number }>;
}) {
  const { camera } = useThree();
  const targetRot = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!cursor.current) return;
    // Cursor X/Y → rotación yaw/pitch con límites
    const yaw = -cursor.current.x * MathUtils.degToRad(28);
    const pitch = -cursor.current.y * MathUtils.degToRad(15);

    targetRot.current.x = MathUtils.lerp(targetRot.current.x, pitch, 0.08);
    targetRot.current.y = MathUtils.lerp(targetRot.current.y, yaw, 0.08);

    const cam = camera as PerspectiveCamera;
    cam.rotation.order = "YXZ";
    cam.rotation.y = targetRot.current.y;
    cam.rotation.x = targetRot.current.x;
  });

  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color={COL.fondo} />
      {/* Luz cenital cálida tipo gallery */}
      <directionalLight
        position={[0, 6, 0]}
        intensity={0.4}
        color="#fff5e6"
        castShadow
      />
      {/* Spots cálidos sobre los 4 cuadros para acento */}
      {PORTALS.map((p) => (
        <spotLight
          key={`spot-${p.id}`}
          position={[p.position[0] * 0.4, 3.4, p.position[2] * 0.4]}
          target-position={p.position}
          angle={0.6}
          penumbra={0.5}
          intensity={1.2}
          color="#fff0d6"
          distance={8}
        />
      ))}
    </>
  );
}

function Room() {
  // Sala: 10m ancho × 10m fondo × 3.5m alto
  // Origen en el centro del piso
  return (
    <group>
      {/* Piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={COL.pisoMadera} roughness={0.85} />
      </mesh>
      {/* Techo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={COL.techo} roughness={1} />
      </mesh>
      {/* Pared frente (-Z) */}
      <mesh position={[0, 1.75, -5]}>
        <planeGeometry args={[10, 3.5]} />
        <meshStandardMaterial color={COL.paredCalida} roughness={1} />
      </mesh>
      {/* Pared atrás (+Z) — tapada para que no se vea el "afuera" si gira */}
      <mesh position={[0, 1.75, 5]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[10, 3.5]} />
        <meshStandardMaterial color={COL.paredCalida} roughness={1} />
      </mesh>
      {/* Pared izq (-X) */}
      <mesh position={[-5, 1.75, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 3.5]} />
        <meshStandardMaterial color={COL.paredCalida} roughness={1} />
      </mesh>
      {/* Pared der (+X) */}
      <mesh position={[5, 1.75, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 3.5]} />
        <meshStandardMaterial color={COL.paredCalida} roughness={1} />
      </mesh>
    </group>
  );
}

function Portal({
  portal,
  onClick,
}: {
  portal: Portal;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const frameRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const texture = useTexture(portal.imageUrl);

  // Hover: leve scale + glow visual
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetScale = hovered ? 1.04 : 1;
    const current = groupRef.current.scale.x;
    const next = MathUtils.lerp(current, targetScale, delta * 6);
    groupRef.current.scale.setScalar(next);
  });

  const [w, h] = portal.size;
  const frameThickness = 0.05;

  return (
    <group
      ref={groupRef}
      position={portal.position}
      rotation={[0, portal.rotationY, 0]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Marco (un poquito más grande que la imagen) */}
      <mesh ref={frameRef} position={[0, 0, -0.02]}>
        <boxGeometry args={[w + frameThickness * 2, h + frameThickness * 2, 0.04]} />
        <meshStandardMaterial color={COL.tinta} roughness={0.6} />
      </mesh>
      {/* Imagen */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.4} />
      </mesh>
      {/* Glow al hacer hover */}
      {hovered && (
        <pointLight
          position={[0, 0, 0.5]}
          intensity={0.6}
          color="#fff5e6"
          distance={2}
        />
      )}
    </group>
  );
}
