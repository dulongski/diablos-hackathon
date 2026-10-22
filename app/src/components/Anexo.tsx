/**
 * ANEXO: aclaraciones para quien no conoce el béisbol. Los términos, los siete tipos de lanzamiento
 * (con su movimiento promedio real en la LMB) y los supuestos del análisis.
 */
import type { Jurado } from '../jurado';
import { COLOR_TIPO_ES } from '../jurado';
import { nf, sg } from '../settings';

const TERMINOS: { t: string; d: string }[] = [
  { t: 'Lanzamiento', d: 'Cada vez que el pitcher le tira la pelota al bateador, desde 18.4 metros. Un partido tiene unos 280. El pitcher gana si el bateador no le pega, le pega débil o la deja pasar y el umpire canta strike.' },
  { t: 'Movimiento o quiebre', d: 'La pelota no viaja derecha. Su giro empuja contra el aire y la desvía unas pulgadas hacia arriba, abajo o a los lados. Se mide contra una pelota imaginaria sin giro. Ese desvío engaña al bateador, y lo produce el aire con el efecto Magnus.' },
  { t: 'Elevación, la recta que sube', d: 'Una recta no sube de verdad. Cae menos de lo que el bateador espera porque su giro hacia atrás la sostiene. Se reporta como quiebre vertical inducido, en pulgadas.' },
  { t: 'Giro en rpm', d: 'Revoluciones por minuto de la pelota. No todo el giro produce movimiento. El giro de bala, alrededor del eje de avance, no la desvía. La parte útil se llama eficiencia de giro.' },
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
  { t: 'Slider', d: 'Un lanzamiento quebrado, más lento que la recta, que se barre hacia el lado contrario del brazo. Gira mucho como bala.', para: 'Mucho de su giro no depende del aire. En altura es la élite.' },
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

/** La forma promedio de un tipo: una flecha desde el centro (sin giro) hacia donde la desvía el aire. */
function MiniMovimiento({ hb, ivb, color }: { hb: number; ivb: number; color: string }) {
  const S = 120, c = S / 2, k = 2.4;   // 1 pulgada = 2.4 px
  const x = c + hb * k, y = c - ivb * k;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mini-mov" aria-hidden>
      <rect x={4} y={4} width={S - 8} height={S - 8} rx={10} className="mini-fondo" />
      <line x1={c} x2={c} y1={10} y2={S - 10} className="rejilla" />
      <line x1={10} x2={S - 10} y1={c} y2={c} className="rejilla" />
      <circle cx={c} cy={c} r={3} className="mini-cero" />
      <line x1={c} y1={c} x2={x} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <circle cx={x} cy={y} r={7} fill={color} />
    </svg>
  );
}

export function Anexo({ j }: { j: Jurado }) {
  const por = Object.fromEntries(j.tipos.map(t => [t.tipo, t]));
  // El dibujo usa sólo derechos (los lanzamientos del mapa): promediar las dos manos cancela el movimiento lateral.
  const forma = (t: string) => {
    const p = j.mapa.filter(x => x.t === t);
    return p.length ? { hb: p.reduce((a, x) => a + x.hb, 0) / p.length, ivb: p.reduce((a, x) => a + x.ivb, 0) / p.length, v: p.reduce((a, x) => a + x.v, 0) / p.length } : null;
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
        <p className="nota-tarjeta">Cada dibujo es el movimiento promedio real del tipo en la LMB, visto desde atrás de un pitcher derecho. El punto gris es una pelota sin giro y el de color es hacia dónde la lleva el aire.</p>
        <div className="tipos-anexo">
          {TIPOS.map(t => {
            const d = por[t.t], f = forma(t.t);
            return (
              <article key={t.t} className="tarjeta tipo-anexo">
                {f && <MiniMovimiento hb={f.hb} ivb={f.ivb} color={COLOR_TIPO_ES[t.t]} />}
                <div>
                  <h4><i style={{ background: COLOR_TIPO_ES[t.t] }} />{t.t}</h4>
                  <p>{t.d}</p>
                  {f && d && <p className="tipo-datos num">{nf(f.v, 1)} mph · vertical {sg(f.ivb, 1)} in · lateral {sg(f.hb, 1)} in · {nf(d.n)} lanz. en la liga</p>}
                  <p className="tipo-alt"><b>En altura.</b> {t.para} <span className={d && d.delta > -2 ? 'd-aguanta' : d && d.delta > -3 ? 'd-pierde' : 'd-mucho'}>{d ? `${sg(d.delta)} Stuff+` : ''}</span></p>
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
