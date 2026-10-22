/**
 * RESUMEN: el argumento en una pantalla: tres ideas, sus gráficas y la tabla para decidir.
 * Las explicaciones viven en los íconos "i"; lo que se ve primero son las cifras.
 */
import { useState } from 'react';
import { COLOR_TIPO, nombreTipo } from '../lexico';
import { L, nf, sg } from '../settings';
import { Compresion, type Quintil } from './Compresion';
import { Info } from './Info';
import { LimiteError } from './LimiteError';
import { MapaMigracion, type TipoMigracion } from './MapaMigracion';
import { TablaArsenal } from './TablaArsenal';
import type { Jurado } from '../jurado';

export interface DatosResumen {
  tipos: TipoMigracion[];
  quintiles: Record<string, Record<string, Quintil>>;
  mezcla: Record<string, { top_nivel_mar: number; top_altitud: number; liga: number }>;
  perfil: Record<string, { optimo_nivel_mar: number; optimo_altitud: number; diferencia: number; liga_mediana: number }>;
  physics: Record<string, any>;
}

export function Resumen({ d, j, irA }: { d: DatosResumen; j: Jurado; irA: (v: 'simulador' | 'confianza') => void }) {
  const [activo, setActivo] = useState<string | null>(null);
  const tiposQ = Object.keys(d.quintiles).filter(k => k !== 'TODOS');
  const [tipoQ, setTipoQ] = useState('Four-Seam');

  const por = Object.fromEntries(d.tipos.map(t => [t.tipo, t]));
  const total = d.tipos.reduce((a, t) => a + t.n, 0);
  const promedio = d.tipos.reduce((a, t) => a + t.delta_plus * t.n, 0) / total;
  const rq = d.quintiles['Four-Seam'];
  const qMejor = rq?.q5?.delta ?? -8.4, qPeor = rq?.q1?.delta ?? 1.3;
  const cutter = por.Cutter?.delta_plus ?? -0.9, recta = por['Four-Seam']?.delta_plus ?? -3.3;
  const riesgo = {
    mar: j.riesgo.find(r => r.altitude_category === 'No Altitude'),
    hh: j.riesgo.find(r => r.altitude_category === 'Extreme Altitude'),
  };

  return (
    <>
      <section className="vista-sec">
        <div className="envoltura">
          <header className="cabeza-pregunta">
            <p className="eyebrow">Entregables 1, 2 y 3 · Arsenal, perfil ideal y recomendaciones</p>
            <h2>¿Qué lanzamientos y qué perfil rinden en el Harp Helú?</h2>
            <p className="entrada ancha">
              Calificamos cada lanzamiento de la liga dos veces con el mismo modelo, una con el aire del nivel del
              mar y otra con el del Harp Helú. Como el modelo sólo ve cómo sale la pelota de la mano, la diferencia
              es el efecto del aire y nada más. <b>En promedio, todos los tipos pierden en altura</b> (la liga baja
              {' '}{sg(promedio)}), pero no todos pierden lo mismo.
            </p>
          </header>
          <div className="porque-tipos">
            <article className="tarjeta porque">
              <span className="etiqueta d-mucho">Pierde más</span>
              <h3>La recta ({sg(recta)})</h3>
              <p>Su valor <b>es</b> el movimiento. Parece que sube porque su giro la sostiene contra el aire. Con 20 % menos aire,
                 el giro empuja menos y la pelota hace menos de lo que el bateador espera. Curva, sinker y cambio quedan
                 en medio, alrededor de −2.2.</p>
            </article>
            <article className="tarjeta porque">
              <span className="etiqueta d-aguanta">Aguantan</span>
              <h3>Cutter ({sg(cutter)}), slider y splitter</h3>
              <p>Engañan porque salen de la mano igual que la recta y rompen tarde y poco. El cutter y el slider giran más
                 como "bala" (sobre su eje de avance), y el splitter casi no gira. Ninguno depende mucho de que el aire
                 empuje el giro, así que el aire delgado les quita poco.</p>
            </article>
            <article className="tarjeta porque">
              <span className="etiqueta d-pierde">Lo bueno pierde más</span>
              <h3>Las mejores rectas pierden {sg(qMejor)}</h3>
              <p>Las peores no pierden nada ({sg(qPeor)}). La altitud borra justo lo que hace especial a una recta de
                 élite. No pagues de más por un lanzador cuyo valor sea una recta que se mueve mucho.</p>
            </article>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- MOVIMIENTO + COMPRESIÓN */}
      <section>
        <div className="envoltura rejilla-2">
          <div className="tarjeta">
            <h3 className="titulo-tarjeta">{L('Cómo se mueve cada lanzamiento', 'How each pitch moves')}
              <Info ancho>{L(
                'Cada lanzamiento aparece dos veces. El círculo azul es su movimiento promedio a nivel del mar y el punto rojo es el mismo lanzamiento en el Harp Helú. Todas las flechas apuntan al centro, porque en altitud todo se mueve menos. Se midió dentro del mismo lanzador, así que no influye quién lanza dónde.',
                'Each pitch appears twice: the blue circle is its average movement at sea level and the red dot, the same pitch at Harp Helú. Every arrow points to the center: at altitude everything moves less. Measured within the same pitcher, so who pitches where does not matter.')}</Info>
            </h3>
            <LimiteError nombre={L('El mapa de movimiento', 'The movement map')}>
              <MapaMigracion tipos={d.tipos} activo={activo} onActivo={setActivo} />
            </LimiteError>
          </div>

          <div className="tarjeta">
            <h3 className="titulo-tarjeta">{L('Quién pierde más, según qué tan bueno era', 'Who loses most, by how good it was')}
              <Info ancho>{L(
                'Los lanzamientos de un tipo, partidos en cinco grupos del mismo tamaño según su Stuff+ a nivel del mar. La línea muestra cuánto cambia cada grupo en el Harp Helú.',
                'Pitches of one type, split into five equal groups by their sea-level Stuff+. The line shows how much each group changes at Harp Helú.')}</Info>
            </h3>
            <div className="chips chips-tarjeta">
              {tiposQ.map(t => (
                <button key={t} type="button" className={`chip${tipoQ === t ? ' activo' : ''}`} aria-pressed={tipoQ === t}
                        onClick={() => setTipoQ(t)}>
                  <i style={{ background: COLOR_TIPO[t] }} />{nombreTipo(t)}
                </button>
              ))}
            </div>
            <LimiteError nombre={L('La gráfica de compresión', 'The compression chart')}>
              <Compresion quintiles={d.quintiles[tipoQ] ?? {}} />
            </LimiteError>
            <p className="remate">{L('La altitud no daña al lanzamiento malo. Borra la ventaja del bueno.',
                                     'Altitude does not hurt the bad pitch. It erases the edge of the good one.')}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ ARSENALES + RIESGO */}
      <section>
        <div className="envoltura rejilla-2">
          <div className="tarjeta">
            <h3 className="titulo-tarjeta">Qué arsenal produce el mejor Stuff+ en casa
              <Info ancho>El arsenal son los tipos que un lanzador usa al menos 8 % de las veces, ordenados por uso. Sólo combinaciones con 6 lanzadores o más, para que el promedio no dependa de uno solo.</Info>
            </h3>
            <p className="nota-tarjeta">Promedio de los lanzadores con cada combinación. Los que mezclan sinker y slider pierden menos que los que viven de la recta y la curva.</p>
            <div className="tabla-scroll">
              <table className="tabla-datos compacta">
                <thead><tr><th>Arsenal</th><th className="n">Lanzadores</th><th className="n t-mar">Nivel del mar</th><th className="n t-alt">Harp Helú</th><th className="n">Cambio</th></tr></thead>
                <tbody>
                  {j.arsenales.slice(0, 12).map(a => (
                    <tr key={a.arsenal}>
                      <th scope="row">{a.arsenal}</th>
                      <td className="num n tenue">{a.pitchers}</td>
                      <td className="num n">{nf(a.stuff_mar, 1)}</td>
                      <td className="num n destacado">{nf(a.stuff_hh, 1)}</td>
                      <td className={`num n ${a.delta > -2 ? 'd-aguanta' : a.delta > -2.8 ? 'd-pierde' : 'd-mucho'}`}>{sg(a.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tarjeta">
            <h3 className="titulo-tarjeta">El riesgo extra de jonrón en altura
              <Info ancho>Lo medimos directo en los batazos de la liga, con juegos en estadios de altitud extrema contra estadios a nivel del mar.</Info>
            </h3>
            {riesgo.mar && riesgo.hh && (
              <>
                <div className="riesgo">
                  <div><span className="etiqueta">Distancia de un elevado</span>
                    <p><b className="num t-mar">{nf(riesgo.mar.dist_fb, 0)}</b> → <b className="num t-alt">{nf(riesgo.hh.dist_fb, 0)}</b> pies</p>
                    <span className="tenue">{sg(riesgo.hh.dist_fb - riesgo.mar.dist_fb, 0)} pies</span></div>
                  <div><span className="etiqueta">Elevados que salen del parque</span>
                    <p><b className="num t-mar">{nf(riesgo.mar.hr_fb * 100, 1)}</b> → <b className="num t-alt">{nf(riesgo.hh.hr_fb * 100, 1)}</b> %</p>
                    <span className="tenue">{sg((riesgo.hh.hr_fb / riesgo.mar.hr_fb - 1) * 100, 0)} % más jonrones</span></div>
                  <div><span className="etiqueta">Jonrones por batazo en juego</span>
                    <p><b className="num t-mar">{nf(riesgo.mar.hr * 100, 2)}</b> → <b className="num t-alt">{nf(riesgo.hh.hr * 100, 2)}</b> %</p></div>
                  <div><span className="etiqueta">Batazos que son rodados</span>
                    <p><b className="num t-mar">{nf(riesgo.mar.gb * 100, 1)}</b> → <b className="num t-alt">{nf(riesgo.hh.gb * 100, 1)}</b> %</p></div>
                </div>
                <p className="remate">En casa, el elevado es el enemigo y el rodado el aliado. El aire no ayuda a una pelota que va por el suelo.</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- ÉLITE + PERFIL IDEAL */}
      <section>
        <div className="envoltura rejilla-2">
          <div className="tarjeta">
            <h3 className="titulo-tarjeta">{L('Qué lanzamientos forman la élite', 'Which pitches make up the elite')}
              <Info ancho>{L(
                'De todos los lanzamientos, tomamos el 1 % con mejor Stuff+ en cada aire y vemos de qué tipo son. A nivel del mar la élite es casi toda recta, y en el Harp Helú el slider ocupa su lugar.',
                'Out of every pitch, we take the top 1% by Stuff+ in each kind of air and look at their type. At sea level the elite is mostly four-seamers; at Harp Helú, the slider takes their place.')}</Info>
            </h3>
            <MezclaElite mezcla={d.mezcla} />
          </div>
          <div className="tarjeta">
            <h3 className="titulo-tarjeta">{L('El perfil ideal para el Harp Helú', 'The ideal profile for Harp Helú')}
              <Info ancho>{L(
                'Promedio físico del 1 % de lanzamientos reales mejor calificados en cada aire, sólo lanzadores derechos para que el movimiento lateral no se cancele.',
                'Physical average of the top 1% of real pitches in each kind of air, right-handers only so horizontal movement does not cancel out.')}</Info>
            </h3>
            <PerfilIdeal perfil={d.perfil} />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- TABLA */}
      <section>
        <div className="envoltura">
          <h2 className="titulo-sec">{L('Qué lanzamientos convienen', 'Which pitches to look for')}
            <Info>{L('Toca el nombre de una columna para ordenar.', 'Tap a column name to sort.')}</Info>
          </h2>
          <div className="tarjeta sin-relleno">
            <LimiteError nombre={L('La tabla de lanzamientos', 'The pitch table')}>
              <TablaArsenal tipos={d.tipos} activo={activo} onActivo={setActivo} />
            </LimiteError>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- PERFILAR UN PROSPECTO */}
      <section>
        <div className="envoltura">
          <div className="tarjeta checklist">
            <h3 className="titulo-tarjeta">Cómo perfilar un prospecto o agente libre para los Diablos</h3>
            <ol>
              <li><b>¿Cuánto de su valor es movimiento?</b> Si es de élite a nivel del mar <i>porque</i> su recta o su curva se mueven mucho, esa ventaja no viaja a la Ciudad de México. Revisa su cambio estimado en la pestaña Lanzadores.</li>
              <li><b>¿Su arsenal se apoya en cutter, slider o splitter?</b> Son los que menos pierden. Uno que vive de recta y curva llega devaluado.</li>
              <li><b>¿Induce rodados?</b> En altura los elevados viajan unos 30 pies más, y el rodado es el único batazo que el aire no ayuda.</li>
              <li><b>¿Es constante?</b> Entre dos candidatos parecidos, el que varía menos de un juego a otro es más fácil de planear.</li>
              <li><b>Pruébalo en el simulador.</b> Con su velocidad, giro y movimiento ves su Stuff+ en los dos estadios, lado a lado.</li>
            </ol>
            <p className="enlaces-sec">
              <button type="button" className="enlace" onClick={() => irA('simulador')}>Probar un lanzamiento en el simulador →</button>
              <button type="button" className="enlace" onClick={() => irA('confianza')}>Qué tan confiable es la calificación →</button>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}


function MezclaElite({ mezcla }: { mezcla: DatosResumen['mezcla'] }) {
  const filas = Object.entries(mezcla).filter(([k, v]) => k !== 'Other' && v.liga > 0.001)
    .sort((a, b) => (b[1].top_altitud - b[1].top_nivel_mar) - (a[1].top_altitud - a[1].top_nivel_mar));
  const max = Math.max(...filas.flatMap(([, v]) => [v.top_altitud, v.top_nivel_mar]));
  return (
    <div className="mezcla">
      <div className="mezcla-leyenda">
        <span className="clave"><i className="p-mar" /> {L('Élite a nivel del mar', 'Sea-level elite')}</span>
        <span className="clave"><i className="p-alt" /> {L('Élite en el Harp Helú', 'Harp Helú elite')}</span>
      </div>
      {filas.map(([k, v]) => {
        const d = (v.top_altitud - v.top_nivel_mar) * 100;
        return (
          <div className="mezcla-fila" key={k}>
            <span className="tipo"><i style={{ background: COLOR_TIPO[k] }} />{nombreTipo(k)}</span>
            <div className="mezcla-barras">
              <span className="b mar" style={{ width: `${(v.top_nivel_mar / max) * 100}%` }}><em className="num">{nf(v.top_nivel_mar * 100, 0)}%</em></span>
              <span className="b alt" style={{ width: `${(v.top_altitud / max) * 100}%` }}><em className="num">{nf(v.top_altitud * 100, 0)}%</em></span>
            </div>
            <span className={`num mezcla-d ${d > 0 ? 'gana' : 'pierde'}`}>{d > 0 ? '▲' : '▼'} {nf(Math.abs(d), 0)}</span>
          </div>
        );
      })}
    </div>
  );
}

const PERFIL: { k: string; es: string; en: string; u: string; d: number }[] = [
  { k: 'RelSpeed', es: 'Velocidad', en: 'Velocity', u: 'mph', d: 1 },
  { k: 'InducedVertBreak', es: 'Movimiento vertical', en: 'Vertical movement', u: 'in', d: 1 },
  { k: 'HorzBreak', es: 'Movimiento lateral', en: 'Horizontal movement', u: 'in', d: 1 },
  { k: 'movement_total', es: 'Movimiento total', en: 'Total movement', u: 'in', d: 1 },
  { k: 'spin_efficiency', es: 'Giro que se vuelve movimiento', en: 'Spin turned into movement', u: '%', d: 0 },
  { k: 'SpinRate', es: 'Giro', en: 'Spin rate', u: 'rpm', d: 0 },
  { k: 'Extension', es: 'Extensión', en: 'Extension', u: 'ft', d: 1 },
];

function PerfilIdeal({ perfil }: { perfil: DatosResumen['perfil'] }) {
  const fmt = (k: string, v: number, d: number) => (k === 'spin_efficiency' ? nf(v * 100, 0) : nf(v, d));
  return (
    <table className="perfil">
      <thead>
        <tr><th />
          <th className="n t-mar">{L('Élite nivel del mar', 'Sea-level elite')}</th>
          <th className="n t-alt">{L('Élite Harp Helú', 'Harp Helú elite')}</th>
          <th className="n">{L('Liga', 'League')}</th></tr>
      </thead>
      <tbody>
        {PERFIL.filter(p => perfil[p.k]).map(p => {
          const r = perfil[p.k];
          return (
            <tr key={p.k}>
              <th scope="row">{L(p.es, p.en)}</th>
              <td className="num n">{fmt(p.k, r.optimo_nivel_mar, p.d)}<span className="unidad">{p.u}</span></td>
              <td className="num n destacado">{fmt(p.k, r.optimo_altitud, p.d)}<span className="unidad">{p.u}</span></td>
              <td className="num n tenue">{fmt(p.k, r.liga_mediana, p.d)}<span className="unidad">{p.u}</span></td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr><td colSpan={4}>{L('La élite del Harp Helú se mueve menos y depende menos del giro. No apuesta al efecto del aire.',
                                'The Harp Helú elite moves less and relies less on spin: it does not bet on the air.')}</td></tr>
      </tfoot>
    </table>
  );
}
