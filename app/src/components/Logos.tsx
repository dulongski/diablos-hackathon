/** Logos del hackathon (ISAC) y del club que plantea el reto. Si falta un archivo, simplemente no se muestra. */
import { useState } from 'react';

export function Logos({ compacto = false }: { compacto?: boolean }) {
  const [ok, setOk] = useState({ isac: true, diablos: true });
  return (
    <span className={`logos${compacto ? ' compacto' : ''}`}>
      {ok.isac && <img src="./logos/isac.svg" alt="ISAC · ITAM Sports Analytics Conference" className="logo-isac"
                       onError={() => setOk(o => ({ ...o, isac: false }))} />}
      {ok.diablos && <img src="./logos/diablos.png" alt="Diablos Rojos del México" className="logo-diablos"
                          onError={() => setOk(o => ({ ...o, diablos: false }))} />}
    </span>
  );
}
