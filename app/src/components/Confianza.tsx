/**
 * ¿FUNCIONA?: criterios 1 (calidad) y 2 (robustez fuera de muestra).
 *
 * La prueba que entiende cualquiera: si la calificación sirve, los lanzamientos con Stuff+ alto
 * deben permitir menos carreras que los de Stuff+ bajo, y eso tiene que pasar con lanzadores que
 * el modelo nunca vio. Se muestra eso primero, en carreras por cada 100 lanzamientos. Las métricas
 * técnicas van después, con su traducción.
 */
import type { Jurado, Tramo } from '../jurado';
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

export function Confianza({ j }: { j: Jurado }) {
  const c = j.calibracion;
  const bajo = c[0], alto = c.find(t => t.tramo === '110-120') ?? c[c.length - 1];
  const hp = j.holdout.pitcher, nul = j.modelo_nulo;
  // r² fuera de muestra en %: qué parte de lo que pasa explica el modelo. El nulo explica ~0 %.
  const mejora = (r2: number) => nf(r2 * 100, 1) + ' %';
  const comps = Object.entries(j.holdout.componentes).sort((a, b) => b[1].skill - a[1].skill);

  return (
    <section className="vista-sec">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Criterios 1 y 2 · Calidad y robustez fuera de muestra</p>
          <h2>¿Se puede confiar en la calificación?</h2>
          <p className="entrada ancha">
            Si Stuff+ sirve, los lanzamientos con calificación alta deben permitir menos carreras que los de
            calificación baja. Y tiene que pasar con lanzadores que el modelo <b>nunca vio</b>. Si sólo
            funcionara con los conocidos, estaría memorizando en vez de entender.
          </p>
        </header>

        <div className="tarjeta">
          <h3 className="titulo-tarjeta">Más calificación, menos carreras, escalón por escalón</h3>
          <p className="nota-tarjeta">
            Calificamos cada lanzamiento con un modelo entrenado <b>sin su lanzador</b> ({nf(c.reduce((a, t) => a + t.n, 0))} lanzamientos
            en cinco grupos de lanzadores). Los de menos de 80 permitieron <b>{sg(bajo.carreras_100, 1)}</b> carreras por cada 100
            lanzamientos y los de 110 a 120, <b>{sg(alto.carreras_100, 1)}</b>. De un extremo al otro hay
            unas <b>{nf(bajo.carreras_100 - alto.carreras_100, 0)} carreras cada 100 lanzamientos</b>. Lo predicho (puntos)
            sigue a lo observado (barras) escalón por escalón y sólo se separa en los extremos, donde hay menos lanzamientos.
          </p>
          <Calibracion c={c} />
        </div>

        <h3 className="titulo-sec sub">Las tres pruebas fuera de muestra que pide el reto</h3>
        <div className="rejilla-3">
          <Prueba titulo="Lanzadores nuevos · pitcher holdout"
                  que="Se entrena sin un grupo de lanzadores y se prueba sólo con ellos."
                  cifra={mejora(hp.stuff.r2)} unidad={`de lo que pasa, explicado (el nulo explica ${nf(nul.r2 * 100, 2)} %)`}
                  nota={`Pitching+, con todo el contexto, llega a ${mejora(hp.pitching.r2)}. El modelo nulo (promedio por conteo) explica ${nf(nul.r2 * 100, 2)} %.`} />
          <Prueba titulo="Temporada nueva · season holdout"
                  que="Se entrena con 2024 y 2025 y se prueba con 2026."
                  cifra={mejora(j.holdout.temporada.stuff.r2)} unidad={`de lo que pasa, explicado (el nulo explica ${nf(nul.r2 * 100, 2)} %)`}
                  nota="Igual o mejor que con lanzadores nuevos. Lo aprendido no se gasta con el tiempo." />
          <Prueba titulo="Estadio nuevo · park holdout"
                  que="Se entrena sin ningún estadio de altura y se prueba sólo en altura."
                  cifra={mejora(j.holdout.parque.stuff.r2)} unidad={`de lo que pasa, explicado (el nulo explica ${nf(nul.r2 * 100, 2)} %)`}
                  nota="Sigue funcionando en un aire que nunca vio, aunque rinde menos. Ese es justo el efecto que medimos." />
        </div>
        <div className="tarjeta metricas">
          <h3 className="titulo-tarjeta">Las métricas, como las pide la rúbrica</h3>
          <p className="nota-tarjeta">Error cuadrático medio (RMSE) y R², en carreras por lanzamiento, siempre con datos que el modelo no vio. Menor RMSE es mejor.</p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Prueba</th><th>Capa</th><th className="n">Variables</th><th className="n">RMSE</th><th className="n">R²</th><th className="n">RMSE contra el nulo</th></tr></thead>
              <tbody>
                <tr><th scope="row">Modelo nulo, promedio por conteo</th><td>Ninguna</td><td className="num n">0</td><td className="num n">{nf(nul.rmse, 5)}</td><td className="num n">{nf(nul.r2, 5)}</td><td className="num n tenue">base</td></tr>
                {([['Lanzadores nuevos', 'Stuff+', hp.stuff], ['Lanzadores nuevos', 'Location+', j.holdout.pitcher.location], ['Lanzadores nuevos', 'Pitching+', hp.pitching],
                   ['Temporada nueva', 'Stuff+', j.holdout.temporada.stuff], ['Estadio nuevo, en altura', 'Stuff+', j.holdout.parque.stuff]] as const).map(([prueba, capa, m]) => (
                  <tr key={prueba + capa}><th scope="row">{prueba}</th><td>{capa}</td><td className="num n">{m.n_features ?? 20}</td><td className="num n">{nf(m.rmse, 5)}</td><td className="num n">{nf(m.r2, 5)}</td>
                    <td className="num n destacado">{prueba.startsWith('Estadio') ? 'ver nota' : `${sg(((m.rmse - nul.rmse) / nul.rmse) * 100, 2)} %`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tenue nota-pie">El estadio nuevo se prueba sólo en altura, donde hay más carreras y más azar, así que su RMSE no se compara con el nulo de toda la liga. Ahí lo justo es el R², que sigue arriba de cero.</p>
        </div>

        <p className="aclaracion">
          <b>Por qué los porcentajes se ven chicos.</b> El resultado de un lanzamiento suelto es casi puro azar.
          El mismo lanzamiento perfecto a veces termina en jonrón. Ningún modelo explica mucho de un lanzamiento
          aislado. Lo que importa es que, sumados, los mejor calificados permiten muchas menos carreras (la gráfica
          de arriba). El reto pide vencer al modelo nulo, y el nuestro le gana en las tres pruebas.
        </p>

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
