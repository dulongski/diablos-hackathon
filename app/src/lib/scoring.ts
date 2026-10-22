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
  model: Model, helpers: Helpers, escala: Escala, release?: Release,
): Puntuacion {
  const rel = release ?? solveRelease(input);
  const ref = releaseAt(rel, 1.0, input.spinRate);
  const traj = dragIndex === 1.0 ? ref : releaseAt(rel, dragIndex, input.spinRate);
  const features = shapeFeatures(traj, ref, input, helpers, isRhp);
  return { plus: toPlus(predict(model, features), escala.center, escala.scale), traj, features };
}
