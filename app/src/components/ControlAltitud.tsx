/**
 * El control de altitud. Mueve la página entera: la densidad del aire, las dos trayectorias,
 * los Stuff+ y el campo de puntos del fondo.
 */
import { densityAtAltitude } from '../lib/physics';
import { L, nf } from '../settings';
import { Info } from './Info';

const HITOS = [
  { m: 0, es: 'Nivel del mar', en: 'Sea level' },
  { m: 1609, es: 'Coors Field', en: 'Coors Field' },
  { m: 2240, es: 'Harp Helú', en: 'Harp Helú' },
];

export function ControlAltitud({ metros, onChange }: { metros: number; onChange: (m: number) => void }) {
  const aire = densityAtAltitude(metros) * 100;
  return (
    <div className="control-altitud">
      <div className="control-cabeza">
        <label className="etiqueta" htmlFor="altitud">
          {L('Altitud del estadio', 'Ballpark altitude')}
          <Info>{L(
            'Mueve la altitud y todo se recalcula: las dos pelotas, el fondo y el simulador. Coors Field (Denver) es el estadio más alto de Grandes Ligas.',
            'Move the altitude and everything recalculates: both balls, the background and the simulator. Coors Field (Denver) is the highest park in MLB.')}</Info>
        </label>
        <output className="num lectura-altitud" htmlFor="altitud">
          {nf(metros)}<span className="unidad">m</span>
        </output>
      </div>

      <input id="altitud" type="range" min={0} max={2500} step={10} value={metros}
             onChange={e => onChange(Number(e.target.value))} />

      <div className="hitos">
        {HITOS.map(h => (
          <button key={h.m} type="button"
                  className={`hito${Math.abs(metros - h.m) < 40 ? ' activo' : ''}`}
                  onClick={() => onChange(h.m)}>
            <span>{L(h.es, h.en)}</span>
            <span className="num">{nf(h.m)} m</span>
          </button>
        ))}
        <span className="hito-aire">
          {L('Aire', 'Air')} <b className="num">{nf(aire, 0)}%</b> {L('del nivel del mar', 'of sea level')}
        </span>
      </div>
    </div>
  );
}
