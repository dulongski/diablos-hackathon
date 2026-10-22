/**
 * EL MAPA DE MOVIMIENTO.
 *
 * El plano clásico (movimiento lateral contra vertical) con cada tipo de lanzamiento dos veces:
 * dónde vive al nivel del mar y dónde termina en el aire del Harp Helú. La flecha es el efecto de
 * la altitud, medido dentro del mismo lanzador, así que no lo contamina quién lanza dónde.
 */
import { COLOR_TIPO, nombreTipo } from '../lexico';
import { L, nf, sg } from '../settings';

export interface TipoMigracion {
  tipo: string;
  n: number;
  mar: { ivb: number; hb: number; plus: number };
  alt: { ivb: number; hb: number; plus: number };
  delta_plus: number;
}

const W = 620, H = 560, PAD = 60;
const LIM = 22;   // pulgadas, en ambos ejes

const px = (hb: number) => PAD + ((hb + LIM) / (2 * LIM)) * (W - 2 * PAD);
const py = (ivb: number) => H - PAD - ((ivb + LIM) / (2 * LIM)) * (H - 2 * PAD);

export function MapaMigracion({ tipos, activo, onActivo }: {
  tipos: TipoMigracion[];
  activo: string | null;
  onActivo: (t: string | null) => void;
}) {
  const ticks = [-20, -10, 0, 10, 20];
  const sel = tipos.find(t => t.tipo === activo);

  return (
    <figure className="mapa">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={L('Mapa de movimiento: en altitud todos los lanzamientos se mueven menos.',
                         'Movement map: at altitude every pitch moves less.')}>
        <defs>
          <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--diablo)" />
          </marker>
        </defs>

        {ticks.map(t => (
          <g key={`g${t}`}>
            <line x1={px(t)} y1={PAD} x2={px(t)} y2={H - PAD}
                  stroke={t === 0 ? 'var(--tezontle)' : 'var(--rejilla)'} strokeWidth={t === 0 ? 1.4 : 1} />
            <line x1={PAD} y1={py(t)} x2={W - PAD} y2={py(t)}
                  stroke={t === 0 ? 'var(--tezontle)' : 'var(--rejilla)'} strokeWidth={t === 0 ? 1.4 : 1} />
            <text x={px(t)} y={H - PAD + 20} className="eje" textAnchor="middle">{t}</text>
            <text x={PAD - 12} y={py(t) + 4} className="eje" textAnchor="end">{t}</text>
          </g>
        ))}
        <text x={W / 2} y={H - 14} className="eje-titulo" textAnchor="middle">
          {L('Movimiento lateral (pulgadas)', 'Horizontal movement (inches)')}
        </text>
        <text x={18} y={H / 2} className="eje-titulo" textAnchor="middle" transform={`rotate(-90 18 ${H / 2})`}>
          {L('Movimiento vertical (pulgadas)', 'Vertical movement (inches)')}
        </text>
        <text x={W - PAD} y={py(0) - 8} className="eje-nota" textAnchor="end">{L('sin giro', 'no spin')}</text>

        {tipos.map(t => {
          const on = activo === null || activo === t.tipo;
          return (
            <g key={t.tipo} opacity={on ? 1 : 0.16}
               onMouseEnter={() => onActivo(t.tipo)} onMouseLeave={() => onActivo(null)}
               onClick={() => onActivo(activo === t.tipo ? null : t.tipo)}
               style={{ cursor: 'pointer' }}>
              <line x1={px(t.mar.hb)} y1={py(t.mar.ivb)} x2={px(t.alt.hb)} y2={py(t.alt.ivb)}
                    stroke="var(--diablo)" strokeWidth={1.8} markerEnd="url(#punta)" opacity={0.9} />
              <circle cx={px(t.mar.hb)} cy={py(t.mar.ivb)} r={6} fill="var(--basalto-alto)"
                      stroke="var(--nivel-mar)" strokeWidth={2} />
              <circle cx={px(t.alt.hb)} cy={py(t.alt.ivb)} r={4.5} fill="var(--diablo)" />
              <circle cx={px(t.mar.hb) + 12} cy={py(t.mar.ivb) - 12} r={3.5} fill={COLOR_TIPO[t.tipo] ?? 'var(--ceniza)'} />
              <text x={px(t.mar.hb) + 19} y={py(t.mar.ivb) - 8} className="etiqueta-tipo">{nombreTipo(t.tipo)}</text>
              <circle cx={px(t.mar.hb)} cy={py(t.mar.ivb)} r={18} fill="transparent" />
            </g>
          );
        })}

        {sel && (() => {
          const bx = Math.min(W - PAD - 210, Math.max(PAD + 4, px(sel.alt.hb) + 14));
          const by = Math.min(H - PAD - 84, py(sel.alt.ivb) + 14);
          const dv = sel.alt.ivb - sel.mar.ivb, dh = Math.abs(sel.alt.hb) - Math.abs(sel.mar.hb);
          return (
            <g className="globo" pointerEvents="none">
              <rect x={bx} y={by} width={210} height={80} rx={8} />
              <text x={bx + 12} y={by + 22} className="globo-titulo">{nombreTipo(sel.tipo)}</text>
              <text x={bx + 12} y={by + 42} className="globo-txt">{L('Vertical', 'Vertical')} {nf(sel.mar.ivb, 1)} → {nf(sel.alt.ivb, 1)} in ({sg(dv)})</text>
              <text x={bx + 12} y={by + 59} className="globo-txt">{L('Lateral', 'Horizontal')} {nf(Math.abs(sel.mar.hb), 1)} → {nf(Math.abs(sel.alt.hb), 1)} in ({sg(dh)})</text>
              <text x={bx + 12} y={by + 74} className="globo-txt">Stuff+ {nf(sel.mar.plus, 1)} → {nf(sel.alt.plus, 1)}</text>
            </g>
          );
        })()}
      </svg>

      <figcaption>
        <span className="clave"><i className="p-mar" /> {L('Nivel del mar', 'Sea level')}</span>
        <span className="clave"><i className="p-alt" /> {L('Harp Helú, 2,240 m', 'Harp Helú, 2,240 m')}</span>
        <span className="clave-nota">{L('Pasa el cursor por un lanzamiento para ver sus números', 'Hover a pitch to see its numbers')}</span>
      </figcaption>
    </figure>
  );
}
