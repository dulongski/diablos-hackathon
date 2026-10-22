# Diablos Stuff+ · Hackathon ISAC 2026

Entrega para el reto **Diablos Rojos: Stuff Plus Model, Calidad de Pitcheo Ajustada por Entorno**.
Rúbrica completa: https://www.isac-app.com/competition-details/hackathon-diablos-rojos.html

## ⏰ Fechas

- **Entrega de proyectos: 2026-10-22.** Por correo a `itamsportsanalytics@gmail.com`, con los correos de
  todos los integrantes del equipo.
- Finalistas 2026-11-02 · Final 2026-11-11 (entrevista de 10 min) · Ganadores 2026-11-12.

## Qué pide el reto (no perderlo de vista)

La pregunta del club: **qué lanzadores son los más afectados por la altitud y cuáles son los más
consistentes.** Todo lo demás se ordena alrededor de eso.

Entregables obligatorios:
1. Stuff+, Location+ y Pitching+ por lanzamiento, pitcher y arsenal; CDMX contra nivel del mar.
2. Perfil físico ideal para el Harp Helú, con argumentación física y estadística.
3. Recomendaciones: qué gana y qué pierde en altura (con riesgo de jonrón), cómo perfilar un prospecto.
4. Dashboard simulador: ingresar un pitch → Stuff+ en Harp Helú vs nivel del mar; mapa de movimiento de
   los pitches más y menos efectivos.
5. Documento técnico de 6–10 páginas (PDF).

Criterios (25 % cada uno): calidad del modelo (calibración, vencer al modelo nulo por conteo) ·
robustez fuera de muestra (pitcher + park holdout) · integración arsenal + altitud (delta Stuff+ por
pitch shape) · aplicabilidad real (entrevista con el jurado).

## La vara: Coach DNA

El otro hackathon del mismo autor, repo público: https://github.com/dulongski/adn-del-entrenador.
Su reporte de 17 láminas es el estándar de forma. Patrón de cada lámina:
- **eyebrow** de sección + **titular que ES la conclusión**, en español llano;
- una frase que empieza "En esta lámina…" y dice qué se está viendo;
- **un solo** ejemplo concreto y una gráfica;
- cada número con su comparación ("liga 15.1", "al azar 14 %");
- colores semánticos constantes; logos ISAC + club; número de lámina.
Estructura: portada → qué responde (preguntas → láminas) → el problema → definiciones y supuestos →
método con literatura → validación con baseline al azar → ejemplo completo → **qué hacer** (con nombres)
→ cierre con límites y referencias.

**Audiencia: alguien que no sabe nada de béisbol.** Todo término se explica la primera vez que aparece.

## ▶ SIGUIENTE PASO EN LA MAC (desde la nube, 2026-10-22, "tapar todos los huecos")

En la nube se preparó todo lo que no necesita datos. Falta correr en la Mac, en este orden. Todo está probado con
datos sintéticos; si algo truena, arreglarlo contra las columnas reales.

```bash
git pull origin claude/confident-ptolemy-sz210m
source ~/.venvs/diablos/bin/activate                 # el venv rápido
python scripts/03_models.py        # Stuff+ ahora entrena SOLO con nivel del mar (STUFF_ENTRENA=mar, default)
python scripts/04_export.py        # exporta modelo, helpers (con arrastre.log_sd medido) y tablas
python scripts/05_deliverables.py
python scripts/07_jurado.py        # el mapa de movimiento ya sale agregado en celdas (regla de datos)
cd app && npx esbuild scripts/experimentos.ts --bundle --platform=node --outfile=scripts/.exp.mjs --format=esm \
  && node scripts/.exp.mjs > ../artifacts/experimentos.json && rm scripts/.exp.mjs && cd ..
python scripts/08_hipotesis.py
python scripts/09_causal_forest.py
python scripts/10_local_extras.py
python scripts/11_robustez.py      # NUEVO, 40 a 90 min. Escribe robustez.json
cd app && npm run consistencia && cd ..   # simulador contra pipeline por tipo
```

**Qué hace cada cosa nueva.**
- `03_models.py` con `STUFF_ENTRENA=mar` (default). Stuff+ aprende sólo de juegos a nivel del mar, porque SpeedDrop
  (variable 1) delata el aire y el modelo aprendía "altura = más carreras". La escala se recalcula sobre toda la liga
  (`models.reescalar`). `STUFF_ENTRENA=todo` reproduce el modelo anterior. `models.json` guarda `stuff_entrena`.
- `11_robustez.py`, seis pruebas, cada una en su try. **parque** (entrena a nivel del mar, predice altura con la forma
  real y con la pelota volada a nivel del mar; qué fracción del exceso de carreras explica la física, y por tipo),
  **discriminacion** (10 % mejor contra 10 % peor en carreras, IC), **confiabilidad** (mitades crudo, contra el promedio
  del tipo, sólo rectas, sólo mezcla), **futuro** (pares de años, carreras y whiff, IC, R² incremental),
  **especificaciones** (pérdida por tipo con producción, sin frenado y con todos los juegos), **combinacion** (9
  componentes con variables de Stuff+, incluido out en el turno, pesos por regresión fuera de muestra).
- El dashboard (Validación), el reporte (lámina "Validación · robustez") y el documento (Anexo C) leen
  `robustez.json` solos. El documento tiene bloques `<!-- si stuff_entrena=mar -->` que `tecnico.py` activa solo según
  `models.json`.

**Decidir antes de escribir.** Mirar `robustez.json`. Si con `mar` la calibración sigue monótona y Stuff+ le gana al
nulo con lanzadores nuevos, quedarse con `mar` (es la versión defendible). Si se cae mucho, volver a `todo` y decirlo
en límites. En ambos casos la lámina y el anexo de robustez se generan solos.

**Lo que hay que escribir a mano después de correr.**
1. Casi todas las cifras del cuerpo del documento cambian. Correr `python3 docs/verifica_cifras.py`, que lista cada
   número de `docs/documento_tecnico.md` que ya no sale de los JSON, y corregirlos uno por uno. El cuerpo debe seguir
   en 10 páginas (portada + 10 + anexos).
2. Actualizar "Las cifras que cuentan la historia" aquí abajo, el README ("La respuesta corta") y `entrega/correo.txt`.
3. Llenar los corchetes de `entrega/entrevista.md` con `robustez.json`.
4. Si cambió `log_sd`, `experimentos.ts` ya se corrió arriba; revisar que H4 en el documento (5.4) coincida.
5. Regenerar y revisar (`docs/tecnico.py`, `docs/reporte.py`, `docs/pdf.mjs`, `docs/estilo.py` en 0 problemas,
   `npx tsc --noEmit && npm test && npm run build`), republicar el dashboard incluyendo `data/robustez.json`,
   `data/jurado.json`, `data/helpers.json`, `data/model_stuff.json`, `data/models.json` y lo demás que cambió, y push.

**Reglas del reto que pueden descalificar.** Equipos de **2 a 4** integrantes inscritos en licenciatura o maestría, y el
correo debe llevar los correos de todos. Los datos sólo se presentan como resultados: el mapa del dashboard ya sale en
celdas de al menos 10 lanzamientos, sin lanzamientos sueltos.

## Estado (2026-10-22, sesión local)

Pipeline completo corrido en local con el modelo limpio (01 a 10). Documento, reporte y dashboard
actualizados con las cifras nuevas. El venv rápido está en `~/.venvs/diablos` (el `.venv` dentro de iCloud
se cuelga al importar).

### Simulador con arrastre real (nube, 2026-10-22, después del modelo limpio)

- **Problema.** Con el modelo limpio, el simulador daba pérdidas en altura del doble que el pipeline (recta
  típica −24 contra −11.6 de la liga). Causa: `SpeedDrop` es la variable 1 de Stuff+ y el árbol tiene un
  escalón entre 5 y 7 mph (la caída de velocidad delata el aire). El pipeline vuela cada lanzamiento real con
  su propio arrastre medido; el simulador volaba todo con el arrastre mediano y caía justo en el escalón.
- **Arreglo.** `stuffEstable` en `app/src/lib/scoring.ts`: promedio de 49 variaciones (Halton en seis
  dimensiones) y cada una vuela con un arrastre sacado de la dispersión real entre pelotas
  (`helpers.arrastre.log_sd`, 0.15 por defecto). Lo usan el simulador y `experimentos.ts`. El nivel
  absoluto del integrador sí coincide con Trackman (12 lanzamientos del fixture, SpeedDrop +0.13 mph).
- **Apuntar.** "A dónde apunta" ahora dice "sólo mueve la trayectoria": con el modelo limpio mover el
  objetivo cambia Stuff+ en ~1 punto, como debe ser.
- **Recalculado.** `artifacts/experimentos.json`, `hipotesis.json` (sólo cambió el experimento de H4),
  documento 3.7 y 5.4, PDFs, dashboard republicado (versión 6).
- **Pendiente local.** Correr `python scripts/04_export.py` para que `helpers.json` traiga el
  `arrastre.log_sd` medido (ya está el código en `export.fit_helpers`). Luego `cd app && npm run consistencia`
  (simulador contra pipeline por tipo; hoy error medio 3.2 puntos), y si `log_sd` cambia, volver a correr
  `experimentos.ts` (ver su encabezado, el bundle tiene que quedar en `app/scripts/`) y `08_hipotesis.py`,
  actualizar 5.4 del documento y las cifras de H4 abajo, regenerar PDFs y republicar.

## Estado anterior (después de la sesión en la nube)

Rama de trabajo: **`claude/confident-ptolemy-sz210m`** (todo lo nuevo está ahí, no en `main`).
Dashboard publicado: https://claude.ai/artifact/1HXhuyBtkDd6szvLv9M7xo (se actualiza republicando
`app/dist/artifact.html` con `node app/scripts/artifact.mjs`; ver "Publicar el dashboard" abajo).

### Siguiente paso, en este orden

1. **Correr el análisis local que falta.** Necesita los datos crudos, que sólo están en esta Mac.
   ```bash
   git pull origin claude/confident-ptolemy-sz210m
   source .venv/bin/activate && uv pip install econml
   python scripts/10_local_extras.py          # 10 a 20 min; necesita artifacts/scored.pkl
   ```
   Escribe `app/public/data/extras.json` y `artifacts/extras.json` con tres partes:
   `cf_tactico` (Causal Forest táctico por conteo, lado del bateador y entorno, para slider vs cambio,
   slider vs recta, cambio vs recta y curva vs slider), `shap` (peso por grupo de variables en cada capa) y
   `tres_entornos` (Stuff+ por tipo a nivel del mar, altitud media y altitud extrema). Cada parte va en su
   propio try: si una falla queda `{"error": ...}` y las otras se guardan. Sólo se probó con datos
   sintéticos; si truena, arreglar contra las columnas reales de `scored.pkl`.
   Si `scored.pkl` no existe, correr antes `01` a `03` (ver README).
2. **Revisar los resultados y contarlos.** El dashboard los muestra solo (pestaña Causal Forest, Metodología
   con SHAP, Arsenal y perfil con tres entornos). El reporte agrega la lámina táctica solo
   (`docs/reporte.py`). El **documento técnico NO**: hay que escribir a mano en `docs/documento_tecnico.md`
   los resultados tácticos (sección 6.4), SHAP (3.5) y tres entornos (6.1). Ojo, el cuerpo ya va en 10
   páginas; si crece, recortar o bajar la letra en `docs/tecnico.py`.
   También actualizar en `docs/reporte.py` los números de lámina de la tabla "Qué responde" (lámina 2),
   porque la lámina táctica corre las demás una posición.
3. **Regenerar y revisar.**
   ```bash
   python3 docs/tecnico.py && node docs/pdf.mjs entrega/documento_tecnico.html entrega/documento_tecnico.pdf
   python3 docs/reporte.py && node docs/pdf.mjs entrega/reporte.html entrega/reporte.pdf lamina
   python3 docs/estilo.py entrega/documento_tecnico.html entrega/reporte.html   # debe dar 0 problemas
   cd app && npx tsc --noEmit && npm test && npm run build
   ```
   `docs/pdf.mjs` usa Playwright (`PW=$(npm root -g)/playwright` si no está local).
4. **Publicar el dashboard** (ver abajo) y hacer commit y push a la rama.
5. **Mandar el correo hoy.** `entrega/correo.txt` es texto plano para pegar; faltan integrantes y links.
   Adjuntar `entrega/documento_tecnico.pdf` y `entrega/reporte.pdf`.
6. Opcional antes de mandar: el link del dashboard es "cualquiera con el link" e incluye unos 3,000
   lanzamientos sueltos sin IDs (`jurado.json`, mapa de movimiento). Decidir si eso cuenta como "datos".

### Qué se hizo en la nube (para no repetirlo)

- **Bug crítico:** `jurado.json` traía `NaN` y la app no cargaba. Arreglado en `07_jurado.py`.
- **Dashboard, nueve pestañas** en orden de lectura: Inicio (respuesta corta), Metodología (siete pasos,
  mapa de variables del reto), Validación (calibración, holdouts, tabla RMSE y R²), Lanzadores (incluye
  constancia y efecto del Causal Forest), Arsenal y perfil, Hipótesis (H1 a H4), Causal Forest, Simulador,
  Anexo (glosario y los siete tipos dibujados). Logos de ISAC y Diablos en `app/public/logos/`.
- **Simulador nuevo** (`Simulador.tsx`, `Diamante3D.tsx`): una pelota con costuras en un campo de día,
  trayectoria en vivo, todos los controles visibles, siete tipos. Su Stuff+ sale de `stuffEstable` (49
  variaciones Halton con arrastre real). Se borraron la nube de puntos y la escena oscura.
- **Hipótesis** (`scripts/08_hipotesis.py` + `app/scripts/experimentos.ts` → `hipotesis.json`,
  `artifacts/experimentos.json`). Bootstrap por lanzador. H1 sí (física reproduce a Nathan, 18 → 14.9 in en
  Coors), H2 en parte (cambio +1.27 contra su recta, pero cuarto de seis), H3 en parte (p = 0.07 una cola),
  H4 sí (giro pesa 4 %, +0.1 por 100 rpm contra +1.9 por pulgada).
- **Causal Forest de entorno** (`scripts/09_causal_forest.py` → `causal.json`). Costo promedio firme,
  +1.46 carreras por 100 lanzamientos (IC 90 % 1.23 a 1.69). **Las diferencias entre lanzadores NO se
  sostienen fuera de muestra** (GATES plano, pendiente −2.1 con IC −4.3 a +0.1). Nunca decir que el bosque
  "llega a los mismos lanzadores que Stuff+". El mensaje correcto: las carreras confirman el promedio y
  muestran por qué hace falta la física para separar lanzadores.
- **Documento técnico** reescrito con LaTeX (KaTeX en Node, `docs/katex.mjs`), metodología completa,
  hipótesis y Causal Forest. **Reporte** de 24 láminas que empieza por lo básico, con logos.
- **Corrección importante:** Stuff+ predice directo el valor esperado en carreras (pérdida L2). Los ocho
  modelos de componente sólo explican. El reto sugiere combinar objetivos; la justificación está en
  Metodología y en el documento 3.5.

### Guía de estilo del autor (obligatoria en todo texto que vea el lector)

Voz activa, directa, de tú. Lenguaje simple pero con términos técnicos bien usados. Frases cortas y largas
mezcladas. **Sin guiones de ningún tipo entre palabras, sin guion largo, sin dos puntos, sin punto y coma,
sin asteriscos, sin frases de relleno** ("es importante", "cabe destacar", "no sólo"...). Afirmaciones
directas. `docs/estilo.py` revisa el texto renderizado (código, fórmulas y el signo menos de los números
no cuentan). En la app los tooltips `<Info>` no salen en el texto visible: revisarlos en el código.

## Las cifras que cuentan la historia (modelo limpio, sin ángulos, 2026-10-22)

- **Stuff+ sin fuga de ubicación.** Los cuatro ángulos de salida y llegada se quitaron de Stuff+ porque
  codificaban puntería (corr con distancia al centro −0.70 → −0.03; R² desde la ubicación 58 % → ~0).
  Stuff+ va mucho más regularizado (`models.CAPA_PARAMS`). 16 / 23 / 33 variables.
- **1 punto de Stuff+ = 0.135 carreras por 100 lanzamientos** (`app/src/lexico.ts`, `CPP` en el reporte).
  Cortes en carreras: aguanta > −3.7 puntos (media carrera), pierde mucho < −7.4 (una carrera).
- **Validación.** Stuff+ entre mitades del mismo lanzador 0.988 (sus carreras 0.293, 602 lanzadores).
  Stuff+ 2024–25 contra carreras 2026 0.218 (carreras pasadas 0.196, n = 114, no concluyente).
  Calibración monótona, de +1.9 (< 80) a −2.5 (120 o más) carreras por 100. Holdouts R² / corr: lanzador
  0.0010 / 0.036 (Pitching+ 0.043 / 0.208), temporada 0.0009 / 0.035, parque −0.0005 / +0.022 (falla en
  nivel, no en orden; ese desfase es el efecto de la altitud).
- **Por tipo.** Todos pierden. Recta −11.7, sinker −8.8, cambio −7.4, curva −6.3, slider −5.3, splitter
  −4.4, cutter −3.0. Liga 103.1 → 97.1 (media) → 94.8 (extrema). Mejores rectas −19.4, peores −3.8.
- **Lanzadores.** 561, **21 aguantan**, 354 pierden más de una carrera. Más afectado Lanzador 174 (recta ·
  cambio, 111.3 → 92.8). Fichaje Lanzador 1099 (cutter · slider · curva, 110.2 → 109.8, ± 2.6).
- **Hipótesis.** H1 Nathan 18 → 14.9 (Coors) / 13.8 (HH), rho −0.83 · H2 cambio +4.10 (3.48 a 4.69), cuarto
  de seis · H3 p = 0.08 una cola · H4 movimiento 30 %, giro 8 % (variable 3 de 16), +0.05 por 100 rpm contra
  +2.61 por pulgada; las rectas A y B ya NO se invierten (B gana por 18.1 a nivel del mar y por 6.0 en casa).
- **Causal Forest.** ATE +1.52 (IC 90 % 1.27 a 1.78). La pérdida de Stuff+ de la liga equivale a 1.12, unas
  tres cuartas partes. GATES plano (pendiente −1.95, IC −4.0 a +0.2). Acuerdo con Stuff+ 0.17 (p = 0.002).
- **Riesgo.** Elevado +31 pies; jonrón por elevado 12.4 % → 16.3 %; rodados 40.5 % → 44.8 %.
- **Física.** Índice del aire 1.000 / 0.898 / 0.853; exponente de Reynolds 0.7184; Magnus ∝ ρ^1.39 contra
  arrastre ∝ ρ^0.96; la transferencia baja el error de forma ~70 %.

## Datos

Los datos de la LMB **no se suben al repositorio** (sólo para la competencia; se presentan resultados).
En esta Mac están en la raíz (`stuff_model_df.parquet`) y en `artifacts/*.pkl`, ignorados por git. La nube
no los tiene, por eso `10_local_extras.py` se corre aquí.

## Correr la app

```bash
cd app && npm install && npm run dev      # http://localhost:5173
npm test                                  # física del navegador + evaluador de árboles vs LightGBM
npm run build                             # app/dist, estática
```

## Publicar el dashboard

```bash
cd app && npm run build && node scripts/artifact.mjs
```
Luego publicar `app/dist/artifact.html` como Artifact sobre el link de arriba, pasando en `files` los
`assets/*` nuevos (y `null` a los viejos), `data/*.json` que cambiaron (incluido `extras.json`),
`logos/*` y `favicon.svg`.

## Convenciones

- Todo en español, para alguien que no sabe béisbol. Rojo = Harp Helú, azul = nivel del mar, siempre.
- Lanzadores anonimizados por la liga: se muestran como "Lanzador 1099".
- Stuff+ = 100 + 10 · z(−xRV): 100 es el promedio de la liga, cada 10 puntos una desviación estándar.
