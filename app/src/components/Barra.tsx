/** Barra fija: la marca, dónde estamos en la atmósfera y los ajustes. */
import { densityAtAltitude } from '../lib/physics';
import { L, nf } from '../settings';
import { Ajustes } from './Ajustes';

export function Barra({ metros }: { metros: number }) {
  const aire = densityAtAltitude(metros) * 100;
  const lugar = Math.abs(metros - 2240) < 40 ? 'Harp Helú'
    : Math.abs(metros - 1609) < 40 ? 'Coors Field'
    : metros < 40 ? L('Nivel del mar', 'Sea level') : L('Estadio simulado', 'Simulated park');
  return (
    <header className="barra">
      <div className="envoltura barra-fila">
        <span className="marca display"><img src="./logos/diablos.png" alt="" className="marca-logo" onError={e => { e.currentTarget.style.display = 'none'; }} />Diablos <b>Stuff+</b></span>
        <div className="barra-lecturas">
          <span className="lectura">
            <span className="lectura-lugar">{lugar}</span>
            <b className="num">{nf(metros)}<span className="unidad">m</span></b>
          </span>
          <span className="lectura oculta-movil">
            <span className="lectura-lugar">{L('Aire', 'Air')}</span>
            <b className="num">{nf(aire, 0)}<span className="unidad">%</span></b>
          </span>
          <Ajustes />
        </div>
      </div>
    </header>
  );
}
