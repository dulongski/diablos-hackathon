/**
 * La escena 3D: trayectorias reales sobre un campo de béisbol.
 *
 * Las curvas salen del mismo integrador que alimenta al modelo, así que lo que se ve y lo
 * que se puntúa son el mismo lanzamiento.
 *
 * El encuadre se calcula, no se fija a mano. Una cámara con posición y campo de visión
 * hardcodeados se ve bien en el tamaño donde se afinó y se desarma en cualquier otro: el
 * plato se va de cuadro o la pelota parece caer fuera de la zona.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ZONA } from '../lib/cloud';
import { RUBBER_Y, Y_PLATE_FRONT, type Trajectory } from '../lib/physics';
import { color } from '../settings';

export const PLATE_Z = RUBBER_Y - Y_PLATE_FRONT;   // frente del home en coordenadas de render
const APEX_Z = RUBBER_Y;                            // la punta del home, donde nace el diamante
// Los colores salen de la paleta activa: rojo = Harp Helú, azul = nivel del mar.
const COLOR_ALT = color('--diablo', '#E23B2E');
const COLOR_MAR = color('--nivel-mar', '#5B9DBF');
const FONDO = color('--escena', '#0F0D0C');

/**
 * Los dos encuadres.
 *
 * `plato` se acerca al desenlace: la zona llena el cuadro y se leen las pulgadas de
 * separación. `campo` retrocede hasta ver el montículo y el diamante completo, que es lo
 * que hace falta cuando no se muestra un lanzamiento sino un abanico de ellos.
 *
 * `alto` y `ancho` son los pies que deben verse como mínimo a la distancia del punto al
 * que se mira; de ahí y del aspecto real del contenedor sale el campo de visión.
 */
export type Vista = 'plato' | 'campo';

const ENCUADRES: Record<Vista, {
  ojoXY: [number, number]; ojoZ: number;
  miraXY: [number, number]; miraZ: number;
  alto: number; ancho: number;
}> = {
  plato: {
    ojoXY: [2.6, 4.3], ojoZ: PLATE_Z + 13,
    miraXY: [0, (ZONA.abajo + ZONA.arriba) / 2], miraZ: PLATE_Z,
    alto: 5.9, ancho: 5.0,
  },
  campo: {
    ojoXY: [0, 9], ojoZ: PLATE_Z + 21,
    miraXY: [0, 3.0], miraZ: PLATE_Z - 30,
    alto: 25, ancho: 86,
  },
};

function ojoDe(v: Vista) { const e = ENCUADRES[v]; return new THREE.Vector3(e.ojoXY[0], e.ojoXY[1], e.ojoZ); }
function miraDe(v: Vista) { const e = ENCUADRES[v]; return new THREE.Vector3(e.miraXY[0], e.miraXY[1], e.miraZ); }

/**
 * Campo de visión que garantiza el mínimo de pies visibles a lo alto y a lo ancho, sea
 * cual sea el aspecto del contenedor.
 *
 * La cámara se declara con `PerspectiveCamera` en vez de configurarse dentro de un efecto:
 * `OrbitControls` reorienta la cámara en cada cuadro desde su propio `target`, así que
 * cualquier posición impuesta por fuera se pierde en el siguiente frame.
 */
function fovPara(vista: Vista, aspect: number): number {
  const e = ENCUADRES[vista];
  const dist = ojoDe(vista).distanceTo(miraDe(vista));
  const porAlto = 2 * Math.atan(e.alto / 2 / dist);
  const porAncho = 2 * Math.atan(e.ancho / 2 / dist / Math.max(aspect, 0.2));
  return THREE.MathUtils.radToDeg(Math.max(porAlto, porAncho));
}

/* ------------------------------------------------------------------ el campo */

const LADO = 90;                       // pies entre bases
const DIAG = LADO / Math.SQRT2;        // 63.64: desplazamiento lateral de primera y tercera
const MEDIA_BASE = 0.625;              // bases de 15 pulgadas

/** Coordenadas de render de los cuatro vértices del diamante, medidos desde la punta del home. */
const HOME = new THREE.Vector2(0, APEX_Z);
const PRIMERA = new THREE.Vector2(DIAG, APEX_Z - DIAG);
const SEGUNDA = new THREE.Vector2(0, APEX_Z - 2 * DIAG);
const TERCERA = new THREE.Vector2(-DIAG, APEX_Z - DIAG);

const Y = 0.02;   // las marcas van apenas sobre el suelo para que no peleen con él

function base(c: THREE.Vector2, color: string, ancho = 2) {
  const b = MEDIA_BASE;
  return (
    <Line
      points={[[c.x - b, Y, c.y - b], [c.x + b, Y, c.y - b],
               [c.x + b, Y, c.y + b], [c.x - b, Y, c.y + b], [c.x - b, Y, c.y - b]]}
      color={color} lineWidth={ancho}
    />
  );
}

function circulo(cx: number, cz: number, r: number, color: string, ancho = 1.2, n = 48) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), Y, cz + r * Math.sin(a)]);
  }
  return <Line points={pts} color={color} lineWidth={ancho} />;
}

/** El diamante en perspectiva: líneas de foul, bases, montículo, cajas de bateo y home. */
function Campo({ detallado }: { detallado: boolean }) {
  const w = ZONA.medioAncho;
  // Las líneas de foul salen de la punta del home y pasan por primera y tercera.
  const largoFoul = 190;
  const dir = 1 / Math.SQRT2;
  // En el plano corto el campo es contexto, no contenido: si las cales conservan el brillo
  // que necesitan en la vista amplia, le compiten a la zona de strike.
  const cal = detallado ? '#C6BFB8' : '#4E4741';
  const calFuerte = detallado ? '#F2EDE7' : '#6E655E';

  return (
    <group>
      {/* Suelo en dos tonos: el pasto y la tierra del cuadro. Sin esta separación las
          líneas flotan en negro y el diamante no se lee como un campo. */}
      <mesh position={[0, -0.01, APEX_Z - 110]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[520, 460]} />
        <meshBasicMaterial color={FONDO} />
      </mesh>
      {/* Los caminos entre bases, no un disco de tierra: dentro del cuadro hay pasto.
          Un círculo relleno tapaba el diamante entero y lo volvía una mancha. */}
      {detallado && [[HOME, PRIMERA], [PRIMERA, SEGUNDA], [SEGUNDA, TERCERA], [TERCERA, HOME]]
        .map(([a, b], i) => {
          const mx = (a.x + b.x) / 2, mz = (a.y + b.y) / 2;
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          return (
            <mesh key={i} position={[mx, 0.005, mz]} rotation={[-Math.PI / 2, 0, -ang]}>
              <planeGeometry args={[LADO, 6]} />
              <meshBasicMaterial color="#261B14" />
            </mesh>
          );
        })}
      {/* tierra del montículo */}
      {detallado && (
        <mesh position={[0, 0.01, APEX_Z - 59]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[9, 40]} />
          <meshBasicMaterial color="#31241B" />
        </mesh>
      )}
      {/* tierra del home */}
      {detallado && (
        <mesh position={[0, 0.008, APEX_Z - 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[10.5, 40]} />
          <meshBasicMaterial color="#261B14" />
        </mesh>
      )}

      {/* líneas de foul */}
      <Line points={[[0, Y, APEX_Z], [largoFoul * dir, Y, APEX_Z - largoFoul * dir]]}
            color={cal} lineWidth={detallado ? 2.2 : 1.4} />
      <Line points={[[0, Y, APEX_Z], [-largoFoul * dir, Y, APEX_Z - largoFoul * dir]]}
            color={cal} lineWidth={detallado ? 2.2 : 1.4} />

      {/* el diamante */}
      <Line points={[[HOME.x, Y, HOME.y], [PRIMERA.x, Y, PRIMERA.y],
                     [SEGUNDA.x, Y, SEGUNDA.y], [TERCERA.x, Y, TERCERA.y], [HOME.x, Y, HOME.y]]}
            color={detallado ? '#7A6B5E' : '#332C28'} lineWidth={1.6} />

      {detallado && base(PRIMERA, '#EDE7E0', 3)}
      {detallado && base(SEGUNDA, '#EDE7E0', 3)}
      {detallado && base(TERCERA, '#EDE7E0', 3)}

      {/* montículo: círculo de 9 pies y la goma, a 60 pies 6 pulgadas del home */}
      {circulo(0, APEX_Z - 59, 9, detallado ? '#6E5B4C' : '#332B25', 1.8)}
      <Line points={[[-1, Y, 0.25], [1, Y, 0.25], [1, Y, -0.25], [-1, Y, -0.25], [-1, Y, 0.25]]}
            color={calFuerte} lineWidth={2.6} />

      {/* cajas de bateo */}
      {detallado && [1, -1].map(lado => (
        <Line key={lado}
              points={[[lado * 1.21, Y, APEX_Z - 2.3], [lado * 5.21, Y, APEX_Z - 2.3],
                       [lado * 5.21, Y, APEX_Z + 3.7], [lado * 1.21, Y, APEX_Z + 3.7],
                       [lado * 1.21, Y, APEX_Z - 2.3]]}
              color="#9E948C" lineWidth={1.6} />
      ))}

      {/* home: la punta mira al cátcher, el borde ancho al pitcher */}
      <Line points={[[-w, Y, PLATE_Z], [w, Y, PLATE_Z], [w, Y, PLATE_Z + 0.71],
                     [0, Y, APEX_Z], [-w, Y, PLATE_Z + 0.71], [-w, Y, PLATE_Z]]}
            color={calFuerte} lineWidth={2.6} />
    </group>
  );
}

function ZonaStrike() {
  const { medioAncho: w, abajo: b, arriba: t } = ZONA;
  const h = t - b;
  return (
    <group>
      <Line points={[[-w, b, PLATE_Z], [w, b, PLATE_Z], [w, t, PLATE_Z], [-w, t, PLATE_Z], [-w, b, PLATE_Z]]}
            color="#9A918C" lineWidth={2.4} />
      {[1, 2].map(k => (
        <group key={k}>
          <Line points={[[-w + (2 * w * k) / 3, b, PLATE_Z], [-w + (2 * w * k) / 3, t, PLATE_Z]]}
                color="#4C4541" lineWidth={1} />
          <Line points={[[-w, b + (h * k) / 3, PLATE_Z], [w, b + (h * k) / 3, PLATE_Z]]}
                color="#4C4541" lineWidth={1} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ pelotas */

function Pelota({ traj, color, t, radio }: {
  traj: Trajectory; color: string; t: React.MutableRefObject<number>; radio: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const curva = useMemo(() => traj.points.map(p => new THREE.Vector3(p[0], p[1], p[2])), [traj]);
  const vuelo = traj.shape.zoneTime;

  useFrame(() => {
    if (!ref.current) return;
    // Cada pelota avanza en tiempo real, no en fracción de recorrido: por eso la de
    // altitud llega antes, porque el aire la frena menos.
    const f = Math.min(t.current / vuelo, 1);
    const i = f * (curva.length - 1);
    const a = curva[Math.floor(i)];
    const b = curva[Math.min(Math.ceil(i), curva.length - 1)];
    ref.current.position.lerpVectors(a, b, i - Math.floor(i));
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radio, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.4} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ escena */

export interface Par { alt: Trajectory; mar: Trajectory }

export interface Escena3DProps {
  /** Pares de trayectorias (mismo brazo, dos aires). El primero lleva la lectura. */
  pares: Par[];
  vista?: Vista;
  /** Travesaños entre las dos trayectorias del primer par, para leer la separación. */
  escalera?: boolean;
  onProgreso?: (pulgadas: number, pct: number) => void;
  alto?: string;
}

function Contenido({ pares, vista = 'plato', escalera, onProgreso }: Escena3DProps) {
  const { size } = useThree();
  const t = useRef(0);
  const [quieto, setQuieto] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setQuieto(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const principal = pares[0];
  const lento = principal
    ? Math.max(...pares.map(p => Math.max(p.alt.shape.zoneTime, p.mar.shape.zoneTime)))
    : 0.4;

  useFrame((_, delta) => {
    if (!principal) return;
    if (quieto) {
      // Con movimiento reducido las pelotas se quedan en el plato: la separación final se
      // ve igual, pero no hay ciclo repitiéndose.
      t.current = lento;
      onProgreso?.(0, 1);
      return;
    }
    t.current += delta * 0.34;           // cámara lenta: el vuelo real dura ~0.4 s
    if (t.current > lento + 1.2) t.current = 0;

    const f = Math.min(t.current / lento, 1);
    const i = Math.floor(f * (principal.alt.points.length - 1));
    const j = Math.floor(f * (principal.mar.points.length - 1));
    const a = principal.alt.points[i], b = principal.mar.points[j];
    onProgreso?.(a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) * 12 : 0, f);
  });

  const muchos = pares.length > 1;
  const fov = fovPara(vista, size.width / Math.max(size.height, 1));
  const ojo = ojoDe(vista);
  const mira = miraDe(vista);
  const radio = muchos ? 0.16 : 0.145;

  return (
    <>
      <PerspectiveCamera makeDefault fov={fov} near={0.5} far={600}
                         position={[ojo.x, ojo.y, ojo.z]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 24, PLATE_Z - 30]} intensity={1.15} />

      <Campo detallado={vista === 'campo'} />
      <ZonaStrike />

      {pares.map((p, k) => (
        <group key={k}>
          <Line points={p.mar.points} color={COLOR_MAR}
                lineWidth={muchos ? 1.6 : 3} transparent opacity={muchos ? 0.55 : 0.92} />
          <Line points={p.alt.points} color={COLOR_ALT}
                lineWidth={muchos ? 1.6 : 3.4} transparent opacity={muchos ? 0.6 : 1} />
        </group>
      ))}

      {escalera && principal && Array.from({ length: 8 }, (_, i) => {
        // Cuatro pulgadas sobre sesenta pies son invisibles a escala real. En vez de
        // exagerar la distancia —que sería mentir sobre la magnitud— se dibujan travesaños
        // entre las dos trayectorias. La separación se lee porque los travesaños crecen.
        const f = 0.3 + (i / 7) * 0.7;
        const a = principal.alt.points[Math.floor(f * (principal.alt.points.length - 1))];
        const b = principal.mar.points[Math.floor(f * (principal.mar.points.length - 1))];
        return a && b ? (
          <Line key={i} points={[a, b]} color="#E8B54A" lineWidth={1}
                transparent opacity={0.15 + f * 0.45} />
        ) : null;
      })}

      {/* Todas las pelotas vuelan, no solo la principal: el abanico entero sale de la mano
          en el mismo instante y llega separado, que es justamente lo que se quiere mostrar. */}
      {pares.map((p, k) => (
        <group key={k}>
          <Pelota traj={p.mar} color={COLOR_MAR} t={t} radio={radio} />
          <Pelota traj={p.alt} color={COLOR_ALT} t={t} radio={radio} />
        </group>
      ))}

      <OrbitControls
        makeDefault
        target={[mira.x, mira.y, mira.z]}
        enablePan={false}
        // La rueda pertenece a la página: un lienzo ancho que se traga el scroll deja al
        // lector atrapado.
        enableZoom={false}
        minDistance={6}
        maxDistance={180}
        maxPolarAngle={Math.PI / 2.03}
      />
    </>
  );
}

export function Escena3D(props: Escena3DProps) {
  return (
    // `height` nunca puede quedar en undefined: pisaría el 100% que R3F pone por omisión
    // y el lienzo colapsaría a los 150 px por defecto de un <canvas>.
    <Canvas dpr={[1, 2]} gl={{ antialias: true }}
            style={{ width: '100%', height: props.alto ?? '100%' }}>
      <color attach="background" args={[FONDO]} />
      <fog attach="fog" args={[FONDO, props.vista === 'campo' ? 150 : 46, 320]} />
      <Contenido {...props} />
    </Canvas>
  );
}
