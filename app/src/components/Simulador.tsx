/**
 * SIMULADOR — la herramienta del pitching coach.
 *
 * No evalúa un lanzamiento: evalúa un repertorio. Se define un lanzamiento base y cuánto varía
 * tiro a tiro, y se ven miles de lanzamientos caer en el plato en los dos aires. Lo que importa
 * no es dónde cae el lanzamiento perfecto sino cuánto se corre la nube entera, porque eso es lo
 * que mueve el porcentaje de strikes.
 *
 * Todo corre en esta página: sin servidor, sin espera.
 */
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import type { Model } from '../lib/gbm';
import { generarNubes, VARIANZA_MEDIA, type Varianza } from '../lib/cloud';
import { releaseAt, solveRelease, type PitchInput } from '../lib/physics';
import type { Escala, Helpers } from '../lib/scoring';
import { COLOR_TIPO, nombreTipo, plusEnPalabras } from '../lexico';
import { L, nf, sg } from '../settings';
import { Escena3D } from './Escena3D';
import { Info } from './Info';
import { NubePlato, type Capa } from './NubePlato';

/** Lanzamientos típicos: las medianas reales de la LMB para un lanzador derecho. */
const ARQUETIPOS: { tipo: string; p: Partial<PitchInput> }[] = [
  { tipo: 'Four-Seam', p: { relSpeed: 92.5, ivb: 16.8, hb: 7.6, spinRate: 2300, plateZ: 2.9 } },
  { tipo: 'Sinker', p: { relSpeed: 91.5, ivb: 10.0, hb: 15.4, spinRate: 2150, plateZ: 2.1 } },
  { tipo: 'Cutter', p: { relSpeed: 88.0, ivb: 11.0, hb: -0.5, spinRate: 2380, plateZ: 2.5 } },
  { tipo: 'Slider', p: { relSpeed: 84.0, ivb: 3.1, hb: -5.6, spinRate: 2450, plateZ: 2.0 } },
  { tipo: 'Curveball', p: { relSpeed: 78.5, ivb: -8.0, hb: -9.4, spinRate: 2550, plateZ: 1.9 } },
  { tipo: 'Changeup', p: { relSpeed: 84.5, ivb: 7.2, hb: 13.4, spinRate: 1800, plateZ: 2.0 } },
];

interface Campo { k: keyof PitchInput; es: string; en: string; min: number; max: number; paso: number; unidad: string; info?: [string, string] }

const LANZAMIENTO: Campo[] = [
  { k: 'relSpeed', es: 'Velocidad', en: 'Velocity', min: 70, max: 102, paso: 0.5, unidad: 'mph' },
  { k: 'ivb', es: 'Movimiento vertical', en: 'Vertical movement', min: -20, max: 24, paso: 0.5, unidad: 'in',
    info: ['Cuánto sube o cae comparada con una pelota sin giro. Una recta con mucho movimiento vertical parece que "sube"; una curva tiene valores negativos porque cae.',
           'How much it rises or drops compared with a ball with no spin. A four-seamer with a lot of it seems to "rise"; a curveball is negative because it drops.'] },
  { k: 'hb', es: 'Movimiento lateral', en: 'Horizontal movement', min: -22, max: 22, paso: 0.5, unidad: 'in',
    info: ['Cuánto se abre hacia un lado. Positivo es hacia el brazo del lanzador; negativo, hacia el guante.',
           'How much it moves sideways. Positive is toward the pitcher\'s arm side; negative, toward the glove side.'] },
  { k: 'spinRate', es: 'Giro', en: 'Spin rate', min: 1200, max: 3200, paso: 25, unidad: 'rpm' },
];
const OBJETIVO: Campo[] = [
  { k: 'plateZ', es: 'Altura en el plato', en: 'Height at the plate', min: 0.8, max: 4.2, paso: 0.1, unidad: 'ft',
    info: ['A qué altura apunta. La zona de strike va de 1.5 a 3.6 pies.', 'Where it is aimed vertically. The strike zone runs from 1.5 to 3.6 ft.'] },
  { k: 'plateX', es: 'Lado del plato', en: 'Side of the plate', min: -1.5, max: 1.5, paso: 0.1, unidad: 'ft',
    info: ['0 es el centro del plato.', '0 is the middle of the plate.'] },
];
const MECANICA: Campo[] = [
  { k: 'extension', es: 'Extensión', en: 'Extension', min: 4.5, max: 7.5, paso: 0.1, unidad: 'ft',
    info: ['Qué tan adelante del montículo suelta la pelota.', 'How far in front of the rubber the ball is released.'] },
  { k: 'relHeight', es: 'Altura de salida', en: 'Release height', min: 4.0, max: 7.0, paso: 0.1, unidad: 'ft' },
  { k: 'relSide', es: 'Lado de salida', en: 'Release side', min: -4, max: 4, paso: 0.1, unidad: 'ft' },
];

const VARIACION: { k: keyof Varianza; es: string; en: string; min: number; max: number; paso: number; unidad: string; info?: [string, string] }[] = [
  { k: 'mando', es: 'Control', en: 'Command', min: 0.1, max: 1.4, paso: 0.05, unidad: 'ft',
    info: ['Qué tanto se aleja del punto al que apunta. Más alto es menos control.', 'How far it lands from the target. Higher means less command.'] },
  { k: 'quiebre', es: 'Movimiento', en: 'Movement', min: 0, max: 4, paso: 0.1, unidad: 'in' },
  { k: 'velocidad', es: 'Velocidad', en: 'Velocity', min: 0, max: 3, paso: 0.1, unidad: 'mph' },
  { k: 'release', es: 'Punto de salida', en: 'Release point', min: 0, max: 0.4, paso: 0.01, unidad: 'ft' },
];

function Deslizador({ id, etiqueta, info, min, max, paso, unidad, valor, onChange }: {
  id: string; etiqueta: string; info?: ReactNode; min: number; max: number; paso: number;
  unidad: string; valor: number; onChange: (v: number) => void;
}) {
  return (
    <div className="campo">
      <div className="campo-cabeza">
        <label htmlFor={id}>{etiqueta}{info && <Info>{info}</Info>}</label>
        <output className="num valor-campo" htmlFor={id}>
          {nf(valor, paso < 0.1 ? 2 : paso < 1 ? 1 : 0)}<span className="unidad">{unidad}</span>
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={paso} value={valor}
             onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

export interface SimuladorProps {
  metros: number;
  arrastre: number;
  model: Model; helpers: Helpers; escala: Escala;
}

export function Simulador({ metros, arrastre, model, helpers, escala }: SimuladorProps) {
  const [pitch, setPitch] = useState<PitchInput>({
    relSpeed: 92.5, ivb: 16.8, hb: 7.6, relHeight: 5.9, relSide: 1.6,
    extension: 6.1, spinRate: 2300, plateZ: 2.9, plateX: 0.0,
  });
  const [varianza, setVarianza] = useState<Varianza>(VARIANZA_MEDIA);
  const [n, setN] = useState(1500);
  const [isRhp, setIsRhp] = useState(true);
  const [preset, setPreset] = useState<string | null>('Four-Seam');

  /**
   * Cambiar de mano espeja el envío.
   *
   * El flag `is_rhp` por sí solo no mueve nada: es la feature menos importante del modelo
   * (0.13 % de la ganancia, puesto 20 de 20). Lo que de verdad distingue a un zurdo es la
   * geometría, y en los datos es un espejo casi exacto — la recta mediana de un diestro
   * sale a +1.57 ft con +8.4 in de quiebre horizontal, y la de un zurdo a −1.56 con −8.3.
   * `RelSide` es, de hecho, la feature más importante del modelo.
   */
  const cambiarMano = (derecha: boolean) => {
    if (derecha === isRhp) return;
    setIsRhp(derecha);
    setPreset(null);
    setPitch(p => ({ ...p, relSide: -p.relSide, hb: -p.hb, plateX: -p.plateX }));
  };
  const [capa, setCapa] = useState<Capa>('ambas');

  // El cálculo va sobre el valor diferido: arrastrar un control no se traba esperando
  // a que terminen mil quinientas integraciones.
  const lento = useDeferredValue({ pitch, varianza, n, isRhp, arrastre });
  const calculando = lento.pitch !== pitch || lento.varianza !== varianza;

  const { mar, alt } = useMemo(
    () => generarNubes({
      base: lento.pitch, varianza: lento.varianza, n: lento.n, dragIndex: lento.arrastre,
      isRhp: lento.isRhp, model, helpers, escala, nMuestra: 18,
    }),
    [lento, model, helpers, escala],
  );

  // Magnitudes derivadas: no son controles, son consecuencias del envío base.
  const derivadas = useMemo(() => {
    const rel = solveRelease(pitch);
    const s = releaseAt(rel, 1.0, pitch.spinRate).shape;
    const mov = Math.hypot(s.ivb, s.hb);
    // Eje de giro como carátula de reloj, que es como lo lee un coach.
    const ang = (Math.atan2(s.hb, s.ivb) * 180) / Math.PI;
    const horas = ((ang / 30) + 12) % 12;
    const hh = Math.floor(horas) || 12;
    const mm = Math.round((horas - Math.floor(horas)) * 60 / 15) * 15;
    return {
      tilt: `${hh}:${String(mm % 60).padStart(2, '0')}`,
      movimiento: mov,
      // Pulgadas de movimiento por cada mil revoluciones: la pregunta de H4, "shape over label".
      porMilRev: (mov / pitch.spinRate) * 1000,
      vaa: s.vaa,
      tiempo: s.zoneTime,
      velPlato: s.zoneSpeed,
    };
  }, [pitch]);

  const pares = useMemo(
    () => mar.muestra.map((m, i) => ({ mar: m, alt: alt.muestra[i] ?? m })),
    [mar, alt],
  );

  const dZona = (alt.pctZona - mar.pctZona) * 100;
  const dCentro = (alt.centro.z - mar.centro.z) * 12;
  const dPlus = alt.plusMedio - mar.plusMedio;
  const lugar = Math.abs(metros - 2240) < 40 ? 'Harp Helú' : `${nf(metros)} m`;

  const mover = (c: Campo) => (v: number) => { setPreset(null); setPitch(p => ({ ...p, [c.k]: v })); };
  const campos = (lista: Campo[], pre: string) => lista.map(c => (
    <Deslizador key={c.k} id={`${pre}-${c.k}`} etiqueta={L(c.es, c.en)} info={c.info && L(...c.info)}
                min={c.min} max={c.max} paso={c.paso} unidad={c.unidad}
                valor={pitch[c.k]} onChange={mover(c)} />
  ));

  const lectura = (() => {
    const baja = dCentro < 0;
    const zona = dZona > 0.2 ? L(`entran ${nf(dZona, 1)} puntos más a la zona`, `${nf(dZona, 1)} points more land in the zone`)
      : dZona < -0.2 ? L(`entran ${nf(-dZona, 1)} puntos menos a la zona`, `${nf(-dZona, 1)} points fewer land in the zone`)
      : L('entran a la zona igual que antes', 'the same share land in the zone');
    const cal = Math.abs(dPlus) < 0.5 ? L('su calificación casi no cambia', 'its grade barely changes')
      : L(`su Stuff+ ${dPlus < 0 ? 'baja' : 'sube'} ${nf(Math.abs(dPlus), 1)} puntos`, `its Stuff+ ${dPlus < 0 ? 'drops' : 'rises'} ${nf(Math.abs(dPlus), 1)} points`);
    const pal = plusEnPalabras(mar.plusMedio) !== plusEnPalabras(alt.plusMedio)
      ? L(`: pasa de ${plusEnPalabras(mar.plusMedio)} a ${plusEnPalabras(alt.plusMedio)}`, `: from ${plusEnPalabras(mar.plusMedio)} to ${plusEnPalabras(alt.plusMedio)}`) : '';
    return L(
      `En el ${lugar} estos lanzamientos llegan ${nf(Math.abs(dCentro), 1)} pulgadas más ${baja ? 'abajo' : 'arriba'}, ${zona} y ${cal}${pal}.`,
      `At ${lugar} these pitches arrive ${nf(Math.abs(dCentro), 1)} inches ${baja ? 'lower' : 'higher'}, ${zona} and ${cal}${pal}.`);
  })();

  return (
    <div className={`simulador${calculando ? ' calculando' : ''}`}>
      <div className="barra-arquetipos">
        <span className="etiqueta-grupo">{L('Empieza con un lanzamiento típico de la LMB', 'Start from a typical LMB pitch')}</span>
        <div className="chips">
          {ARQUETIPOS.map(a => (
            <button key={a.tipo} type="button" className={`chip${preset === a.tipo ? ' activo' : ''}`}
                    aria-pressed={preset === a.tipo}
                    onClick={() => { setPreset(a.tipo); setPitch(p => ({
                      ...p, ...a.p,
                      // Los arquetipos están medidos en diestros; para un zurdo se espejan.
                      hb: isRhp ? (a.p.hb ?? p.hb) : -(a.p.hb ?? p.hb),
                    })); }}>
              <i style={{ background: COLOR_TIPO[a.tipo] }} />{nombreTipo(a.tipo)}
            </button>
          ))}
        </div>
        <div className="mano">
          <span className="etiqueta-grupo">{L('Lanzador', 'Pitcher')}</span>
          <div className="segmentado">
            {([[true, L('Derecho', 'Righty')], [false, L('Zurdo', 'Lefty')]] as [boolean, string][]).map(([v, l]) => (
              <button key={l} type="button" className={isRhp === v ? 'activo' : ''}
                      aria-pressed={isRhp === v} onClick={() => cambiarMano(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="simulador-rejilla">
        <div className="panel-controles tarjeta">
          <h3>{L('El lanzamiento', 'The pitch')}</h3>
          {campos(LANZAMIENTO, 'f')}

          <h3>{L('Hacia dónde apunta', 'Where it is aimed')}</h3>
          {campos(OBJETIVO, 'o')}

          <details className="plegable">
            <summary>{L('La mecánica del brazo', 'Arm mechanics')}</summary>
            {campos(MECANICA, 'm')}
          </details>

          <h3>{L('Variación tiro a tiro', 'Pitch-to-pitch variation')}
            <Info>{L('Ningún lanzador repite exacto. Con control perfecto la nube sería un punto; con control real es una mancha. Estos valores son una desviación estándar.',
                     'No pitcher repeats exactly. With perfect command the cloud would be a dot; with real command it is a smudge. These values are one standard deviation.')}</Info></h3>
          {VARIACION.map(c => (
            <Deslizador key={c.k} id={`v-${c.k}`} etiqueta={L(c.es, c.en)} info={c.info && L(...c.info)}
                        min={c.min} max={c.max} paso={c.paso} unidad={c.unidad}
                        valor={varianza[c.k]} onChange={v => setVarianza(x => ({ ...x, [c.k]: v }))} />
          ))}
          <Deslizador id="v-n" etiqueta={L('Lanzamientos simulados', 'Simulated pitches')} min={200} max={5000} paso={100} unidad=""
                      valor={n} onChange={setN} />
        </div>

        <div className="panel-nube tarjeta">
          <div className="nube-cabeza">
            <h3>{L('Dónde cruzan el plato', 'Where they cross the plate')}
              <Info>{L(`Cada punto es uno de los ${nf(n)} lanzamientos simulados, visto desde el cátcher. El rectángulo es la zona de strike. Los círculos marcan el centro de cada nube.`,
                       `Each dot is one of the ${nf(n)} simulated pitches, seen from the catcher. The rectangle is the strike zone. The circles mark the center of each cloud.`)}</Info></h3>
            <div className="segmentado pequeno">
              {([['ambas', L('Ambos', 'Both')], ['mar', L('Nivel del mar', 'Sea level')], ['alt', 'Harp Helú']] as [Capa, string][])
                .map(([v, l]) => (
                  <button key={v} type="button" className={capa === v ? 'activo' : ''}
                          aria-pressed={capa === v} onClick={() => setCapa(v)}>{l}</button>
                ))}
            </div>
          </div>
          <NubePlato mar={mar} alt={alt} capa={capa} isRhp={isRhp} />
        </div>

        <div className="panel-resultados tarjeta">
          <h3>{L('Resultado', 'Result')}
            <Info>{L('Stuff+ califica el lanzamiento sólo por su física: 100 es el promedio de la liga, 110 es muy bueno y 90 es malo.',
                     'Stuff+ grades the pitch on its physics alone: 100 is league average, 110 is very good and 90 is poor.')}</Info></h3>
          <div className="dos-plus">
            <div className="plus mar">
              <span className="plus-lugar">{L('Nivel del mar', 'Sea level')}</span>
              <b className="num">{nf(mar.plusMedio, 1)}</b>
              <span className="plus-palabra">{plusEnPalabras(mar.plusMedio)}</span>
            </div>
            <div className="plus alt">
              <span className="plus-lugar">{lugar}</span>
              <b className="num">{nf(alt.plusMedio, 1)}</b>
              <span className="plus-palabra">{plusEnPalabras(alt.plusMedio)}</span>
            </div>
          </div>
          <p className={`delta-plus ${dPlus < -0.2 ? 'pierde' : dPlus > 0.2 ? 'gana' : ''}`}>
            <span className="flechita">{dPlus < 0 ? '▼' : '▲'}</span>{sg(dPlus)} Stuff+
          </p>

          <dl className="comparativa">
            <div><dt>{L('En zona de strike', 'In the strike zone')}</dt>
              <dd><span className="num c-mar">{nf(mar.pctZona * 100, 1)}%</span><span className="flecha-gris">→</span><span className="num c-alt">{nf(alt.pctZona * 100, 1)}%</span></dd></div>
            <div><dt>{L('Altura promedio al plato', 'Average height at the plate')}</dt>
              <dd><span className="num c-mar">{nf(mar.centro.z, 2)} ft</span><span className="flecha-gris">→</span><span className="num c-alt">{nf(alt.centro.z, 2)} ft</span></dd></div>
          </dl>

          <p className="lectura-sim">{lectura}</p>

          <details className="plegable">
            <summary>{L('Datos técnicos del lanzamiento', 'Technical pitch data')}</summary>
            <dl className="derivadas">
              <div><dt>{L('Eje de giro', 'Spin axis')}<Info>{L('Hacia dónde apunta el giro, leído como la manecilla de un reloj visto desde el bateador.', 'The direction of the spin, read like a clock hand from the hitter\'s view.')}</Info></dt><dd className="num">{derivadas.tilt}</dd></div>
              <div><dt>{L('Movimiento total', 'Total movement')}</dt><dd className="num">{nf(derivadas.movimiento, 1)} in</dd></div>
              <div><dt>{L('Movimiento por cada 1,000 rpm', 'Movement per 1,000 rpm')}<Info>{L('Qué tan bien convierte el giro en movimiento. Dos lanzamientos con el mismo giro pueden moverse muy distinto.', 'How well spin turns into movement. Two pitches with the same spin can move very differently.')}</Info></dt><dd className="num">{nf(derivadas.porMilRev, 1)} in</dd></div>
              <div><dt>{L('Ángulo de llegada', 'Approach angle')}</dt><dd className="num">{nf(derivadas.vaa, 1)}°</dd></div>
              <div><dt>{L('Velocidad al plato', 'Velocity at the plate')}</dt><dd className="num">{nf(derivadas.velPlato, 1)} mph</dd></div>
              <div><dt>{L('Tiempo de vuelo', 'Flight time')}</dt><dd className="num">{nf(derivadas.tiempo * 1000, 0)} ms</dd></div>
            </dl>
          </details>
        </div>

        <div className="panel-trayectorias tarjeta">
          <h3>{L(`${pares.length} de esos lanzamientos, en vuelo`, `${pares.length} of those pitches, in flight`)}
            <Info>{L('Arrastra para girar la cámara. Rojo es el Harp Helú; azul, nivel del mar.', 'Drag to rotate the camera. Red is Harp Helú; blue, sea level.')}</Info></h3>
          <div className="escenario ancho">
            <Escena3D pares={pares} vista="campo" />
          </div>
        </div>
      </div>
    </div>
  );
}
