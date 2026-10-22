/**
 * Vuelo de la pelota, en el navegador.
 *
 * Port directo del integrador de `src/stuffplus/physics.py`: mismos ejes, mismas
 * constantes, mismos exponentes calibrados. Sirve para dos cosas a la vez: dibujar la
 * trayectoria real en 3D y construir el vector de forma que alimenta al modelo, de modo
 * que lo que se ve y lo que se puntua son el mismo lanzamiento.
 *
 * Ejes Trackman (pies): x lateral, y hacia el pitcher (el home esta en y=0),
 * z hacia arriba. Las magnitudes que se reportan (RelSide, HorzBreak, PlateLocSide)
 * usan el signo opuesto al eje x crudo; X_SIGN lo corrige a la salida.
 */

export const G = 32.174;
export const RUBBER_Y = 60.5;
export const Y_PLATE_FRONT = 17 / 12;
export const X_SIGN = -1;
export const FT_TO_IN = 12;
export const FPS_TO_MPH = 0.681818;

/** Exponentes de respuesta del Magnus a la densidad, calibrados fuera de muestra. */
export const MAGNUS_GAMMA_V = 1.7;
export const MAGNUS_GAMMA_H = 2.2;

/** Coeficiente de arrastre tipico de la LMB a nivel del mar (mediana medida). */
export const K_DRAG_SEA = 0.001588;

/** Densidad relativa del aire por altitud, atmosfera estandar. Es la densidad fisica real:
 *  a 2,240 m vale 0.802, el "20% menos aire" del que habla el reto. Se usa para mostrar. */
export function densityAtAltitude(meters: number): number {
  return Math.pow(1 - 2.25577e-5 * meters, 4.25588);
}

/**
 * Exponente que convierte densidad del aire en indice de arrastre.
 *
 * No son lo mismo. El arrastre va como rho*Cd, y Cd sube cuando Reynolds baja, asi que el
 * arrastre cae menos que la densidad: a 2,240 m la densidad es 0.802 pero el arrastre
 * medido en los datos de la LMB es 0.853. El exponente ancla uno al otro.
 *
 * Verificacion independiente: con este exponente, un estadio a la altura de Coors (1,609 m)
 * deberia dar 0.893, y la cubeta intermedia de la LMB mide 0.898.
 */
export const DRAG_EXPONENT = 0.7183;

/** El valor que entra al integrador: no la densidad, sino el indice de arrastre. */
export function dragIndexAtAltitude(meters: number, exponent = DRAG_EXPONENT): number {
  return Math.pow(densityAtAltitude(meters), exponent);
}

export interface PitchInput {
  relSpeed: number;      // mph
  ivb: number;           // pulgadas, reportadas
  hb: number;            // pulgadas, reportadas
  relHeight: number;     // pies
  relSide: number;       // pies, reportados
  extension: number;     // pies
  spinRate: number;      // rpm
  plateZ: number;        // pies, altura objetivo en el plato
  plateX: number;        // pies, lado objetivo reportado
}

export interface Shape {
  ivb: number; hb: number; relSpeed: number; zoneSpeed: number;
  vaa: number; haa: number; plateX: number; plateZ: number;
  zoneTime: number; speedDrop: number; spinRate: number;
  vertRelAngle: number; horzRelAngle: number; vertBreak: number;
}

export interface Trajectory {
  points: [number, number, number][];  // en marco de render: [lateral, alto, hacia el plato]
  shape: Shape;
}

/** Un lanzamiento resuelto: el estado al salir de la mano, del que se puede re-integrar
 *  en cualquier otro aire sin volver a resolver nada. */
export interface Release {
  init: State;
  /** Magnus a densidad de referencia (rho = 1), sin escalar. */
  magnus: [number, number, number];
}

export interface State { x: number; y: number; z: number; vx: number; vy: number; vz: number }

function accel(
  s: State, kDrag: number,
  wx: number, wy: number, wz: number, mMag: number, invV0sq: number,
): [number, number, number] {
  const v = Math.hypot(s.vx, s.vy, s.vz);
  const kv = kDrag * v;
  // El eje de giro se conserva; la fuerza se mantiene perpendicular a la velocidad.
  const cx = wy * s.vz - wz * s.vy;
  const cy = wz * s.vx - wx * s.vz;
  const cz = wx * s.vy - wy * s.vx;
  const cn = Math.hypot(cx, cy, cz) || 1e-9;
  const k = (mMag * v * v * invV0sq) / cn;
  return [-kv * s.vx + cx * k, -kv * s.vy + cy * k, -kv * s.vz + cz * k - G];
}

/**
 * Integra el vuelo con RK4 desde la mano hasta el frente del plato.
 * Devuelve la trayectoria muestreada y la forma resultante.
 */
export function integrate(
  init: State,
  kDrag: number,
  magnus: [number, number, number],
  dt = 0.002,
): Trajectory {
  const [mx, my, mz] = magnus;
  const v0 = Math.hypot(init.vx, init.vy, init.vz);
  const invV0sq = 1 / (v0 * v0);
  const mMag = Math.hypot(mx, my, mz) || 1e-9;

  // w = v_hat x m_hat  (solo la componente de omega perpendicular a v produce movimiento)
  const vxh = init.vx / v0, vyh = init.vy / v0, vzh = init.vz / v0;
  const mxh = mx / mMag, myh = my / mMag, mzh = mz / mMag;
  const wx = vyh * mzh - vzh * myh;
  const wy = vzh * mxh - vxh * mzh;
  const wz = vxh * myh - vyh * mxh;

  let s: State = { ...init };
  let t = 0;
  const points: [number, number, number][] = [];
  const push = (p: State) => points.push([X_SIGN * p.x, p.z, RUBBER_Y - p.y]);
  push(s);

  let end = s, tEnd = 0;
  for (let i = 0; i < 400; i++) {
    const a1 = accel(s, kDrag, wx, wy, wz, mMag, invV0sq);
    const s2 = { x: 0, y: 0, z: 0, vx: s.vx + 0.5 * dt * a1[0], vy: s.vy + 0.5 * dt * a1[1], vz: s.vz + 0.5 * dt * a1[2] };
    const a2 = accel(s2 as State, kDrag, wx, wy, wz, mMag, invV0sq);
    const s3 = { x: 0, y: 0, z: 0, vx: s.vx + 0.5 * dt * a2[0], vy: s.vy + 0.5 * dt * a2[1], vz: s.vz + 0.5 * dt * a2[2] };
    const a3 = accel(s3 as State, kDrag, wx, wy, wz, mMag, invV0sq);
    const s4 = { x: 0, y: 0, z: 0, vx: s.vx + dt * a3[0], vy: s.vy + dt * a3[1], vz: s.vz + dt * a3[2] };
    const a4 = accel(s4 as State, kDrag, wx, wy, wz, mMag, invV0sq);

    const w = dt / 6;
    const n: State = {
      x: s.x + w * (s.vx + 2 * s2.vx + 2 * s3.vx + s4.vx),
      y: s.y + w * (s.vy + 2 * s2.vy + 2 * s3.vy + s4.vy),
      z: s.z + w * (s.vz + 2 * s2.vz + 2 * s3.vz + s4.vz),
      vx: s.vx + w * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]),
      vy: s.vy + w * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]),
      vz: s.vz + w * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2]),
    };

    if (n.y <= Y_PLATE_FRONT) {
      const f = (s.y - Y_PLATE_FRONT) / (s.y - n.y);
      end = {
        x: s.x + f * (n.x - s.x), y: Y_PLATE_FRONT, z: s.z + f * (n.z - s.z),
        vx: s.vx + f * (n.vx - s.vx), vy: s.vy + f * (n.vy - s.vy), vz: s.vz + f * (n.vz - s.vz),
      };
      tEnd = t + f * dt;
      push(end);
      break;
    }
    s = n; t += dt;
    if (i % 3 === 0) push(s);
  }

  // Break respecto a la recta sin spin y sin arrastre, con la gravedad descontada.
  const zRef = init.z + init.vz * tEnd - 0.5 * G * tEnd * tEnd;
  const xRef = init.x + init.vx * tEnd;
  const vPlate = Math.hypot(end.vx, end.vy, end.vz);
  const vHorz = Math.hypot(end.vx, end.vy);
  const vRel = Math.hypot(init.vx, init.vy, init.vz);

  return {
    points,
    shape: {
      ivb: (end.z - zRef) * FT_TO_IN,
      hb: X_SIGN * (end.x - xRef) * FT_TO_IN,
      vertBreak: (end.z - (init.z + init.vz * tEnd)) * FT_TO_IN,
      relSpeed: vRel * FPS_TO_MPH,
      zoneSpeed: vPlate * FPS_TO_MPH,
      vaa: (Math.atan2(end.vz, vHorz) * 180) / Math.PI,
      haa: (X_SIGN * Math.atan2(end.vx, -end.vy) * 180) / Math.PI,
      vertRelAngle: (Math.atan2(init.vz, Math.hypot(init.vx, init.vy)) * 180) / Math.PI,
      horzRelAngle: (X_SIGN * Math.atan2(init.vx, -init.vy) * 180) / Math.PI,
      plateX: X_SIGN * end.x,
      plateZ: end.z,
      zoneTime: tEnd,
      speedDrop: (vRel - vPlate) * FPS_TO_MPH,
      spinRate: 0,
    },
  };
}

/**
 * Resuelve el lanzamiento que el coach pidio, a nivel del mar.
 *
 * El usuario da magnitudes observables (velocidad, quiebres, punto de salida, destino en
 * el plato); hace falta el estado inicial que las produce. La direccion de salida sale de
 * apuntar al objetivo y el Magnus por Newton: el quiebre es casi lineal en la aceleracion
 * de Magnus, asi que unas pocas iteraciones clavan ambas componentes.
 *
 * Devuelve el release, no la trayectoria: la misma mano se puede soltar en cualquier aire.
 */
export function solveRelease(input: PitchInput): Release {
  const yRel = RUBBER_Y - input.extension;
  const x0 = X_SIGN * input.relSide;
  const z0 = input.relHeight;
  const v0 = input.relSpeed / FPS_TO_MPH;

  const dy = yRel - Y_PLATE_FRONT;
  const tGuess = dy / v0;
  let aimZ = input.plateZ + 0.5 * G * tGuess * tGuess - z0;
  let aimX = X_SIGN * input.plateX - x0;

  let mx = 0, mz = 15;
  let init!: State;
  let magnus: [number, number, number] = [0, 0, 0];

  for (let it = 0; it < 7; it++) {
    const dirNorm = Math.hypot(aimX, dy, aimZ) || 1;
    init = {
      x: x0, y: yRel, z: z0,
      vx: (v0 * aimX) / dirNorm,
      vy: (-v0 * dy) / dirNorm,
      vz: (v0 * aimZ) / dirNorm,
    };
    // Magnus perpendicular a la velocidad: se proyecta fuera la componente paralela.
    const vn = Math.hypot(init.vx, init.vy, init.vz);
    let m: [number, number, number] = [mx, 0, mz];
    const par = (m[0] * init.vx + m[2] * init.vz) / (vn * vn);
    m = [m[0] - par * init.vx, -par * init.vy, m[2] - par * init.vz];
    magnus = m;

    const traj = integrate(init, K_DRAG_SEA, m);
    const t = traj.shape.zoneTime;
    const gain = 0.5 * t * t * FT_TO_IN;   // d(quiebre) / d(a_magnus)

    mz += (input.ivb - traj.shape.ivb) / gain;
    mx += (X_SIGN * (input.hb - traj.shape.hb)) / gain;
    aimZ += input.plateZ - traj.shape.plateZ;
    aimX += X_SIGN * (input.plateX - traj.shape.plateX);
  }

  return { init, magnus };
}

/**
 * Suelta el mismo lanzamiento en otro aire.
 *
 * Es el corazon del contrafactual: el brazo no cambia (mismo estado inicial, mismo eje de
 * giro, misma velocidad) y solo se reescalan las dos fuerzas que dependen del aire. Por
 * eso la pelota termina en otro lugar, que es justamente lo que se quiere mostrar.
 */
export function releaseAt(rel: Release, dragIndex: number, spinRate = 0, kMult = 1): Trajectory {
  const rv = Math.pow(dragIndex, MAGNUS_GAMMA_V);
  const rh = Math.pow(dragIndex, MAGNUS_GAMMA_H);
  const t = integrate(
    rel.init,
    K_DRAG_SEA * kMult * dragIndex,
    [rel.magnus[0] * rh, rel.magnus[1] * rh, rel.magnus[2] * rv],
  );
  t.shape.spinRate = spinRate;
  return t;
}

/** Atajo: resolver a nivel del mar y soltar en el aire pedido. */
export function solve(input: PitchInput, dragIndex: number): Trajectory {
  return releaseAt(solveRelease(input), dragIndex, input.spinRate);
}
