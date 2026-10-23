/* Vocabulario compartido: nombres de lanzamientos y cómo se lee un Stuff+ en palabras. */
import { L } from './settings';
import scale from '../public/data/scale.json';

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

/**
 * Cortes de "aguanta / pierde / pierde mucho", definidos en carreras y no en puntos.
 *
 * Un punto de Stuff+ vale una décima de la desviación estándar del modelo (scale.json), que hoy es
 * 0.01353 carreras por lanzamiento, o sea 0.135 carreras por cada 100 lanzamientos. Los cortes son media
 * carrera y una carrera por cada 100 lanzamientos. Si el modelo se reentrena y cambia su escala, se
 * recalculan aquí y nada más.
 */
export const CARRERAS_POR_PUNTO = scale.stuff.scale * 10;
export const CORTE_AGUANTA = -0.5 / CARRERAS_POR_PUNTO;   // ≈ −3.7 puntos
export const CORTE_MUCHO = -1.0 / CARRERAS_POR_PUNTO;     // ≈ −7.4 puntos

/** Puntos de Stuff+ convertidos a carreras por cada 100 lanzamientos. */
export const aCarreras = (puntos: number) => puntos * CARRERAS_POR_PUNTO;

/** Qué tanto pierde un lanzamiento en altitud, en una palabra. */
export function veredicto(delta: number): { txt: string; k: 'aguanta' | 'pierde' | 'mucho' } {
  if (delta > CORTE_AGUANTA) return { txt: L('Aguanta', 'Holds up'), k: 'aguanta' };
  if (delta > CORTE_MUCHO) return { txt: L('Pierde', 'Loses'), k: 'pierde' };
  return { txt: L('Pierde mucho', 'Loses a lot'), k: 'mucho' };
}
