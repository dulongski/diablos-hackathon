import { useEffect, useState } from 'react';
import { AirField } from './components/AirField';
import { Anexo } from './components/Anexo';
import { Barra } from './components/Barra';
import { Confianza } from './components/Confianza';
import { ControlAltitud } from './components/ControlAltitud';
import { Hipotesis } from './components/Hipotesis';
import { Info } from './components/Info';
import { Inicio } from './components/Inicio';
import { Lanzadores } from './components/Lanzadores';
import { LimiteError } from './components/LimiteError';
import { MapaEfectivos } from './components/MapaEfectivos';
import { Metodo } from './components/Metodo';
import { Pestanas, type Vista } from './components/Pestanas';
import { PitchFantasma } from './components/PitchFantasma';
import { Resumen, type DatosResumen } from './components/Resumen';
import { Simulador } from './components/Simulador';
import type { TipoMigracion } from './components/MapaMigracion';
import type { Hipotesis as DatosHipotesis, Jurado } from './jurado';
import { Logos } from './components/Logos';
import type { Model } from './lib/gbm';
import { densityAtAltitude, dragIndexAtAltitude, type PitchInput } from './lib/physics';
import type { Escala, Helpers } from './lib/scoring';

const HARP_HELU = 2240;

/** Recta promedio de la LMB: el lanzamiento que se usa para explicar el efecto del aire. */
const PITCH_INICIAL: PitchInput = {
  relSpeed: 92.5, ivb: 16.5, hb: 8.0, relHeight: 5.9, relSide: 1.6,
  extension: 6.1, spinRate: 2280, plateZ: 2.6, plateX: 0.0,
};

interface Datos {
  model: Model;
  helpers: Helpers;
  escala: Escala;
  arsenal: { tipos: TipoMigracion[] };
  compresion: { quintiles?: DatosResumen['quintiles']; mezcla_top_1pct?: DatosResumen['mezcla']; perfil_ideal?: DatosResumen['perfil'] };
  physics: Record<string, any>;
  models: Record<string, any>;
  jurado: Jurado;
  hipotesis: DatosHipotesis;
}

export function App() {
  const [metros, setMetros] = useState(HARP_HELU);
  const [vista, setVista] = useState<Vista>('inicio');
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dos cantidades distintas: la densidad física es lo que se muestra, el índice de arrastre es
  // lo que entra al integrador. Ver DRAG_EXPONENT en lib/physics.
  const densidad = densityAtAltitude(metros);
  const arrastre = dragIndexAtAltitude(metros, datos?.physics?.altitud_a_indice_arrastre?.exponente);

  useEffect(() => {
    const j = (n: string) => fetch(`./data/${n}.json`).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${n}.json`);
      return r.json();
    });
    Promise.all([j('model_stuff'), j('helpers'), j('scale'), j('arsenal'), j('physics'), j('models'), j('compresion'), j('jurado'), j('hipotesis')])
      .then(([model, helpers, scale, arsenal, physics, models, compresion, jurado, hipotesis]) =>
        setDatos({ model, helpers, escala: scale.stuff, arsenal, physics, models, compresion, jurado, hipotesis }))
      .catch(e => setError(String(e.message ?? e)));
  }, []);

  // La densidad del aire maneja el fondo de la página entera.
  useEffect(() => {
    document.documentElement.style.setProperty('--densidad', densidad.toFixed(3));
  }, [densidad]);

  const irA = (v: Vista) => { setVista(v); window.scrollTo({ top: 0 }); };

  /* El pitch fantasma ya no es el titular: es la explicación de por qué la altitud importa. */
  const porQue = (
    <section className="porque-sec">
      <div className="envoltura hero-rejilla">
        <div className="hero-texto">
          <p className="eyebrow">Por qué importa la altitud</p>
          <h2 className="porque-titulo">El mismo lanzamiento, dos estadios</h2>
          <p className="entrada">
            Las dos pelotas salen de la misma mano, en el mismo instante, con la misma velocidad y el mismo
            giro. La azul vuela en un estadio a nivel del mar y la roja en el Harp Helú. Con menos aire, el
            giro la empuja menos. Llega más baja de lo que el bateador espera, y la diferencia se mide en
            pulgadas.
          </p>
          <ControlAltitud metros={metros} onChange={setMetros} />
        </div>
        <div className="hero-escena">
          <LimiteError nombre="La escena 3D">
            <PitchFantasma pitch={PITCH_INICIAL} arrastre={arrastre} />
          </LimiteError>
        </div>
      </div>
    </section>
  );

  return (
    <>
      <AirField density={densidad} />
      <Barra metros={metros} />
      <Pestanas vista={vista} onVista={setVista} />

      <main className={`vista-${vista}`}>
        {error && (
          <section><div className="envoltura aviso">
            <h3>Faltan los archivos del modelo</h3>
            <p>{error}. Corre <code>python scripts/07_jurado.py</code> desde la raíz del repositorio para generarlos en <code>app/public/data/</code>.</p>
          </div></section>
        )}

        {!datos && !error && (
          <section><div className="envoltura"><p className="entrada">Cargando el modelo…</p></div></section>
        )}

        {datos && vista === 'inicio' && <Inicio j={datos.jurado} irA={irA} porQue={porQue} />}

        {datos && vista === 'lanzadores' && (
          <LimiteError nombre="La tabla de lanzadores"><Lanzadores j={datos.jurado} /></LimiteError>
        )}

        {datos && vista === 'arsenal' && (
          <Resumen irA={irA} j={datos.jurado} d={{
            tipos: datos.arsenal.tipos,
            quintiles: datos.compresion.quintiles ?? {},
            mezcla: datos.compresion.mezcla_top_1pct ?? {},
            perfil: datos.compresion.perfil_ideal ?? {},
            physics: datos.physics,
          }} />
        )}

        {datos && vista === 'simulador' && (
          <section className="vista-sec">
            <div className="envoltura">
              <header className="cabeza-pregunta">
                <p className="eyebrow">Entregable 4 · Dashboard simulador</p>
                <h2>¿Cuánto valdría este lanzamiento aquí y a nivel del mar?
                  <Info ancho>Define un lanzamiento con sus números físicos (velocidad, giro, movimiento, punto de salida) y cuánto varía de tiro a tiro. El modelo lanza miles de copias en los dos aires y muestra dónde caen y cuánto vale cada una. Todo corre en esta página, sin servidor detrás.</Info>
                </h2>
                <p className="entrada ancha">
                  Escribe los números de un lanzamiento (Trackman los da después de cada bullpen) y compara su
                  Stuff+ en el Harp Helú contra un estadio a nivel del mar, lado a lado.
                </p>
                <div className="altitud-compacta">
                  <ControlAltitud metros={metros} onChange={setMetros} />
                </div>
              </header>
              <LimiteError nombre="El simulador">
                <Simulador metros={metros} arrastre={arrastre}
                           model={datos.model} helpers={datos.helpers} escala={datos.escala} />
              </LimiteError>

              <div className="tarjeta bloque-separado">
                <h3 className="titulo-tarjeta">Mapa de movimiento de los lanzamientos más y menos efectivos en el Harp Helú
                  <Info ancho>Cada punto es un lanzamiento real de un derecho, colocado según cuánto se movió hacia los lados y hacia arriba o abajo. Los de color son el 10 % con mejor Stuff+ en el aire del Harp Helú y los grises el 10 % peor. La distancia entre las dos nubes es la forma que conviene pedir en casa.</Info>
                </h3>
                <LimiteError nombre="El mapa de movimiento">
                  <MapaEfectivos puntos={datos.jurado.mapa} />
                </LimiteError>
              </div>
            </div>
          </section>
        )}

        {datos && vista === 'hipotesis' && (
          <LimiteError nombre="Las hipótesis"><Hipotesis h={datos.hipotesis} /></LimiteError>
        )}

        {datos && vista === 'anexo' && <Anexo j={datos.jurado} />}

        {datos && vista === 'confianza' && (
          <>
            <LimiteError nombre="La validación"><Confianza j={datos.jurado} /></LimiteError>
            <Metodo physics={datos.physics} models={datos.models} />
          </>
        )}
      </main>

      <footer>
        <div className="envoltura">
          <div className="pie-fila">
            <Logos />
            <p className="pie">Proyecto para el Hackathon ISAC 2026, reto de los Diablos Rojos del México. Trabajo independiente de los participantes, no es un producto oficial de ISAC ni del club. Usamos los datos de la LMB sólo para esta competencia. Aquí ves resultados, nunca los datos.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
