# Diablos Stuff+

### Calidad de lanzamiento ajustada por la altitud del Estadio Alfredo Harp Helú

**Hackathon ISAC 2026 · Reto Diablos Rojos del México**
635,002 lanzamientos · Liga Mexicana de Béisbol · temporadas 2024 a 2026

---

## Resumen

Los modelos Stuff+ califican qué tan difícil de batear es un lanzamiento a partir de su física. El
problema es que se construyeron en estadios a nivel del mar. El Harp Helú está a 2,240 metros, con
20 % menos aire, y ahí la pelota se mueve menos. Construimos un Stuff+ para la LMB en el que **la
altitud no es una variable del modelo sino una transformación física**. Volvemos a volar cada
lanzamiento con el aire de otro estadio y lo calificamos de nuevo. Encontramos cuatro cosas que
cambian tus decisiones.

1. **Todo lanzamiento pierde en altura, pero no lo mismo.** La recta pierde 11.7 puntos de Stuff+
   (1.6 carreras más por cada 100 lanzamientos) y el cutter 3.0. Las mejores rectas pierden 19.
2. **De 561 lanzadores, sólo 21 aguantan la altura**, es decir, pierden menos de media carrera por cada
   100 lanzamientos. Todos tiran slider, más de la mitad tira cutter (contra 18 % de la liga) y
   provocan más rodados.
3. **Probamos las cuatro hipótesis del reto.** H1 y H4 se confirman. H2 y H3 se confirman en parte.
4. **Un Causal Forest sobre carreras reales confirma el costo de la altura**, 1.52 carreras más por cada
   100 lanzamientos, sin usar Stuff+. La pérdida de Stuff+ explica unas tres cuartas partes. También
   muestra por qué necesitas la física para separar a un lanzador de otro, porque las carreras solas no
   alcanzan.

## 1. Planteamiento

### 1.1 La pregunta del club

¿Qué lanzadores sufren más la altitud y cuáles son los más consistentes? De esa respuesta salen tus
fichajes, tu rotación en casa y el desarrollo de tus prospectos.

### 1.2 Por qué importa la altitud

Una pelota que gira desvía el aire hacia un lado, y el aire la empuja hacia el otro. Es el efecto
Magnus. Ese empuje produce el movimiento que engaña al bateador, y crece con la densidad del aire.
Con menos aire hay menos empuje, menos movimiento y menos engaño. A la vez, el aire frena menos y los
batazos llegan más lejos. Alan Nathan estima que en Coors Field, a 1,609 metros, un lanzamiento con 18
pulgadas de quiebre se mueve 14 o 15. El Harp Helú está 631 metros más arriba.

### 1.3 Las hipótesis del reto

| | Hipótesis | Cómo la probamos |
|---|---|---|
| H1 | La baja densidad reduce el movimiento que produce el giro | Física contra Nathan y pérdida de Stuff+ por tipo, con intervalos |
| H2 | Los lanzamientos de diferencial de velocidad ganan valor relativo | El cambio contra la recta del mismo lanzador |
| H3 | Los lanzadores de rodados valen más en altura | Pendiente de carreras contra rodados en cada entorno |
| H4 | El giro por sí solo no predice Stuff+ | Peso en el modelo y experimento controlado |

## 2. Datos y supuestos

ISAC entregó 635,002 lanzamientos medidos con Trackman en tres temporadas, con identificadores
anónimos de juego, lanzador, bateador y receptor. El conjunto **no dice en qué estadio se lanzó**. Sólo
trae una categoría de altitud con tres niveles (nivel del mar, altitud media y altitud extrema).

| Limitación | Cómo la resolvimos |
|---|---|
| No hay estadio ni altitud | Medimos la densidad del aire en la trayectoria (sección 3.2) |
| No hay corredores en base | Valor de carrera sobre los 12 conteos posibles |
| No hay fecha ni número de lanzamiento | Reconstruimos el orden, el archivo viene cronológico por juego |
| `is_hit_by_pitch` vale cero en todas las filas | Lo reconstruimos desde `PitchCall` |
| Hay tipos de lanzamiento residuales | Los agrupamos en siete tipos estables |

Trabajamos con cuatro supuestos.
**S1.** El brazo no cambia con la altitud. Lo comprobamos dentro de cada lanzador. Entre nivel del mar
y altitud extrema su giro cambia 0.5 %, su eficiencia de giro 0.3 % y su velocidad de salida 0.1 %.
**S2.** Todo lo que cambia en el vuelo de la pelota entre estadios viene del aire.
**S3.** Medimos el valor de un lanzamiento en carreras esperadas según el conteo. El resultado que tuvo
depende del bateador y del azar.
**S4.** La escala toma como referencia a la liga tal como lanzó, en sus tres tipos de estadio. 100 es ese promedio, así que a nivel del mar el lanzamiento típico queda arriba de 100 y en altura abajo.

## 3. Metodología

### 3.1 La idea en cuatro pasos

La decisión central es que **la altitud nunca entra como variable del modelo de calidad**. Si entrara,
su efecto se mezclaría con quién lanza dónde, porque los lanzadores de los equipos de altura no son una
muestra al azar. Y no podrías responder la pregunta que importa. ¿Cuánto valdría en el Harp Helú un
lanzamiento que nunca se ha tirado ahí?

1. **Medimos el aire** de cada juego con el frenado de la pelota.
2. **Transferimos la forma.** Volvemos a volar cada lanzamiento con el aire de otro estadio.
3. **Calificamos la forma** con un modelo que sólo ve física (Stuff+) y con dos capas que suman contexto.
4. **Comparamos** el mismo lanzamiento en los dos aires. La diferencia es el efecto de la altitud.

### 3.2 La densidad del aire, medida en la trayectoria

Trackman reporta la aceleración de cada pelota. Le quitamos la gravedad y nos queda la parte
aerodinámica. La separamos en una componente paralela a la velocidad (el arrastre) y una perpendicular
(el Magnus).

$$\mathbf a_{\text{aero}} = \mathbf a - \mathbf g, \qquad \mathbf a_{\text{drag}} = (\mathbf a_{\text{aero}}\cdot\hat{\mathbf v})\,\hat{\mathbf v}, \qquad \mathbf a_{\text{M}} = \mathbf a_{\text{aero}} - \mathbf a_{\text{drag}}$$

El arrastre vale $\tfrac12 \rho\, C_d A\, v^2 / m$. Por eso el cociente $k_{\text{drag}} = \lVert \mathbf a_{\text{drag}} \rVert / v^2$
es proporcional a $\rho\, C_d$, y lo calculamos para cada lanzamiento. Su mediana por juego, normalizada
al nivel del mar, es el **índice de arrastre** $I$ de ese juego.

| Categoría | Índice de arrastre $I$ (mediana) |
|---|---|
| Nivel del mar | 1.0003 |
| Altitud media | 0.8981 |
| Altitud extrema | 0.8534 |

**El arrastre no es la densidad.** A 2,240 metros la atmósfera estándar da $\rho/\rho_0 = 0.802$, pero
medimos un índice de 0.853. La causa es aerodinámica. Con menos aire baja el número de Reynolds y sube
el coeficiente de arrastre $C_d$. Anclamos un solo exponente $\beta$ a la altitud del Harp Helú.

$$I(h) = \rho_{\text{ISA}}(h)^{\beta}, \qquad \rho_{\text{ISA}}(h) = \left(1 - 2.25577\times 10^{-5}\, h\right)^{4.25588}, \qquad \beta = 0.7184$$

La prueba es independiente del ajuste. Con ese $\beta$, un estadio a la altura de Coors Field debería
dar $I = 0.8931$. La categoría de altitud media de la LMB nunca entró al ajuste y mide 0.8981.

**El movimiento cae más que el arrastre.** Dentro del mismo lanzador y tipo de lanzamiento (1,187
combinaciones en siete niveles de densidad), las dos fuerzas responden distinto.

$$k_{\text{drag}} \propto \rho^{0.96}, \qquad k_{\text{M}} \propto \rho^{1.39}$$

El Magnus responde casi 1.5 veces más fuerte que el arrastre. Por S1 no es el giro. Es el aire.

### 3.3 Transferencia de forma, el mismo lanzamiento en otro aire

Para cada lanzamiento resolvemos su estado de salida (posición, velocidad y eje de giro) a partir de lo
que midió Trackman. Después integramos el vuelo desde la mano hasta el plato con Runge Kutta de cuarto
orden y pasos de 2 milisegundos.

$$\frac{d\mathbf v}{dt} = -\,k_d\, I\,\lVert\mathbf v\rVert\,\mathbf v \;+\; M\, I^{\gamma}\,\frac{\lVert\mathbf v\rVert^{2}}{\lVert\mathbf v_0\rVert^{2}}\;\frac{\hat{\boldsymbol\omega}\times\mathbf v}{\lVert\hat{\boldsymbol\omega}\times\mathbf v\rVert} \;+\; \mathbf g$$

Aquí $k_d = 0.001588$ es la mediana de la LMB a nivel del mar y $M$ es la magnitud de Magnus que
reproduce la forma medida. Los exponentes $\gamma_v = 1.7$ (vertical) y $\gamma_h = 2.2$ (lateral) los
calibramos fuera de muestra (sección 4.1). El eje de giro $\hat{\boldsymbol\omega}$ se conserva y la
fuerza queda perpendicular a la velocidad todo el vuelo.

**Usamos el integrador por diferencias.** No predice la forma. Sólo predice cuánto cambia entre dos
aires, y ese cambio se suma a la medición real.

$$\text{forma}_{\text{HH}} = \text{forma}_{\text{Trackman}} + \big[f(I_{\text{HH}}) - f(I_{\text{obs}})\big]$$

Así los niveles coinciden con Trackman por construcción, y el único error posible es el del cambio.

### 3.4 El valor en carreras de cada lanzamiento

Sin corredores en base, el estado del turno es el conteo, con 12 combinaciones de bolas y strikes. El
valor de un conteo $V(c)$ es el promedio de las carreras de los turnos que pasan por él. Los eventos
finales usan pesos lineales (sencillo 0.70, doble 1.00, jonrón 1.65, ponche $-0.27$), recentrados para
que el turno promedio de la LMB valga cero. El valor de un lanzamiento es cuánto mueve el turno.

$$\text{RV} = V(c_{\text{después}}) - V(c_{\text{antes}})$$

### 3.5 Stuff+, Location+ y Pitching+

Las tres capas predicen el mismo objetivo, el valor esperado en carreras $\widehat{\text{RV}}$, con
gradient boosting en LightGBM. Sólo cambia lo que ve cada una.

| Capa | Variables | Qué ve |
|---|---|---|
| Stuff+ | 16 | Sólo física. Velocidad, quiebres, giro, eje, punto de salida, extensión, tiempo de vuelo y eficiencia de giro |
| Location+ | 23 | Además, dónde llegó la pelota, el conteo y el lado del bateador |
| Pitching+ | 33 | Además, el arsenal del lanzador y la secuencia con el lanzamiento anterior |

**Los ángulos de salida y de llegada no entran en ninguna capa**, aunque Trackman los mida en el release. El
ángulo con que sale la pelota también dice a dónde va, así que con ellos el modelo aprende puntería en lugar
de física. Lo medimos. Con los cuatro ángulos, Stuff+ correlacionaba $-0.70$ con la distancia al centro de la
zona, más que el propio Location+ ($-0.53$), y la ubicación en el plato predecía el 58 % de su varianza. Sin
ellos, $-0.03$ y prácticamente nada. El reto define Stuff+ como física pura, y la ubicación entra en Location+.

Location+ y Pitching+ usan 500 árboles, tasa de aprendizaje 0.05, 96 hojas, al menos 400 lanzamientos por hoja
y regularización $L_2 = 5$. **Stuff+ va mucho más regularizado** (400 árboles, tasa 0.03, 31 hojas, al menos
4,000 lanzamientos por hoja, $L_2 = 50$). Sin ubicación, lo único que le queda para separar lanzamientos es la
física, y el punto de salida es casi una firma de cada lanzador. Con hojas chicas el modelo memoriza lanzadores
y, con lanzadores nuevos, queda peor que el promedio.

**De dónde sale cada calificación.** Medimos con SHAP cuánto aporta cada grupo de variables a la predicción.
Stuff+ es 100 % física, y sus variables más pesadas son cuánta velocidad pierde la pelota en el vuelo, el
quiebre vertical, la elevación y el giro. En Location+ la ubicación y el conteo explican el 62 % y la física
el 38 %. En Pitching+ la ubicación y el conteo explican el 55 %, la física el 26 % y el arsenal con la
secuencia el 19 %.

La función de pérdida es el error cuadrático (L2) sobre el valor en carreras. Pitching+ incluye las
variables relacionales de arsenal que pide el reto, todas contra la recta principal del lanzador en esa
temporada. Diferencia de velocidad, de elevación y de movimiento lateral, similitud de túnel (qué tan
parecido sale de la mano), uso de cada lanzamiento, tamaño del arsenal, lanzamiento anterior y vuelta al
orden.

Stuff+ nunca ve ubicación, conteo, bateador ni estadio. Por eso lo puedes transferir. Para saber qué
vale un lanzamiento en otro aire, le das la forma transferida y lo vuelves a calificar. La escala sigue
la convención sabermétrica.

$$\text{Stuff+} = 100 + 10\, z\!\left(-\widehat{\text{RV}}\right)$$

Aquí $z$ estandariza con la media y la desviación estándar de la liga. 100 es el promedio y cada 10
puntos son una desviación estándar. El signo se invierte porque menos carreras es mejor para el
lanzador. El reto propone que la calificación final sea una combinación ponderada de varios objetivos (swing
fallido, persecución, strike cantado, contacto débil, rodado, contacto duro, valor en carreras). Elegimos
predecir directo el valor esperado en carreras porque ya es esa combinación, ponderada por lo que cada
resultado vale en el marcador, y así no tienes que inventar pesos. Los ocho modelos de componente sí los
entrenamos, y explican de dónde sale cada calificación, pero no entran en el cálculo de Stuff+.

### 3.6 Validación fuera de muestra

Calculamos todas las métricas con datos que el modelo no vio.
**Holdout de lanzador.** Validación cruzada de 5 pliegues agrupada por lanzador. Ningún brazo está en
entrenamiento y prueba a la vez.
**Holdout de temporada.** Entrenamos con 2024 y 2025 y probamos con 2026.
**Holdout de parque.** Entrenamos sin altitud extrema y probamos sólo en altitud extrema.
**Modelo nulo.** El promedio del valor en carreras por conteo, lo mínimo que sabes sin mirar el
lanzamiento.
**Calibración.** Agrupamos los lanzamientos por su Stuff+ fuera de muestra y comparamos lo predicho con
las carreras que pasaron.

### 3.7 Pruebas de hipótesis

Medimos toda la incertidumbre con **bootstrap por lanzador** de 2,000 remuestreos. Remuestreamos
lanzadores completos y no lanzamientos sueltos, porque los lanzamientos de un mismo brazo no son
independientes.

**H1.** Para cada tipo de lanzamiento $t$ calculamos la pérdida media, ponderada por número de
lanzamientos, sobre 2,808 combinaciones de lanzador y tipo.

$$\bar\Delta_t = \frac{\sum_i n_{it}\,\Delta_{it}}{\sum_i n_{it}}, \qquad \Delta_{it} = \text{Stuff+}_{it}^{\,\text{HH}} - \text{Stuff+}_{it}^{\,\text{mar}}$$

Además comparamos el integrador con la cifra de Nathan.

**H2.** Usamos un diseño pareado dentro del lanzador. Para quien tira cambio y recta,
$D_i = \Delta_{i,\text{cambio}} - \Delta_{i,\text{recta}}$. Al comparar contra la recta del mismo brazo se
cancela todo lo que es del lanzador y queda sólo el efecto del aire sobre cada forma. Si $D > 0$, el
cambio pierde menos que la recta.

**H3.** Tomamos los 333 lanzadores que tiraron al menos 120 veces en cada entorno. Estimamos por mínimos
cuadrados ponderados la pendiente de carreras contra rodados en cada entorno $e$.

$$R_{ie} = a_e + b_e\, \text{GB}_i + \varepsilon_{ie}, \qquad H_3 \Leftrightarrow b_{\text{alt}} - b_{\text{mar}} < 0$$

El peso de cada lanzador es $w_i = 2\,(1/n_{i,\text{alt}} + 1/n_{i,\text{mar}})^{-1}$, la precisión de una diferencia.

**H4.** Hicimos dos pruebas. Primero medimos el peso de cada grupo de variables dentro de Stuff+, como la
ganancia total de los árboles que las usan. Después corrimos un experimento controlado con el
simulador. Movimos una sola perilla (giro o movimiento) y dejamos fijo todo lo demás, algo que los datos
de la cancha no permiten. Cada punto es el promedio de 49 variaciones chicas del mismo lanzamiento, y
cada variación vuela con un arrastre sacado de la dispersión real entre pelotas, como en el pipeline,
donde cada lanzamiento vuela con su propio arrastre medido.

### 3.8 Modelo secundario, un Causal Forest

Stuff+ valora lanzamientos. Un Causal Forest responde otra cosa, preguntas de qué hubiera pasado. Lo usamos
para dos, con Double Machine Learning (Chernozhukov y coautores, 2018) y un bosque causal honesto (Wager y
Athey, 2018).

$$Y = \theta(X)\,T + g(X, W) + \varepsilon, \qquad T = m(X, W) + \eta$$

Dos modelos de árboles predicen el resultado $Y$ y la decisión $T$ a partir de los controles $W$, y el
bosque estima el efecto $\theta(X)$ sobre lo que esos modelos no explican.

**La pregunta táctica, la que plantea el reto.** ¿Qué hubiera pasado si el pitcher lanzaba slider en vez de
cambio en este conteo, contra este bateador? Cada lanzamiento de dos tipos (por ejemplo slider o cambio) es
una observación. $T$ es elegir el primero, $Y$ es su valor en carreras, $X$ es el conteo, si el bateador es del
mismo lado, el entorno (nivel del mar o altitud extrema) y si el lanzamiento anterior fue recta. $W$ controla
lo que confunde la elección, la calidad del lanzador, cuánto usa cada tipo, la vuelta al orden, las manos y
la velocidad de su recta. El resultado es una tabla por conteo, lado del bateador y entorno que dice qué
lanzamiento conviene, en casa y de visitante. Contrastamos slider contra cambio, slider contra recta, cambio
contra recta y curva contra slider.

**La pregunta de entorno.** ¿Cuánto cuesta la altura en carreras reales, y le cuesta distinto a cada
lanzador? Cada lanzador con al menos 120 lanzamientos en cada entorno aparece dos veces y se compara consigo
mismo. $T$ es lanzar en altura, $Y$ son sus carreras por cada 100 lanzamientos, y $X$ son sus rasgos (Stuff+,
velocidad, swings fallidos, rodados, extensión, mano y uso de cada tipo). Para no engañarnos, a cada lanzador
le damos el efecto de un bosque que no lo vio y aplicamos la prueba GATES (Chernozhukov y coautores, 2018).
Agrupamos por efecto predicho y comprobamos si el castigo observado sube de grupo en grupo.

## 4. Validación

### 4.1 La transferencia de forma

444 lanzadores tiraron en ambos entornos. Calibramos los exponentes con la mitad y dejamos la otra mitad
**sin tocar**. En esas 436 combinaciones predecimos lo que el lanzador tiró en altura a partir de lo que
tiró a nivel del mar.

| Error medio | Sin transferir | Sólo densidad | Nuestro modelo | Reducción |
|---|---|---|---|---|
| Quiebre vertical (in) | 2.573 | 1.119 | **0.802** | 68.8 % |
| Quiebre horizontal (in) | 2.932 | 1.612 | **0.875** | 70.2 % |
| Velocidad al plato (mph) | 1.323 | 0.578 | **0.574** | 56.6 % |

Si escalas todo sólo por la densidad del aire, sin la corrección de Reynolds, subestimas el efecto en
cerca de un tercio.

### 4.2 Calidad y robustez

| Prueba | Capa | Variables | RMSE | $R^2$ | Correlación |
|---|---|---|---|---|---|
| Modelo nulo, promedio por conteo | | | 0.26810 | 0.0000 | 0.005 |
| Holdout de lanzador | Stuff+ | 16 | 0.26797 | 0.0010 | 0.036 |
| Holdout de lanzador | Location+ | 23 | 0.26235 | 0.0425 | 0.207 |
| Holdout de lanzador | Pitching+ | 33 | 0.26225 | 0.0432 | 0.208 |
| Holdout de temporada | Stuff+ | 16 | 0.26626 | 0.0009 | 0.035 |
| Holdout de parque | Stuff+ | 16 | 0.27707 | $-0.0005$ | 0.022 |

Las tres capas vencen al modelo nulo con lanzadores que nunca vieron. El $R^2$ de un lanzamiento suelto
es bajo por construcción, porque su desenlace lo dominan el azar y la ubicación. Stuff+ no ve la
ubicación, así que su $R^2$ es el más bajo de los tres, y así debe ser. Location+ y Pitching+ suben
porque suman dónde llegó la pelota y el conteo.

**El holdout de parque no falla en el orden, falla en el nivel.** Un modelo entrenado sin altura
ordena bien los lanzamientos en altura (correlación positiva), pero espera las carreras de nivel del
mar. En altura todo cuesta más, y por eso su $R^2$ queda apenas bajo cero. Esa diferencia de nivel es
justo el efecto que medimos, y por eso transferimos la forma en lugar de confiar en un modelo entrenado
en otro aire.

**Stuff+ es un rasgo del lanzador, no suerte.** Partimos los lanzamientos de cada lanzador en dos
mitades al azar (602 lanzadores con al menos 150 por mitad). Su Stuff+ en una mitad correlaciona 0.988
con el de la otra. Sus carreras, sólo 0.293. Las carreras de unos cientos de lanzamientos son casi
ruido, y la forma no.

**Anticipa el futuro sin necesitar historial.** Con 114 lanzadores que tiraron al menos 300 veces en
2024 y 2025 y otras 300 en 2026, el Stuff+ del pasado correlaciona 0.218 con las carreras de 2026. Las
carreras del pasado, 0.196. La diferencia no es concluyente con esa muestra, pero Stuff+ lo logra con
la sola física, y a un prospecto lo puedes calificar desde su primera sesión de Trackman.

**Calibración.** La escala ordena carreras cuando agregas lanzamientos, que es donde importa.

| Stuff+ fuera de muestra | Lanzamientos | Carreras por 100, observadas | Carreras por 100, predichas |
|---|---|---|---|
| < 80 | 16,663 | +1.9 | +3.3 |
| 80 a 90 | 98,683 | +1.3 | +2.0 |
| 90 a 100 | 212,677 | +0.5 | +0.7 |
| 100 a 110 | 203,208 | $-0.3$ | $-0.5$ |
| 110 a 120 | 87,256 | $-1.3$ | $-1.8$ |
| 120 o más | 16,515 | $-2.5$ | $-3.1$ |

La relación baja en los seis tramos, sin excepción. De un extremo al otro hay unas 4.3 carreras por
cada 100 lanzamientos, sólo por la forma. Entre 80 y 120 está el 95 % de los lanzamientos, y ahí lo
predicho queda a menos de 0.7 carreras de lo observado. En los extremos el modelo exagera un poco, en
la dirección correcta.

## 5. Hipótesis

### 5.1 H1 · La baja densidad reduce el movimiento. Se confirma

**La física reproduce a Nathan.** Tomamos una recta con 18.0 pulgadas de quiebre a nivel del mar y la
volamos en otros aires con el integrador, calibrado sólo con datos de la LMB.

| Aire | Quiebre total | Según Nathan |
|---|---|---|
| Nivel del mar | 18.0 in | 18 |
| Coors Field, 1,609 m | **14.9 in** | 14 a 15 |
| Harp Helú, 2,240 m | **13.8 in** | |
| Coors, escalando sólo por densidad | 15.4 in | |

Una curva típica de 78 mph y 12.4 pulgadas de quiebre total cae 1.4 pulgadas menos en Coors y 2.0 menos
en el Harp Helú. Su quiebre total baja 2.5 y 3.4 pulgadas.

**Todos los tipos pierden Stuff+.** En los siete el intervalo de 95 % queda bajo cero.

| Tipo | Lanzadores | $\bar\Delta$ Stuff+ | IC 95 % | Cambio de elevación medido (in) |
|---|---|---|---|---|
| Cutter | 164 | $-2.97$ | $-3.46$ a $-2.53$ | $-2.50$ |
| Splitter | 43 | $-4.43$ | $-5.26$ a $-3.44$ | $-0.91$ |
| Slider | 644 | $-5.32$ | $-5.50$ a $-5.15$ | $-0.74$ |
| Curva | 333 | $-6.33$ | $-6.72$ a $-5.97$ | $+1.82$ |
| Cambio | 427 | $-7.42$ | $-7.78$ a $-7.07$ | $-2.25$ |
| Sinker | 489 | $-8.82$ | $-9.25$ a $-8.39$ | $-2.10$ |
| Recta | 708 | $-11.69$ | $-12.06$ a $-11.30$ | $-3.73$ |

La recta pierde casi cuatro veces lo que pierde el cutter. En carreras, su pérdida equivale a 1.6
carreras más por cada 100 rectas. La curva gana elevación, o sea que cae menos, y por eso pierde. Su
valor es caer. Entre los seis tipos con mediciones suficientes, el que más movimiento pierde en la
cancha es el que más Stuff+ pierde (correlación de rangos $-0.83$, $p = 0.04$).

### 5.2 H2 · El cambio gana valor relativo. Se confirma en parte

| Contra la recta del mismo lanzador | Lanzadores | Ventaja $\bar D$ | IC 95 % | Lanzadores donde gana |
|---|---|---|---|---|
| Splitter | 40 | +7.75 | +6.16 a +9.58 | 98 % |
| Cutter | 155 | +5.80 | +4.93 a +6.83 | 94 % |
| Slider | 555 | +5.50 | +5.02 a +5.97 | 86 % |
| **Cambio** | **372** | **+4.10** | **+3.48 a +4.69** | **80 %** |
| Curva | 289 | +4.06 | +3.32 a +4.83 | 80 % |
| Sinker | 386 | +1.92 | +1.59 a +2.26 | 68 % |

El cambio sí gana valor contra la recta, 4.1 puntos, y no es casualidad. Pero queda cuarto de seis,
empatado con la curva y detrás del splitter, el cutter y el slider. La razón está en su forma. Un cambio
de derecho se mueve unas 12 pulgadas hacia el lado del brazo, y ese movimiento también lo paga. En
altura no gana el que engaña por velocidad. Gana **el que nunca dependió del movimiento**. Por eso el
splitter, que engaña por velocidad y además casi no gira, gana más que todos.

### 5.3 H3 · Los lanzadores de rodados valen más en altura. Se confirma en parte

| Entorno | Pendiente $b_e$, carreras por 100 por cada 10 puntos de rodados | IC 95 % |
|---|---|---|
| Altura | $-0.38$ | $-0.62$ a $-0.13$ |
| Nivel del mar | $-0.16$ | $-0.36$ a $+0.07$ |
| Diferencia | $-0.22$ | $-0.52$ a $+0.08$ |

En altura los rodados previenen carreras con claridad. A nivel del mar el efecto no se distingue de
cero. La diferencia va en la dirección de la hipótesis ($p = 0.08$, una cola), pero no llega al 95 %. Por tercios, los lanzadores con pocos rodados (34 %) permiten 1.76 carreras más por
cada 100 lanzamientos en altura, y los de muchos rodados (50 %) sólo 1.37. En los batazos de la liga, el
rodado sube de 40.5 % a 44.8 % en altitud extrema y el jonrón por elevado sube de 12.4 % a 16.3 %.

### 5.4 H4 · Importa cuánto se mueve, no cuánto gira. Se confirma

| Grupo de variables en Stuff+ | Peso |
|---|---|
| Movimiento, los quiebres | 30 % |
| Velocidad | 25 % |
| Punto de salida y extensión | 24 % |
| **Giro en rpm** | **8 %** |
| Eficiencia de giro | 7 % |
| Eje de giro | 6 % |

El modelo sí usa el giro. Es la tercera de 16 variables, pero sobre todo para distinguir un tipo de
lanzamiento de otro. En el experimento controlado, 100 revoluciones más **con el mismo movimiento**
cambian Stuff+ en 0.05 puntos, nada. Una pulgada más de elevación **con el mismo giro** suma 2.61.
Y la ventaja del movimiento es la que el aire se lleva. Una recta B con 2,150 rpm y 18.0 pulgadas de
elevación vale 105.7 a nivel del mar, 18.1 puntos más que una recta A con más giro pero eje de bala
(2,650 rpm y 13.5 pulgadas, 87.6). En el Harp Helú B vale 86.0 y A 80.0. La ventaja se reduce a un
tercio.

## 6. Lo que significa para el club

### 6.1 La altitud borra la ventaja del bueno

Partimos las rectas en quintiles por su Stuff+ a nivel del mar. El castigo no es parejo. El quintil más
bajo pierde 3.8 puntos (de 89.6 a 85.8). El más alto pierde 19.4 (de 116.4 a 97.1) y queda bajo el
promedio. Lo que separa a una recta de élite de una mediocre es el movimiento, y el movimiento es lo que
el aire se lleva. Entre el 1 % mejor calificado, el slider pasa de 24 % a 52 % y la recta cae de 41 % a
1 %.

**Tres estadios, no dos.** El mismo lanzamiento, volado con el aire de cada categoría.

| | Nivel del mar | Altitud media | Altitud extrema |
|---|---|---|---|
| Índice de aire | 1.000 | 0.898 | 0.853 |
| Stuff+ de la liga | 103.1 | 97.1 | 94.8 |
| Recta | 102.5 | 93.9 | 90.9 |
| Cutter | 102.1 | 100.6 | 99.2 |

La altitud media ya cobra el 73 % del castigo. Un lanzador que viene de un parque de altura media llega
al Harp Helú con la mayor parte del ajuste hecho.

### 6.2 El perfil físico ideal

Promediamos el 1 % mejor calificado en cada aire, sólo lanzadores derechos y sólo lanzamientos reales.
Una rejilla libre produciría combinaciones que ningún brazo hace.

| Variable | Élite a nivel del mar | Élite en altura | Mediana de la liga |
|---|---|---|---|
| Velocidad (mph) | 88.3 | 85.1 | 88.9 |
| Elevación (in) | 4.4 | $-3.3$ | 9.2 |
| Movimiento lateral (in) | 0.7 | $-4.4$ | 7.3 |
| Movimiento total (in) | 17.3 | 11.3 | 14.7 |
| Eficiencia de giro | 0.84 | 0.55 | 0.81 |
| Giro (rpm) | 2,554 | 2,504 | 2,328 |

La élite de altura es de rompientes que caen y cortan hacia el guante, no de rectas que suben. Gira casi
lo mismo que la otra, pero convierte mucho menos de ese giro en movimiento. No apuesta al Magnus.

### 6.3 Por lanzador

Analizamos 561 lanzadores con al menos 300 lanzamientos. **21 aguantan**, es decir, pierden menos de
3.7 puntos (media carrera por cada 100 lanzamientos), y 354 pierden más de 7.4 (una carrera). Los que más
pierden son buenos a nivel del mar porque se mueven mucho. Lanzador 174 (recta y cambio) baja de 111.3 a
92.8. Tu perfil de fichaje es Lanzador 1099 (cutter, slider y curva). Vale 110.2 a nivel del mar y 109.8
en el Harp Helú, pierde 0.4 puntos, el segundo mejor Stuff+ de la liga en altura, y es de los más
constantes entre juegos ($\pm 2.6$ contra $\pm 4.5$ de la mediana).

### 6.4 Lo que dice el Causal Forest

**El costo promedio es firme.** Lanzar en altura cuesta **1.52 carreras más por cada 100 lanzamientos** (IC 90 %
de 1.27 a 1.78), medido en el marcador y sin usar Stuff+. Es la misma dirección que predice la física, y
casi el mismo tamaño. La liga pierde 8.3 puntos de Stuff+ al pasar de nivel del mar a altitud extrema, y
cada punto vale 0.135 carreras por cada 100 lanzamientos. Son 1.12 carreras, unas tres cuartas partes del
costo observado. El resto lo pone el bateador, porque en altura el batazo también viaja más.

**Las diferencias entre lanzadores no se sostienen.** El bosque estima efectos entre 1.27 y 1.76, y para 331
de 333 lanzadores el intervalo incluye el promedio. En la prueba fuera de muestra, el castigo observado no
sube con el efecto predicho (pendiente de $-1.95$, IC 95 % de $-4.0$ a $+0.2$). El bosque sí aprende la misma
dirección que Stuff+ (correlación de 0.17 fuera de muestra, $p = 0.002$), pero las carreras de unos cientos
de lanzamientos tienen demasiado azar para confirmarlo lanzador por lanzador.

Ese resultado justifica el diseño del trabajo. Para separar a un lanzador de otro necesitas algo estable, y
eso es su forma, medida con física. Las carreras confirman el tamaño del castigo promedio.

**La pregunta táctica, en casa sí cambia la respuesta.** Comparamos cuatro pares de lanzamientos con
150,000 lanzamientos cada uno y medimos el efecto en 48 celdas (12 conteos, dos lados del bateador y dos
entornos). Slider en vez de cambio ahorra 0.31 carreras por cada 100 lanzamientos a nivel del mar y 1.01 en
altura. De las 10 celdas donde el intervalo de 90 % no cruza el cero, 9 están en altura y todas favorecen
al slider, sobre todo contra el bateador del lado contrario y con el conteo en contra (2 bolas o más). Es
lo que predice H1, porque el cambio pierde más movimiento que el slider. A nivel del mar, con 3 bolas y
bateador del mismo lado, la recta le gana al cambio por 3 a 5 carreras por cada 100. Con 48 celdas por par
esperarías unas 5 falsas por azar, así que lee las celdas sueltas como pistas y el patrón como el
resultado. Las tablas completas están en la pestaña Causal Forest del dashboard.

## 7. Recomendaciones

**Fichajes.** No pagues de más por movimiento. Una recta del quintil más alto llega a 2,240 metros
valiendo 97.1 en lugar de 116.4. El mercado cobra esa prima a nivel del mar, y tú la pagarías por algo
que en tu estadio no existe.

**Perfil.** Busca arsenales de cutter, slider y splitter, y lanzadores que provoquen rodados. En altura un
elevado viaja 31 pies más (de 292 a 323) y sale del parque 16.3 % de las veces contra 12.4 %.

**Rotación.** Abre en casa con los lanzadores que aguantan (pestaña Lanzadores del dashboard). Los que
pierden mucho rinden más de visitante.

**En el juego.** En casa, cuando el pitcher va atrás en el conteo contra un bateador del lado contrario,
pide slider antes que cambio. El Causal Forest táctico encuentra 10 celdas firmes en ese par, y 9 están en altura y favorecen al slider.

**Prospectos.** Hazte cinco preguntas, en este orden.
1. ¿Cuánto de su valor es movimiento? Si su Stuff+ está en el quintil más alto por su quiebre, esa
   ventaja no viaja a la Ciudad de México.
2. ¿Cuánto de su giro se vuelve movimiento? La eficiencia alta ayuda a nivel del mar y te expone en
   altura (élite de altura 0.55 contra 0.84).
3. ¿Su arsenal se apoya en cutter, slider o splitter, o en recta y curva? El primero pierde poco y el
   segundo llega devaluado.
4. ¿Provoca rodados? Es el único batazo que el aire no ayuda.
5. Pasa sus números de Trackman por el simulador. Te da su Stuff+ en los dos estadios.

## 8. Límites

- **No identificamos estadios.** La altitud extrema agrupa varios parques, y el Harp Helú es el más alto.
- **No separamos aire de clima.** El índice de arrastre junta densidad, temperatura y humedad. Sirve para
  predecir movimiento, no para atribuirlo sólo a la altitud.
- **No modelamos al bateador.** Desde la física, el barril casi no se puede predecir (1 % de habilidad).
- **Stuff+ no es causal.** Es un modelo de valoración. Para las preguntas de qué hubiera pasado usamos el
  Causal Forest, que confirma el costo promedio pero no separa a un lanzador de otro.
- **El exponente de Reynolds es empírico.** Lo calibramos y verificamos fuera de muestra, pero no sale de
  primeros principios.

## 9. Reproducción

```bash
uv venv && uv pip install -e .
python scripts/01_physics.py       # densidad del aire y transferencia de forma
python scripts/02_features.py      # secuencia, arsenal, objetivos
python scripts/03_models.py        # las tres capas y sus holdouts
python scripts/04_export.py        # modelo y tablas al simulador
python scripts/05_deliverables.py  # entregables 1, 2 y 3
python scripts/07_jurado.py        # tabla por lanzador, calibración y mapa
python scripts/08_hipotesis.py     # H1 a H4
python scripts/09_causal_forest.py # Causal Forest de entorno
python scripts/10_local_extras.py  # Causal Forest táctico, SHAP y tres entornos
cd app && npm install && npm test && npm run dev
```

## Referencias

- Athey, S., Tibshirani, J. y Wager, S. (2019). Generalized random forests. *Annals of Statistics*, 47(2).
- Chernozhukov, V. y coautores (2018). Double/debiased machine learning for treatment and structural parameters. *The Econometrics Journal*, 21(1).
- Chernozhukov, V., Demirer, M., Duflo, E. y Fernández Val, I. (2018). Generic machine learning inference on heterogeneous treatment effects in randomized experiments. NBER Working Paper 24678.
- Efron, B. (1979). Bootstrap methods, another look at the jackknife. *Annals of Statistics*, 7(1).
- Huang, G. y Hsu, M. (2021). Big data analytics in baseball, a review. *SAGE Open*, 11(4).
- Ke, G. y coautores (2017). LightGBM, a highly efficient gradient boosting decision tree. *NeurIPS*.
- Nathan, A. *The effect of altitude on baseball trajectories.* The Physics of Baseball.
- SABR. *High altitude offense.* Baseball Research Journal.
- Tango, T., Lichtman, M. y Dolphin, A. (2007). *The Book, Playing the Percentages in Baseball.*
- Wager, S. y Athey, S. (2018). Estimation and inference of heterogeneous treatment effects using random forests. *JASA*, 113(523).

## Anexo A · Modelos de componente

Estos modelos explican de dónde sale el valor y no entran en Stuff+. La habilidad mide cuánto mejoran
sobre la tasa base, con holdout de lanzador.

| Objetivo | Lanzamientos | Brier | Habilidad |
|---|---|---|---|
| Strike cantado | 336,973 | 0.0562 | +72.7 % |
| Swing | 635,002 | 0.1486 | +40.4 % |
| Persecución | 411,912 | 0.1457 | +35.3 % |
| Swing fallido | 298,029 | 0.1475 | +19.4 % |
| Contacto débil | 115,948 | 0.1956 | +10.1 % |
| Rodado | 115,948 | 0.2288 | +6.3 % |
| Contacto duro | 115,948 | 0.1668 | +5.2 % |
| Barril | 115,948 | 0.0244 | +0.8 % |

El arsenal se nota donde actúa su mecanismo, en el swing fallido. Ahí la habilidad sube de 4.5 % con
sólo la física a 18.9 % con ubicación y a 19.4 % con arsenal y secuencia.

## Anexo B · Glosario

| Término | Qué significa |
|---|---|
| Stuff+ | Calidad del lanzamiento por cómo sale de la mano. 100 es el promedio y 10 puntos son una desviación estándar |
| Location+ y Pitching+ | La misma escala, sumando ubicación y conteo, y después arsenal y secuencia |
| Elevación | Cuánto cae menos una recta de lo que caería sin giro |
| Eficiencia de giro | La parte del giro que produce movimiento |
| Rodado y elevado | Batazo por el suelo y batazo por el aire |
| Arsenal | Los tipos que un lanzador usa al menos 8 % de las veces |
| Tipos de lanzamiento | Recta, sinker, cutter, slider, curva, cambio y splitter. El anexo del dashboard dibuja el movimiento real de cada uno |
| Intervalo de confianza de 95 % | El rango donde está el valor real con alta probabilidad. Si no cruza el cero, el efecto no es casualidad |

*Usamos los datos de la LMB sólo para esta competencia. Este documento presenta resultados, no datos.*
