/**
 * HIPÓTESIS: las cuatro hipótesis del reto, cada una con cómo se probó, el resultado y su veredicto.
 *
 * Toda incertidumbre es bootstrap por lanzador: se remuestrean lanzadores, no lanzamientos, porque
 * los lanzamientos de un mismo brazo no son independientes. Lo produce scripts/08_hipotesis.py.
 */
import type { ReactNode } from 'react';
import type { Hipotesis as H } from '../jurado';
import { COLOR_TIPO_ES } from '../jurado';
import { nf, sg } from '../settings';

type Veredicto = 'si' | 'parcial' | 'no';
const VEREDICTO: Record<Veredicto, string> = { si: 'Se confirma', parcial: 'Se confirma en parte', no: 'No se confirma' };

function Tarjeta({ n, titulo, propone, prueba, veredicto, resumen, children }: {
  n: string; titulo: string; propone: ReactNode; prueba: ReactNode; veredicto: Veredicto; resumen: ReactNode; children: ReactNode;
}) {
  return (
    <article className="tarjeta hip">
      <header className="hip-cabeza">
        <span className="hip-n">{n}</span>
        <div>
          <h3>{titulo}</h3>
          <p className="hip-propone">{propone}</p>
        </div>
        <span className={`sello sello-v-${veredicto}`}>{VEREDICTO[veredicto]}</span>
      </header>
      <div className="hip-cuerpo">
        <div className="hip-figura">{children}</div>
        <div className="hip-texto">
          <p className="hip-resumen">{resumen}</p>
          <p className="hip-prueba"><span className="etiqueta">Cómo lo probamos</span>{prueba}</p>
        </div>
      </div>
    </article>
  );
}

/** Estimación con intervalo, horizontal. Los valores van en la misma escala para todas las filas. */
function Bosque({ filas, min, max, cero = 0, fmt = (v: number) => sg(v), unidad }: {
  filas: { et: string; v: number; ic: [number, number]; color?: string; fuerte?: boolean }[];
  min: number; max: number; cero?: number; fmt?: (v: number) => string; unidad: string;
}) {
  const W = 520, F = 34, PL = 92, PR = 64, H = filas.length * F + 34;
  const sx = (v: number) => PL + ((v - min) / (max - min)) * (W - PL - PR);
  const paso = max - min > 8 ? 2 : 1;
  const ticks: number[] = []; for (let t = Math.ceil(min / paso) * paso; t <= Math.floor(max); t += paso) ticks.push(t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bosque" role="img" aria-label={unidad}>
      {ticks.map(t => <g key={t}>
        <line x1={sx(t)} x2={sx(t)} y1={4} y2={H - 28} className={t === cero ? 'eje-cero' : 'rejilla'} />
        <text x={sx(t)} y={H - 12} textAnchor="middle" className="eje">{sg(t, 0)}</text>
      </g>)}
      {filas.map((f, i) => {
        const y = 18 + i * F;
        return <g key={f.et}>
          <text x={PL - 10} y={y + 5} textAnchor="end" className={`eje-titulo${f.fuerte ? ' fuerte' : ''}`}>{f.et}</text>
          <line x1={sx(f.ic[0])} x2={sx(f.ic[1])} y1={y} y2={y} stroke={f.color ?? 'var(--tinta)'} strokeWidth={3} strokeLinecap="round" />
          <circle cx={sx(f.v)} cy={y} r={f.fuerte ? 7 : 5.5} fill={f.color ?? 'var(--tinta)'} stroke="var(--basalto-alto)" strokeWidth={2} />
          <text x={W - PR + 10} y={y + 5} className="valor-barra">{fmt(f.v)}</text>
        </g>;
      })}
    </svg>
  );
}

function Barras({ filas, max, fmt, color }: { filas: { et: string; v: number; fuerte?: boolean }[]; max: number; fmt: (v: number) => string; color: string }) {
  return (
    <div className="hbarras">
      {filas.map(f => (
        <div key={f.et} className={`hbarra${f.fuerte ? ' fuerte' : ''}`}>
          <span>{f.et}</span>
          <div className="hbarra-pista"><i style={{ width: `${Math.max(1.5, (f.v / max) * 100)}%`, background: color }} /></div>
          <b className="num">{fmt(f.v)}</b>
        </div>
      ))}
    </div>
  );
}

export function Hipotesis({ h }: { h: H }) {
  const { h1, h2, h3, h4 } = h;
  const nat = h1.nathan;
  const cam = h2.pares.find(p => p.tipo === 'Cambio')!;
  const rankCam = h2.pares.findIndex(p => p.tipo === 'Cambio') + 1;
  const giro = h4.importancia.find(i => i.grupo.startsWith('Giro (rpm)'))!;
  const movi = h4.importancia.find(i => i.grupo.startsWith('Movimiento'))!;
  const { A, B } = h4.experimento.parejas;
  const t3 = h3.terciles;

  return (
    <section className="vista-sec">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Hipótesis del reto · H1 a H4</p>
          <h2>Lo que el reto propone, puesto a prueba</h2>
          <p className="entrada ancha">
            El reto plantea cuatro hipótesis. Cada una se prueba aquí con los datos de la LMB y con un intervalo
            de confianza del 95 %, el rango donde está el valor real con alta probabilidad. Si el intervalo no
            cruza el cero, el efecto no es casualidad.
          </p>
          <div className="cifras-fila cuatro">
            <div><b className="num d-aguanta">H1</b><span>Se confirma</span></div>
            <div><b className="num d-pierde">H2</b><span>Se confirma en parte</span></div>
            <div><b className="num d-pierde">H3</b><span>Se confirma en parte</span></div>
            <div><b className="num d-aguanta">H4</b><span>Se confirma</span></div>
          </div>
        </header>

        <div className="hips">
          <Tarjeta n="H1" titulo="El aire delgado le quita movimiento al lanzamiento" veredicto="si"
            propone={<>Alan Nathan estima que en Coors Field (1,609 m) un lanzamiento con 18 pulgadas de quiebre se mueve sólo 14 a 15. En el Harp Helú (2,240 m) el efecto debería ser mayor.</>}
            resumen={<>Nuestro modelo físico, calibrado sólo con datos de la LMB, reproduce a Nathan. 18 pulgadas se vuelven <b>{nf(nat.recta.coors, 1)} en Coors</b> y <b>{nf(nat.recta.hh, 1)} en el Harp Helú</b>. Una regla simple (escalar por la densidad del aire) daría {nf(nat.recta.solo_densidad_coors, 1)} y se queda corta. Los siete tipos de lanzamiento pierden Stuff+, y en todos el intervalo queda bajo cero.</>}
            prueba={<>Volamos la misma pelota en dos aires con el simulador, y medimos cuánto cambia el Stuff+ de cada tipo con {nf(h1.por_tipo.reduce((a, t) => a + t.pitchers, 0))} combinaciones lanzador por tipo, remuestreando lanzadores 2,000 veces.</>}>
            <p className="fig-titulo">Stuff+ que pierde cada tipo en el Harp Helú (95 %)</p>
            <Bosque unidad="Cambio de Stuff+ por tipo" min={Math.floor(Math.min(...h1.por_tipo.map(t => t.ic[0])) - 0.5)} max={0} cero={0}
              filas={h1.por_tipo.map(t => ({ et: t.tipo, v: t.delta, ic: t.ic, color: COLOR_TIPO_ES[t.tipo] }))} />
          </Tarjeta>

          <Tarjeta n="H2" titulo="El cambio de velocidad gana valor relativo" veredicto="parcial"
            propone={<>El cambio engaña por ser más lento que la recta, no por moverse. Si depende menos del aire, debería perder menos que la recta del mismo lanzador.</>}
            resumen={<>Sí gana contra la recta, con <b>{sg(cam.ventaja_vs_recta, 2)} puntos</b> de ventaja ({sg(cam.ic[0], 2)} a {sg(cam.ic[1], 2)}), y en el {nf(cam.pct_pitchers_gana * 100, 0)} % de los {nf(cam.pitchers)} lanzadores que tiran los dos. Pero queda en el lugar {rankCam} de 6, detrás del splitter, el cutter y el slider. El cambio sí tiene mucho movimiento lateral, y ese movimiento también lo paga.</>}
            prueba={<>Comparamos dentro del mismo lanzador su cambio contra su propia recta. Así se cancela todo lo que es del brazo (velocidad, mecánica, calidad) y queda sólo el efecto del aire sobre cada forma.</>}>
            <p className="fig-titulo">Ventaja contra la recta del mismo lanzador (95 %)</p>
            <Bosque unidad="Ventaja contra la recta" min={0} max={Math.ceil(Math.max(...h2.pares.map(p => p.ic[1])) + 0.5)} cero={0}
              filas={h2.pares.map(p => ({ et: p.tipo, v: p.ventaja_vs_recta, ic: p.ic, color: COLOR_TIPO_ES[p.tipo], fuerte: p.tipo === 'Cambio' }))} />
          </Tarjeta>

          <Tarjeta n="H3" titulo="Los lanzadores de rodados valen más en altura" veredicto="parcial"
            propone={<>En altura los elevados se vuelven jonrones más seguido. Un lanzador que provoca rodados (pelotas por el suelo) debería prevenir más carreras ahí que a nivel del mar.</>}
            resumen={<>En altura, cada 10 puntos más de rodados previenen <b>{nf(Math.abs(h3.pendiente_alt), 2)} carreras</b> por cada 100 lanzamientos (intervalo {sg(h3.ic_alt[0], 2)} a {sg(h3.ic_alt[1], 2)}, no cruza el cero). A nivel del mar el efecto es menor ({sg(h3.pendiente_mar, 2)}) y sí cruza el cero. La diferencia va en la dirección esperada, con 90 % de confianza pero no con 95 % (p = {nf(h3.p_una_cola, 2)}).</>}
            prueba={<>{nf(h3.pitchers)} lanzadores que tiraron al menos 120 veces en cada entorno. Comparamos cuántas carreras permiten según su tasa de rodados, en altura y a nivel del mar, con el mismo grupo de lanzadores.</>}>
            <p className="fig-titulo">Carreras extra por cada 100 lanzamientos al pasar a la altura</p>
            <Barras color="var(--diablo)" max={Math.max(...t3.map(t => t.castigo)) * 1.05} fmt={v => `+${nf(v, 2)}`}
              filas={t3.map(t => ({ et: `${t.grupo} (${nf(t.gb * 100, 0)} %)`, v: t.castigo }))} />
            <p className="nota-pie tenue">Cuantos más rodados, menor el castigo de la altura, {sg(t3[0].castigo, 2)} contra {sg(t3[2].castigo, 2)}.</p>
          </Tarjeta>

          <Tarjeta n="H4" titulo="Importa cuánto se mueve, no cuánto gira" veredicto="si"
            propone={<>Un giro alto no sirve si no se convierte en movimiento. En altura, el mismo giro produce menos movimiento, así que mirar sólo las revoluciones engaña.</>}
            resumen={<>En el modelo, el giro pesa <b>{nf(giro.peso * 100, 0)} %</b> y el movimiento <b>{nf(movi.peso * 100, 0)} %</b> (el giro es la variable {h4.rango_spinrate} de {h4.n_features}). En el experimento, 100 revoluciones más con el mismo movimiento cambian <b>{sg(h4.experimento.stuff_por_100rpm, 2)}</b> puntos. Una pulgada más de movimiento con el mismo giro, <b>{sg(h4.experimento.stuff_por_pulgada, 2)}</b>. Y la recta que vive del movimiento (B) le saca <b>{nf(B.mar - A.mar, 1)} puntos</b> a la que vive del giro (A) a nivel del mar, pero sólo {nf(B.hh - A.hh, 1)} en casa. El aire se lleva justo esa ventaja.</>}
            prueba={<>Medimos el peso de cada variable dentro del modelo de árboles. Después corrimos un experimento con el simulador, moviendo una sola perilla y dejando todo lo demás fijo, algo que los datos de la cancha no permiten.</>}>
            <p className="fig-titulo">Peso de cada grupo de variables en Stuff+</p>
            <Barras color="var(--nivel-mar)" max={Math.max(...h4.importancia.map(i => i.peso))} fmt={v => `${nf(v * 100, 0)} %`}
              filas={h4.importancia.filter(i => i.peso > 0.01).map(i => ({ et: i.grupo, v: i.peso, fuerte: i.grupo.startsWith('Giro (rpm)') || i.grupo.startsWith('Movimiento') }))} />
            <div className="tabla-scroll pareja"><table className="tabla-datos compacta">
              <thead><tr><th>Dos rectas</th><th className="n">Giro</th><th className="n">Elevación</th><th className="n t-mar">Mar</th><th className="n t-alt">Harp Helú</th></tr></thead>
              <tbody>
                <tr><th scope="row">A · gira mucho, pero poco de ese giro la mueve</th><td className="num n">{nf(A.rpm)}</td><td className="num n">{nf(A.ivb, 1)} in</td><td className="num n">{nf(A.mar, 1)}</td><td className="num n destacado">{nf(A.hh, 1)}</td></tr>
                <tr><th scope="row">B · gira menos, todo es movimiento</th><td className="num n">{nf(B.rpm)}</td><td className="num n">{nf(B.ivb, 1)} in</td><td className="num n">{nf(B.mar, 1)}</td><td className="num n destacado">{nf(B.hh, 1)}</td></tr>
              </tbody>
            </table></div>
          </Tarjeta>
        </div>

      </div>
    </section>
  );
}
