/**
 * LANZADORES: la pregunta del club: qué lanzadores sufren la altitud y cuáles aguantan.
 * Entregable 1 (Stuff+, Location+ y Pitching+ por pitcher; CDMX contra nivel del mar).
 *
 * Primero el mapa, que contesta la pregunta de fichaje de un vistazo: qué tan bueno es cada
 * lanzador (eje horizontal) contra cuánto pierde en el Harp Helú (eje vertical). Después la tabla
 * para buscar y la ficha del seleccionado.
 */
import { useMemo, useState } from 'react';
import type { Jurado, Pitcher } from '../jurado';
import { plusEnPalabras, veredicto } from '../lexico';
import { nf, sg } from '../settings';

type Orden = 'mejores' | 'pierden' | 'aguantan' | 'constantes';

const ORDENES: { k: Orden; t: string; nota: string }[] = [
  { k: 'mejores', t: 'Mejores en el Harp Helú', nota: 'Ordenados por su Stuff+ en casa de los Diablos.' },
  { k: 'pierden', t: 'Los que más pierden', nota: 'Ordenados por cuánto baja su Stuff+ al pasar del nivel del mar al Harp Helú.' },
  { k: 'aguantan', t: 'Buenos que aguantan', nota: 'Al menos promedio en casa (Stuff+ ≥ 100), ordenados por lo poco que pierden.' },
  { k: 'constantes', t: 'Los más constantes', nota: 'Al menos promedio en casa, ordenados por lo poco que varía su calificación de un juego a otro.' },
];

function ordenar(p: Pitcher[], o: Orden): Pitcher[] {
  const c = [...p];
  if (o === 'mejores') return c.sort((a, b) => b.stuff_hh - a.stuff_hh);
  if (o === 'pierden') return c.sort((a, b) => a.delta_hh - b.delta_hh);
  if (o === 'aguantan') return c.filter(x => x.stuff_hh >= 100).sort((a, b) => b.delta_hh - a.delta_hh);
  return c.filter(x => x.stuff_hh >= 100).sort((a, b) => a.sd_juego - b.sd_juego);
}

const mano = (m: Pitcher['mano']) => (m === 'Left' ? 'Zurdo' : m === 'Right' ? 'Derecho' : 's/d');

/* ------------------------------------------------------------------ el mapa */

const W = 760, H = 420, PL = 58, PR = 18, PT = 18, PB = 50;

function MapaFichajes({ p, sel, onSel }: { p: Pitcher[]; sel: Pitcher | null; onSel: (x: Pitcher) => void }) {
  const xs = p.map(x => x.stuff_mar), ys = p.map(x => x.delta_hh);
  const x0 = Math.floor(Math.min(...xs) / 2) * 2 - 1, x1 = Math.ceil(Math.max(...xs) / 2) * 2 + 1;
  const y0 = Math.floor(Math.min(...ys)) - 0.5, y1 = Math.max(2, Math.ceil(Math.max(...ys))) + 0.5;
  const sx = (v: number) => PL + ((v - x0) / (x1 - x0)) * (W - PL - PR);
  const sy = (v: number) => PT + ((y1 - v) / (y1 - y0)) * (H - PT - PB);
  const tx = []; for (let v = Math.ceil(x0 / 5) * 5; v <= x1; v += 5) tx.push(v);
  const ty = []; for (let v = Math.ceil(y0 / 2) * 2; v <= y1; v += 2) ty.push(v);
  const corte = -1.2;   // "aguanta" según lexico.veredicto

  return (
    <figure className="mapa-fichajes">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Cada punto es un lanzador: a la derecha los mejores, abajo los que más pierden en el Harp Helú.">
        {/* cuadrante que conviene: bueno y aguanta */}
        <rect x={sx(100)} y={sy(y1)} width={sx(x1) - sx(100)} height={sy(corte) - sy(y1)} className="cuad-bueno" />
        <text x={sx(x1) - 8} y={sy(y1) + 18} textAnchor="end" className="cuad-txt bueno">Bueno y aguanta la altura → fichar</text>
        <text x={sx(x1) - 8} y={sy(y0) - 10} textAnchor="end" className="cuad-txt malo">Bueno a nivel del mar, pero pierde mucho aquí</text>
        <text x={sx(x0) + 8} y={sy(y1) + 18} className="cuad-txt">Aguanta, pero no es bueno</text>

        {tx.map(v => <g key={`x${v}`}>
          <line x1={sx(v)} x2={sx(v)} y1={PT} y2={H - PB} className={v === 100 ? 'eje-cero' : 'rejilla'} />
          <text x={sx(v)} y={H - PB + 18} textAnchor="middle" className="eje">{v}</text>
        </g>)}
        {ty.map(v => <g key={`y${v}`}>
          <line x1={PL} x2={W - PR} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'eje-cero' : 'rejilla'} />
          <text x={PL - 8} y={sy(v) + 4} textAnchor="end" className="eje">{sg(v, 0)}</text>
        </g>)}
        <text x={(PL + W - PR) / 2} y={H - 8} textAnchor="middle" className="eje-titulo">Stuff+ a nivel del mar · qué tan bueno es (100 = promedio) →</text>
        <text x={16} y={(PT + H - PB) / 2} textAnchor="middle" className="eje-titulo" transform={`rotate(-90 16 ${(PT + H - PB) / 2})`}>cuánto cambia en el Harp Helú</text>

        {p.map(x => {
          const v = veredicto(x.delta_hh).k;
          return <circle key={x.nombre} cx={sx(x.stuff_mar)} cy={sy(x.delta_hh)} r={sel?.nombre === x.nombre ? 7 : 3.4}
                         className={`pt pt-${v}${sel?.nombre === x.nombre ? ' pt-sel' : ''}`}
                         onClick={() => onSel(x)}><title>{`${x.nombre} · ${x.arsenal} · ${nf(x.stuff_mar, 1)} → ${nf(x.stuff_hh, 1)}`}</title></circle>;
        })}
        {sel && <text x={sx(sel.stuff_mar) + 10} y={sy(sel.delta_hh) - 9} className="pt-etiqueta">{sel.nombre}</text>}
      </svg>
      <figcaption className="leyenda">
        <span className="clave"><i className="pt-aguanta" /> Aguanta (pierde menos de 1.2)</span>
        <span className="clave"><i className="pt-pierde" /> Pierde (1.2 a 2.5)</span>
        <span className="clave"><i className="pt-mucho" /> Pierde mucho (más de 2.5)</span>
        <span className="nota-leyenda">Toca un punto para ver la ficha.</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ la ficha */

function Ficha({ x }: { x: Pitcher }) {
  const v = veredicto(x.delta_hh);
  const obs = x.carreras_delta != null;
  return (
    <article className="ficha tarjeta">
      <div className="ficha-cabeza">
        <div>
          <h3>{x.nombre}</h3>
          <p className="ficha-sub">{mano(x.mano)} · {nf(x.n)} lanzamientos en {x.juegos} juegos · {nf(x.pct_altura * 100, 0)} % en altura</p>
        </div>
        <span className={`sello sello-${v.k}`}>{v.txt}</span>
      </div>

      <div className="ficha-arsenal">
        {x.arsenal.split(' · ').map(t => <span key={t} className="chip-tipo">{t}</span>)}
      </div>

      <div className="ficha-salto">
        <div><span className="etiqueta t-mar">Nivel del mar</span><b className="num">{nf(x.stuff_mar, 1)}</b><span className="tenue">{plusEnPalabras(x.stuff_mar)}</span></div>
        <div className="ficha-flecha" aria-hidden>→</div>
        <div><span className="etiqueta t-alt">Harp Helú</span><b className="num">{nf(x.stuff_hh, 1)}</b><span className="tenue">{plusEnPalabras(x.stuff_hh)}</span></div>
        <div className="ficha-delta"><span className="etiqueta">Cambio</span><b className={`num d-${v.k}`}>{sg(x.delta_hh)}</b></div>
      </div>

      <dl className="ficha-datos">
        <div><dt>Stuff+ · cómo sale de la mano</dt><dd className="num">{nf(x.stuff, 1)}</dd></div>
        <div><dt>Location+ · sumando dónde lo pone</dt><dd className="num">{nf(x.location, 1)}</dd></div>
        <div><dt>Pitching+ · sumando arsenal y contexto</dt><dd className="num">{nf(x.pitching, 1)}</dd></div>
        <div><dt>Constancia · cuánto varía entre juegos</dt><dd className="num">± {nf(x.sd_juego, 1)}</dd></div>
        <div><dt>Velocidad media</dt><dd className="num">{nf(x.velo, 1)} mph</dd></div>
        <div><dt>Swings fallidos</dt><dd className="num">{nf(x.whiff * 100, 0)} %</dd></div>
        <div><dt>Rodados (de lo que le pegan)</dt><dd className="num">{nf(x.gb * 100, 0)} %</dd></div>
      </dl>

      {obs && (
        <div className="ficha-obs">
          <span className="etiqueta">Lo que pasó de verdad</span>
          <p>
            Permitió <b className="num">{sg(x.carreras_hh!, 1)}</b> carreras por cada 100 lanzamientos en altura
            ({nf(x.n_hh!)} lanzamientos) y <b className="num">{sg(x.carreras_mar!, 1)}</b> a nivel del mar
            ({nf(x.n_mar!)}). <span className="tenue">Negativo es bueno para el pitcher. Con pocos lanzamientos estos números son ruidosos; el Stuff+ es la medida estable.</span>
          </p>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ la vista */

export function Lanzadores({ j }: { j: Jurado }) {
  const [orden, setOrden] = useState<Orden>('aguantan');
  const [buscar, setBuscar] = useState('');
  const lista = useMemo(() => ordenar(j.pitchers, orden), [j.pitchers, orden]);
  const [sel, setSel] = useState<Pitcher | null>(() => lista[0] ?? null);

  const filtrada = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (q ? lista.filter(x => x.nombre.toLowerCase().includes(q) || x.arsenal.toLowerCase().includes(q)) : lista).slice(0, 25);
  }, [lista, buscar]);

  const masPierde = [...j.pitchers].sort((a, b) => a.delta_hh - b.delta_hh)[0];
  const aguantan = j.pitchers.filter(x => x.delta_hh > -1.2).length;
  const nota = ORDENES.find(o => o.k === orden)!.nota;

  return (
    <section className="vista-sec">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">La pregunta del club · Entregable 1</p>
          <h2>¿Qué lanzadores sufren la altitud y cuáles aguantan?</h2>
          <p className="entrada ancha">
            Para cada uno de los {nf(j.pitchers_n)} lanzadores con suficientes datos, tomamos <b>todos sus
            lanzamientos reales</b> y los recalculamos en los dos aires: a nivel del mar y en el Harp Helú.
            La diferencia dice cuánto de su calidad se queda en el camino al subir a la Ciudad de México.
          </p>
          <div className="cifras-fila">
            <div><b className="num">{nf(j.pitchers_n)}</b><span>lanzadores comparados</span></div>
            <div><b className="num">{nf(aguantan)}</b><span>aguantan la altura (pierden menos de 1.2 puntos)</span></div>
            <div><b className="num">{sg(masPierde.delta_hh)}</b><span>el que más pierde: {masPierde.nombre}</span></div>
          </div>
        </header>

        <div className="lanz-rejilla">
          <div className="tarjeta">
            <h3 className="titulo-tarjeta">El mapa del fichaje</h3>
            <p className="nota-tarjeta">Cada punto es un lanzador. A la derecha, los mejores. Abajo, los que más pierden en casa. Arriba a la derecha está a quién conviene firmar.</p>
            <MapaFichajes p={j.pitchers} sel={sel} onSel={setSel} />
          </div>
          {sel && <Ficha x={sel} />}
        </div>

        <div className="tarjeta tabla-lanz">
          <div className="tabla-cabeza">
            <div className="segmentado" role="tablist" aria-label="Ordenar lanzadores">
              {ORDENES.map(o => (
                <button key={o.k} type="button" role="tab" aria-selected={orden === o.k}
                        className={orden === o.k ? 'activo' : ''}
                        onClick={() => { setOrden(o.k); setSel(ordenar(j.pitchers, o.k)[0] ?? null); }}>{o.t}</button>
              ))}
            </div>
            <label className="buscar">
              <span className="solo-lectores">Buscar lanzador o lanzamiento</span>
              <input id="buscar-lanzador" type="search" placeholder="Buscar: 1099, slider…" value={buscar}
                     onChange={e => setBuscar(e.target.value)} />
            </label>
          </div>
          <p className="nota-tarjeta">{nota} Toca una fila para ver su ficha.</p>
          <div className="tabla-scroll">
            <table className="tabla-datos">
              <thead>
                <tr>
                  <th>#</th><th>Lanzador</th><th>Arsenal</th>
                  <th className="n t-mar">Nivel del mar</th><th className="n t-alt">Harp Helú</th>
                  <th className="n">Cambio</th><th className="n">Location+</th><th className="n">Pitching+</th>
                  <th className="n">Constancia</th><th className="n">Lanzamientos</th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map((x, i) => {
                  const v = veredicto(x.delta_hh);
                  return (
                    <tr key={x.nombre} className={sel?.nombre === x.nombre ? 'activa' : ''} onClick={() => setSel(x)}
                        tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setSel(x); }}>
                      <td className="tenue num">{i + 1}</td>
                      <th scope="row">{x.nombre}<span className="tenue mano"> · {mano(x.mano)}</span></th>
                      <td className="arsenal-celda">{x.arsenal}</td>
                      <td className="num n">{nf(x.stuff_mar, 1)}</td>
                      <td className="num n destacado">{nf(x.stuff_hh, 1)}</td>
                      <td className={`num n d-${v.k}`}>{sg(x.delta_hh)}</td>
                      <td className="num n">{nf(x.location, 1)}</td>
                      <td className="num n">{nf(x.pitching, 1)}</td>
                      <td className="num n">± {nf(x.sd_juego, 1)}</td>
                      <td className="num n tenue">{nf(x.n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="evidencia tarjeta">
          <h3 className="titulo-tarjeta">¿Se confirma en la cancha?</h3>
          <p>
            De los {nf(j.pitchers_n)}, <b>{nf(j.pitchers_con_ambos)}</b> lanzaron al menos 120 veces en cada
            entorno. Para ellos comparamos lo que <b>predice</b> el modelo con lo que <b>pasó</b>: las carreras que
            permitieron en altura contra a nivel del mar. Van en la misma dirección
            {j.corr_modelo_vs_observado != null && <> (correlación de <b className="num">{nf(j.corr_modelo_vs_observado, 2)}</b>)</>}:
            los que el modelo marca como más afectados, efectivamente permitieron más carreras en altura.
            La relación es moderada porque 120 lanzamientos son pocos para medir carreras, que dependen mucho
            de la suerte; por eso la decisión se toma con el Stuff+, que es estable, y lo observado sirve de
            comprobación.
          </p>
        </div>
      </div>
    </section>
  );
}
