/**
 * Evaluador de ensambles de arboles de LightGBM.
 *
 * Los arboles llegan aplanados a arreglos paralelos desde `src/stuffplus/export.py`. Un
 * indice de hijo negativo apunta a una hoja: -k-1 es la hoja k. Recorrer un arbol es un
 * solo bucle, asi que puntuar un lanzamiento cuesta microsegundos y el simulador responde
 * mientras se arrastra el control.
 */

export interface FlatTree {
  f: number[];  // feature de cada nodo
  t: number[];  // umbral
  l: number[];  // hijo izquierdo (negativo = hoja)
  r: number[];  // hijo derecho
  d: number[];  // 1 si los faltantes van a la izquierda
  v: number[];  // valores de hoja
}

export interface Model {
  features: string[];
  objective: 'regression' | 'binary';
  trees: FlatTree[];
}

function evalTree(tree: FlatTree, x: Float64Array): number {
  let node = 0;
  for (;;) {
    const value = x[tree.f[node]];
    // LightGBM manda los faltantes al lado marcado por `default_left`.
    const goLeft = Number.isNaN(value) ? tree.d[node] === 1 : value <= tree.t[node];
    const next = goLeft ? tree.l[node] : tree.r[node];
    if (next < 0) return tree.v[-next - 1];
    node = next;
  }
}

/** Suma cruda del ensamble, antes de cualquier transformacion de enlace. */
export function rawScore(model: Model, features: Record<string, number>): number {
  const x = new Float64Array(model.features.length);
  for (let i = 0; i < model.features.length; i++) {
    const v = features[model.features[i]];
    x[i] = v === undefined ? NaN : v;
  }
  let sum = 0;
  for (const tree of model.trees) sum += evalTree(tree, x);
  return sum;
}

/** Prediccion en la escala del objetivo (sigmoide para los modelos binarios). */
export function predict(model: Model, features: Record<string, number>): number {
  const raw = rawScore(model, features);
  return model.objective === 'binary' ? 1 / (1 + Math.exp(-raw)) : raw;
}

/**
 * Escala plus de la sabermetria: 100 es el promedio de la liga y cada 10 puntos es una
 * desviacion estandar. Se invierte el signo del run value porque un valor bajo es bueno
 * para el lanzador.
 */
export function toPlus(raw: number, center: number, scale: number): number {
  return 100 + (10 * (-raw - center)) / scale;
}
