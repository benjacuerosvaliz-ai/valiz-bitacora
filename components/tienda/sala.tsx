"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { MathUtils, type Group, type PerspectiveCamera } from "three";

const COL = {
  fondo: "#f7f6f2",
  tinta: "#1a1a1a",
  cuero: "#7a3b1f",
  paredCalida: "#e9e3d3",
  pisoMadera: "#2e1d12",
  techo: "#ece6da",
  maderaMueble: "#5a3a22",
  maderaMuebleTop: "#6b4528",
};

export type SalaFamily = {
  slug: string;
  name: string;
  productPhoto?: string | null;
  hoursPerUnit?: number | null;
};

export default function Sala({ families }: { families: SalaFamily[] }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-fondo">
      <Canvas
        shadows
        camera={{ position: [0, 1.6, 0], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene
            families={families}
            onStationClick={(slug) => router.push(`/piezas/${slug}`)}
          />
        </Suspense>
      </Canvas>

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
          Arrastra para girar la cámara · click en un mueble para entrar a esa
          familia
        </p>
      </div>
    </div>
  );
}

function Scene({
  families,
  onStationClick,
}: {
  families: SalaFamily[];
  onStationClick: (slug: string) => void;
}) {
  return (
    <>
      <CameraRig />
      <Lighting count={families.length} />
      <Room />
      {families.map((f, i) => {
        const angle = (i / families.length) * Math.PI * 2;
        const radius = 7.2;
        const x = Math.sin(angle) * radius;
        const z = -Math.cos(angle) * radius;
        // Cada estación mira al centro (donde está la cámara)
        const rotY = angle + Math.PI;
        return (
          <Station
            key={f.slug}
            family={f}
            position={[x, 0, z]}
            rotationY={rotY}
            onClick={() => onStationClick(f.slug)}
          />
        );
      })}
    </>
  );
}

/**
 * Drag-to-look-around: el usuario arrastra desde cualquier punto del canvas
 * y la cámara rota libremente 360° en yaw, con pitch limitado a ±20° para
 * que no se desoriente. La inercia hace que al soltar siga un toque más.
 */
function CameraRig() {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const yawVelocity = useRef(0);
  const pitchVelocity = useRef(0);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";

    const down = (e: PointerEvent) => {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (el as HTMLElement).setPointerCapture(e.pointerId);
      yawVelocity.current = 0;
      pitchVelocity.current = 0;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      // 1px = 0.005 rad ≈ 0.3°
      yawVelocity.current = -dx * 0.005;
      pitchVelocity.current = -dy * 0.005;
      yaw.current += yawVelocity.current;
      pitch.current = MathUtils.clamp(
        pitch.current + pitchVelocity.current,
        -MathUtils.degToRad(20),
        MathUtils.degToRad(20),
      );
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      try {
        (el as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame(() => {
    // Inercia: si el usuario soltó, dejamos que la rotación siga decayendo
    if (!dragging.current) {
      yaw.current += yawVelocity.current * 0.92;
      pitch.current = MathUtils.clamp(
        pitch.current + pitchVelocity.current * 0.92,
        -MathUtils.degToRad(20),
        MathUtils.degToRad(20),
      );
      yawVelocity.current *= 0.92;
      pitchVelocity.current *= 0.92;
    }
    const cam = camera as PerspectiveCamera;
    cam.rotation.order = "YXZ";
    cam.rotation.y = yaw.current;
    cam.rotation.x = pitch.current;
  });

  return null;
}

function Lighting({ count }: { count: number }) {
  // Luces de "techo de exhibición" — 4 grandes alrededor del centro
  return (
    <>
      <ambientLight intensity={0.4} color="#fff5e6" />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        const r = 5;
        return (
          <pointLight
            key={i}
            position={[Math.sin(a) * r, 3.6, -Math.cos(a) * r]}
            intensity={1.5}
            color="#fff0d6"
            distance={14}
            decay={1.6}
          />
        );
      })}
      {/* Suplemento general */}
      <directionalLight position={[0, 8, 0]} intensity={0.3} color="#fff5e6" />
    </>
  );
}

function Room() {
  return (
    <group>
      {/* Piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={COL.pisoMadera} roughness={0.85} />
      </mesh>
      {/* Techo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={COL.techo} roughness={1} />
      </mesh>
      {/* 4 paredes */}
      {[
        { pos: [0, 2, -10] as const, rot: [0, 0, 0] as const },
        { pos: [0, 2, 10] as const, rot: [0, Math.PI, 0] as const },
        { pos: [-10, 2, 0] as const, rot: [0, Math.PI / 2, 0] as const },
        { pos: [10, 2, 0] as const, rot: [0, -Math.PI / 2, 0] as const },
      ].map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot}>
          <planeGeometry args={[20, 4]} />
          <meshStandardMaterial color={COL.paredCalida} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Station({
  family,
  position,
  rotationY,
  onClick,
}: {
  family: SalaFamily;
  position: [number, number, number];
  rotationY: number;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = hovered ? 1.05 : 1;
    const next = MathUtils.lerp(groupRef.current.scale.x, target, delta * 6);
    groupRef.current.scale.setScalar(next);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
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
      {/* Mueble de madera — base con patas */}
      <WoodenDisplay />

      {/* Producto exhibido (si hay foto) */}
      {family.productPhoto ? (
        <ProductDisplay url={family.productPhoto} />
      ) : (
        <PlaceholderDisplay />
      )}

      {/* Nombre de la familia */}
      <Text
        position={[0, 0.18, 0.5]}
        rotation={[-Math.PI / 3, 0, 0]}
        fontSize={0.18}
        color={COL.fondo}
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
        textAlign="center"
      >
        {family.name}
      </Text>

      {hovered && (
        <pointLight
          position={[0, 1.6, 0.8]}
          intensity={1.2}
          color="#fff5e6"
          distance={3}
        />
      )}
    </group>
  );
}

function WoodenDisplay() {
  // Base con 4 patas y un tablero superior
  return (
    <group>
      {/* Tablero */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[2, 0.08, 1]} />
        <meshStandardMaterial color={COL.maderaMuebleTop} roughness={0.7} />
      </mesh>
      {/* Patas */}
      {[
        [-0.9, 0.4, -0.42],
        [0.9, 0.4, -0.42],
        [-0.9, 0.4, 0.42],
        [0.9, 0.4, 0.42],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial color={COL.maderaMueble} roughness={0.75} />
        </mesh>
      ))}
      {/* Repisa interior baja */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[1.85, 0.04, 0.85]} />
        <meshStandardMaterial color={COL.maderaMueble} roughness={0.8} />
      </mesh>
    </group>
  );
}

function ProductDisplay({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 1.55, 0]}>
      <planeGeometry args={[1.2, 1.5]} />
      <meshStandardMaterial map={texture} transparent roughness={0.4} />
    </mesh>
  );
}

function PlaceholderDisplay() {
  return (
    <mesh position={[0, 1.55, 0]}>
      <planeGeometry args={[1.2, 1.5]} />
      <meshStandardMaterial
        color={COL.paredCalida}
        roughness={0.9}
        opacity={0.5}
        transparent
      />
    </mesh>
  );
}
