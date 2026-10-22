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

## Estado al 2026-10-22, 02:30 CST

### Hecho
- Pipeline completo en `scripts/01…07` (física del aire, features, modelos LightGBM, holdouts, export).
- `scripts/07_jurado.py` → `app/public/data/jurado.json`: todo lo que el reto pide y la app no mostraba
  (calibración fuera de muestra, tabla de 561 lanzadores, arsenales, riesgo de jonrón, mapa de efectivos).
- App reestructurada en 5 pestañas mapeadas a la rúbrica (`app/src/App.tsx`, `components/Pestanas.tsx`):
  **Inicio** (`Inicio.tsx`) · **Lanzadores** (`Lanzadores.tsx`) · **Arsenal y perfil** (`Resumen.tsx`,
  reconvertido) · **Simulador** (+ `MapaEfectivos.tsx`) · **¿Funciona?** (`Confianza.tsx` + `Metodo.tsx`).
  Compila (`npx tsc --noEmit` limpio).

### Hecho el 2026-10-22 (sesión en la nube)
- **Bug crítico arreglado:** `jurado.json` traía 10 puntos con `NaN` y la app entera no cargaba.
  `07_jurado.py` ahora los filtra y escribe con `allow_nan=False`.
- CSS de todas las vistas nuevas; paleta crema por omisión; idioma oculto (sólo español).
- Revisión visual en escritorio y móvil; textos alineados con los datos (el sinker NO aguanta:
  −2.3; aguantan cutter, splitter y slider).
- `entrega/documento_tecnico.pdf` (10 pp., `docs/tecnico.py`) y `entrega/reporte.pdf`
  (17 láminas, `docs/reporte.py`); borrador en `entrega/correo.md`.

### Hecho después (misma sesión en la nube)
- **Hipótesis H1 a H4 y Causal Forest** probadas en `scripts/08_hipotesis.py` (bootstrap por lanzador,
  diseño pareado, econml CausalForestDML) y `app/scripts/experimentos.ts` (experimentos con el simulador).
  Salida en `app/public/data/hipotesis.json`. H1 y H4 se confirman, H2 y H3 en parte.
- Dashboard renombrado a **Diablos Stuff+**, favicon de pelota, logos de ISAC y Diablos
  (`app/public/logos/`), pestañas nuevas **Hipótesis** y **Anexo** (el glosario salió de Inicio).
- Documento técnico reescrito con metodología completa y fórmulas en LaTeX (KaTeX en Node, sin red).
- Reporte de 23 láminas que empieza por lo básico.
- **Guía de estilo del autor** (aplica a todo texto que vea el lector). Voz activa, directa, de tú, sin
  guiones de ningún tipo entre palabras, sin dos puntos, sin punto y coma, sin asteriscos ni frases de
  relleno, con frases cortas y largas mezcladas. `docs/estilo.py` revisa el texto renderizado.
- Corrección. Stuff+ predice el valor en carreras directamente; los ocho modelos de componente sólo
  explican de dónde sale el valor.

### Tercera ronda (misma sesión en la nube, con la página del reto)
- Texto completo del reto revisado punto por punto; mapa en `README.md`.
- **Causal Forest de entorno** (`scripts/09_causal_forest.py`, `causal.json`). Promedio firme, +1.46 carreras
  por cada 100 lanzamientos en altura. Las diferencias entre lanzadores NO se sostienen fuera de muestra
  (GATES plano). No decir que "llega a los mismos lanzadores".
- **Causal Forest táctico, SHAP y tres entornos** en `scripts/10_local_extras.py`. Necesita los datos crudos;
  escribe `app/public/data/extras.json`. El dashboard y el reporte lo muestran solos cuando existe.
- Dashboard con nueve pestañas (Inicio, Metodología, Validación, Lanzadores, Arsenal y perfil, Hipótesis,
  Causal Forest, Simulador, Anexo). Simulador nuevo con una pelota en un campo de día; su Stuff+ es el
  promedio de 25 variaciones fijas para que el árbol no haga saltar el número.

### Falta
1. Correr `scripts/10_local_extras.py` en la Mac y subir `extras.json`; luego regenerar reporte y documento.
2. Completar `entrega/correo.txt` (integrantes y links) y enviarlo **hoy**.

## Las cifras que cuentan la historia (de `app/public/data/jurado.json`)

- **Calibración fuera de muestra** (ningún lanzador en entrenamiento y prueba a la vez), carreras por cada
  100 lanzamientos: Stuff+ < 80 → +9.7 · 80–90 → +6.3 · 90–100 → +1.4 · 100–110 → −2.2 · 110–120 → −4.2 ·
  120+ → −5.5. Monótono; lo predicho cae casi encima de lo observado.
- **Holdouts** (r², el modelo nulo por conteo ≈ 0.00003): pitcher 0.020 (Pitching+ 0.043) · temporada 0.021
  · parque 0.014. Componentes: strike cantado +73 % sobre la tasa base, swing +40 %, chase +35 %, whiff +19 %.
- **Lanzadores:** 561 comparados; 333 con ≥120 lanzamientos en ambos entornos; correlación del delta del
  modelo con el delta observado de carreras: 0.23 (misma dirección, moderada por ruido).
  Más afectado: Lanzador 529 (cambio · recta) 104.8 → 97.2. Perfil de fichaje: Lanzador 1099 (cutter ·
  slider · curva) 104.5 → 104.1, muy constante.
- **Por tipo:** todos pierden; la recta más (−3.3), el cutter menos (−0.9). Las mejores rectas pierden
  −8.4; las peores ganan +1.3 ("la altitud borra la ventaja del bueno").
- **Riesgo:** un elevado viaja ~31 pies más en altura; HR por elevado 12.4 % → 16.3 %; rodados 40.5 % → 44.8 %.
- **Física:** el aire frena 14.7 % menos en altitud, pero el movimiento cae ~20 % (exponente de Reynolds
  calibrado fuera de muestra); el contrafactual reduce el error de forma ~70 %.

## Datos: lo que esta sesión NO tiene

Los datos de la LMB **no están en el repo** y no deben subirse (términos del reto: sólo para la
competencia; se presentan resultados, nunca datos). Por eso:
- Los scripts de `scripts/` **no corren aquí**: necesitan `stuff_model_df.parquet` y `artifacts/*.pkl`.
- Todo lo que la app necesita ya está en `app/public/data/*.json`, así que la app, el reporte y los
  documentos sí se pueden trabajar.
- Si hace falta un número nuevo del modelo, pedirlo al autor para correrlo en local.

`app/public/data/jurado.json` incluye ~3,000 lanzamientos individuales (sin IDs) para el mapa de
movimiento. Si el repo o la app se vuelven públicos, revisar si eso cuenta como "datos".

## Correr la app

```bash
cd app && npm install && npm run dev      # http://localhost:5173
npm test                                  # física del navegador + evaluador de árboles vs LightGBM
npm run build                             # app/dist, estática
```

## Convenciones

- Todo en español, para alguien que no sabe béisbol. Rojo = Harp Helú, azul = nivel del mar, siempre.
- Lanzadores anonimizados por la liga: se muestran como "Lanzador 1099".
- Stuff+ = 100 + 10 · z(−xRV): 100 es el promedio de la liga, cada 10 puntos una desviación estándar.
