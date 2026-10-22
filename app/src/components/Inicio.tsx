/**
 * INICIO: para qué sirve esto, en una pantalla, para alguien que nunca ha visto béisbol.
 *
 * El orden es el de una conversación con el director deportivo: qué pregunta respondemos, para
 * quién, cómo leer los números, qué responde cada pestaña (mapeado a los entregables del reto) y
 * las tres respuestas que cambian decisiones. La física (por qué la altitud importa) va después,
 * como explicación, no como titular.
 */
import type { ReactNode } from 'react';
import type { Jurado } from '../jurado';
import { nf, sg } from '../settings';
import type { Vista } from './Pestanas';

const GLOSARIO: { t: string; d: ReactNode }[] = [
  { t: 'Lanzamiento', d: <>Cada vez que el pitcher le tira la pelota al bateador. Un partido tiene unos 280. El pitcher gana si el bateador <b>no le pega</b>, le pega <b>mal</b>, o la deja pasar y es strike.</> },
  { t: 'Movimiento', d: <>La pelota no viaja derecha: su giro la desvía unas pulgadas en el aire. Ese desvío es lo que engaña al bateador, y lo produce el aire.</> },
  { t: 'Stuff+', d: <>Una calificación de qué tan difícil de batear es un lanzamiento <b>sólo por cómo sale de la mano</b>: velocidad, giro y movimiento. <b>100 es el promedio</b> de la liga; 110 es muy bueno; 90, malo.</> },
  { t: 'Location+ y Pitching+', d: <>La misma escala, sumando más contexto. Location+ agrega <b>dónde</b> lo puso. Pitching+ agrega además el resto de su repertorio y el momento del juego.</> },
  { t: 'Arsenal', d: <>Los tipos de lanzamiento que domina un pitcher: la <b>recta</b> (rápida), el <b>slider</b> y la <b>curva</b> (quiebran), el <b>cambio</b> (lento, disfrazado de rápido), el <b>sinker</b> y el <b>cutter</b>.</> },
  { t: 'Altitud', d: <>El estadio de los Diablos está a 2,240 m. Ahí hay <b>20 % menos aire</b>: los lanzamientos se mueven menos y los batazos vuelan más lejos.</> },
];

export function Inicio({ j, irA, porQue }: { j: Jurado; irA: (v: Vista) => void; porQue: ReactNode }) {
  const p = j.pitchers;
  const masPierde = [...p].sort((a, b) => a.delta_hh - b.delta_hh)[0];
  const fichaje = [...p].filter(x => x.delta_hh > -1 && x.sd_juego < 2.5).sort((a, b) => b.stuff_hh - a.stuff_hh)[0];
  const cal = j.calibracion;
  const alto = cal.find(c => c.tramo === '110-120');
  const bajo = cal.find(c => c.tramo === '< 80');
  const mar = j.riesgo.find(r => r.altitude_category === 'No Altitude');
  const hh = j.riesgo.find(r => r.altitude_category === 'Extreme Altitude');
  const mejorArs = j.arsenales[0];
  const tiposOrd = [...j.tipos].sort((a, b) => b.delta - a.delta);

  const PREGUNTAS: { q: string; a: ReactNode; ent: string; v: Vista }[] = [
    {
      q: '¿Qué lanzadores sufren más la altitud y cuáles aguantan?',
      a: <>{nf(j.pitchers_n)} lanzadores comparados. El que más pierde baja <b>{sg(masPierde.delta_hh)}</b> puntos.</>,
      ent: 'La pregunta del club · Entregable 1', v: 'lanzadores',
    },
    {
      q: '¿Qué tan bueno es cada lanzamiento, cada pitcher y cada arsenal?',
      a: <>635,002 lanzamientos calificados con Stuff+, Location+ y Pitching+.</>,
      ent: 'Entregable 1', v: 'lanzadores',
    },
    {
      q: '¿Qué arsenal y qué perfil físico rinden más en el Harp Helú?',
      a: <>Mejor arsenal en casa: <b>{mejorArs.arsenal}</b>. Lo que menos pierde: {tiposOrd[0].tipo.toLowerCase()} y {tiposOrd[1].tipo.toLowerCase()}.</>,
      ent: 'Entregables 1, 2 y 3', v: 'arsenal',
    },
    {
      q: '¿Cuánto riesgo extra de jonrón hay en casa?',
      a: mar && hh ? <>Un elevado viaja <b>{nf(hh.dist_fb - mar.dist_fb, 0)} pies más</b>; sale del parque {nf(hh.hr_fb * 100, 1)} % de las veces contra {nf(mar.hr_fb * 100, 1)} %.</> : null,
      ent: 'Entregable 3', v: 'arsenal',
    },
    {
      q: '¿Cuánto valdría un lanzamiento nuevo aquí y a nivel del mar?',
      a: <>El coach define velocidad, giro y movimiento; el modelo responde con los dos Stuff+ lado a lado.</>,
      ent: 'Entregable 4', v: 'simulador',
    },
    {
      q: '¿Se puede confiar en la calificación?',
      a: alto && bajo ? <>Con pitchers que el modelo nunca vio: Stuff+ de 110-120 permite <b>{sg(alto.carreras_100)}</b> carreras por cada 100 lanzamientos; menos de 80, <b>{sg(bajo.carreras_100)}</b>.</> : null,
      ent: 'Criterios 1 y 2', v: 'confianza',
    },
  ];

  return (
    <>
      <section className="inicio-hero">
        <div className="envoltura">
          <p className="eyebrow">Hackathon ISAC 2026 · Diablos Rojos del México</p>
          <h1 className="inicio-titulo">¿Qué lanzadores le sirven a los Diablos a 2,240 metros?</h1>
          <p className="inicio-lede">
            Calificamos cada lanzamiento de la Liga Mexicana de Béisbol con <b>Stuff+</b> (una
            calificación donde 100 es el promedio de la liga) y calculamos cuánto vale ese mismo
            lanzamiento en el Estadio Alfredo Harp Helú, donde el aire es 20 % más delgado y la
            pelota se mueve menos.
          </p>
          <div className="para-quien">
            <div>
              <span className="etiqueta">Para el pitching coach</span>
              <p>Qué lanzamientos pedir en casa, a qué pitcher abrir de local y qué ajustar en su repertorio.</p>
            </div>
            <div>
              <span className="etiqueta">Para el director deportivo</span>
              <p>A quién firmar: qué lanzadores mantienen su calidad en la altura y cuáles la pierden.</p>
            </div>
            <div>
              <span className="etiqueta">Con qué datos</span>
              <p>635,002 lanzamientos de la LMB, 2024-2026, medidos con Trackman. Nombres anonimizados por la liga.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="inicio-sec">
        <div className="envoltura">
          <h2 className="titulo-sec">Si no sabes béisbol, esto es lo que necesitas</h2>
          <div className="glosario">
            {GLOSARIO.map(g => (
              <article key={g.t} className="glosa">
                <h3>{g.t}</h3>
                <p>{g.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="inicio-sec">
        <div className="envoltura">
          <h2 className="titulo-sec">Qué responde esta herramienta</h2>
          <p className="entrada ancha">Cada pregunta es una pestaña, y cada una corresponde a un entregable o criterio del reto.</p>
          <div className="preguntas">
            {PREGUNTAS.map(x => (
              <button key={x.q} type="button" className="pregunta" onClick={() => irA(x.v)}>
                <span className="pregunta-ent">{x.ent}</span>
                <span className="pregunta-q">{x.q}</span>
                <span className="pregunta-a">{x.a}</span>
                <span className="pregunta-ir">Ver la respuesta →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {fichaje && (
        <section className="inicio-sec">
          <div className="envoltura">
            <h2 className="titulo-sec">Tres respuestas que cambian decisiones</h2>
            <div className="respuestas">
              <article className="respuesta">
                <span className="respuesta-n">Fichajes</span>
                <h3>No pagues de más por movimiento</h3>
                <p>Los lanzadores que más pierden en el Harp Helú dependen de rectas y curvas que se mueven mucho. El que más pierde, <b>{masPierde.nombre}</b> ({masPierde.arsenal.toLowerCase()}), baja de {nf(masPierde.stuff_mar, 1)} a {nf(masPierde.stuff_hh, 1)}.</p>
              </article>
              <article className="respuesta">
                <span className="respuesta-n">El perfil a buscar</span>
                <h3>Cutter, slider y splitter aguantan</h3>
                <p>Engañan por parecerse a la recta al salir de la mano, no por moverse mucho, así que el aire delgado les quita poco. Ejemplo: <b>{fichaje.nombre}</b> ({fichaje.arsenal.toLowerCase()}) vale {nf(fichaje.stuff_mar, 1)} a nivel del mar y {nf(fichaje.stuff_hh, 1)} en casa.</p>
              </article>
              <article className="respuesta">
                <span className="respuesta-n">En casa</span>
                <h3>Buscar rodados, evitar elevados</h3>
                <p>{mar && hh ? <>En altura un elevado viaja {nf(hh.dist_fb - mar.dist_fb, 0)} pies más y sale del parque {nf(hh.hr_fb * 100, 1)} % de las veces ({nf(mar.hr_fb * 100, 1)} % a nivel del mar). El rodado es el único batazo al que el aire no ayuda.</> : null}</p>
              </article>
            </div>
          </div>
        </section>
      )}

      {porQue}
    </>
  );
}
