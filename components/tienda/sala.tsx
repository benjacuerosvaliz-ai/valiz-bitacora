"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  MathUtils,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type PerspectiveCamera,
  type Texture,
} from "three";

const COL = {
  fondo: "#f7f6f2",
  cuero: "#7a3b1f",
  paredCalida: "#e9e3d3",
  pisoMadera: "#2e1d12",
  techo: "#ece6da",
  maderaOscura: "#3a2418",
  maderaMedia: "#5a3a22",
  maderaTopa: "#6b4528",
};

export type SalaVariant = {
  sku: string;
  colorValiz: string | null;
  photoUrl: string | null;
};

export type SalaShelving = {
  slug: string;
  name: string;
  variants: SalaVariant[];
  /** Posición en la sala — qué pared */
  wall: "N" | "E" | "S" | "W";
};

export default function Sala({ shelvings }: { shelvings: SalaShelving[] }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-fondo">
      <Canvas
        shadows
        camera={{ position: [0, 1.65, 0], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene
            shelvings={shelvings}
            onVariantClick={(slug) => router.push(`/piezas/${slug}`)}
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
          Arrastra para mirar alrededor · click en una pieza para entrar
        </p>
      </div>
    </div>
  );
}

function Scene({
  shelvings,
  onVariantClick,
}: {
  shelvings: SalaShelving[];
  onVariantClick: (slug: string) => void;
}) {
  // Mapeo pared → transform
  const wallTransforms: Record<
    SalaShelving["wall"],
    { position: [number, number, number]; rotationY: number }
  > = {
    N: { position: [0, 1.7, -9.79], rotationY: 0 },
    E: { position: [9.79, 1.7, 0], rotationY: -Math.PI / 2 },
    S: { position: [0, 1.7, 9.79], rotationY: Math.PI },
    W: { position: [-9.79, 1.7, 0], rotationY: Math.PI / 2 },
  };

  return (
    <>
      <CameraRig />
      <Lighting shelvingCount={shelvings.length} />
      <Room />
      {shelvings.map((s) => {
        const t = wallTransforms[s.wall];
        return (
          <ShelvingUnit
            key={s.slug}
            shelving={s}
            position={t.position}
            rotationY={t.rotationY}
            onVariantClick={() => onVariantClick(s.slug)}
          />
        );
      })}
    </>
  );
}

/**
 * Cámara con drag suave (target + lerp, sin inercia post-soltado). Pitch
 * limitado ±35° para que se pueda mirar al techo y al piso sin marearse.
 */
function CameraRig() {
  const { camera, gl } = useThree();
  const yawTarget = useRef(0);
  const pitchTarget = useRef(0);
  const yawCurrent = useRef(0);
  const pitchCurrent = useRef(0);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const PITCH_LIMIT = MathUtils.degToRad(35);
  const SENSITIVITY = 0.003;
  const LERP = 0.18;

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";

    const down = (e: PointerEvent) => {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (el as HTMLElement).setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      yawTarget.current -= dx * SENSITIVITY;
      pitchTarget.current = MathUtils.clamp(
        pitchTarget.current - dy * SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT,
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
    // Lerp suave hacia el target — al soltar el drag, target deja de
    // cambiar y current converge en pocos frames (sin inercia residual).
    yawCurrent.current = MathUtils.lerp(
      yawCurrent.current,
      yawTarget.current,
      LERP,
    );
    pitchCurrent.current = MathUtils.lerp(
      pitchCurrent.current,
      pitchTarget.current,
      LERP,
    );
    const cam = camera as PerspectiveCamera;
    cam.rotation.order = "YXZ";
    cam.rotation.y = yawCurrent.current;
    cam.rotation.x = pitchCurrent.current;
  });

  return null;
}

function Lighting({ shelvingCount }: { shelvingCount: number }) {
  return (
    <>
      {/* Ambient general — sube la base para que no quede oscuro */}
      <ambientLight intensity={0.85} color="#fff5e6" />
      {/* Hemisferio: cielo cálido arriba, piso marrón abajo — da gradient natural */}
      <hemisphereLight
        args={["#fff2d8", "#3a2418", 0.6]}
      />
      {/* Track lighting cenital cálida — 4 puntos fuertes que iluminan las paredes/shelves */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        const r = 5;
        return (
          <pointLight
            key={i}
            position={[Math.sin(a) * r, 4.0, -Math.cos(a) * r]}
            intensity={3.0}
            color="#fff0d0"
            distance={18}
            decay={1.4}
          />
        );
      })}
      {/* Cenital general */}
      <directionalLight
        position={[3, 8, 4]}
        intensity={0.6}
        color="#fff5e6"
      />
    </>
  );
}

function Room() {
  // Texturas reales (Polyhaven CC0). useTexture acepta un modificador para
  // configurar el tiling antes de aplicarse.
  const floorTex = useTexture("/textures/wood_floor_diff.jpg", configureTile(4, 4));
  const wallTex = useTexture("/textures/wall_plaster_diff.jpg", configureTile(3, 1.5));

  return (
    <group>
      {/* Piso con madera real */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial map={floorTex} roughness={0.75} />
      </mesh>
      {/* Techo: color plano cálido (no necesita textura) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={COL.techo} roughness={1} />
      </mesh>
      {/* Paredes con textura yeso */}
      {[
        { pos: [0, 2.25, -10] as const, rot: [0, 0, 0] as const },
        { pos: [0, 2.25, 10] as const, rot: [0, Math.PI, 0] as const },
        { pos: [-10, 2.25, 0] as const, rot: [0, Math.PI / 2, 0] as const },
        { pos: [10, 2.25, 0] as const, rot: [0, -Math.PI / 2, 0] as const },
      ].map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot}>
          <planeGeometry args={[20, 4.5]} />
          <meshStandardMaterial map={wallTex} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Helper para useTexture: configura RepeatWrapping y tile size, y marca
 * el color space como sRGB para que los colores no se desaturen.
 */
function configureTile(repeatX: number, repeatY: number) {
  return (texture: Texture | Texture[]) => {
    const apply = (t: Texture) => {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.colorSpace = SRGBColorSpace;
    };
    if (Array.isArray(texture)) texture.forEach(apply);
    else apply(texture);
  };
}

/**
 * Shelving unit estilo tienda Valiz: backboard de madera oscura + grid
 * 5×4 de cubbies separados por divisores y repisas. Cada cubby puede
 * tener un producto adentro (foto transparente como plane).
 */
function ShelvingUnit({
  shelving,
  position,
  rotationY,
  onVariantClick,
}: {
  shelving: SalaShelving;
  position: [number, number, number];
  rotationY: number;
  onVariantClick: (sku: string) => void;
}) {
  const COLS = 5;
  const ROWS = 4;
  const W = 3.6;
  const H = 3.0;
  const D = 0.42;
  const T = 0.04; // grosor maderas

  const cubbyW = (W - T * (COLS + 1)) / COLS;
  const cubbyH = (H - T * (ROWS + 1)) / ROWS;

  // Textura de madera real para todo el mueble
  const woodTex = useTexture(
    "/textures/wood_dark_diff.jpg",
    configureTile(1, 1),
  );
  const woodTexFine = useTexture(
    "/textures/wood_dark_diff.jpg",
    configureTile(0.4, 0.4),
  );

  const cubbyCenters = useMemo(() => {
    const out: { x: number; y: number; index: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = -W / 2 + T + cubbyW / 2 + col * (cubbyW + T);
        const y = H / 2 - T - cubbyH / 2 - row * (cubbyH + T);
        out.push({ x, y, index: row * COLS + col });
      }
    }
    return out;
  }, [cubbyW, cubbyH]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Backboard con textura de madera */}
      <mesh position={[0, 0, -D / 2]}>
        <boxGeometry args={[W, H, 0.025]} />
        <meshStandardMaterial map={woodTexFine} roughness={0.75} />
      </mesh>

      {/* Verticales (COLS + 1) */}
      {Array.from({ length: COLS + 1 }).map((_, i) => {
        const x = -W / 2 + T / 2 + i * (cubbyW + T);
        return (
          <mesh key={`v-${i}`} position={[x, 0, 0]} castShadow>
            <boxGeometry args={[T, H, D]} />
            <meshStandardMaterial map={woodTex} roughness={0.7} />
          </mesh>
        );
      })}

      {/* Horizontales (ROWS + 1) */}
      {Array.from({ length: ROWS + 1 }).map((_, i) => {
        const y = -H / 2 + T / 2 + i * (cubbyH + T);
        return (
          <mesh key={`h-${i}`} position={[0, y, 0]} castShadow>
            <boxGeometry args={[W, T, D]} />
            <meshStandardMaterial map={woodTex} roughness={0.7} />
          </mesh>
        );
      })}

      {/* Productos en cubbies */}
      {cubbyCenters.map((c) => {
        const variant = shelving.variants[c.index];
        if (!variant || !variant.photoUrl) {
          // Cubby vacía — solo el backboard se ve
          return null;
        }
        return (
          <ProductInCubby
            key={variant.sku}
            url={variant.photoUrl}
            label={variant.colorValiz}
            position={[c.x, c.y, D / 2 - 0.04]}
            size={[cubbyW * 0.78, cubbyH * 0.82]}
            onClick={() => onVariantClick(variant.sku)}
          />
        );
      })}

      {/* Nombre de la familia, abajo */}
      <Text
        position={[0, -H / 2 - 0.35, D / 2]}
        fontSize={0.18}
        color={COL.fondo}
        anchorX="center"
        anchorY="top"
        maxWidth={W}
        textAlign="center"
      >
        {shelving.name}
      </Text>
    </group>
  );
}

function ProductInCubby({
  url,
  label,
  position,
  size,
  onClick,
}: {
  url: string;
  label: string | null;
  position: [number, number, number];
  size: [number, number];
  onClick: () => void;
}) {
  const texture = useTexture(url);
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const target = hovered ? 1.06 : 1;
    const next = MathUtils.lerp(groupRef.current.scale.x, target, dt * 7);
    groupRef.current.scale.setScalar(next);
  });

  return (
    <group
      ref={groupRef}
      position={position}
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
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial map={texture} transparent roughness={0.45} />
      </mesh>
      {hovered && label && (
        <Text
          position={[0, -size[1] / 2 - 0.04, 0]}
          fontSize={0.05}
          color={COL.fondo}
          anchorX="center"
          anchorY="top"
        >
          {label}
        </Text>
      )}
    </group>
  );
}
