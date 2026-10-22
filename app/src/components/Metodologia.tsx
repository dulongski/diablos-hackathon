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
    ['extension, release_height, release_side', 'Extension, RelHeight, RelSide', 'Stuff+'],
    ['(H4) eficiencia de giro', 'spin_efficiency, la parte del giro que produce movimiento', 'Stuff+'],
    ['(propia) tiempo de vuelo', 'ZoneTime', 'Stuff+'],
    ['(descartada) ángulos de salida y de llegada', 'VertRelAngle, HorzRelAngle, VertApprAngle, HorzApprAngle. Dicen a dónde apunta el lanzador, así que meterían puntería en una calificación de física', 'Ninguna'],
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
            La idea cabe en tres pasos. Primero le ponemos calificación a cada lanzamiento según cómo vuela. Después
            calculamos cómo habría volado ese mismo lanzamiento en el aire del Harp Helú. Al final lo calificamos otra vez.
            Lo que baja la calificación es lo que la altura le quita. Aquí está cada paso con más detalle.
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
                <tr><td>Los pelotazos al bateador venían en cero</td><td>Los recuperamos del resultado de cada lanzamiento</td></tr>
              </tbody>
            </table>}>
            <p>ISAC entregó 635,002 lanzamientos de la LMB, de 2024 a 2026, medidos con Trackman, un radar que sigue a la pelota
              desde la mano del lanzador hasta el plato. Cada fila trae la velocidad, las vueltas que da la pelota, cuánto se
              movió, desde dónde salió, dónde llegó, el conteo y qué pasó. La liga quitó los nombres de los lanzadores.</p>
            <p>Partimos de tres supuestos.</p>
            <ul className="limites">
              <li><b>Un lanzador tira igual en cualquier estadio.</b> La velocidad con que suelta la pelota y las vueltas que le da
                no cambian con la altura. Lo revisamos en los datos y las vueltas varían medio por ciento. Lo que sí cambia es cómo
                se mueve la pelota en el camino, y eso depende del aire.</li>
              <li><b>Calificamos lo que se espera de un lanzamiento, no lo que pasó en esa jugada.</b> Un batazo de suerte no hace
                peor a un buen lanzamiento.</li>
              <li><b>El 100 es el promedio de la LMB</b>, no el de Grandes Ligas.</li>
            </ul>
          </Parte>

          <Parte id="m-valor" n={2} color="var(--diablo)" titulo="Qué medimos, el valor en carreras de cada lanzamiento">
            <p>Para decir si un lanzamiento fue bueno necesitas una medida común, y la nuestra son carreras. Con 3 bolas y 0
              strikes el bateador lleva ventaja y su equipo anota más. Con 0 bolas y 2 strikes pasa lo contrario. Cada lanzamiento
              mueve el conteo o termina el turno, y ese cambio vale un número de carreras a favor o en contra del lanzador. El modelo
              aprende a predecir ese número viendo sólo cómo vuela la pelota.</p>
            <p>El reto sugiere juntar varias probabilidades, como la de que el bateador falle el swing, que persiga una bola mala o
              que pegue un rodado. Las calculamos todas, pero no las sumamos con pesos inventados. Las carreras ya les dan su peso
              justo, porque cada resultado cuenta lo que vale en el marcador. Esas probabilidades nos sirven para explicar por qué
              un lanzamiento califica alto (pestaña Validación).</p>
          </Parte>

          <Parte id="m-escala" n={3} color="var(--diablo)" titulo="La escala Stuff+"
            figura={models.distribucion_stuff_plus && <><p className="figura-titulo">Cómo se reparte Stuff+ en la LMB</p><Campana pct={models.distribucion_stuff_plus} /></>}>
            <pre className="formula">Stuff+ = 100 + 10 × z(−carreras esperadas)</pre>
            <p>Las carreras de un solo lanzamiento son números diminutos y difíciles de leer, así que las pasamos a una escala
              parecida a la de un examen. 100 es el lanzamiento promedio de la liga. Cada 10 puntos es un escalón grande (una
              desviación estándar, la z de la fórmula). 110 es muy bueno, 120 es de élite y 80 está entre los peores. Arriba de
              100 siempre es mejor para el lanzador, porque la fórmula voltea el signo de las carreras.</p>
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
            <p>Los datos no dicen en qué estadio se lanzó cada pelota, pero la pelota lo delata. En aire delgado frena menos en su
              camino al plato, y Trackman mide ese frenado. Si juntas el frenado de todos los lanzamientos de un juego, sabes qué
              tan delgado estaba el aire ese día. Lo expresamos como un índice, 1.00 a nivel del mar y 0.85 en los estadios más
              altos, como el Harp Helú.</p>
            <p className="nota">Algo que encontramos en el camino. Con menos aire la pelota frena un poco menos, pero el empujón que le
              da el giro se reduce mucho más. Por eso la altura le quita a la pelota más movimiento que velocidad. Si reduces todo
              en la misma proporción, te quedas corto en un tercio del castigo.</p>
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
              <div className="paso"><b>Lanzamiento real</b><span>cómo salió de la mano, medido por Trackman</span></div>
              <span className="flujo-flecha" aria-hidden>→</span>
              <div className="paso"><b>Mismo lanzamiento, otro aire</b><span>sale igual de la mano y se mueve distinto</span></div>
              <span className="flujo-flecha" aria-hidden>→</span>
              <div className="paso"><b>Calificación nueva</b><span>el mismo modelo lo vuelve a calificar</span></div>
            </div>
            <p>La altura no entra al modelo como un dato más de la tabla. Si así fuera, el modelo aprendería quién suele lanzar en
              altura y no qué le hace el aire a la pelota, y no podrías evaluar a alguien que nunca ha lanzado aquí. Entra por
              física. Un simulador de vuelo toma cómo salió la pelota de la mano y la vuelve a lanzar con el aire del otro estadio.
              La pelota llega con otro movimiento, y el mismo modelo la califica de nuevo.</p>
            <p className="nota">Para probar el simulador usamos a 444 lanzadores que tiraron en los dos aires. Lo ajustamos con la mitad y
              medimos su error con la otra mitad, que el ajuste nunca vio. Ese error es la tabla de al lado. También reproduce el
              cálculo clásico del físico Alan Nathan para Coors Field, en Denver, donde una pelota con 18 pulgadas de movimiento se
              queda en 14.9.</p>
          </Parte>

          <Parte id="m-capas" n={6} color="var(--gana)" titulo="Tres capas, como pide el reto">
            <p>Las tres capas son el mismo tipo de modelo, LightGBM. Es un conjunto de cientos de árboles de decisión chicos, donde
              cada árbol corrige lo que los anteriores fallaron. Lo usamos porque descubre solo cómo se combinan velocidad,
              movimiento y giro, sin que le demos la fórmula. Lo único que cambia entre capas es qué información ve.</p>
            <div className="capas">
              <div><b>Stuff+</b><span>16 variables. Sólo ve cómo vuela la pelota, por eso es la que volamos en otro aire.</span></div>
              <div><b>Location+</b><span>23 variables. Además ve dónde llegó la pelota, el conteo y de qué lado batea el rival.</span></div>
              <div><b>Pitching+</b><span>33 variables. Además ve el resto de los lanzamientos del pitcher y cómo los combina.</span></div>
            </div>
            <p className="nota">La tabla es para quien quiera revisar que usamos cada variable que pide el reto. Los nombres de la
              columna del medio son los de Trackman.</p>
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
              <li><b>Contra lo más simple posible.</b> Un modelo que sólo sabe el conteo y nada del lanzamiento. Si no le ganas a ese,
                el tuyo no sirve. El reto lo llama modelo nulo.</li>
              <li><b>Con datos que el modelo nunca vio.</b> Lanzadores nuevos, una temporada nueva y estadios de altura cuando sólo
                aprendió con estadios bajos.</li>
              <li><b>Que los números cumplan.</b> Juntamos los lanzamientos por su Stuff+ y revisamos que los de calificación más alta
                de verdad permitan menos carreras.</li>
              <li><b>Las cuatro hipótesis del reto</b>, cada una con su margen de error. Para sacarlo repetimos el cálculo 2,000
                veces, cada vez con lanzadores escogidos al azar.</li>
              <li><b>Un Causal Forest</b>, un modelo que estima qué habría pasado con otra decisión, por ejemplo tirar slider en vez
                de cambio en cierto conteo.</li>
            </ul>
            <p className="enlaces-sec">
              <button type="button" className="enlace" onClick={() => irA('confianza')}>Ver la validación →</button>
              <button type="button" className="enlace" onClick={() => irA('hipotesis')}>Ver las hipótesis →</button>
              <button type="button" className="enlace" onClick={() => irA('causal')}>Ver el Causal Forest →</button>
            </p>
            <p className="nota">Lo que el modelo no hace. No sabe en qué estadio exacto fue cada juego, sólo qué tan delgado estaba el
              aire. No separa la altura del clima de ese día. No toma en cuenta quién batea. Y Stuff+ dice cuánto vale un
              lanzamiento, no qué habría pasado si el lanzador decidía otra cosa. Para eso está el Causal Forest.</p>
          </Parte>
        </div>
      </div>
    </section>
  );
}
