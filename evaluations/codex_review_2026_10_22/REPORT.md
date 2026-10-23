# Revisión y evaluación aislada de Diablos Stuff+

Fecha local 22 de octubre de 2026. Resultado de la revisión **necesita revisión**. Cobertura parcial del proyecto y completa de las pruebas descritas. No se implementaron cambios de producción. Sólo se crearon archivos dentro de esta carpeta.

La base del proyecto es aprovechable. El evaluador de árboles del navegador coincide exactamente con LightGBM. Las mejoras prioritarias son corregir la transferencia de variables y fortalecer la validación. El R² por lanzamiento sigue siendo pequeño. Una correlación alta entre mitades describe repetibilidad de una calificación y no demuestra por sí sola que esa calificación anticipe carreras o el costo individual de la altura.

## Qué se evaluó

Fuente principal `artifacts/model_frame.pkl`, 635,002 lanzamientos de 2024 a 2026, 2,127 juegos y 1,135 grupos de lanzador incluido el desconocido. El modelo de producción, sus exportaciones y los resultados previos se leyeron del repositorio. No se descargaron datos ni se publicaron resultados.

Se entrenaron cuatro especificaciones en cuatro pliegues separados por lanzador y dos cortes cronológicos. Cada entrenamiento usa 400 árboles y los parámetros regularizados de Stuff+. La contracción usa la misma predicción del modelo actual y reduce a la mitad su desviación frente a la media de entrenamiento. No requiere otro ajuste. En total se ajustaron 24 modelos. Los candidatos se fijaron antes de ver los cortes cronológicos. No se buscaron parámetros.

Las medias de valor terminal, la tabla de valor por estado del conteo y el modelo nulo se ajustan únicamente con las filas de entrenamiento. Todas las variantes se comparan con el mismo objetivo de evaluación dentro de cada corte. Se conserva la definición de transición de conteo de producción. No se usan la ubicación, el tipo de lanzamiento ni el entorno como variables de entrada del calificador. La variante residual usa entorno y conteo sólo para transformar su objetivo de entrenamiento.

Límite importante de aislamiento estadístico. Las variables de física ya venían preparadas en el archivo original. No se reajustó su calibración dentro de cada pliegue. La evaluación resuelve la fuga de tablas de objetivo y baseline, pero no equivale a una validación anidada de todo el pipeline. El año 2026 ya fue usado en el desarrollo anterior del proyecto. Los cortes cronológicos nuevos son retrospectivos y no constituyen un conjunto final nunca inspeccionado.

## Resultados con lanzadores separados

| Variante | RMSE | R² | Mejora MSE contra conteo |
|---|---:|---:|---:|
| Actual reentrenado | 0.26799662 | 0.0008977 | 0.0851 % |
| Movimiento por brazo y eje circular | 0.26796834 | 0.0011086 | 0.1062 % |
| Sin tres variables de frenado | 0.26800375 | 0.0008446 | 0.0797 % |
| Objetivo residual por conteo y entorno | 0.26803736 | 0.0005940 | 0.0547 % |
| Actual con contracción fija de 50 % | 0.26796354 | 0.0011444 | 0.1097 % |
| Promedio por conteo de entrenamiento | 0.26811067 | 0.0000472 | 0.0000 % |

R² es el coeficiente contra la media del conjunto evaluado. La última columna mide la reducción de MSE frente al baseline por conteo aprendido en entrenamiento. Son denominadores distintos. Un R² negativo puede coexistir con una mejora frente a ese baseline si hay desfase entre temporadas.

La codificación por brazo y eje circular cambia R² de 0.0008977 a 0.0011086. La diferencia absoluta es 0.0002109. Son fracciones pequeñas de la varianza del resultado de un lanzamiento. El resultado justifica seguir probando la representación, no anunciar una mejora grande de calidad ni sustituir el modelo sin validar su transferencia.

Intervalos pareados de mejora de MSE frente al actual. Un número positivo favorece al candidato. Bootstrap de 2,000 muestras por lanzador con las predicciones ya ajustadas.

| Variante | Mejora media MSE | IC 95 % |
|---|---:|---:|
| Actual con contracción fija de 50 % | 0.000017733 | [0.000008051, 0.000027856] |
| Movimiento por brazo y eje circular | 0.000015160 | [0.000007730, 0.000023001] |
| Sin tres variables de frenado | -0.000003820 | [-0.000012144, 0.000004385] |
| Objetivo residual por conteo y entorno | -0.000021835 | [-0.000030785, -0.000013271] |

Estos intervalos capturan variación de los lanzadores evaluados, no toda la incertidumbre de volver a entrenar, elegir variantes o preparar la física. No se corrigen por comparar varias variantes.

La contracción de 50 % mejora la calibración de carreras en los holdouts y en ambos cortes cronológicos, pero su intervalo de mejora en 2026 incluye cero. Además, no cambia el orden de los lanzamientos. Si se vuelve a estimar centro y desviación estándar para construir Stuff+, cualquier transformación afín positiva se cancela y Stuff+ queda igual. Es una candidata de calibración del valor crudo de carreras, no una mejora demostrada del ranking ni del simulador.

## Cortes cronológicos

Entrenamiento hasta 2024 y evaluación en 2025.

| Variante | RMSE | R² | Mejora MSE contra conteo |
|---|---:|---:|---:|
| Actual reentrenado | 0.27089431 | -0.0003725 | 0.0061 % |
| Actual con contracción fija de 50 % | 0.27077897 | 0.0004792 | 0.0912 % |
| Movimiento por brazo y eje circular | 0.27088261 | -0.0002861 | 0.0147 % |
| Sin tres variables de frenado | 0.27090716 | -0.0004674 | -0.0034 % |
| Objetivo residual por conteo y entorno | 0.27090885 | -0.0004799 | -0.0046 % |
| Promedio por conteo de entrenamiento | 0.27090259 | -0.0004336 | 0.0000 % |

Entrenamiento hasta 2025 y evaluación en 2026.

| Variante | RMSE | R² | Mejora MSE contra conteo |
|---|---:|---:|---:|
| Actual reentrenado | 0.26638911 | 0.0010832 | 0.1051 % |
| Actual con contracción fija de 50 % | 0.26637391 | 0.0011972 | 0.1165 % |
| Movimiento por brazo y eje circular | 0.26639582 | 0.0010329 | 0.1001 % |
| Sin tres variables de frenado | 0.26643299 | 0.0007541 | 0.0722 % |
| Objetivo residual por conteo y entorno | 0.26644742 | 0.0006458 | 0.0614 % |
| Promedio por conteo de entrenamiento | 0.26652926 | 0.0000318 | 0.0000 % |

No hay outcomes de años posteriores en estos ajustes de LightGBM ni en sus tablas de objetivo. Persisten las limitaciones de preparación global de física y de selección histórica del conjunto 2026. Esta prueba predice el valor de los lanzamientos del año evaluado a partir de sus características medidas. No prueba que un scouting antes de la temporada anticipe el rendimiento de un jugador.

## Problemas priorizados y cambios propuestos

### P1 · La referencia de transferencia mezcla mediciones observadas con forma de nivel del mar

`scripts/04_export.py` 71 a 75 y `scripts/05_deliverables.py` 45 a 49 pasan las variables observadas a `transfer_features`, pero le entregan una referencia a nivel del mar. En `src/stuffplus/physics.py` 440 a 449, `VertBreak` y `spin_efficiency` se actualizan mediante diferencias o razones contra esa referencia. Para un lanzamiento observado en altura, la forma de origen no coincide con las variables de origen. El patrón también aparece en los scripts 10 y 11.

La prueba de identidad en `transfer_identity_results.json` demuestra que transferir a la misma densidad observada no conserva todas las variables con la referencia actual. Con referencia observada sí las conserva. En una muestra fija de 5,000 lanzamientos, sin reentrenar, corregir únicamente la referencia cambia la pérdida media de **-8.215 a -9.250 puntos**. La diferencia absoluta media por lanzamiento es 2.664 puntos. La media de las rectas pasa de −11.436 a −13.584.

Cambio propuesto. Usar la forma observada como referencia cuando X contiene las mediciones observadas, o normalizar primero todo X a nivel del mar. Luego recalcular exportaciones, recomendaciones, intervalos y perfiles. Esta comparación demuestra un error de consistencia y su materialidad. No establece que toda la física ni las nuevas recomendaciones sean correctas.

### P1 · La ejecución documentada cambia al modelo rechazado

`scripts/03_models.py` 41 usa `STUFF_ENTRENA=mar` por defecto. El artefacto servido registra `todo` y el CLAUDE raíz dice que la versión de mar fue descartada. La receta del README no fija el entorno. Un rerun literal puede reemplazar producción con otra especificación.

Cambio propuesto. Configuración explícita de entrenamiento, manifiesto con hashes del código, datos y parámetros, y comprobación de coherencia antes de exportar. Para reproducir la especificación servida hace falta `STUFF_ENTRENA=todo`. No correr el pipeline de producción durante esta revisión.

### P1 · La evidencia de predicción futura está sobreafirmada

`scripts/11_robustez.py` 274 a 290 toma puntuaciones OOF por lanzador que fueron aprendidas con todos los años. Excluye al lanzador evaluado, pero permite que los resultados de otros lanzadores de años futuros entrenen la puntuación histórica. Las líneas 299 a 309 ajustan y califican las regresiones incrementales sobre las mismas observaciones. Añadir una variable al ajuste OLS sólo puede conservar o aumentar su R² dentro de muestra.

Al separar por lanzador la segunda regresión en los mismos 336 pares, el incremento baja del 0.0271 publicado a **0.0097088**. La mejora pareada de MSE tiene IC 95 % [-0.000006805, 0.000011521] e incluye cero. Este diagnóstico sólo repara la segunda regresión. Conserva las puntuaciones históricas originales y por eso no es prospectivo.

Cambio propuesto. Entrenar el calificador sólo con años disponibles en la fecha de decisión, generar puntuaciones históricas fuera de muestra y evaluar el pronóstico completo en un periodo posterior. Usar pérdidas pareadas e intervalos agrupados para la comparación incremental.

### P1 · El 39 % es una descomposición de modelo con supuestos

`scripts/11_robustez.py` 166 a 170 define costo total como resultados observados en altura menos la predicción de un modelo de mar. La diferencia contiene calibración del modelo y selección de bateadores, conteos y temporadas. Dividir el cambio predicho de forma por ese total no identifica una fracción causal del costo de la altura. Los R² de parque guardados son negativos.

Cambio propuesto. Presentar 38.5 % como descomposición dependiente del modelo, junto con sus supuestos y sensibilidades. Separar el mecanismo físico de la evidencia causal. El conjunto no trae identificador de estadio, por lo que el holdout existente de `altitude_category` es un holdout de cubeta de altitud y no de estadio independiente.

### P2 · Fuga en tablas del objetivo y baseline

`scripts/02_features.py` 24 a 25 calcula el objetivo antes de dividir los datos. `src/stuffplus/targets.py` 42 a 50 ajusta valores terminales y por conteo con todo el conjunto. `scripts/03_models.py` 55 a 57 hace lo mismo con el baseline. La evaluación nueva ajusta esas tablas en entrenamiento. La diferencia media absoluta entre las etiquetas por pliegue y las guardadas es 0.0011683 carreras por lanzamiento. El efecto es pequeño, pero la ventaja predictiva evaluada también lo es.

### P2 · El experimento H4 mide cancelación de extremos

`app/scripts/experimentos.ts` 108 a 112 usa la diferencia entre el primer y último punto de giro. El efecto publicado es −0.01 por 100 rpm, pero la curva guardada abarca 98.1 a 104.0 puntos. El cambio absoluto medio entre pasos contiguos de 100 rpm es **1.7375** y llega a +2.8. La curva no demuestra insensibilidad local. Mostrar diferencias contiguas, más formas de lanzamiento y los supuestos de reconstrucción de eficiencia.

### P2 · El simulador y las pruebas necesitan criterios de aceptación

El desacuerdo medio entre el preset típico del simulador y la media poblacional exportada es **4.2303 puntos** en siete tipos. No deben ser idénticos porque representan objetos distintos, pero hay que explicar y caracterizar la discrepancia después de corregir la referencia. No ajustar la dispersión para forzar coincidencia con una media poblacional.

`npm test` ejecuta sólo la prueba de física. La prueba `gbm.test.ts` no está incluida. El script `consistencia.ts` imprime el desacuerdo sin umbral ni salida fallida. En esta revisión se ejecutaron ambas pruebas mediante compilación en memoria. Física pasó y los 12 fixtures de árboles coincidieron exactamente. TypeScript pasó con `--noEmit --incremental false`.

### P2 · Los turnos sin evento terminal necesitan una sensibilidad del objetivo

Se encontraron **6,346 de 171,020 turnos reconstruidos**, 3.71 %, con evento `none`. Sus últimos registros incluyen bolas, fouls y strikes. El pipeline les asigna peso cero y los usa al estimar el valor de los conteos. No se afirmó que los 6,346 sean errores de datos. Pueden reflejar registros incompletos o reconstrucción de turnos. Comparar una tabla de conteos calculada sólo con turnos completos y documentar cómo cambian los resultados. Los 2,280 golpes por lanzamiento coinciden con su flag reconstruido, sin discrepancias.

### P2 · La inferencia causal y la repetibilidad tienen límites distintos

El Causal Forest usa tasas de swings fallidos y rodados agregadas sobre ambos entornos como covariables. Son resultados potencialmente posteriores al tratamiento. Hace falta definir variables previas al entorno y controles pertinentes antes de atribuir causalidad. Conservar la advertencia existente de que la heterogeneidad individual no supera GATES.

La confiabilidad de 0.988 usa mitades intercaladas del mismo historial. Agregar partidos separados y periodos consecutivos para evaluar estabilidad temporal. Los promedios de arsenal usan la temporada completa y son apropiados para describirla, pero no están disponibles al comienzo de esa temporada. La referencia llamada recta primaria promedia los tipos de recta y no selecciona el dominante.

## Cobertura y calidad

| Área | Evaluación | Evidencia y límites |
|---|---|---|
| Fuentes y procedencia | Parcial | Datos y artefactos locales, hashes originales y comprobación final. No validación independiente de la medición Trackman. |
| Cálculos y objetivos | Necesita revisión | Baseline y etiquetas por pliegue, 24 ajustes nuevos, evento terminal y comparación incremental. |
| Conclusiones principales | Necesita revisión | Transferencia, H4, predicción futura y fracción causal tienen problemas demostrados o límites materiales. |
| Consistencia entre artefactos | Muestra revisada | Copias JSON comparadas y fixtures exactos. No se regeneraron PDF ni documentos de entrega. |
| Claridad y utilidad | Parcial | Se revisaron claims técnicos y límites. No fue una evaluación con usuarios o entrenadores. |
| Apariencia e interacción | No evaluada | Sin inspección visual del navegador ni recorrido completo de pestañas. |

| Comprobación | Estado | Alcance |
|---|---|---|
| Modelo del navegador contra LightGBM | Pasa | 12 fixtures, error máximo 0. |
| Prueba existente de física | Pasa | Prueba ejecutada con bundle en memoria. |
| TypeScript | Pasa | Sin emitir archivos ni caché incremental. |
| Identidad de transferencia | Falla actual, pasa alternativa | Muestra de 128 filas, se conservan originales. |
| Resultados de modelos | Terminados | Cuatro pliegues y dos cortes, tablas completas en JSON. |
| Aislamiento de archivos | Ver manifiesto | Se observaron escrituras y commits externos durante la revisión. No atribuirlos a estos scripts ni revertirlos. |

No se inventa un porcentaje global de precisión de auditoría. El inventario total de componentes del dashboard no fue verificado. Ningún resultado anterior equivale a aprobación completa de la app o de los documentos.

## Orden recomendado

1. Corregir y probar la referencia de transferencia en una rama autorizada. Recalcular dependencias y revisar si cambia la selección de lanzadores.
2. Fijar la configuración de producción y guardar procedencia de cada ejecución.
3. Incorporar objetivos y baseline aprendidos sólo en entrenamiento, y reparar la evidencia de predicción futura.
4. Evaluar la representación por brazo y eje circular en periodos adicionales. Adaptar Python y TypeScript a la vez si se adopta.
5. Reescribir claims de H4 y de causalidad, ampliar pruebas automáticas y medir sensibilidad a turnos incompletos.

No se recomienda reemplazar el modelo de producción sólo porque un candidato tenga mejor R² en estas pruebas exploratorias.

## Archivos y reproducción

`results.json` contiene todos los resultados nuevos, pliegues, parámetros, intervalos, tiempos y versiones. `evaluation.log` conserva la salida. `data_audit.json` incluye el resultado OOF original separado del protocolo nuevo. `target_and_future_diagnostics.json`, `app_checks.json`, `transfer_reference_checks.json` y `transfer_identity_results.json` contienen los diagnósticos detallados. `verification_results.json` y los logs registran pruebas de ejecución. `target_reconstruction_check.json` confirma que la implementación de las transiciones reproduce las etiquetas originales cuando usa la misma tabla global. `original_files.json` y `integrity_check.json` registran integridad y cambios concurrentes. `CLAUDE.md` es el handoff local de esta evaluación. El CLAUDE de la raíz permanece fuera del alcance de edición.

Los scripts de evaluación se pueden copiar a una carpeta hermana, manteniendo la misma profundidad, para repetir sin sobrescribir estos resultados. `eval_app.mjs` se niega a sobrescribir su JSON. `eval_transfer_reference.py` recibe una ruta nueva de salida. El benchmark no escribe modelos de producción, no cambia la app y no publica resultados.
