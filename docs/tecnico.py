"""Documento técnico: docs/documento_tecnico.md → entrega/documento_tecnico.html (y luego PDF con pdf.mjs)."""
import json, pathlib, re, subprocess, markdown

AQUI = pathlib.Path(__file__).parent
md = (AQUI / "documento_tecnico.md").read_text()

# Las fórmulas se sacan antes del Markdown (que se comería los _ y los *) y se componen con KaTeX.
FORMULAS = []
def guardar(m, display):
    FORMULAS.append({"tex": m.group(1).strip(), "display": display})
    return f"@@F{len(FORMULAS) - 1}@@"
md = re.sub(r"\$\$(.+?)\$\$", lambda m: guardar(m, True), md, flags=re.S)
md = re.sub(r"(?<![\\$])\$([^$\n]+?)\$", lambda m: guardar(m, False), md)
html_f = json.loads(subprocess.run(["node", str(AQUI / "katex.mjs")], input=json.dumps(FORMULAS),
                                   capture_output=True, text=True, check=True).stdout)
cuerpo = markdown.markdown(md, extensions=["tables", "fenced_code"])
cuerpo = re.sub(r"<p>@@F(\d+)@@</p>", lambda m: f'<div class="ecuacion">{html_f[int(m.group(1))]}</div>', cuerpo)
cuerpo = re.sub(r"@@F(\d+)@@", lambda m: html_f[int(m.group(1))], cuerpo)
# los anexos empiezan en página nueva
cuerpo = cuerpo.replace("<h2>Anexo A", '<h2 class="anexo">Anexo A', 1)
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
body { font-family: Inter, system-ui, sans-serif; font-size: 9.1pt; line-height: 1.4; color: var(--texto); margin: 0; }
h1, h2, h3 { font-family: 'Big Shoulders Display', sans-serif; text-transform: uppercase; color: var(--tinta); line-height: 1; letter-spacing: .005em; }
h2 { font-size: 18pt; font-weight: 800; margin: 12pt 0 5pt; padding-top: 7pt; border-top: 2px solid var(--rojo); break-after: avoid; }
h3 { font-size: 12.5pt; font-weight: 700; margin: 13pt 0 5pt; break-after: avoid; }
p { margin: 0 0 5.5pt; orphans: 3; widows: 3; }
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
.logos-portada { display: flex; align-items: center; gap: 22pt; margin-bottom: 34pt; }
.l-isac { height: 34pt; } .l-diablos { height: 46pt; }
.ecuacion { margin: 8pt 0 10pt; overflow-x: auto; }
.katex { font-size: 1.06em; } .katex-display { margin: 0; }
h2.anexo { break-before: page; }
.pie { font-size: 8pt; color: var(--ceniza); border-top: 1px solid var(--linea); padding-top: 8pt; }
"""

PORTADA = """
<section class="portada">
  <div>
    <div class="logos-portada"><img src="{isac}" alt="ISAC" class="l-isac"><img src="{diablos}" alt="Diablos Rojos del México" class="l-diablos"></div>
    <div class="eyebrow">Hackathon ISAC 2026 · Reto Diablos Rojos del México · Documento técnico</div>
    <h1>Diablos <em>Stuff+</em></h1>
    <p class="sub">Calidad de lanzamiento ajustada por la altitud del Estadio Alfredo Harp Helú. Qué lanzadores
    sufren los 2,240 metros, cuáles aguantan y qué perfil te conviene buscar.</p>
    <div class="cifras">
      <div><b>635,002</b><span>lanzamientos de la LMB, 2024 a 2026, medidos con Trackman</span></div>
      <div><b>561</b><span>lanzadores comparados entre el nivel del mar y el Harp Helú</span></div>
      <div><b>4 + 1</b><span>hipótesis del reto probadas, más un Causal Forest como modelo secundario</span></div>
    </div>
  </div>
  <p class="pie">Trabajo independiente de los participantes. No es un producto oficial de ISAC ni del club. Usamos los datos de la
  LMB sólo para esta competencia y aquí presentamos resultados, no datos. La liga anonimizó a los lanzadores.</p>
</section>
"""

KATEX_CSS = (AQUI.parent / "app" / "node_modules" / "katex" / "dist" / "katex.min.css").as_uri()
LOGOS = AQUI.parent / "app" / "public" / "logos"
html = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Diablos Stuff+ · Documento técnico</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{KATEX_CSS}">
<style>{CSS}</style></head><body>{PORTADA.format(isac=(LOGOS / 'isac.svg').as_uri(), diablos=(LOGOS / 'diablos.png').as_uri())}{cuerpo}</body></html>"""
salida = AQUI.parent / "entrega" / "documento_tecnico.html"
salida.write_text(html)
print("HTML:", salida)
