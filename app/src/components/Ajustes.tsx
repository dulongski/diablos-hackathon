/* Menú de ajustes (engrane): paleta, letra e idioma. Cada cambio se guarda y recarga la página. */
import { useEffect, useRef, useState } from 'react';
import { AJUSTES, L, LETRAS, PALETAS, guardarAjustes } from '../settings';

/** Engrane simétrico: 8 dientes trapezoidales alrededor de un anillo, con hueco central. */
const ENGRANE = (() => {
  const n = 8, R = 10.5, r = 8, hueco = 3.4, c = 12;
  const p = (a: number, rad: number) => `${(c + rad * Math.cos(a)).toFixed(3)} ${(c + rad * Math.sin(a)).toFixed(3)}`;
  const paso = (Math.PI * 2) / n, punta = paso * 0.22, base = paso * 0.3;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * paso - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${p(a - base, r)} L${p(a - punta, R)} L${p(a + punta, R)} L${p(a + base, r)} `;
    d += `A ${r} ${r} 0 0 1 ${p(a + paso - base, r)} `;
  }
  return `${d}Z M${c + hueco} ${c} A ${hueco} ${hueco} 0 1 0 ${c - hueco} ${c} A ${hueco} ${hueco} 0 1 0 ${c + hueco} ${c} Z`;
})();

export function Ajustes() {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('pointerdown', fuera); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc); };
  }, [abierto]);
  const A = AJUSTES;
  return (
    <div className="cfg" ref={caja}>
      <button type="button" className="cfg-btn" aria-label={L('Ajustes', 'Settings')} aria-expanded={abierto}
              title={L('Ajustes: paleta, letra e idioma', 'Settings: palette, font and language')}
              onClick={() => setAbierto(o => !o)}>
        <svg viewBox="0 0 24 24" aria-hidden><path d={ENGRANE} fillRule="evenodd" /></svg>
      </button>
      {abierto && (
        <div className="cfg-panel" role="dialog" aria-label={L('Ajustes', 'Settings')}>
          <div className="cfg-cabeza"><b>{L('Ajustes', 'Settings')}</b>
            <span>{L('Se guarda en este navegador. La página se recarga al cambiar.', 'Saved in this browser. The page reloads on change.')}</span></div>

          <div className="cfg-sec">{L('Paleta', 'Palette')}</div>
          <div className="cfg-paletas">
            {PALETAS.map(p => (
              <button key={p.k} type="button" className="cfg-op" aria-pressed={A.paleta === p.k}
                      onClick={() => A.paleta !== p.k && guardarAjustes({ paleta: p.k })}>
                <span className="cfg-muestra" style={{ background: p.sw[0] }}>
                  {p.sw.slice(1).map(c => <i key={c} style={{ background: c }} />)}
                </span>
                <span>{L(p.es, p.en)}{p.k === 'crema' && <small> · {L('por defecto', 'default')}</small>}</span>
              </button>
            ))}
          </div>

          <div className="cfg-sec">{L('Letra', 'Font')}</div>
          <div className="cfg-letras">
            {LETRAS.map(f => (
              <button key={f.k} type="button" className="cfg-op" aria-pressed={A.letra === f.k} style={{ fontFamily: f.css }}
                      onClick={() => A.letra !== f.k && guardarAjustes({ letra: f.k })}>
                <span className="cfg-aa">Aa</span><span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Idioma oculto: las vistas nuevas están sólo en español. */}
        </div>
      )}
    </div>
  );
}
