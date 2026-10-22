# Diablos Stuff+

Calidad de lanzamiento ajustada por la altitud del Estadio Alfredo Harp Helú.
**Hackathon ISAC 2026 · Reto Diablos Rojos del México.**

El Harp Helú está a 2,240 metros, más alto que Coors Field. Ahí hay 20 % menos aire, y el movimiento de
un lanzamiento lo produce el aire. Este proyecto califica los 635,002 lanzamientos de la LMB de 2024 a 2026,
mide cuánto vale cada uno en el Harp Helú y le dice al club qué lanzadores le sirven en casa.

## La respuesta corta

La altitud no daña al lanzamiento malo, **borra la ventaja del bueno**. La mejor recta de la liga pierde
8.4 puntos de Stuff+ en el Harp Helú y la peor gana 1.3. En promedio la liga pierde 2.4. De 561
lanzadores, 58 aguantan la altura. El perfil que conviene engaña sin depender del movimiento, con cutter,
slider y splitter, y provoca rodados, porque en altura un elevado viaja 31 pies más.

## Cómo funciona

La altitud no entra al modelo como una variable. Entra por física.

1. **Medimos el aire en la trayectoria.** Los datos no dicen el estadio, pero Trackman mide cuánto frena
   cada pelota, y eso depende del aire.
2. **Volamos cada lanzamiento en el otro aire.** Mismo brazo, mismo giro, otro aire. El simulador de vuelo
   reproduce la cifra de Alan Nathan para Coors Field (18 pulgadas se vuelven 14.9).
3. **Lo calificamos otra vez.** Stuff+ sólo ve física, así que la diferencia es el efecto del aire.

Tres capas, como pide el reto. Stuff+ (física pura), Location+ (más ubicación y conteo) y Pitching+ (más
arsenal y secuencia, con las variables relacionales contra la recta del lanzador). Todo con LightGBM y
validado con lanzadores, temporada y estadio fuera de muestra.

## Dónde está cada cosa que pide el reto

| Lo que pide el reto | Dónde lo respondemos |
|---|---|
| Stuff+, Location+ y Pitching+ por lanzamiento, pitcher y arsenal | Dashboard, pestañas Lanzadores y Arsenal y perfil |
| Stuff+ en CDMX contra otros estadios de la LMB | Arsenal y perfil, y `scripts/10_local_extras.py` para los tres entornos |
| Perfil físico ideal con argumento físico y estadístico | Arsenal y perfil, documento técnico 6.2 |
| Qué gana, qué pierde, riesgo de jonrón, cómo perfilar un prospecto | Arsenal y perfil, documento técnico 7 |
| Simulador con Stuff+ lado a lado y mapa de movimiento | Pestaña Simulador |
| Documento técnico de 6 a 10 páginas | `entrega/documento_tecnico.pdf` |
| Hipótesis H1 a H4 | Pestaña Hipótesis, documento técnico 5 |
| Causal Forest táctico (opcional) | Pestaña Causal Forest, `scripts/09` y `scripts/10` |
| Calibración y modelo nulo | Pestaña Validación |
| Pitcher, season y park holdout | Pestaña Validación |
| Variables de arsenal e interpretación con SHAP | Pestaña Metodología |

## Correr el proyecto

Los datos de la LMB no están en el repositorio. Pon `stuff_model_df.parquet` en la raíz y corre esto.

```bash
uv venv && uv pip install -e . && uv pip install econml
python scripts/01_physics.py        # densidad del aire y transferencia de forma
python scripts/02_features.py       # secuencia, arsenal, objetivos
python scripts/03_models.py         # las tres capas y sus holdouts
python scripts/04_export.py         # modelo y tablas al simulador
python scripts/05_deliverables.py   # entregables 1, 2 y 3
python scripts/07_jurado.py         # tabla por lanzador, calibración y mapa
python scripts/08_hipotesis.py      # H1 a H4
python scripts/09_causal_forest.py  # Causal Forest de entorno
python scripts/10_local_extras.py   # Causal Forest táctico, SHAP y tres entornos
```

El dashboard corre completo en el navegador, sin servidor.

```bash
cd app && npm install && npm test && npm run dev
```

`npm test` verifica que el simulador reproduce el lanzamiento que le pides y que el evaluador de árboles
del navegador coincide exacto con LightGBM.

Los documentos se regeneran desde los datos exportados.

```bash
python3 docs/tecnico.py && node docs/pdf.mjs entrega/documento_tecnico.html entrega/documento_tecnico.pdf
python3 docs/reporte.py && node docs/pdf.mjs entrega/reporte.html entrega/reporte.pdf lamina
python3 docs/estilo.py entrega/documento_tecnico.html entrega/reporte.html
```

## Estructura

```
src/stuffplus/   física, variables, modelos y exportación
scripts/         las etapas del análisis, en orden
app/             dashboard y simulador (Vite, React y three.js)
docs/            documento técnico, reporte y revisión de estilo
entrega/         los PDF y el borrador del correo
artifacts/       modelos entrenados y tablas agregadas
```

Usamos los datos de la LMB sólo para esta competencia. El repositorio presenta resultados, no datos.
