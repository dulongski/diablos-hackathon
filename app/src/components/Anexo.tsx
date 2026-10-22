/**
 * ANEXO: aclaraciones para quien no conoce el béisbol. Los términos, los siete tipos de lanzamiento
 * (con su movimiento promedio real en la LMB) y los supuestos del análisis.
 */
import { useMemo } from 'react';
import type { Jurado } from '../jurado';
import { releaseAt, solveRelease, type PitchInput } from '../lib/physics';
import { COLOR_TIPO_ES } from '../jurado';
import { veredicto } from '../lexico';
import { nf, sg } from '../settings';

const TERMINOS: { t: string; d: string }[] = [
  { t: 'Lanzamiento', d: 'Cada vez que el pitcher le tira la pelota al bateador, desde 18.4 metros. Un partido tiene unos 280. El pitcher gana si el bateador no le pega, le pega débil o la deja pasar y el umpire canta strike.' },
  { t: 'Movimiento o quiebre', d: 'La pelota no viaja derecha. Su giro empuja contra el aire y la desvía unas pulgadas hacia arriba, abajo o a los lados. Se mide contra una pelota imaginaria sin giro. Ese desvío engaña al bateador, y lo produce el aire con el efecto Magnus.' },
  { t: 'Elevación, la recta que sube', d: 'Una recta no sube de verdad. Cae menos de lo que el bateador espera porque su giro hacia atrás la sostiene. Se reporta como quiebre vertical inducido, en pulgadas.' },
  { t: 'Giro en rpm', d: 'Revoluciones por minuto de la pelota. No todo el giro mueve la pelota. Si gira como una bala, sobre la línea por donde avanza, no se desvía. La parte del giro que sí la desvía se llama eficiencia de giro.' },
  { t: 'Stuff+', d: 'Califica qué tan difícil de batear es un lanzamiento sólo por cómo sale de la mano, con su velocidad, giro, movimiento y punto de salida. 100 es el promedio de la liga y cada 10 puntos son una desviación estándar. 110 es muy bueno y 90 es malo.' },
  { t: 'Location+ y Pitching+', d: 'La misma escala con más contexto. Location+ suma dónde llegó la pelota y en qué conteo. Pitching+ suma además el resto del repertorio y el lanzamiento anterior.' },
  { t: 'Conteo', d: 'Bolas y strikes del turno, por ejemplo 2 y 1. El mismo lanzamiento vale distinto según el conteo. Por eso medimos el valor de cada lanzamiento en carreras sobre los 12 conteos posibles.' },
  { t: 'Rodado y elevado', d: 'Un rodado va por el suelo y casi nunca es jonrón. Un elevado va por el aire, y en altura viaja más lejos y sale del parque más seguido.' },
  { t: 'Arsenal', d: 'Los tipos de lanzamiento que domina un pitcher, ordenados por cuánto los usa. Aquí cuentan los que usa al menos 8 % de las veces.' },
  { t: 'Trackman', d: 'El radar que mide cada lanzamiento de la LMB. Registra velocidad, giro, movimiento, punto de salida y la trayectoria completa.' },
];

const TIPOS: { t: string; d: string; para: string }[] = [
  { t: 'Recta', d: 'La más rápida y la más usada. Gira hacia atrás y parece que sube, porque cae menos de lo que espera el bateador.', para: 'Su arma es la elevación, justo lo que el aire delgado le quita.' },
  { t: 'Sinker', d: 'Una recta que se hunde y se va hacia el lado del brazo del pitcher. Busca que le peguen por el suelo.', para: 'Pierde movimiento como la recta, pero provoca rodados.' },
  { t: 'Cutter', d: 'Una recta que corta tarde hacia el lado contrario del brazo. Casi no se mueve y engaña porque sale igual que la recta.', para: 'Depende poco del aire y es el que menos pierde.' },
  { t: 'Slider', d: 'Un lanzamiento quebrado, más lento que la recta, que se barre hacia el lado contrario del brazo. Gira rápido, pero buena parte de ese giro es como el de una bala, que no la desvía.', para: 'Como buena parte de su giro no la desvía, el aire delgado le quita poco. Es de los que mejor aguantan.' },
  { t: 'Curva', d: 'La más lenta de las quebradas. Gira hacia adelante y cae mucho más de lo esperado.', para: 'Su caída sí viene del aire, y en altura cae menos.' },
  { t: 'Cambio', d: 'Sale con el mismo movimiento de brazo que la recta pero 8 a 10 mph más lento. Engaña por la diferencia de velocidad.', para: 'Gana valor contra la recta, pero su movimiento lateral también lo paga.' },
  { t: 'Splitter', d: 'Se toma con los dedos abiertos. Casi no gira y cae al final. Es primo del cambio.', para: 'Con tan poco giro, al aire delgado no le queda mucho que quitarle.' },
];

const SUPUESTOS: string[] = [
  'El conjunto no dice en qué estadio se lanzó, sólo trae tres categorías de altitud. Sacamos la densidad del aire del frenado que Trackman mide en cada lanzamiento.',
  'Stuff+ sólo ve la forma del lanzamiento. Para saber qué vale en otro estadio, transferimos la forma a otro aire y la volvemos a calificar. La diferencia es el aire y nada más.',
  'Medimos el valor de un lanzamiento en carreras sobre los 12 conteos posibles, porque el conjunto no trae corredores en base.',
  'La liga anonimizó a los lanzadores, así que aparecen como "Lanzador 1099".',
  'Mostramos el movimiento lateral de lanzadores derechos. En un zurdo es el espejo.',
  'Usamos los datos de la LMB sólo para esta competencia. Aquí ves resultados, nunca los datos.',
];

/**
 * El vuelo de la pelota, de la mano al plato, calculado con el mismo simulador de vuelo del dashboard. Arriba se ve
 * de lado (qué tan alto va) y abajo desde arriba (hacia qué lado se va). La línea de color es el lanzamiento real y la
 * gris punteada es la misma pelota sin giro. La distancia entre las dos al llegar al plato es el movimiento.
 */
function Vuelo({ v, hb, ivb, color }: { v: number; hb: number; ivb: number; color: string }) {
  const r = useMemo(() => {
    const input: PitchInput = { relSpeed: v, ivb, hb, relHeight: 5.9, relSide: 1.6, extension: 6.1, spinRate: 2200, plateZ: 2.5, plateX: 0 };
    const tr = releaseAt(solveRelease(input), 1.0);
    const real = tr.points;
    // La pelota sin giro, como la define Trackman: el desvío del giro crece con el cuadrado del tiempo de vuelo, así
    // que se le resta al vuelo real en esa proporción. Al llegar al plato, la distancia entre las dos es el movimiento.
    const n = real.length - 1;
    const sinGiro = real.map((p, i): [number, number, number] => {
      const f = (i / n) ** 2;
      return [p[0] - (tr.shape.hb / 12) * f, p[1] - (tr.shape.ivb / 12) * f, p[2]];
    });
    return { real, sinGiro, ivb: tr.shape.ivb, hb: tr.shape.hb };
  }, [v, hb, ivb]);
  const W = 320, IZQ = 40, DER = 262;
  const z0 = r.real[0][2], z1 = r.real[r.real.length - 1][2];
  const X = (z: number) => IZQ + ((z - z0) / (z1 - z0)) * (DER - IZQ);
  // De lado: alto de 0 a 7.5 pies. Desde arriba: lateral de −3 a 3 pies, el lado del brazo hacia arriba.
  const L = { y0: 18, h: 76 }, A = { y0: 120, h: 44 };
  const yLado = (alto: number) => L.y0 + L.h - (alto / 7.5) * L.h;
  const yArriba = (lat: number) => A.y0 + A.h / 2 - (lat / 3) * (A.h / 2);
  const linea = (pts: [number, number, number][], y: (p: [number, number, number]) => number) =>
    pts.map(p => `${X(p[2]).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const fin = r.real[r.real.length - 1], finS = r.sinGiro[r.sinGiro.length - 1];
  const gapV = r.ivb, gapH = r.hb;
  return (
    <svg viewBox={`0 0 ${W} 178`} className="vuelo" role="img" aria-label="Trayectoria de la pelota de lado y desde arriba">
      <rect x={0} y={0} width={W} height={178} rx={10} className="mini-fondo" />
      <text x={IZQ} y={12} className="vuelo-t">De lado</text>
      <line x1={IZQ} x2={DER} y1={yLado(0)} y2={yLado(0)} className="vuelo-piso" />
      <rect x={DER - 2} y={yLado(3.5)} width={4} height={yLado(1.5) - yLado(3.5)} className="vuelo-zona" />
      <polyline points={linea(r.sinGiro, p => yLado(p[1]))} className="vuelo-sin" />
      <polyline points={linea(r.real, p => yLado(p[1]))} stroke={color} className="vuelo-real" />
      <circle cx={X(fin[2])} cy={yLado(fin[1])} r={4.5} fill={color} />
      <text x={DER + 6} y={(yLado(fin[1]) + yLado(finS[1])) / 2 + 3} className="vuelo-n">{sg(gapV, 1)} in</text>
      <text x={IZQ} y={A.y0 - 6} className="vuelo-t">Desde arriba</text>
      <line x1={IZQ} x2={DER} y1={yArriba(0)} y2={yArriba(0)} className="vuelo-piso tenue" />
      <polyline points={linea(r.sinGiro, p => yArriba(p[0]))} className="vuelo-sin" />
      <polyline points={linea(r.real, p => yArriba(p[0]))} stroke={color} className="vuelo-real" />
      <circle cx={X(fin[2])} cy={yArriba(fin[0])} r={4.5} fill={color} />
      <text x={DER + 6} y={(yArriba(fin[0]) + yArriba(finS[0])) / 2 + 3} className="vuelo-n">{sg(gapH, 1)} in</text>
      <text x={IZQ - 4} y={yArriba(2.2) + 3} className="vuelo-eje" textAnchor="end">brazo</text>
      <text x={IZQ - 4} y={yArriba(-2.2) + 3} className="vuelo-eje" textAnchor="end">guante</text>
      <text x={IZQ} y={174} className="vuelo-eje">mano</text>
      <text x={DER} y={174} className="vuelo-eje" textAnchor="end">plato, a 17 m</text>
    </svg>
  );
}

export function Anexo({ j }: { j: Jurado }) {
  const por = Object.fromEntries(j.tipos.map(t => [t.tipo, t]));
  // El dibujo usa sólo derechos (los lanzamientos del mapa): promediar las dos manos cancela el movimiento lateral.
  const forma = (t: string) => {
    const p = j.mapa.filter(x => x.t === t);
    const n = p.reduce((a, x) => a + (x.n ?? 1), 0);
    const m = (k: 'hb' | 'ivb' | 'v') => p.reduce((a, x) => a + x[k] * (x.n ?? 1), 0) / n;
    return p.length ? { hb: m('hb'), ivb: m('ivb'), v: m('v') } : null;
  };
  return (
    <section className="vista-sec">
      <div className="envoltura">
        <header className="cabeza-pregunta">
          <p className="eyebrow">Anexo · Aclaraciones</p>
          <h2>Lo necesario para leer todo lo demás</h2>
          <p className="entrada ancha">
            Los términos de béisbol que aparecen en la herramienta, los siete tipos de lanzamiento y los
            supuestos del análisis. Si nunca has visto un partido, empieza aquí.
          </p>
        </header>

        <h3 className="titulo-sec sub">Los siete tipos de lanzamiento</h3>
        <p className="nota-tarjeta">Cada dibujo es el vuelo de un lanzamiento promedio de la LMB, de un pitcher derecho, desde que sale de la mano hasta que llega al plato. Arriba lo ves de lado y abajo desde arriba. La línea de color es el lanzamiento real. La gris punteada es la misma pelota lanzada sin giro, la referencia contra la que Trackman mide el movimiento. El número al final es cuántas pulgadas la movió el giro al llegar, hacia arriba o abajo y hacia el lado del brazo o del guante.</p>
        <div className="tipos-anexo">
          {TIPOS.map(t => {
            const d = por[t.t], f = forma(t.t);
            return (
              <article key={t.t} className="tarjeta tipo-anexo">
                {f && <Vuelo v={f.v} hb={f.hb} ivb={f.ivb} color={COLOR_TIPO_ES[t.t]} />}
                <div>
                  <h4><i style={{ background: COLOR_TIPO_ES[t.t] }} />{t.t}</h4>
                  <p>{t.d}</p>
                  {f && d && <p className="tipo-datos num">{nf(f.v, 1)} mph · vertical {sg(f.ivb, 1)} in · lateral {sg(f.hb, 1)} in · {nf(d.n)} lanz. en la liga</p>}
                  <p className="tipo-alt"><b>En altura.</b> {t.para} <span className={d ? `d-${veredicto(d.delta).k}` : ''}>{d ? `${sg(d.delta)} Stuff+` : ''}</span></p>
                </div>
              </article>
            );
          })}
        </div>

        <h3 className="titulo-sec sub">Términos</h3>
        <dl className="terminos">
          {TERMINOS.map(t => <div key={t.t}><dt>{t.t}</dt><dd>{t.d}</dd></div>)}
        </dl>

        <h3 className="titulo-sec sub">Supuestos y aclaraciones</h3>
        <ol className="supuestos">
          {SUPUESTOS.map(s => <li key={s}>{s}</li>)}
        </ol>
      </div>
    </section>
  );
}
