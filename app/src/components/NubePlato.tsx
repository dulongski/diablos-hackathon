/**
 * La nube en el plato, vista desde el cátcher.
 *
 * Cada punto es un envío. Azul: dónde cae al nivel del mar. Rojo: dónde cae exactamente el
 * mismo envío en el aire del Harp Helú. La nube entera se corre hacia abajo, y ese
 * corrimiento (no el de un lanzamiento perfecto) es lo que cambia el porcentaje de strikes.
 *
 * Va en canvas y no en SVG: con miles de puntos por nube, SVG crea miles de nodos y el
 * arrastre de un control deja de ser fluido.
 */
import { useEffect, useRef } from 'react';
import { ZONA, type Nube } from '../lib/cloud';
import { color, L } from '../settings';

/** Ventana visible en pies, desde el punto de vista del cátcher. */
const X_LIM = 2.3;
const Z_MIN = 0.1, Z_MAX = 5.0;

export type Capa = 'ambas' | 'mar' | 'alt';

export function NubePlato({ mar, alt, capa, isRhp }: {
  mar: Nube; alt: Nube; capa: Capa; isRhp: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Vista de cátcher: el lado del bateador diestro queda a la izquierda del dibujo.
    const px = (x: number) => w / 2 - (x / X_LIM) * (w / 2) * 0.88;
    const pz = (z: number) => h - ((z - Z_MIN) / (Z_MAX - Z_MIN)) * h;

    // zona de strike
    const zx0 = px(ZONA.medioAncho), zx1 = px(-ZONA.medioAncho);
    const zy0 = pz(ZONA.arriba), zy1 = pz(ZONA.abajo);
    ctx.strokeStyle = color('--ceniza', '#6B6360');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(zx0, zy0, zx1 - zx0, zy1 - zy0);
    ctx.strokeStyle = color('--tezontle', '#2A2422');
    ctx.lineWidth = 1;
    for (let k = 1; k <= 2; k++) {
      const fx = zx0 + ((zx1 - zx0) * k) / 3;
      const fy = zy0 + ((zy1 - zy0) * k) / 3;
      ctx.beginPath(); ctx.moveTo(fx, zy0); ctx.lineTo(fx, zy1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(zx0, fy); ctx.lineTo(zx1, fy); ctx.stroke();
    }

    const dibuja = (n: Nube, color: string, alpha: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (const e of n.envios) {
        ctx.beginPath();
        ctx.arc(px(e.plateX), pz(e.plateZ), 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    // El de altitud va encima porque es el que se quiere leer.
    if (capa !== 'alt') dibuja(mar, color('--nivel-mar', '#5B9DBF'), capa === 'ambas' ? 0.34 : 0.5);
    if (capa !== 'mar') dibuja(alt, color('--diablo', '#E23B2E'), capa === 'ambas' ? 0.32 : 0.5);

    // El centro de cada nube, que es lo que de verdad se corre.
    const centro = (n: Nube, color: string) => {
      const cx = n.envios.reduce((a, e) => a + e.plateX, 0) / n.envios.length;
      const cz = n.envios.reduce((a, e) => a + e.plateZ, 0) / n.envios.length;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px(cx), pz(cz), 7, 0, Math.PI * 2); ctx.stroke();
      return { cx, cz };
    };
    const cm = capa !== 'alt' ? centro(mar, color('--nivel-mar', '#9FCBE0')) : null;
    const ca = capa !== 'mar' ? centro(alt, color('--diablo', '#F58A80')) : null;
    if (cm && ca) {
      ctx.strokeStyle = color('--aviso', '#E8B54A');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px(cm.cx), pz(cm.cz)); ctx.lineTo(px(ca.cx), pz(ca.cz)); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = color('--ceniza', '#8A8F8B');
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText(L('Vista del cátcher', "Catcher's view"), 10, h - 10);
  }, [mar, alt, capa, isRhp]);

  return (
    <canvas ref={ref} className="nube-plato"
            role="img"
            aria-label={L(`${mar.envios.length} lanzamientos vistos desde el cátcher. A nivel del mar ${(mar.pctZona * 100).toFixed(1)} % caen en la zona de strike; en el Harp Helú, ${(alt.pctZona * 100).toFixed(1)} %.`,
              `${mar.envios.length} pitches seen from the catcher. At sea level ${(mar.pctZona * 100).toFixed(1)}% land in the zone; at Harp Helú, ${(alt.pctZona * 100).toFixed(1)}%.`)} />
  );
}
