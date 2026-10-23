import { ValidationAudit } from './ValidationAudit';
/**
 * ¿FUNCIONA?: criterios 1 (calidad) y 2 (robustez fuera de muestra).
 *
 * La prueba que entiende cualquiera: si la calificación sirve, los lanzamientos con Stuff+ alto
 * deben permitir menos carreras que los de Stuff+ bajo, y eso tiene que pasar con lanzadores que
 * el modelo nunca vio. Se muestra eso primero, en carreras por cada 100 lanzamientos. Las métricas
 * técnicas van después, con su traducción.
 */
import type { Jurado, Robustez as DatosRobustez, Tramo } from '../jurado';
import { Robustez } from './Robustez';
import { nf, sg } from '../settings';

const W = 760, H = 330, PL = 60, PR = 20, PT = 26, PB = 58;

function Calibracion({ c }: { c: Tramo[] }) {
  const vals = c.flatMap(t => [t.carreras_100, t.carreras_pred_100]);
  const y0 = Math.floor(Math.min(...vals) / 2) * 2 - 1, y1 = Math.ceil(Math.max(...vals) / 2) * 2 + 1;
  const bw = (W - PL - PR) / c.length;
  const sx = (i: number) => PL + bw * i + bw / 2;
  const sy = (v: number) => PT + ((y1 - v) / (y1 - y0)) * (H - PT - PB);
  const ticks = []; for (let v = Math.ceil(y0 / 4) * 4; v <= y1; v += 4) ticks.push(v);

  return (
    <figure className="calibracion">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Carreras permitidas por cada 100 lanzamientos según el tramo de Stuff+: bajan escalón por escalón.">
        {ticks.map(v => <g key={v}>
          <line x1={PL} x2={W - PR} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'eje-cero' : 'rejilla'} />
          <text x={PL - 8} y={sy(v) + 4} textAnchor="end" className="eje">{sg(v, 0)}</text>
        </g>)}
        {c.map((t, i) => {
          const malo = t.carreras_100 > 0;
          const top = Math.min(sy(0), sy(t.carreras_100)), alto = Math.abs(sy(t.carreras_100) - sy(0));
          return (
            <g key={t.tramo}>
              <rect x={sx(i) - bw * 0.3} y={top} width={bw * 0.6} height={Math.max(alto, 1)} rx={3}
                    className={malo ? 'barra-mala' : 'barra-buena'} />
              <circle cx={sx(i)} cy={sy(t.carreras_pred_100)} r={5} className="pred" />
              {/* la cifra al lado de la barra, para no tapar el punto de lo predicho */}
              <text x={sx(i) + bw * 0.3 + 5} y={sy(t.carreras_100) + (malo ? 12 : -4)} className="valor-barra">
                {sg(t.carreras_100, 1)}
              </text>
              <text x={sx(i)} y={H - PB + 20} textAnchor="middle" className="eje fuerte">{t.tramo}</text>
              <text x={sx(i)} y={H - PB + 36} textAnchor="middle" className="eje">{nf(t.n)} lanz.</text>
            </g>
          );
        })}
        <text x={(PL + W - PR) / 2} y={H - 4} textAnchor="middle" className="eje-titulo">Stuff+ del lanzamiento, calculado sin haber visto a su lanzador →</text>
        <text x={14} y={(PT + H - PB) / 2} textAnchor="middle" className="eje-titulo" transform={`rotate(-90 14 ${(PT + H - PB) / 2})`}>carreras por 100 lanzamientos</text>
      </svg>
      <figcaption className="leyenda">
        <span className="clave"><i className="barra-mala" /> Lo que pasó, más carreras (malo para el pitcher)</span>
        <span className="clave"><i className="barra-buena" /> Lo que pasó, menos carreras (bueno)</span>
        <span className="clave"><i className="pred" /> Lo que el modelo predijo</span>
      </figcaption>
    </figure>
  );
}

function Prueba({ titulo, que, cifra, unidad, nota }: { titulo: string; que: string; cifra: string; unidad: string; nota: string }) {
  return (
    <article className="prueba tarjeta">
      <span className="etiqueta">{titulo}</span>
      <p className="prueba-que">{que}</p>
      <p className="prueba-cifra"><b className="num">{cifra}</b> <span>{unidad}</span></p>
      <p className="tenue">{nota}</p>
    </article>
  );
}

const COMP: Record<string, string> = {
  y_called_strike: 'Si el umpire cantará strike cuando no le tiran',
  y_swing: 'Si el bateador va a tirarle',
  y_chase: 'Si le tira a una pelota fuera de la zona',
  y_whiff: 'Si falla el swing',
  y_weak_contact: 'Si le pega débil',
  y_groundball: 'Si el batazo será rodado',
  y_hard_contact: 'Si le pega duro',
  y_barrel: 'Si le pega perfecto (barril)',
};

export function Confianza({ j, r }: { j: Jurado; r: DatosRobustez | null }) {
  const fu = r?.futuro && !('error' in r.futuro) ? r.futuro : null;
  const c = j.calibracion;
  const bajo = c[0], alto = c[c.length - 1];
  const hp = j.holdout.pitcher, nul = j.modelo_nulo;
  // r² fuera de muestra en %: qué parte de lo que pasa explica el modelo. El nulo explica ~0 %.
  const ordena = (m: { corr?: number }) => sg(m.corr ?? 0, 3);
  const e = j.estabilidad;
  const comps = Object.entries(j.holdout.componentes).sort((a, b) => b[1].skill - a[1].skill);

  return (
    <section className="vista-sec">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Criterios 1 y 2 · Calidad y robustez fuera de muestra</p>
          <h2>¿Se puede confiar en la calificación?</h2>
          <p className="entrada ancha">
            Stuff+ valora la forma del lanzamiento. Su capacidad para explicar carreras de un lanzamiento suelto es
            limitada: aquí mostramos el R² y las correlaciones para que esa limitación sea visible. Las variantes probadas
            no demuestran un techo de lo que puede aprenderse. Distinguimos la repetibilidad entre mitades al azar,
            la validación con lanzadores o temporadas excluidos y las asociaciones retrospectivas entre temporadas.
          </p>
        </header>

        <ValidationAudit />

        {e && (
          <div className="rejilla-2">
            <div className="tarjeta">
              <h3 className="titulo-tarjeta">Repetibilidad entre mitades al azar</h3>
              <p className="nota-tarjeta">
                Partimos los lanzamientos de cada uno de {nf(e.lanzadores_mitades)} lanzadores en dos mitades. Su Stuff+ en
                una mitad se relaciona con el de la otra con correlación <b>{nf(e.mitades.stuff, 2)}</b>. Sus carreras permitidas,
                apenas <b>{nf(e.mitades.rv, 2)}</b>. Las mitades comparten temporadas y un modelo ya ajustado: esta estabilidad no demuestra predicción temporal.
              </p>
              <div className="habilidades">
                {([['Stuff+', e.mitades.stuff], ['Location+', e.mitades.location], ['Pitching+', e.mitades.pitching], ['Carreras que permitió', e.mitades.rv]] as const).map(([k, v]) => (
                  <div key={k} className="habilidad"><span>{k}</span><div className="hab-barra"><i style={{ width: `${Math.max(0, v) * 100}%` }} /></div><b className="num">{nf(v, 2)}</b></div>
                ))}
              </div>
            </div>
            <div className="tarjeta">
              <h3 className="titulo-tarjeta">Asociación retrospectiva entre temporadas</h3>
              {fu ? (
                <>
                  <p className="nota-tarjeta">
                    En {nf(fu.pares)} pares de temporadas seguidas ({nf(fu.lanzadores)} lanzadores), medimos la asociación con las
                    carreras del año siguiente. Stuff+ tiene correlación <b>{sg(fu.carreras.stuff.r, 2)}</b> y las carreras del año
                    anterior con <b>{sg(fu.carreras.carreras_pasadas.r, 2)}</b>. El modelo y sus variables se construyeron con datos de todo el período; este análisis no es un pronóstico temporal independiente ni valida prospectos sin historial.
                  </p>
                  <div className="habilidades">
                    {([['Stuff+', fu.carreras.stuff.r], ['Sus carreras pasadas', fu.carreras.carreras_pasadas.r], ['Su swing fallido pasado', fu.carreras.whiff_pasado.r]] as const).map(([k, v]) => (
                      <div key={k} className="habilidad"><span>{k}</span><div className="hab-barra"><i style={{ width: `${Math.max(0, v) / Math.max(0.01, fu.carreras.stuff.r, fu.carreras.carreras_pasadas.r, fu.carreras.whiff_pasado.r) * 100}%` }} /></div><b className="num">{sg(v, 2)}</b></div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="nota-tarjeta">
                    Para {nf(e.lanzadores_futuro)} lanzadores con al menos 300 lanzamientos antes y después, su Stuff+ de 2024 y 2025
                    se asocia con sus carreras de 2026 con correlación <b>{sg(e.futuro.stuff, 2)}</b>, y sus propias carreras con
                    <b> {sg(e.futuro.carreras_pasadas, 2)}</b>. Es una asociación retrospectiva con un modelo ajustado sobre el período completo, no un pronóstico independiente.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="tarjeta">
          <h3 className="titulo-tarjeta">Más calificación, menos carreras, escalón por escalón</h3>
          <p className="nota-tarjeta">
            Calificamos cada lanzamiento con un modelo entrenado <b>sin su lanzador</b> ({nf(c.reduce((a, t) => a + t.n, 0))} lanzamientos
            en cuatro grupos de lanzadores). Los de menos de 80 permitieron <b>{sg(bajo.carreras_100, 1)}</b> carreras por cada 100
            lanzamientos y los de 120 o más, <b>{sg(alto.carreras_100, 1)}</b>. De un extremo al otro hay{' '}
            <b>{nf(bajo.carreras_100 - alto.carreras_100, 1)} carreras cada 100 lanzamientos</b>. Stuff+ no ve dónde cayó la pelota.
            En estos grupos las carreras bajan escalón por escalón. La curva conserva las tablas históricas del objetivo,
            preparadas con el período completo; no sustituye la auditoría con tablas ajustadas sólo en entrenamiento.
          </p>
          <Calibracion c={c} />
        </div>

        <h3 className="titulo-sec sub">Benchmark histórico: tres separaciones de evaluación</h3>
        <div className="rejilla-3">
          <Prueba titulo="Lanzadores nuevos · pitcher holdout"
                  que="Se entrena sin un grupo de lanzadores y se prueba sólo con ellos."
                  cifra={ordena(hp.stuff)} unidad="correlación con las carreras de esos lanzadores"
                  nota={`Le gana al modelo nulo (R² ${nf(hp.stuff.r2, 5)} contra ${nf(nul.r2, 5)}). Pitching+, con ubicación y arsenal, llega a ${sg(hp.pitching.corr ?? 0, 3)}.`} />
          <Prueba titulo="Temporada nueva · season holdout"
                  que="Se entrena con 2024 y 2025 y se prueba con 2026."
                  cifra={ordena(j.holdout.temporada.stuff)} unidad="correlación con las carreras de 2026"
                  nota={`Casi igual que con lanzadores nuevos (R² ${nf(j.holdout.temporada.stuff.r2, 5)}). Es una sola separación temporal y no garantiza estabilidad futura.`} />
          <Prueba titulo="Categoría de altitud excluida"
                  que="Se entrena con la categoría sin altitud y se prueba en altitud extrema; no se conocen los estadios exactos."
                  cifra={ordena(j.holdout.parque.stuff)} unidad="correlación con las carreras en altura"
                  nota={`La correlación es pequeña y el R² es ${nf(j.holdout.parque.stuff.r2, 5)}. No equivale a excluir estadios identificados ni prueba que la física corrija todo el desfase de carreras.`} />
        </div>
        <div className="tarjeta metricas">
          <h3 className="titulo-tarjeta">Las métricas, como las pide la rúbrica</h3>
          <p className="nota-tarjeta">RMSE y R² del benchmark histórico. Las filas de prueba se excluyen del ajuste del modelo, pero las tablas del objetivo se calcularon globalmente. La auditoría de arriba ajusta esas tablas sólo con entrenamiento. Menor RMSE es mejor.</p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Prueba</th><th>Capa</th><th className="n">Variables</th><th className="n">RMSE</th><th className="n">R²</th><th className="n">RMSE contra el nulo</th></tr></thead>
              <tbody>
                <tr><th scope="row">Modelo nulo, promedio por conteo</th><td>Ninguna</td><td className="num n">0</td><td className="num n">{nf(nul.rmse, 5)}</td><td className="num n">{nf(nul.r2, 5)}</td><td className="num n tenue">base</td></tr>
                {([['Lanzadores nuevos', 'Stuff+', hp.stuff], ['Lanzadores nuevos', 'Location+', j.holdout.pitcher.location], ['Lanzadores nuevos', 'Pitching+', hp.pitching],
                   ['Temporada nueva', 'Stuff+', j.holdout.temporada.stuff], ['Altitud extrema excluida', 'Stuff+', j.holdout.parque.stuff]] as const).map(([prueba, capa, m]) => (
                  <tr key={prueba + capa}><th scope="row">{prueba}</th><td>{capa}</td><td className="num n">{m.n_features ?? hp.stuff.n_features ?? '—'}</td><td className="num n">{nf(m.rmse, 5)}</td><td className="num n">{nf(m.r2, 5)}</td>
                    <td className="num n destacado">{prueba !== 'Lanzadores nuevos' ? 'ver nota' : `${sg(((m.rmse - nul.rmse) / nul.rmse) * 100, 2)} %`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tenue nota-pie">La prueba de entorno excluye una categoría de altitud, no estadios identificados. La correlación en altitud extrema es {sg(j.holdout.parque.stuff.corr ?? 0, 3)} y su R² es {nf(j.holdout.parque.stuff.r2, 5)}. Cada separación usa otro subconjunto; su RMSE requiere un nulo calculado en ese mismo subconjunto.</p>
        </div>

        <p className="aclaracion">
          <b>Cómo leer la evidencia.</b> Un R² pequeño implica poca capacidad predictiva a nivel de lanzamiento.
          Una alta repetibilidad entre mitades no sustituye la validación temporal. Las asociaciones entre temporadas
          mostradas aquí son retrospectivas; para sostener una promesa de pronóstico hay que ajustar todas las etapas
          sólo con temporadas anteriores y evaluar una temporada futura que no haya intervenido en el diseño.
        </p>

        {r && <Robustez r={r} />}

        <div className="tarjeta">
          <h3 className="titulo-tarjeta">Qué tan bien predice cada pieza</h3>
          <p className="nota-tarjeta">
            Stuff+ predice directamente las carreras. Aparte, ocho modelos de componente explican de dónde sale ese valor
            (el swing, el swing fallido, el contacto). Cada barra dice cuánto mejor que adivinar con el promedio de la liga
            predice cada uno, con lanzadores nunca vistos. 0 % sería no saber nada.
          </p>
          <div className="habilidades">
            {comps.map(([k, v]) => (
              <div key={k} className="habilidad">
                <span>{COMP[k] ?? k}</span>
                <div className="hab-barra"><i style={{ width: `${Math.max(0, v.skill) * 100}%` }} /></div>
                <b className="num">{sg(v.skill * 100, 0)} %</b>
              </div>
            ))}
          </div>
          <p className="tenue nota-pie">
            El barril queda casi en cero. Qué tan perfecto le pega el bateador depende más del bateador que del
            lanzamiento.
          </p>
        </div>
      </div>
    </section>
  );
}
