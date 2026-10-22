/* "i" en un circulito: la explicación aparece al pasar el cursor, al tocar o al enfocar con teclado.
   Va junto a títulos y leyendas en lugar de párrafos debajo:  <h2>Título <Info>explicación…</Info></h2> */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { L } from '../settings';

export function Info({ children, etiqueta, ancho = false }: { children: ReactNode; etiqueta?: string; ancho?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const [abierto, setAbierto] = useState(false);

  // Posición fija calculada desde el ícono, siempre dentro de la pantalla; la flecha apunta al ícono.
  useLayoutEffect(() => {
    if (!abierto || !ref.current || !pop.current) return;
    const p = pop.current;
    const colocar = () => {
      const ic = ref.current!.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight, m = 12;
      const cx = ic.left + ic.width / 2;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const left = Math.max(m, Math.min(vw - m - w, cx - w / 2));
      const abajo = ic.bottom + 8 + h < window.innerHeight - m || ic.top - 8 - h < m;
      p.style.left = `${Math.round(left)}px`;
      p.style.top = `${Math.round(abajo ? ic.bottom + 8 : ic.top - 8 - h)}px`;
      p.style.setProperty('--ax', `${Math.round(cx - left)}px`);
      p.classList.toggle('arriba', !abajo);
    };
    colocar();
    window.addEventListener('scroll', colocar, true);
    window.addEventListener('resize', colocar);
    return () => { window.removeEventListener('scroll', colocar, true); window.removeEventListener('resize', colocar); };
  }, [abierto]);

  return (
    <span ref={ref} className={`info${abierto ? ' abierto' : ''}`} tabIndex={0} role="button"
      aria-label={etiqueta ?? L('Más información', 'More info')} aria-expanded={abierto}
      onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}
      onClick={e => { e.stopPropagation(); setAbierto(o => !o); }}
      onKeyDown={e => { if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur(); }}>
      <span className="info-i" aria-hidden>i</span>
      {abierto && createPortal(
        <span ref={pop} className={`info-pop${ancho ? ' ancho' : ''}`} role="tooltip">{children}</span>,
        document.body)}
    </span>
  );
}
