/** Forma de `data/jurado.json`: todo lo que el reto pide, organizado por entregable y criterio.
 *  Lo produce `scripts/07_jurado.py`. */

export interface Pitcher {
  nombre: string;
  mano: 'Right' | 'Left' | null;
  n: number;
  stuff: number; location: number; pitching: number;   // como lanzó, en sus estadios reales
  stuff_mar: number; stuff_hh: number; delta_hh: number; // el mismo arsenal en los dos aires
  sd_juego: number; juegos: number;                     // constancia entre juegos
  velo: number; whiff: number; gb: number; pct_altura: number;
  arsenal: string;
  n_hh: number | null; n_mar: number | null;
  carreras_hh: number | null; carreras_mar: number | null; carreras_delta: number | null;
}

export interface Tramo {
  tramo: string; n: number;
  carreras_100: number; carreras_pred_100: number;
  whiff_swing: number; hard_bip: number; hr_bip: number;
}

export interface Arsenal { arsenal: string; pitchers: number; stuff_hh: number; stuff_mar: number; delta: number }

export interface Riesgo {
  altitude_category: string; n: number; hr: number; hard: number; dist: number; gb: number;
  dist_fb: number; hr_fb: number;
}

export interface PuntoMapa { t: string; c: 'mejor' | 'peor'; hb: number; ivb: number; v: number; s: number }

export interface Metrica { n: number; rmse: number; r2: number; corr?: number; n_features?: number }
export interface Componente { n: number; brier: number; brier_base: number; skill: number }

export interface Jurado {
  calibracion: Tramo[];
  modelo_nulo: Metrica;
  holdout: {
    pitcher: Record<'stuff' | 'location' | 'pitching', Metrica>;
    temporada: { stuff: Metrica };
    parque: { stuff: Metrica };
    componentes: Record<string, Componente>;
    ablacion_whiff: Record<string, Componente>;
  };
  pitchers_n: number;
  pitchers_con_ambos: number;
  corr_modelo_vs_observado: number | null;
  pitchers: Pitcher[];
  arsenales: Arsenal[];
  tipos: { tipo: string; n: number; stuff_mar: number; stuff_hh: number; delta: number; ivb: number; hb: number; velo: number; whiff: number }[];
  riesgo: Riesgo[];
  mapa: PuntoMapa[];
}

/** Los tipos de lanzamiento llegan con su nombre en español desde el pipeline. */
export const COLOR_TIPO_ES: Record<string, string> = {
  Recta: '#E8B54A', Sinker: '#D9822B', Cutter: '#4FB89A', Slider: '#7C83F0',
  Curva: '#A77BE0', Cambio: '#E0679A', Splitter: '#8FA3B0',
};
