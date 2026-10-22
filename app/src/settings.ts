/* Ajustes del visitante: paleta, letra e idioma. Se guardan en el navegador y se aplican antes de
   pintar la app (main.tsx). Al cambiarlos la página se recarga, así la escena 3D y los textos salen
   ya con la configuración nueva. */
export type Paleta = 'noche' | 'crema' | 'estadio' | 'pizarra';
export type Letra = 'inter' | 'sistema' | 'dmsans';
export type Idioma = 'es' | 'en';
export type Ajustes = { paleta: Paleta; letra: Letra; idioma: Idioma };

export const PALETAS: { k: Paleta; es: string; en: string; sw: string[] }[] = [
  { k: 'noche', es: 'Noche', en: 'Night', sw: ['#0F0D0C', '#171312', '#E23B2E', '#5B9DBF', '#7FBF8F'] },
  { k: 'crema', es: 'Crema', en: 'Cream', sw: ['#F4F0E6', '#FFFFFF', '#D7362B', '#2E6FA6', '#1FA97A'] },
  { k: 'estadio', es: 'Estadio', en: 'Stadium', sw: ['#0B1226', '#121B36', '#FF5A4E', '#4CC9F0', '#FFD23F'] },
  { k: 'pizarra', es: 'Pizarra', en: 'Chalkboard', sw: ['#1F2A27', '#263330', '#FF8A7A', '#8EC5FF', '#FFE38A'] },
];

export const LETRAS: { k: Letra; label: string; css: string }[] = [
  { k: 'inter', label: 'Inter', css: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { k: 'sistema', label: 'Sistema (SF Pro / Segoe)', css: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" },
  { k: 'dmsans', label: 'DM Sans', css: "'DM Sans', system-ui, sans-serif" },
];

const BASE: Ajustes = { paleta: 'crema', letra: 'inter', idioma: 'es' };
const LLAVE = 'diablos.ajustes';

function leer(): Ajustes {
  try {
    const raw = localStorage.getItem(LLAVE);
    const a = raw ? { ...BASE, ...JSON.parse(raw) } : { ...BASE };
    if (!PALETAS.some(p => p.k === a.paleta)) a.paleta = BASE.paleta;
    if (!LETRAS.some(f => f.k === a.letra)) a.letra = BASE.letra;
    a.idioma = 'es';   // lo nuevo está sólo en español: el inglés queda fuera hasta traducirlo
    return a;
  } catch { return { ...BASE }; }
}

export const AJUSTES: Ajustes = leer();
export const IDIOMA: Idioma = AJUSTES.idioma;

/** Texto según el idioma elegido: L('Lanzamientos', 'Pitches'). */
export const L = (es: string, en: string) => (IDIOMA === 'en' ? en : es);
/** Formato de números del idioma. */
export const LOCALE = IDIOMA === 'en' ? 'en-US' : 'es-MX';
export const nf = (v: number, d = 0) =>
  v.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
/** Con signo y menos tipográfico: +1.3 / −8.4 */
export const sg = (v: number, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf(Math.abs(v), d)}`;

export function aplicarAjustes(a: Ajustes = AJUSTES) {
  const el = document.documentElement;
  el.setAttribute('data-theme', a.paleta);
  el.setAttribute('lang', a.idioma);
  el.style.setProperty('--cuerpo', LETRAS.find(f => f.k === a.letra)!.css);
}

export function guardarAjustes(cambio: Partial<Ajustes>) {
  const nuevo = { ...AJUSTES, ...cambio };
  try { localStorage.setItem(LLAVE, JSON.stringify(nuevo)); } catch { /* sin almacenamiento: sólo esta visita */ }
  aplicarAjustes(nuevo);
  window.location.reload();
}

/** Lee un color de la paleta activa (para canvas y three.js, que no entienden var()). */
export function color(nombre: string, respaldo: string) {
  if (typeof document === 'undefined') return respaldo;
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return v || respaldo;
}

// Se aplica en cuanto se carga este módulo, antes de que cualquier componente lea un color.
if (typeof document !== 'undefined') aplicarAjustes();
