"""Documento técnico: docs/documento_tecnico.md → entrega/documento_tecnico.html (y luego PDF con pdf.mjs)."""
import pathlib, re, markdown

AQUI = pathlib.Path(__file__).parent
md = (AQUI / "documento_tecnico.md").read_text()
cuerpo = markdown.markdown(md, extensions=["tables", "fenced_code"])
# las columnas numéricas se alinean a la derecha; las de texto, no
NUM = re.compile(r"^(<strong>)?[\s+\-−–\d.,%→ ]+(in|mph|ft)?(</strong>)?$")
def alinear(t):
    filas = re.findall(r"<tr>(.*?)</tr>", t, re.S)
    cuerpo_f = [re.findall(r"<td>(.*?)</td>", f, re.S) for f in filas[1:]]
    ncol = max((len(c) for c in cuerpo_f), default=0)
    num = [i > 0 and all(NUM.match(c[i].strip()) for c in cuerpo_f if len(c) > i) for i in range(ncol)]
    def celda(tag):
        k = [0]
        def f(m):
            i = k[0]; k[0] += 1
            return f'<{tag} class="n">' if i < len(num) and num[i] else f"<{tag}>"
        return f
    out = []
    for fila in re.split(r"(<tr>.*?</tr>)", t, flags=re.S):
        if fila.startswith("<tr>"):
            fila = re.sub(r"<td>", celda("td"), fila); fila = re.sub(r"<th>", celda("th"), fila)
        out.append(fila)
    return "".join(out)
cuerpo = re.sub(r"<table>.*?</table>", lambda m: alinear(m.group(0)), cuerpo, flags=re.S)
# el aviso final de datos ya está en la portada
cuerpo = re.sub(r"<hr />\s*<p><em>Los datos de la LMB.*?</p>\s*$", "", cuerpo, flags=re.S)
# el título y subtítulo van en la portada, no en el cuerpo
cuerpo = re.sub(r"^<h1>.*?</h1>\s*<h3>.*?</h3>\s*<p>.*?</p>\s*<hr />", "", cuerpo, count=1, flags=re.S)

CSS = """
@page { size: Letter; margin: 15mm 16mm 15mm; @bottom-right { content: counter(page); } }
:root { --rojo:#D7362B; --azul:#2E6FA6; --tinta:#10201A; --texto:#24302A; --ceniza:#6E7A73; --linea:#E3DCCB; --fondo:#FBF9F4; }
* { box-sizing: border-box; }
body { font-family: Inter, system-ui, sans-serif; font-size: 9.1pt; line-height: 1.45; color: var(--texto); margin: 0; }
h1, h2, h3 { font-family: 'Big Shoulders Display', sans-serif; text-transform: uppercase; color: var(--tinta); line-height: 1; letter-spacing: .005em; }
h2 { font-size: 18pt; font-weight: 800; margin: 15pt 0 6pt; padding-top: 7pt; border-top: 2px solid var(--rojo); break-after: avoid; }
h3 { font-size: 12.5pt; font-weight: 700; margin: 13pt 0 5pt; break-after: avoid; }
p { margin: 0 0 6.5pt; orphans: 3; widows: 3; }
strong { color: var(--tinta); }
table { width: 100%; border-collapse: collapse; margin: 5pt 0 9pt; font-size: 8.4pt; break-inside: avoid; }
th { text-align: left; font-weight: 600; color: var(--ceniza); font-size: 7.6pt; text-transform: uppercase; letter-spacing: .03em; border-bottom: 1.5px solid var(--tinta); padding: 4pt 5pt; }
td { padding: 3.6pt 5pt; border-bottom: 1px solid var(--linea); font-variant-numeric: tabular-nums; }
td.n, th.n { text-align: right; }
pre { background: var(--fondo); border: 1px solid var(--linea); border-radius: 5pt; padding: 7pt 10pt; font-size: 8.2pt; break-inside: avoid; }
code { font-family: 'JetBrains Mono', monospace; font-size: .92em; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; } li { margin-bottom: 3pt; }
hr { border: none; border-top: 1px solid var(--linea); margin: 14pt 0; }
.portada { height: 245mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.portada .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; letter-spacing: .16em; text-transform: uppercase; color: var(--ceniza); }
.portada h1 { font-size: 54pt; font-weight: 900; margin: 14pt 0 10pt; }
.portada h1 em { color: var(--rojo); font-style: normal; }
.portada .sub { font-size: 14pt; color: var(--texto); max-width: 34em; }
.cifras { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10pt; margin-top: 26pt; }
.cifras div { border-top: 2px solid var(--rojo); padding-top: 7pt; }
.cifras div:nth-child(2) { border-top-color: var(--azul); }
.cifras b { display: block; font-family: 'JetBrains Mono', monospace; font-size: 20pt; color: var(--tinta); }
.cifras span { font-size: 8.5pt; color: var(--ceniza); }
.pie { font-size: 8pt; color: var(--ceniza); border-top: 1px solid var(--linea); padding-top: 8pt; }
"""

PORTADA = """
<section class="portada">
  <div>
    <div class="eyebrow">Hackathon ISAC 2026 · Diablos Rojos del México · Documento técnico</div>
    <h1>Stuff+ calibrado<br>a <em>2,240</em> metros</h1>
    <p class="sub">Un modelo de calidad de lanzamiento ajustado por entorno para el Estadio Alfredo Harp Helú:
    qué lanzadores sufren la altitud, cuáles aguantan y qué perfil conviene buscar.</p>
    <div class="cifras">
      <div><b>635,002</b><span>lanzamientos de la LMB, 2024–2026, con Trackman</span></div>
      <div><b>561</b><span>lanzadores comparados entre el nivel del mar y el Harp Helú</span></div>
      <div><b>−2.4</b><span>puntos de Stuff+ que pierde el lanzamiento promedio en altura</span></div>
    </div>
  </div>
  <p class="pie">Los datos de la LMB se usaron únicamente para esta competencia: este documento presenta resultados, no datos.
  Lanzadores anonimizados por la liga.</p>
</section>
"""

html = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Stuff+ a 2,240 m · Documento técnico</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{PORTADA}{cuerpo}</body></html>"""
salida = AQUI.parent / "entrega" / "documento_tecnico.html"
salida.write_text(html)
print("HTML:", salida)
