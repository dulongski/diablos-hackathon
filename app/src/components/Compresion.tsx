/**
 * LA COMPRESIÓN.
 *
 * Los lanzamientos de un tipo, partidos en cinco grupos según qué tan buenos son a nivel del mar.
 * El castigo de la altitud no se reparte parejo: el peor grupo casi no pierde y el mejor se desploma.
 */
import { L, nf, sg } from '../settings';

export interface Quintil { n: number; plus_mar: number; plus_alt: number; delta: number }

const W = 700, H = 540, PAD_L = 56, PAD_R = 24, PAD_T = 24, PAD_B = 52;
const LO = 78, HI = 122;

export function Compresion({ quintiles }: { quintiles: Record<string, Quintil> }) {
  const filas = Object.entries(quintiles);
  if (!filas.length) return null;

  const x = (i: number) => PAD_L + ((i + 0.5) / filas.length) * (W - PAD_L - PAD_R);
  const y = (v: number) => H - PAD_B - ((v - LO) / (HI - LO)) * (H - PAD_T - PAD_B);
  const ticks = [80, 90, 100, 110, 120];
  const nombre = (i: number) => i === 0 ? L('Peor 20 %', 'Worst 20%')
    : i === filas.length - 1 ? L('Mejor 20 %', 'Best 20%') : L(`Grupo ${i + 1}`, `Group ${i + 1}`);

  return (
    <figure className="compresion">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={L('El castigo de la altitud por grupo de calidad: los peores casi no pierden, los mejores se desploman.',
                         'Altitude penalty by quality group: the worst barely lose, the best collapse.')}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD_L} y1={y(t)} x2={W - PAD_R} y2={y(t)}
                  stroke={t === 100 ? 'var(--tezontle)' : 'var(--rejilla)'} strokeWidth={t === 100 ? 1.4 : 1} />
            <text x={PAD_L - 10} y={y(t) + 4} className="eje" textAnchor="end">{t}</text>
          </g>
        ))}
        <text x={PAD_L + 6} y={y(100) - 6} className="eje-nota" textAnchor="start">{L('promedio de la liga', 'league average')}</text>
        <text x={16} y={(H - PAD_B + PAD_T) / 2} className="eje-titulo" textAnchor="middle"
              transform={`rotate(-90 16 ${(H - PAD_B + PAD_T) / 2})`}>Stuff+</text>

        {filas.map(([k, v], i) => {
          const gana = v.delta > 0;
          const col = gana ? 'var(--gana)' : 'var(--diablo)';
          const abajo = Math.min(v.plus_mar, v.plus_alt);
          const cerca = Math.abs(v.plus_mar - v.plus_alt) < 3;
          return (
            <g key={k}>
              <line x1={x(i)} y1={y(v.plus_mar)} x2={x(i)} y2={y(v.plus_alt)} stroke={col} strokeWidth={3} />
              <circle cx={x(i)} cy={y(v.plus_mar)} r={7} fill="var(--basalto-alto)" stroke="var(--nivel-mar)" strokeWidth={2.2} />
              <circle cx={x(i)} cy={y(v.plus_alt)} r={5} fill={col} />
              {/* Si los dos puntos casi se tocan, cada valor va de un lado para que no se encimen. */}
              <text x={x(i) + (cerca ? -13 : 13)} y={y(v.plus_mar) + 4} className="valor-punto mar" textAnchor={cerca ? 'end' : 'start'}>{nf(v.plus_mar, 0)}</text>
              <text x={x(i) + 13} y={y(v.plus_alt) + 4} className="valor-punto" fill={col}>{nf(v.plus_alt, 0)}</text>
              <text x={x(i)} y={y(abajo) + 28} className="delta-quintil" textAnchor="middle" fill={col}>{sg(v.delta)}</text>
              <text x={x(i)} y={H - 18} className="eje fuerte" textAnchor="middle">{nombre(i)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <span className="clave"><i className="p-mar" /> {L('Nivel del mar', 'Sea level')}</span>
        <span className="clave"><i className="p-alt" /> {L('El mismo lanzamiento en el Harp Helú', 'The same pitch at Harp Helú')}</span>
      </figcaption>
    </figure>
  );
}
