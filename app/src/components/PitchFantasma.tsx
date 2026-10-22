/**
 * EL PITCH FANTASMA — el elemento firma de la página.
 *
 * Dos pelotas salen de la misma mano, en el mismo instante, con el mismo brazo y el mismo
 * giro. Una vuela en el aire del Harp Helú y la otra a nivel del mar. Llegan al plato
 * separadas por las pulgadas que el modelo mide, y la de altitud llega antes, porque el
 * aire la frena menos.
 */
import { useMemo, useState } from 'react';
import { releaseAt, solveRelease, type PitchInput } from '../lib/physics';
import { Escena3D } from './Escena3D';
import { L, nf } from '../settings';

export function PitchFantasma({ pitch, arrastre }: { pitch: PitchInput; arrastre: number }) {
  const [sep, setSep] = useState(0);
  const [pct, setPct] = useState(0);

  const par = useMemo(() => {
    // Un solo release: lo único que cambia entre las dos pelotas es el aire.
    const rel = solveRelease(pitch);
    return {
      mar: releaseAt(rel, 1.0, pitch.spinRate),
      alt: releaseAt(rel, arrastre, pitch.spinRate),
    };
  }, [pitch, arrastre]);

  const sepFinal = Math.hypot(
    par.alt.shape.plateX - par.mar.shape.plateX,
    par.alt.shape.plateZ - par.mar.shape.plateZ,
  ) * 12;

  return (
    <div className="escenario">
      <Escena3D pares={[par]} escalera
                onProgreso={(s, p) => { setSep(s); setPct(p); }} />

      <div className="lectura-separacion">
        <span className="etiqueta">{L('Distancia entre las dos pelotas', 'Gap between the two balls')}</span>
        <div className="num cifra-separacion">
          {nf(pct < 1 ? sep : sepFinal, 1)}<span className="unidad">{L('pulgadas', 'inches')}</span>
        </div>
        <div className="barra-vuelo"><i style={{ transform: `scaleX(${pct})` }} /></div>
      </div>

      <div className="leyenda-escena" aria-hidden>
        <span><i className="p-alt" /> Harp Helú</span>
        <span><i className="p-mar" /> {L('Nivel del mar', 'Sea level')}</span>
      </div>

      <p className="solo-lectores">
        {L(`El mismo lanzamiento en dos aires. A nivel del mar cruza el plato a ${par.mar.shape.plateZ.toFixed(2)} pies de altura; en el Harp Helú, a ${par.alt.shape.plateZ.toFixed(2)} pies. Separación final: ${sepFinal.toFixed(1)} pulgadas.`,
           `The same pitch in two kinds of air. At sea level it crosses the plate at ${par.mar.shape.plateZ.toFixed(2)} ft; at Harp Helú, at ${par.alt.shape.plateZ.toFixed(2)} ft. Final gap: ${sepFinal.toFixed(1)} inches.`)}
      </p>
    </div>
  );
}
