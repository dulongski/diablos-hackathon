# Entrevista final · 10 minutos

Usa las cifras visibles en la versión final del dashboard. Evita memorizar números de una exportación anterior. Los PDF y el dashboard deben compartir los mismos JSON.

## Guion

**Minuto 0 a 1 · La pregunta.** ¿Qué lanzadores conservan más valor en el aire del Harp Helú? A 2,240 metros la pelota encuentra menos aire y cambia su movimiento. Construimos escenarios para orientar scouting y decisiones de repertorio.

**Minuto 1 a 3 · El método.** Explica los cuatro pasos del reporte. Valoramos el cambio de conteo en carreras, entrenamos Stuff+ sólo con medidas físicas, evaluamos excluyendo lanzadores del ajuste y volvemos a volar el mismo lanzamiento con otro aire. El supuesto es conservar la salida de la mano. El integrador reproduce la referencia de Nathan para Coors, una recta de 18 pulgadas pasa a alrededor de 15.

**Minuto 3 a 5 · Candidatos de scouting.** Abre Lanzadores. Compara el candidato de fichaje con quien más pierde. Lee calidad de origen, calidad en altura, pérdida y constancia. Son prioridades para evaluación junto con comando, salud y rival, no promesas sobre carreras futuras.

**Minuto 5 a 6 · Repertorio.** Muestra la tabla por tipo y la compresión de las rectas. Menor pérdida no significa automáticamente mayor calidad absoluta. El bosque táctico ofrece pistas para probar opciones, con múltiples comparaciones y sin garantía causal.

**Minuto 6 a 8 · Evidencia.** Muestra calibración, separación entre grupos y repetibilidad. Explica que el R² por lanzamiento es pequeño. La prueba de categoría de altitud no identifica estadios y la relación con el año siguiente es retrospectiva. Los resultados del bosque de entorno requieren controles suficientes y no confirman diferencias individuales.

**Minuto 8 a 9 · Simulador.** Ingresa una forma y compara sus escenarios. Los 49 vuelos representan variaciones de esa forma típica. El promedio de una población completa puede diferir. Enseña la sensibilidad a movimiento y giro sin llamar a la diferencia entre extremos una prueba de insensibilidad.

**Minuto 9 a 10 · Decisión.** Propón una lista de candidatos y un protocolo de prueba en casa. El trabajo aporta una comparación física reproducible. El siguiente paso es validarla con estadio, clima y un periodo futuro reservado.

## Preguntas metodológicas

**¿Por qué es tan bajo el R²?** La física disponible explica una fracción pequeña del desenlace por lanzamiento. Ubicación y conteo añaden capacidad en las otras capas. Mostramos la mejora pequeña frente al baseline y también métricas agregadas. Ninguna de esas pruebas demuestra un techo teórico del modelo.

**¿El modelo aprende aire en la caída de velocidad?** Puede recogerlo. Por eso conservamos sensibilidades sin variables de frenado y con entrenamiento sólo a nivel del mar. Consulta sus pérdidas y su ordenamiento en el Anexo C. Son especificaciones distintas y no deben mezclarse como si fueran la misma estimación.

**¿Qué se corrigió en la transferencia?** La referencia debe corresponder a la medición de origen. Antes algunas diferencias se calculaban contra una forma ya trasladada al mar. Ahora transferir al mismo aire conserva las variables originales. Recalculamos escenarios y recomendaciones, conservando los árboles entrenados.

**¿Falla el holdout de parque?** Es un holdout de categoría de altitud porque no tenemos estadio. El R² negativo indica una limitación real de generalización. La correlación positiva pequeña no basta para llamarlo exitoso. La descomposición física es dependiente del modelo y no identifica una fracción causal del exceso observado.

**¿La repetibilidad demuestra predicción futura?** No. Las mitades intercaladas comparten historial y condiciones. Son una prueba de consistencia de la calificación. Faltan periodos separados y una evaluación completamente prospectiva.

**¿Stuff+ predice el año siguiente mejor que las carreras pasadas?** La comparación incremental se evalúa con regresiones fuera de muestra agrupadas por lanzador. Hay que leer su intervalo final. Aun así, las puntuaciones históricas usaron otros lanzadores de todos los años y 2026 ya se había visto durante desarrollo. No afirmamos superioridad prospectiva concluyente.

**¿La física explica cierto porcentaje del costo de altura?** La razón entre el cambio predicho por transferencia y el exceso observado es una descomposición del modelo. Su denominador incluye selección y calibración. El residuo no puede atribuirse íntegramente al batazo ni la razón presentarse como una fracción causal identificada.

**¿H4 prueba que el giro no importa?** No. La casi igualdad de los extremos ocultaba variación entre pasos de 100 rpm. Mostramos ese cambio local y el rango de la curva. La importancia de los árboles tampoco mide causalidad, porque hay variables correlacionadas.

**¿El Causal Forest resuelve la causalidad?** Sólo bajo supuestos fuertes de controles suficientes y soporte común. El análisis de entorno incluye covariables agregadas potencialmente posteriores al tratamiento. GATES no confirma heterogeneidad individual. Las celdas tácticas tampoco corrigen por comparaciones múltiples.

**¿La validación aísla todo el pipeline?** No. El calificador excluye las filas evaluadas, pero las tablas del objetivo, baseline y calibración física de producción se prepararon globalmente. El benchmark separado reconstruye objetivo y baseline en entrenamiento y conserva una mejora pequeña. Falta anidar también toda la preparación física.

**¿Qué pasa con los turnos sin evento terminal?** Hay 6,346 entre 171,020 turnos reconstruidos. Su tratamiento puede afectar las tablas del objetivo. Queda pendiente una sensibilidad usando sólo turnos completos, sin asumir que todo caso incompleto es un error de medición.

**¿Por qué no reemplazaron el modelo?** Las alternativas ensayadas no aportan una mejora consistente que justifique cambiar árboles, transferencia y simulador antes de entregar. Conservamos el modelo y corregimos su uso y la interpretación de la evidencia.

**¿Respetaron el uso de datos?** La entrega presenta resultados agregados y lanzadores anonimizados. Los datos originales y los archivos intermedios por lanzamiento no forman parte del paquete público.

## Antes de entrar

1. Abre la versión final del dashboard y verifica que coincida con los PDF.
2. Ten listas las pestañas Lanzadores, Validación y Simulador.
3. Ensaya una comparación que conozcas y consulta sus cifras actuales.
4. Lleva el documento técnico con sus límites y anexos disponibles.
