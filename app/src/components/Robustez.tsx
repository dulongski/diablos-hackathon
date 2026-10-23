/**
 * PRUEBAS DE ROBUSTEZ: las preguntas que un jurado técnico le haría al modelo, cada una con su prueba. Sale de
 * scripts/11_robustez.py, que corre donde están los datos de la LMB. Si robustez.json no existe, no se muestra.
 */
import { sinError, type Robustez as DatosRobustez } from '../jurado';
import { nf, sg } from '../settings';

type IC = [number | null, number | null];
const rango = (i: IC, d = 2, signo = true) =>
  i[0] == null || i[1] == null ? 'sin intervalo' : `${signo ? sg(i[0], d) : nf(i[0], d)} a ${signo ? sg(i[1], d) : nf(i[1], d)}`;
const CAPA = { stuff: 'Stuff+', location: 'Location+', pitching: 'Pitching+' } as const;

const MEJORAS: [string, string][] = [['actual', 'La que usamos'], ['xrv', 'Batazo por calidad de contacto'],
  ['arsenal', 'Arsenal contra la recta dentro de Stuff+'], ['xrv_arsenal', 'Contacto y arsenal'],
  ['frenado_relativo', 'Frenado relativo al aire del juego'], ['brazo', 'Movimiento en dirección del brazo'],
  ['desfase_eje', 'Desfase del eje de giro'], ['consistencia_salida', 'Consistencia del punto de salida'],
  ['todas', 'Las cuatro de física juntas']];

export function Robustez({ r }: { r: DatosRobustez }) {
  const pq = sinError(r.parque), di = sinError(r.discriminacion), co = sinError(r.confiabilidad);
  const fu = sinError(r.futuro), cb = sinError(r.combinacion), es = sinError(r.especificaciones);
  const otra = es?.otra ?? 'todos_los_juegos';
  const mj = r.mejoras && 'actual' in r.mejoras ? r.mejoras : null;
  return (
    <div className="robustez">
      <h3 className="titulo-sec sub">Pruebas de robustez, lo que preguntaría un jurado técnico</h3>
      <p className="entrada ancha">
        Las pruebas de arriba son las que pide el reto. Aquí van cinco más, cada una pensada para una duda concreta que
        alguien con formación en estadística tendría al ver un R² tan bajo o un efecto de la altura tan grande. Todas usan
        predicciones fuera de muestra, y los intervalos de 95 % salen de remuestrear lanzadores completos.
        {r.stuff_entrena === 'mar' && <> En esta versión, Stuff+ se entrenó sólo con juegos a nivel del mar, para que no pueda aprender que un juego en altura da más carreras.</>}
      </p>

      {pq && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿La física explica las carreras de más en altura?</h3>
          <p className="nota-tarjeta">
            Entrenamos Stuff+ sólo con juegos a nivel del mar y lo usamos para predecir los {nf(pq.n)} lanzamientos de altitud
            extrema de {nf(pq.lanzadores)} lanzadores que el modelo no vio. A cada lanzamiento lo predecimos dos veces, con la
            forma que la pelota tuvo de verdad en altura y con esa misma pelota volada a nivel del mar. La resta entre las dos
            es la parte del exceso de carreras que viene de cómo se mueve el lanzamiento, y la comparamos con el exceso que de
            verdad ocurrió.
          </p>
          <div className="rejilla-3 cifras-robustez">
            <div><b className="num d-mucho">{sg(pq.por_100.total, 2)}</b><span>carreras más por cada 100 lanzamientos en altura de las que el modelo esperaría a nivel del mar (IC {rango(pq.ic95_por_100.total)})</span></div>
            <div><b className="num">{sg(pq.por_100.fisica, 2)}</b><span>de esas carreras las explica el cambio en el vuelo del lanzamiento (IC {rango(pq.ic95_por_100.fisica)})</span></div>
            <div><b className="num">{nf(pq.por_100.fraccion * 100, 0)} %</b><span>del exceso es física del lanzamiento. El resto lo pone sobre todo el batazo, que en aire delgado vuela más (IC {rango(pq.ic95_por_100.fraccion.map(x => (x == null ? null : x * 100)) as IC, 0, false)} %)</span></div>
          </div>
          <p className="tenue nota-pie">
            Dentro de la altura el modelo ordena los lanzamientos con una correlación de {sg(pq.corr, 3)} (IC {rango(pq.corr_ic95, 3)}). Su R² con
            el nivel corregido es {nf(pq.r2_nivel_corregido, 5)}, contra {nf(pq.r2_forma_mar, 5)} si lo usas sin la física.
          </p>
          {pq.por_tipo && pq.por_tipo_spearman && (
            <div className="tabla-scroll">
              <table className="tabla-datos compacta">
                <thead><tr><th>Tipo</th><th className="n">Lanzadores</th><th className="n">Carreras extra que predice la física</th><th className="n">Carreras extra observadas, mismo lanzador</th></tr></thead>
                <tbody>{pq.por_tipo.map(t => (
                  <tr key={t.tipo}><th scope="row">{t.tipo}</th><td className="num n">{nf(t.lanzadores)}</td><td className="num n">{sg(t.fisica_100, 2)}</td><td className="num n">{sg(t.observado_100, 2)}</td></tr>
                ))}</tbody>
              </table>
              <p className="tenue nota-pie">Por cada 100 lanzamientos. {pq.por_tipo_spearman.rho > 0.3 ? 'El orden de los tipos coincide' : 'El exceso observado no sigue el orden de la pérdida física, porque por tipo lo domina el batazo y hay pocos lanzadores en varios tipos'}, con correlación de rangos de {sg(pq.por_tipo_spearman.rho, 2)} ({pq.por_tipo_spearman.tipos} tipos, p = {nf(pq.por_tipo_spearman.p, 3)}).</p>
            </div>
          )}
        </div>
      )}

      {di && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿Cuánto separa, en carreras?</h3>
          <p className="nota-tarjeta">
            Tomamos el 10 % de lanzamientos con mejor calificación y el 10 % con peor, siempre con lanzadores que el modelo no
            vio, y contamos las carreras que permitió cada grupo. Esta es la forma de leer la discriminación que le sirve a un
            coach, porque no depende del azar de un lanzamiento suelto como el R².
          </p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Capa</th><th className="n">10 % mejor</th><th className="n">10 % peor</th><th className="n">Diferencia</th><th className="n">IC 95 %</th><th className="n">Swing fallido, mejor contra peor</th></tr></thead>
              <tbody>{(Object.keys(CAPA) as (keyof typeof CAPA)[]).map(k => (
                <tr key={k}><th scope="row">{CAPA[k]}</th><td className="num n">{sg(di[k].carreras_100_mejor10, 2)}</td><td className="num n">{sg(di[k].carreras_100_peor10, 2)}</td>
                  <td className="num n destacado">{nf(di[k].brecha_100, 2)}</td><td className="num n">{rango(di[k].brecha_ic95, 2, false)}</td>
                  <td className="num n">{nf(di[k].whiff_mejor10 * 100, 0)} % contra {nf(di[k].whiff_peor10 * 100, 0)} %</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="tenue nota-pie">Carreras por cada 100 lanzamientos, negativo es bueno para el lanzador.</p>
        </div>
      )}

      {co && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿Mide calidad o sólo qué lanzamientos usa cada quien?</h3>
          <p className="nota-tarjeta">
            Partimos al azar los lanzamientos de cada lanzador en dos mitades y correlacionamos su promedio en una con el de la
            otra. Si la estabilidad viniera sólo de la mezcla de lanzamientos (quien tira muchos sliders siempre califica
            parecido), desaparecería al comparar cada lanzamiento contra el promedio de su tipo, o al usar sólo rectas.
          </p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Versión</th><th className="n">Correlación entre mitades</th><th className="n">IC 95 %</th><th className="n">Lanzadores</th></tr></thead>
              <tbody>{([['crudo', 'Stuff+ tal cual'], ['sin_mezcla', 'Stuff+ contra el promedio de su tipo'], ['solo_rectas', 'Sólo rectas'], ['solo_mezcla', 'Sólo la mezcla de tipos, sin calidad'], ['carreras', 'Carreras reales']] as const).map(([k, t]) => (
                <tr key={k}><th scope="row">{t}</th><td className="num n destacado">{co[k].r == null ? 'sin datos' : nf(co[k].r, 3)}</td><td className="num n">{rango(co[k].ic95, 3, false)}</td><td className="num n">{nf(co[k].lanzadores)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {fu && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿Anticipa el año siguiente?</h3>
          <p className="nota-tarjeta">
            Juntamos los pares de temporadas seguidas ({nf(fu.pares)} pares de {nf(fu.lanzadores)} lanzadores con al menos 200
            lanzamientos en cada año) y correlacionamos lo que medimos en un año con lo que pasó en el siguiente. La pregunta es si
            Stuff+ anticipa mejor que las propias carreras del lanzador, que es lo que haría alguien sin modelo.
          </p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Lo que mides este año</th><th className="n">Carreras del año siguiente</th><th className="n">Swing fallido del año siguiente</th></tr></thead>
              <tbody>{([['stuff', 'Stuff+'], ['carreras_pasadas', 'Sus carreras'], ['whiff_pasado', 'Su swing fallido']] as const).map(([k, t]) => (
                <tr key={k}><th scope="row">{t}</th>
                  <td className="num n">{sg(fu.carreras[k].r, 3)} <span className="tenue">({rango(fu.carreras[k].ic95, 2)})</span></td>
                  <td className="num n">{sg(fu.whiff[k].r, 3)} <span className="tenue">({rango(fu.whiff[k].ic95, 2)})</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="tenue nota-pie">
            Sumar Stuff+ a las carreras pasadas aumenta el R² de las carreras futuras en {nf(fu.carreras.r2_incremental_stuff.d * 100, 1)} puntos
            porcentuales (IC {rango(fu.carreras.r2_incremental_stuff.ic95.map(x => (x == null ? null : x * 100)) as IC, 1)}).
          </p>
        </div>
      )}

      {cb && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿Y si combinamos los objetivos como sugiere el reto?</h3>
          <p className="nota-tarjeta">
            El reto propone que Stuff+ sea una combinación ponderada de varias probabilidades. La construimos para comparar.
            Entrenamos {cb.componentes.length} modelos de componente con las mismas variables físicas, incluida la probabilidad de out en el turno, y
            aprendimos los pesos con una regresión de las carreras sobre esas probabilidades, también fuera de muestra. Las dos
            versiones coinciden en {nf(cb.corr_entre_ellos * 100, 0)} % de correlación.
          </p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Versión</th><th className="n">R²</th><th className="n">RMSE</th><th className="n">Diferencia 10 % mejor contra peor</th><th className="n">Correlación entre mitades</th></tr></thead>
              <tbody>{([['directo', 'Directo en carreras, la que usamos'], ['combinado', 'Combinación ponderada']] as const).map(([k, t]) => (
                <tr key={k}><th scope="row">{t}</th><td className="num n">{nf(cb[k].r2, 5)}</td><td className="num n">{nf(cb[k].rmse, 5)}</td><td className="num n">{nf(cb[k].brecha_100, 2)}</td><td className="num n">{nf(cb[k].mitades, 3)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {mj && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿Se podía hacer un mejor modelo?</h3>
          <p className="nota-tarjeta">
            Probamos ocho variantes con las mejoras usuales de los Stuff+ públicos. Calificar cada batazo por lo que se espera de
            su velocidad de salida y su ángulo, meter el arsenal contra la recta, dividir el frenado entre el aire del juego y sumar
            variables de física. Misma validación por lanzador, todo medido contra las carreras reales.
          </p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Versión</th><th className="n">R²</th><th className="n">Diferencia 10 %</th><th className="n">Mitades</th><th className="n">Año siguiente</th></tr></thead>
              <tbody>{MEJORAS.filter(([k]) => mj[k]).map(([k, nom]) => {
                const m = mj[k] as { r2_vs_rv: number; brecha_100: number; mitades: number; futuro_stuff: number };
                return <tr key={k}><th scope="row">{nom}</th><td className="num n">{nf(m.r2_vs_rv, 5)}</td><td className="num n">{nf(m.brecha_100, 2)}</td><td className="num n">{nf(m.mitades, 3)}</td><td className="num n">{nf(m.futuro_stuff, 3)}</td></tr>;
              })}</tbody>
            </table>
          </div>
          <p className="tenue nota-pie">Ninguna se separa de la que usamos más allá del ruido. Cada una gana en una columna y pierde en otra, que es la firma del ruido. Stuff+ ya está en el techo de lo que la física sola predice de un lanzamiento suelto. Lo que falta para un R² alto es dónde cayó la pelota, y eso por definición no entra en Stuff+.</p>
        </div>
      )}

      {es && (
        <div className="tarjeta">
          <h3 className="titulo-tarjeta">¿Las conclusiones dependen de la caída de velocidad?</h3>
          <p className="nota-tarjeta">
            La variable más pesada de Stuff+ es cuánta velocidad pierde la pelota en el camino, y esa variable también refleja
            el aire. Para ver si nuestras conclusiones dependen de ella, calculamos la pérdida en altura por tipo con tres
            versiones del modelo, la que usamos, una sin las tres variables de frenado y {otra === 'solo_mar' ? 'una entrenada sólo con juegos a nivel del mar, donde la caída de velocidad no puede delatar el aire' : 'una entrenada con todos los juegos como el modelo anterior'}.
          </p>
          <div className="tabla-scroll">
            <table className="tabla-datos compacta">
              <thead><tr><th>Tipo</th><th className="n">La que usamos</th><th className="n">Sin frenado</th><th className="n">{otra === 'solo_mar' ? 'Sólo nivel del mar' : 'Con todos los juegos'}</th></tr></thead>
              <tbody>{Object.keys(es.variantes.produccion.por_tipo).map(t => (
                <tr key={t}><th scope="row">{t}</th>
                  {['produccion', 'sin_frenado', otra].map(v => <td key={v} className="num n">{sg(es.variantes[v].por_tipo[t] ?? NaN, 1)}</td>)}</tr>
              ))}
                <tr><th scope="row">Liga</th>{['produccion', 'sin_frenado', otra].map(v => <td key={v} className="num n destacado">{sg(es.variantes[v].liga, 1)}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="tenue nota-pie">
            Puntos de Stuff+ al pasar de nivel del mar a altitud extrema. El orden de los tipos se parece al de la versión que
            usamos con una correlación de rangos de {sg(es.orden_igual.sin_frenado, 2)} sin frenado y {sg(es.orden_igual[otra] ?? NaN, 2)} {otra === 'solo_mar' ? 'entrenando sólo a nivel del mar' : 'con todos los juegos'}.
          </p>
        </div>
      )}
    </div>
  );
}
