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

/** Una celda de 2 pulgadas del mapa de movimiento: nunca un lanzamiento suelto, sólo promedios de al menos 10. */
export interface PuntoMapa { t: string; c: 'mejor' | 'peor'; hb: number; ivb: number; v: number; s: number; n: number }

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
  /** Validación de un Stuff+ de física pura: rasgo estable del lanzador y poder predictivo hacia 2026. */
  estabilidad?: {
    mitades: Record<'stuff' | 'location' | 'pitching' | 'rv', number>;
    lanzadores_mitades: number;
    futuro: Record<'stuff' | 'location' | 'pitching' | 'carreras_pasadas', number>;
    lanzadores_futuro: number;
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

/* ---------------------------------------------- data/hipotesis.json (scripts/08_hipotesis.py) */

export interface ConIC { ic: [number, number] }
export interface Hipotesis {
  h1: {
    por_tipo: ({ tipo: string; pitchers: number; delta: number; d_ivb_obs: number; d_hb_obs: number; celdas_obs: number } & ConIC)[];
    spearman_mov_vs_delta: { rho: number; p: number; tipos: number };
    todos_pierden: boolean;
    nathan: {
      recta: { mar: number; coors: number; hh: number; solo_densidad_coors: number; solo_densidad_hh: number };
      curva: { caida_mar: number; caida_coors: number; caida_hh: number; total_mar: number; total_coors: number; total_hh: number };
    };
  };
  h2: { pares: ({ tipo: string; pitchers: number; ventaja_vs_recta: number; pct_pitchers_gana: number } & ConIC)[] };
  h3: {
    pitchers: number; pendiente_alt: number; ic_alt: [number, number]; pendiente_mar: number; ic_mar: [number, number];
    diferencia: number; ic_dif: [number, number]; p_una_cola: number;
    terciles: { grupo: string; gb: number; pitchers: number; carreras_mar: number; carreras_hh: number; castigo: number }[];
  };
  h4: {
    importancia: { grupo: string; peso: number }[]; rango_spinrate: number; n_features: number;
    experimento: {
      stuff_por_100rpm: number; stuff_por_pulgada: number;
      parejas: Record<'A' | 'B', { rpm: number; ivb: number; mar: number; hh: number }>;
    };
  };
}

/* ---------------------------------------------- data/causal.json (scripts/09_causal_forest.py) */

export interface PitcherCF {
  nombre: string; arsenal: string; mano: string | null;
  tau: number; tau_lo: number; tau_hi: number; tau_oof: number;
  stuff_mar: number; stuff_hh: number; delta_hh: number; carreras_delta: number;
  n_hh: number; n_mar: number; gb: number; whiff: number; velo: number; rank: number;
}
export interface Causal {
  pitchers_n: number; ate: number; ate_ic90: [number, number]; tau_rango: [number, number];
  importancia: { variable: string; clave: string; peso: number }[];
  gates: { grupo: string; etiqueta: string; pitchers: number; predicho: number; observado: number; ic: [number, number] }[];
  pendiente: { valor: number; ic: [number, number]; p_una_cola: number };
  q4_menos_q1: { valor: number; ic: [number, number] };
  acuerdo_stuff: { pearson: number; p: number; spearman: number };
  pitchers: PitcherCF[];
}

/* ---------------------------------------------- data/extras.json (scripts/10_local_extras.py, opcional) */

export interface CeldaTactica { altura: 0 | 1; conteo: string; mismo_lado: 0 | 1; efecto: number; ic90: [number, number]; n: number }
export interface Contraste {
  a: string; b: string; filas: number;
  por_entorno: Record<'mar' | 'altura', { efecto: number; ic90: [number, number]; n: number }>;
  cambio_por_altura: number; celdas: CeldaTactica[];
}
export interface Extras {
  cf_tactico?: { contrastes: Record<string, Contraste> } | { error: string };
  shap?: Record<'stuff' | 'location' | 'pitching', { top: { variable: string; peso: number }[]; grupos: Record<string, number> }> | { error: string };
  tres_entornos?: { por_tipo: { tipo: string; n: number; mar: number; media: number; extrema: number }[]; liga: Record<'mar' | 'media' | 'extrema', number> } | { error: string };
}

/* ------------------------------------------------------------------ robustez (scripts/11_robustez.py, opcional) */
type IC = [number | null, number | null];
type Err = { error: string };
export interface Robustez {
  stuff_entrena?: 'mar' | 'todo';
  parque?: {
    n: number; lanzadores: number;
    por_100: Record<'obs' | 'alt' | 'mar' | 'total' | 'fisica' | 'resto' | 'fraccion', number>;
    ic95_por_100: Record<'obs' | 'alt' | 'mar' | 'total' | 'fisica' | 'resto' | 'fraccion', IC>;
    r2_forma_altura: number; r2_forma_mar: number; r2_nivel_corregido: number; corr: number; corr_ic95: IC;
    por_tipo?: { tipo: string; lanzadores: number; fisica_100: number; observado_100: number }[];
    por_tipo_spearman?: { rho: number; p: number; tipos: number };
  } | Err;
  discriminacion?: Record<'stuff' | 'location' | 'pitching', {
    carreras_100_mejor10: number; carreras_100_peor10: number; brecha_100: number; brecha_ic95: IC;
    whiff_mejor10: number; whiff_peor10: number;
  }> | Err;
  confiabilidad?: Record<'crudo' | 'sin_mezcla' | 'solo_mezcla' | 'solo_rectas' | 'carreras', { r: number | null; lanzadores: number; ic95: IC }> | Err;
  futuro?: {
    pares: number; lanzadores: number;
    carreras: FuturoObjetivo; whiff: FuturoObjetivo;
  } | Err;
  combinacion?: {
    componentes: string[]; pesos: Record<string, number>; corr_entre_ellos: number;
    combinado: Metrica & { brecha_100: number; mitades: number };
    directo: Metrica & { brecha_100: number; mitades: number };
  } | Err;
  especificaciones?: {
    variantes: Record<'produccion' | 'sin_frenado' | 'todos_los_juegos', { variables: number; liga: number; por_tipo: Record<string, number> }>;
    orden_igual: Record<'sin_frenado' | 'todos_los_juegos', number>;
  } | Err;
}
export interface FuturoObjetivo {
  stuff: { r: number; ic95: IC }; carreras_pasadas: { r: number; ic95: IC }; whiff_pasado: { r: number; ic95: IC };
  stuff_menos_carreras_pasadas: { d: number; ic95: IC }; r2_incremental_stuff: { d: number; ic95: IC };
}
export const sinError = <T,>(x: T | Err | undefined): T | null => (x && !('error' in (x as object)) ? (x as T) : null);
