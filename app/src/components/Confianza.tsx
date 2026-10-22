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
            Stuff+ califica el brazo, no el resultado de un lanzamiento. Lo que pasa con un lanzamiento suelto
            depende sobre todo de dónde cayó y del azar, y eso lo miden Location+ y Pitching+. Por eso a Stuff+ lo
            probamos como se prueba en las Grandes Ligas. Tiene que ser un rasgo estable del lanzador, tiene que
            anticipar sus carreras futuras, y tiene que ordenar las carreras de
            lanzadores que el modelo <b>nunca vio</b>.
          </p>
        </header>

        {e && (
          <div className="rejilla-2">
            <div className="tarjeta">
              <h3 className="titulo-tarjeta">Es un rasgo del lanzador, no suerte</h3>
              <p className="nota-tarjeta">
                Partimos los lanzamientos de cada uno de {nf(e.lanzadores_mitades)} lanzadores en dos mitades. Su Stuff+ en
                una mitad predice el de la otra con correlación <b>{nf(e.mitades.stuff, 2)}</b>. Sus carreras permitidas,
                apenas <b>{nf(e.mitades.rv, 2)}</b>. Las carreras de un lanzador son casi azar. Su Stuff+ no.
              </p>
              <div className="habilidades">
                {([['Stuff+', e.mitades.stuff], ['Location+', e.mitades.location], ['Pitching+', e.mitades.pitching], ['Carreras que permitió', e.mitades.rv]] as const).map(([k, v]) => (
                  <div key={k} className="habilidad"><span>{k}</span><div className="hab-barra"><i style={{ width: `${Math.max(0, v) * 100}%` }} /></div><b className="num">{nf(v, 2)}</b></div>
                ))}
              </div>
            </div>
            <div className="tarjeta">
              <h3 className="titulo-tarjeta">Anticipa el futuro sin necesitar historial</h3>
              <p className="nota-tarjeta">
                Para {nf(e.lanzadores_futuro)} lanzadores con al menos 300 lanzamientos antes y después, medimos qué
                anticipa mejor sus carreras de 2026. Su Stuff+ de 2024 y 2025 lo hace con correlación <b>{sg(e.futuro.stuff, 2)}</b>.
                Sus propias carreras de esos años, con <b>{sg(e.futuro.carreras_pasadas, 2)}</b>. Con {nf(e.lanzadores_futuro)} lanzadores la
                diferencia no es concluyente, pero el punto es otro. Stuff+ anticipa igual de bien sin necesitar años de
                resultados, así que sirve para un prospecto que todavía no los tiene.
              </p>
              <div className="habilidades">
                {([['Stuff+', e.futuro.stuff], ['Location+', e.futuro.location], ['Pitching+', e.futuro.pitching], ['Sus carreras pasadas', e.futuro.carreras_pasadas]] as const).map(([k, v]) => (
                  <div key={k} className="habilidad"><span>{k}</span><div className="hab-barra"><i style={{ width: `${Math.max(0, v) / Math.max(0.01, ...Object.values(e.futuro)) * 100}%` }} /></div><b className="num">{sg(v, 2)}</b></div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="tarjeta">
          <h3 className="titulo-tarjeta">Más calificación, menos carreras, escalón por escalón</h3>
          <p className="nota-tarjeta">
            Calificamos cada lanzamiento con un modelo entrenado <b>sin su lanzador</b> ({nf(c.reduce((a, t) => a + t.n, 0))} lanzamientos
            en cinco grupos de lanzadores). Los de menos de 80 permitieron <b>{sg(bajo.carreras_100, 1)}</b> carreras por cada 100
            lanzamientos y los de 120 o más, <b>{sg(alto.carreras_100, 1)}</b>. De un extremo al otro hay{' '}
            <b>{nf(bajo.carreras_100 - alto.carreras_100, 1)} carreras cada 100 lanzamientos</b>. La diferencia es chica a
            propósito. Stuff+ no ve dónde cayó la pelota, y en un lanzamiento suelto eso pesa más que el brazo. Lo que importa
            es que baja escalón por escalón, sin un solo salto al revés.
          </p>
          <Calibracion c={c} />
        </div>

        <h3 className="titulo-sec sub">Las tres pruebas fuera de muestra que pide el reto</h3>
        <div className="rejilla-3">
          <Prueba titulo="Lanzadores nuevos · pitcher holdout"
                  que="Se entrena sin un grupo de lanzadores y se prueba sólo con ellos."
                  cifra={ordena(hp.stuff)} unidad="correlación con las carreras de esos lanzadores"
                  nota={`Le gana al modelo nulo (R² ${nf(hp.stuff.r2, 5)} contra ${nf(nul.r2, 5)}). Pitching+, con ubicación y arsenal, llega a ${sg(hp.pitching.corr ?? 0, 3)}.`} />
          <Prueba titulo="Temporada nueva · season holdout"
                  que="Se entrena con 2024 y 2025 y se prueba con 2026."
                  cifra={ordena(j.holdout.temporada.stuff)} unidad="correlación con las carreras de 2026"
                  nota={`Casi igual que con lanzadores nuevos (R² ${nf(j.holdout.temporada.stuff.r2, 5)}). Lo aprendido no se gasta con el tiempo.`} />
          <Prueba titulo="Estadio nuevo · park holdout"
                  que="Se entrena sin ningún estadio de altura y se prueba sólo en altura."
                  cifra={ordena(j.holdout.parque.stuff)} unidad="correlación con las carreras en altura"
                  nota={`Sigue ordenando de mejor a peor en un aire que nunca vio. Lo que falla es el nivel (R² ${nf(j.holdout.parque.stuff.r2, 5)}). Entrenado a nivel del mar, espera menos carreras de las que pasan en altura. Ese desfase es el efecto que este trabajo mide y corrige con la física.`} />
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
                  <tr key={prueba + capa}><th scope="row">{prueba}</th><td>{capa}</td><td className="num n">{m.n_features ?? hp.stuff.n_features ?? '—'}</td><td className="num n">{nf(m.rmse, 5)}</td><td className="num n">{nf(m.r2, 5)}</td>
                    <td className="num n destacado">{prueba !== 'Lanzadores nuevos' ? 'ver nota' : `${sg(((m.rmse - nul.rmse) / nul.rmse) * 100, 2)} %`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tenue nota-pie">El estadio nuevo se prueba sólo en altura, donde hay más carreras. Su R² queda apenas abajo de cero aunque el orden se mantiene (correlación {sg(j.holdout.parque.stuff.corr ?? 0, 3)}), porque un modelo de nivel del mar espera menos carreras de las que pasan. La temporada nueva y el estadio nuevo son otros subconjuntos de lanzamientos, así que su RMSE no se compara con el nulo de toda la liga.</p>
        </div>

        <p className="aclaracion">
          <b>Por qué los porcentajes se ven chicos.</b> El resultado de un lanzamiento suelto es casi puro azar.
          El mismo lanzamiento perfecto a veces termina en jonrón. Ningún modelo explica mucho de un lanzamiento
          aislado, y menos si no sabe dónde cayó, que es el caso de Stuff+. Por eso el valor de Stuff+ está en que es estable
          y en que anticipa las carreras futuras de un lanzador, las dos tarjetas de arriba. Contra el modelo nulo, gana con
          lanzadores nuevos, y con temporada nueva ordena igual. En un estadio nuevo ordena, pero falla el nivel, y por eso hace falta la física.
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
