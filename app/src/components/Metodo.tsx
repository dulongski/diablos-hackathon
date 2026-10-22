/**
 * MÉTODO — cómo se mide y qué tan confiable es. Se lee como un artículo corto: primero la idea en
 * palabras simples, después el detalle técnico y las cifras de validación.
 */
import type { ReactNode } from 'react';
import { L, nf } from '../settings';
import { Info } from './Info';

/** Una parte del método: el texto a la izquierda y su figura o tabla a la derecha, para usar el ancho. */
function Parte({ n, titulo, color, children, figura }: { n: number; titulo: string; color: string; children: ReactNode; figura?: ReactNode }) {
  return (
    <article className={`parte${figura ? ' con-figura' : ''}`} style={{ ['--acento' as string]: color }}>
      <span className="parte-n num">{String(n).padStart(2, '0')}</span>
      <div className="parte-cuerpo">
        <div className="parte-texto">
          <h3>{titulo}</h3>
          {children}
        </div>
        {figura && <div className="parte-figura">{figura}</div>}
      </div>
    </article>
  );
}

/** La distribución de Stuff+ en la liga, dibujada desde sus percentiles. */
function Campana({ pct }: { pct: Record<string, number> }) {
  const W = 640, H = 220, PAD = 34, LO = 64, HI = 136;
  const x = (v: number) => PAD + ((v - LO) / (HI - LO)) * (W - 2 * PAD);
  // Normal ajustada a la mediana y al rango intercuartil: suficiente para leer la escala.
  const mu = pct['50'] ?? 100, sd = ((pct['75'] ?? 107) - (pct['25'] ?? 94)) / 1.349;
  const pts: string[] = [];
  for (let v = LO; v <= HI; v += 0.5) {
    const y = Math.exp(-0.5 * ((v - mu) / sd) ** 2);
    pts.push(`${x(v).toFixed(1)},${(H - PAD - y * (H - 2 * PAD)).toFixed(1)}`);
  }
  const marcas = [
    { v: 80, es: 'malo', en: 'poor' }, { v: 90, es: 'bajo', en: 'below' },
    { v: 100, es: 'promedio', en: 'average' }, { v: 110, es: 'muy bueno', en: 'very good' }, { v: 120, es: 'élite', en: 'elite' },
  ];
  return (
    <figure className="campana">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Distribución de Stuff+ en la LMB', 'Stuff+ distribution in the LMB')}>
        <polygon points={`${x(LO)},${H - PAD} ${pts.join(' ')} ${x(HI)},${H - PAD}`} className="campana-area" />
        <polyline points={pts.join(' ')} className="campana-linea" />
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="var(--tezontle)" />
        {marcas.map(m => (
          <g key={m.v}>
            <line x1={x(m.v)} x2={x(m.v)} y1={PAD - 6} y2={H - PAD} stroke={m.v === 100 ? 'var(--ceniza)' : 'var(--rejilla)'} strokeDasharray={m.v === 100 ? '' : '3 3'} />
            <text x={x(m.v)} y={H - PAD + 16} className="eje fuerte" textAnchor="middle">{m.v}</text>
            <text x={x(m.v)} y={PAD - 10} className="eje" textAnchor="middle">{L(m.es, m.en)}</text>
          </g>
        ))}
        <text x={W - PAD} y={H - 4} className="eje-titulo" textAnchor="end">Stuff+</text>
      </svg>
    </figure>
  );
}

export function Metodo({ physics, models }: { physics: Record<string, any>; models: Record<string, any> }) {
  const mae = physics.mae_holdout ?? {};
  const hp = models.holdout_pitcher ?? {};
  const nulo = models.baseline_nulo_por_conteo?.rmse ?? 0.2681;
  const mejora = (r: number) => `${nf(((nulo - r) / nulo) * 100, 1)}%`;
  const cub = physics.rho_por_cubeta ?? {};

  return (
    <section className="metodo">
      <div className="envoltura">
        <h2 className="titulo-sec">{L('Cómo se mide', 'How it is measured')}</h2>
        <p className="metodo-entrada">
          {L('Cinco pasos, del dato crudo a la recomendación. Cada uno dice primero qué hace en palabras simples y después cómo se valida.',
             'Five steps, from raw data to recommendation. Each one says first what it does in plain words and then how it is checked.')}
        </p>

        <div className="partes">
          <Parte n={1} color="var(--diablo)" titulo={L('Qué es Stuff+', 'What Stuff+ is')}
                 figura={models.distribucion_stuff_plus && <>
                   <p className="figura-titulo">{L('Cómo se reparte Stuff+ en la LMB', 'How Stuff+ is spread across the LMB')}</p>
                   <Campana pct={models.distribucion_stuff_plus} /></>}>
            <p>{L(
              'Un modelo mira sólo la física de cada lanzamiento —velocidad, movimiento, giro, desde dónde sale— y estima cuántas carreras le quita al rival en promedio. No mira el resultado (un buen lanzamiento puede terminar en jonrón por suerte), ni la ubicación, ni el bateador, ni el estadio.',
              'A model looks only at the physics of each pitch —velocity, movement, spin, release point— and estimates how many runs it saves on average. It does not look at the outcome (a good pitch can end in a homer by luck), the location, the hitter or the ballpark.')}</p>
            <p>{L('Después ese valor se pasa a una escala fácil de leer:', 'That value is then put on an easy-to-read scale:')}</p>
            <pre className="formula">Stuff+ = 100 + 10 × z(−{L('carreras esperadas', 'expected runs')})</pre>
            <p className="nota">{L(
              '100 es el promedio de la liga. Cada 10 puntos es una desviación estándar: la distancia típica entre un lanzamiento y el promedio. El signo se invierte porque menos carreras es mejor para el lanzador.',
              '100 is league average. Every 10 points is one standard deviation: the typical distance between a pitch and the average. The sign is flipped because fewer runs is better for the pitcher.')}</p>
          </Parte>

          <Parte n={2} color="var(--aviso)" titulo={L('Cómo medimos el aire', 'How we measure the air')}
                 figura={<>
            <table className="tabla-simple">
              <thead><tr><th>{L('Grupo de estadios', 'Ballpark group')}</th><th className="n">{L('Frenado del aire', 'Air drag')}</th></tr></thead>
              <tbody>
                <tr><td>{L('Nivel del mar', 'Sea level')}</td><td className="num n">{nf((cub['No Altitude'] ?? 1) * 100, 1)}%</td></tr>
                <tr><td>{L('Altitud media', 'Medium altitude')}</td><td className="num n">{nf((cub['Medium Altitude'] ?? 0.898) * 100, 1)}%</td></tr>
                <tr><td>{L('Altitud extrema (Harp Helú)', 'Extreme altitude (Harp Helú)')}</td><td className="num n destacado">{nf((cub['Extreme Altitude'] ?? 0.853) * 100, 1)}%</td></tr>
              </tbody>
            </table>
                 </>}>
            <p>{L(
              'Los datos no dicen en qué estadio se lanzó cada pelota, sólo si fue a nivel del mar, en altitud media o en altitud extrema. Pero la pelota sí lo dice: con menos aire frena menos. Trackman mide la desaceleración de cada lanzamiento, y de ahí sale un índice del aire para cada juego.',
              'The data does not say which ballpark each pitch was thrown in, only whether it was at sea level, medium or extreme altitude. But the ball tells us: with less air it slows down less. Trackman measures each pitch\'s deceleration, and that gives an air index for every game.')}</p>
            <p className="nota">{L(
              'El movimiento cae más que el frenado. Dentro del mismo lanzador, el frenado varía como ρ^0.96 y el empuje del giro (efecto Magnus) como ρ^1.39, donde ρ es la densidad del aire. Un modelo que escale todo igual subestima el castigo en cerca de un tercio.',
              'Movement drops more than drag. Within the same pitcher, drag scales as ρ^0.96 and the spin force (Magnus effect) as ρ^1.39, where ρ is air density. A model that scales everything equally underestimates the penalty by about a third.')}</p>
          </Parte>

          <Parte n={3} color="var(--nivel-mar)" titulo={L('Cómo llevamos un lanzamiento de un aire a otro', 'How we move a pitch from one kind of air to another')}
                 figura={<>
                   <p className="figura-titulo">{L('Error con lanzadores que el modelo nunca vio', 'Error on pitchers the model never saw')}</p>
            <table className="tabla-simple">
              <thead><tr><th>{L('Error al predecir', 'Prediction error')}</th><th className="n">{L('Sin ajustar', 'No adjustment')}</th><th className="n">{L('Sólo densidad', 'Density only')}</th><th className="n">{L('Nuestro modelo', 'Our model')}</th></tr></thead>
              <tbody>
                <tr><td>{L('Movimiento vertical', 'Vertical movement')}</td><td className="num n">{nf(mae.sin_transferir?.ivb ?? 2.573, 2)} in</td><td className="num n">{nf(mae.solo_densidad?.ivb ?? 1.119, 2)} in</td><td className="num n destacado">{nf(mae.calibrado?.ivb ?? 0.802, 2)} in</td></tr>
                <tr><td>{L('Movimiento lateral', 'Horizontal movement')}</td><td className="num n">{nf(mae.sin_transferir?.hb ?? 2.932, 2)} in</td><td className="num n">{nf(mae.solo_densidad?.hb ?? 1.612, 2)} in</td><td className="num n destacado">{nf(mae.calibrado?.hb ?? 0.875, 2)} in</td></tr>
                <tr><td>{L('Velocidad al plato', 'Velocity at the plate')}</td><td className="num n">{nf(mae.sin_transferir?.zone_speed ?? 1.323, 2)} mph</td><td className="num n">{nf(mae.solo_densidad?.zone_speed ?? 0.578, 2)} mph</td><td className="num n destacado">{nf(mae.calibrado?.zone_speed ?? 0.574, 2)} mph</td></tr>
              </tbody>
            </table>
                 </>}>
            <div className="flujo">
              <div className="paso"><b>{L('Lanzamiento real', 'Real pitch')}</b><span>{L('salida, velocidad y giro medidos', 'measured release, velocity and spin')}</span></div>
              <span className="flujo-flecha" aria-hidden>→</span>
              <div className="paso"><b>{L('Vuelo en otro aire', 'Flight in other air')}</b><span>{L('se vuelve a simular con la física', 're-simulated with physics')}</span></div>
              <span className="flujo-flecha" aria-hidden>→</span>
              <div className="paso"><b>Stuff+</b><span>{L('el mismo modelo lo califica', 'the same model grades it')}</span></div>
            </div>
            <p>{L(
              'La altitud no entra al modelo como un dato más. Entra por física: se toma el lanzamiento, se simula su vuelo con el aire del otro estadio y se vuelve a calificar. Así se puede responder la pregunta de un fichaje: cuánto valdría en el Harp Helú un lanzamiento que nunca se ha tirado ahí.',
              'Altitude does not enter the model as another input. It enters through physics: take the pitch, simulate its flight with the other park\'s air and grade it again. That answers the signing question: what a pitch that has never been thrown there would be worth at Harp Helú.')}</p>
            <p className="nota">{L(
              `Validación: 444 lanzadores tiraron en los dos aires. Con la mitad se calibró la física; con la otra mitad, que nunca se usó, se comparó lo predicho contra lo que de verdad lanzaron en altitud.`,
              `Check: 444 pitchers threw in both kinds of air. Half calibrated the physics; with the other half, never used, the prediction was compared against what they actually threw at altitude.`)}</p>
          </Parte>

          <Parte n={4} color="var(--gana)" titulo={L('Qué tan bien funciona el modelo', 'How well the model works')}
                 figura={<>
            <table className="tabla-simple">
              <thead><tr><th>{L('Capa', 'Layer')}</th><th>{L('Qué ve', 'What it sees')}</th><th className="n">{L('Error', 'Error')}</th><th className="n">{L('Mejora vs. base', 'Gain vs. baseline')}</th></tr></thead>
              <tbody>
                <tr><td>{L('Base (promedio por conteo)', 'Baseline (count average)')}</td><td>—</td><td className="num n">{nf(nulo, 4)}</td><td className="num n tenue">—</td></tr>
                <tr><td>Stuff+</td><td>{L('sólo física', 'physics only')}</td><td className="num n">{nf(hp.stuff?.rmse ?? 0.2654, 4)}</td><td className="num n destacado">{mejora(hp.stuff?.rmse ?? 0.2654)}</td></tr>
                <tr><td>Location+</td><td>{L('+ ubicación y conteo', '+ location and count')}</td><td className="num n">{nf(hp.location?.rmse ?? 0.2624, 4)}</td><td className="num n destacado">{mejora(hp.location?.rmse ?? 0.2624)}</td></tr>
                <tr><td>Pitching+</td><td>{L('+ repertorio y secuencia', '+ arsenal and sequence')}</td><td className="num n">{nf(hp.pitching?.rmse ?? 0.2623, 4)}</td><td className="num n destacado">{mejora(hp.pitching?.rmse ?? 0.2623)}</td></tr>
              </tbody>
            </table>
            <div className="mini-cifras">
              <div><span>{L('Temporada nueva', 'New season')}<Info>{L('Entrena con 2024–2025 y se prueba en 2026.', 'Trained on 2024–2025, tested on 2026.')}</Info></span><b className="num">{nf(models.holdout_temporada?.stuff?.rmse ?? 0.2636, 4)}</b></div>
              <div><span>{L('Estadio nuevo', 'New ballpark')}<Info>{L('Entrena sin los estadios de altitud extrema y se prueba en ellos. Sale peor, y eso es justo lo que este trabajo mide: un modelo de nivel del mar no sirve igual en altura.', 'Trained without extreme-altitude parks and tested on them. It does worse, which is exactly what this work measures: a sea-level model does not carry over to altitude.')}</Info></span><b className="num">{nf(models.holdout_parque?.stuff?.rmse ?? 0.275, 4)}</b></div>
              <div><span>{L('Strike cantado', 'Called strike')}<Info>{L('Qué tanto mejor que adivinar con la tasa promedio predice el modelo si un lanzamiento será strike cantado (1 = perfecto, 0 = igual que adivinar).', 'How much better than guessing with the average rate the model predicts a called strike (1 = perfect, 0 = same as guessing).')}</Info></span><b className="num">+{nf(models.componentes?.y_called_strike?.skill ?? 0.726, 2)}</b></div>
            </div>
                 </>}>
            <p>{L(
              'El modelo es un gradient boosting (LightGBM): cientos de árboles de decisión pequeños, cada uno corrigiendo el error de los anteriores. Se probó con lanzadores que nunca vio al entrenar, y se comparó contra el punto de partida que pide la rúbrica: el valor promedio de cada conteo.',
              'The model is gradient boosting (LightGBM): hundreds of small decision trees, each correcting the error of the previous ones. It was tested on pitchers it never saw in training and compared against the baseline the rubric asks for: the average value of each count.')}
              <Info ancho>{L(
                'El error (RMSE) se mide en carreras por lanzamiento. Un lanzamiento suelto lo domina el azar, así que las mejoras son chicas en número pero estables al juntar cientos de lanzamientos de un mismo lanzador.',
                'Error (RMSE) is measured in runs per pitch. A single pitch is dominated by luck, so improvements look small but are stable when hundreds of pitches from the same pitcher are pooled.')}</Info></p>
          </Parte>

          <Parte n={5} color="var(--ceniza)" titulo={L('Lo que el modelo no hace', 'What the model does not do')}>
            <ul className="limites">
              <li>{L('No identifica estadios: "altitud extrema" agrupa varios parques; el Harp Helú es el caso más alto.', 'It does not identify ballparks: "extreme altitude" groups several parks; Harp Helú is the highest.')}</li>
              <li>{L('No separa altitud de clima: el índice del aire junta densidad, temperatura y humedad.', 'It does not separate altitude from weather: the air index combines density, temperature and humidity.')}</li>
              <li>{L('No modela al bateador: la calidad del contacto depende mucho más de él que del lanzamiento.', 'It does not model the hitter: contact quality depends much more on the hitter than on the pitch.')}</li>
              <li>{L('No es causal: califica lanzamientos; no dice qué habría pasado con otro lanzamiento en ese conteo.', 'It is not causal: it grades pitches; it does not say what would have happened with a different pitch in that count.')}</li>
            </ul>
          </Parte>
        </div>
      </div>
    </section>
  );
}
