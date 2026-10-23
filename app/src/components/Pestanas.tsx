/** Navegación: cada pestaña es una pregunta del reto, con su ícono y una nota corta. */
import type { ReactNode } from 'react';

export type Vista = 'inicio' | 'metodologia' | 'confianza' | 'lanzadores' | 'arsenal' | 'hipotesis' | 'causal' | 'simulador' | 'anexo';

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
  // un matraz: la prueba
  hipotesis: <path d="M9 2.5 H15 V4.5 H14 V9.5 L20 19 C20.8 20.4 19.9 21.5 18.4 21.5 H5.6 C4.1 21.5 3.2 20.4 4 19 L10 9.5 V4.5 H9 Z M7.6 15.5 H16.4 L13.4 10.6 V5 H10.6 V10.6 Z" fillRule="evenodd" />,
  // tres pasos en escalera: la metodología
  metodologia: <><rect x="3" y="15" width="6" height="6" rx="1.2" /><rect x="9" y="9" width="6" height="12" rx="1.2" /><rect x="15" y="3" width="6" height="18" rx="1.2" /></>,
  // un árbol que se abre en dos ramas: el Causal Forest
  causal: <path d="M11 2 H13 V8 L18.5 12.5 V17 H20.5 V22 H14.5 V17 H16.5 V13.5 L12 9.8 L7.5 13.5 V17 H9.5 V22 H3.5 V17 H5.5 V12.5 L11 8 Z" />,
  // un libro abierto: el anexo
  anexo: <path d="M2.5 5 C5.5 4 8.5 4.3 11.2 6 V20 C8.5 18.5 5.5 18.2 2.5 19 Z M12.8 6 C15.5 4.3 18.5 4 21.5 5 V19 C18.5 18.2 15.5 18.5 12.8 20 Z" />,
};

const VISTAS: { v: Vista; t: string; nota: string }[] = [
  { v: 'inicio', t: 'Inicio', nota: 'Qué responde' },
  { v: 'metodologia', t: 'Metodología', nota: 'Qué hicimos y por qué confiar' },
  { v: 'lanzadores', t: 'Lanzadores', nota: 'Quién aguanta' },
  { v: 'arsenal', t: 'Arsenal y perfil', nota: 'Qué buscar' },
  { v: 'hipotesis', t: 'Hipótesis', nota: 'H1 a H4' },
  { v: 'causal', t: 'Causal Forest', nota: 'Qué hubiera pasado' },
  { v: 'simulador', t: 'Simulador', nota: 'Prueba un lanzamiento' },
  { v: 'anexo', t: 'Anexo', nota: 'Términos' },
];

export function Pestanas({ vista, onVista }: { vista: Vista; onVista: (v: Vista) => void }) {
  return (
    <nav className="pestanas" aria-label="Secciones">
      <div className="envoltura pestanas-fila">
        {VISTAS.map(p => { const activa = vista === p.v || (p.v === 'metodologia' && vista === 'confianza'); return (
          <button key={p.v} type="button"
                  className={`pestana p-${p.v}${activa ? ' activa' : ''}`}
                  aria-current={activa ? 'page' : undefined}
                  onClick={() => { onVista(p.v); window.scrollTo({ top: 0 }); }}>
            <svg viewBox="0 0 24 24" aria-hidden className="pestana-icono">{ICONOS[p.v]}</svg>
            <span className="pestana-texto">
              <span className="pestana-etiqueta">{p.t}</span>
              <span className="pestana-nota">{p.nota}</span>
            </span>
          </button>
        ); })}
      </div>
    </nav>
  );
}

/** Dentro de Metodología, dos vistas: cómo lo construimos y la validación. */
export function SubMetodo({ vista, onVista }: { vista: Vista; onVista: (v: Vista) => void }) {
  return (
    <div className="envoltura sub-metodo">
      <div className="segmentado" role="tablist" aria-label="Metodología">
        {([['metodologia', 'Cómo lo construimos'], ['confianza', 'Validación, por qué confiar']] as const).map(([v, t]) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v} className={vista === v ? 'activo' : ''}
                  onClick={() => { onVista(v); window.scrollTo({ top: 0 }); }}>{t}</button>
        ))}
      </div>
    </div>
  );
}
