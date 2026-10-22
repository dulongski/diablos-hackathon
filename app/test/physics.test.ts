/** Verifica que el solver inverso converge y que la respuesta a la densidad es la esperada. */
import { solve, densityAtAltitude, dragIndexAtAltitude } from '../src/lib/physics';

const casos = [
  { nombre: 'recta 4C',  p: { relSpeed: 93.5, ivb: 17.1, hb: 7.4,  spinRate: 2300, relHeight: 5.9, relSide: 1.6, extension: 6.2, plateZ: 2.7, plateX: 0.1 } },
  { nombre: 'slider',    p: { relSpeed: 84.0, ivb: 2.9,  hb: -5.7, spinRate: 2450, relHeight: 5.7, relSide: 1.9, extension: 6.0, plateZ: 2.0, plateX: -0.5 } },
  { nombre: 'curva',     p: { relSpeed: 78.5, ivb: -8.0, hb: -9.5, spinRate: 2550, relHeight: 6.0, relSide: 1.5, extension: 5.8, plateZ: 1.8, plateX: 0.2 } },
  { nombre: 'changeup',  p: { relSpeed: 84.5, ivb: 7.3,  hb: 13.5, spinRate: 1800, relHeight: 5.8, relSide: 1.7, extension: 6.3, plateZ: 2.1, plateX: 0.3 } },
  { nombre: 'sinker',    p: { relSpeed: 92.0, ivb: 10.0, hb: 15.6, spinRate: 2150, relHeight: 5.6, relSide: 2.1, extension: 6.1, plateZ: 2.2, plateX: 0.4 } },
];

let fallos = 0;
const chk = (etq: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${etq.padEnd(26)} obtenido ${got.toFixed(3)}  esperado ${want.toFixed(3)}  (tol ${tol})`);
};

console.log('=== 1. el solver inverso reproduce lo que se le pide (a nivel del mar) ===');
for (const c of casos) {
  const t = solve(c.p, 1.0);
  console.log(` ${c.nombre}`);
  chk('IVB', t.shape.ivb, c.p.ivb, 0.05);
  chk('HB', t.shape.hb, c.p.hb, 0.05);
  chk('altura en el plato', t.shape.plateZ, c.p.plateZ, 0.01);
  chk('lado en el plato', t.shape.plateX, c.p.plateX, 0.01);
  chk('velocidad de release', t.shape.relSpeed, c.p.relSpeed, 0.05);
}

console.log('\n=== 2. respuesta a la altitud del Harp Helu (2,240 m) ===');
const arrastre = dragIndexAtAltitude(2240);
console.log(` densidad del aire ISA : ${densityAtAltitude(2240).toFixed(4)}`);
console.log(` indice de arrastre    : ${arrastre.toFixed(4)}  (debe dar ~0.8534, lo medido en LMB)`);
chk('indice de arrastre', arrastre, 0.8534, 0.002);

console.log('\n delta de forma por tipo (esperado: 4C pierde ~3.6 in de IVB):');
for (const c of casos) {
  const mar = solve(c.p, 1.0).shape;
  const alt = solve(c.p, arrastre).shape;
  console.log(`  ${c.nombre.padEnd(10)} IVB ${mar.ivb.toFixed(2)} -> ${alt.ivb.toFixed(2)}  (${(alt.ivb - mar.ivb).toFixed(2)})` +
              `   HB ${mar.hb.toFixed(2)} -> ${alt.hb.toFixed(2)}  (${(alt.hb - mar.hb).toFixed(2)})` +
              `   vel.plato ${mar.zoneSpeed.toFixed(1)} -> ${alt.zoneSpeed.toFixed(1)}`);
}
const c4 = casos[0];
const d4 = solve(c4.p, arrastre).shape.ivb - solve(c4.p, 1.0).shape.ivb;
chk('delta IVB recta 4C', d4, -3.6, 0.9);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLAS`);
process.exit(fallos === 0 ? 0 : 1);
