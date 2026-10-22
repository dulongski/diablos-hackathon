/* Vocabulario compartido: nombres de lanzamientos y cómo se lee un Stuff+ en palabras. */
import { L } from './settings';

const NOMBRES: Record<string, [string, string]> = {
  'Four-Seam': ['Recta', 'Four-seam'],
  Sinker: ['Sinker', 'Sinker'],
  Cutter: ['Cutter', 'Cutter'],
  Slider: ['Slider', 'Slider'],
  Curveball: ['Curva', 'Curveball'],
  Changeup: ['Cambio', 'Changeup'],
  Splitter: ['Splitter', 'Splitter'],
};
export const nombreTipo = (t: string) => (NOMBRES[t] ? L(...NOMBRES[t]) : t);

/** Color fijo por tipo de lanzamiento, el mismo en toda la página. */
export const COLOR_TIPO: Record<string, string> = {
  'Four-Seam': '#E8B54A', Sinker: '#D9822B', Cutter: '#4FB89A', Slider: '#7C83F0',
  Curveball: '#A77BE0', Changeup: '#E0679A', Splitter: '#8FA3B0',
};

/** Stuff+ en palabras. 100 es el promedio de la liga; cada 10 puntos, un escalón. */
export function plusEnPalabras(v: number) {
  if (v >= 120) return L('élite', 'elite');
  if (v >= 110) return L('muy bueno', 'very good');
  if (v >= 104) return L('bueno', 'good');
  if (v > 96) return L('promedio', 'average');
  if (v > 90) return L('abajo del promedio', 'below average');
  return L('malo', 'poor');
}

/** Qué tanto pierde un lanzamiento en altitud, en una palabra. */
export function veredicto(delta: number): { txt: string; k: 'aguanta' | 'pierde' | 'mucho' } {
  if (delta > -1.2) return { txt: L('Aguanta', 'Holds up'), k: 'aguanta' };
  if (delta > -2.5) return { txt: L('Pierde', 'Loses'), k: 'pierde' };
  return { txt: L('Pierde mucho', 'Loses a lot'), k: 'mucho' };
}
