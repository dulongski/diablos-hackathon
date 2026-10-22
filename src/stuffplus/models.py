"""Modelos Stuff+, Location+ y Pitching+.

Tres capas sobre el mismo objetivo (el valor de carrera esperado del lanzamiento), que se
distinguen solo por que features ven:

  Stuff+     fisica del release. No ve ubicacion, conteo, bateador ni parque. Por eso es
             transferible: para saber cuanto vale el mismo pitch en otro aire, se le pasa
             la forma transferida y se vuelve a puntuar.
  Location+  agrega ubicacion, conteo y lado del bateador.
  Pitching+  agrega arsenal, secuencia y vuelta al orden.

La escala sigue la convencion sabermetrica: 100 es el promedio de la LMB de esa temporada,
y cada 10 puntos es una desviacion estandar. Se invierte el signo del run value porque un
run value bajo es bueno para el pitcher.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.model_selection import GroupKFold

PARAMS = {
    "objective": "regression",
    "learning_rate": 0.05,
    "num_leaves": 96,
    "min_data_in_leaf": 400,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "lambda_l2": 5.0,
    "verbose": -1,
    "num_threads": 0,
}
N_ROUNDS = 500

# Objetivos raros (barril: 2.5% de tasa base, ~2,900 positivos) necesitan arboles mucho mas
# chicos y mas regularizacion. Con los parametros generales el modelo queda por debajo de
# predecir la tasa base.
RARE_PARAMS = {
    "objective": "binary",
    "num_leaves": 16,
    "min_data_in_leaf": 150,
    "learning_rate": 0.03,
    "feature_fraction": 0.7,
    "lambda_l2": 20.0,
}
RARE_TARGETS = {"y_barrel"}


def params_for(target: str) -> dict:
    """Parametros segun el objetivo: los raros piden arboles chicos."""
    return dict(RARE_PARAMS) if target in RARE_TARGETS else {"objective": "binary"}


@dataclass
class Fitted:
    """Un modelo entrenado y la escala que lo lleva a la convencion 'plus'."""

    booster: lgb.Booster
    features: list[str]
    center: float = 0.0
    scale: float = 1.0
    calibrator: IsotonicRegression | None = None
    metrics: dict = field(default_factory=dict)

    def raw(self, X: pd.DataFrame) -> np.ndarray:
        return self.booster.predict(X[self.features], num_iteration=self.booster.best_iteration)

    def plus(self, X: pd.DataFrame) -> np.ndarray:
        """Escala plus: 100 + 10 z(-xRV). Mayor a 100 es mejor que el promedio de la liga."""
        return 100.0 + 10.0 * (-(self.raw(X)) - self.center) / self.scale


def train(
    df: pd.DataFrame,
    features: list[str],
    target: str = "rv",
    params: dict | None = None,
    n_rounds: int = N_ROUNDS,
    weight: np.ndarray | None = None,
) -> Fitted:
    """Entrena un modelo sobre todas las filas con objetivo definido."""
    p = {**PARAMS, **(params or {})}
    m = df[target].notna()
    X, y = df.loc[m, features], df.loc[m, target]
    ds = lgb.Dataset(X, y, weight=None if weight is None else weight[m.to_numpy()])
    booster = lgb.train(p, ds, num_boost_round=n_rounds)
    booster.best_iteration = n_rounds

    fit = Fitted(booster=booster, features=features)
    s = -booster.predict(X)
    fit.center, fit.scale = float(s.mean()), float(s.std())
    return fit


def cross_val(
    df: pd.DataFrame,
    features: list[str],
    target: str = "rv",
    groups: str = "pitcher_anon_id",
    n_splits: int = 5,
    params: dict | None = None,
    n_rounds: int = N_ROUNDS,
) -> tuple[np.ndarray, dict]:
    """Validacion cruzada agrupada: ningun pitcher aparece en entrenamiento y prueba a la vez.

    Es la prueba que importa para Stuff+. Sin agrupar por pitcher, el modelo puede memorizar
    firmas de release y reportar metricas que no sobreviven a un lanzador nuevo, que es
    justo el caso de uso: evaluar a un prospecto que el club no ha visto.
    """
    p = {**PARAMS, **(params or {})}
    m = df[target].notna().to_numpy()
    X, y = df.loc[m, features], df.loc[m, target].to_numpy()
    # Los pitches sin pitcher identificado (0.2% del dataset) forman su propio grupo, para
    # que no se repartan entre pliegues y contaminen el holdout.
    g = df.loc[m, groups].astype(str).fillna("__desconocido__").to_numpy()

    oof = np.full(len(df), np.nan)
    idx = np.flatnonzero(m)
    for tr, te in GroupKFold(n_splits=n_splits).split(X, y, g):
        b = lgb.train(p, lgb.Dataset(X.iloc[tr], y[tr]), num_boost_round=n_rounds)
        oof[idx[te]] = b.predict(X.iloc[te])

    return oof, score(y, oof[idx])


def score(y: np.ndarray, pred: np.ndarray) -> dict:
    """Metricas contra el modelo nulo, que aqui es simplemente la media del objetivo."""
    m = np.isfinite(pred) & np.isfinite(y)
    y, pred = y[m], pred[m]
    sse = float(np.sum((y - pred) ** 2))
    sst = float(np.sum((y - y.mean()) ** 2))
    return {
        "n": int(m.sum()),
        "rmse": float(np.sqrt(sse / len(y))),
        "r2": 1.0 - sse / sst,
        "corr": float(np.corrcoef(y, pred)[0, 1]),
    }


def brier(y: np.ndarray, p: np.ndarray) -> dict:
    """Brier score y su mejora relativa contra predecir siempre la tasa base."""
    m = np.isfinite(y) & np.isfinite(p)
    y, p = y[m], p[m]
    bs = float(np.mean((y - p) ** 2))
    base = float(np.mean((y - y.mean()) ** 2))
    return {"n": int(m.sum()), "brier": bs, "brier_base": base, "skill": 1.0 - bs / base}


def calibration_table(y: np.ndarray, p: np.ndarray, bins: int = 10) -> pd.DataFrame:
    """Curva de calibracion: probabilidad predicha contra frecuencia observada."""
    m = np.isfinite(y) & np.isfinite(p)
    d = pd.DataFrame({"y": y[m], "p": p[m]})
    d["bin"] = pd.qcut(d.p, bins, duplicates="drop")
    return d.groupby("bin", observed=True).agg(
        predicha=("p", "mean"), observada=("y", "mean"), n=("y", "size")
    ).reset_index(drop=True)
