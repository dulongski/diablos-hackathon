# Entrevista final · 10 minutos

El jurado califica una cosa en esta parte, si cambiaría sus decisiones de reclutamiento y de táctica por lo que le
muestras. Así que la historia va de decisiones, y el método sólo aparece cuando sostiene una decisión. Las cifras entre
corchetes se llenan con la corrida final de `scripts/11_robustez.py` y del modelo entrenado a nivel del mar.

## El guion, minuto por minuto

**Minuto 0 a 1 · La pregunta.** El Harp Helú está a 2,240 metros, más alto que Coors Field. Ahí hay 20 % menos aire y
la pelota se mueve menos. Los Stuff+ públicos se hicieron a nivel del mar, así que no te dicen qué vale un lanzamiento
en tu casa. Nosotros sí, y te decimos qué lanzadores aguantan la altura.

**Minuto 1 a 3 · La idea, con el dashboard abierto en Inicio.** Mueve el control de altitud frente a ellos. La misma
pelota, el mismo brazo, y la línea roja se separa de la azul. Explica en una frase que no metimos la altitud como una
variable más, porque eso mezclaría el aire con quién lanza en altura. La metimos con física. Volamos cada lanzamiento
en el aire del Harp Helú y lo calificamos otra vez. Menciona que el simulador reproduce la cifra de Alan Nathan para
Coors Field, 18 pulgadas que se vuelven 14.9, calibrado sólo con datos de la LMB.

**Minuto 3 a 5 · A quién firmar, pestaña Lanzadores.** Abre la ficha del lanzador de fichaje y la del que más pierde.
A nivel del mar valen casi lo mismo y en tu casa los separan muchos puntos. Esa es la decisión que cambia, a quién
pagar. Di cuántos aguantan de los que comparamos.

**Minuto 5 a 6 · Qué pedir en casa, pestañas Arsenal y Causal Forest.** Cutter, slider y splitter pierden poco. La
recta de élite es la que más pierde, así que no pagues prima por movimiento. En el juego, con el conteo en contra y un
bateador del lado contrario, en casa conviene slider antes que cambio.

**Minuto 6 a 8 · Por qué confiar, pestaña Validación.** Tres cifras y nada más. La calibración baja escalón por
escalón con lanzadores que el modelo nunca vio. La diferencia entre el 10 % mejor y el 10 % peor es de [brecha]
carreras por cada 100 lanzamientos. Y entrenado sólo a nivel del mar, la física explica [fracción] % de las carreras
de más que hay en altura, el resto lo pone el batazo que vuela más.

**Minuto 8 a 9 · Un prospecto en vivo, pestaña Simulador.** Pide al jurado una velocidad y un movimiento, o usa una
recta típica, y muestra los dos Stuff+ lado a lado. Esta es la herramienta que el pitching coach usa el lunes.

**Minuto 9 a 10 · Límites y cierre.** No sabemos el estadio exacto de cada juego, sólo qué tan delgado estaba el aire.
No separamos altura de clima. El Causal Forest confirma el costo promedio pero no separa a un lanzador de otro con
carreras, y por eso la física es la que decide. Cierra con la decisión, no con el método.

## Las preguntas difíciles

**¿Por qué el R² de Stuff+ es tan bajo?** Porque el resultado de un lanzamiento suelto es casi todo azar y Stuff+ no
sabe dónde cayó la pelota. Ningún Stuff+ público explica mucho de un lanzamiento aislado. Lo que se le pide es que
ordene bien cuando juntas lanzamientos, y lo hace. Muestra la calibración y la diferencia entre el 10 % mejor y el 10 %
peor, [brecha] carreras por cada 100 lanzamientos con lanzadores que nunca vio.

**¿El modelo aprendió física o aprendió que en altura se anotan más carreras?** Era un riesgo real, porque la variable
más pesada es cuánta velocidad pierde la pelota, y en altura frena menos. Por eso Stuff+ aprende sólo de juegos a nivel
del mar, donde esa variable no puede delatar el aire. Además probamos el modelo sin las tres variables de frenado y el
orden de los tipos se mantiene con correlación de rangos [orden sin frenado].

**¿Falla el holdout de parque?** Ordena bien y falla el nivel, y medimos por qué. Predecimos cada lanzamiento de altura
con su forma real y con la misma pelota volada a nivel del mar. La física explica [fracción] % del exceso de carreras.
El resto viene del batazo, que en aire delgado vuela 31 pies más.

**¿La estabilidad de 0.988 no es sólo que cada lanzador usa los mismos tipos?** Lo probamos. Comparado contra el
promedio de su tipo la correlación entre mitades es [sin mezcla], y sólo con rectas es [solo rectas]. Las carreras
reales del mismo lanzador apenas llegan a [carreras]. Además se calcula con un modelo que nunca vio a ese lanzador.

**¿Predice el futuro mejor que las carreras?** En pares de temporadas seguidas, Stuff+ correlaciona [futuro stuff] con
las carreras del año siguiente, contra [futuro carreras] de las carreras pasadas. Y sumarlo a las carreras pasadas
agrega [R² incremental] puntos de R².

**El reto pedía combinar varios objetivos con pesos. ¿Por qué predicen carreras directo?** Porque las carreras ya pesan
cada resultado por lo que vale en el marcador. Aun así construimos la combinación ponderada para comparar, con nueve
componentes incluida la probabilidad de out en el turno, y da [R² combinado] contra [R² directo] del modelo directo.

**¿Por qué no meter la altitud como variable?** Porque los lanzadores que lanzan en altura no son una muestra al azar,
y su efecto se mezclaría con quiénes son. Tampoco podrías calificar a alguien que nunca ha lanzado en altura, que es
justo el caso de un fichaje.

**¿Por qué el simulador y la tabla por tipo no dan exactamente lo mismo?** La tabla promedia todos los lanzamientos
reales de un tipo, cada uno con su propio arrastre medido. El simulador califica una forma típica promediando 49
variaciones con la dispersión real del arrastre. El promedio de una población no es la calificación de su lanzamiento
típico, pero la dirección y el orden coinciden.

**¿Qué le falta al modelo?** Saber el estadio exacto, separar aire de clima y modelar al bateador. Con datos de estadio
y clima, el índice del aire se separaría en altitud y clima sin cambiar nada más del método.

**¿Respetaron las reglas de datos?** Sí. No subimos datos de la LMB a ningún lado. El dashboard muestra resultados, y
el mapa de movimiento sólo enseña promedios de celdas con al menos diez lanzamientos.

## Antes de entrar

1. Abre el dashboard en Inicio, con el control en 2,240 metros.
2. Ten abiertas en otras pestañas la ficha del lanzador de fichaje y la pestaña Validación.
3. Ensaya el simulador con una recta típica para que el número no te sorprenda.
4. Lleva el documento técnico impreso por si piden la definición formal de la escala.
