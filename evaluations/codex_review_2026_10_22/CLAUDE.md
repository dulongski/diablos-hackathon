# Contexto de esta evaluación

## Alcance autorizado

El usuario pidió revisar y probar mejoras sin modificar archivos existentes. Mantener producción intacta. Se crearon esta carpeta, sus scripts, resultados y reporte. No editar el CLAUDE de la raíz para incorporar esto sin autorización posterior. No hacer commit, push, publicación ni envío de mensajes por esta revisión.

## Leer primero

Leer `REPORT.md` y `results.json` para conclusiones y números. Leer el CLAUDE raíz para historia del proyecto, datos, audiencia y entrega. Ese archivo mezcla estados anteriores con el estado final. El artefacto actual registra `STUFF_ENTRENA=todo`, pero el código por defecto usa `mar`.

## Hallazgos que condicionan cualquier siguiente paso

- La referencia de transferencia está a nivel del mar aunque las variables suministradas son observadas. Afecta `VertBreak` y `spin_efficiency` en scripts 04, 05, 10 y 11. La prueba de identidad falla con el patrón actual y pasa con referencia observada. En 5,000 filas el delta medio cambia de −8.215 a −9.250, diferencia absoluta media por pitch 2.664 puntos. Recalcular todas las recomendaciones tras corregirlo.
- La ejecución estándar del README puede sustituir el modelo por la versión de mar rechazada. Registrar configuración explícita.
- El supuesto incremento futuro R² 0.0271 es dentro de muestra de la segunda regresión. Agrupar esa regresión por lanzador da incremento 0.0097088, con intervalo de mejora de MSE que incluye cero. Aún conserva lookahead del calificador original, por lo que no es pronóstico prospectivo.
- La fracción de 39 % es una descomposición dependiente del modelo, no una fracción causal identificada. El holdout de parque es por cubeta de altitud.
- Las etiquetas y baseline originales usan todo el conjunto. Los nuevos experimentos ajustan tablas en entrenamiento.
- H4 usa una pendiente entre extremos. La sensibilidad absoluta local guardada es 1.7375 puntos por 100 rpm, aunque el extremo a extremo sea −0.01.
- El simulador difiere 4.2303 puntos de la media poblacional por tipo. Es un diagnóstico, no una igualdad que deba forzarse. El evaluador GBM sí coincide exactamente en 12 fixtures.
- `npm test` omite la prueba GBM. La prueba de consistencia carece de criterio de fallo.
- 6,346 de 171,020 turnos no tienen evento terminal identificado. Evaluar sensibilidad antes de asumir que todos tienen valor terminal cero.

## Qué se entrenó

24 modelos LightGBM, cuatro variantes, cuatro folds de pitcher y dos cortes cronológicos. Se agregó la contracción fija de 50 % sin otro entrenamiento. Semilla 20261022, 400 rondas, cuatro threads. Parámetros completos en `results.json`. Python 3.13.3, pandas 3.0.6, NumPy 2.5.4, LightGBM 4.7.0. Tiempo 220.13 segundos.

Variantes de entrada física pura

- Actual de 16 variables.
- Movimiento horizontal y salida lateral normalizados por mano, con seno y coseno del eje. No se agregó pitch type.
- Sin SpeedDrop, ZoneSpeed ni ZoneTime.
- Objetivo residualizado por conteo y categoría de altitud de entrenamiento, sin entorno como input al calificador.

La etiqueta por conteo y la media del PA se ajustan en entrenamiento. El baseline es la media de rv por conteo de entrenamiento. No comparar directamente el cached OOF original con el nuevo R² como si sólo hubiera cambiado una variable. También cambian definición ajustada del objetivo, semilla y manejo explícito del grupo desconocido.

## Resultado global de candidatos

| Variante | RMSE | R² | Mejora MSE contra conteo |
|---|---:|---:|---:|
| Actual reentrenado | 0.26799662 | 0.0008977 | 0.0851 % |
| Movimiento por brazo y eje circular | 0.26796834 | 0.0011086 | 0.1062 % |
| Sin tres variables de frenado | 0.26800375 | 0.0008446 | 0.0797 % |
| Objetivo residual por conteo y entorno | 0.26803736 | 0.0005940 | 0.0547 % |
| Actual con contracción fija de 50 % | 0.26796354 | 0.0011444 | 0.1097 % |
| Promedio por conteo de entrenamiento | 0.26811067 | 0.0000472 | 0.0000 % |

Ver tablas cronológicas y CIs en el reporte. Ninguna variante se promovió. No convertir una mejora exploratoria pequeña en una afirmación de rendimiento grande. Antes de adoptar la representación nueva hay que adaptarla a la transferencia Python y al generador de features del navegador, mantener la escala común y validar el conjunto.

## Límites que deben acompañar los números

La contracción de 50 % mejora el error de carreras, pero su IC de mejora en 2026 incluye cero. Si se recalcula la escala plus, la contracción afín se cancela y Stuff+ queda igual. No venderla como mejora del ranking.

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
