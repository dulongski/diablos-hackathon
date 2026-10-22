/**
 * El campo de aire.
 *
 * Cada punto es una porcion de atmosfera. Cuando el control de altitud sube, el conteo baja
 * en la misma proporcion que la densidad real del aire: a 2,240 m desaparece uno de cada
 * cinco. Es el unico adorno de la pagina y esta atado al unico argumento que la pagina hace.
 *
 * No hay deriva ambiental. El campo solo cambia cuando alguien mueve el control; un campo
 * flotando solo se leeria como atmosfera de relleno.
 */
import { useEffect, useRef } from 'react';
import { color } from '../settings';

const MAX_PUNTOS = 900;

/** Posiciones fijas por semilla: los puntos no se reacomodan al cambiar la densidad,
 *  solo desaparecen. Asi la perdida se lee como perdida y no como movimiento. */
function seeded(n: number) {
  const pts: { x: number; y: number; r: number }[] = [];
  let s = 20240711;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) pts.push({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.0 });
  return pts;
}

export function AirField({ density }: { density: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useRef(seeded(MAX_PUNTOS));

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // clientWidth del documento, no innerWidth: si algo desborda, innerWidth arrastra
      // el lienzo con el desborde y lo agranda de mas.
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const n = Math.round(MAX_PUNTOS * density);
      ctx.fillStyle = color('--enrarecido', '#D6DCD8');
      for (let i = 0; i < n; i++) {
        const p = pts.current[i];
        ctx.globalAlpha = 0.05 + p.r * 0.045;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [density]);

  return <canvas ref={ref} className="campo-aire" aria-hidden="true" />;
}
