# Stuff+ calibrado a 2,240 metros

### Un modelo de calidad de lanzamiento para el Estadio Alfredo Harp Helú

**Hackathon ISAC 2026 · Diablos Rojos del México**
635,002 lanzamientos · Liga Mexicana de Béisbol · temporadas 2024–2026

---

## 1. Marco teórico

La sabermetría moderna evalúa el lanzamiento, no el resultado. Un *slider* que induce un
swing fallido y uno que termina en jonrón pueden ser físicamente idénticos: la diferencia
está en el bateador, el parque y el azar. Los modelos tipo Stuff+ separan la calidad del
lanzamiento de su desenlace observado, estimando el valor esperado a partir de las
propiedades físicas del envío.

Esa separación depende de un supuesto que en la LMB no se sostiene: que la relación entre
la física del lanzamiento y su resultado es la misma en todos los estadios. Los modelos
Stuff+ de MLB se entrenaron casi enteramente con parques cercanos al nivel del mar. El
Harp Helú está a 2,240 metros, más alto que Coors Field (1,609 m), el estadio más
favorable al bateo de las Grandes Ligas.

El mecanismo es directo. El movimiento de un lanzamiento lo produce el aire: la fuerza de
Magnus, que desvía la pelota, es proporcional a la densidad del aire. Con menos aire hay
menos fuerza y menos movimiento. Alan Nathan estima que en Coors Field un lanzamiento con
18 pulgadas de quiebre puede moverse 14 o 15. La pregunta de este trabajo es cuánto, y
para qué formas de lanzamiento, en las condiciones específicas de la LMB.

## 2. Datos

El conjunto entregado por ISAC contiene 635,002 lanzamientos rastreados con
Trackman a lo largo de tres temporadas, con identificadores anonimizados de juego,
lanzador, bateador y receptor.

La limitación central para este reto es que **el conjunto no identifica el estadio ni su
altitud**: sólo trae `altitude_category`, una variable de tres niveles. La sección 3
explica cómo se recupera una medida continua de la densidad del aire a partir de la propia
trayectoria.

Otras limitaciones y su tratamiento:

| Limitación | Tratamiento |
|---|---|
| Sin estado de corredores (24 estados base-out) | Valor de carrera sobre la cadena de 12 estados de conteo |
| Sin fecha ni número de lanzamiento | Orden reconstruido del archivo; las filas vienen cronológicas y contiguas por juego |
| `is_hit_by_pitch` viene en cero en las 635,002 filas | Reconstruido de `PitchCall`; es el único de catorce flags derivados con este problema |
| `AutoPitchType` con clases residuales | Colapsadas a un vocabulario estable de siete tipos |

## 3. La densidad del aire, medida en la trayectoria

Restando la gravedad, la aceleración medida en el release se descompone en dos partes
ortogonales: una paralela a la velocidad, que es el arrastre, y una perpendicular, que es
Magnus.

    a_aero  = a_medida − g
    a_drag  = (a_aero · v̂) v̂
    a_magnus = a_aero − a_drag

Como el arrastre va con ρ·C_d·v², el cociente **k_drag = |a_drag| / v²** es proporcional a
la densidad del aire y se puede calcular para cada lanzamiento. Su mediana por juego da un
índice estable, con variación día a día dentro de cada estadio:

| Categoría | Índice de arrastre (mediana) |
|---|---|
| Nivel del mar | 1.0003 |
| Altitud media | 0.8981 |
| Altitud extrema | 0.8534 |

### 3.1 El arrastre no es la densidad

El índice mide ρ·C_d, no ρ. A 2,240 metros la atmósfera estándar da una densidad de 0.802,
pero el arrastre medido cae sólo a 0.8534. La diferencia es el
coeficiente de arrastre: el número de Reynolds baja con la densidad y C_d sube.

Ajustando un solo exponente que ancle el índice medido a la altitud del Harp Helú se
obtiene —. La verificación es
independiente: con ese exponente, un estadio a la altura de Coors Field debería dar
—,
y la cubeta intermedia de la LMB mide
—.

### 3.2 El movimiento cae más que la densidad

Si arrastre y Magnus fueran ambos proporcionales a ρ, el movimiento caería en la misma
proporción que el frenado. No ocurre. Midiendo la respuesta **dentro de cada lanzador**
—1,187 combinaciones lanzador × tipo, siete cubetas de densidad, respuesta monótona—:

    k_drag ~ ρ^0.96          k_magnus ~ ρ^1.39

El Magnus responde alrededor de 1.45 veces más fuerte que el arrastre. Verificado que **no
es el giro**: entre nivel del mar y altitud extrema, dentro del mismo lanzador, la
frecuencia de giro cambia +0.5 %, el *spin factor* +0.3 % y la velocidad de salida +0.1 %.
Es el aire.

## 4. Arquitectura

La decisión central es que **la altitud no entra al modelo Stuff+ como variable**.
Introducirla como indicador dejaría su efecto confundido con qué lanzadores tiran dónde, e
impediría responder la pregunta operativa: ¿cuánto valdría este lanzamiento, que nunca se
ha tirado en altura, en el Harp Helú? En su lugar, dos etapas donde la altitud queda
identificada por física:

**Etapa 1 — transferencia de forma.** Con el punto de salida y el giro fijos, se reintegra
la trayectoria escalando arrastre por el cociente de densidades y Magnus por ese cociente
elevado a los exponentes calibrados (vertical 1.7,
horizontal 2.2). El integrador es Runge-Kutta de cuarto orden
anclado en el punto real de salida (y = 60.5 − extensión), con el eje de giro conservado y
la fuerza de Magnus perpendicular a la velocidad en todo el vuelo.

Se usa por diferencias: el integrador no predice la forma, sólo su *cambio* entre dos
densidades, y ese cambio se suma a la medición real de Trackman. Así los niveles coinciden
con Trackman por construcción y el único error que queda es el diferencial.

**Etapa 2 — Stuff+ sobre forma pura.** Un modelo de *gradient boosting* que ve únicamente
la física del envío: velocidad, quiebres, giro, punto y ángulos de salida, extensión,
ángulos de aproximación. Nunca ve ubicación, conteo, bateador ni estadio. Por eso es
transferible: para saber qué vale el mismo lanzamiento en otro aire, se le pasa la forma
transferida y se vuelve a puntuar.

Sobre esa base, Location+ agrega ubicación y conteo, y Pitching+ agrega arsenal y
secuencia.

### 4.1 Función de pérdida y escala

El objetivo es el valor de carrera del lanzamiento, construido sobre la cadena de conteos:

    RV(lanzamiento) = valor(estado después) − valor(estado antes)

donde el valor de un conteo es el valor de carrera esperado de los turnos que pasan por él
y el de un evento terminal es su peso lineal, recentrado con las frecuencias de la LMB. La
escala sigue la convención sabermétrica:

    Stuff+ = 100 + 10 × z(−xRV)

100 es el promedio de la liga y cada 10 puntos es una desviación estándar; el signo se
invierte porque un valor de carrera bajo favorece al lanzador.

## 5. Validación fuera de muestra

### 5.1 La transferencia de forma

La prueba decisiva: tomar los lanzamientos de un lanzador **a nivel del mar**, transferirlos
al aire de altitud, y comparar contra lo que ese mismo lanzador realmente tiró allá.
444 lanzadores tiraron en ambos entornos; la mitad se usó para calibrar
los exponentes y la otra mitad **nunca**. Sobre esas 436 celdas de
evaluación:

| Magnitud | Sin transferir | Sólo densidad | Modelo calibrado | Reducción |
|---|---|---|---|---|
| Quiebre vertical (in) | 2.573 | 1.119 | **0.802** | 68.8 % |
| Quiebre horizontal (in) | 2.932 | 1.612 | **0.875** | 70.2 % |
| Velocidad al plato (mph) | 1.323 | 0.578 | **0.574** | 56.6 % |

La columna «sólo densidad» es un modelo que escala todo por la densidad del aire, sin la
corrección de Reynolds. Subestima el castigo de la altitud en cerca de un tercio.

### 5.2 Delta de forma por tipo de lanzamiento

Medido dentro del mismo lanzador y el mismo tipo, en pulgadas de quiebre vertical:

| Lanzamiento | Observado | Predicho | Celdas |
|---|---|---|---|
| Four-Seam | -3.73 | -3.94 | 328 |
| Cutter | -2.50 | -2.49 | 25 |
| Changeup | -2.25 | -1.84 | 104 |
| Sinker | -2.10 | -2.40 | 159 |
| Splitter | -0.91 | -0.96 | 3 |
| Slider | -0.74 | -0.95 | 228 |
| Curveball | +1.82 | +1.65 | 64 |

### 5.3 Las tres capas, holdout de lanzador

Validación cruzada agrupada: ningún lanzador aparece a la vez en entrenamiento y prueba.

| Capa | Variables | RMSE | R² |
|---|---|---|---|
| Modelo nulo (promedio por conteo) | — | 0.26810 | 0.00003 |
| Stuff+ | 20 | 0.26541 | 0.01996 |
| Location+ | 27 | 0.26235 | 0.04245 |
| Pitching+ | 37 | 0.26230 | 0.04282 |

El R² a nivel de lanzamiento individual es bajo por construcción: el desenlace de un envío
suelto lo domina el azar. Lo relevante es la comparación contra el modelo nulo que pide la
rúbrica, y la estabilidad al agregar por lanzador.

**Holdout de temporada** (entrena 2024–2025, prueba 2026):
RMSE 0.26359, R² 0.02083.

**Holdout de parque** (entrena sin altitud extrema, prueba en altitud extrema):
RMSE 0.27504, R² 0.01414.
La degradación frente al holdout de lanzador es exactamente el fenómeno que este trabajo
mide: un modelo entrenado a nivel del mar no traslada limpio a la altura.

### 5.4 Modelos de componente

| Objetivo | n | Brier | Skill sobre tasa base |
|---|---|---|---|
| `swing` | 635 002 | 0.14853 | +0.4037 |
| `whiff` | 298 029 | 0.14744 | +0.1947 |
| `called_strike` | 336 973 | 0.05621 | +0.7265 |
| `chase` | 411 912 | 0.14567 | +0.3530 |
| `groundball` | 115 948 | 0.22899 | +0.0621 |
| `barrel` | 115 948 | 0.02437 | +0.0081 |
| `hard_contact` | 115 948 | 0.16672 | +0.0521 |
| `weak_contact` | 115 948 | 0.19575 | +0.1000 |

El barril es el caso honesto de límite del modelo: con una tasa base de 2.5 %, la calidad
del contacto depende mucho más del bateador que del lanzamiento, y la habilidad predictiva
desde la física del envío es marginal.

### 5.5 Aporte del arsenal

Sobre el valor de carrera agregado el arsenal aporta poco, porque la varianza de un
lanzamiento suelto la dominan la ubicación y el conteo. Donde sí se ve es en el swing
fallido, que es el mecanismo que el arsenal explica —diferencial de velocidad y túnel—:

| Capa | Brier | Skill |
|---|---|---|
| stuff | 0.15400 | +0.1588 |
| location | 0.14852 | +0.1887 |
| pitching | 0.14744 | +0.1947 |

## 6. Resultados

### 6.1 Efecto de la altitud por tipo de lanzamiento

Cada lanzamiento del conjunto se transfirió a las dos densidades y se puntuó con el mismo
modelo. Como Stuff+ sólo ve forma, la diferencia es atribuible al aire.

| Lanzamiento | n | Stuff+ nivel del mar | Stuff+ Harp Helú | Δ | Δ vs. recta | Whiff observado |
|---|---|---|---|---|---|---|
| Cutter | 26 468 | 100.5 | 99.6 | -0.89 | +2.44 | 10.9 % |
| Splitter | 7 289 | 102.0 | 100.5 | -1.56 | +1.76 | 16.8 % |
| Slider | 139 717 | 101.9 | 100.2 | -1.65 | +1.68 | 15.4 % |
| Changeup | 78 925 | 100.1 | 98.0 | -2.17 | +1.15 | 14.3 % |
| Curveball | 54 024 | 101.4 | 99.1 | -2.26 | +1.06 | 14.3 % |
| Sinker | 110 899 | 99.8 | 97.5 | -2.28 | +1.05 | 6.7 % |
| Four-Seam | 217 618 | 100.3 | 97.0 | -3.33 | +0.00 | 9.2 % |

**Todo pierde.** El promedio de la liga cae -2.42 puntos. Pero la
pérdida está ordenada, y el orden tiene un mecanismo: **la altitud es un impuesto sobre el
efecto Magnus, y cada lanzamiento paga en proporción a cuánto de su valor viene de ahí.**

En un extremo, el *cutter* casi no paga (-0.89): se mueve poco y su
engaño está en salir igual que la recta. En el otro, la curva paga más que nadie
(-2.26): es movimiento puro, y el movimiento es justo lo que el
aire delgado se lleva. La recta de cuatro costuras, que vive de su elevación, pierde
3.73 pulgadas de quiebre vertical, más que ningún otro
tipo.

### 6.2 La composición del talento cambia

Si en vez de promediar se mira **qué lanzamientos componen el 1 % mejor puntuado** en cada
entorno, el desplazamiento es más elocuente que cualquier delta:

| Lanzamiento | Toda la liga | Top 1 % a nivel del mar | Top 1 % en el Harp Helú |
|---|---|---|---|
| Slider | 22.7 % | 7.7 % | 32.6 % |
| Curveball | 7.9 % | 8.5 % | 14.2 % |
| Cutter | 3.3 % | 1.2 % | 5.5 % |
| Splitter | 1.5 % | 3.9 % | 6.0 % |
| Changeup | 11.6 % | 6.6 % | 8.6 % |
| Sinker | 17.5 % | 16.9 % | 11.1 % |
| Four-Seam | 35.6 % | 55.3 % | 22.0 % |

El *slider* pasa de 7.7 % a
32.6 % de la élite: casi se triplica. La recta cae de
55.3 % a 22.0 % y
el *sinker* se parte a la mitad, de 16.9 % a
11.1 %.

### 6.3 El castigo es regresivo

El promedio esconde lo más importante. Partiendo los lanzamientos en quintiles según su
Stuff+ **a nivel del mar**, el castigo de la altitud no se reparte parejo:

| Quintil de calidad | Stuff+ nivel del mar | Stuff+ Harp Helú | Δ recta 4C | Δ todos |
|---|---|---|---|---|
| 1 | 82.7 | 84.0 | **+1.26** | 1.03 |
| 2 | 95.2 | 94.3 | **-0.94** | -0.71 |
| 3 | 102.5 | 99.4 | **-3.12** | -2.16 |
| 4 | 107.5 | 102.1 | **-5.39** | -3.77 |
| 5 | 113.6 | 105.2 | **-8.44** | -6.47 |

La recta del quintil más bajo **no pierde nada: gana +1.26**. La del
quintil más alto pierde -8.44, y pasa de
113.6 —élite— a 105.2, apenas por encima del
promedio de la liga.

**La altitud no daña al lanzamiento malo. Borra la ventaja del bueno.** Es un efecto de
compresión: el aire delgado se lleva el movimiento, y el movimiento es precisamente aquello
en lo que un lanzamiento de élite se distingue de uno mediocre. Quien no tenía nada
excepcional que perder, no pierde nada.

Esto reencuadra por completo la pregunta de reclutamiento, y es el resultado con más
consecuencias prácticas de todo el trabajo (sección 7).

### 6.4 El riesgo al otro lado del bate

| Entorno | Velocidad de salida | Distancia | HR por bola en juego | Tasa de rodado |
|---|---|---|---|---|
| Nivel del mar | 83.0 mph | 157 ft | 3.65 % | 40.5 % |
| Altitud extrema | 84.0 mph | 161 ft | 4.26 % | 44.8 % |

Restringido a elevados, que es donde la altitud cobra:

| Entorno | Distancia media | HR por elevado |
|---|---|---|
| Nivel del mar | 291.9 ft | 12.4 % |
| Altitud extrema | 322.8 ft | 16.3 % |

Un elevado viaja **31.0 pies más** y su
probabilidad de salir del parque sube de 12.4 % a
16.3 %.

### 6.5 Perfil físico ideal para el Harp Helú

Caracterización del 1 % de lanzamientos **reales** mejor puntuados en cada entorno,
restringido a lanzadores derechos para que el quiebre horizontal no se cancele al promediar.

Se buscó dentro de los envíos observados y no sobre una rejilla libre de los ejes físicos:
una rejilla produce combinaciones que nunca ocurren —una recta de 100 mph con quiebre de
curva— y ahí un modelo de árboles extrapola cualquier cosa. La respuesta tiene que quedarse
sobre lo que un brazo humano puede realmente hacer.

| Variable | Élite a nivel del mar | Élite en altitud | Diferencia | Mediana de la liga |
|---|---|---|---|---|
| RelSpeed | 90.63 | 87.25 | -3.38 | 88.90 |
| InducedVertBreak | 11.30 | 4.22 | -7.08 | 9.16 |
| HorzBreak | 8.36 | 1.87 | -6.49 | 7.25 |
| SpinRate | 2 334.11 | 2 352.39 | +18.28 | 2 327.65 |
| SpinAxis | 199.43 | 165.43 | -34.00 | 210.92 |
| Extension | 6.02 | 5.90 | -0.12 | 5.88 |
| RelHeight | 5.73 | 5.66 | -0.07 | 5.79 |
| RelSide | 1.91 | 1.99 | +0.07 | 1.72 |
| spin_efficiency | 1.02 | 0.69 | -0.33 | 0.81 |
| movement_total | 18.87 | 12.84 | -6.03 | 14.68 |

Dos renglones cargan el hallazgo. El **movimiento total** de la élite baja de
18.9 a
12.8 pulgadas, y la **eficiencia de giro** baja de
1.02 a
0.69.

La eficiencia de giro es la fracción del giro que se convierte en movimiento. Que la élite
de altura la tenga *más baja* significa que el giro de tipo giroscópico —el que no produce
Magnus— gana valor relativo. Es coherente: si el aire delgado grava el Magnus, conviene no
depender de él.

## 7. Recomendaciones operativas

**Lo primero, porque cambia el cálculo de cualquier contratación: no pague sobreprecio por
una recta de élite para lanzar en el Harp Helú.** No la va a recibir. Una recta del quintil
superior llega a 2,240 metros valiendo 105.2 en vez de
113.6, mientras que una del quintil inferior llega igual o levemente
mejor. La prima que el mercado le cobra por esa recta se paga a nivel del mar y se cobra en
un estadio donde no existe. El mismo dinero rinde más en un brazo cuyo valor no dependa del
movimiento.

La regla que resume el resto: **en el Harp Helú, no apueste al Magnus.**

**Qué gana valor relativo.** El *cutter* y el *slider*. Pierden
-0.89 y -1.65 puntos contra
-3.33 de la recta, y entre los dos pasan de
8.9 % a
38.2 % de la élite. El
mecanismo no es que se muevan más, sino que nunca dependieron de moverse mucho: su engaño
está en salir indistinguibles de la recta y romper tarde y poco. El giro giroscópico no
produce Magnus, así que el aire delgado no tiene qué quitarle.

**Qué pierde.** La curva y la recta de cuatro costuras, por la misma razón opuesta: son
movimiento puro. La recta pierde 3.73 pulgadas de
elevación, y una recta alta que llega con menos elevación de la que el bateador anticipa no
produce el swing por debajo: produce el elevado. En el Harp Helú ese elevado viaja
31.0 pies más y sale del parque
16.3 % de las veces contra 12.4 % a
nivel del mar. El *sinker* pierde parecido y su participación en la élite se parte a la mitad.

**Sobre la hipótesis del cambio de velocidad.** El planteamiento del reto (H2) propone que
el cambio gane valor relativo porque engaña por diferencial de velocidad y no por Magnus.
Los datos lo sostienen, pero **débilmente**: el cambio pierde
-2.17 puntos, apenas +1.15
mejor que la recta contra la que juega, muy por debajo del
+2.44 del *cutter*. La razón es que el cambio sí tiene
mucho movimiento horizontal —2.2 pulgadas de las
cuales pierde una parte importante— y ese componente sí paga el impuesto. El ganador de la
altitud no es el que engaña por velocidad: es el que nunca dependió del movimiento.

**Cómo perfilar un prospecto.** Cuatro preguntas, en este orden:

1. *¿Cuánto de su valor está en el percentil alto de movimiento?* Es la pregunta que más
   dinero decide. Si su Stuff+ a nivel del mar está en el quintil superior y ese Stuff+
   viene del quiebre, el diferencial que lo hace caro no viaja a la Ciudad de México.

2. *¿Cuánto de su valor viene del Magnus?* No es cuántas revoluciones, sino qué fracción
   del giro se convierte en pulgadas. Eficiencia de giro alta es una virtud a nivel del
   mar y una exposición en altura: la élite de altura la tiene en
   0.69 contra
   1.02 de la élite a nivel del mar.
3. *¿Su arsenal se apoya en cortadas y sliders o en curvas y sinkers?* El primer perfil
   llega al Harp Helú prácticamente intacto; el segundo llega devaluado.
4. *¿Induce rodados?* La tasa de rodado sube de 40.5 % a
   44.8 % en altitud, y el rodado es el único batazo al que el
   aire no le hace nada. Es la contrapartida: la altitud castiga al lanzador en el
   movimiento, pero le devuelve algo en el tipo de contacto.

El simulador incluido permite evaluar cualquier combinación física en los dos entornos sin
necesidad de servidor.

## 8. Alcance y fronteras

Lo que este modelo **no** hace, dicho explícitamente:

- **No identifica estadios.** La cubeta de «altitud extrema» agrupa varios parques. Los
  resultados se leen como el contraste entre un entorno de altitud de la LMB y uno a nivel
  del mar, con el Harp Helú como caso más extremo, no como una estimación específica de
  ese estadio.
- **No separa aire de clima.** El índice de arrastre recoge densidad, temperatura y
  humedad juntas. Es lo correcto para predecir movimiento, pero no permite atribuir el
  efecto sólo a la altitud.
- **No modela al bateador.** Sin identidad de bateador como variable, la calidad del
  contacto queda en el límite de lo predecible (sección 5.4).
- **No es causal.** Stuff+ es un modelo de valoración. La pregunta contrafactual táctica
  («¿qué habría pasado con un slider en vez del cambio?») requiere otro instrumento.
- **El exponente de Reynolds es empírico.** Está calibrado fuera de muestra y corroborado
  por una medición independiente dentro de lanzador, pero no derivado de primeros
  principios.

## 9. Reproducción

```bash
uv venv && uv pip install -e .
python scripts/01_physics.py       # densidad del aire y transferencia de forma
python scripts/02_features.py      # secuencia, arsenal, objetivos
python scripts/03_models.py        # las tres capas y sus holdouts
python scripts/04_export.py        # modelo y tablas al simulador
python scripts/05_deliverables.py  # entregables 1, 2 y 3
python scripts/06_report.py        # este documento
cd app && npm install && npm test && npm run dev
```

## 10. Referencias

- Nathan, A. *The effect of altitude on baseball trajectories.* Physics of Baseball.
- SABR. *High altitude offense.* Baseball Research Journal.
- Tango, T., Lichtman, M. & Dolphin, A. (2007). *The Book: Playing the Percentages in Baseball.*
- Huang, G. & Hsu, M. (2021). Big data analytics in baseball: a review. *SAGE Open*, 11(4).
- Deshpande, S. K. & Wyner, A. J. (2017). A hierarchical Bayesian model of pitch framing. arXiv:1704.00823.

---

*Los datos de la LMB se usaron únicamente para esta competencia. Este documento presenta
resultados, no datos.*
