/** Verifica que el evaluador de arboles del navegador coincide con LightGBM. */
import { predict, toPlus, type Model } from '../src/lib/gbm';
import model from '../public/data/model_stuff.json';
import scale from '../public/data/scale.json';
import fixtures from './fixtures/gbm.json';

const m = model as unknown as Model;
const esc = (scale as any).stuff;
let peor = 0;
let peorPlus = 0;
console.log('  #   raw TS        raw LightGBM   dif        plus TS   plus LightGBM');
fixtures.casos.forEach((c: any, i: number) => {
  const feats: Record<string, number> = {};
  for (const [k, v] of Object.entries(c.features)) feats[k] = v === null ? NaN : (v as number);
  const raw = predict(m, feats);
  const plus = toPlus(raw, esc.center, esc.scale);
  const d = Math.abs(raw - c.raw);
  peor = Math.max(peor, d);
  peorPlus = Math.max(peorPlus, Math.abs(plus - c.plus));
  console.log(`  ${String(i).padStart(2)}  ${raw.toFixed(6).padStart(11)}  ${c.raw.toFixed(6).padStart(12)}  ${d.toExponential(2).padStart(9)}  ${plus.toFixed(2).padStart(8)}  ${c.plus.toFixed(2).padStart(12)}`);
});
console.log(`\nmayor diferencia absoluta en raw: ${peor.toExponential(3)}`);
const ok = fixtures.casos.length > 0 && Number.isFinite(peor) && Number.isFinite(peorPlus) && peor < 1e-9 && peorPlus < 1e-8;
console.log(ok ? 'OK: el evaluador coincide con LightGBM' : 'FALLA: el evaluador NO coincide');
process.exit(ok ? 0 : 1);
