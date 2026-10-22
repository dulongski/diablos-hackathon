/**
 * El diamante en 3D, de día. Una sola pelota de béisbol vuela por la trayectoria del estadio elegido, y una
 * línea punteada azul marca por dónde habría pasado a nivel del mar.
 *
 * Coordenadas de render (las mismas del integrador): x lateral, y altura, z desde la goma hacia el plato,
 * en pies. La goma está en z = 0 y la punta del plato en z = 60.5.
 */
import { Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RUBBER_Y, Y_PLATE_FRONT, type Trajectory } from '../lib/physics';

const HOME = RUBBER_Y;                       // punta del plato
const PLATO = RUBBER_Y - Y_PLATE_FRONT;      // frente del plato
const ZONA = { abajo: 1.5, arriba: 3.5, medio: 17 / 24 };
const C = {
  cielo: '#F4F0E6', pasto: '#6FAE5C', pasto2: '#63A452', tierra: '#C9A27A', tierraLomo: '#C29A70',
  cal: '#FFFFFF', rojo: '#D7362B', azul: '#2E6FA6',
};

export type Camara = 'catcher' | 'lado' | 'pitcher';
const CAMARAS: Record<Camara, { ojo: [number, number, number]; mira: [number, number, number]; fov: number }> = {
  catcher: { ojo: [0.9, 4.6, HOME + 9], mira: [0, 2.6, HOME - 30], fov: 34 },
  lado: { ojo: [22, 5.5, 34], mira: [0, 3.2, 33], fov: 42 },
  pitcher: { ojo: [-1.2, 7.2, -11], mira: [0, 2.6, HOME], fov: 26 },
};

/* ------------------------------------------------------------------ la pelota */

/** Textura de cuero blanco con las costuras rojas, en proyección equirectangular para la esfera. */
function texturaPelota(): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#F6F2E8'; g.fillRect(0, 0, W, H);
  // La costura de una pelota es una curva cerrada sobre la esfera.
  const a = 0.75, b = 0.25;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 2;
    const x = a * Math.cos(t) + b * Math.cos(3 * t), y = a * Math.sin(t) - b * Math.sin(3 * t);
    const z = 2 * Math.sqrt(a * b) * Math.sin(2 * t);
    const r = Math.hypot(x, y, z);
    const lon = Math.atan2(y / r, x / r), lat = Math.asin(z / r);
    pts.push([((lon + Math.PI) / (2 * Math.PI)) * W, ((Math.PI / 2 - lat) / Math.PI) * H]);
  }
  g.strokeStyle = '#C8352B'; g.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (Math.abs(x1 - x0) > W / 2) continue;
    g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (i % 6 === 0) {            // las puntadas, perpendiculares a la costura
      const dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy) || 1, px = -dy / n * 9, py = dx / n * 9;
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(x1 - px, y1 - py); g.lineTo(x1 + px, y1 + py); g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Pelota({ traj, rpm, t, ciclo }: { traj: Trajectory; rpm: number; t: React.MutableRefObject<number>; ciclo: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const sombra = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => texturaPelota(), []);
  const curva = useMemo(() => traj.points.map(p => new THREE.Vector3(p[0], p[1], p[2])), [traj]);
  useFrame((_, dt) => {
    if (!ref.current || curva.length < 2) return;
    const f = Math.min(t.current / traj.shape.zoneTime, 1);
    const i = f * (curva.length - 1);
    const a = curva[Math.floor(i)], b = curva[Math.min(Math.ceil(i), curva.length - 1)];
    ref.current.position.lerpVectors(a, b, i - Math.floor(i));
    // Gira de verdad, en cámara lenta igual que el vuelo: una recta da ~38 vueltas en el camino.
    if (t.current < traj.shape.zoneTime) ref.current.rotation.x -= (rpm / 60) * 2 * Math.PI * dt * ciclo;
    if (sombra.current) {
      sombra.current.position.set(ref.current.position.x, 0.03, ref.current.position.z);
      const s = 1 / (1 + ref.current.position.y * 0.15);
      sombra.current.scale.set(s, s, s);
    }
  });
  return (
    <>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.24, 48, 32]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <mesh ref={sombra} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#2d4a22" transparent opacity={0.28} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ el campo */

function Campo() {
  const franjas = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);
  const diag = 90 / Math.SQRT2;
  const base = (x: number, z: number) => (
    <mesh position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}><planeGeometry args={[1.25, 1.25]} /><meshStandardMaterial color={C.cal} /></mesh>
  );
  const linea = (a: [number, number], b: [number, number]) => (
    <Line points={[[a[0], 0.06, a[1]], [b[0], 0.06, b[1]]]} color={C.cal} lineWidth={2.2} />
  );
  return (
    <group>
      {/* pasto con franjas de podadora */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><planeGeometry args={[600, 600]} /><meshStandardMaterial color={C.pasto} /></mesh>
      {franjas.map(i => i % 2 === 0 && (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -250 + i * 20 + 10]}><planeGeometry args={[600, 20]} /><meshStandardMaterial color={C.pasto2} /></mesh>
      ))}
      {/* el arco de tierra del infield, el cuadro de pasto y los caminos */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><circleGeometry args={[95, 96, 0, Math.PI * 2]} /><meshStandardMaterial color={C.tierra} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.02, HOME - diag]}><planeGeometry args={[84, 84]} /><meshStandardMaterial color={C.pasto} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, HOME]}><circleGeometry args={[13, 64]} /><meshStandardMaterial color={C.tierra} /></mesh>
      {/* el montículo, más alto que el resto, y la goma */}
      <mesh position={[0, 0.2, 1.5]} receiveShadow><cylinderGeometry args={[9, 9.4, 0.4, 64]} /><meshStandardMaterial color={C.tierraLomo} /></mesh>
      <mesh position={[0, 0.45, 1.5]}><cylinderGeometry args={[4.5, 9, 0.5, 64]} /><meshStandardMaterial color={C.tierraLomo} /></mesh>
      <mesh position={[0, 0.72, 0]}><boxGeometry args={[2, 0.08, 0.5]} /><meshStandardMaterial color={C.cal} /></mesh>
      {/* home plate, cajas de bateo y líneas de foul */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, PLATO + 0.5]}>
        <shapeGeometry args={[(() => { const s = new THREE.Shape(); s.moveTo(-0.708, 0.5); s.lineTo(0.708, 0.5); s.lineTo(0.708, -0.2); s.lineTo(0, -0.92); s.lineTo(-0.708, -0.2); s.closePath(); return s; })()]} />
        <meshStandardMaterial color={C.cal} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map(lado => (
        <Line key={lado} points={[[lado * 1.2, 0.06, PLATO - 2.5], [lado * 5.2, 0.06, PLATO - 2.5], [lado * 5.2, 0.06, PLATO + 3.5], [lado * 1.2, 0.06, PLATO + 3.5], [lado * 1.2, 0.06, PLATO - 2.5]]} color={C.cal} lineWidth={2} />
      ))}
      {linea([0, HOME], [diag * 3.4, HOME - diag * 3.4])}
      {linea([0, HOME], [-diag * 3.4, HOME - diag * 3.4])}
      {base(diag, HOME - diag)}{base(0, HOME - 2 * diag)}{base(-diag, HOME - diag)}
    </group>
  );
}

function ZonaStrike() {
  const m = ZONA.medio, z = PLATO;
  const marco: [number, number, number][] = [[-m, ZONA.abajo, z], [m, ZONA.abajo, z], [m, ZONA.arriba, z], [-m, ZONA.arriba, z], [-m, ZONA.abajo, z]];
  return (
    <group>
      <mesh position={[0, (ZONA.abajo + ZONA.arriba) / 2, z]}>
        <planeGeometry args={[2 * m, ZONA.arriba - ZONA.abajo]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <Line points={marco} color="#1d2b22" lineWidth={1.6} transparent opacity={0.65} />
    </group>
  );
}

/* ------------------------------------------------------------------ escena */

function Contenido({ principal, fantasma, rpm, camara }: { principal: Trajectory; fantasma?: Trajectory; rpm: number; camara: Camara }) {
  const t = useRef(0);
  const [quieto] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CICLO = 0.3;                         // cámara lenta: el vuelo real dura ~0.4 s
  useFrame((_, dt) => {
    if (quieto) { t.current = principal.shape.zoneTime; return; }
    t.current += dt * CICLO;
    if (t.current > principal.shape.zoneTime + 0.45) t.current = 0;
  });
  const cam = CAMARAS[camara];
  const fin = principal.points[principal.points.length - 1];
  const finF = fantasma?.points[fantasma.points.length - 1];
  return (
    <>
      <PerspectiveCamera key={camara} makeDefault fov={cam.fov} near={0.3} far={900} position={cam.ojo} />
      <hemisphereLight args={['#FFF8EC', '#4f7f3c', 0.9]} />
      <directionalLight position={[30, 60, -20]} intensity={1.4} castShadow />
      <Campo />
      <ZonaStrike />
      {fantasma && <Line points={fantasma.points} color={C.azul} lineWidth={2.4} dashed dashSize={0.9} gapSize={0.6} transparent opacity={0.9} />}
      <Line points={principal.points} color={C.rojo} lineWidth={3.2} transparent opacity={0.95} />
      {finF && <mesh position={finF}><sphereGeometry args={[0.13, 16, 16]} /><meshBasicMaterial color={C.azul} /></mesh>}
      {fin && <mesh position={fin}><ringGeometry args={[0.2, 0.28, 32]} /><meshBasicMaterial color={C.rojo} side={THREE.DoubleSide} /></mesh>}
      <Pelota traj={principal} rpm={rpm} t={t} ciclo={CICLO} />
      <OrbitControls key={`o-${camara}`} makeDefault target={cam.mira} enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}

export function Diamante3D({ principal, fantasma, rpm, camara = 'catcher', alto = '100%' }: {
  principal: Trajectory; fantasma?: Trajectory; rpm: number; camara?: Camara; alto?: string;
}) {
  // Si WebGL no existe (una impresora o un navegador viejo), no se intenta pintar nada.
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try { const c = document.createElement('canvas'); setOk(!!(c.getContext('webgl2') || c.getContext('webgl'))); } catch { setOk(false); }
  }, []);
  if (!ok) return <div className="sin-3d">Tu navegador no puede mostrar la escena en 3D.</div>;
  return (
    <Canvas dpr={[1, 2]} shadows gl={{ antialias: true }} style={{ width: '100%', height: alto }}>
      <color attach="background" args={[C.cielo]} />
      <fog attach="fog" args={[C.cielo, 140, 420]} />
      <Contenido principal={principal} fantasma={fantasma} rpm={rpm} camara={camara} />
    </Canvas>
  );
}
