/**
 * SIMULADOR: la herramienta del pitching coach (entregable 4).
 *
 * Eliges un tipo de lanzamiento o escribes sus números, y ves la misma pelota volar en el estadio que elijas
 * con su Stuff+ al lado del Stuff+ a nivel del mar. Todo se recalcula al mover cualquier control. El número
 * sale de `stuffEstable` (49 variaciones con arrastre real), el mismo que usan los experimentos de H4.
 *
 * Todo corre en esta página, sin servidor.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import type { Model } from '../lib/gbm';
import { solveRelease, type PitchInput } from '../lib/physics';
import { scorePitch, stuffEstable, type Escala, type Helpers } from '../lib/scoring';
import { plusEnPalabras, CORTE_AGUANTA, CORTE_MUCHO } from '../lexico';
import { COLOR_TIPO_ES } from '../jurado';
import { nf, sg } from '../settings';
import { ControlAltitud } from './ControlAltitud';
import { Diamante3D, type Camara } from './Diamante3D';
import { Info } from './Info';

/** Lanzamientos típicos de un derecho en la LMB (promedios de lanzamientos reales). */
const TIPOS: { t: string; p: Partial<PitchInput> }[] = [
  { t: 'Recta', p: { relSpeed: 92.4, ivb: 15.7, hb: 8.0, spinRate: 2300, plateZ: 2.9, plateX: 0 } },
  { t: 'Sinker', p: { relSpeed: 92.2, ivb: 8.8, hb: 14.4, spinRate: 2150, plateZ: 2.1, plateX: 0.3 } },
  { t: 'Cutter', p: { relSpeed: 89.4, ivb: 9.3, hb: -1.1, spinRate: 2380, plateZ: 2.5, plateX: -0.3 } },
  { t: 'Slider', p: { relSpeed: 84.0, ivb: 2.8, hb: -4.3, spinRate: 2450, plateZ: 2.0, plateX: -0.5 } },
  { t: 'Curva', p: { relSpeed: 78.5, ivb: -7.9, hb: -8.2, spinRate: 2550, plateZ: 1.9, plateX: -0.3 } },
  { t: 'Cambio', p: { relSpeed: 84.1, ivb: 5.9, hb: 12.0, spinRate: 1800, plateZ: 2.0, plateX: 0.4 } },
  { t: 'Splitter', p: { relSpeed: 84.0, ivb: 3.3, hb: 6.4, spinRate: 1450, plateZ: 1.9, plateX: 0.2 } },
];

interface Campo { k: keyof PitchInput; t: string; min: number; max: number; paso: number; u: string; info?: string }
const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'El lanzamiento', campos: [
    { k: 'relSpeed', t: 'Velocidad', min: 70, max: 102, paso: 0.5, u: 'mph' },
    { k: 'spinRate', t: 'Giro', min: 1200, max: 3200, paso: 25, u: 'rpm' },
    { k: 'ivb', t: 'Movimiento vertical', min: -20, max: 24, paso: 0.5, u: 'in', info: 'Cuánto cae menos (positivo) o más (negativo) que una pelota sin giro. Una recta con mucho parece que sube y una curva es negativa.' },
    { k: 'hb', t: 'Movimiento lateral', min: -22, max: 22, paso: 0.5, u: 'in', info: 'Positivo es hacia el lado del brazo del lanzador y negativo hacia el lado del guante.' },
  ]},
  { titulo: 'A dónde apunta (sólo mueve la trayectoria)', campos: [
    { k: 'plateZ', t: 'Altura en el plato', min: 0.8, max: 4.2, paso: 0.1, u: 'ft', info: 'La zona de strike va más o menos de 1.5 a 3.5 pies. Stuff+ no ve la ubicación, así que este control mueve el dibujo y casi no mueve el número. La ubicación la califica Location+.' },
    { k: 'plateX', t: 'Lado del plato', min: -1.5, max: 1.5, paso: 0.1, u: 'ft', info: '0 es el centro del plato. Igual que la altura, mueve la trayectoria y casi no mueve Stuff+.' },
  ]},
  { titulo: 'La mecánica', campos: [
    { k: 'extension', t: 'Extensión', min: 4.5, max: 7.5, paso: 0.1, u: 'ft', info: 'Qué tan adelante de la goma suelta la pelota.' },
    { k: 'relHeight', t: 'Altura de salida', min: 4.0, max: 7.0, paso: 0.1, u: 'ft' },
    { k: 'relSide', t: 'Lado de salida', min: -4, max: 4, paso: 0.1, u: 'ft' },
  ]},
];

function Deslizador({ c, valor, onChange }: { c: Campo; valor: number; onChange: (v: number) => void }) {
  const id = `sim-${c.k}`;
  return (
    <div className="campo">
      <div className="campo-cabeza">
        <label htmlFor={id}>{c.t}{c.info && <Info>{c.info}</Info>}</label>
        <output className="num valor-campo" htmlFor={id}>{nf(valor, c.paso < 0.1 ? 2 : c.paso < 1 ? 1 : 0)}<span className="unidad">{c.u}</span></output>
      </div>
      <input id={id} type="range" min={c.min} max={c.max} step={c.paso} value={valor} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

export interface SimuladorProps {
  metros: number; onMetros: (m: number) => void; arrastre: number;
  model: Model; helpers: Helpers; escala: Escala;
}

export function Simulador({ metros, onMetros, arrastre, model, helpers, escala }: SimuladorProps) {
  const [pitch, setPitch] = useState<PitchInput>({
    relSpeed: 92.4, ivb: 15.7, hb: 8.0, relHeight: 5.9, relSide: 1.6, extension: 6.1, spinRate: 2300, plateZ: 2.9, plateX: 0,
  });
  const [tipo, setTipo] = useState<string | null>('Recta');
  const [derecho, setDerecho] = useState(true);
  const [camara, setCamara] = useState<Camara>('catcher');

  const elegirTipo = (t: string) => {
    const p = TIPOS.find(x => x.t === t)!.p;
    setTipo(t);
    // Los típicos están medidos en derechos; en un zurdo el movimiento lateral y el lado son el espejo.
    setPitch(q => ({ ...q, ...p, hb: derecho ? p.hb! : -p.hb!, plateX: derecho ? p.plateX! : -p.plateX! }));
  };
  const cambiarMano = (d: boolean) => {
    if (d === derecho) return;
    setDerecho(d);
    setPitch(q => ({ ...q, relSide: -q.relSide, hb: -q.hb, plateX: -q.plateX }));
  };
  const mover = (k: keyof PitchInput) => (v: number) => { setTipo(null); setPitch(q => ({ ...q, [k]: v })); };

  // La pelota que se dibuja es el lanzamiento exacto. La calificación es el promedio de 49 variaciones chicas
  // alrededor de él, porque un lanzador nunca repite exacto y un modelo de árboles da escalones: calificar un
  // solo punto haría saltar el número por un detalle.
  const lento = useDeferredValue({ pitch, arrastre, derecho });
  const r = useMemo(() => {
    const { pitch: q, arrastre: idx, derecho: d } = lento;
    const rel = solveRelease(q);
    const mar = scorePitch(q, 1.0, d, model, helpers, escala, rel);
    const alt = scorePitch(q, idx, d, model, helpers, escala, rel);
    [mar.plus, alt.plus] = stuffEstable(q, [1.0, idx], d, model, helpers, escala);
    const sm = mar.traj.shape, sa = alt.traj.shape;
    return {
      mar, alt,
      movMar: Math.hypot(sm.ivb, sm.hb), movAlt: Math.hypot(sa.ivb, sa.hb),
      dAltura: (sa.plateZ - sm.plateZ) * 12, dLado: (sa.plateX - sm.plateX) * 12,
      velMar: sm.zoneSpeed, velAlt: sa.zoneSpeed,
      porMil: (Math.hypot(sm.ivb, sm.hb) / q.spinRate) * 1000,
    };
  }, [lento, model, helpers, escala]);

  const dPlus = r.alt.plus - r.mar.plus;
  const lugar = Math.abs(metros - 2240) < 40 ? 'el Harp Helú' : Math.abs(metros - 1609) < 40 ? 'Coors Field' : metros < 40 ? 'el nivel del mar' : `un estadio a ${nf(metros)} m`;
  const enAltura = metros >= 40;
  const veredicto = dPlus > CORTE_AGUANTA ? 'd-aguanta' : dPlus > CORTE_MUCHO ? 'd-pierde' : 'd-mucho';
  const palabras = plusEnPalabras(r.mar.plus) !== plusEnPalabras(r.alt.plus)
    ? `, y pasa de ${plusEnPalabras(r.mar.plus)} a ${plusEnPalabras(r.alt.plus)}` : '';
  const lectura = enAltura
    ? `En ${lugar} este lanzamiento se mueve ${nf(r.movMar - r.movAlt, 1)} pulgadas menos, llega ${nf(Math.abs(r.dAltura), 1)} pulgadas más ${r.dAltura < 0 ? 'abajo' : 'arriba'} y su Stuff+ ${dPlus < 0 ? 'baja' : 'sube'} ${nf(Math.abs(dPlus), 1)} puntos${palabras}.`
    : 'A nivel del mar las dos trayectorias son la misma. Sube la altitud para ver qué cambia.';

  return (
    <div className="sim">
      <div className="sim-tipos">
        <span className="etiqueta-grupo">Elige un lanzamiento típico de la LMB</span>
        <div className="chips">
          {TIPOS.map(x => (
            <button key={x.t} type="button" className={`chip${tipo === x.t ? ' activo' : ''}`} aria-pressed={tipo === x.t} onClick={() => elegirTipo(x.t)}>
              <i style={{ background: COLOR_TIPO_ES[x.t] }} />{x.t}
            </button>
          ))}
        </div>
        <div className="segmentado pequeno" role="group" aria-label="Mano del lanzador">
          <button type="button" className={derecho ? 'activo' : ''} onClick={() => cambiarMano(true)}>Derecho</button>
          <button type="button" className={!derecho ? 'activo' : ''} onClick={() => cambiarMano(false)}>Zurdo</button>
        </div>
      </div>

      <div className="sim-rejilla">
        <aside className="sim-controles tarjeta">
          <div className="sim-grupo">
            <h4>El estadio</h4>
            <ControlAltitud metros={metros} onChange={onMetros} />
          </div>
          {GRUPOS.map(g => (
            <div key={g.titulo} className="sim-grupo">
              <h4>{g.titulo}</h4>
              {g.campos.map(c => <Deslizador key={c.k} c={c} valor={pitch[c.k]} onChange={mover(c.k)} />)}
            </div>
          ))}
        </aside>

        <div className="sim-escena">
          <div className="sim-lienzo">
            <Diamante3D principal={r.alt.traj} fantasma={enAltura ? r.mar.traj : undefined} rpm={pitch.spinRate} camara={camara} />
            <div className="sim-camaras" role="group" aria-label="Cámara">
              {([['catcher', 'Detrás del catcher'], ['lado', 'De lado'], ['pitcher', 'Detrás del pitcher']] as [Camara, string][]).map(([k, t]) => (
                <button key={k} type="button" className={camara === k ? 'activo' : ''} onClick={() => setCamara(k)}>{t}</button>
              ))}
            </div>
            <div className="sim-leyenda">
              <span><i className="l-alt" /> {enAltura ? `En ${lugar}` : 'Nivel del mar'}</span>
              {enAltura && <span><i className="l-mar" /> Nivel del mar</span>}
              <span className="tenue">Arrastra para girar</span>
            </div>
          </div>

          <div className="sim-resultados">
            <div className="res-plus">
              <div><span className="etiqueta t-mar">Stuff+ a nivel del mar<Info>Promediamos 49 variaciones chicas alrededor de este lanzamiento (velocidad, movimiento, giro y salida), porque un lanzador nunca repite exacto. Cada una vuela con un arrastre distinto, porque dos pelotas no frenan igual. Es una forma típica suavizada: puede diferir del promedio de lanzamientos reales de la liga. No es un intervalo de confianza.</Info></span><b className="num">{nf(r.mar.plus, 1)}</b><span className="tenue">{plusEnPalabras(r.mar.plus)}</span></div>
              <div className="res-flecha" aria-hidden>→</div>
              <div><span className="etiqueta t-alt">Stuff+ en {lugar.replace(/^el /, '')}</span><b className="num">{nf(r.alt.plus, 1)}</b><span className="tenue">{plusEnPalabras(r.alt.plus)}</span></div>
              <div className="res-delta"><span className="etiqueta">Cambio</span><b className={`num ${veredicto}`}>{sg(dPlus)}</b></div>
            </div>
            <div className="res-fisica">
              <div><span>Movimiento total</span><b className="num">{nf(r.movMar, 1)} → {nf(r.movAlt, 1)} in</b></div>
              <div><span>Dónde llega</span><b className="num">{sg(r.dAltura, 1)} in de altura</b></div>
              <div><span>Velocidad al plato</span><b className="num">{nf(r.velMar, 1)} → {nf(r.velAlt, 1)} mph</b></div>
              <div><span>Movimiento por cada 1,000 rpm<Info>La pregunta de H4. Cuánto movimiento saca de su giro. Dos lanzamientos con el mismo giro pueden moverse muy distinto.</Info></span><b className="num">{nf(r.porMil, 1)} in</b></div>
            </div>
            <p className="res-lectura">{lectura}</p>
            <p className="tenue nota-pie">Estimación de una forma típica, promediada sobre 49 variaciones. El promedio de lanzamientos reales de un tipo puede dar otro cambio. La sensibilidad depende de la forma y del modelo; estas variaciones no representan un intervalo de confianza ni todo el error de la transferencia física.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
