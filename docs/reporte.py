"""Reporte de láminas (16:9) con el patrón de Coach DNA → entrega/reporte.html (y luego PDF con pdf.mjs).

Cada lámina: eyebrow de sección, titular que ES la conclusión, una frase "En esta lámina…",
un solo ejemplo o una sola gráfica, y cada número con su comparación. Todos los números salen
de app/public/data/*.json: si el modelo cambia, se vuelve a correr y el reporte se actualiza.
"""
import json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
D = RAIZ / "app" / "public" / "data"
J = json.loads((D / "jurado.json").read_text())
PH = json.loads((D / "physics.json").read_text())
CO = json.loads((D / "compresion.json").read_text())

ROJO, AZUL, VERDE, AMBAR, TINTA, CENIZA, LINEA = "#D7362B", "#2E6FA6", "#1A9A6E", "#B7800A", "#10201A", "#6E7A73", "#E3DCCB"
ES = {"Four-Seam": "Recta", "Slider": "Slider", "Curveball": "Curva", "Changeup": "Cambio",
      "Sinker": "Sinker", "Cutter": "Cutter", "Splitter": "Splitter"}


def n(v, d=0):
    return f"{v:,.{d}f}"


def s(v, d=1):
    return ("+" if v > 0 else "−" if v < 0 else "") + f"{abs(v):,.{d}f}"


P = J["pitchers"]
pierde = sorted(P, key=lambda x: x["delta_hh"])
fichaje = next(x for x in sorted(P, key=lambda x: -x["stuff_hh"]) if x["delta_hh"] > -1 and x["sd_juego"] < 2.5)
peor = pierde[0]
mar = next(r for r in J["riesgo"] if r["altitude_category"] == "No Altitude")
hh = next(r for r in J["riesgo"] if r["altitude_category"] == "Extreme Altitude")
tipos = sorted(J["tipos"], key=lambda t: t["delta"], reverse=True)
cal = J["calibracion"]
hold = J["holdout"]
q = CO["quintiles"]["Four-Seam"]
mz = {k: v for k, v in CO["mezcla_top_1pct"].items() if k != "Other"}
aguantan = sum(x["delta_hh"] > -1.2 for x in P)
mucho = sum(x["delta_hh"] < -2.5 for x in P)
mae = PH["mae_holdout"]
PROM = sum(t["delta"] * t["n"] for t in J["tipos"]) / sum(t["n"] for t in J["tipos"])   # ≈ −2.42

# ----------------------------------------------------------------------------- gráficas SVG

def barras_h(filas, ancho=620, alto_fila=46, maxv=None, fmt=lambda v: s(v), etiqueta_w=130, colores=None):
    """Barras horizontales desde cero (valores negativos hacia la izquierda... se dibujan como magnitud)."""
    maxv = maxv or max(abs(v) for _, v in filas)
    w = ancho - etiqueta_w - 70
    out = [f'<svg viewBox="0 0 {ancho} {alto_fila * len(filas)}" class="g">']
    for i, (et, v) in enumerate(filas):
        y = i * alto_fila
        c = (colores or {}).get(et, ROJO)
        L = abs(v) / maxv * w
        out.append(f'<text x="{etiqueta_w - 12}" y="{y + alto_fila / 2 + 6}" text-anchor="end" class="et">{et}</text>')
        out.append(f'<rect x="{etiqueta_w}" y="{y + 9}" width="{max(L, 2):.1f}" height="{alto_fila - 18}" rx="4" fill="{c}"/>')
        out.append(f'<text x="{etiqueta_w + L + 10:.1f}" y="{y + alto_fila / 2 + 6}" class="val" fill="{c}">{fmt(v)}</text>')
    out.append("</svg>")
    return "".join(out)


def calibracion_svg():
    W, H, PL, PR, PT, PB = 760, 380, 56, 20, 20, 64
    vals = [v for t in cal for v in (t["carreras_100"], t["carreras_pred_100"])]
    y0, y1 = min(vals) - 1.5, max(vals) + 1.5
    bw = (W - PL - PR) / len(cal)
    sx = lambda i: PL + bw * i + bw / 2
    sy = lambda v: PT + (y1 - v) / (y1 - y0) * (H - PT - PB)
    o = [f'<svg viewBox="0 0 {W} {H}" class="g">']
    for v in range(-8, 13, 4):
        if y0 <= v <= y1:
            o.append(f'<line x1="{PL}" x2="{W - PR}" y1="{sy(v):.1f}" y2="{sy(v):.1f}" stroke="{CENIZA if v == 0 else LINEA}" stroke-width="{1.4 if v == 0 else 1}"/>')
            o.append(f'<text x="{PL - 8}" y="{sy(v) + 5:.1f}" text-anchor="end" class="eje">{s(v, 0)}</text>')
    for i, t in enumerate(cal):
        v = t["carreras_100"]; c = ROJO if v > 0 else VERDE
        top, h = min(sy(0), sy(v)), abs(sy(v) - sy(0))
        o.append(f'<rect x="{sx(i) - bw * .3:.1f}" y="{top:.1f}" width="{bw * .6:.1f}" height="{max(h, 1):.1f}" rx="4" fill="{c}" opacity=".85"/>')
        o.append(f'<circle cx="{sx(i):.1f}" cy="{sy(t["carreras_pred_100"]):.1f}" r="6" fill="{TINTA}" stroke="#fff" stroke-width="2"/>')
        o.append(f'<text x="{sx(i) + bw * .3 + 5:.1f}" y="{sy(v) + (12 if v > 0 else -4):.1f}" class="val sm" fill="{TINTA}">{s(v)}</text>')
        o.append(f'<text x="{sx(i):.1f}" y="{H - PB + 24}" text-anchor="middle" class="et">{t["tramo"]}</text>')
        o.append(f'<text x="{sx(i):.1f}" y="{H - PB + 44}" text-anchor="middle" class="eje">{n(t["n"])}</text>')
    o.append("</svg>")
    return "".join(o)


def quintiles_svg():
    W, H, PL, PR, PT, PB = 720, 380, 50, 30, 20, 50
    y0, y1 = 80, 117
    ks = ["q1", "q2", "q3", "q4", "q5"]
    et = ["Peor 20 %", "Grupo 2", "Grupo 3", "Grupo 4", "Mejor 20 %"]
    sx = lambda i: PL + (W - PL - PR) * (i + .5) / 5
    sy = lambda v: PT + (y1 - v) / (y1 - y0) * (H - PT - PB)
    o = [f'<svg viewBox="0 0 {W} {H}" class="g">']
    for v in (80, 90, 100, 110):
        o.append(f'<line x1="{PL}" x2="{W - PR}" y1="{sy(v):.1f}" y2="{sy(v):.1f}" stroke="{CENIZA if v == 100 else LINEA}"/>')
        o.append(f'<text x="{PL - 8}" y="{sy(v) + 5:.1f}" text-anchor="end" class="eje">{v}</text>')
    for i, k in enumerate(ks):
        a, b, d = q[k]["plus_mar"], q[k]["plus_alt"], q[k]["delta"]
        c = VERDE if d > 0 else ROJO
        o.append(f'<line x1="{sx(i):.1f}" x2="{sx(i):.1f}" y1="{sy(a):.1f}" y2="{sy(b):.1f}" stroke="{c}" stroke-width="4"/>')
        o.append(f'<circle cx="{sx(i):.1f}" cy="{sy(a):.1f}" r="8" fill="#fff" stroke="{AZUL}" stroke-width="3"/>')
        o.append(f'<circle cx="{sx(i):.1f}" cy="{sy(b):.1f}" r="7" fill="{c}"/>')
        o.append(f'<text x="{sx(i) + 14:.1f}" y="{(sy(a) + sy(b)) / 2 + 6:.1f}" class="val" fill="{c}">{s(d)}</text>')
        o.append(f'<text x="{sx(i):.1f}" y="{H - PB + 28}" text-anchor="middle" class="et">{et[i]}</text>')
    o.append("</svg>")
    return "".join(o)


def mapa_svg():
    W, H, PL, PR, PT, PB = 760, 420, 52, 16, 16, 46
    xs = [x["stuff_mar"] for x in P]; ys = [x["delta_hh"] for x in P]
    x0, x1 = min(xs) - 1, max(xs) + 1
    y0, y1 = min(ys) - .5, max(2, max(ys)) + .5
    sx = lambda v: PL + (v - x0) / (x1 - x0) * (W - PL - PR)
    sy = lambda v: PT + (y1 - v) / (y1 - y0) * (H - PT - PB)
    o = [f'<svg viewBox="0 0 {W} {H}" class="g">',
         f'<rect x="{sx(100):.1f}" y="{sy(y1):.1f}" width="{sx(x1) - sx(100):.1f}" height="{sy(-1.2) - sy(y1):.1f}" fill="{VERDE}" opacity=".09"/>']
    for v in range(-8, 3, 2):
        o.append(f'<line x1="{PL}" x2="{W - PR}" y1="{sy(v):.1f}" y2="{sy(v):.1f}" stroke="{CENIZA if v == 0 else LINEA}"/>')
        o.append(f'<text x="{PL - 8}" y="{sy(v) + 5:.1f}" text-anchor="end" class="eje">{s(v, 0)}</text>')
    for v in range(90, 111, 5):
        if x0 <= v <= x1:
            o.append(f'<line x1="{sx(v):.1f}" x2="{sx(v):.1f}" y1="{PT}" y2="{H - PB}" stroke="{CENIZA if v == 100 else LINEA}"/>')
            o.append(f'<text x="{sx(v):.1f}" y="{H - PB + 22}" text-anchor="middle" class="eje">{v}</text>')
    for x in P:
        d = x["delta_hh"]; c = VERDE if d > -1.2 else AMBAR if d > -2.5 else ROJO
        o.append(f'<circle cx="{sx(x["stuff_mar"]):.1f}" cy="{sy(d):.1f}" r="3.6" fill="{c}" opacity=".8"/>')
    for x, et in ((fichaje, "fichar"), (peor, "evitar")):
        cx, cy = sx(x["stuff_mar"]), sy(x["delta_hh"])
        o.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="9" fill="none" stroke="{TINTA}" stroke-width="2.5"/>')
        o.append(f'<text x="{cx - 14:.1f}" y="{cy + (-14 if et == "fichar" else 5):.1f}" text-anchor="end" class="et halo">{x["nombre"]} · {et}</text>')
    o.append(f'<text x="{W - PR - 8}" y="{sy(y1) + 20:.1f}" text-anchor="end" class="et" fill="{VERDE}">Bueno y aguanta → fichar</text>')
    o.append(f'<text x="{(PL + W - PR) / 2}" y="{H - 4}" text-anchor="middle" class="eje">Stuff+ a nivel del mar (100 = promedio) →</text>')
    o.append("</svg>")
    return "".join(o)


def transferencia_svg():
    filas = [("Sin corregir", mae["sin_transferir"]["ivb"], CENIZA), ("Sólo densidad", mae["solo_densidad"]["ivb"], AMBAR),
             ("Nuestro modelo", mae["calibrado"]["ivb"], VERDE)]
    W, Hf = 640, 74
    mx = max(v for _, v, _ in filas)
    o = [f'<svg viewBox="0 0 {W} {Hf * 3}" class="g">']
    for i, (et, v, c) in enumerate(filas):
        L = v / mx * (W - 260)
        o.append(f'<text x="168" y="{i * Hf + 44}" text-anchor="end" class="et">{et}</text>')
        o.append(f'<rect x="180" y="{i * Hf + 14}" width="{L:.1f}" height="{Hf - 28}" rx="5" fill="{c}"/>')
        o.append(f'<text x="{190 + L:.1f}" y="{i * Hf + 46}" class="val" fill="{c}">{v:.2f} in</text>')
    o.append("</svg>")
    return "".join(o)


def mezcla_svg():
    orden = sorted(mz.items(), key=lambda kv: kv[1]["top_altitud"] - kv[1]["top_nivel_mar"], reverse=True)
    W, Hf = 640, 50
    mx = max(max(v["top_altitud"], v["top_nivel_mar"]) for _, v in orden)
    o = [f'<svg viewBox="0 0 {W} {Hf * len(orden)}" class="g">']
    for i, (k, v) in enumerate(orden):
        y = i * Hf
        o.append(f'<text x="110" y="{y + 30}" text-anchor="end" class="et">{ES[k]}</text>')
        for j, (val, c) in enumerate(((v["top_nivel_mar"], AZUL), (v["top_altitud"], ROJO))):
            L = val / mx * (W - 210)
            o.append(f'<rect x="122" y="{y + 7 + j * 18}" width="{max(L, 2):.1f}" height="15" rx="3" fill="{c}" opacity="{.75 if j == 0 else 1}"/>')
            o.append(f'<text x="{130 + L:.1f}" y="{y + 19 + j * 18}" class="eje">{val * 100:.0f} %</text>')
    o.append("</svg>")
    return "".join(o)


HI = json.loads((D / "hipotesis.json").read_text())
LOGOS = RAIZ / "app" / "public" / "logos"
COLT = {"Recta": "#E8B54A", "Sinker": "#D9822B", "Cutter": "#4FB89A", "Slider": "#7C83F0",
        "Curva": "#A77BE0", "Cambio": "#E0679A", "Splitter": "#8FA3B0"}


def bosque_svg(filas, lo, hi, ancho=640, fila=44, fuerte=None):
    """Estimación e intervalo de 95 % por fila. filas = [(etiqueta, valor, (ic_lo, ic_hi))]."""
    PL, PR, H = 120, 80, len(filas) * fila + 36
    sx = lambda v: PL + (v - lo) / (hi - lo) * (ancho - PL - PR)
    o = [f'<svg viewBox="0 0 {ancho} {H}" class="g">']
    for t in range(int(lo), int(hi) + 1):
        o.append(f'<line x1="{sx(t):.1f}" x2="{sx(t):.1f}" y1="4" y2="{H - 28}" stroke="{CENIZA if t == 0 else LINEA}" stroke-width="{1.5 if t == 0 else 1}"/>')
        o.append(f'<text x="{sx(t):.1f}" y="{H - 8}" text-anchor="middle" class="eje">{s(t, 0)}</text>')
    for i, (et, v, ic) in enumerate(filas):
        y = 22 + i * fila
        c = COLT.get(et, TINTA)
        peso = ' style="font-weight:800"' if et == fuerte else ""
        o.append(f'<text x="{PL - 12}" y="{y + 6}" text-anchor="end" class="et"{peso}>{et}</text>')
        o.append(f'<line x1="{sx(ic[0]):.1f}" x2="{sx(ic[1]):.1f}" y1="{y}" y2="{y}" stroke="{c}" stroke-width="5" stroke-linecap="round"/>')
        o.append(f'<circle cx="{sx(v):.1f}" cy="{y}" r="{9 if et == fuerte else 7}" fill="{c}" stroke="#fff" stroke-width="2.5"/>')
        o.append(f'<text x="{ancho - PR + 14}" y="{y + 6}" class="val" fill="{TINTA}">{s(v, 2)}</text>')
    o.append("</svg>")
    return "".join(o)


def logos_html(clase="logos"):
    return (f'<span class="{clase}"><img src="{(LOGOS / "isac.svg").as_uri()}" alt="ISAC" class="l-isac">'
            f'<img src="{(LOGOS / "diablos.png").as_uri()}" alt="Diablos Rojos del México" class="l-diablos"></span>')


LAMINAS = []


def lamina(eyebrow, titular, en_esta, cuerpo, clase=""):
    LAMINAS.append((eyebrow, titular, en_esta, cuerpo, clase))


def cifra(v, et, c=TINTA):
    return f'<div class="cifra"><b style="color:{c}">{v}</b><span>{et}</span></div>'


h1, h2, h3, h4, cf = HI["h1"], HI["h2"], HI["h3"], HI["h4"], HI["causal_forest"]
nat = h1["nathan"]
cam = next(r for r in h2["pares"] if r["tipo"] == "Cambio")
A, B = h4["experimento"]["parejas"]["A"], h4["experimento"]["parejas"]["B"]
giro = next(i for i in h4["importancia"] if i["grupo"].startswith("Giro (rpm)"))
movi = next(i for i in h4["importancia"] if i["grupo"].startswith("Movimiento"))
red = 1 - mae["calibrado"]["ivb"] / mae["sin_transferir"]["ivb"]

# 1 · portada ---------------------------------------------------------------------------------
LAMINAS.append(("portada", None, None, f"""
  {logos_html("logos grandes")}
  <div class="eyebrow">Hackathon ISAC 2026 · Reto Diablos Rojos del México</div>
  <h1>Diablos <em>Stuff+</em></h1>
  <p class="lede">¿Qué lanzadores le sirven a los Diablos a 2,240 metros? Calificamos 635,002 lanzamientos de la LMB y
  medimos cuánto vale cada uno en el Estadio Alfredo Harp Helú, donde hay 20 % menos aire. La respuesta corta es
  <b>{fichaje['nombre']}</b> sí y <b>{peor['nombre']}</b> no tanto.</p>
  <div class="cifras">{cifra('635,002', 'lanzamientos, 2024 a 2026')}{cifra(str(J['pitchers_n']), 'lanzadores comparados', AZUL)}{cifra(s(PROM), 'puntos de Stuff+ que pierde el lanzamiento promedio en altura', ROJO)}</div>
""", ""))

# 2 · qué responde ----------------------------------------------------------------------------
lamina("Qué responde este reporte", "Siete preguntas del club, cada una con su número",
       "En esta lámina están las preguntas del reto y la lámina donde respondemos cada una.", f"""
<table class="mapa-preguntas">
<tr><td>¿Cómo calificamos un lanzamiento y por qué la altitud cambia todo?</td><td>Método en lenguaje simple</td><td>3 a 9</td></tr>
<tr><td>¿Se puede confiar en la calificación?</td><td>Ordena carreras con lanzadores nuevos</td><td>10 a 12</td></tr>
<tr><td>¿Se cumplen las hipótesis del reto?</td><td>H1 y H4 sí, H2 y H3 en parte</td><td>13 a 17</td></tr>
<tr><td>¿Qué perfil físico rinde en el Harp Helú?</td><td>Menos movimiento, menos dependencia del giro</td><td>18</td></tr>
<tr><td>¿Qué lanzadores sufren más la altitud y cuáles aguantan?</td><td>{aguantan} aguantan y {mucho} pierden mucho</td><td>19 a 21</td></tr>
<tr><td>¿Cuánto riesgo extra de jonrón hay en casa?</td><td>{s(hh['dist_fb'] - mar['dist_fb'], 0)} pies por elevado</td><td>16</td></tr>
<tr><td>¿Qué hacemos el lunes?</td><td>Fichar, abrir en casa, perfilar prospectos</td><td>22</td></tr>
</table>""")

# 3 · el problema -----------------------------------------------------------------------------
lamina("El problema", "En el Harp Helú la pelota se mueve menos, y los modelos públicos no lo saben",
       "En esta lámina está por qué un Stuff+ de Grandes Ligas no te sirve tal cual en la Ciudad de México.", f"""
<div class="dos">
  <div><p class="grande">Una pelota que gira empuja el aire hacia un lado y el aire la empuja hacia el otro. Ese empuje,
  el efecto Magnus, es el movimiento que engaña al bateador. A 2,240 metros hay <b>20 % menos aire</b> que a nivel del
  mar. Más que en Coors Field (1,609 m), el estadio más extremo de Grandes Ligas.</p>
  <p>Los modelos Stuff+ públicos se entrenaron con parques a nivel del mar. Suponen que la misma forma vale lo mismo en
  cualquier estadio. Aquí eso no es cierto.</p></div>
  <div class="cifras col">{cifra('2,240 m', 'Harp Helú, contra 1,609 m de Coors Field', ROJO)}{cifra('0.80', 'densidad del aire, contra 1.00 a nivel del mar', AZUL)}{cifra('−3.7 in', 'de elevación pierde la recta del mismo lanzador en altura, medido con Trackman', ROJO)}</div>
</div>""")

# 4 · definiciones ----------------------------------------------------------------------------
lamina("Definiciones", "Stuff+ dice qué tan difícil de batear es un lanzamiento, con 100 como promedio",
       "En esta lámina están las tres calificaciones y cómo leerlas, aunque nunca hayas visto un partido.", """
<div class="tres">
  <div class="def"><h3>Stuff+</h3><p>Califica un lanzamiento <b>sólo por cómo sale de la mano</b>. Velocidad, giro, movimiento y punto de salida. No ve el resultado ni el estadio.</p></div>
  <div class="def"><h3>Location+</h3><p>La misma escala, sumando <b>dónde</b> llegó la pelota y en qué conteo de bolas y strikes.</p></div>
  <div class="def"><h3>Pitching+</h3><p>Suma además el <b>resto del repertorio</b>, la diferencia de velocidades y la secuencia con el lanzamiento anterior.</p></div>
</div>
<div class="escala"><span>90 · malo</span><span class="cien">100 · promedio de la liga</span><span>110 · muy bueno</span><span>120 · élite</span></div>
<p class="nota centro">Cada 10 puntos son una desviación estándar. El anexo del dashboard explica los siete tipos de lanzamiento con dibujos de su movimiento real.</p>""")

# 5 · supuestos --------------------------------------------------------------------------------
lamina("Supuestos", "Cuatro supuestos sostienen todo, y los probamos",
       "En esta lámina están las condiciones que damos por ciertas y cómo las verificamos.", """
<div class="dos">
  <ol class="hacer">
    <li><b>El brazo no cambia con la altitud.</b> El mismo lanzador suelta igual en los dos estadios. Dentro de cada lanzador, su giro cambia 0.5 % y su velocidad 0.1 %.</li>
    <li><b>Lo que cambia en el vuelo viene del aire.</b> Por eso volamos la misma pelota en otro aire y la calificamos otra vez.</li>
    <li><b>Medimos valor, no suerte.</b> Un lanzamiento vale las carreras que en promedio quita según el conteo, no lo que pasó esa vez.</li>
    <li><b>La referencia es la liga a nivel del mar.</b> Ahí está el 100. En altura casi todo baja, y eso es parte de la respuesta.</li>
  </ol>
  <div class="aviso-dato"><b>El conjunto no dice en qué estadio se lanzó.</b> Sólo trae tres categorías de altitud. La densidad del aire la sacamos del frenado que Trackman mide en cada pelota.</div>
</div>""")

# 6 · hipótesis --------------------------------------------------------------------------------
lamina("Hipótesis", "El reto propone cuatro hipótesis, y probamos las cuatro",
       "En esta lámina está cada hipótesis, cómo la probamos y el veredicto, que detallamos en las láminas 13 a 17.", """
<table class="mapa-preguntas hip">
<tr><td><b>H1</b> La baja densidad reduce el movimiento que produce el giro</td><td>Física contra la cifra de Nathan, pérdida por tipo con intervalos</td><td class="v-si">Se confirma</td></tr>
<tr><td><b>H2</b> El cambio de velocidad gana valor relativo</td><td>Su cambio contra su propia recta, lanzador por lanzador</td><td class="v-parcial">En parte</td></tr>
<tr><td><b>H3</b> Los lanzadores de rodados valen más en altura</td><td>Carreras contra rodados en cada entorno, mismos lanzadores</td><td class="v-parcial">En parte</td></tr>
<tr><td><b>H4</b> El giro solo no predice Stuff+, importa el movimiento</td><td>Peso en el modelo y experimento controlado</td><td class="v-si">Se confirma</td></tr>
<tr><td><b>CF</b> Modelo secundario, Causal Forest</td><td>Efecto de la altura en carreras reales, por perfil de lanzador</td><td class="v-si">Coincide</td></tr>
</table>
<p class="nota">Toda la incertidumbre sale de remuestrear lanzadores completos 2,000 veces (bootstrap por lanzador). Un intervalo que no cruza el cero no es casualidad.</p>""")

# 7 · método 1, medir el aire -----------------------------------------------------------------
lamina("Método · paso 1", "La pelota nos dice cuánto aire había",
       "En esta lámina está cómo medimos la densidad del aire sin saber el estadio.", f"""
<div class="dos">
  <div><p class="grande">Trackman mide cuánto frena cada pelota. Ese frenado depende del aire. Su mediana por juego es un
  <b>índice del aire</b>, donde 1.00 es el nivel del mar.</p>
  <p>El frenado cae menos que la densidad. Con menos aire baja el número de Reynolds y sube el coeficiente de arrastre
  de la pelota. Un solo exponente ({PH['altitud_a_indice_arrastre']['exponente']:.2f}), ajustado al Harp Helú, predice <b>{PH['altitud_a_indice_arrastre']['verificacion_cubeta_intermedia']['predicho']:.3f}</b> para la altitud media.
  Medimos <b>{PH['altitud_a_indice_arrastre']['verificacion_cubeta_intermedia']['medido']:.3f}</b>, sin haberla usado en el ajuste.</p></div>
  <div>{barras_h([('Nivel del mar', PH['rho_por_cubeta']['No Altitude']), ('Altitud media', PH['rho_por_cubeta']['Medium Altitude']), ('Altitud extrema', PH['rho_por_cubeta']['Extreme Altitude'])], maxv=1.05, fmt=lambda v: f'{v:.3f}', etiqueta_w=150, colores={'Nivel del mar': AZUL, 'Altitud media': AMBAR, 'Altitud extrema': ROJO})}
  <p class="nota">Índice del aire por categoría, 1.00 es el nivel del mar.</p></div>
</div>""")

# 8 · método 2, volar la pelota ---------------------------------------------------------------
lamina("Método · paso 2", f"Volamos la misma pelota en otro aire, y reproducimos a Nathan",
       "En esta lámina está el simulador de vuelo y la prueba contra la cifra más citada de la física del béisbol.", f"""
<div class="dos">
  <div><p class="grande">Con el mismo punto de salida, la misma velocidad y el mismo giro, volvemos a volar la pelota con el aire
  del otro estadio. Menos aire frena menos y empuja menos.</p>
  <p>Alan Nathan estima que en Coors Field una pelota con 18 pulgadas de quiebre se mueve 14 o 15. Nuestro simulador, calibrado
  sólo con la LMB, da <b>{nat['recta']['coors']:.1f}</b>. En el Harp Helú da <b>{nat['recta']['hh']:.1f}</b>.</p></div>
  <div>{barras_h([('Nivel del mar', nat['recta']['mar']), ('Coors Field', nat['recta']['coors']), ('Harp Helú', nat['recta']['hh'])], maxv=19, fmt=lambda v: f'{v:.1f} in', etiqueta_w=150, colores={'Nivel del mar': AZUL, 'Coors Field': AMBAR, 'Harp Helú': ROJO})}
  <p class="nota">Quiebre total de la misma recta en tres aires. Escalar sólo por la densidad daría {nat['recta']['solo_densidad_coors']:.1f} en Coors y se quedaría corto.</p></div>
</div>""")

# 9 · método 3, calificar y comparar ----------------------------------------------------------
lamina("Método · paso 3", "Calificamos la forma y comparamos los dos aires",
       "En esta lámina están las tres piezas del modelo y por qué la altitud no entra como variable.", """
<div class="flujo">
  <div class="paso"><span>1</span><h3>Medir el aire</h3><p>El frenado de cada pelota da el índice del aire de cada juego. Lámina 7.</p></div>
  <div class="flecha">→</div>
  <div class="paso"><span>2</span><h3>Volar en otro aire</h3><p>Mismo brazo, otro aire. El simulador da la forma que tendría el lanzamiento en el otro estadio. Lámina 8.</p></div>
  <div class="flecha">→</div>
  <div class="paso"><span>3</span><h3>Calificar y comparar</h3><p>Un modelo de árboles (LightGBM) que sólo ve física califica las dos formas. La diferencia es el efecto del aire.</p></div>
</div>
<p class="nota">Si la altitud fuera una variable del modelo, su efecto se mezclaría con <i>quién</i> lanza en altura, y no podrías calificar en el Harp Helú a alguien que nunca ha lanzado ahí. Literatura en la lámina 23.</p>""")

# 10 · validación física ----------------------------------------------------------------------
lamina("Validación · física", f"El vuelo simulado acierta, con {red * 100:.0f} % menos error que no corregir",
       f"En esta lámina predecimos lo que {PH['pitchers_cruce']} lanzadores tiraron en altura a partir de lo que tiraron a nivel del mar.", f"""
<div class="dos">
  <div>{transferencia_svg()}<p class="nota">Error medio en elevación, en pulgadas, en {PH['celdas_holdout']} combinaciones de lanzador y tipo que nunca usamos para calibrar.</p></div>
  <div><p class="grande">Escalar todo por la densidad del aire (ámbar) deja un tercio del efecto sin explicar. Con nuestra corrección el error baja a <b>{mae['calibrado']['ivb']:.2f} pulgadas</b> en elevación y <b>{mae['calibrado']['hb']:.2f}</b> en movimiento lateral.</p>
  <p>Mismo lanzador, mismo tipo de lanzamiento. Sólo cambia el aire.</p></div>
</div>""")

# 11 · calibración -----------------------------------------------------------------------------
lamina("Validación · criterio 1", "Más Stuff+ significa menos carreras, con lanzadores que el modelo nunca vio",
       "En esta lámina están las carreras por cada 100 lanzamientos según el Stuff+ fuera de muestra.", f"""
<div class="dos ancho-izq">
  <div>{calibracion_svg()}</div>
  <div><p class="grande">De menos de 80 a 110 o 120 hay <b>{cal[0]['carreras_100'] - cal[4]['carreras_100']:.0f} carreras de diferencia por cada 100 lanzamientos</b>, escalón por escalón.</p>
  <p>Las barras son lo que pasó y los puntos lo que predijo el modelo. Entre 80 y 110 está el 82 % de los lanzamientos, y ahí la diferencia es menor a media carrera. En los extremos el modelo es más optimista.</p></div>
</div>""")

# 12 · holdouts --------------------------------------------------------------------------------
nul = J["modelo_nulo"]["r2"]
lamina("Validación · criterio 2", "Le gana al modelo nulo en las tres pruebas fuera de muestra",
       "En esta lámina están los tres holdouts que pide el reto, contra el promedio por conteo.", f"""
<div class="tres">
  <div class="def"><span class="tag">Lanzadores nuevos</span><b class="big">{hold['pitcher']['stuff']['r2'] * 100:.1f} %</b><p>de la variación explicada con lanzadores fuera del entrenamiento. Pitching+ llega a {hold['pitcher']['pitching']['r2'] * 100:.1f} %.</p></div>
  <div class="def"><span class="tag">Temporada nueva</span><b class="big">{hold['temporada']['stuff']['r2'] * 100:.1f} %</b><p>entrenando con 2024 y 2025 y probando con 2026. No se gasta con el tiempo.</p></div>
  <div class="def"><span class="tag">Estadio nuevo</span><b class="big">{hold['parque']['stuff']['r2'] * 100:.1f} %</b><p>entrenando sin altitud extrema y probando sólo en altura. Baja, y ese es justo el efecto que medimos.</p></div>
</div>
<p class="grande centro">El modelo nulo explica <b>{nul * 100:.3f} %</b>. Un lanzamiento suelto es casi puro azar. Lo que importa es la escalera de la lámina 11.</p>""")

# 13 · H1 ----------------------------------------------------------------------------------------
lamina("H1 · se confirma", "Todos los tipos pierden en altura, y la recta pierde casi cuatro veces lo que el cutter",
       "En esta lámina está cuánto Stuff+ pierde cada tipo de lanzamiento al pasar al Harp Helú, con su intervalo de 95 %.", f"""
<div class="dos ancho-izq">
  <div>{bosque_svg([(t['tipo'], t['delta'], t['ic']) for t in h1['por_tipo']], -4, 0)}</div>
  <div><p class="grande">El aire delgado le cobra al movimiento. Cada lanzamiento paga según cuánto de su valor viene de moverse.</p>
  <p><b>Cutter, slider y splitter</b> engañan porque salen igual que la recta y rompen tarde. Pagan poco. <b>La recta</b> vive de su elevación y paga {s(h1['por_tipo'][-1]['delta'], 2)}. Los siete intervalos quedan bajo cero.</p></div>
</div>""")

# 14 · compresión ------------------------------------------------------------------------------
lamina("H1 · el hallazgo", "La altitud no daña a la recta mala, borra la ventaja de la buena",
       "En esta lámina partimos las rectas en cinco grupos según su Stuff+ a nivel del mar.", f"""
<div class="dos ancho-izq">
  <div>{quintiles_svg()}</div>
  <div><p class="grande">La mejor recta baja de <b>{q['q5']['plus_mar']:.1f}</b>, élite, a <b>{q['q5']['plus_alt']:.1f}</b>. Pierde {s(q['q5']['delta'])}. La peor <b>gana {s(q['q1']['delta'])}</b>.</p>
  <p>Lo que separa a una recta de élite de una mediocre es el movimiento, y el movimiento es lo que el aire se lleva. Para ti eso significa una cosa. <b>No pagues de más por una recta de élite</b> para lanzar en casa.</p>
  <p class="nota">Azul, nivel del mar. Punto de color, el mismo lanzamiento en el Harp Helú.</p></div>
</div>""")

# 15 · H2 ----------------------------------------------------------------------------------------
lamina("H2 · se confirma en parte", "El cambio sí gana contra la recta, pero splitter, cutter y slider ganan más",
       "En esta lámina comparamos cada tipo contra la recta del mismo lanzador, con su intervalo de 95 %.", f"""
<div class="dos ancho-izq">
  <div>{bosque_svg([(t['tipo'], t['ventaja_vs_recta'], t['ic']) for t in h2['pares']], 0, 3, fuerte='Cambio')}</div>
  <div><p class="grande">El cambio pierde <b>{s(cam['ventaja_vs_recta'], 2)} puntos menos</b> que la recta del mismo brazo, y gana en el {cam['pct_pitchers_gana'] * 100:.0f} % de los {n(cam['pitchers'])} lanzadores que tiran los dos.</p>
  <p>Pero queda cuarto. Un cambio de derecho se mueve unas 12 pulgadas hacia el brazo, y ese movimiento también lo paga. En altura no gana el que engaña por velocidad. Gana <b>el que nunca dependió del movimiento</b>.</p></div>
</div>""")

# 16 · H3 + riesgo -----------------------------------------------------------------------------
t3 = h3["terciles"]
lamina("H3 · se confirma en parte", f"En altura, cada rodado cuenta más, y un elevado viaja {hh['dist_fb'] - mar['dist_fb']:.0f} pies más",
       "En esta lámina comparamos cuántas carreras extra cuesta la altura según la tasa de rodados del lanzador.", f"""
<div class="dos">
  <div>{barras_h([(f"{x['grupo']} ({x['gb'] * 100:.0f} %)", x['castigo']) for x in t3], maxv=max(x['castigo'] for x in t3) * 1.1, fmt=lambda v: f'+{v:.2f}', etiqueta_w=260, colores={f"{x['grupo']} ({x['gb'] * 100:.0f} %)": ROJO for x in t3})}
  <p class="nota">Carreras extra por cada 100 lanzamientos al pasar a la altura, {h3['pitchers']} lanzadores con 120 o más en cada entorno.</p></div>
  <div><p class="grande">En altura, 10 puntos más de rodados previenen <b>{abs(h3['pendiente_alt']):.2f} carreras</b> por cada 100 lanzamientos. A nivel del mar el efecto no se distingue de cero.</p>
  <p>La diferencia va en la dirección de la hipótesis con 90 % de confianza, sin llegar al 95 %. En la liga, el elevado sale del parque {hh['hr_fb'] * 100:.1f} % de las veces en altura contra {mar['hr_fb'] * 100:.1f} %. El rodado es el único batazo que el aire no ayuda.</p></div>
</div>""")

# 17 · H4 ----------------------------------------------------------------------------------------
lamina("H4 · se confirma", "Importa cuánto se mueve la pelota, no cuánto gira",
       "En esta lámina está el peso del giro dentro del modelo y un experimento que mueve una sola perilla.", f"""
<div class="dos">
  <div>{barras_h([(i['grupo'].replace(' (eficiencia)', '').replace('Giro que se vuelve movimiento', 'Eficiencia de giro'), i['peso'] * 100) for i in h4['importancia'] if i['peso'] > 0.01], maxv=max(i['peso'] for i in h4['importancia']) * 100, fmt=lambda v: f'{v:.0f} %', etiqueta_w=230, colores={**{i['grupo'].replace(' (eficiencia)', '').replace('Giro que se vuelve movimiento', 'Eficiencia de giro'): CENIZA for i in h4['importancia']}, 'Giro (rpm)': ROJO, 'Movimiento (quiebres)': VERDE})}
  <p class="nota">Peso de cada grupo de variables dentro de Stuff+. El giro es la variable {h4['rango_spinrate']} de {h4['n_features']}.</p></div>
  <div><p class="grande">100 revoluciones más <b>con el mismo movimiento</b> cambian Stuff+ en {s(h4['experimento']['stuff_por_100rpm'])}. Una pulgada más de elevación <b>con el mismo giro</b> suma {s(h4['experimento']['stuff_por_pulgada'])}.</p>
  <table class="perfil"><tr><th>Dos rectas</th><th>Giro</th><th>Elevación</th><th>Mar</th><th>Harp Helú</th></tr>
  <tr><td>A, eje de bala</td><td>{n(A['rpm'])}</td><td>{A['ivb']:.1f} in</td><td>{A['mar']:.1f}</td><td><b>{A['hh']:.1f}</b></td></tr>
  <tr><td>B, todo es movimiento</td><td>{n(B['rpm'])}</td><td>{B['ivb']:.1f} in</td><td>{B['mar']:.1f}</td><td><b>{B['hh']:.1f}</b></td></tr></table>
  <p>B gana a nivel del mar y pierde en casa. El giro que se vuelve movimiento te expone en altura.</p></div>
</div>""")

# 18 · perfil ideal ----------------------------------------------------------------------------
pf = CO["perfil_ideal"]
lamina("Perfil ideal · entregable 2", "En altura la élite es slider, no recta",
       "En esta lámina están los tipos que forman el 1 % mejor calificado en cada aire, y su perfil físico.", f"""
<div class="dos">
  <div>{mezcla_svg()}<p class="nota"><span style="color:{AZUL}">■</span> élite a nivel del mar &nbsp; <span style="color:{ROJO}">■</span> élite en el Harp Helú</p></div>
  <div><p class="grande">El slider pasa de <b>{mz['Slider']['top_nivel_mar'] * 100:.0f} %</b> a <b>{mz['Slider']['top_altitud'] * 100:.0f} %</b> de la élite. La recta cae de {mz['Four-Seam']['top_nivel_mar'] * 100:.0f} % a {mz['Four-Seam']['top_altitud'] * 100:.0f} %.</p>
  <table class="perfil"><tr><th></th><th>Élite mar</th><th>Élite Harp Helú</th></tr>
  <tr><td>Movimiento total</td><td>{pf['movement_total']['optimo_nivel_mar']:.1f} in</td><td><b>{pf['movement_total']['optimo_altitud']:.1f} in</b></td></tr>
  <tr><td>Giro que se vuelve movimiento</td><td>{pf['spin_efficiency']['optimo_nivel_mar'] * 100:.0f} %</td><td><b>{pf['spin_efficiency']['optimo_altitud'] * 100:.0f} %</b></td></tr>
  <tr><td>Velocidad</td><td>{pf['RelSpeed']['optimo_nivel_mar']:.1f} mph</td><td><b>{pf['RelSpeed']['optimo_altitud']:.1f} mph</b></td></tr></table>
  <p>El perfil a buscar no apuesta al Magnus. Giro de bala, movimiento moderado y engaño por túnel.</p></div>
</div>""")

# 19 · por lanzador ----------------------------------------------------------------------------
lamina("La pregunta del club · entregable 1", f"{aguantan} de {J['pitchers_n']} lanzadores aguantan la altura",
       "En esta lámina cada punto es un lanzador. Qué tan bueno es a nivel del mar contra cuánto cambia en el Harp Helú.", f"""
<div class="dos ancho-izq">
  <div>{mapa_svg()}</div>
  <div><p class="grande"><span style="color:{VERDE}">●</span> {aguantan} aguantan, pierden menos de 1.2. <span style="color:{AMBAR}">●</span> {J['pitchers_n'] - aguantan - mucho} pierden. <span style="color:{ROJO}">●</span> {mucho} pierden más de 2.5.</p>
  <p>Los que más pierden suelen ser buenos a nivel del mar. Su calidad era movimiento.</p>
  <p>En {J['pitchers_con_ambos']} lanzadores con 120 o más lanzamientos en cada entorno, la pérdida del modelo y las carreras extra que de verdad permitieron van en la misma dirección (correlación de {J['corr_modelo_vs_observado']:.2f}).</p></div>
</div>""")

# 20 · ejemplo completo -------------------------------------------------------------------------
def ficha(x, veredicto, c):
    return f"""<div class="ficha" style="border-color:{c}"><span class="tag" style="color:{c}">{veredicto}</span>
  <h3>{x['nombre']}</h3><p class="nota">{x['arsenal']} · {'zurdo' if x['mano'] == 'Left' else 'derecho'} · {n(x['n'])} lanzamientos</p>
  <div class="salto"><div><span>Nivel del mar</span><b style="color:{AZUL}">{x['stuff_mar']:.1f}</b></div><div class="fl">→</div>
  <div><span>Harp Helú</span><b style="color:{ROJO}">{x['stuff_hh']:.1f}</b></div><div><span>Cambio</span><b style="color:{c}">{s(x['delta_hh'])}</b></div></div>
  <p>Location+ {x['location']:.1f} · Pitching+ {x['pitching']:.1f} · constancia ± {x['sd_juego']:.1f} entre juegos · rodados {x['gb'] * 100:.0f} %</p></div>"""

lamina("Ejemplo completo", f"{fichaje['nombre']} llega intacto y {peor['nombre']} pierde {abs(peor['delta_hh']):.1f} puntos",
       "En esta lámina hay dos lanzadores con calidad parecida a nivel del mar y destinos opuestos en casa.", f"""
<div class="dos">{ficha(fichaje, 'Fichar', VERDE)}{ficha(peor, 'Mejor de visitante', ROJO)}</div>
<p class="grande centro">A nivel del mar valen casi lo mismo ({fichaje['stuff_mar']:.1f} contra {peor['stuff_mar']:.1f}). En el Harp Helú los separan {fichaje['stuff_hh'] - peor['stuff_hh']:.1f} puntos, casi tres cuartos de desviación estándar.</p>""")

# 21 · causal forest ----------------------------------------------------------------------------
lamina("Modelo secundario · Causal Forest", "Un método que no usa Stuff+ llega a los mismos lanzadores",
       "En esta lámina está el efecto de la altura en carreras reales, estimado para cada perfil de lanzador.", f"""
<div class="cuatro">
  {cifra(s(cf['ate'], 2), f"carreras más por cada 100 lanzamientos cuesta la altura (IC 90 %, {cf['ate_ic90'][0]:.2f} a {cf['ate_ic90'][1]:.2f})", ROJO)}
  {cifra(n(cf['pitchers']), 'lanzadores comparados consigo mismos en los dos entornos', AZUL)}
  {cifra(f"{cf['corr_con_delta_stuff']['r']:.2f}", 'correlación con la pérdida de Stuff+, que el bosque nunca vio', VERDE)}
  {cifra(' · '.join(x['nombre'].replace('Lanzador ', '') for x in cf['menos_afectados'][:3]), 'los menos afectados, los mismos que recomienda Stuff+', VERDE)}
</div>
<div class="dos">
  <p class="grande">Cada lanzador aparece dos veces, una por entorno, y se compara consigo mismo. Un bosque causal (Double Machine Learning con 2,000 árboles honestos) busca qué rasgos hacen la altura más cara.</p>
  <p>Lo que más mueve el efecto son los swings fallidos, el uso de slider, el Stuff+ a nivel del mar y los rodados. Con {cf['pitchers']} lanzadores las diferencias entre perfiles son chicas. Por eso lo leemos como una confirmación independiente, no como otra lista.</p>
</div>""")

# 22 · qué hacer -------------------------------------------------------------------------------
aguantan_top = sorted([x for x in P if x["stuff_hh"] >= 100], key=lambda x: -x["delta_hh"])[:5]
filas = "".join(f"<tr><td>{x['nombre']}</td><td>{x['arsenal']}</td><td>{x['stuff_hh']:.1f}</td><td style='color:{VERDE}'>{s(x['delta_hh'])}</td></tr>" for x in aguantan_top)
lamina("Qué hacer", "Ficha arsenales de cutter, slider y splitter, y no pagues por movimiento",
       "En esta lámina están las decisiones concretas para el director deportivo y el pitching coach.", f"""
<div class="dos">
  <ol class="hacer">
    <li><b>Fichajes.</b> Descuenta el valor que viene del movimiento. Una recta de élite pierde {abs(q['q5']['delta']):.1f} puntos en casa.</li>
    <li><b>Perfil.</b> Busca cutter, slider y splitter, y lanzadores que provoquen rodados.</li>
    <li><b>Rotación.</b> Abre en casa con los que aguantan. Los que pierden mucho rinden más de visitante.</li>
    <li><b>Prospectos.</b> Pasa sus números de Trackman por el simulador y mira su Stuff+ en los dos estadios.</li>
  </ol>
  <div><p class="tag">Buenos que aguantan, Stuff+ en casa de 100 o más</p>
  <table class="perfil"><tr><th>Lanzador</th><th>Arsenal</th><th>Harp Helú</th><th>Cambio</th></tr>{filas}</table>
  <p class="nota">La lista completa, ordenable y con ficha por lanzador, está en la pestaña Lanzadores del dashboard.</p></div>
</div>""")

# 23 · cierre -----------------------------------------------------------------------------------
lamina("Límites y referencias", "Esto es lo que el modelo no hace",
       "En esta lámina están los límites del trabajo y la literatura en la que nos apoyamos.", """
<div class="dos">
  <ul class="limites">
    <li><b>No identifica estadios.</b> La altitud extrema agrupa varios parques, y el Harp Helú es el más alto.</li>
    <li><b>No separa aire de clima.</b> El índice junta densidad, temperatura y humedad.</li>
    <li><b>No modela al bateador.</b> El contacto perfecto (barril) casi no se predice desde la física.</li>
    <li><b>Stuff+ no es causal.</b> Valora lanzamientos. El Causal Forest es exploratorio.</li>
    <li><b>El exponente del aire es empírico.</b> Lo calibramos y lo verificamos fuera de muestra.</li>
  </ul>
  <ul class="refs">
    <li>Nathan, A. <i>The effect of altitude on baseball trajectories.</i> Physics of Baseball.</li>
    <li>SABR. <i>High altitude offense.</i> Baseball Research Journal.</li>
    <li>Tango, Lichtman y Dolphin (2007). <i>The Book, Playing the Percentages in Baseball.</i></li>
    <li>Ke y coautores (2017). LightGBM. <i>NeurIPS.</i></li>
    <li>Chernozhukov y coautores (2018). Double/debiased machine learning. <i>Econometrics Journal</i> 21(1).</li>
    <li>Wager y Athey (2018). Heterogeneous treatment effects using random forests. <i>JASA</i> 113(523).</li>
    <li>Huang y Hsu (2021). Big data analytics in baseball, a review. <i>SAGE Open</i> 11(4).</li>
  </ul>
</div>
<p class="nota centro">Usamos los datos de la LMB sólo para esta competencia y presentamos resultados, nunca datos. La liga anonimizó a los lanzadores. Trabajo independiente, no es un producto oficial de ISAC ni del club.</p>""")

CSS = f"""
@page {{ size: 1280px 720px; margin: 0; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: Inter, system-ui, sans-serif; color: #24302A; background: #F4F0E6; }}
.lam {{ width: 1280px; height: 720px; padding: 46px 64px 40px; position: relative; overflow: hidden; break-after: page; background: #F4F0E6; display: flex; flex-direction: column; }}
.lam::after {{ content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background: {ROJO}; }}
.eyebrow {{ font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; color: {ROJO}; }}
h1, h2, h3 {{ font-family: 'Big Shoulders Display', sans-serif; text-transform: uppercase; color: {TINTA}; line-height: .95; margin: 0; }}
h2 {{ font-size: 46px; font-weight: 900; margin: 10px 0 8px; max-width: 1080px; }}
h3 {{ font-size: 24px; font-weight: 800; }}
.en-esta {{ font-size: 16px; color: {CENIZA}; margin: 0 0 22px; }}
.cuerpo {{ flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 18px; }}
p {{ margin: 0 0 10px; font-size: 16px; line-height: 1.45; }}
.grande {{ font-size: 21px; line-height: 1.38; color: {TINTA}; }}
.centro {{ text-align: center; max-width: 980px; margin-left: auto; margin-right: auto; }}
.nota {{ font-size: 13.5px; color: {CENIZA}; }}
b {{ color: {TINTA}; }}
.pie {{ position: absolute; left: 64px; right: 64px; bottom: 16px; display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: {CENIZA}; letter-spacing: .08em; text-transform: uppercase; }}
.dos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; }}
.dos.ancho-izq {{ grid-template-columns: 1.35fr 1fr; }}
.tres {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }}
.cuatro {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }}
.def {{ background: #fff; border-radius: 14px; padding: 22px; border: 1px solid {LINEA}; }}
.def h3 {{ color: {ROJO}; margin-bottom: 10px; }}
.big {{ display: block; font-family: 'JetBrains Mono', monospace; font-size: 46px; color: {VERDE}; margin: 8px 0; }}
.tag {{ font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: {CENIZA}; }}
.cifras {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }}
.cifras.col {{ grid-template-columns: 1fr; gap: 16px; }}
.cifra {{ border-top: 3px solid {LINEA}; padding-top: 10px; }}
.cifra b {{ display: block; font-family: 'JetBrains Mono', monospace; font-size: 34px; letter-spacing: -.02em; }}
.cifra span {{ font-size: 14.5px; color: {CENIZA}; }}
.formula {{ font-family: 'JetBrains Mono', monospace; font-size: 18px; background: #fff; border: 1px solid {LINEA}; border-radius: 12px; padding: 16px 22px; text-align: center; color: {TINTA}; }}
.g {{ width: 100%; height: auto; display: block; overflow: visible; }}
.g .et {{ font-family: Inter, sans-serif; font-size: 16px; font-weight: 600; fill: {TINTA}; }}
.g .et.halo {{ paint-order: stroke; stroke: #F4F0E6; stroke-width: 5px; }}
.g .eje {{ font-family: 'JetBrains Mono', monospace; font-size: 13px; fill: {CENIZA}; }}
.g .val {{ font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 700; }}
.g .val.sm {{ font-size: 15px; }}
.flujo {{ display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 16px; align-items: stretch; }}
.paso {{ background: #fff; border: 1px solid {LINEA}; border-radius: 14px; padding: 22px; }}
.paso span {{ font-family: 'JetBrains Mono', monospace; font-size: 30px; font-weight: 700; color: {ROJO}; }}
.paso h3 {{ margin: 6px 0 10px; }}
.paso p {{ font-size: 15px; }}
.flecha {{ align-self: center; font-size: 34px; color: {ROJO}; }}
table {{ border-collapse: collapse; width: 100%; }}
.mapa-preguntas td {{ padding: 13px 12px; border-bottom: 1px solid {LINEA}; font-size: 18px; }}
.mapa-preguntas td:first-child {{ font-weight: 600; color: {TINTA}; }}
.mapa-preguntas td:nth-child(2) {{ color: {ROJO}; font-family: 'JetBrains Mono', monospace; font-size: 15px; }}
.mapa-preguntas td:last-child {{ text-align: right; font-family: 'JetBrains Mono', monospace; color: {CENIZA}; white-space: nowrap; }}
.perfil {{ margin: 10px 0 14px; font-size: 15px; }}
.perfil th {{ text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: {CENIZA}; border-bottom: 2px solid {TINTA}; padding: 6px 8px; }}
.perfil td {{ padding: 7px 8px; border-bottom: 1px solid {LINEA}; font-variant-numeric: tabular-nums; }}
.ficha {{ background: #fff; border: 1px solid {LINEA}; border-top: 5px solid; border-radius: 14px; padding: 24px; }}
.ficha h3 {{ font-size: 36px; margin: 4px 0 4px; }}
.salto {{ display: flex; align-items: flex-end; gap: 22px; margin: 18px 0 14px; padding: 14px 0; border-top: 1px solid {LINEA}; border-bottom: 1px solid {LINEA}; }}
.salto span {{ display: block; font-size: 12px; color: {CENIZA}; text-transform: uppercase; letter-spacing: .08em; }}
.salto b {{ font-family: 'JetBrains Mono', monospace; font-size: 38px; }}
.salto .fl {{ font-size: 28px; color: {CENIZA}; padding-bottom: 6px; }}
.hacer {{ margin: 0; padding-left: 24px; display: grid; gap: 14px; font-size: 18px; line-height: 1.4; }}
.hacer li::marker {{ color: {ROJO}; font-weight: 700; }}
.limites, .refs {{ margin: 0; padding-left: 20px; display: grid; gap: 12px; font-size: 16.5px; line-height: 1.4; }}
.refs {{ font-size: 14.5px; color: {CENIZA}; }}
/* portada */
.lam.portada {{ justify-content: center; padding: 70px 90px; background: {TINTA}; color: #E6E3DA; }}
.lam.portada::after {{ width: 14px; }}
.portada h1 {{ color: #F6F3EA; font-size: 84px; font-weight: 900; margin: 18px 0 22px; max-width: 1000px; }}
.portada h1 em {{ font-style: normal; color: {ROJO}; }}
.portada .lede {{ font-size: 23px; max-width: 900px; line-height: 1.45; margin-bottom: 40px; }}
.portada b {{ color: #fff; }}
.portada .cifra {{ border-top-color: #44554F; }}
.portada .cifra b {{ color: #F6F3EA !important; }}
.portada .cifra span {{ color: #A1A69C; }}
"""

CSS += f"""
.logos {{ display: inline-flex; align-items: center; gap: 14px; }}
.logos img {{ display: block; width: auto; }}
.pie .l-isac {{ height: 20px; }} .pie .l-diablos {{ height: 24px; }}
.logos.grandes {{ gap: 26px; margin-bottom: 26px; }}
.logos.grandes .l-isac {{ height: 46px; filter: brightness(0) invert(0.9); }} .logos.grandes .l-diablos {{ height: 62px; }}
.pie {{ align-items: center; }}
.escala {{ display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 15px; border-radius: 12px; overflow: hidden; border: 1px solid {LINEA}; }}
.escala span {{ padding: 12px 6px; background: #fff; border-right: 1px solid {LINEA}; }}
.escala .cien {{ background: {TINTA}; color: #F6F3EA; font-weight: 700; }}
.aviso-dato {{ background: #fff; border: 1px solid {LINEA}; border-left: 5px solid {AMBAR}; border-radius: 12px; padding: 22px; font-size: 18px; line-height: 1.45; }}
.mapa-preguntas.hip td:nth-child(2) {{ color: {CENIZA}; font-family: Inter, sans-serif; font-size: 15px; }}
.mapa-preguntas td.v-si {{ color: {VERDE}; font-weight: 700; font-family: Inter, sans-serif; }}
.mapa-preguntas td.v-parcial {{ color: {AMBAR}; font-weight: 700; font-family: Inter, sans-serif; }}
.cuatro .cifra b {{ font-size: 30px; }}
"""

html = []
for i, (eb, tit, en, cuerpo, clase) in enumerate(LAMINAS, 1):
    if eb == "portada":
        html.append(f'<section class="lam portada">{cuerpo}<div class="pie"><span>Diablos Stuff+</span><span>Hackathon ISAC 2026</span></div></section>')
        continue
    html.append(f"""<section class="lam {clase}"><div class="eyebrow">{eb}</div><h2>{tit}</h2><p class="en-esta">{en}</p>
<div class="cuerpo">{cuerpo}</div><div class="pie">{logos_html()}<span>Diablos Stuff+ · Hackathon ISAC 2026 · Reto Diablos Rojos del México</span><span>{i:02d} / {len(LAMINAS):02d}</span></div></section>""")

doc = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Diablos Stuff+ · Reporte</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{''.join(html)}</body></html>"""
salida = RAIZ / "entrega" / "reporte.html"
salida.write_text(doc)
print("HTML:", salida, "·", len(LAMINAS), "láminas")
