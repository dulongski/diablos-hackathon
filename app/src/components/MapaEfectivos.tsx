/**
 * MAPA DE MOVIMIENTO de los lanzamientos más y menos efectivos: Entregable 4.
 *
 * Lanzamientos reales de derechos (el movimiento lateral de un zurdo es el espejo), calificados
 * con el aire del Harp Helú. Para cada tipo se dibuja el 10 % mejor y el 10 % peor: la distancia
 * entre las dos nubes es, literalmente, la forma que conviene pedirle a un lanzador en casa.
 * Cada punto es una celda de 2 pulgadas con al menos 10 lanzamientos (el reto no permite publicar
 * datos sueltos); su tamaño crece con cuántos lanzamientos agrupa y los promedios se ponderan por eso.
 */
import { useMemo, useState } from 'react';
import { COLOR_TIPO_ES, type PuntoMapa } from '../jurado';
import { nf, sg } from '../settings';

const W = 620, H = 520, P = 48, LIM = 24;
const sx = (hb: number) => P + ((hb + LIM) / (2 * LIM)) * (W - 2 * P);
const sy = (ivb: number) => H - P - ((ivb + LIM) / (2 * LIM)) * (H - 2 * P);
const ORDEN = ['Recta', 'Sinker', 'Cutter', 'Slider', 'Curva', 'Cambio', 'Splitter'];

function media(p: PuntoMapa[], k: 'hb' | 'ivb' | 'v' | 's') {
  const n = p.reduce((a, x) => a + (x.n ?? 1), 0);
  return p.reduce((a, x) => a + x[k] * (x.n ?? 1), 0) / Math.max(n, 1);
}
const radio = (p: PuntoMapa, max: number) => 2.4 + 6 * Math.sqrt((p.n ?? 1) / Math.max(max, 1));

export function MapaEfectivos({ puntos }: { puntos: PuntoMapa[] }) {
  const tipos = ORDEN.filter(t => puntos.some(p => p.t === t));
  const [tipo, setTipo] = useState<string>('Recta');
  const vis = useMemo(() => (tipo === 'Todos' ? puntos : puntos.filter(p => p.t === tipo)), [puntos, tipo]);
  const mejor = vis.filter(p => p.c === 'mejor'), peor = vis.filter(p => p.c === 'peor');
  const maxN = Math.max(1, ...vis.map(p => p.n ?? 1));
  const ticks = [-20, -10, 0, 10, 20];

  // La diferencia entre los mejores y los peores, en palabras.
  const dv = media(mejor, 'v') - media(peor, 'v');
  const divb = media(mejor, 'ivb') - media(peor, 'ivb');
  const dhb = Math.abs(media(mejor, 'hb')) - Math.abs(media(peor, 'hb'));

  return (
    <div className="mapa-efectivos">
      <div className="chips">
        {['Todos', ...tipos].map(t => (
          <button key={t} type="button" className={`chip${tipo === t ? ' activo' : ''}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>
            {t !== 'Todos' && <i style={{ background: COLOR_TIPO_ES[t] }} />}{t}
          </button>
        ))}
      </div>

      <div className="mapa-efectivos-cuerpo">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label={`Movimiento del 10 % más efectivo y el 10 % menos efectivo de ${tipo === 'Todos' ? 'todos los lanzamientos' : tipo}, calificados en el Harp Helú.`}>
          {ticks.map(t => <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={P} y2={H - P} className={t === 0 ? 'eje-cero' : 'rejilla'} />
            <line x1={P} x2={W - P} y1={sy(t)} y2={sy(t)} className={t === 0 ? 'eje-cero' : 'rejilla'} />
            <text x={sx(t)} y={H - P + 18} textAnchor="middle" className="eje">{t}</text>
            <text x={P - 10} y={sy(t) + 4} textAnchor="end" className="eje">{t}</text>
          </g>)}
          <text x={W / 2} y={H - 8} textAnchor="middle" className="eje-titulo">← hacia el brazo contrario · movimiento lateral (pulgadas) · hacia su brazo →</text>
          <text x={14} y={H / 2} textAnchor="middle" className="eje-titulo" transform={`rotate(-90 14 ${H / 2})`}>cae ↓ · movimiento vertical (pulgadas) · "sube" ↑</text>

          {peor.map((p, i) => <circle key={`p${i}`} cx={sx(p.hb)} cy={sy(p.ivb)} r={radio(p, maxN)} className="ef-peor"><title>{`${p.t} · ${p.n} lanzamientos · Stuff+ ${p.s} · ${p.v} mph`}</title></circle>)}
          {mejor.map((p, i) => <circle key={`m${i}`} cx={sx(p.hb)} cy={sy(p.ivb)} r={radio(p, maxN)} className="ef-mejor"
                                      style={{ fill: COLOR_TIPO_ES[p.t] }}><title>{`${p.t} · ${p.n} lanzamientos · Stuff+ ${p.s} · ${p.v} mph`}</title></circle>)}
        </svg>

        <aside className="mapa-efectivos-lectura">
          <div className="leyenda vertical">
            <span className="clave"><i className="ef-mejor-k" style={tipo !== 'Todos' ? { background: COLOR_TIPO_ES[tipo] } : undefined} /> El 10 % más efectivo en el Harp Helú{tipo === 'Todos' && ' (color de su tipo)'}</span>
            <span className="clave"><i className="ef-peor-k" /> El 10 % menos efectivo</span>
          </div>
          {tipo !== 'Todos' && mejor.length > 0 && (
            <>
              <p className="lectura-titulo">Qué separa a {tipo === 'Cambio' ? 'un buen cambio' : tipo === 'Curva' ? 'una buena curva' : tipo === 'Recta' ? 'una buena recta' : `un buen ${tipo.toLowerCase()}`} de {tipo === 'Curva' || tipo === 'Recta' ? 'una mala' : 'uno malo'}, en casa</p>
              <dl className="lectura-datos">
                <div><dt>Velocidad</dt><dd className="num">{sg(dv)} mph</dd></div>
                <div><dt>Movimiento vertical</dt><dd className="num">{sg(divb)} in</dd></div>
                <div><dt>Movimiento lateral</dt><dd className="num">{sg(dhb)} in</dd></div>
                <div><dt>Stuff+ medio</dt><dd className="num">{nf(media(peor, 's'), 0)} → {nf(media(mejor, 's'), 0)}</dd></div>
              </dl>
              <p className="tenue">Lanzadores derechos. En un zurdo el movimiento lateral es el espejo. Cada círculo junta los lanzamientos de una celda de 2 pulgadas, y es más grande mientras más lanzamientos tiene. No mostramos lanzamientos sueltos.</p>
            </>
          )}
          {tipo === 'Todos' && <p className="tenue">Elige un tipo de lanzamiento para ver qué separa a los mejores de los peores.</p>}
        </aside>
      </div>
    </div>
  );
}
