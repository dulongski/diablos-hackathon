import { useEffect, useState } from 'react';
import { nf, sg } from '../settings';
interface Metric { rmse: number; r2: number; n: number; paired_vs_current?: { mse_improvement: number; ci95: [number, number] } }
interface Audit { grouped: Record<string, Metric>; chronological: Record<string, { metrics: Record<string, Metric> }>; scope: string }
const variants: Record<string, string> = { current: 'Especificación actual', count_baseline: 'Nulo por conteo', mirror_circular: 'Espejo y eje circular', current_shrink_half: 'Contracción al 50 %', no_drag: 'Sin frenado', environment_residual: 'Residual de entorno' };
export function ValidationAudit() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('./data/validation_audit.json').then(r => { if (!r.ok) throw new Error('Audit unavailable'); return r.json(); })
      .then(value => { if (active) setAudit(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (!audit) return <p className="aclaracion">{failed ? 'La auditoría con objetivos ajustados sólo en entrenamiento no está disponible en esta copia. Las métricas históricas siguientes usan las tablas de objetivo originales.' : 'Cargando auditoría de validación…'}</p>;
  const scenarios = [['Lanzadores excluidos', audit.grouped], ...Object.entries(audit.chronological).map(([year, test]) => [`Año ${year}`, test.metrics] as const)] as const;
  return <div className="tarjeta">
    <h3 className="titulo-tarjeta">Auditoría: objetivo y modelo nulo aprendidos sólo en entrenamiento</h3>
    <p className="nota-tarjeta">Reajustes independientes de la misma especificación y variantes exploratorias, con tablas de valor de carrera y nulo por conteo calculados dentro de cada entrenamiento. Estos resultados no recalifican el modelo ajustado que usa el simulador. Las métricas históricas que siguen se conservan como referencia y usaban tablas de objetivo globales.</p>
    <div className="tabla-scroll"><table className="tabla-datos compacta">
      <thead><tr><th>Separación</th><th>Versión</th><th className="n">Lanzamientos</th><th className="n">RMSE</th><th className="n">R²</th></tr></thead>
      <tbody>{scenarios.flatMap(([label, metrics]) => ['current', 'count_baseline'].filter(k => metrics[k]).map(k => <tr key={label + k}><th scope="row">{label}</th><td>{variants[k]}</td><td className="num n">{nf(metrics[k].n)}</td><td className="num n">{nf(metrics[k].rmse, 6)}</td><td className="num n">{sg(metrics[k].r2, 6)}</td></tr>))}</tbody>
    </table></div>
    <p className="tenue nota-pie">La separación temporal evalúa años anteriores frente al año siguiente. 2026 ya fue inspeccionado durante el desarrollo: es una comprobación retrospectiva, no un test final intacto. La preparación física sigue siendo global. Un R² cercano a cero indica capacidad predictiva limitada.</p>
    <details><summary>Variantes exploratorias e incertidumbre de la mejora</summary>
      <div className="tabla-scroll"><table className="tabla-datos compacta">
        <thead><tr><th>Separación</th><th>Variante</th><th className="n">R²</th><th className="n">Reducción MSE frente a actual</th><th className="n">IC 95 %</th></tr></thead>
        <tbody>{scenarios.flatMap(([label, metrics]) => ['mirror_circular', 'current_shrink_half', 'no_drag', 'environment_residual'].filter(k => metrics[k]?.paired_vs_current).map(k => {
          const m = metrics[k], paired = m.paired_vs_current!;
          return <tr key={label + k}><th scope="row">{label}</th><td>{variants[k]}</td><td className="num n">{sg(m.r2, 6)}</td><td className="num n">{sg(paired.mse_improvement, 7)}</td><td className="num n">{sg(paired.ci95[0], 7)} a {sg(paired.ci95[1], 7)}</td></tr>;
        }))}</tbody>
      </table></div>
      <p className="tenue nota-pie">Positivo favorece la variante. Los intervalos remuestrean lanzadores de prueba; no incluyen toda la selección de modelos ni la calibración física. Una mejora agrupada no garantiza mejora temporal. Ninguna variante sustituye aquí al modelo de producción.</p>
    </details>
  </div>;
}
