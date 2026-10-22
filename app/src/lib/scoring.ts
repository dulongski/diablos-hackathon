/**
 * Del lanzamiento al Stuff+.
 *
 * Une las dos mitades del sistema: el integrador produce la forma fisica y el ensamble de
 * arboles la convierte en un indice. Como el modelo Stuff+ solo ve forma, nunca ubicacion,
 * conteo ni parque, basta con transferir la forma a otro aire y volver a puntuar para
 * obtener el contrafactual: el mismo lanzamiento, otro estadio.
 */
import { predict, toPlus, type Model } from './gbm';
import { releaseAt, solveRelease, type PitchInput, type Release, type Trajectory } from './physics';

export interface Helpers {
  effective_velo: { coef: number[] };
  spin_axis: { offset_deg: number };
  spin_efficiency: { coef: number[] };
  /** Dispersion del arrastre entre pelotas (log, robusta), medida dentro de cada juego. */
  arrastre?: { log_sd: number };
}

export interface Escala { center: number; scale: number }

/**
 * Arma el vector de features del modelo a partir de la trayectoria resuelta.
 *
 * `ref` es la forma a nivel del mar y `traj` la del aire que se esta evaluando. La
 * distincion importa: hay features que el aire mueve y otras que no, y mezclarlas produce
 * combinaciones imposibles (mucha eficiencia de giro con poco movimiento) donde el modelo
 * extrapola sin control.
 *
 * Espeja exactamente `TRANSFERRED` en src/stuffplus/physics.py.
 */
export function shapeFeatures(
  traj: Trajectory, ref: Trajectory, input: PitchInput, helpers: Helpers, isRhp: boolean,
): Record<string, number> {
  const s = traj.shape;
  const r = ref.shape;
  const [a0, a1, a2] = helpers.effective_velo.coef;
  const [b0, b1, b2, b3] = helpers.spin_efficiency.coef;

  const movRef = Math.hypot(r.ivb, r.hb);
  const movNew = Math.hypot(s.ivb, s.hb);
  // El eje de giro es del release, no del quiebre: se fija con la forma de referencia y no
  // se recalcula, o giraria solo porque vertical y horizontal escalan distinto.
  const spinAxis =
    ((Math.atan2(r.hb, r.ivb) * 180) / Math.PI + helpers.spin_axis.offset_deg + 360) % 360;
  const effRef = b0 + b1 * movRef + b2 * input.spinRate + b3 * r.relSpeed;
  const ratio = movRef > 1e-6 ? movNew / movRef : 1;

  return {
    // invariantes del release
    RelSpeed: r.relSpeed,
    EffectiveVelo: a0 + a1 * r.relSpeed + a2 * input.extension,
    SpinRate: input.spinRate,
    SpinAxis: spinAxis,
    RelHeight: input.relHeight,
    RelSide: input.relSide,
    Extension: input.extension,
    VertRelAngle: r.vertRelAngle,
    HorzRelAngle: r.horzRelAngle,
    is_rhp: isRhp ? 1 : 0,
    // lo que el aire mueve
    InducedVertBreak: s.ivb,
    HorzBreak: s.hb,
    VertBreak: r.vertBreak + (s.ivb - r.ivb),
    VertApprAngle: s.vaa,
    HorzApprAngle: s.haa,
    SpeedDrop: s.speedDrop,
    ZoneTime: s.zoneTime,
    ZoneSpeed: s.zoneSpeed,
    movement_total: movNew,
    spin_efficiency: effRef * ratio,
  };
}

export interface Puntuacion {
  plus: number;
  traj: Trajectory;
  features: Record<string, number>;
}

/**
 * Puntua un lanzamiento en un aire dado.
 *
 * Se resuelve una sola vez el release (el brazo no cambia) y se suelta en los dos aires.
 * La forma a nivel del mar sirve de referencia para las features invariantes.
 */
export function scorePitch(
  input: PitchInput, dragIndex: number, isRhp: boolean,
  model: Model, helpers: Helpers, escala: Escala, release?: Release, kMult = 1,
): Puntuacion {
  const rel = release ?? solveRelease(input);
  const ref = releaseAt(rel, 1.0, input.spinRate, kMult);
  const traj = dragIndex === 1.0 ? ref : releaseAt(rel, dragIndex, input.spinRate, kMult);
  const features = shapeFeatures(traj, ref, input, helpers, isRhp);
  return { plus: toPlus(predict(model, features), escala.center, escala.scale), traj, features };
}

/** Dispersion del arrastre entre pelotas si helpers.json todavia no la trae. */
export const ARRASTRE_LOG_SD = 0.15;

function halton(i: number, b: number): number {
  let f = 1, r = 0;
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
  return r;
}

/** Inversa de la normal estandar (Acklam), suficiente para repartir puntos. */
function normalInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(p, 1 - p);
  let x: number;
  if (q < 0.02425) {
    const t = Math.sqrt(-2 * Math.log(q));
    x = (((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1);
  } else {
    const t = q - 0.5, r = t * t;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * t / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  return p > 0.5 ? -x : x;
}

/**
 * Variaciones fijas (Halton en seis dimensiones): siempre las mismas, asi el numero no cambia si no
 * cambias nada. Las cinco primeras van de −1 a 1; la sexta es un cuantil normal para el arrastre.
 */
export const VARIACIONES: number[][] = Array.from({ length: 49 }, (_, i) => {
  const u = [2, 3, 5, 7, 11, 13].map(b => halton(i + 1, b));
  return [...u.slice(0, 5).map(x => (x - 0.5) * 2), normalInv(u[5])];
});

/**
 * Stuff+ estable de una forma de lanzamiento, en varios aires a la vez.
 *
 * Un lanzador nunca repite exacto y dos pelotas no frenan igual (costuras, desgaste). El pipeline
 * vuela cada lanzamiento real con su propio arrastre medido, asi que su Stuff+ por tipo ya promedia
 * esa dispersion. Aqui se hace lo mismo: se promedian variaciones chicas de velocidad, movimiento,
 * giro y salida, y el arrastre de cada una sale de la dispersion medida. La misma pelota (mismo
 * arrastre propio) se vuela en todos los aires, para que la diferencia sea solo el aire.
 *
 * Sin esto, un solo punto cae en un escalon del arbol (la caida de velocidad marca el aire) y la
 * perdida en altura sale hasta el doble de lo que da el pipeline para ese tipo.
 */
export function stuffEstable(
  input: PitchInput, indices: number[], isRhp: boolean,
  model: Model, helpers: Helpers, escala: Escala,
): number[] {
  const sd = helpers.arrastre?.log_sd ?? ARRASTRE_LOG_SD;
  const suma = indices.map(() => 0);
  for (const v of VARIACIONES) {
    const q: PitchInput = {
      ...input, relSpeed: input.relSpeed + v[0] * 0.8, ivb: input.ivb + v[1] * 1.2, hb: input.hb + v[2] * 1.2,
      spinRate: input.spinRate + v[3] * 60, relHeight: input.relHeight + v[4] * 0.08,
    };
    const rel = solveRelease(q);
    const k = Math.exp(sd * v[5]);
    indices.forEach((idx, j) => { suma[j] += scorePitch(q, idx, isRhp, model, helpers, escala, rel, k).plus; });
  }
  return suma.map(x => x / VARIACIONES.length);
}
