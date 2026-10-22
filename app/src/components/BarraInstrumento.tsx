/** Barra fija: donde estamos en la atmosfera y con que datos. */
import { densityAtAltitude } from '../lib/physics';

export function BarraInstrumento({ metros }: { metros: number }) {
  const rho = densityAtAltitude(metros);
  return (
    <header className="barra">
      <div className="envoltura barra-fila">
        <span className="marca display">Diablos · Stuff+</span>
        <div className="barra-lecturas">
          <span className="lectura">
            <span className="etiqueta">altitud</span>
            <b className="num">{metros.toLocaleString('es-MX')}<span className="unidad">m</span></b>
          </span>
          <span className="lectura">
            <span className="etiqueta">densidad</span>
            <b className="num">{rho.toFixed(3)}</b>
          </span>
          <span className="lectura oculta-movil">
            <span className="etiqueta">datos</span>
            <b className="num">LMB 24–26</b>
          </span>
        </div>
      </div>
    </header>
  );
}
