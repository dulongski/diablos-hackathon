# Stuff+ calibrado a 2,240 metros

Modelo de calidad de lanzamiento para el Estadio Alfredo Harp Helú, construido sobre
635,002 lanzamientos de la Liga Mexicana de Béisbol (2024–2026).
**Hackathon ISAC 2026 · Diablos Rojos del México.**

El Harp Helú está a 2,240 m, más alto que Coors Field. El movimiento de un lanzamiento lo
produce el aire, y ahí hay 20 % menos. Este proyecto mide cuánto cuesta eso, para qué
formas de lanzamiento, y qué debería hacer el club al respecto.

---

## Los tres hallazgos

**1. El movimiento cae más que la densidad.** El arrastre baja 14.7 % en altitud, pero el
efecto Magnus baja ~20 %. Medido dentro de cada lanzador, sobre 1,187 combinaciones
lanzador × tipo y siete cubetas de densidad: `k_drag ~ ρ^0.96` contra `k_magnus ~ ρ^1.39`.
Un modelo que escale todo por densidad subestima el castigo en cerca de un tercio.

**2. Es un impuesto sobre el Magnus.** Cada lanzamiento paga en proporción a cuánto de su
valor venía del movimiento. El *cutter* casi no paga (−0.9 de Stuff+); la recta de cuatro
costuras paga más que nadie (−3.3) y pierde 3.95 pulgadas de quiebre vertical. En el 1 %
mejor puntuado, la recta cae de 55 % a 22 % y el *slider* sube de 8 % a 33 %.

**3. El castigo es regresivo — y esto es lo que cambia una contratación.** Partiendo las
rectas en quintiles por su Stuff+ a nivel del mar:

| Quintil | Nivel del mar | Harp Helú | Δ |
|---|---|---|---|
| peor 20 % | 82.7 | 84.0 | **+1.3** |
| 2 | 95.2 | 94.3 | −0.9 |
| 3 | 102.5 | 99.4 | −3.1 |
| 4 | 107.5 | 102.1 | −5.4 |
| mejor 20 % | 113.6 | 105.2 | **−8.4** |

> La altitud no daña al lanzamiento malo. Borra la ventaja del bueno.

La prima que el mercado cobra por una recta de élite se paga a nivel del mar y se cobra en
un estadio donde esa élite no existe.

---

## Cómo funciona

El dataset no trae estadio ni altitud: sólo `altitude_category`, de tres niveles. Pero la
aceleración medida en el release contiene la firma del aire. Restando la gravedad y
separando la componente paralela a la velocidad (arrastre) de la perpendicular (Magnus),
`k_drag = |a_drag| / v²` es proporcional a la densidad y se calcula por lanzamiento.

La altitud **no entra al modelo como variable**. Entra por física, en dos etapas:

```
  lanzamiento ──▶ [1] TRANSFERENCIA DE FORMA ──▶ forma a otra densidad
  (release+spin)     reintegra la trayectoria        (IVB, HB, velocidad, ángulos)
                              │
                              ▼
                     [2] STUFF+ sobre forma pura
                    (nunca ve ubicación ni parque)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          Stuff+         Location+       Pitching+
```

Así el modelo puede responder *cuánto valdría en el Harp Helú un lanzamiento que nunca se
ha tirado en altura* — que es la pregunta de reclutamiento.

**Validación.** 444 lanzadores tiraron en ambos entornos; la mitad calibró los exponentes y
la otra mitad nunca se usó. Sobre esa mitad reservada, el error de predecir la forma en
altitud a partir de la forma a nivel del mar:

| | Sin transferir | Sólo densidad | Modelo |
|---|---|---|---|
| Quiebre vertical | 2.573 in | 1.119 in | **0.802 in** |
| Quiebre horizontal | 2.932 in | 1.612 in | **0.875 in** |

Más holdout de temporada, holdout de parque, y comparación contra el modelo nulo de la
rúbrica (run value promedio por conteo). Todo en
[`docs/documento_tecnico.md`](docs/documento_tecnico.md).

---

## Correr el proyecto

```bash
uv venv && uv pip install -e .
python scripts/01_physics.py       # densidad del aire y transferencia de forma
python scripts/02_features.py      # secuencia, arsenal, objetivos
python scripts/03_models.py        # las tres capas y sus holdouts
python scripts/04_export.py        # modelo y tablas al simulador
python scripts/05_deliverables.py  # entregables 1, 2 y 3
python scripts/06_report.py        # documento técnico
```

El simulador:

```bash
cd app && npm install && npm test && npm run dev
```

`npm test` verifica dos cosas que el tablero necesita para ser creíble: que el solver
inverso reproduce el lanzamiento que se le pide (±0.01 in) y que el evaluador de árboles
del navegador coincide con LightGBM **exactamente** (diferencia 0.0e+0 en 12 casos reales).

---

## El tablero

Dos vistas. **El efecto** presenta el argumento: el pitch fantasma —dos pelotas de la misma
mano, en el mismo instante, con el mismo giro, una en cada aire— y las tres gráficas que lo
sostienen. **Simulador** es la herramienta.

El simulador no evalúa un lanzamiento: evalúa un repertorio. Se define un envío base y
cuánto varía tiro a tiro —mando, quiebre, velocidad, punto de salida— y el modelo suelta
miles de envíos en los dos aires. Lo que se lee no es dónde cae el lanzamiento perfecto
sino cuánto se corre la nube entera, porque eso es lo que mueve el porcentaje de strikes.
Con una recta apuntada alta, por ejemplo, la nube cae 3.3 pulgadas y el porcentaje de
strikes *sube*: el envío que a nivel del mar se iba arriba, en altura entra.

Todo corre en el navegador. Los árboles de LightGBM se serializan a JSON y un evaluador de
unas líneas los recorre: sin servidor, sin wasm, sin latencia — el tablero funciona aunque
no haya red en la sala del jurado. Mil quinientos envíos en los dos entornos se resuelven
en ~120 ms, que es lo que permite arrastrar un control y ver la nube responder.

Las trayectorias no son ilustración: salen del mismo integrador que alimenta al modelo, así
que lo que se ve y lo que se puntúa son el mismo lanzamiento. La escena tiene dos encuadres
—uno corto sobre el plato para leer las pulgadas de separación, y uno amplio sobre el
diamante para ver el abanico completo— y el campo de visión se deriva del aspecto real del
contenedor, así que el encuadre se sostiene en cualquier tamaño de ventana.

Cambiar de mano espeja el envío, no solo el flag del modelo: `is_rhp` es la feature menos
importante de las veinte (0.13 % de la ganancia), mientras que `RelSide` es la primera. En
los datos, la recta mediana de un diestro sale a +1.57 ft con +8.4 in de quiebre horizontal
y la de un zurdo a −1.56 con −8.3 — un espejo casi exacto.

## Estructura

```
src/stuffplus/        física, features, modelos, exportación
scripts/              las seis etapas, en orden
app/                  simulador (Vite + React + three.js)
docs/                 documento técnico
artifacts/            modelos entrenados y tablas (generado)
```

## Entregables de la rúbrica

| | Dónde |
|---|---|
| 1. Stuff+ por lanzamiento, pitcher y arsenal | `artifacts/stuff_por_pitch.parquet`, `stuff_por_pitcher.csv`, `stuff_por_arsenal.csv` |
| 2. Perfil físico ideal | `artifacts/perfil_ideal.csv`, §6.5 del documento |
| 3. Recomendaciones operativas | §7 del documento |
| 4. Dashboard simulador | `app/` |
| 5. Documento técnico | `docs/documento_tecnico.md` |

---

*Los datos de la LMB se usaron únicamente para esta competencia. El repositorio presenta
resultados, no datos: los archivos originales están excluidos por `.gitignore`.*
