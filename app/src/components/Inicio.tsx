/**
 * INICIO: para qué sirve esto, en una pantalla, para alguien que nunca ha visto béisbol.
 *
 * El orden es el de una conversación con el director deportivo: qué pregunta respondemos, para
 * quién, cómo leer los números, qué responde cada pestaña (mapeado a los entregables del reto) y
 * las tres respuestas que cambian decisiones. La física (por qué la altitud importa) va después,
 * como explicación, no como titular.
 */
import type { ReactNode } from 'react';
import type { Causal, Jurado } from '../jurado';
import { nf, sg } from '../settings';
import { Logos } from './Logos';
import type { Vista } from './Pestanas';

export function Inicio({ j, c, irA, porQue }: { j: Jurado; c: Causal; irA: (v: Vista) => void; porQue: ReactNode }) {
  const p = j.pitchers;
  const masPierde = [...p].sort((a, b) => a.delta_hh - b.delta_hh)[0];
  const fichaje = [...p].filter(x => x.delta_hh > -1 && x.sd_juego < 2.5).sort((a, b) => b.stuff_hh - a.stuff_hh)[0];
  const cal = j.calibracion;
  const alto = cal.find(c => c.tramo === '110-120');
  const bajo = cal.find(c => c.tramo === '< 80');
  const mar = j.riesgo.find(r => r.altitude_category === 'No Altitude');
  const hh = j.riesgo.find(r => r.altitude_category === 'Extreme Altitude');
  const mejorArs = j.arsenales[0];
  const aguantan = p.filter(x => x.delta_hh > -1.2).length;
  const promedioLiga = j.tipos.reduce((a, t) => a + t.delta * t.n, 0) / j.tipos.reduce((a, t) => a + t.n, 0);
  const tiposOrd = [...j.tipos].sort((a, b) => b.delta - a.delta);

  const PREGUNTAS: { q: string; a: ReactNode; ent: string; v: Vista }[] = [
    {
      q: '¿Qué lanzadores sufren más la altitud y cuáles aguantan?',
      a: <>{nf(j.pitchers_n)} lanzadores con Stuff+, Location+ y Pitching+ en los dos aires. El que más pierde baja <b>{sg(masPierde.delta_hh)}</b> puntos.</>,
      ent: 'La pregunta del club · Entregable 1', v: 'lanzadores',
    },
    {
      q: '¿Qué arsenal y qué perfil físico rinden más en el Harp Helú?',
      a: <>El mejor arsenal en casa es <b>{mejorArs.arsenal}</b>. Los que menos pierden son el {tiposOrd[0].tipo.toLowerCase()} y el {tiposOrd[1].tipo.toLowerCase()}.</>,
      ent: 'Entregables 1, 2 y 3', v: 'arsenal',
    },
    {
      q: '¿Cuánto valdría un lanzamiento nuevo aquí y a nivel del mar?',
      a: <>Tú defines velocidad, giro y movimiento, y el modelo te da los dos Stuff+ lado a lado.</>,
      ent: 'Entregable 4', v: 'simulador',
    },
    {
      q: '¿Se cumplen las hipótesis que plantea el reto?',
      a: <>H1 y H4 se confirman, y H2 y H3 en parte. Cada una con su intervalo de confianza.</>,
      ent: 'Hipótesis H1 a H4', v: 'hipotesis',
    },
    {
      q: '¿Qué hubiera pasado con otra decisión?',
      a: <>Un Causal Forest mide en carreras reales el costo de la altura, <b>{sg(c.ate, 2)}</b> por cada 100 lanzamientos, y qué lanzamiento conviene en cada conteo.</>,
      ent: 'Modelo secundario · Causal Forest', v: 'causal',
    },
    {
      q: '¿Se puede confiar en la calificación?',
      a: alto && bajo ? <>Con lanzadores que el modelo nunca vio, un Stuff+ de 110 a 120 le quita <b>{nf(-alto.carreras_100, 1)}</b> carreras al rival por cada 100 lanzamientos, y uno menor a 80 le regala <b>{nf(bajo.carreras_100, 1)}</b>.</> : null,
      ent: 'Criterios 1 y 2', v: 'confianza',
    },
  ];

  return (
    <>
      <section className="inicio-hero">
        <div className="envoltura">
          <div className="inicio-marca"><Logos /><p className="eyebrow">Hackathon ISAC 2026 · Reto Diablos Rojos del México</p></div>
          <h1 className="inicio-titulo">¿Qué lanzadores le sirven a los Diablos a 2,240 metros?</h1>
          <p className="inicio-lede">
            Calificamos cada lanzamiento de la Liga Mexicana de Béisbol con <b>Stuff+</b> (una
            calificación donde 100 es el promedio de la liga) y calculamos cuánto vale ese mismo
            lanzamiento en el Estadio Alfredo Harp Helú, donde el aire es 20 % más delgado y la
            pelota se mueve menos.
          </p>
          <div className="respuesta-corta">
            <p className="rc-frase"><span className="etiqueta">La respuesta corta</span>
              La altitud no daña al lanzamiento malo, <b>borra la ventaja del bueno</b>. En casa conviene el lanzador que
              engaña sin depender del movimiento, con cutter, slider y splitter, y que provoca rodados.</p>
            <div className="rc-cifras">
              <div><b className="num d-mucho">{sg(promedioLiga, 1)}</b><span>puntos de Stuff+ pierde el lanzamiento promedio en el Harp Helú</span></div>
              <div><b className="num d-aguanta">{nf(aguantan)} de {nf(j.pitchers_n)}</b><span>lanzadores aguantan la altura, pierden menos de 1.2 puntos</span></div>
              <div><b className="num d-mucho">{sg(c.ate, 2)}</b><span>carreras más por cada 100 lanzamientos, medido en el marcador</span></div>
            </div>
          </div>
          <p className="inicio-anexo">Si tienes cinco minutos, recorre <button type="button" className="enlace" onClick={() => irA('lanzadores')}>Lanzadores</button>, <button type="button" className="enlace" onClick={() => irA('simulador')}>Simulador</button> y <button type="button" className="enlace" onClick={() => irA('metodologia')}>Metodología</button>.
            ¿Nuevo en el béisbol? <button type="button" className="enlace" onClick={() => irA('anexo')}>Los términos y los siete tipos de lanzamiento, en el anexo →</button></p>
          <div className="para-quien">
            <div>
              <span className="etiqueta">Para el pitching coach</span>
              <p>Qué lanzamientos pedir en casa, a qué pitcher abrir de local y qué ajustar en su repertorio.</p>
            </div>
            <div>
              <span className="etiqueta">Para el director deportivo</span>
              <p>A quién firmar. Qué lanzadores mantienen su calidad en la altura y cuáles la pierden.</p>
            </div>
            <div>
              <span className="etiqueta">Con qué datos</span>
              <p>635,002 lanzamientos de la LMB, de 2024 a 2026, medidos con Trackman. La liga anonimizó los nombres.</p>
            </div>
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
                <p>Los lanzadores que más pierden en el Harp Helú dependen de lanzamientos que se mueven mucho. El que más pierde, <b>{masPierde.nombre}</b> ({masPierde.arsenal.toLowerCase()}), baja de {nf(masPierde.stuff_mar, 1)} a {nf(masPierde.stuff_hh, 1)}.</p>
              </article>
              <article className="respuesta">
                <span className="respuesta-n">El perfil a buscar</span>
                <h3>Cutter, slider y splitter aguantan</h3>
                <p>Engañan por parecerse a la recta al salir de la mano, no por moverse mucho, así que el aire delgado les quita poco. Por ejemplo, <b>{fichaje.nombre}</b> ({fichaje.arsenal.toLowerCase()}) vale {nf(fichaje.stuff_mar, 1)} a nivel del mar y {nf(fichaje.stuff_hh, 1)} en casa.</p>
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
