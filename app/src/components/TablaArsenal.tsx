/**
 * QUÉ LANZAMIENTOS CONVIENEN.
 *
 * Los tipos de lanzamiento con su Stuff+ en los dos aires. Se ordena tocando el encabezado de
 * cualquier columna. Es la tabla que contesta la pregunta del reto: qué conviene firmar para
 * lanzar en el Harp Helú.
 */
import { useState } from 'react';
import { COLOR_TIPO, nombreTipo, veredicto } from '../lexico';
import { L, nf, sg } from '../settings';
import { Info } from './Info';
import type { TipoMigracion } from './MapaMigracion';

type Col = 'tipo' | 'mar' | 'alt' | 'delta' | 'ivb' | 'hb' | 'n';

export function TablaArsenal({ tipos, activo, onActivo }: {
  tipos: TipoMigracion[];
  activo: string | null;
  onActivo: (t: string | null) => void;
}) {
  const [orden, setOrden] = useState<{ col: Col; desc: boolean }>({ col: 'delta', desc: true });
  const valor = (t: TipoMigracion, c: Col): number | string => ({
    tipo: nombreTipo(t.tipo), mar: t.mar.plus, alt: t.alt.plus, delta: t.delta_plus,
    ivb: t.alt.ivb - t.mar.ivb, hb: Math.abs(t.alt.hb) - Math.abs(t.mar.hb), n: t.n,
  }[c]);
  const filas = [...tipos].sort((a, b) => {
    const va = valor(a, orden.col), vb = valor(b, orden.col);
    const r = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return orden.desc ? -r : r;
  });
  const max = Math.max(...tipos.map(t => Math.abs(t.delta_plus))) || 1;

  const Cab = ({ c, children, n = true }: { c: Col; children: React.ReactNode; n?: boolean }) => (
    <th scope="col" className={n ? 'n' : ''} aria-sort={orden.col === c ? (orden.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className={`ordenar${orden.col === c ? ' activo' : ''}`}
              onClick={() => setOrden(o => ({ col: c, desc: o.col === c ? !o.desc : c !== 'tipo' }))}>
        {children}<span className="flecha" aria-hidden>{orden.col === c ? (orden.desc ? '▾' : '▴') : '↕'}</span>
      </button>
    </th>
  );

  return (
    <div className="tabla-envoltura">
      <table className="tabla-arsenal">
        <caption className="solo-lectores">
          {L('Stuff+ por tipo de lanzamiento a nivel del mar y en el Harp Helú.', 'Stuff+ by pitch type at sea level and at Harp Helú.')}
        </caption>
        <thead>
          <tr>
            <Cab c="tipo" n={false}>{L('Lanzamiento', 'Pitch')}</Cab>
            <Cab c="mar"><span className="t-mar">{L('Nivel del mar', 'Sea level')}</span></Cab>
            <Cab c="alt"><span className="t-alt">Harp Helú</span></Cab>
            <Cab c="delta">{L('Cambio', 'Change')}</Cab>
            <th scope="col" className="barra-col"><span className="solo-lectores">{L('magnitud', 'size')}</span></th>
            <Cab c="ivb">{L('Mov. vertical', 'Vert. movement')}</Cab>
            <Cab c="hb">{L('Mov. lateral', 'Horiz. movement')}</Cab>
            <Cab c="n">{L('Lanzamientos', 'Pitches')}</Cab>
          </tr>
        </thead>
        <tbody>
          {filas.map(t => {
            const v = veredicto(t.delta_plus);
            const dv = t.alt.ivb - t.mar.ivb, dh = Math.abs(t.alt.hb) - Math.abs(t.mar.hb);
            return (
              <tr key={t.tipo} className={activo === t.tipo ? 'activo' : ''}
                  onMouseEnter={() => onActivo(t.tipo)} onMouseLeave={() => onActivo(null)}>
                <th scope="row">
                  <span className="tipo"><i style={{ background: COLOR_TIPO[t.tipo] }} />{nombreTipo(t.tipo)}</span>
                  <span className={`pildora ${v.k}`}>{v.txt}</span>
                </th>
                <td className="num n">{nf(t.mar.plus, 1)}</td>
                <td className="num n">{nf(t.alt.plus, 1)}</td>
                <td className={`num n destacado ${t.delta_plus > 0 ? 'gana' : 'pierde'}`}>
                  <span className="flechita">{t.delta_plus > 0 ? '▲' : '▼'}</span>{sg(t.delta_plus)}
                </td>
                <td className="barra-col">
                  <span className={`barra-delta ${t.delta_plus > 0 ? 'gana' : 'pierde'}`}
                        style={{ width: `${(Math.abs(t.delta_plus) / max) * 100}%` }} />
                </td>
                <td className="num n">{sg(dv)}<span className="unidad">in</span></td>
                <td className="num n">{sg(dh)}<span className="unidad">in</span></td>
                <td className="num n tenue">{nf(t.n)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="pie-tabla">
        {L('En Stuff+, 100 es el promedio de la liga.', 'Stuff+: 100 is league average.')}
        <Info>{L(
          'Movimiento vertical y lateral. Cuántas pulgadas de movimiento gana o pierde el lanzamiento en el Harp Helú, medido dentro del mismo lanzador. El lateral se cuenta hacia afuera, sin importar la mano.',
          'Vertical and horizontal movement: how many inches the pitch gains or loses at Harp Helú, measured within the same pitcher. Horizontal is counted outward, regardless of handedness.')}</Info>
      </p>
    </div>
  );
}
