# Entrega · Hackathon ISAC 2026 · Diablos Rojos

| Archivo | Qué es | Cómo se regenera |
|---|---|---|
| `documento_tecnico.pdf` | Documento técnico, 10 páginas (entregable 5) | `python3 docs/tecnico.py && node docs/pdf.mjs entrega/documento_tecnico.html entrega/documento_tecnico.pdf` |
| `reporte.pdf` | Reporte de 17 láminas, patrón Coach DNA | `python3 docs/reporte.py && node docs/pdf.mjs entrega/reporte.html entrega/reporte.pdf lamina` |
| `correo.md` | Borrador del correo de entrega (faltan integrantes y link) | — |

`docs/tecnico.py` necesita `pip install markdown`. `docs/pdf.mjs` usa Playwright (Chromium).
Todos los números salen de `app/public/data/*.json` y de `docs/documento_tecnico.md`.
