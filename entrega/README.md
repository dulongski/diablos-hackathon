# Entrega · Hackathon ISAC 2026 · Diablos Rojos

| Archivo | Qué es | Cómo se regenera |
|---|---|---|
| `documento_tecnico.pdf` | Documento técnico (portada, 10 páginas de cuerpo y tres anexos) | `python3 docs/tecnico.py && node docs/pdf.mjs entrega/documento_tecnico.html entrega/documento_tecnico.pdf` |
| `reporte.pdf` | Reporte de 25 láminas con el patrón de Coach DNA | `python3 docs/reporte.py && node docs/pdf.mjs entrega/reporte.html entrega/reporte.pdf lamina` |
| `correo.txt` | Borrador del correo, en texto plano para pegar (faltan integrantes y links) | |

Antes de regenerar, corre `python3 scripts/08_hipotesis.py` si cambió el modelo. `docs/tecnico.py` usa
`pip install markdown` y KaTeX (`app/node_modules`, viene con `npm install`). `docs/pdf.mjs` usa
Playwright con Chromium. Para revisar el estilo del texto corre
`python3 docs/estilo.py entrega/documento_tecnico.html entrega/reporte.html`.
