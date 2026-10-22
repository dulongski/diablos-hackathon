/**
 * El simulador contra el pipeline, tipo por tipo.
 *
 * El pipeline (scripts/04_export.py → arsenal.json) vuela cada lanzamiento real en los dos aires y
 * promedia por tipo. El simulador califica una forma típica con `stuffEstable`. No tienen que dar
 * igual (el promedio de una población no es la calificación de su lanzamiento típico), pero la
 * pérdida en altura debe quedar en el mismo orden de magnitud y con el mismo signo.
 *
 *   npm run consistencia
 */
import { readFileSync } from 'node:fs';
import { stuffEstable, ARRASTRE_LOG_SD, type Escala, type Helpers } from '../src/lib/scoring';
import type { Model } from '../src/lib/gbm';
import type { PitchInput } from '../src/lib/physics';

const leer = (n: string) => JSON.parse(readFileSync(new URL(`../public/data/${n}.json`, import.meta.url), 'utf8'));
const model: Model = leer('model_stuff');
const helpers: Helpers = leer('helpers');
const escala: Escala = leer('scale').stuff;
const HH: number = leer('physics').rho_altitud_extrema;
const ars = Object.fromEntries(leer('arsenal').tipos.map((t: { tipo: string }) => [t.tipo, t]));

// Las mismas formas típicas de derecho que ofrece el simulador.
const TIPOS: [string, string, Partial<PitchInput>][] = [
  ['Recta', 'Four-Seam', { relSpeed: 92.4, ivb: 15.7, hb: 8.0, spinRate: 2300, plateZ: 2.9, plateX: 0 }],
  ['Sinker', 'Sinker', { relSpeed: 92.2, ivb: 8.8, hb: 14.4, spinRate: 2150, plateZ: 2.1, plateX: 0.3 }],
  ['Cutter', 'Cutter', { relSpeed: 89.4, ivb: 9.3, hb: -1.1, spinRate: 2380, plateZ: 2.5, plateX: -0.3 }],
  ['Slider', 'Slider', { relSpeed: 84.0, ivb: 2.8, hb: -4.3, spinRate: 2450, plateZ: 2.0, plateX: -0.5 }],
  ['Curva', 'Curveball', { relSpeed: 78.5, ivb: -7.9, hb: -8.2, spinRate: 2550, plateZ: 1.9, plateX: -0.3 }],
  ['Cambio', 'Changeup', { relSpeed: 84.1, ivb: 5.9, hb: 12.0, spinRate: 1800, plateZ: 2.0, plateX: 0.4 }],
  ['Splitter', 'Splitter', { relSpeed: 84.0, ivb: 3.3, hb: 6.4, spinRate: 1450, plateZ: 1.9, plateX: 0.2 }],
];

const sd = helpers.arrastre?.log_sd;
console.log(`arrastre log_sd ${sd === undefined ? `${ARRASTRE_LOG_SD} (por defecto, falta correr 04_export.py)` : sd.toFixed(3) + ' (medido)'}`);
console.log('tipo       simulador mar → HH   (Δ)    pipeline Δ');
let err = 0;
for (const [es, en, o] of TIPOS) {
  const p: PitchInput = { relHeight: 5.9, relSide: 1.6, extension: 6.1, ...o } as PitchInput;
  const [m, a] = stuffEstable(p, [1, HH], true, model, helpers, escala);
  const d = ars[en].delta_plus;
  err += Math.abs(a - m - d);
  console.log(`${es.padEnd(10)} ${m.toFixed(1).padStart(6)} → ${a.toFixed(1).padStart(5)}  (${(a - m).toFixed(1).padStart(5)})   ${d.toFixed(1).padStart(6)}`);
}
console.log(`error medio de Δ ${(err / TIPOS.length).toFixed(2)} puntos`);
