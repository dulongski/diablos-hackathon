/**
 * METODOLOGÍA: qué hicimos, paso a paso, escrito para alguien que acaba de tomar un curso introductorio de ciencia
 * de datos o estadística. Cada paso dice qué hicimos, por qué y con qué evidencia. Las cifras salen de los mismos
 * archivos que el resto del dashboard.
 */
import type { ReactNode } from 'react';
import type { Extras, Jurado } from '../jurado';
import { nf, sg } from '../settings';
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
  { id: 'm-pregunta', t: 'La pregunta' }, { id: 'm-datos', t: 'Los datos' }, { id: 'm-valor', t: 'La variable objetivo' },
  { id: 'm-modelo', t: 'El modelo' }, { id: 'm-escala', t: 'La escala' }, { id: 'm-aire', t: 'Medir el aire' },
  { id: 'm-vuelo', t: 'El contrafactual' }, { id: 'm-pruebas', t: 'La validación' },
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

export function Metodologia({ physics, models, extras, j, irA }: {
  physics: Record<string, any>; models: Record<string, any>; extras: Extras | null; j: Jurado; irA: (v: Vista) => void;
}) {
  const mae = physics.mae_holdout ?? {};
  const cub = physics.rho_por_cubeta ?? {};
  const shap = extras?.shap && !('error' in extras.shap) ? extras.shap : null;
  const nulo = j.modelo_nulo, hp = j.holdout.pitcher, ht = j.holdout.temporada.stuff, hq = j.holdout.parque.stuff;
  const est = j.estabilidad;
  const cal = j.calibracion;
  const primero = cal[0], ultimo = cal[cal.length - 1];

  return (
    <section className="vista-sec metodo">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Metodología · Qué hicimos, paso a paso</p>
          <h2>Así construimos Diablos Stuff+</h2>
          <p className="entrada ancha">
            Entrenamos un modelo que predice cuántas carreras vale cada lanzamiento a partir de cómo vuela la
            pelota, después usamos física para calcular cómo habría volado esa misma pelota en el aire del Harp Helú, y al
            final le pedimos al mismo modelo que la vuelva a calificar. La diferencia entre las dos calificaciones es el
            cambio que estima el modelo bajo el supuesto de la misma salida de la mano. Abajo está cada paso con el detalle de qué hicimos y por qué.
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
          <Parte id="m-pregunta" n={1} color="var(--ceniza)" titulo="La pregunta, escrita como un problema de datos">
            <p>El club quiere saber qué lanzadores pierden más calidad cuando lanzan en el Estadio Alfredo Harp Helú, que está a
              2,240 metros sobre el nivel del mar, y cuáles la mantienen. Para convertir esa pregunta en un problema de datos
              definimos tres cosas, que son las mismas que definirías en cualquier proyecto de aprendizaje supervisado.</p>
            <p>La <b>unidad de observación</b> es un lanzamiento, es decir, cada vez que el pitcher le tira la pelota al
              bateador. La <b>variable objetivo</b>, la y que queremos predecir, es cuántas carreras le cuesta o le ahorra ese
              lanzamiento al equipo que lanza (paso 3). Las <b>variables explicativas</b>, la X, son las mediciones físicas del
              lanzamiento, como su velocidad, cuántas vueltas da la pelota y cuánto se desvía en el camino (paso 4).</p>
            <p>La parte difícil es que la pregunta del club es contrafactual. No basta con describir cómo les fue a los lanzadores
              en altura, porque muchos nunca han lanzado ahí y los que sí lo hicieron no son una muestra al azar de la liga.
              Necesitamos estimar cuánto valdría un lanzamiento concreto si se hubiera lanzado en otro aire, y para eso
              combinamos el modelo estadístico con un simulador físico del vuelo de la pelota (pasos 6 y 7).</p>
          </Parte>

          <Parte id="m-datos" n={2} color="var(--ceniza)" titulo="Los datos y lo que les falta"
            figura={<table className="tabla-simple">
              <thead><tr><th>Falta en los datos</th><th>Cómo lo resolvimos</th></tr></thead>
              <tbody>
                <tr><td>Estadio y altitud exacta</td><td>Medimos el aire con el frenado de la pelota (paso 6)</td></tr>
                <tr><td>Corredores en base</td><td>Calculamos el valor de cada lanzamiento con los 12 conteos posibles (paso 3)</td></tr>
                <tr><td>Fecha y número de lanzamiento</td><td>Usamos el orden del archivo, que viene cronológico dentro de cada juego</td></tr>
                <tr><td>Los pelotazos al bateador venían en cero</td><td>Los recuperamos del resultado registrado de cada lanzamiento</td></tr>
              </tbody>
            </table>}>
            <p>ISAC entregó una tabla con {nf(models.n_pitches ?? 635002)} filas, una por lanzamiento, de las temporadas 2024 a
              2026 de la Liga Mexicana de Béisbol. Los datos vienen de Trackman, un radar que sigue a la pelota desde que sale de la
              mano del lanzador hasta que cruza el plato, así que cada fila trae la velocidad, las vueltas por minuto, el
              movimiento vertical y lateral, el punto exacto donde salió la pelota, dónde llegó, el conteo de bolas y strikes y qué
              pasó con el lanzamiento. Los nombres de los lanzadores vienen reemplazados por identificadores anónimos.</p>
            <p>Antes de modelar partimos de tres supuestos que conviene hacer explícitos. El primero es que un lanzador suelta la
              pelota igual en cualquier estadio, con la misma velocidad y el mismo giro, y lo comprobamos comparando a cada
              lanzador consigo mismo entre estadios, donde su giro cambia apenas medio por ciento. El segundo es que calificamos
              el valor esperado de un lanzamiento y no su resultado puntual, porque el mismo lanzamiento puede terminar en ponche o
              en hit según el bateador y el azar. El tercero es que la referencia de la escala es el promedio de la propia LMB.</p>
          </Parte>

          <Parte id="m-valor" n={3} color="var(--diablo)" titulo="La variable objetivo, el valor en carreras de cada lanzamiento">
            <p>Para entrenar un modelo necesitas una variable objetivo que mida lo que te importa, y en béisbol lo que importa son
              las carreras. El problema es que un lanzamiento casi nunca produce una carrera por sí solo, así que usamos una idea
              clásica de la sabermetría que se llama <b>valor de carrera</b>. Primero calculamos, para cada uno de los 12 conteos
              posibles de bolas y strikes, cuántas carreras anota en promedio la ofensiva desde ese conteo hasta que termina el
              turno del bateador. Por ejemplo, con 3 bolas y 0 strikes el bateador lleva mucha ventaja y ese conteo vale más
              carreras para la ofensiva que uno de 0 bolas y 2 strikes.</p>
            <p>Después, el valor de un lanzamiento es simplemente la diferencia entre el valor del conteo después del lanzamiento
              y el valor del conteo antes. Un strike que pasa de 1 y 1 a 1 y 2 tiene un valor negativo para la ofensiva, es decir,
              es bueno para el lanzador, y una bola que pasa de 3 y 2 a base por bolas tiene un valor positivo. Cuando el turno
              termina, usamos el valor promedio del resultado, como un sencillo o un ponche. Así cada una de las filas tiene una y
              continua, medida en carreras, y el problema queda como una regresión.</p>
            <p className="nota">El reto sugiere combinar varias probabilidades, como la de que el bateador falle el swing o pegue un
              rodado, con pesos elegidos a mano. También entrenamos esos ocho modelos, pero no los sumamos, porque el valor en
              carreras ya pondera cada resultado por lo que vale en el marcador y no hay que inventar los pesos. Esos modelos nos
              sirven para explicar de dónde sale cada calificación, y sus resultados están en la subpestaña Validación.</p>
          </Parte>

          <Parte id="m-modelo" n={4} color="var(--gana)" titulo="El modelo, tres regresiones con árboles de decisión">
            <p>El algoritmo es <b>gradient boosting</b>, en su implementación LightGBM. La idea es construir cientos de árboles de
              decisión pequeños, uno después de otro, donde cada árbol nuevo se entrena para corregir los errores que dejaron los
              anteriores, y la predicción final es la suma de todos. Lo elegimos sobre una regresión lineal porque el valor de un
              lanzamiento depende de combinaciones de variables, por ejemplo, mucho movimiento vertical ayuda bastante en una recta
              rápida y casi nada en una lenta, y los árboles encuentran esas interacciones solos sin que tengamos que escribirlas.
              La función de pérdida es el error cuadrático medio, así que cada modelo estima el valor esperado en carreras dado lo
              que ve.</p>
            <p>Entrenamos tres modelos con la misma variable objetivo, y lo único que cambia entre ellos es qué variables pueden ver.
              Esa separación es lo que permite responder la pregunta del club, porque Stuff+ sólo ve física y por lo tanto es el
              único que tiene sentido volver a calificar cuando cambiamos el aire.</p>
            <div className="capas">
              <div><b>Stuff+</b><span>Usa 16 variables, todas de cómo vuela la pelota, como velocidad, giro, movimiento y punto de salida.</span></div>
              <div><b>Location+</b><span>Usa 23 variables. Además de la física, ve dónde cruzó la pelota el plato, el conteo y de qué lado batea el rival.</span></div>
              <div><b>Pitching+</b><span>Usa 33 variables. Además ve el resto del repertorio del lanzador y cómo se compara cada lanzamiento con su recta.</span></div>
            </div>
            <p>Dos decisiones de modelado merecen explicación. La primera es que quitamos de Stuff+ los ángulos con que sale y llega
              la pelota, aunque son medidas físicas, porque al revisar el modelo encontramos que con ellos Stuff+ estaba aprendiendo
              hacia dónde apuntaba el lanzador, y eso es ubicación, que le toca a Location+. Con los ángulos, la ubicación en el
              plato explicaba el 58 % de la variación de Stuff+, y sin ellos explica casi nada. La segunda es que Stuff+ va mucho
              más regularizado que las otras dos capas, con árboles más simples y hojas de al menos 4,000 lanzamientos, porque el
              punto de salida de la pelota funciona casi como una huella de cada lanzador y un modelo flexible aprendería a
              reconocer lanzadores en lugar de aprender física. Eso es sobreajuste, y lo detectamos porque el modelo poco
              regularizado predecía peor que el promedio con lanzadores que no había visto.</p>
            {models.stuff_entrena === 'mar' && (
              <p>Hay una tercera decisión. Stuff+ aprende sólo de juegos a nivel del mar. Su variable más pesada es cuánta
                velocidad pierde la pelota en el camino, y en altura la pelota frena menos, así que un modelo que viera juegos de
                altura aprendería que frenar poco anuncia un juego de altura, donde se anotan más carreras. Parte de lo que
                llamaríamos pérdida de calidad sería el entorno de bateo y no el lanzamiento. A nivel del mar el aire es uno solo,
                esa variable sólo cambia por la pelota y el lanzamiento, y la pérdida que medimos al volar la pelota en otro aire
                sale entera de la física. La escala sigue midiendo contra todos los lanzamientos de la liga.</p>
            )}
            <p className="nota">La tabla siguiente es para quien quiera revisar que usamos cada variable que pide el reto. La columna
              del medio trae los nombres de las columnas de Trackman.</p>
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
                <p className="fig-titulo">Cuánto pesa cada grupo de variables en cada capa, medido con SHAP. SHAP reparte cada predicción entre las variables que la produjeron, y aquí sumamos ese reparto por grupo.</p>
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

          <Parte id="m-escala" n={5} color="var(--diablo)" titulo="La escala, un puntaje z con media 100"
            figura={models.distribucion_stuff_plus && <><p className="figura-titulo">Cómo se reparte Stuff+ en la LMB</p><Campana pct={models.distribucion_stuff_plus} /></>}>
            <pre className="formula">Stuff+ = 100 + 10 × z(−carreras esperadas)</pre>
            <p>La predicción del modelo está en carreras por lanzamiento, y son números muy pequeños, del orden de centésimas, que
              cuesta leer. Por eso la estandarizamos como harías con cualquier variable. Le restamos la media de la liga, la
              dividimos entre la desviación estándar de la liga y obtenemos un puntaje z, que dice a cuántas desviaciones estándar
              está un lanzamiento del promedio.</p>
            <p>Después multiplicamos el puntaje z por 10 y le sumamos 100, que es la convención de estadísticas como ERA+ u OPS+. Así,
              100 es el lanzamiento promedio de la liga, 110 está una desviación estándar arriba, 120 está dos arriba y es de
              élite, y 80 está dos abajo. Antes de estandarizar le cambiamos el signo a las carreras, porque para el lanzador menos
              carreras es mejor, y queremos que un número más alto siempre signifique un mejor lanzamiento.</p>
          </Parte>

          <Parte id="m-aire" n={6} color="var(--aviso)" titulo="Medir el aire de cada juego sin saber el estadio"
            figura={<table className="tabla-simple">
              <thead><tr><th>Grupo de estadios</th><th className="n">Índice del aire</th></tr></thead>
              <tbody>
                <tr><td>Nivel del mar</td><td className="num n">{nf(cub['No Altitude'] ?? 1, 3)}</td></tr>
                <tr><td>Altitud media</td><td className="num n">{nf(cub['Medium Altitude'] ?? 0.898, 3)}</td></tr>
                <tr><td>Altitud extrema, Harp Helú</td><td className="num n destacado">{nf(cub['Extreme Altitude'] ?? 0.853, 3)}</td></tr>
              </tbody>
            </table>}>
            <p>Para simular el vuelo en otro aire primero necesitamos saber cuánto aire había en cada juego, y los datos no dicen en
              qué estadio se jugó, sólo traen tres categorías de altitud. La solución viene de la física. Trackman reporta la
              aceleración de la pelota, y si le quitas la gravedad te queda la parte que produce el aire, que tiene dos componentes.
              Una apunta en contra del movimiento y frena la pelota, que es el arrastre, y la otra es perpendicular y la desvía, que
              es el efecto del giro, llamado efecto Magnus.</p>
            <p>El arrastre es proporcional a la densidad del aire, así que con el frenado de cada lanzamiento podemos estimar qué
              tan denso estaba el aire. Como el frenado de una sola pelota es ruidoso, tomamos la mediana de todos los lanzamientos
              de un juego, porque a la mediana casi no la mueven los valores extremos, y la dividimos entre la mediana de los juegos a nivel del mar. El resultado
              es un índice donde 1.00 es el aire a nivel del mar y 0.85 es el aire de los estadios más altos.</p>
            <p className="nota">Encontramos además que el empuje del giro baja más rápido que el frenado cuando el aire se adelgaza.
              Si en lugar de medir cada fuerza por separado las reduces a las dos en la misma proporción, subestimas en cerca de un
              tercio cuánto movimiento pierde la pelota en altura.</p>
          </Parte>

          <Parte id="m-vuelo" n={7} color="var(--nivel-mar)" titulo="El contrafactual, volar la misma pelota en otro aire"
            figura={<><p className="figura-titulo">Error medio al predecir el movimiento en altura, en lanzadores que no se usaron para calibrar</p>
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
              <div className="paso"><b>Calificación nueva</b><span>el mismo modelo Stuff+ la vuelve a calificar</span></div>
            </div>
            <p>La forma más obvia de medir el efecto de la altura sería agregar la altitud como una variable más del modelo, pero
              eso tiene un problema de confusión. Los lanzadores que lanzan seguido en altura no son una muestra al azar de la
              liga, así que el coeficiente de la altitud mezclaría el efecto del aire con quiénes son esos lanzadores, y además no
              podrías estimar nada para alguien que nunca ha lanzado en altura.</p>
            <p>Por eso la altura entra por física y no como variable. Para cada lanzamiento reconstruimos su estado al salir de la
              mano, que incluye la posición, la velocidad y la dirección del giro, y resolvemos numéricamente las ecuaciones del
              vuelo con el aire del otro estadio. Usamos el simulador sólo para calcular cuánto cambia el movimiento entre los dos
              aires, y ese cambio se lo sumamos a lo que midió Trackman, así que el único error posible está en el cambio y no en
              el nivel. Con esa forma nueva le pedimos a Stuff+ una segunda calificación, y la resta entre las dos es el efecto de
              la altura para ese lanzamiento.</p>
            <p className="nota">Validamos el simulador como se valida cualquier modelo. Tomamos a los 444 lanzadores que tiraron tanto
              a nivel del mar como en altura, calibramos con la mitad y medimos el error con la otra mitad, que el ajuste nunca vio.
              La tabla compara ese error contra no corregir nada y contra corregir sólo por la densidad del aire. El simulador
              también reproduce el cálculo clásico del físico Alan Nathan para Coors Field, en Denver, donde una pelota con 18
              pulgadas de movimiento se queda en 14.9.</p>
          </Parte>

          <Parte id="m-pruebas" n={8} color="var(--nivel-mar)" titulo="La validación, cómo sabemos que el modelo funciona">
            <p>Las métricas históricas siguientes excluyen filas de prueba al ajustar el modelo, pero sus tablas de valor de carrera se calcularon con el período completo. La pestaña Validación muestra por separado la auditoría que aprende objetivo y nulo sólo en entrenamiento. La repetibilidad y las asociaciones entre temporadas responden preguntas distintas de la predicción temporal.</p>
            <ul className="limites">
              <li><b>¿Le gana a lo más simple?</b> El reto pide comparar contra un modelo nulo que sólo conoce el conteo de bolas y
                strikes y predice el valor promedio de ese conteo. Ese modelo tiene un R² de {nf(nulo.r2, 5)}, prácticamente cero,
                y cualquier modelo útil tiene que superarlo.</li>
              <li><b>¿Funciona con lanzadores nuevos?</b> Hicimos validación cruzada agrupada por lanzador, que significa que todos
                los lanzamientos de un mismo lanzador quedan juntos en entrenamiento o juntos en prueba, nunca repartidos. Si los
                repartiéramos, el modelo podría reconocer al lanzador y el resultado se vería mejor de lo que es. Con lanzadores
                nuevos, Stuff+ logra un R² de {nf(hp.stuff.r2, 4)} y Pitching+ uno de {nf(hp.pitching.r2, 3)}. También probamos
                entrenar con 2024 y 2025 y predecir 2026 (R² de {nf(ht.r2, 4)}), y entrenar con la categoría sin altitud y evaluar la categoría extrema, no estadios identificados, sólo
                en altura (correlación de {nf(hq.corr ?? 0, 3)}).</li>
              <li><b>¿Por qué el R² es tan bajo?</b> Estas variables explican una fracción pequeña del resultado puntual, que también depende del bateador, la defensa y el azar. Un buen
                lanzamiento puede terminar en jonrón. Este resultado no establece el techo de otros modelos. También importa
                que, cuando agregas muchos lanzamientos, las predicciones ordenen bien las
                carreras, y eso lo miden las dos pruebas siguientes.</li>
              <li><b>¿Las predicciones cumplen?</b> Es una prueba de calibración. Agrupamos los lanzamientos por su Stuff+ y
                comparamos las carreras predichas con las que de verdad ocurrieron. Los lanzamientos con Stuff+ menor a 80
                permitieron {sg(primero?.carreras_100 ?? 0, 1)} carreras por cada 100, los de 120 o más {sg(ultimo?.carreras_100 ?? 0, 1)},
                y en medio las carreras bajan escalón por escalón sin excepción.</li>
              {est && <li><b>¿Mide algo estable del lanzador?</b> Es una prueba de confiabilidad. Partimos al azar los lanzamientos
                de cada uno de {nf(est.lanzadores_mitades)} lanzadores en dos mitades y correlacionamos su Stuff+ promedio en una
                mitad con el de la otra. La correlación es {nf(est.mitades.stuff, 3)}, mientras que la de sus carreras reales es
                {' '}{nf(est.mitades.rv, 3)}. Es repetibilidad entre mitades aleatorias que comparten períodos y un modelo; no demuestra pronóstico temporal.</li>}
            </ul>
            <p>Para las hipótesis del reto usamos <b>bootstrap por lanzador</b>. En cada
              una de 2,000 repeticiones sacamos una muestra de lanzadores con reemplazo, llevándonos todos sus lanzamientos, y
              recalculamos el resultado. El intervalo de 95 % es el rango que deja fuera el 2.5 % más bajo y el 2.5 % más alto de
              esas 2,000 estimaciones. Remuestreamos lanzadores y no lanzamientos sueltos porque los lanzamientos de una misma
              persona se parecen entre sí, y tratarlos como independientes daría intervalos demasiado angostos.</p>
            <p>Por último, Stuff+ es un modelo de predicción y no de causalidad, así que no responde qué habría pasado si el
              lanzador hubiera tomado otra decisión. Agregamos un <b>Causal Forest</b> como análisis exploratorio de asociaciones ajustadas por variables observadas. Su interpretación causal exigiría ausencia de confusión no medida y covariables previas a la decisión. Los resúmenes de resultados de este conjunto no garantizan esos supuestos; por eso no presentamos su clasificación como política táctica validada.</p>
            <p className="enlaces-sec">
              <button type="button" className="enlace" onClick={() => irA('confianza')}>Ver la validación →</button>
              <button type="button" className="enlace" onClick={() => irA('hipotesis')}>Ver las hipótesis →</button>
              <button type="button" className="enlace" onClick={() => irA('causal')}>Ver el Causal Forest →</button>
            </p>
            <p className="nota">El modelo también tiene límites que conviene conocer. No sabe en qué estadio exacto fue cada juego,
              sólo qué tan denso estaba el aire, así que tampoco puede separar la altura del clima de ese día. No toma en cuenta
              quién batea. Y su calificación describe el valor promedio de un lanzamiento, no garantiza el resultado de uno en
              particular.</p>
          </Parte>
        </div>
      </div>
    </section>
  );
}
