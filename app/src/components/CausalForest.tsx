/**
 * CAUSAL FOREST, el modelo secundario del reto, en dos preguntas.
 *
 *  A. Táctica (la que plantea el reto). ¿Qué hubiera pasado si el pitcher lanzaba slider en vez de cambio en
 *     este conteo, contra este bateador? Se estima con todos los lanzamientos y se separa por entorno, así el
 *     club sabe si la mejor elección cambia en casa. Sale de scripts/10_local_extras.py (data/extras.json).
 *  B. Entorno. ¿Cuánto cuesta la altura en carreras reales, y le cuesta distinto a cada lanzador? Sale de
 *     scripts/09_causal_forest.py (data/causal.json).
 */
import { CORTE_AGUANTA, CORTE_MUCHO } from '../lexico';
import { useMemo, useState } from 'react';
import type { Causal, Contraste, Extras } from '../jurado';
import { nf, sg } from '../settings';

/* ------------------------------------------------------------------ A. táctica */

function colorEfecto(v: number, max: number) {
  // negativo = A es mejor para el pitcher (verde); positivo = B es mejor (rojo)
  const t = Math.min(1, Math.abs(v) / max);
  return v < 0
    ? `color-mix(in srgb, var(--gana) ${Math.round(12 + t * 70)}%, var(--basalto-alto))`
    : `color-mix(in srgb, var(--diablo) ${Math.round(12 + t * 70)}%, var(--basalto-alto))`;
}

function Rejilla({ c, altura, mismo }: { c: Contraste; altura: 0 | 1; mismo: 0 | 1 }) {
  const celdas = c.celdas.filter(x => x.altura === altura && x.mismo_lado === mismo);
  const max = Math.max(1, ...c.celdas.map(x => Math.abs(x.efecto)));
  return (
    <table className="rejilla-conteo">
      <thead><tr><th>Bolas \ Strikes</th><th>0</th><th>1</th><th>2</th></tr></thead>
      <tbody>
        {[0, 1, 2, 3].map(b => (
          <tr key={b}><th>{b}</th>
            {[0, 1, 2].map(s => {
              const x = celdas.find(k => k.conteo === `${b}-${s}`);
              if (!x) return <td key={s}>·</td>;
              const claro = x.ic90[0] > 0 || x.ic90[1] < 0;
              return (
                <td key={s} style={{ background: colorEfecto(x.efecto, max) }} className={claro ? 'claro' : 'dudoso'}
                    title={`${x.conteo} · ${sg(x.efecto, 2)} carreras por 100 · IC 90 % ${sg(x.ic90[0], 2)} a ${sg(x.ic90[1], 2)} · ${nf(x.n)} lanzamientos`}>
                  <b className="num">{sg(x.efecto, 1)}</b>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tactica({ extras }: { extras: Extras | null }) {
  const datos = extras?.cf_tactico && 'contrastes' in extras.cf_tactico ? extras.cf_tactico.contrastes : null;
  const claves = datos ? Object.keys(datos) : [];
  const [clave, setClave] = useState<string | null>(null);
  const [mismo, setMismo] = useState<0 | 1>(0);
  if (!datos || !claves.length) {
    return (
      <div className="tarjeta pendiente">
        <h3 className="titulo-tarjeta">La pregunta táctica del reto</h3>
        <p>
          ¿Qué hubiera pasado si el pitcher lanzaba slider en vez de cambio en este conteo, contra este bateador?
          Este análisis necesita los lanzamientos uno por uno, que sólo viven en la máquina del equipo. Se corre con
          <code> scripts/10_local_extras.py</code> y aparece aquí en cuanto se sube su resultado.
        </p>
      </div>
    );
  }
  const c = datos[clave ?? claves[0]];
  const m = c.por_entorno.mar, a = c.por_entorno.altura;
  const mejor = (v: number) => (v < 0 ? c.a : c.b);
  return (
    <div className="tarjeta">
      <h3 className="titulo-tarjeta">Qué lanzamiento conviene en cada conteo, en casa y de visitante</h3>
      <p className="nota-tarjeta">
        Elige una pareja de lanzamientos. Cada número dice cuántas carreras por cada 100 lanzamientos cambian si el pitcher
        tira <b>{c.a}</b> en vez de <b>{c.b}</b>. Verde quiere decir que {c.a.toLowerCase()} es mejor para el pitcher y rojo
        que {c.b.toLowerCase()} es mejor. Las celdas con borde punteado son dudosas, su intervalo cruza el cero.
      </p>
      <div className="chips">
        {claves.map(k => <button key={k} type="button" className={`chip${(clave ?? claves[0]) === k ? ' activo' : ''}`}
                                 aria-pressed={(clave ?? claves[0]) === k} onClick={() => setClave(k)}>{k}</button>)}
      </div>
      <div className="cifras-fila tres">
        <div><b className="num t-mar">{sg(m.efecto, 2)}</b><span>a nivel del mar. Conviene {mejor(m.efecto).toLowerCase()}.</span></div>
        <div><b className="num t-alt">{sg(a.efecto, 2)}</b><span>en altitud extrema. Conviene {mejor(a.efecto).toLowerCase()}.</span></div>
        <div><b className="num">{sg(c.cambio_por_altura, 2)}</b><span>cuánto cambia la ventaja al subir a la altura</span></div>
      </div>
      <div className="segmentado pequeno" role="group" aria-label="Lado del bateador">
        <button type="button" className={mismo === 0 ? 'activo' : ''} onClick={() => setMismo(0)}>Bateador del lado contrario</button>
        <button type="button" className={mismo === 1 ? 'activo' : ''} onClick={() => setMismo(1)}>Bateador del mismo lado</button>
      </div>
      <div className="rejillas-dos">
        <div><p className="fig-titulo t-mar">Nivel del mar</p><Rejilla c={c} altura={0} mismo={mismo} /></div>
        <div><p className="fig-titulo t-alt">Harp Helú y altitud extrema</p><Rejilla c={c} altura={1} mismo={mismo} /></div>
      </div>
      <p className="tenue nota-pie">{nf(c.filas)} lanzamientos. Controlamos por la calidad del lanzador, cuánto usa cada tipo, la vuelta al orden, las manos y la velocidad de su recta.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ B. entorno */

function Gates({ g }: { g: Causal['gates'] }) {
  const W = 560, H = 250, PL = 46, PB = 46, PT = 14;
  const vals = g.flatMap(x => [x.ic[0], x.ic[1], x.predicho]);
  const y0 = Math.min(0, Math.floor(Math.min(...vals))), y1 = Math.ceil(Math.max(...vals) + 0.2);
  const bw = (W - PL) / g.length;
  const sx = (i: number) => PL + bw * i + bw / 2;
  const sy = (v: number) => PT + ((y1 - v) / (y1 - y0)) * (H - PT - PB);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bosque" role="img" aria-label="Castigo observado por grupo de efecto predicho">
      {[0, 1, 2, 3].filter(v => v >= y0 && v <= y1).map(v => <g key={v}>
        <line x1={PL} x2={W} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'eje-cero' : 'rejilla'} />
        <text x={PL - 8} y={sy(v) + 4} textAnchor="end" className="eje">{sg(v, 0)}</text>
      </g>)}
      {g.map((x, i) => <g key={x.grupo}>
        <rect x={sx(i) - bw * 0.28} y={sy(x.observado)} width={bw * 0.56} height={sy(0) - sy(x.observado)} rx={4} className="barra-mala" />
        <line x1={sx(i)} x2={sx(i)} y1={sy(x.ic[0])} y2={sy(x.ic[1])} stroke="var(--tinta)" strokeWidth={2} />
        <circle cx={sx(i)} cy={sy(x.predicho)} r={6} className="pred" />
        <text x={sx(i)} y={H - PB + 18} textAnchor="middle" className="eje fuerte">{x.etiqueta}</text>
        <text x={sx(i)} y={H - PB + 34} textAnchor="middle" className="eje">predicho {sg(x.predicho, 2)}</text>
      </g>)}
    </svg>
  );
}

function Entorno({ c }: { c: Causal }) {
  const [buscar, setBuscar] = useState('');
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (q ? c.pitchers.filter(p => p.nombre.toLowerCase().includes(q) || p.arsenal.toLowerCase().includes(q)) : c.pitchers).slice(0, 15);
  }, [c.pitchers, buscar]);
  const dentro = c.pitchers.filter(p => p.tau_lo <= c.ate && c.ate <= p.tau_hi).length;
  return (
    <>
      <div className="cifras-fila cuatro">
        <div><b className="num d-mucho">{sg(c.ate, 2)}</b><span>carreras más por cada 100 lanzamientos cuesta lanzar en altura (IC 90 % de {nf(c.ate_ic90[0], 2)} a {nf(c.ate_ic90[1], 2)})</span></div>
        <div><b className="num">{nf(c.pitchers_n)}</b><span>lanzadores que tiraron al menos 120 veces en cada entorno, comparados consigo mismos</span></div>
        <div><b className="num">{nf(c.tau_rango[0], 2)} a {nf(c.tau_rango[1], 2)}</b><span>rango del efecto entre lanzadores. Es angosto.</span></div>
        <div><b className="num">{nf(dentro)} de {nf(c.pitchers_n)}</b><span>lanzadores cuyo intervalo incluye el promedio</span></div>
      </div>

      <div className="rejilla-2">
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">La prueba honesta, fuera de muestra</h3>
          <p className="nota-tarjeta">
            A cada lanzador le damos el efecto que predice un bosque que no lo vio. Luego lo agrupamos de menor a mayor efecto y
            medimos cuántas carreras extra de verdad permitió en altura. Si el bosque distinguiera bien a los lanzadores, las barras
            subirían de izquierda a derecha.
          </p>
          <Gates g={c.gates} />
          <p className="tenue nota-pie">Barras, castigo observado con su intervalo de 95 %. Puntos, castigo predicho.</p>
        </div>
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">Qué nos dice</h3>
          <p>
            <b>El promedio es firme.</b> En carreras reales, la altura cuesta {sg(c.ate, 2)} por cada 100 lanzamientos. Es la
            misma dirección que predice Stuff+ con física, ahora medida en el marcador.
          </p>
          <p>
            <b>Las diferencias entre lanzadores no se sostienen.</b> Las barras no suben. Con 333 lanzadores y unos cientos de
            lanzamientos cada uno, las carreras tienen demasiado azar para separar a un lanzador de otro. El bosque sí aprende la
            misma dirección que Stuff+ (correlación de {nf(c.acuerdo_stuff.pearson, 2)} fuera de muestra, p {'<'} 0.001), pero el
            marcador no alcanza a confirmarlo.
          </p>
          <p>
            <b>Por eso decides con Stuff+.</b> La física separa a los lanzadores con lo que es estable, su forma. Las carreras
            confirman el tamaño del castigo promedio. Este resultado es la razón por la que construimos el modelo así.
          </p>
        </div>
      </div>

      <div className="tarjeta">
        <h3 className="titulo-tarjeta">El efecto estimado para cada lanzador</h3>
        <div className="tabla-cabeza">
          <p className="nota-tarjeta">Ordenados del que menos sufre al que más. El intervalo es de 90 %.</p>
          <label className="buscar"><span className="solo-lectores">Buscar</span>
            <input type="search" placeholder="Busca 1099 o slider" value={buscar} onChange={e => setBuscar(e.target.value)} /></label>
        </div>
        <div className="tabla-scroll">
          <table className="tabla-datos">
            <thead><tr><th>Lanzador</th><th>Arsenal</th><th className="n">Efecto CF</th><th className="n">Intervalo</th>
              <th className="n">Cambio de Stuff+</th><th className="n">Carreras extra observadas</th><th className="n">Lanzamientos</th></tr></thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.nombre}>
                  <th scope="row">{p.nombre}</th>
                  <td className="arsenal-celda">{p.arsenal}</td>
                  <td className="num n destacado">{sg(p.tau, 2)}</td>
                  <td className="num n tenue">{nf(p.tau_lo, 2)} a {nf(p.tau_hi, 2)}</td>
                  <td className={`num n ${p.delta_hh > CORTE_AGUANTA ? 'd-aguanta' : p.delta_hh > CORTE_MUCHO ? 'd-pierde' : 'd-mucho'}`}>{sg(p.delta_hh)}</td>
                  <td className="num n">{sg(p.carreras_delta, 1)}</td>
                  <td className="num n tenue">{nf(p.n_hh + p.n_mar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ la vista */

export function CausalForest({ c, extras }: { c: Causal; extras: Extras | null }) {
  return (
    <section className="vista-sec">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Modelo secundario del reto · Causal Forest</p>
          <h2>¿Qué hubiera pasado si…?</h2>
          <p className="entrada ancha">
            Stuff+ califica lanzamientos. Un Causal Forest responde otra cosa, preguntas de qué hubiera pasado. Compara
            situaciones casi idénticas que sólo difieren en una decisión, por ejemplo slider o cambio, y mide la diferencia en
            carreras. Lo usamos para dos preguntas.
          </p>
          <ol className="dos-preguntas">
            <li><b>Táctica.</b> En cada conteo y contra cada tipo de bateador, ¿qué lanzamiento conviene, y cambia la respuesta en casa?</li>
            <li><b>Entorno.</b> ¿Cuánto cuesta la altura en carreras reales, y le cuesta distinto a cada lanzador?</li>
          </ol>
        </header>

        <div className="como-cf tarjeta">
          <h3 className="titulo-tarjeta">Cómo funciona, en tres pasos</h3>
          <ol className="pasos-cf">
            <li><b>Quitamos lo que confunde.</b> Un lanzador con buen slider lo usa más y además es mejor. Dos modelos de árboles
              predicen el resultado y la decisión a partir de todo lo demás (calidad del lanzador, uso de cada tipo, conteo), y
              nos quedamos con lo que no explican. Es Double Machine Learning.</li>
            <li><b>Agrupamos situaciones parecidas.</b> Un bosque de árboles honestos parte los datos en grupos de situaciones
              parecidas y, dentro de cada grupo, compara la decisión contra la alternativa.</li>
            <li><b>Medimos con intervalos.</b> Cada efecto trae su intervalo de confianza, y separamos entrenamiento y prueba por
              lanzador para no engañarnos.</li>
          </ol>
        </div>

        <h3 className="titulo-sec sub">A · La pregunta táctica</h3>
        <Tactica extras={extras} />

        <h3 className="titulo-sec sub">B · El costo de la altura en carreras reales</h3>
        <Entorno c={c} />
      </div>
    </section>
  );
}
