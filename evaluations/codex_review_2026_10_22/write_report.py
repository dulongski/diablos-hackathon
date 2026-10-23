"""Package completed isolated review results. Writes only the review report and nested CLAUDE.md."""
from pathlib import Path
import json
O=Path(__file__).resolve().parent
r=json.loads((O/'results.json').read_text()); a=json.loads((O/'app_checks.json').read_text()); t=json.loads((O/'transfer_reference_checks.json').read_text()); d=json.loads((O/'target_and_future_diagnostics.json').read_text())
assert '2026' in r['chronological'] and 'runtime_seconds' in r, 'Benchmark must finish before reporting.'
labels={'current':'Actual reentrenado','current_shrink_half':'Actual con contracción fija de 50 %','mirror_circular':'Movimiento por brazo y eje circular','no_drag':'Sin tres variables de frenado','environment_residual':'Objetivo residual por conteo y entorno','count_baseline':'Promedio por conteo de entrenamiento'}
def table(ms):
 lines=['| Variante | RMSE | R² | Mejora MSE contra conteo |','|---|---:|---:|---:|']
 for k,v in ms.items():
  lines.append(f"| {labels[k]} | {v['rmse']:.8f} | {v['r2']:.7f} | {100*v['skill_vs_training_count_baseline']:.4f} % |")
 return '\n'.join(lines)
ci=[]
for k in ['current_shrink_half','mirror_circular','no_drag','environment_residual']:
 p=r['grouped'][k]['paired_vs_current']; lo,hi=p['ci95']; ci.append(f"| {labels[k]} | {p['mse_improvement']:.9f} | [{lo:.9f}, {hi:.9f}] |")
mirror=r['grouped']['mirror_circular']; curr=r['grouped']['current']; delta=mirror['r2']-curr['r2']
report=f'''# Revisión y evaluación aislada de Diablos Stuff+

Fecha local 22 de octubre de 2026. Resultado de la revisión **necesita revisión**. Cobertura parcial del proyecto y completa de las pruebas descritas. No se implementaron cambios de producción. Sólo se crearon archivos dentro de esta carpeta.

La base del proyecto es aprovechable. El evaluador de árboles del navegador coincide exactamente con LightGBM. Las mejoras prioritarias son corregir la transferencia de variables y fortalecer la validación. El R² por lanzamiento sigue siendo pequeño. Una correlación alta entre mitades describe repetibilidad de una calificación y no demuestra por sí sola que esa calificación anticipe carreras o el costo individual de la altura.

## Qué se evaluó

Fuente principal `artifacts/model_frame.pkl`, 635,002 lanzamientos de 2024 a 2026, 2,127 juegos y 1,135 grupos de lanzador incluido el desconocido. El modelo de producción, sus exportaciones y los resultados previos se leyeron del repositorio. No se descargaron datos ni se publicaron resultados.

Se entrenaron cuatro especificaciones en cuatro pliegues separados por lanzador y dos cortes cronológicos. Cada entrenamiento usa 400 árboles y los parámetros regularizados de Stuff+. La contracción usa la misma predicción del modelo actual y reduce a la mitad su desviación frente a la media de entrenamiento. No requiere otro ajuste. En total se ajustaron 24 modelos. Los candidatos se fijaron antes de ver los cortes cronológicos. No se buscaron parámetros.

Las medias de valor terminal, la tabla de valor por estado del conteo y el modelo nulo se ajustan únicamente con las filas de entrenamiento. Todas las variantes se comparan con el mismo objetivo de evaluación dentro de cada corte. Se conserva la definición de transición de conteo de producción. No se usan la ubicación, el tipo de lanzamiento ni el entorno como variables de entrada del calificador. La variante residual usa entorno y conteo sólo para transformar su objetivo de entrenamiento.

Límite importante de aislamiento estadístico. Las variables de física ya venían preparadas en el archivo original. No se reajustó su calibración dentro de cada pliegue. La evaluación resuelve la fuga de tablas de objetivo y baseline, pero no equivale a una validación anidada de todo el pipeline. El año 2026 ya fue usado en el desarrollo anterior del proyecto. Los cortes cronológicos nuevos son retrospectivos y no constituyen un conjunto final nunca inspeccionado.

## Resultados con lanzadores separados

{table(r['grouped'])}

R² es el coeficiente contra la media del conjunto evaluado. La última columna mide la reducción de MSE frente al baseline por conteo aprendido en entrenamiento. Son denominadores distintos. Un R² negativo puede coexistir con una mejora frente a ese baseline si hay desfase entre temporadas.

La codificación por brazo y eje circular cambia R² de {curr['r2']:.7f} a {mirror['r2']:.7f}. La diferencia absoluta es {delta:.7f}. Son fracciones pequeñas de la varianza del resultado de un lanzamiento. El resultado justifica seguir probando la representación, no anunciar una mejora grande de calidad ni sustituir el modelo sin validar su transferencia.

Intervalos pareados de mejora de MSE frente al actual. Un número positivo favorece al candidato. Bootstrap de 2,000 muestras por lanzador con las predicciones ya ajustadas.

| Variante | Mejora media MSE | IC 95 % |
|---|---:|---:|
{chr(10).join(ci)}

Estos intervalos capturan variación de los lanzadores evaluados, no toda la incertidumbre de volver a entrenar, elegir variantes o preparar la física. No se corrigen por comparar varias variantes.

## Cortes cronológicos

Entrenamiento hasta 2024 y evaluación en 2025.

{table(r['chronological']['2025']['metrics'])}

Entrenamiento hasta 2025 y evaluación en 2026.

{table(r['chronological']['2026']['metrics'])}

No hay outcomes de años posteriores en estos ajustes de LightGBM ni en sus tablas de objetivo. Persisten las limitaciones de preparación global de física y de selección histórica del conjunto 2026. Esta prueba predice el valor de los lanzamientos del año evaluado a partir de sus características medidas. No prueba que un scouting antes de la temporada anticipe el rendimiento de un jugador.

## Problemas priorizados y cambios propuestos

### P1 · La referencia de transferencia mezcla mediciones observadas con forma de nivel del mar

`scripts/04_export.py` 71 a 75 y `scripts/05_deliverables.py` 45 a 49 pasan las variables observadas a `transfer_features`, pero le entregan una referencia a nivel del mar. En `src/stuffplus/physics.py` 440 a 449, `VertBreak` y `spin_efficiency` se actualizan mediante diferencias o razones contra esa referencia. Para un lanzamiento observado en altura, la forma de origen no coincide con las variables de origen. El patrón también aparece en los scripts 10 y 11.

La prueba de identidad en `transfer_identity_results.json` demuestra que transferir a la misma densidad observada no conserva todas las variables con la referencia actual. Con referencia observada sí las conserva. En una muestra fija de 5,000 lanzamientos, sin reentrenar, corregir únicamente la referencia cambia la pérdida media de **{t['existing_sea_reference_delta_mean']:.3f} a {t['observed_reference_delta_mean']:.3f} puntos**. La diferencia absoluta media por lanzamiento es {t['corrected_minus_existing_delta']['mean_abs']:.3f} puntos. La media de las rectas pasa de −11.436 a −13.584.

Cambio propuesto. Usar la forma observada como referencia cuando X contiene las mediciones observadas, o normalizar primero todo X a nivel del mar. Luego recalcular exportaciones, recomendaciones, intervalos y perfiles. Esta comparación demuestra un error de consistencia y su materialidad. No establece que toda la física ni las nuevas recomendaciones sean correctas.

### P1 · La ejecución documentada cambia al modelo rechazado

`scripts/03_models.py` 41 usa `STUFF_ENTRENA=mar` por defecto. El artefacto servido registra `todo` y el CLAUDE raíz dice que la versión de mar fue descartada. La receta del README no fija el entorno. Un rerun literal puede reemplazar producción con otra especificación.

Cambio propuesto. Configuración explícita de entrenamiento, manifiesto con hashes del código, datos y parámetros, y comprobación de coherencia antes de exportar. Para reproducir la especificación servida hace falta `STUFF_ENTRENA=todo`. No correr el pipeline de producción durante esta revisión.

### P1 · La evidencia de predicción futura está sobreafirmada

`scripts/11_robustez.py` 274 a 290 toma puntuaciones OOF por lanzador que fueron aprendidas con todos los años. Excluye al lanzador evaluado, pero permite que los resultados de otros lanzadores de años futuros entrenen la puntuación histórica. Las líneas 299 a 309 ajustan y califican las regresiones incrementales sobre las mismas observaciones. Añadir una variable al ajuste OLS sólo puede conservar o aumentar su R² dentro de muestra.

Al separar por lanzador la segunda regresión en los mismos 336 pares, el incremento baja del 0.0271 publicado a **{d['incremental_future_meta_model']['incremental_oof_r2']:.7f}**. La mejora pareada de MSE tiene IC 95 % [{d['incremental_future_meta_model']['paired_mse_improvement_ci95'][0]:.9f}, {d['incremental_future_meta_model']['paired_mse_improvement_ci95'][1]:.9f}] e incluye cero. Este diagnóstico sólo repara la segunda regresión. Conserva las puntuaciones históricas originales y por eso no es prospectivo.

Cambio propuesto. Entrenar el calificador sólo con años disponibles en la fecha de decisión, generar puntuaciones históricas fuera de muestra y evaluar el pronóstico completo en un periodo posterior. Usar pérdidas pareadas e intervalos agrupados para la comparación incremental.

### P1 · El 39 % es una descomposición de modelo con supuestos

`scripts/11_robustez.py` 166 a 170 define costo total como resultados observados en altura menos la predicción de un modelo de mar. La diferencia contiene calibración del modelo y selección de bateadores, conteos y temporadas. Dividir el cambio predicho de forma por ese total no identifica una fracción causal del costo de la altura. Los R² de parque guardados son negativos.

Cambio propuesto. Presentar 38.5 % como descomposición dependiente del modelo, junto con sus supuestos y sensibilidades. Separar el mecanismo físico de la evidencia causal. El conjunto no trae identificador de estadio, por lo que el holdout existente de `altitude_category` es un holdout de cubeta de altitud y no de estadio independiente.

### P2 · Fuga en tablas del objetivo y baseline

`scripts/02_features.py` 24 a 25 calcula el objetivo antes de dividir los datos. `src/stuffplus/targets.py` 42 a 50 ajusta valores terminales y por conteo con todo el conjunto. `scripts/03_models.py` 55 a 57 hace lo mismo con el baseline. La evaluación nueva ajusta esas tablas en entrenamiento. La diferencia media absoluta entre las etiquetas por pliegue y las guardadas es {r['target_lookup_sensitivity']['mean_abs_change_from_cached_rv']:.7f} carreras por lanzamiento. El efecto es pequeño, pero la ventaja predictiva evaluada también lo es.

### P2 · El experimento H4 mide cancelación de extremos

`app/scripts/experimentos.ts` 108 a 112 usa la diferencia entre el primer y último punto de giro. El efecto publicado es −0.01 por 100 rpm, pero la curva guardada abarca 98.1 a 104.0 puntos. El cambio absoluto medio entre pasos contiguos de 100 rpm es **{a['h4']['mean_absolute_adjacent_100rpm_change']:.4f}** y llega a +2.8. La curva no demuestra insensibilidad local. Mostrar diferencias contiguas, más formas de lanzamiento y los supuestos de reconstrucción de eficiencia.

### P2 · El simulador y las pruebas necesitan criterios de aceptación

El desacuerdo medio entre el preset típico del simulador y la media poblacional exportada es **{a['simulator_delta_mae']:.4f} puntos** en siete tipos. No deben ser idénticos porque representan objetos distintos, pero hay que explicar y caracterizar la discrepancia después de corregir la referencia. No ajustar la dispersión para forzar coincidencia con una media poblacional.

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

`results.json` contiene todos los resultados nuevos, pliegues, parámetros, intervalos, tiempos y versiones. `evaluation.log` conserva la salida. `data_audit.json` incluye el resultado OOF original separado del protocolo nuevo. `target_and_future_diagnostics.json`, `app_checks.json`, `transfer_reference_checks.json` y `transfer_identity_results.json` contienen los diagnósticos detallados. `verification_results.json` y los logs registran pruebas de ejecución. `original_files.json` y `integrity_check.json` registran integridad y cambios concurrentes. `CLAUDE.md` es el handoff local de esta evaluación. El CLAUDE de la raíz permanece fuera del alcance de edición.

Los scripts de evaluación se pueden copiar a una carpeta hermana, manteniendo la misma profundidad, para repetir sin sobrescribir estos resultados. `eval_app.mjs` se niega a sobrescribir su JSON. `eval_transfer_reference.py` recibe una ruta nueva de salida. El benchmark no escribe modelos de producción, no cambia la app y no publica resultados.
'''
(O/'REPORT.md').write_text(report)
handoff=f'''# Contexto de esta evaluación

## Alcance autorizado

El usuario pidió revisar y probar mejoras sin modificar archivos existentes. Mantener producción intacta. Se crearon esta carpeta, sus scripts, resultados y reporte. No editar el CLAUDE de la raíz para incorporar esto sin autorización posterior. No hacer commit, push, publicación ni envío de mensajes por esta revisión.

## Leer primero

Leer `REPORT.md` y `results.json` para conclusiones y números. Leer el CLAUDE raíz para historia del proyecto, datos, audiencia y entrega. Ese archivo mezcla estados anteriores con el estado final. El artefacto actual registra `STUFF_ENTRENA=todo`, pero el código por defecto usa `mar`.

## Hallazgos que condicionan cualquier siguiente paso

- La referencia de transferencia está a nivel del mar aunque las variables suministradas son observadas. Afecta `VertBreak` y `spin_efficiency` en scripts 04, 05, 10 y 11. La prueba de identidad falla con el patrón actual y pasa con referencia observada. En 5,000 filas el delta medio cambia de −8.215 a −9.250, diferencia absoluta media por pitch 2.664 puntos. Recalcular todas las recomendaciones tras corregirlo.
- La ejecución estándar del README puede sustituir el modelo por la versión de mar rechazada. Registrar configuración explícita.
- El supuesto incremento futuro R² 0.0271 es dentro de muestra de la segunda regresión. Agrupar esa regresión por lanzador da incremento {d['incremental_future_meta_model']['incremental_oof_r2']:.7f}, con intervalo de mejora de MSE que incluye cero. Aún conserva lookahead del calificador original, por lo que no es pronóstico prospectivo.
- La fracción de 39 % es una descomposición dependiente del modelo, no una fracción causal identificada. El holdout de parque es por cubeta de altitud.
- Las etiquetas y baseline originales usan todo el conjunto. Los nuevos experimentos ajustan tablas en entrenamiento.
- H4 usa una pendiente entre extremos. La sensibilidad absoluta local guardada es 1.7375 puntos por 100 rpm, aunque el extremo a extremo sea −0.01.
- El simulador difiere 4.2303 puntos de la media poblacional por tipo. Es un diagnóstico, no una igualdad que deba forzarse. El evaluador GBM sí coincide exactamente en 12 fixtures.
- `npm test` omite la prueba GBM. La prueba de consistencia carece de criterio de fallo.
- 6,346 de 171,020 turnos no tienen evento terminal identificado. Evaluar sensibilidad antes de asumir que todos tienen valor terminal cero.

## Qué se entrenó

24 modelos LightGBM, cuatro variantes, cuatro folds de pitcher y dos cortes cronológicos. Se agregó la contracción fija de 50 % sin otro entrenamiento. Semilla 20261022, 400 rondas, cuatro threads. Parámetros completos en `results.json`. Python {r['versions']['python']}, pandas {r['versions']['pandas']}, NumPy {r['versions']['numpy']}, LightGBM {r['versions']['lightgbm']}. Tiempo {r['runtime_seconds']} segundos.

Variantes de entrada física pura

- Actual de 16 variables.
- Movimiento horizontal y salida lateral normalizados por mano, con seno y coseno del eje. No se agregó pitch type.
- Sin SpeedDrop, ZoneSpeed ni ZoneTime.
- Objetivo residualizado por conteo y categoría de altitud de entrenamiento, sin entorno como input al calificador.

La etiqueta por conteo y la media del PA se ajustan en entrenamiento. El baseline es la media de rv por conteo de entrenamiento. No comparar directamente el cached OOF original con el nuevo R² como si sólo hubiera cambiado una variable. También cambian definición ajustada del objetivo, semilla y manejo explícito del grupo desconocido.

## Resultado global de candidatos

{table(r['grouped'])}

Ver tablas cronológicas y CIs en el reporte. Ninguna variante se promovió. No convertir una mejora exploratoria pequeña en una afirmación de rendimiento grande. Antes de adoptar la representación nueva hay que adaptarla a la transferencia Python y al generador de features del navegador, mantener la escala común y validar el conjunto.

## Límites que deben acompañar los números

La física y las variables de origen siguen preparadas globalmente. No se rehízo todo el pipeline dentro de folds. El 2026 ya se había usado en desarrollo anterior. Los IC son de remuestreo de pitchers sobre predicciones fijas, sin corrección por selección múltiple. La comparación de típica contra media poblacional no prueba equivalencia. La corrección de referencia no valida causalidad. No se hizo revisión visual de dashboard ni se regeneraron entregables.

## Reproducir sin tocar originales

Usar el Python existente `/Users/sdulongsalazar/.venvs/diablos/bin/python`. No instalar dependencias ni ejecutar scripts 01 a 12, que sobrescriben artefactos. Exportar `PYTHONDONTWRITEBYTECODE=1` y usar `-B` para evitar archivos pyc. Copiar scripts a una carpeta nueva al mismo nivel dentro de `evaluations` si se quiere conservar esta corrida. Sus rutas se resuelven desde la ubicación de cada script.

```bash
PYTHONDONTWRITEBYTECODE=1 OPENBLAS_NUM_THREADS=4 OMP_NUM_THREADS=4 /Users/sdulongsalazar/.venvs/diablos/bin/python -B evaluations/NUEVA_CARPETA/evaluate.py
PYTHONDONTWRITEBYTECODE=1 /Users/sdulongsalazar/.venvs/diablos/bin/python -B evaluations/NUEVA_CARPETA/diagnostics.py
PYTHONDONTWRITEBYTECODE=1 /Users/sdulongsalazar/.venvs/diablos/bin/python -B evaluations/NUEVA_CARPETA/transfer_identity.py
node evaluations/NUEVA_CARPETA/run_checks.mjs
```

El script `eval_app.mjs` tiene un destino explícito a esta carpeta y requiere cambiarlo a una ruta nueva al repetir. Usa flag `wx` para negarse a sobrescribir. `eval_transfer_reference.py` permite pasar una ruta nueva de salida. `write_report.py` lee resultados ya completos y genera este handoff y el reporte.

## Integridad y concurrencia

`original_files.json` contiene SHA256 de 170 archivos preexistentes al comienzo, excluyendo git, venv, node_modules y evaluations. `integrity_check.json` verifica los archivos y enumera cambios concurrentes. Se observaron archivos de app y documentación cambiando y commits externos que incluyeron algunos nuevos archivos de evaluación mientras corría la revisión. No se ejecutaron git add, commit, checkout, reset ni revert. No atribuir esas escrituras a los scripts de esta carpeta. No revertir cambios ajenos.

## Trabajo futuro en orden

Primero corregir referencia y probar identidad, después recalcular exportaciones y rankings. Fijar configuración y provenance. Rehacer evaluación prospectiva y sensibilidad a turnos incompletos. Sólo después considerar cambios de representación, hiperparámetros o calibración del simulador. Mantener dataset crudo y filas individuales fuera de reportes públicos. Esta carpeta guarda resultados agregados.
'''
(O/'CLAUDE.md').write_text(handoff)
print('Wrote REPORT.md and nested CLAUDE.md')
