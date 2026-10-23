# Entrega · Hackathon ISAC 2026 · Diablos Rojos

Los dos PDF se generan desde los JSON que alimentan el dashboard. El modelo entrenado se conserva y la transferencia física usa la forma observada como referencia. Lee `../CLAUDE.md` para conocer los pasos y los límites de validación.

| Archivo | Contenido | Generación |
|---|---|---|
| `documento_tecnico.pdf` | Documento técnico con cuerpo de 6 a 10 páginas y anexos identificados aparte | `python docs/tecnico.py` y `node docs/pdf.mjs entrega/documento_tecnico.html entrega/documento_tecnico.pdf` |
| `reporte.pdf` | Reporte ejecutivo en láminas de 16 a 9 | `python docs/reporte.py` y `node docs/pdf.mjs entrega/reporte.html entrega/reporte.pdf lamina` |
| `entrevista.md` | Guion y respuestas metodológicas | Revisar contra el dashboard final |
| `actualizacion_artifact.zip` | Paquete para actualizar el Artifact existente | Leer `actualizar_artifact.md` |
| `dashboard.html` | Copia autónoma de respaldo | `node app/scripts/standalone.mjs` después del build |
| `correo.txt` | Borrador histórico; el usuario confirmó envío por Google Forms | No usar para enviar |

Antes de generar, deben terminar las exportaciones y pruebas afectadas por la transferencia. El paso 04 debe repetirse después de 05 para actualizar `compresion.json`. No reentrenar para generar los documentos.

El renderer usa `markdown`, KaTeX y Playwright con Chromium. La revisión de estilo se ejecuta con `python docs/estilo.py entrega/documento_tecnico.html entrega/reporte.html`. La revisión final debe confirmar cifras iguales entre dashboard y documentos, cuerpo técnico dentro del límite y ausencia de contenido cortado en cada lámina.

El enlace público anterior puede tener una versión previa. Revisa la compilación local de la entrega antes de compartir. No publicar ni enviar datos crudos de la LMB.

La entrega oficial está en `main`: https://github.com/dulongski/diablos-hackathon. Subir los PDF de esta carpeta al Google Forms y usar el artifact existente después de actualizarlo.
