/**
 * Nubes de lanzamientos.
 *
 * Un lanzador no repite un envío: repite una *distribución*. El mando, el brazo y el giro
 * varían tiro a tiro, y al coach no le sirve saber dónde cae el lanzamiento perfecto sino
 * dónde cae la nube entera, y cuánto se corre esa nube al cambiar de estadio.
 *
 * El release base se resuelve UNA vez y después se perturba directamente, en vez de
 * resolver el problema inverso para cada envío. Es más rápido , dos integraciones por
 * envío en lugar de nueve, que es lo que permite mover un control y ver mil lanzamientos
 * responder,  y además es lo que de verdad pasa: el lanzador varía el brazo, y el quiebre
 * es consecuencia.
 */
import { predict, toPlus, type Model } from './gbm';
import {
  integrate, K_DRAG_SEA, MAGNUS_GAMMA_H, MAGNUS_GAMMA_V, RUBBER_Y, Y_PLATE_FRONT,
  solveRelease, type PitchInput, type Trajectory,
} from './physics';
import { shapeFeatures, type Escala, type Helpers } from './scoring';

/** Dispersión envío a envío, en una desviación estándar. */
export interface Varianza {
  /** Dispersión del punto de llegada al plato, en pies. */
  mando: number;
  /** Dispersión de la velocidad de salida, en mph. */
  velocidad: number;
  /** Dispersión del quiebre, en pulgadas. */
  quiebre: number;
  /** Dispersión del punto de salida del brazo, en pies. */
  release: number;
}

/** Mando medio de la LMB: una recta se dispersa unas 7 pulgadas por eje. */
export const VARIANZA_MEDIA: Varianza = { mando: 0.60, velocidad: 0.9, quiebre: 1.3, release: 0.10 };

export interface Envio { plateX: number; plateZ: number; plus: number; enZona: boolean }

export interface Nube {
  envios: Envio[];
  pctZona: number;
  plusMedio: number;
  plusSd: number;
  centro: { x: number; z: number };
  /** Trayectorias de una submuestra, para dibujar en 3D sin ahogar la GPU. */
  muestra: Trajectory[];
}

/** Zona de strike reglamentaria, en pies. */
export const ZONA = { medioAncho: 17 / 24, abajo: 1.5, arriba: 3.6 };

export function enZona(x: number, z: number): boolean {
  return Math.abs(x) <= ZONA.medioAncho && z >= ZONA.abajo && z <= ZONA.arriba;
}

/** Normal estándar por Box-Muller, con semilla propia para que la nube sea reproducible. */
function gaussiana(seed: number) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) || 1e-9;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

export interface OpcionesNube {
  base: PitchInput;
  varianza: Varianza;
  n: number;
  /** Índice de arrastre del entorno de altitud (1.0 = nivel del mar). */
  dragIndex: number;
  isRhp: boolean;
  model: Model;
  helpers: Helpers;
  escala: Escala;
  nMuestra?: number;
  semilla?: number;
  /** Paso de integración. Más grueso para la nube, fino para lo que se dibuja. */
  dt?: number;
}

function resumen(envios: Envio[], muestra: Trajectory[]): Nube {
  const n = envios.length || 1;
  let suma = 0, suma2 = 0, dentro = 0, sx = 0, sz = 0;
  for (const e of envios) {
    suma += e.plus; suma2 += e.plus * e.plus;
    if (e.enZona) dentro++;
    sx += e.plateX; sz += e.plateZ;
  }
  const media = suma / n;
  return {
    envios,
    pctZona: dentro / n,
    plusMedio: media,
    plusSd: Math.sqrt(Math.max(suma2 / n - media * media, 0)),
    centro: { x: sx / n, z: sz / n },
    muestra,
  };
}

/**
 * Genera las dos nubes a la vez: el mismo conjunto de envíos, soltado en los dos aires.
 *
 * Que sean literalmente los mismos envíos es el punto. Cualquier diferencia entre las dos
 * nubes es atribuible al aire y a nada más.
 */
export function generarNubes(o: OpcionesNube): { mar: Nube; alt: Nube } {
  const g = gaussiana(o.semilla ?? 20260711);
  const v = o.varianza;
  const dt = o.dt ?? 0.005;
  const nMuestra = o.nMuestra ?? 20;
  const paso = Math.max(1, Math.floor(o.n / nMuestra));

  const rel = solveRelease(o.base);
  const v0 = Math.hypot(rel.init.vx, rel.init.vy, rel.init.vz);
  const recorrido = (RUBBER_Y - o.base.extension) - Y_PLATE_FRONT;

  const rv = Math.pow(o.dragIndex, MAGNUS_GAMMA_V);
  const rh = Math.pow(o.dragIndex, MAGNUS_GAMMA_H);

  const eMar: Envio[] = [], eAlt: Envio[] = [];
  const mMar: Trajectory[] = [], mAlt: Trajectory[] = [];

  for (let i = 0; i < o.n; i++) {
    // --- perturbar el brazo -------------------------------------------------
    const escalaV = 1 + (g() * v.velocidad) / o.base.relSpeed;
    // Un desvío de d pies en el plato es un ángulo d/recorrido en el release.
    const desvX = (g() * v.mando * v0) / recorrido;
    const desvZ = (g() * v.mando * v0) / recorrido;
    const init = {
      x: rel.init.x + g() * v.release,
      y: rel.init.y,
      z: rel.init.z + g() * v.release,
      vx: rel.init.vx * escalaV + desvX,
      vy: rel.init.vy * escalaV,
      vz: rel.init.vz * escalaV + desvZ,
    };
    // El quiebre va con la aceleración de Magnus: d(quiebre) ≈ 0.5·t²·12 · d(a), y ese
    // factor vale ~1 para un vuelo de 0.41 s, así que pulgadas y ft/s² se corresponden.
    const magnus: [number, number, number] = [
      rel.magnus[0] + g() * v.quiebre,
      rel.magnus[1],
      rel.magnus[2] + g() * v.quiebre,
    ];

    const entrada: PitchInput = { ...o.base, relSpeed: o.base.relSpeed * escalaV };

    const tMar = integrate(init, K_DRAG_SEA, magnus, dt);
    const tAlt = o.dragIndex === 1
      ? tMar
      : integrate(init, K_DRAG_SEA * o.dragIndex,
                  [magnus[0] * rh, magnus[1] * rh, magnus[2] * rv], dt);

    for (const [traj, salida, muestras] of [
      [tMar, eMar, mMar], [tAlt, eAlt, mAlt],
    ] as [Trajectory, Envio[], Trajectory[]][]) {
      const plus = toPlus(
        predict(o.model, shapeFeatures(traj, tMar, entrada, o.helpers, o.isRhp)),
        o.escala.center, o.escala.scale,
      );
      const { plateX, plateZ } = traj.shape;
      salida.push({ plateX, plateZ, plus, enZona: enZona(plateX, plateZ) });
      if (i % paso === 0 && muestras.length < nMuestra) muestras.push(traj);
    }
  }

  return { mar: resumen(eMar, mMar), alt: resumen(eAlt, mAlt) };
}
