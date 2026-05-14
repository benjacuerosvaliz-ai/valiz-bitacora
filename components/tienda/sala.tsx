"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MathUtils,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
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

const SHOPIFY_BASE = "https://www.valiz.cl/products/";
const nf = new Intl.NumberFormat("es-CL");

export type SalaVariant = {
  sku: string;
  colorValiz: string | null;
  photoUrl: string | null;
  precio: number | null;
  shopifyHandle: string | null;
};

export type SalaShelving = {
  slug: string;
  name: string;
  variants: SalaVariant[];
  wall: "N" | "E" | "S" | "W";
};

type FocusWall = SalaShelving["wall"] | null;

const WALL_TRANSFORMS: Record<
  Exclude<FocusWall, null>,
  { shelving: [number, number, number]; rotation: number; cameraNear: [number, number, number]; yaw: number }
> = {
  N: {
    shelving: [0, 1.7, -9.79],
    rotation: 0,
    cameraNear: [0, 1.65, -4],
    yaw: 0,
  },
  E: {
    shelving: [9.79, 1.7, 0],
    rotation: -Math.PI / 2,
    cameraNear: [4, 1.65, 0],
    yaw: -Math.PI / 2,
  },
  S: {
    shelving: [0, 1.7, 9.79],
    rotation: Math.PI,
    cameraNear: [0, 1.65, 4],
    yaw: Math.PI,
  },
  W: {
    shelving: [-9.79, 1.7, 0],
    rotation: Math.PI / 2,
    cameraNear: [-4, 1.65, 0],
    yaw: Math.PI / 2,
  },
};

export default function Sala({ shelvings }: { shelvings: SalaShelving[] }) {
  const router = useRouter();
  const [focus, setFocus] = useState<FocusWall>(null);
  const [preview, setPreview] = useState<{
    variant: SalaVariant;
    familyName: string;
  } | null>(null);

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
            focus={focus}
            onSignClick={(wall) => setFocus(wall)}
            onVariantClick={(variant, familyName) => {
              setPreview({ variant, familyName });
            }}
          />
        </Suspense>
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
        <div className="flex flex-col items-center gap-3">
          {focus && (
            <button
              onClick={() => setFocus(null)}
              className="pointer-events-auto border border-tinta bg-fondo/80 px-5 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-tinta backdrop-blur-sm transition-colors hover:bg-tinta hover:text-fondo"
            >
              ← Volver al centro
            </button>
          )}
          <p className="text-center font-sans text-[11px] uppercase tracking-[0.22em] text-niebla">
            {focus
              ? "Click en una pieza para verla en detalle"
              : "Mueve el cursor para mirar · click en el letrero para acercarte"}
          </p>
        </div>
      </div>

      {preview && (
        <PreviewOverlay
          variant={preview.variant}
          familyName={preview.familyName}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function Scene({
  shelvings,
  focus,
  onSignClick,
  onVariantClick,
}: {
  shelvings: SalaShelving[];
  focus: FocusWall;
  onSignClick: (wall: Exclude<FocusWall, null>) => void;
  onVariantClick: (variant: SalaVariant, familyName: string) => void;
}) {
  return (
    <>
      <CameraRig focus={focus} />
      <Lighting />
      <Room />
      {shelvings.map((s) => {
        const t = WALL_TRANSFORMS[s.wall];
        return (
          <ShelvingUnit
            key={s.slug}
            shelving={s}
            position={t.shelving}
            rotationY={t.rotation}
            onSignClick={() => onSignClick(s.wall)}
            onVariantClick={(variant) => onVariantClick(variant, s.name)}
          />
        );
      })}
    </>
  );
}

/**
 * CameraRig:
 *  - Desktop (hover capable): cursor X/Y en zona externa rota la cámara
 *    continuamente con dead-zone central. No requiere click.
 *  - Mobile/touch: drag con dirección "drag derecha = mirar derecha"
 *    (lo opuesto al patrón Street View; el usuario lo pidió así).
 *  - Cuando focus != null: la cámara se anima a una posición cerca de
 *    esa pared y mira a esa pared, ignorando input del cursor.
 */
function CameraRig({ focus }: { focus: FocusWall }) {
  const { camera, gl } = useThree();
  const yawTarget = useRef(0);
  const pitchTarget = useRef(0);
  const yawCurrent = useRef(0);
  const pitchCurrent = useRef(0);
  const posTarget = useRef<[number, number, number]>([0, 1.65, 0]);

  const cursor = useRef({ x: 0, y: 0, inside: false });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const isHoverDevice = useRef(false);

  const PITCH_LIMIT = MathUtils.degToRad(35);
  const HOVER_DEAD = 0.18; // dead zone radius (0-1)
  const HOVER_SPEED = 1.6; // rad/seg max
  const SENS_TOUCH = 0.0035;
  const LERP_ROT = 0.16;
  const LERP_POS = 0.08;

  useEffect(() => {
    isHoverDevice.current = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";

    const move = (e: PointerEvent) => {
      if (isHoverDevice.current) {
        // Desktop: tracked cursor position (normalizado -1..1)
        const rect = el.getBoundingClientRect();
        cursor.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        cursor.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        cursor.current.inside = true;
      } else if (dragging.current) {
        // Mobile: drag — dirección invertida vs Street View (drag derecha = mirar derecha)
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        yawTarget.current += dx * SENS_TOUCH;
        pitchTarget.current = MathUtils.clamp(
          pitchTarget.current + dy * SENS_TOUCH,
          -PITCH_LIMIT,
          PITCH_LIMIT,
        );
      }
    };
    const leave = () => {
      cursor.current.inside = false;
    };
    const down = (e: PointerEvent) => {
      if (isHoverDevice.current) return;
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (el as HTMLElement).setPointerCapture(e.pointerId);
    };
    const up = (e: PointerEvent) => {
      if (isHoverDevice.current) return;
      dragging.current = false;
      try {
        (el as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  // Cuando cambia el focus, calcular nuevo target de cámara
  useEffect(() => {
    if (focus) {
      const t = WALL_TRANSFORMS[focus];
      posTarget.current = t.cameraNear;
      yawTarget.current = t.yaw;
      pitchTarget.current = 0;
    } else {
      posTarget.current = [0, 1.65, 0];
    }
  }, [focus]);

  useFrame((_, delta) => {
    // Si no estamos enfocados, el cursor (desktop) o el drag (mobile) maneja
    if (!focus && isHoverDevice.current && cursor.current.inside) {
      const cx = cursor.current.x;
      const cy = cursor.current.y;
      // Solo rota si el cursor está fuera del dead-zone
      const absX = Math.abs(cx);
      const absY = Math.abs(cy);
      if (absX > HOVER_DEAD) {
        const speed =
          Math.sign(cx) * Math.min(1, (absX - HOVER_DEAD) / (1 - HOVER_DEAD));
        yawTarget.current += speed * HOVER_SPEED * delta;
      }
      if (absY > HOVER_DEAD) {
        const speed =
          -Math.sign(cy) * Math.min(1, (absY - HOVER_DEAD) / (1 - HOVER_DEAD));
        pitchTarget.current = MathUtils.clamp(
          pitchTarget.current + speed * HOVER_SPEED * 0.6 * delta,
          -PITCH_LIMIT,
          PITCH_LIMIT,
        );
      }
    }

    // Lerp rotación
    yawCurrent.current = MathUtils.lerp(
      yawCurrent.current,
      yawTarget.current,
      LERP_ROT,
    );
    pitchCurrent.current = MathUtils.lerp(
      pitchCurrent.current,
      pitchTarget.current,
      LERP_ROT,
    );

    const cam = camera as PerspectiveCamera;
    cam.rotation.order = "YXZ";
    cam.rotation.y = yawCurrent.current;
    cam.rotation.x = pitchCurrent.current;

    // Lerp posición (para el dolly al focus / volver al centro)
    cam.position.x = MathUtils.lerp(cam.position.x, posTarget.current[0], LERP_POS);
    cam.position.y = MathUtils.lerp(cam.position.y, posTarget.current[1], LERP_POS);
    cam.position.z = MathUtils.lerp(cam.position.z, posTarget.current[2], LERP_POS);
  });

  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.85} color="#fff5e6" />
      <hemisphereLight args={["#fff2d8", "#3a2418", 0.6]} />
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
      <directionalLight position={[3, 8, 4]} intensity={0.6} color="#fff5e6" />
    </>
  );
}

function Room() {
  const floorTex = useTexture("/textures/wood_floor_diff.jpg", configureTile(4, 4));
  const wallTex = useTexture("/textures/wall_plaster_diff.jpg", configureTile(3, 1.5));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial map={floorTex} roughness={0.75} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={COL.techo} roughness={1} />
      </mesh>
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

function ShelvingUnit({
  shelving,
  position,
  rotationY,
  onSignClick,
  onVariantClick,
}: {
  shelving: SalaShelving;
  position: [number, number, number];
  rotationY: number;
  onSignClick: () => void;
  onVariantClick: (variant: SalaVariant) => void;
}) {
  const COLS = 5;
  const ROWS = 4;
  const W = 3.6;
  const H = 3.0;
  const D = 0.42;
  const T = 0.04;

  const cubbyW = (W - T * (COLS + 1)) / COLS;
  const cubbyH = (H - T * (ROWS + 1)) / ROWS;

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
      {/* Backboard */}
      <mesh position={[0, 0, -D / 2]}>
        <boxGeometry args={[W, H, 0.025]} />
        <meshStandardMaterial map={woodTexFine} roughness={0.75} />
      </mesh>

      {/* Verticales */}
      {Array.from({ length: COLS + 1 }).map((_, i) => {
        const x = -W / 2 + T / 2 + i * (cubbyW + T);
        return (
          <mesh key={`v-${i}`} position={[x, 0, 0]} castShadow>
            <boxGeometry args={[T, H, D]} />
            <meshStandardMaterial map={woodTex} roughness={0.7} />
          </mesh>
        );
      })}

      {/* Horizontales */}
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
        if (!variant || !variant.photoUrl) return null;
        return (
          <ProductInCubby
            key={variant.sku}
            url={variant.photoUrl}
            label={variant.colorValiz}
            position={[c.x, c.y, D / 2 - 0.04]}
            size={[cubbyW * 0.78, cubbyH * 0.82]}
            onClick={() => onVariantClick(variant)}
          />
        );
      })}

      {/* Letrero de madera arriba del shelving */}
      <SignBoard
        text={shelving.name}
        position={[0, H / 2 + 0.55, 0]}
        onClick={onSignClick}
      />
    </group>
  );
}

function SignBoard({
  text,
  position,
  onClick,
}: {
  text: string;
  position: [number, number, number];
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  // Textura de madera clara para el letrero (distinta de la madera oscura
  // de los muebles)
  const lightWood = useTexture(
    "/textures/wood_light_diff.jpg",
    configureTile(1, 0.4),
  );

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const target = hovered ? 1.04 : 1;
    const next = MathUtils.lerp(groupRef.current.scale.x, target, dt * 6);
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
      {/* Tabla de madera clara — un poco más grande y con bevel para
          dimensión */}
      <mesh castShadow>
        <boxGeometry args={[2.8, 0.6, 0.06]} />
        <meshStandardMaterial map={lightWood} roughness={0.7} />
      </mesh>

      {/* Texto pirograbado: color café muy oscuro, casi negro quemado.
          Ligeramente hundido en la madera (z = 0.020 vs surface 0.030) y
          duplicado con offset para simular el "halo" carbonizado del
          pirograbado real. */}
      {/* Sombra de pirograbado (halo café) */}
      <Text
        position={[0, -0.01, 0.024]}
        fontSize={0.28}
        color="#6b3a14"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
        outlineWidth={0.006}
        outlineColor="#6b3a14"
        outlineOpacity={0.4}
      >
        {text}
      </Text>
      {/* Texto principal café oscuro quemado, levemente hundido */}
      <Text
        position={[0, 0, 0.028]}
        fontSize={0.28}
        color="#2a1206"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
      >
        {text}
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

/**
 * Overlay HTML que aparece al hacer click en una alforja: muestra la foto
 * grande flotando con tilt al cursor (placeholder hasta que tengamos un
 * modelo 3D real), color, precio y botón comprar que abre la página de
 * Shopify en una pestaña nueva.
 */
function PreviewOverlay({
  variant,
  familyName,
  onClose,
}: {
  variant: SalaVariant;
  familyName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[60] flex flex-col bg-fondo/95 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-baseline justify-between border-b border-piedra px-6 py-5 sm:px-10 sm:py-6">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cuero">
              {familyName}
            </p>
            <p className="mt-1 font-serif text-2xl leading-none tracking-[-0.015em] sm:text-3xl">
              {variant.colorValiz ?? variant.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-piedra font-serif text-2xl text-niebla transition-colors hover:border-cuero hover:text-cuero"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[2fr_1fr]">
          <FloatingPreview url={variant.photoUrl} familyName={familyName} />

          <div className="flex flex-col justify-between gap-8 border-t border-piedra px-6 py-6 sm:px-10 lg:border-l lg:border-t-0 lg:py-10">
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-niebla">
                Color
              </p>
              <p className="mt-2 font-serif text-3xl leading-tight">
                {variant.colorValiz ?? "Por confirmar"}
              </p>
            </div>

            <div className="border-t border-piedra pt-6">
              {variant.precio && (
                <p className="font-serif text-3xl leading-none tracking-[-0.015em]">
                  ${nf.format(variant.precio)}
                  <span className="ml-1 font-sans text-[10px] uppercase tracking-[0.22em] text-niebla">
                    CLP
                  </span>
                </p>
              )}
              {variant.shopifyHandle ? (
                <a
                  href={`${SHOPIFY_BASE}${variant.shopifyHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-3 bg-tinta px-6 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-fondo transition-colors duration-300 hover:bg-cuero"
                >
                  Comprar en valiz.cl
                  <span>→</span>
                </a>
              ) : (
                <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.18em] text-niebla">
                  Próximamente en la tienda
                </p>
              )}
              <p className="mt-4 font-serif text-sm italic leading-relaxed text-niebla">
                Vista 3D en proceso — pronto podrás girar la pieza completa.
                Por ahora la pieza flota con el cursor.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function FloatingPreview({
  url,
  familyName,
}: {
  url: string | null;
  familyName: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (ny - 0.5) * -16, y: (nx - 0.5) * 24 });
  };

  if (!url) {
    return (
      <div className="flex items-center justify-center">
        <p className="font-serif italic text-niebla">Foto pronto</p>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ perspective: 1600 }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          y: [-10, 10, -10],
        }}
        transition={{
          rotateX: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          rotateY: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-[80%] w-[80%]"
      >
        <Image
          src={url}
          alt={familyName}
          fill
          sizes="(min-width: 1024px) 50vw, 90vw"
          className="object-contain"
        />
      </motion.div>
    </div>
  );
}
