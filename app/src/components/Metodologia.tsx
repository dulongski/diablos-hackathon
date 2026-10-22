/**
 * METODOLOGÍA: qué hicimos, paso a paso. Cada paso dice primero qué hace en palabras simples, después por qué
 * y al final su evidencia. La validación completa vive en la pestaña Validación.
 */
import type { ReactNode } from 'react';
import type { Extras } from '../jurado';
import { nf } from '../settings';
import type { Vista } from './Pestanas';

function Parte({ n, titulo, color, children, figura, id }: { n: number; titulo: string; color: string; children: ReactNode; figura?: ReactNode; id: string }) {
  return (
    <article id={id} className={`parte${figura ? ' con-figura' : ''}`} style={{ ['--acento' as string]: color }}>
      <span className="parte-n num">{String(n).padStart(2, '0')}</span>
      <div className="parte-cuerpo">
        <div className="parte-texto"><h3>{titulo}</h3>{children}</div>
        {figura && <div className="parte-figura">{figura}</div>}
      </div>
    </article>
  );
}

/** La distribución de Stuff+ en la liga, dibujada desde sus percentiles. */
function Campana({ pct }: { pct: Record<string, number> }) {
  const W = 640, H = 220, PAD = 34, LO = 64, HI = 136;
  const x = (v: number) => PAD + ((v - LO) / (HI - LO)) * (W - 2 * PAD);
  const mu = pct['50'] ?? 100, sd = ((pct['75'] ?? 107) - (pct['25'] ?? 94)) / 1.349;
  const pts: string[] = [];
  for (let v = LO; v <= HI; v += 0.5) {
    const y = Math.exp(-0.5 * ((v - mu) / sd) ** 2);
    pts.push(`${x(v).toFixed(1)},${(H - PAD - y * (H - 2 * PAD)).toFixed(1)}`);
  }
  const marcas = [{ v: 80, t: 'reemplazo' }, { v: 90, t: 'malo' }, { v: 100, t: 'promedio' }, { v: 110, t: 'muy bueno' }, { v: 120, t: 'élite' }];
  return (
    <figure className="campana">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distribución de Stuff+ en la LMB">
        <polygon points={`${x(LO)},${H - PAD} ${pts.join(' ')} ${x(HI)},${H - PAD}`} className="campana-area" />
        <polyline points={pts.join(' ')} className="campana-linea" />
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="var(--tezontle)" />
        {marcas.map(m => (
          <g key={m.v}>
            <line x1={x(m.v)} x2={x(m.v)} y1={PAD - 6} y2={H - PAD} stroke={m.v === 100 ? 'var(--ceniza)' : 'var(--rejilla)'} strokeDasharray={m.v === 100 ? '' : '3 3'} />
            <text x={x(m.v)} y={H - PAD + 16} className="eje fuerte" textAnchor="middle">{m.v}</text>
            <text x={x(m.v)} y={PAD - 10} className="eje" textAnchor="middle">{m.t}</text>
          </g>
        ))}
        <text x={W - PAD} y={H - 4} className="eje-titulo" textAnchor="end">Stuff+</text>
      </svg>
    </figure>
  );
}

const PASOS: { id: string; t: string }[] = [
  { id: 'm-datos', t: 'Datos' }, { id: 'm-valor', t: 'Valor en carreras' }, { id: 'm-escala', t: 'Escala Stuff+' },
  { id: 'm-aire', t: 'Medir el aire' }, { id: 'm-vuelo', t: 'Volar en otro aire' }, { id: 'm-capas', t: 'Tres capas' },
  { id: 'm-pruebas', t: 'Pruebas' },
];

/** Cada variable que pide el reto y dónde vive en nuestro modelo. */
const VARIABLES: { grupo: string; filas: [string, string, string][] }[] = [
  { grupo: 'Física del lanzamiento', filas: [
    ['velocity', 'RelSpeed, EffectiveVelo, ZoneSpeed, SpeedDrop', 'Stuff+'],
    ['spin_rate, spin_axis', 'SpinRate, SpinAxis', 'Stuff+'],
    ['ivb, hb', 'InducedVertBreak, HorzBreak, VertBreak, movement_total', 'Stuff+'],
    ['extension, release_height, release_side', 'Extension, RelHeight, RelSide, VertRelAngle, HorzRelAngle', 'Stuff+'],
    ['(H4) eficiencia de giro', 'spin_efficiency, la parte del giro que produce movimiento', 'Stuff+'],
    ['(propia) ángulos de llegada', 'VertApprAngle, HorzApprAngle, ZoneTime', 'Stuff+'],
  ]},
  { grupo: 'Arsenal, relacionales', filas: [
    ['velo_diff_vs_fb, ivb_diff_vs_fb, hb_diff_vs_fb', 'Iguales, contra la recta principal del lanzador en esa temporada, más movement_diff_vs_fb', 'Pitching+'],
    ['tunnel_similarity', 'Igual, qué tan parecido sale de la mano contra su recta', 'Pitching+'],
    ['pitch_usage_pct', 'Igual, más arsenal_size', 'Pitching+'],
    ['prev_pitch_type', 'prev_is_fastball y prev_velo_diff', 'Pitching+'],
    ['pitcher_handedness, batter_handedness', 'is_rhp, is_rhb y platoon_same', 'Stuff+ y Location+'],
  ]},
  { grupo: 'Contexto y ambiente', filas: [
    ['count', 'balls y strikes', 'Location+'],
    ['zone', 'PlateLocHeight, PlateLocSide y plate_dist, continuas y más finas que 9 cuadrantes', 'Location+'],
    ['inning', 'times_through, la vuelta al orden, que es lo que el inning aproxima', 'Pitching+'],
    ['stadium, altitude_m', 'No vienen en los datos. Medimos el aire en cada juego y lo aplicamos con física, no como variable', 'Transferencia'],
    ['runners_on_base', 'No viene en los datos. Por eso el valor se mide sobre los 12 conteos', 'Objetivo'],
  ]},
];

export function Metodologia({ physics, models, extras, irA }: {
  physics: Record<string, any>; models: Record<string, any>; extras: Extras | null; irA: (v: Vista) => void;
}) {
  const mae = physics.mae_holdout ?? {};
  const cub = physics.rho_por_cubeta ?? {};
  const shap = extras?.shap && !('error' in extras.shap) ? extras.shap : null;

  return (
    <section className="vista-sec metodo">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Metodología · Qué hicimos, paso a paso</p>
          <h2>Así construimos Diablos Stuff+</h2>
          <p className="entrada ancha">
            La idea en una frase. Calificamos cada lanzamiento por su física, lo volamos con el aire del Harp Helú y lo
            calificamos otra vez. La diferencia es lo que la altitud le quita. Estos son los siete pasos, en orden.
          </p>
          <nav className="pasos-metodo" aria-label="Pasos">
            {PASOS.map((p, i) => (
              <a key={p.id} href={`#${p.id}`} onClick={e => { e.preventDefault(); document.getElementById(p.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                <span className="num">{i + 1}</span>{p.t}
              </a>
            ))}
          </nav>
        </header>

        <div className="partes">
          <Parte id="m-datos" n={1} color="var(--ceniza)" titulo="Los datos y lo que les falta"
            figura={<table className="tabla-simple">
              <thead><tr><th>Falta en los datos</th><th>Cómo lo resolvimos</th></tr></thead>
              <tbody>
                <tr><td>Estadio y altitud</td><td>Medimos el aire en la trayectoria (paso 4)</td></tr>
                <tr><td>Corredores en base</td><td>Valor sobre los 12 conteos (paso 2)</td></tr>
                <tr><td>Fecha y número de lanzamiento</td><td>Orden del archivo, que viene cronológico</td></tr>
                <tr><td>Golpes al bateador, en cero</td><td>Reconstruidos desde el resultado del lanzamiento</td></tr>
              </tbody>
            </table>}>
            <p>ISAC entregó 635,002 lanzamientos de la LMB, de 2024 a 2026, medidos con Trackman. Cada fila trae velocidad, giro,
              movimiento, punto de salida, ubicación, conteo y resultado. La liga anonimizó a los lanzadores.</p>
            <p className="nota">Supuestos. El brazo no cambia con la altitud (lo comprobamos, el giro cambia 0.5 %). Lo que cambia en
              el vuelo viene del aire. Medimos valor y no suerte. La escala toma como referencia a la liga.</p>
          </Parte>

          <Parte id="m-valor" n={2} color="var(--diablo)" titulo="Qué medimos, el valor en carreras de cada lanzamiento">
            <p>Un lanzamiento cambia el conteo, y cada conteo vale un número de carreras para la ofensiva. Un strike en 1 y 1 le quita
              carreras al bateador. Una bola en 3 y 2 se las regala. El valor de un lanzamiento es ese cambio, y es lo que el modelo
              aprende a predecir a partir de la física.</p>
            <p>El reto propone combinar varias probabilidades (swing fallido, persecución, strike cantado, contacto débil, rodado,
              contacto duro) en una sola calificación. Las entrenamos todas, pero Stuff+ predice directo el <b>valor esperado en
              carreras</b>. Ese valor ya es la combinación ponderada correcta, porque pesa cada resultado por lo que vale en el
              marcador, sin tener que inventar los pesos. Los ocho modelos de componente sirven para explicar de dónde sale cada
              calificación (pestaña Validación).</p>
          </Parte>

          <Parte id="m-escala" n={3} color="var(--diablo)" titulo="La escala Stuff+"
            figura={models.distribucion_stuff_plus && <><p className="figura-titulo">Cómo se reparte Stuff+ en la LMB</p><Campana pct={models.distribucion_stuff_plus} /></>}>
            <pre className="formula">Stuff+ = 100 + 10 × z(−carreras esperadas)</pre>
            <p>z mide cuántas desviaciones estándar está un lanzamiento del promedio de la liga. 100 es el promedio, 110 es una
              desviación mejor, 120 es élite y 80 está por debajo de reemplazo. El signo se invierte porque menos carreras es
              mejor para el lanzador. Así un número arriba de 100 siempre es mejor que el promedio, como ERA+ u OPS+.</p>
          </Parte>

          <Parte id="m-aire" n={4} color="var(--aviso)" titulo="Medimos el aire en la trayectoria"
            figura={<table className="tabla-simple">
              <thead><tr><th>Grupo de estadios</th><th className="n">Índice del aire</th></tr></thead>
              <tbody>
                <tr><td>Nivel del mar</td><td className="num n">{nf(cub['No Altitude'] ?? 1, 3)}</td></tr>
                <tr><td>Altitud media</td><td className="num n">{nf(cub['Medium Altitude'] ?? 0.898, 3)}</td></tr>
                <tr><td>Altitud extrema, Harp Helú</td><td className="num n destacado">{nf(cub['Extreme Altitude'] ?? 0.853, 3)}</td></tr>
              </tbody>
            </table>}>
            <p>Los datos no dicen en qué estadio se lanzó cada pelota. La pelota sí lo dice. Trackman mide cuánto frena, y el
              frenado depende del aire. Con eso sacamos un índice del aire para cada juego, donde 1.00 es el nivel del mar.</p>
            <p className="nota">Descubrimos algo que un modelo simple ignora. El frenado cae menos que la densidad, porque con menos aire
              sube el coeficiente de arrastre de la pelota. Y el empuje del giro cae más, como ρ elevado a 1.39 contra 0.96 del
              frenado. Escalar todo igual subestima el castigo en un tercio.</p>
          </Parte>

          <Parte id="m-vuelo" n={5} color="var(--nivel-mar)" titulo="Volamos cada lanzamiento en el otro aire"
            figura={<><p className="figura-titulo">Error al predecir la forma en altura, con lanzadores que la calibración nunca vio</p>
              <table className="tabla-simple">
                <thead><tr><th>Error</th><th className="n">Sin ajustar</th><th className="n">Sólo densidad</th><th className="n">Nuestro modelo</th></tr></thead>
                <tbody>
                  <tr><td>Movimiento vertical</td><td className="num n">{nf(mae.sin_transferir?.ivb ?? 2.573, 2)} in</td><td className="num n">{nf(mae.solo_densidad?.ivb ?? 1.119, 2)} in</td><td className="num n destacado">{nf(mae.calibrado?.ivb ?? 0.802, 2)} in</td></tr>
                  <tr><td>Movimiento lateral</td><td className="num n">{nf(mae.sin_transferir?.hb ?? 2.932, 2)} in</td><td className="num n">{nf(mae.solo_densidad?.hb ?? 1.612, 2)} in</td><td className="num n destacado">{nf(mae.calibrado?.hb ?? 0.875, 2)} in</td></tr>
                  <tr><td>Velocidad al plato</td><td className="num n">{nf(mae.sin_transferir?.zone_speed ?? 1.323, 2)} mph</td><td className="num n">{nf(mae.solo_densidad?.zone_speed ?? 0.578, 2)} mph</td><td className="num n destacado">{nf(mae.calibrado?.zone_speed ?? 0.574, 2)} mph</td></tr>
                </tbody>
              </table></>}>
            <div className="flujo">
              <div className="paso"><b>Lanzamiento real</b><span>salida, velocidad y giro medidos</span></div>
              <span className="flujo-flecha" aria-hidden>→</span>
              <div className="paso"><b>Vuelo en otro aire</b><span>misma mano, otro aire</span></div>
              <span className="flujo-flecha" aria-hidden>→</span>
              <div className="paso"><b>Stuff+ otra vez</b><span>el mismo modelo lo califica</span></div>
            </div>
            <p>La altitud no entra al modelo como una variable más. Si entrara, se mezclaría con quién lanza en altura y no podrías
              calificar a alguien que nunca ha lanzado ahí. Entra por física. Un simulador de vuelo, calibrado con la LMB, vuelve a
              volar la pelota con el aire del otro estadio, y el mismo modelo la vuelve a calificar.</p>
            <p className="nota">444 lanzadores tiraron en los dos aires. Calibramos con la mitad y probamos con la otra. El simulador
              reproduce la cifra de Alan Nathan para Coors Field (18 pulgadas se vuelven 14.9).</p>
          </Parte>

          <Parte id="m-capas" n={6} color="var(--gana)" titulo="Tres capas, como pide el reto">
            <p>Las tres capas usan gradient boosting (LightGBM), cientos de árboles pequeños donde cada uno corrige el error de los
              anteriores. Captura interacciones entre velocidad, movimiento y arsenal sin suponer una forma. Lo que cambia entre capas
              es lo que cada una puede ver.</p>
            <div className="capas">
              <div><b>Stuff+</b><span>20 variables de física pura. Es la única que se transfiere entre aires.</span></div>
              <div><b>Location+</b><span>27 variables. Suma dónde llegó la pelota, el conteo y el lado del bateador.</span></div>
              <div><b>Pitching+</b><span>37 variables. Suma el arsenal y la secuencia, todas las relacionales del reto.</span></div>
            </div>
            <div className="tabla-scroll">
              <table className="tabla-datos compacta variables">
                <thead><tr><th>Lo que pide el reto</th><th>Cómo lo usamos</th><th>Capa</th></tr></thead>
                {VARIABLES.map(g => (
                  <tbody key={g.grupo}>
                    <tr className="grupo-fila"><th colSpan={3}>{g.grupo}</th></tr>
                    {g.filas.map(([a, b, c]) => <tr key={a}><td className="num">{a}</td><td>{b}</td><td>{c}</td></tr>)}
                  </tbody>
                ))}
              </table>
            </div>
            {shap && (
              <div className="shap">
                <p className="fig-titulo">Qué pesa en cada capa, según SHAP (la contribución media de cada variable a la predicción)</p>
                {(['stuff', 'location', 'pitching'] as const).map(k => (
                  <div key={k} className="shap-fila">
                    <span>{k === 'stuff' ? 'Stuff+' : k === 'location' ? 'Location+' : 'Pitching+'}</span>
                    <div className="shap-barra">
                      {Object.entries(shap[k].grupos).filter(([, v]) => v > 0.005).map(([g, v]) => (
                        <i key={g} className={`sg-${g.split(' ')[0].toLowerCase()}`} style={{ width: `${v * 100}%` }} title={`${g} ${nf(v * 100, 0)} %`}>{v > 0.08 ? `${nf(v * 100, 0)} %` : ''}</i>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="leyenda"><span className="clave"><i className="sg-física" /> Física</span><span className="clave"><i className="sg-ubicación" /> Ubicación y conteo</span><span className="clave"><i className="sg-arsenal" /> Arsenal y secuencia</span></p>
              </div>
            )}
          </Parte>

          <Parte id="m-pruebas" n={7} color="var(--nivel-mar)" titulo="Cómo lo pusimos a prueba">
            <ul className="limites">
              <li><b>Contra el modelo nulo</b> que pide el reto, el valor promedio de cada conteo.</li>
              <li><b>Fuera de muestra</b> de tres formas. Lanzadores que el modelo nunca vio, una temporada nueva y un estadio nuevo
                (entrena sin altura, prueba sólo en altura).</li>
              <li><b>Calibración.</b> Agrupamos por Stuff+ y vemos si las carreras bajan escalón por escalón.</li>
              <li><b>Las cuatro hipótesis del reto</b> con intervalos de confianza, remuestreando lanzadores completos 2,000 veces.</li>
              <li><b>Un Causal Forest</b> para las preguntas de qué hubiera pasado.</li>
            </ul>
            <p className="enlaces-sec">
              <button type="button" className="enlace" onClick={() => irA('confianza')}>Ver la validación →</button>
              <button type="button" className="enlace" onClick={() => irA('hipotesis')}>Ver las hipótesis →</button>
              <button type="button" className="enlace" onClick={() => irA('causal')}>Ver el Causal Forest →</button>
            </p>
            <p className="nota">Lo que el modelo no hace. No identifica estadios, porque la altitud extrema agrupa varios. No separa
              aire de clima. No modela al bateador. Y Stuff+ valora lanzamientos, no dice qué hubiera pasado con otra decisión. Para
              eso está el Causal Forest.</p>
          </Parte>
        </div>
      </div>
    </section>
  );
}
