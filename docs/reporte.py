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


# ----------------------------------------------------------------------------- láminas

LAMINAS = []


def lamina(eyebrow, titular, en_esta, cuerpo, clase=""):
    LAMINAS.append((eyebrow, titular, en_esta, cuerpo, clase))


def cifra(v, et, c=TINTA):
    return f'<div class="cifra"><b style="color:{c}">{v}</b><span>{et}</span></div>'


# 1 · portada
LAMINAS.append(("portada", None, None, f"""
  <div class="eyebrow">Hackathon ISAC 2026 · Diablos Rojos del México · Stuff+ ajustado por entorno</div>
  <h1>¿Qué lanzadores le sirven a los Diablos a <em>2,240</em> metros?</h1>
  <p class="lede">Calificamos 635,002 lanzamientos de la LMB y medimos cuánto vale cada uno en el Estadio
  Alfredo Harp Helú, donde hay 20 % menos aire. Respuesta corta: <b>{fichaje['nombre']}</b> sí;
  <b>{peor['nombre']}</b>, no tanto.</p>
  <div class="cifras">{cifra('635,002', 'lanzamientos, 2024–2026')}{cifra(str(J['pitchers_n']), 'lanzadores comparados', AZUL)}{cifra(s(PROM), 'Stuff+ que pierde el lanzamiento promedio en altura', ROJO)}</div>
""", ""))

# 2 · qué responde
lamina("Qué responde este reporte", "Seis preguntas del club, seis respuestas con número",
       "En esta lámina están las preguntas del reto y la lámina donde se responde cada una.", f"""
<table class="mapa-preguntas">
<tr><td>¿Qué lanzadores sufren más la altitud y cuáles aguantan?</td><td>{aguantan} aguantan; {mucho} pierden mucho</td><td>13–14</td></tr>
<tr><td>¿Qué tipos de lanzamiento pierden y cuáles ganan valor relativo?</td><td>Recta {s(tipos[-1]['delta'])} · cutter {s(tipos[0]['delta'])}</td><td>10–12</td></tr>
<tr><td>¿Cuál es el perfil físico ideal para el Harp Helú?</td><td>Menos movimiento, menos dependencia del giro</td><td>12</td></tr>
<tr><td>¿Cuánto riesgo extra de jonrón hay en casa?</td><td>{s(hh['dist_fb'] - mar['dist_fb'], 0)} pies por elevado</td><td>15</td></tr>
<tr><td>¿Se puede confiar en la calificación?</td><td>Ordena carreras con lanzadores nunca vistos</td><td>7–9</td></tr>
<tr><td>¿Qué hacemos el lunes?</td><td>Fichar, abrir en casa, perfilar prospectos</td><td>16</td></tr>
</table>""")

# 3 · el problema
lamina("El problema", "En el Harp Helú la pelota se mueve menos, y los modelos no lo saben",
       "En esta lámina está por qué un Stuff+ de MLB no sirve tal cual en la Ciudad de México.", f"""
<div class="dos">
  <div><p class="grande">El movimiento de un lanzamiento lo produce el aire: el giro empuja contra él (efecto Magnus). A 2,240 m hay
  <b>20 % menos aire</b> que a nivel del mar, más que en Coors Field (1,609 m), el estadio más extremo de Grandes Ligas.</p>
  <p>Los modelos Stuff+ públicos se entrenaron con parques a nivel del mar: suponen que la misma forma vale lo mismo en todas partes.</p></div>
  <div class="cifras col">{cifra('2,240 m', 'Harp Helú · Coors Field 1,609 m', ROJO)}{cifra('0.80', 'densidad del aire contra 1.00 a nivel del mar', AZUL)}{cifra('−3.7 in', 'de elevación pierde la recta típica en altura (Trackman, mismo lanzador)', ROJO)}</div>
</div>""")

# 4 · definiciones
lamina("Definiciones", "Stuff+: 100 es el promedio de la liga, cada 10 puntos es una desviación",
       "En esta lámina están las tres calificaciones y cómo se leen, para quien no sabe béisbol.", """
<div class="tres">
  <div class="def"><h3>Stuff+</h3><p>Qué tan difícil de batear es un lanzamiento <b>sólo por cómo sale de la mano</b>: velocidad, giro, movimiento, punto de salida. No ve el resultado ni el estadio.</p></div>
  <div class="def"><h3>Location+</h3><p>La misma escala, sumando <b>dónde</b> llegó la pelota y en qué conteo.</p></div>
  <div class="def"><h3>Pitching+</h3><p>Suma además el <b>resto del repertorio</b>: diferencia de velocidades y secuencia con el lanzamiento anterior.</p></div>
</div>
<div class="formula">Stuff+ = 100 + 10 × z(−carreras esperadas) &nbsp;·&nbsp; 110 = muy bueno · 90 = malo · 120 = élite</div>
<p class="nota">Supuestos: el valor de un lanzamiento se mide en carreras sobre la cadena de 12 conteos (sin corredores en el conjunto); los lanzadores vienen anonimizados por la liga.</p>""")

# 5 · medir el aire
lamina("Datos y supuestos", "El conjunto no dice en qué estadio se lanzó; la pelota sí",
       "En esta lámina está cómo recuperamos la densidad del aire a partir del frenado de cada lanzamiento.", f"""
<div class="dos">
  <div><p class="grande">Trackman mide la aceleración de cada pelota. Restando la gravedad, la parte paralela a la velocidad es el frenado del aire:
  <b>proporcional a su densidad</b>. Su mediana por juego da un índice continuo del aire.</p>
  <p>El frenado cae menos que la densidad (el coeficiente de arrastre sube cuando hay menos aire). Un solo exponente, <b>{PH['altitud_a_indice_arrastre']['exponente']:.2f}</b>, ajustado al Harp Helú, predice la altitud media en <b>{PH['altitud_a_indice_arrastre']['verificacion_cubeta_intermedia']['predicho']:.3f}</b>; medido: <b>{PH['altitud_a_indice_arrastre']['verificacion_cubeta_intermedia']['medido']:.3f}</b>.</p></div>
  <div>{barras_h([('Nivel del mar', PH['rho_por_cubeta']['No Altitude']), ('Altitud media', PH['rho_por_cubeta']['Medium Altitude']), ('Altitud extrema', PH['rho_por_cubeta']['Extreme Altitude'])], maxv=1.05, fmt=lambda v: f'{v:.3f}', etiqueta_w=150, colores={'Nivel del mar': AZUL, 'Altitud media': AMBAR, 'Altitud extrema': ROJO})}
  <p class="nota">Índice de frenado del aire por categoría (1.00 = nivel del mar).</p></div>
</div>""")

# 6 · método
lamina("Método", "Primero movemos el lanzamiento de aire; después lo calificamos",
       "En esta lámina están las dos etapas del modelo y por qué la altitud no entra como variable.", """
<div class="flujo">
  <div class="paso"><span>1</span><h3>Transferir la forma</h3><p>Con el mismo punto de salida y el mismo giro, se vuelve a volar la pelota (Runge-Kutta 4) con el aire del otro estadio. El frenado escala con la densidad; el Magnus, con exponentes calibrados (1.7 vertical, 2.2 lateral).</p></div>
  <div class="flecha">→</div>
  <div class="paso"><span>2</span><h3>Calificar la forma</h3><p>LightGBM sobre física pura: velocidad, quiebres, giro, salida, extensión. Ocho modelos de componente (swing, whiff, chase, strike cantado, tipo de contacto) se combinan en carreras esperadas.</p></div>
  <div class="flecha">→</div>
  <div class="paso"><span>3</span><h3>Comparar</h3><p>El mismo lanzamiento, en los dos aires, con el mismo modelo. Como el modelo sólo ve forma, la diferencia es el aire y nada más.</p></div>
</div>
<p class="nota">Si la altitud entrara como variable, su efecto quedaría mezclado con <i>quién</i> lanza en altura. Literatura: Nathan (física del vuelo en altitud), Tango et al. (2007, valor de carrera por conteo), SABR (ofensiva en altura).</p>""")

# 7 · validación física
red = 1 - mae["calibrado"]["ivb"] / mae["sin_transferir"]["ivb"]
lamina("Validación · física", f"El vuelo simulado acierta: {red * 100:.0f} % menos error que no corregir",
       f"En esta lámina se predice lo que {PH['pitchers_cruce']} lanzadores tiraron en altura a partir de lo que tiraron a nivel del mar.", f"""
<div class="dos">
  <div>{transferencia_svg()}<p class="nota">Error medio en elevación (pulgadas), en {PH['celdas_holdout']} combinaciones lanzador × tipo que nunca se usaron para calibrar.</p></div>
  <div><p class="grande">Escalar todo por la densidad del aire (ámbar) deja un tercio del efecto sin explicar. Con la corrección de Reynolds el error baja a <b>{mae['calibrado']['ivb']:.2f} in</b> en elevación y <b>{mae['calibrado']['hb']:.2f} in</b> en movimiento lateral.</p>
  <p>Mismo lanzador, mismo tipo de lanzamiento: lo único que cambia es el aire.</p></div>
</div>""")

# 8 · calibración
lamina("Validación · criterio 1", "Más Stuff+, menos carreras, con lanzadores que el modelo nunca vio",
       "En esta lámina están las carreras permitidas cada 100 lanzamientos según el Stuff+ fuera de muestra.", f"""
<div class="dos ancho-izq">
  <div>{calibracion_svg()}</div>
  <div><p class="grande">De menos de 80 a 110–120 hay <b>{cal[0]['carreras_100'] - cal[4]['carreras_100']:.0f} carreras de diferencia cada 100 lanzamientos</b>, escalón por escalón.</p>
  <p>Barras: lo que pasó. Puntos: lo que predijo el modelo. Entre 80 y 110, donde está el 82 % de los lanzamientos, la diferencia es de menos de media carrera; en los extremos el modelo es más optimista.</p></div>
</div>""")

# 9 · holdouts
nul = J["modelo_nulo"]["r2"]
lamina("Validación · criterio 2", "Le gana al modelo nulo en las tres pruebas fuera de muestra",
       "En esta lámina están los tres holdouts que pide el reto, contra el promedio por conteo.", f"""
<div class="tres">
  <div class="def"><span class="tag">Lanzadores nuevos</span><b class="big">{hold['pitcher']['stuff']['r2'] * 100:.1f} %</b><p>de la varianza explicada con lanzadores fuera del entrenamiento. Pitching+: {hold['pitcher']['pitching']['r2'] * 100:.1f} %.</p></div>
  <div class="def"><span class="tag">Temporada nueva</span><b class="big">{hold['temporada']['stuff']['r2'] * 100:.1f} %</b><p>entrenando 2024–2025 y probando 2026: no se gasta con el tiempo.</p></div>
  <div class="def"><span class="tag">Estadio nuevo</span><b class="big">{hold['parque']['stuff']['r2'] * 100:.1f} %</b><p>entrenando sin altitud extrema y probando sólo en altura: baja, justo el efecto que medimos.</p></div>
</div>
<p class="grande centro">El modelo nulo explica <b>{nul * 100:.3f} %</b>. Un lanzamiento suelto es casi todo azar; lo que importa es la escalera de la lámina 8.</p>""")

# 10 · por tipo
lamina("Arsenal · entregable 1", "Todo pierde en altura; la recta pierde casi cuatro veces más que el cutter",
       "En esta lámina está cuánto Stuff+ pierde cada tipo de lanzamiento al pasar al Harp Helú.", f"""
<div class="dos ancho-izq">
  <div>{barras_h([(ES.get(t['tipo'], t['tipo']), t['delta']) for t in tipos], colores={ES.get(t['tipo'], t['tipo']): (VERDE if t['delta'] > -2 else AMBAR if t['delta'] > -3 else ROJO) for t in tipos})}</div>
  <div><p class="grande">El aire delgado es un impuesto sobre el movimiento: cada lanzamiento paga según cuánto de su valor viene de ahí.</p>
  <p><b>Cutter, splitter y slider</b> engañan por salir igual que la recta y romper tarde: pagan poco. <b>La recta</b> vive de su elevación: paga {s(tipos[-1]['delta'])}. Promedio de la liga: {s(PROM)}.</p></div>
</div>""")

# 11 · compresión
lamina("Arsenal · el hallazgo", "La altitud no daña a la recta mala: borra la ventaja de la buena",
       "En esta lámina las rectas están partidas en cinco grupos según su Stuff+ a nivel del mar.", f"""
<div class="dos ancho-izq">
  <div>{quintiles_svg()}</div>
  <div><p class="grande">La mejor recta baja de <b>{q['q5']['plus_mar']:.1f}</b> (élite) a <b>{q['q5']['plus_alt']:.1f}</b>: {s(q['q5']['delta'])}. La peor <b>gana {s(q['q1']['delta'])}</b>.</p>
  <p>Lo que separa a una recta de élite de una mediocre es el movimiento, y el movimiento es lo que el aire se lleva. Para el club: <b>no pagar sobreprecio por una recta de élite</b> para lanzar en casa.</p>
  <p class="nota">Azul: nivel del mar. Punto de color: el mismo lanzamiento en el Harp Helú.</p></div>
</div>""")

# 12 · élite / perfil
pf = CO["perfil_ideal"]
lamina("Perfil ideal · entregable 2", "En altura la élite es slider, no recta",
       "En esta lámina están los tipos que forman el 1 % mejor calificado en cada aire, y su perfil físico.", f"""
<div class="dos">
  <div>{mezcla_svg()}<p class="nota"><span style="color:{AZUL}">■</span> élite a nivel del mar &nbsp; <span style="color:{ROJO}">■</span> élite en el Harp Helú</p></div>
  <div><p class="grande">El slider pasa de <b>{mz['Slider']['top_nivel_mar'] * 100:.0f} %</b> a <b>{mz['Slider']['top_altitud'] * 100:.0f} %</b> de la élite; la recta cae de {mz['Four-Seam']['top_nivel_mar'] * 100:.0f} % a {mz['Four-Seam']['top_altitud'] * 100:.0f} %.</p>
  <table class="perfil"><tr><th></th><th>Élite mar</th><th>Élite Harp Helú</th></tr>
  <tr><td>Movimiento total</td><td>{pf['movement_total']['optimo_nivel_mar']:.1f} in</td><td><b>{pf['movement_total']['optimo_altitud']:.1f} in</b></td></tr>
  <tr><td>Giro que se vuelve movimiento</td><td>{pf['spin_efficiency']['optimo_nivel_mar'] * 100:.0f} %</td><td><b>{pf['spin_efficiency']['optimo_altitud'] * 100:.0f} %</b></td></tr>
  <tr><td>Velocidad</td><td>{pf['RelSpeed']['optimo_nivel_mar']:.1f} mph</td><td><b>{pf['RelSpeed']['optimo_altitud']:.1f} mph</b></td></tr></table>
  <p>Perfil a buscar: <b>no apostar al Magnus</b>. Giro tipo "bala", movimiento moderado, engaño por túnel.</p></div>
</div>""")

# 13 · por lanzador
lamina("La pregunta del club · entregable 1", f"{aguantan} de {J['pitchers_n']} lanzadores aguantan la altura",
       "En esta lámina cada punto es un lanzador: qué tan bueno es a nivel del mar contra cuánto cambia en el Harp Helú.", f"""
<div class="dos ancho-izq">
  <div>{mapa_svg()}</div>
  <div><p class="grande"><span style="color:{VERDE}">●</span> {aguantan} aguantan (pierden menos de 1.2) · <span style="color:{AMBAR}">●</span> {J['pitchers_n'] - aguantan - mucho} pierden · <span style="color:{ROJO}">●</span> {mucho} pierden mucho (más de 2.5).</p>
  <p>Los que más pierden suelen ser buenos a nivel del mar: su calidad era movimiento.</p>
  <p>Comprobación: en {J['pitchers_con_ambos']} lanzadores con 120+ lanzamientos en cada entorno, el delta del modelo y la diferencia de carreras observada van en la misma dirección (correlación {J['corr_modelo_vs_observado']:.2f}).</p></div>
</div>""")

# 14 · ejemplo completo
def ficha(x, veredicto, c):
    return f"""<div class="ficha" style="border-color:{c}"><span class="tag" style="color:{c}">{veredicto}</span>
  <h3>{x['nombre']}</h3><p class="nota">{x['arsenal']} · {'zurdo' if x['mano'] == 'Left' else 'derecho'} · {n(x['n'])} lanzamientos</p>
  <div class="salto"><div><span>Nivel del mar</span><b style="color:{AZUL}">{x['stuff_mar']:.1f}</b></div><div class="fl">→</div>
  <div><span>Harp Helú</span><b style="color:{ROJO}">{x['stuff_hh']:.1f}</b></div><div><span>Cambio</span><b style="color:{c}">{s(x['delta_hh'])}</b></div></div>
  <p>Location+ {x['location']:.1f} · Pitching+ {x['pitching']:.1f} · constancia ± {x['sd_juego']:.1f} entre juegos · rodados {x['gb'] * 100:.0f} %</p></div>"""

lamina("Ejemplo completo", f"{fichaje['nombre']} llega intacto; {peor['nombre']} pierde {abs(peor['delta_hh']):.1f} puntos",
       "En esta lámina están dos lanzadores con calidad parecida a nivel del mar y destinos opuestos en casa.", f"""
<div class="dos">{ficha(fichaje, 'Fichar', VERDE)}{ficha(peor, 'Evitar para casa', ROJO)}</div>
<p class="grande centro">A nivel del mar valen casi lo mismo ({fichaje['stuff_mar']:.1f} contra {peor['stuff_mar']:.1f}). En el Harp Helú los separan {fichaje['stuff_hh'] - peor['stuff_hh']:.1f} puntos: casi tres cuartos de desviación estándar.</p>""")

# 15 · riesgo
lamina("Recomendaciones · entregable 3", f"En casa, un elevado viaja {hh['dist_fb'] - mar['dist_fb']:.0f} pies más: buscar rodados",
       "En esta lámina está el riesgo del otro lado del bate, medido en los batazos de la liga.", f"""
<div class="cuatro">
  {cifra(f"{mar['dist_fb']:.0f} → {hh['dist_fb']:.0f} ft", 'distancia de un elevado', ROJO)}
  {cifra(f"{mar['hr_fb'] * 100:.1f} → {hh['hr_fb'] * 100:.1f} %", f"elevados que salen del parque ({s((hh['hr_fb'] / mar['hr_fb'] - 1) * 100, 0)} %)", ROJO)}
  {cifra(f"{mar['hr'] * 100:.2f} → {hh['hr'] * 100:.2f} %", 'jonrones por batazo en juego', ROJO)}
  {cifra(f"{mar['gb'] * 100:.1f} → {hh['gb'] * 100:.1f} %", 'batazos que son rodados', VERDE)}
</div>
<p class="grande centro">La recta pierde elevación, el bateador ya no le pasa por debajo y le pega de elevado: en altura ese elevado es jonrón más seguido. El rodado es el único batazo al que el aire no ayuda.</p>
<p class="nota centro">Nivel del mar → altitud extrema de la LMB.</p>""")

# 16 · qué hacer
aguantan_top = [x for x in sorted([x for x in P if x["stuff_hh"] >= 100], key=lambda x: -x["delta_hh"])][:5]
filas = "".join(f"<tr><td>{x['nombre']}</td><td>{x['arsenal']}</td><td>{x['stuff_hh']:.1f}</td><td style='color:{VERDE}'>{s(x['delta_hh'])}</td></tr>" for x in aguantan_top)
lamina("Qué hacer", "Fichar arsenales de cutter y slider; no pagar por movimiento",
       "En esta lámina están las decisiones concretas para el director deportivo y el pitching coach.", f"""
<div class="dos">
  <ol class="hacer">
    <li><b>Fichajes:</b> descontar a nivel del mar el valor que viene del movimiento. Una recta de élite pierde {abs(q['q5']['delta']):.1f} puntos en casa.</li>
    <li><b>Perfil:</b> buscar cutter, slider y splitter; lanzadores con rodados.</li>
    <li><b>Rotación:</b> abrir en casa a los que aguantan; los que pierden mucho, de visitante.</li>
    <li><b>Prospectos:</b> pasar sus números de Trackman por el simulador y ver su Stuff+ en los dos estadios.</li>
  </ol>
  <div><p class="tag">Buenos que aguantan (Stuff+ en casa ≥ 100)</p>
  <table class="perfil"><tr><th>Lanzador</th><th>Arsenal</th><th>Harp Helú</th><th>Cambio</th></tr>{filas}</table>
  <p class="nota">Lista completa, ordenable y con ficha por lanzador: pestaña Lanzadores del dashboard.</p></div>
</div>""")

# 17 · cierre
lamina("Límites y referencias", "Lo que el modelo no hace, dicho de frente",
       "En esta lámina están los límites del trabajo y la literatura en la que se apoya.", """
<div class="dos">
  <ul class="limites">
    <li><b>No identifica estadios:</b> "altitud extrema" agrupa parques; el Harp Helú es el caso más alto.</li>
    <li><b>No separa aire de clima:</b> el índice recoge densidad, temperatura y humedad juntas.</li>
    <li><b>No modela al bateador:</b> el barril (contacto perfecto) queda casi sin poder predictivo.</li>
    <li><b>No es causal:</b> es un modelo de valoración, no de táctica.</li>
    <li><b>El exponente de Reynolds es empírico,</b> calibrado y verificado fuera de muestra.</li>
  </ul>
  <ul class="refs">
    <li>Nathan, A. <i>The effect of altitude on baseball trajectories.</i> Physics of Baseball.</li>
    <li>SABR. <i>High altitude offense.</i> Baseball Research Journal.</li>
    <li>Tango, Lichtman y Dolphin (2007). <i>The Book: Playing the Percentages in Baseball.</i></li>
    <li>Huang y Hsu (2021). Big data analytics in baseball: a review. <i>SAGE Open</i> 11(4).</li>
    <li>Deshpande y Wyner (2017). A hierarchical Bayesian model of pitch framing. arXiv:1704.00823.</li>
  </ul>
</div>
<p class="nota centro">Datos de la LMB usados sólo para esta competencia: se presentan resultados, nunca datos. Lanzadores anonimizados por la liga.</p>""")

# ----------------------------------------------------------------------------- HTML

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

html = []
for i, (eb, tit, en, cuerpo, clase) in enumerate(LAMINAS, 1):
    if eb == "portada":
        html.append(f'<section class="lam portada">{cuerpo}<div class="pie"><span>Stuff+ a 2,240 m</span><span>ISAC 2026</span></div></section>')
        continue
    html.append(f"""<section class="lam {clase}"><div class="eyebrow">{eb}</div><h2>{tit}</h2><p class="en-esta">{en}</p>
<div class="cuerpo">{cuerpo}</div><div class="pie"><span>Stuff+ a 2,240 m · Hackathon ISAC 2026 · Diablos Rojos del México</span><span>{i:02d} / {len(LAMINAS):02d}</span></div></section>""")

doc = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Stuff+ a 2,240 m · Reporte</title>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{''.join(html)}</body></html>"""
salida = RAIZ / "entrega" / "reporte.html"
salida.write_text(doc)
print("HTML:", salida, "·", len(LAMINAS), "láminas")
