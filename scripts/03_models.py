"""Etapa 3: entrenamiento y validacion fuera de muestra de las tres capas.

Valida en las tres direcciones que pide la rubrica:
  - holdout de pitcher  : generaliza a lanzadores no vistos (GroupKFold)
  - holdout de temporada: entrena 2024-2025, prueba 2026
  - holdout de parque   : entrena sin altitud extrema, prueba en altitud extrema

y contra el modelo nulo explicito de la rubrica: el run value promedio por conteo.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.stuffplus import features as F  # noqa: E402
from src.stuffplus import models  # noqa: E402

ART = Path(__file__).resolve().parents[1] / "artifacts"
COMPONENTS = [
    "y_swing", "y_whiff", "y_called_strike", "y_chase",
    "y_groundball", "y_barrel", "y_hard_contact", "y_weak_contact",
]


def main() -> None:
    df = pd.read_pickle(ART / "model_frame.pkl")
    sets = F.feature_sets()
    out: dict = {"n_pitches": int(len(df))}

    # --- modelo nulo de la rubrica: run value promedio por conteo ---
    cv = df.groupby("count")["rv"].mean()
    null_pred = df["count"].map(cv).to_numpy()
    out["baseline_nulo_por_conteo"] = models.score(df["rv"].to_numpy(), null_pred)
    print("modelo nulo (promedio por conteo): rmse %.5f  r2 %.5f"
          % (out["baseline_nulo_por_conteo"]["rmse"], out["baseline_nulo_por_conteo"]["r2"]))

    # --- holdout de pitcher sobre las tres capas ---
    out["holdout_pitcher"] = {}
    oof_store = {}
    for name, feats in sets.items():
        t0 = time.time()
        p_c, n_c = models.capa(name)
        oof, sc = models.cross_val(df, feats, target="rv", n_splits=4, params=p_c, n_rounds=n_c)
        oof_store[name] = oof
        sc["n_features"] = len(feats)
        sc["segundos"] = round(time.time() - t0, 1)
        out["holdout_pitcher"][name] = sc
        print(f"  {name:9s} rmse {sc['rmse']:.5f}  r2 {sc['r2']:.5f}  corr {sc['corr']:.4f}"
              f"  ({len(feats)} features, {sc['segundos']}s)")
    np.save(ART / "oof_rv.npy", np.vstack([oof_store[k] for k in sets]))

    # --- holdout de temporada y de parque, sobre la capa Stuff+ ---
    out["holdout_temporada"] = {}
    tr = df[df.year < 2026]
    te = df[df.year == 2026]
    p_s, n_s = models.capa("stuff")
    fit = models.train(tr, sets["stuff"], params=p_s, n_rounds=n_s)
    out["holdout_temporada"]["stuff"] = models.score(te["rv"].to_numpy(), fit.raw(te))
    print("  temporada (entrena 24-25, prueba 26): rmse %.5f r2 %.5f"
          % (out["holdout_temporada"]["stuff"]["rmse"], out["holdout_temporada"]["stuff"]["r2"]))

    out["holdout_parque"] = {}
    tr = df[df.altitude_category != "Extreme Altitude"]
    te = df[df.altitude_category == "Extreme Altitude"]
    fit_park = models.train(tr, sets["stuff"], params=p_s, n_rounds=n_s)
    out["holdout_parque"]["stuff"] = models.score(te["rv"].to_numpy(), fit_park.raw(te))
    print("  parque (entrena sin altitud, prueba en altitud): rmse %.5f r2 %.5f"
          % (out["holdout_parque"]["stuff"]["rmse"], out["holdout_parque"]["stuff"]["r2"]))

    # --- modelos de componente, para el tablero y la interpretacion ---
    out["componentes"] = {}
    comp_fits = {}
    for y in COMPONENTS:
        t0 = time.time()
        p_y = models.params_for(y)
        n_y = 400 if y in models.RARE_TARGETS else 300
        oof, _ = models.cross_val(df, sets["pitching"], target=y, n_splits=4,
                                  params=p_y, n_rounds=n_y)
        m = df[y].notna().to_numpy()
        b = models.brier(df[y].to_numpy()[m], oof[m])
        b["segundos"] = round(time.time() - t0, 1)
        out["componentes"][y] = b
        comp_fits[y] = models.train(df, sets["pitching"], target=y, params=p_y, n_rounds=n_y)
        print(f"  {y:18s} brier {b['brier']:.5f}  skill {b['skill']:+.4f}  n={b['n']:,}")

    # --- ablacion de arsenal sobre whiff ---
    # En el run value agregado el arsenal aporta poco, porque la varianza de un solo
    # lanzamiento la dominan la ubicacion y el conteo. Donde si se ve es en el swing fallido,
    # que es el mecanismo que el arsenal explica: diferencial de velocidad y tunel.
    out["ablacion_whiff"] = {}
    for name, feats in sets.items():
        oof, _ = models.cross_val(df, feats, target="y_whiff", n_splits=4,
                                  params={"objective": "binary"}, n_rounds=300)
        m = df["y_whiff"].notna().to_numpy()
        b = models.brier(df["y_whiff"].to_numpy()[m], oof[m])
        b["n_features"] = len(feats)
        out["ablacion_whiff"][name] = b
        print(f"  ablacion whiff {name:9s} brier {b['brier']:.5f}  skill {b['skill']:+.4f}")

    # --- modelos finales sobre todos los datos + escala plus ---
    final = {name: models.train(df, feats, params=models.capa(name)[0], n_rounds=models.capa(name)[1])
             for name, feats in sets.items()}
    for name, fit in final.items():
        df[f"{name}_plus"] = fit.plus(df)
        fit.booster.save_model(str(ART / f"model_{name}.txt"))
    for y, fit in comp_fits.items():
        fit.booster.save_model(str(ART / f"model_{y}.txt"))

    scale = {name: {"center": f.center, "scale": f.scale} for name, f in final.items()}
    (ART / "scale.json").write_text(json.dumps(scale, indent=2))
    df.to_pickle(ART / "scored.pkl")

    out["escala"] = scale
    out["distribucion_stuff_plus"] = {
        q: round(float(df.stuff_plus.quantile(q / 100)), 1) for q in (1, 5, 25, 50, 75, 95, 99)
    }
    (ART / "models.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))

    print("\ndistribucion de Stuff+ (percentiles):")
    print(json.dumps(out["distribucion_stuff_plus"], indent=2))


if __name__ == "__main__":
    main()
