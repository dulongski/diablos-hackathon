/**
 * Experimentos controlados con el mismo motor del simulador (física + árboles), para H1 y H4.
 *
 * Un experimento controlado mueve una sola perilla y deja todo lo demás fijo, algo que los datos
 * observados no permiten: en la cancha, el lanzador que gira más también se mueve distinto.
 *
 *   npx esbuild scripts/experimentos.ts --bundle --platform=node --outfile=/tmp/exp.mjs --format=esm
 *   node /tmp/exp.mjs > ../artifacts/experimentos.json
 */
import { readFileSync } from 'node:fs';
import { scorePitch, type Escala, type Helpers } from '../src/lib/scoring';
import { densityAtAltitude, dragIndexAtAltitude, releaseAt, solveRelease, type PitchInput } from '../src/lib/physics';
import type { Model } from '../src/lib/gbm';

const leer = (n: string) => JSON.parse(readFileSync(new URL(`../public/data/${n}.json`, import.meta.url), 'utf8'));
const model: Model = leer('model_stuff');
const helpers: Helpers = leer('helpers');
const escala: Escala = leer('scale').stuff;
const physics = leer('physics');
const EXP = physics?.altitud_a_indice_arrastre?.exponente;

const HH = dragIndexAtAltitude(2240, EXP);
const COORS = dragIndexAtAltitude(1609, EXP);

const base = (o: Partial<PitchInput>): PitchInput => ({
  relSpeed: 92.5, ivb: 16.5, hb: 8.0, relHeight: 5.9, relSide: 1.6, extension: 6.1,
  spinRate: 2280, plateZ: 2.5, plateX: 0, ...o,
});
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Forma (quiebres en pulgadas) del mismo release en otro aire. */
function forma(p: PitchInput, idx: number) {
  const rel = solveRelease(p);
  const s = releaseAt(rel, idx, p.spinRate).shape;
  return { ivb: s.ivb, hb: s.hb, total: Math.hypot(s.ivb, s.hb), zoneSpeed: s.zoneSpeed };
}
function plus(p: PitchInput, idx: number) {
  return scorePitch(p, idx, true, model, helpers, escala).plus;
}

/* ---------------------------------------------------------------- H1 · Nathan en Coors Field */
// Nathan: un lanzamiento con 18 in de quiebre a nivel del mar se mueve 14 a 15 en Coors.
const recta18 = base({ ivb: 16.1, hb: 8.05 });           // quiebre total ≈ 18.0 in
const curva = base({ relSpeed: 78, ivb: -8, hb: -9.5, spinRate: 2550 });
const h1_nathan = {
  recta: {
    mar: r1(forma(recta18, 1).total), coors: r1(forma(recta18, COORS).total), hh: r1(forma(recta18, HH).total),
    solo_densidad_coors: r1(forma(recta18, 1).total * densityAtAltitude(1609)),
    solo_densidad_hh: r1(forma(recta18, 1).total * densityAtAltitude(2240)),
  },
  curva: {
    // "cae 4 pulgadas menos": el quiebre vertical inducido de la curva es negativo; cuánto se acerca a cero
    caida_mar: r1(-forma(curva, 1).ivb), caida_coors: r1(-forma(curva, COORS).ivb), caida_hh: r1(-forma(curva, HH).ivb),
    total_mar: r1(forma(curva, 1).total), total_coors: r1(forma(curva, COORS).total), total_hh: r1(forma(curva, HH).total),
  },
  indice_arrastre: { coors: r2(COORS), hh: r2(HH) },
  densidad: { coors: r2(densityAtAltitude(1609)), hh: r2(densityAtAltitude(2240)) },
};

/* --------------------------------------------- H1 · superficie de sensibilidad por forma */
// Para cada tipo, una rejilla de formas alrededor de su forma típica: cuánto Stuff+ cambia en el Harp Helú.
const TIPICOS: Record<string, Partial<PitchInput>> = {
  Recta: { relSpeed: 92, ivb: 16, hb: 7, spinRate: 2280 },
  Sinker: { relSpeed: 91, ivb: 9, hb: 14, spinRate: 2150 },
  Cutter: { relSpeed: 88.5, ivb: 9, hb: -1, spinRate: 2350 },
  Slider: { relSpeed: 84, ivb: 2, hb: -5, spinRate: 2400 },
  Curva: { relSpeed: 78, ivb: -8, hb: -8, spinRate: 2500 },
  Cambio: { relSpeed: 83, ivb: 7, hb: 13, spinRate: 1750 },
  Splitter: { relSpeed: 84, ivb: 4, hb: 9, spinRate: 1450 },
};
const superficie: Record<string, { ivb: number; hb: number; mar: number; hh: number; d: number }[]> = {};
for (const [t, o] of Object.entries(TIPICOS)) {
  const celdas = [];
  for (let di = -8; di <= 8; di += 2) for (let dh = -8; dh <= 8; dh += 2) {
    const p = base({ ...o, ivb: o.ivb! + di, hb: o.hb! + dh });
    const m = plus(p, 1), a = plus(p, HH);
    celdas.push({ ivb: o.ivb! + di, hb: o.hb! + dh, mar: r1(m), hh: r1(a), d: r2(a - m) });
  }
  superficie[t] = celdas;
}
const tipicos = Object.fromEntries(Object.entries(TIPICOS).map(([t, o]) => {
  const p = base(o); const m = plus(p, 1), a = plus(p, HH);
  const fm = forma(p, 1), fa = forma(p, HH);
  return [t, { mar: r1(m), hh: r1(a), d: r2(a - m), mov_mar: r1(fm.total), mov_hh: r1(fa.total), d_mov: r2(fa.total - fm.total) }];
}));

/* ------------------------------------------------------------------ H4 · giro contra forma */
// (a) más giro con el mismo movimiento; (b) más movimiento con el mismo giro.
const giro = [];
for (let s = 1900; s <= 2700; s += 100) {
  const p = base({ spinRate: s });
  giro.push({ rpm: s, mar: r1(plus(p, 1)), hh: r1(plus(p, HH)) });
}
const mov = [];
for (let v = 12; v <= 20; v += 1) {
  const p = base({ ivb: v });
  mov.push({ ivb: v, mar: r1(plus(p, 1)), hh: r1(plus(p, HH)) });
}
// (c) dos rectas: A gira mucho pero con eje "de bala" (poca elevación); B gira menos pero toda su rotación es movimiento.
const A = base({ spinRate: 2650, ivb: 13.5 });
const B = base({ spinRate: 2150, ivb: 18.0 });
const parejas = {
  A: { rpm: 2650, ivb: 13.5, mar: r1(plus(A, 1)), hh: r1(plus(A, HH)) },
  B: { rpm: 2150, ivb: 18.0, mar: r1(plus(B, 1)), hh: r1(plus(B, HH)) },
};
const pendiente = (xs: { mar: number }[], paso: number) => r2((xs[xs.length - 1].mar - xs[0].mar) / ((xs.length - 1) * paso));
const h4 = {
  giro, mov, parejas,
  // Stuff+ por unidad, y por una desviación típica de la liga (≈ 250 rpm de giro; ≈ 3 in de elevación en rectas)
  stuff_por_100rpm: r2(pendiente(giro, 1)), stuff_por_pulgada: r2(pendiente(mov, 1)),
};

process.stdout.write(JSON.stringify({ h1_nathan, tipicos, superficie, h4 }));
