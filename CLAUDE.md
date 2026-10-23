# Diablos Stuff+ · Estado de la entrega

Proyecto del Hackathon ISAC 2026 para evaluar calidad de lanzamiento en la LMB y construir escenarios de altitud para el Harp Helú. Datos de 2024 a 2026, 635,002 lanzamientos. Los lanzadores están anonimizados. El conjunto sólo identifica categorías de altitud, no estadios concretos.

## Decisión de esta revisión

Se conserva el calificador LightGBM de producción, sus variables, sus árboles y su escala. El bosque secundario de entorno se recalculó con los insumos corregidos. La especificación es `STUFF_ENTRENA=todo`. Las pruebas exploratorias no justifican cambiarlo bajo el plazo de entrega.

Se corrige la referencia de transferencia física. Las variables observadas deben compararse contra su forma observada al construir diferencias y razones, no contra una referencia ya normalizada al nivel del mar. Transferir a la misma densidad debe conservar las variables originales. El arreglo cambia las calificaciones contrafactuales, las pérdidas por tipo, los perfiles y la selección de lanzadores; no cambia los árboles entrenados.

La revisión de entrega vive en una copia aislada fuera de iCloud. No copiar cambios de vuelta al repositorio original ni publicar o enviar sin instrucciones del usuario. La entrega vence el 22 de octubre de 2026 a las 23:59, hora de Ciudad de México.

## Fuentes de verdad

- `app/public/data/*.json` alimenta el dashboard y los documentos. `artifacts/*.json` conserva los resultados analíticos.
- `models.json` registra la especificación de entrenamiento. `scale.json` define la conversión de puntos a carreras estimadas. No escribir a mano una constante si puede leerse de ahí.
- `docs/reporte.py` calcula las cifras desde los JSON. `docs/documento_tecnico.md` usa marcadores que `docs/cifras.py` resuelve al ejecutar `docs/tecnico.py`. No sustituir esos marcadores por cifras estáticas.
- `entrega/documento_tecnico.pdf` y `entrega/reporte.pdf` se regeneran al terminar los cálculos. La revisión visual y el conteo de páginas deben realizarse sobre esos PDF finales.
- `evaluations/codex_review_2026_10_22/REPORT.md` y sus JSON son el diagnóstico histórico anterior al arreglo, no las cifras finales de la entrega.

## Qué significa cada resultado

Stuff+ sólo usa medidas físicas del lanzamiento. Location+ añade ubicación y conteo. Pitching+ añade arsenal y secuencia. La predicción directa es el valor esperado en carreras; los modelos de componente explican comportamientos y no son la fórmula de Stuff+. La escala es 100 más diez veces el valor estandarizado de la predicción con signo invertido.

Las tablas descriptivas, rankings y simulador usan el modelo final entrenado con todos los datos. Las métricas de validación se calculan con predicciones que excluyen las filas o lanzadores evaluados del ajuste del calificador. No confundir ambos usos.

La física mide escenarios bajo el supuesto de la misma salida de la mano y distinto aire. La categoría extrema aproxima un entorno relevante para el Harp Helú; no identifica el efecto completo de ese estadio. El simulador representa una forma típica con 49 variaciones. La tabla por tipo promedia lanzamientos reales y no tiene por qué coincidir exactamente.

## Límites que deben permanecer visibles

1. Las tablas del objetivo, baseline y preparación física de producción fueron calculadas globalmente. Sus validaciones no son una validación anidada completa. El benchmark aislado reajusta las tablas de objetivo y baseline dentro de cada corte y sigue encontrando una ventaja pequeña. No presentar un porcentaje global de precisión ni un techo teórico de Stuff+.
2. La validación llamada anteriormente de parque excluye una categoría de altitud, no un estadio independiente. Un R² negativo y una correlación positiva pequeña no demuestran buen ordenamiento ni que todo el error sea altitud.
3. La descomposición del exceso de carreras con un modelo de mar es dependiente del modelo. Su porcentaje no identifica la fracción causal atribuible al vuelo. El residuo incluye selección, bateo y calibración; no atribuirlo entero al batazo.
4. La regresión incremental entre temporadas debe evaluarse fuera de muestra por lanzador. Incluso con esa reparación, las puntuaciones históricas usan modelos aprendidos con otros lanzadores de todos los años. El análisis es retrospectivo, y 2026 ya fue inspeccionado. No afirmar superioridad prospectiva concluyente.
5. Las mitades intercaladas del mismo historial miden repetibilidad, no estabilidad en periodos futuros ni fiabilidad causal individual.
6. H4 debe mostrar sensibilidad local. La casi igualdad entre extremos de un barrido de giro es una cancelación, no evidencia de que 100 rpm no importen. La ganancia de árboles no es importancia causal.
7. El Causal Forest de entorno incluye tasas agregadas de rodados y swings fallidos, potencialmente posteriores al entorno. La interpretación causal exige controles previos suficientes y soporte común. GATES no confirma heterogeneidad individual. El bosque táctico tiene múltiples celdas sin corrección por comparaciones múltiples y sirve para orientar pruebas.
8. Hay 6,346 de 171,020 turnos reconstruidos sin evento terminal. Su tratamiento puede afectar las tablas de valor. Falta una sensibilidad restringida a turnos completos.

## Reproducir

Los datos de la LMB son sólo para la competencia. No subir `stuff_model_df.parquet` ni `artifacts/*.pkl`. Se necesitan localmente para reconstruir las exportaciones.

Entorno Python recomendado en esta Mac, fuera de iCloud, `~/.venvs/diablos/bin/python`. Instalar el proyecto editable y `econml` si se requiere reconstruir los bosques. La app usa dependencias de `app/package.json`.

Para recalcular después de cambiar sólo la transferencia, sin reentrenar el modelo

```bash
python scripts/04_export.py
python scripts/05_deliverables.py
python scripts/04_export.py
python scripts/07_jurado.py
python scripts/08_hipotesis.py
python scripts/10_local_extras.py
python scripts/11_robustez.py
```

El segundo paso 04 es necesario porque `compresion.json` depende de `deliverables.json`, generado por 05. Revisar los argumentos disponibles en 10 y 11 para ejecutar sólo los bloques que dependen de transferencia. `09_causal_forest.py` se repitió en esta revisión al cambiar sus insumos físicos. Repetirlo de nuevo sólo si vuelven a cambiar sus dependencias. Los experimentos del simulador se reconstruyen con `app/scripts/experimentos.ts`, según su encabezado, si cambió su lógica.

Para reconstruir desde los datos, ejecutar primero 01 y 02, y después `STUFF_ENTRENA=todo python scripts/03_models.py`. Esto vuelve a entrenar y requiere repetir todas las exportaciones y validaciones. No es necesario para un arreglo exclusivo de transferencia.

Para generar y verificar entregables

```bash
python docs/tecnico.py
python docs/reporte.py
node docs/pdf.mjs entrega/documento_tecnico.html entrega/documento_tecnico.pdf
node docs/pdf.mjs entrega/reporte.html entrega/reporte.pdf lamina
python docs/estilo.py entrega/documento_tecnico.html entrega/reporte.html
cd app
npm test
npx tsc --noEmit --incremental false
npm run build
```

Comprobar paridad del evaluador de árboles, identidad de transferencia, coherencia entre copias JSON, ausencia de NaN y render final. El documento tiene cuerpo técnico de 6 a 10 páginas, con anexos identificados aparte. Las láminas del reporte conservan formato 16 a 9.

## Convenciones editoriales

Español claro para quien no conoce béisbol. Definir términos al primer uso. Rojo para altura, azul para nivel del mar. Cada cifra debe llevar denominador, unidad y comparación. Recomendaciones como apoyo al scouting, sujetas a salud, comando, descanso y rival. No prometer carreras futuras ni efectos causales individuales que la validación no sostiene.

La revisión local de entrega y el manifiesto de archivos registran las comprobaciones finales. No presentar pruebas históricas como si ya hubieran validado una exportación recién generada.

## Estado de entrega local

La copia corregida está aislada fuera de iCloud, en `/private/tmp/diablos-entrega-20261022`. El enlace Claude existente se conserva. `entrega/actualizacion_artifact.zip` prepara su actualización y `entrega/actualizar_artifact.md` contiene las instrucciones. La versión alojada requiere publicación posterior. La rama de entrega de GitHub es `claude/confident-ptolemy-sz210m`; los enlaces del documento y correo apuntan a esa rama, porque `main` es la rama predeterminada y puede conservar una versión anterior. `entrega/dashboard.html` es respaldo autónomo. Ver `delivery_checks/final_checks.json` y `entrega/manifest_entrega.json` para comprobaciones y hashes.

## Comprobaciones ejecutadas para esta entrega

Pasaron 11 regresiones Python, paridad exacta LightGBM en 12 casos, pruebas de física y scoring del navegador, TypeScript, build Vite y 10 reconciliaciones de entrega. Se recorrieron todas las secciones y la validación en navegador de escritorio, sin errores de consola ni NaN observados. El simulador a 0 m dio 99.9 a ambos lados y cambio 0.0. Se inspeccionaron los PDF renderizados, con 14 páginas técnicas (portada, 10 de cuerpo, 3 de anexos) y 15 láminas. No equivale a probar cada control ni tamaños móviles.

El Python local usado es `/Users/sdulongsalazar/.venvs/diablos/bin/python`. El render PDF de esta máquina usa `PW=/Users/sdulongsalazar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` y `CHROMIUM_EXECUTABLE_PATH=/Users/sdulongsalazar/Library/Caches/ms-playwright/chromium_headless_shell-1194/chrome-mac/headless_shell`. Ambas variables son opcionales cuando Playwright y su navegador predeterminado ya están instalados.

`python scripts/14_delivery_check.py` verifica coherencia sin reentrenar ni cargar datos crudos. `node app/scripts/standalone.mjs` prepara el respaldo después del build. El ZIP de actualización contiene el build completo, y el ZIP de repositorio excluye los datos crudos, entornos y dependencias instaladas. La URL Claude sigue pendiente de actualizar con la herramienta de publicación de su cuenta.

La tipografía final del documento técnico usa 9.25 pt, interlineado 1.43, separación de columnas de 8 mm y más espacio entre párrafos, secciones, ecuaciones y pies de figura. La comprobación de paginación está en `delivery_checks/pdf_layout.json`.
