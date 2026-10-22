/** Navegación: cada pestaña es una pregunta del reto, con su ícono y una nota corta. */
import type { ReactNode } from 'react';

export type Vista = 'inicio' | 'lanzadores' | 'arsenal' | 'simulador' | 'confianza';

const ICONOS: Record<Vista, ReactNode> = {
  // una montaña: la altitud
  inicio: <path d="M2 20 L9 7 L13 13 L16 9 L22 20 Z" />,
  // una persona: el lanzador
  lanzadores: <><circle cx="12" cy="6.5" r="3.5" /><path d="M4.5 21 C4.5 15 8 12.5 12 12.5 C16 12.5 19.5 15 19.5 21 Z" /></>,
  // una pelota: el lanzamiento
  arsenal: <path fillRule="evenodd" d="M12 2 A10 10 0 1 1 11.99 2 Z M7 5.3 C9.3 8.3 9.3 15.7 7 18.7 L8.4 19.6 C11 16.2 11 7.8 8.4 4.4 Z M17 5.3 C14.7 8.3 14.7 15.7 17 18.7 L15.6 19.6 C13 16.2 13 7.8 15.6 4.4 Z" />,
  // tres controles deslizantes
  simulador: <><rect x="3" y="5" width="18" height="2" rx="1" /><rect x="3" y="11" width="18" height="2" rx="1" /><rect x="3" y="17" width="18" height="2" rx="1" /><circle cx="8" cy="6" r="2.6" /><circle cx="16" cy="12" r="2.6" /><circle cx="11" cy="18" r="2.6" /></>,
  // una palomita: se puede confiar
  confianza: <path d="M3.5 12.5 L9.5 18.5 L20.5 6.5 L18 4.5 L9.5 13.8 L6 10.2 Z" />,
};

const VISTAS: { v: Vista; t: string; nota: string }[] = [
  { v: 'inicio', t: 'Inicio', nota: 'Qué es y cómo leerlo' },
  { v: 'lanzadores', t: 'Lanzadores', nota: 'Quién sufre la altitud y quién aguanta' },
  { v: 'arsenal', t: 'Arsenal y perfil', nota: 'Qué lanzamientos buscar en casa' },
  { v: 'simulador', t: 'Simulador', nota: 'Prueba un lanzamiento en los dos estadios' },
  { v: 'confianza', t: '¿Funciona?', nota: 'Qué tan confiable es la calificación' },
];

export function Pestanas({ vista, onVista }: { vista: Vista; onVista: (v: Vista) => void }) {
  return (
    <nav className="pestanas" aria-label="Secciones">
      <div className="envoltura pestanas-fila">
        {VISTAS.map(p => (
          <button key={p.v} type="button"
                  className={`pestana p-${p.v}${vista === p.v ? ' activa' : ''}`}
                  aria-current={vista === p.v ? 'page' : undefined}
                  onClick={() => { onVista(p.v); window.scrollTo({ top: 0 }); }}>
            <svg viewBox="0 0 24 24" aria-hidden className="pestana-icono">{ICONOS[p.v]}</svg>
            <span className="pestana-texto">
              <span className="pestana-etiqueta">{p.t}</span>
              <span className="pestana-nota">{p.nota}</span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
