"""Run with python -m unittest discover -s tests -v. Uses synthetic data only."""
from pathlib import Path
import unittest

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from src.stuffplus import models, targets


class ValidationRegressionTests(unittest.TestCase):
    def frame(self):
        # Two pitches per PA: called ball followed by ball in play.
        d = pd.DataFrame({
            'pa_id': [1, 1, 2, 2, 3, 3, 4, 4],
            'Balls': [0, 1] * 4, 'Strikes': [0] * 8,
            'is_called_strike': [0] * 8, 'is_whiff': [0] * 8,
            'PitchCall': ['BallCalled', 'InPlay'] * 4,
            'is_ball_in_play': [0, 1] * 4, 'is_hit_by_pitch': [0] * 8,
        })
        ev = pd.DataFrame({'pa_id': [1, 2, 3, 4], 'pa_event': ['hr', 'out_bip', '1b', 'k']})
        return d, ev

    def test_test_outcomes_cannot_change_reference_or_nonterminal_targets(self):
        d, ev = self.frame()
        tr = d[d.pa_id <= 2]
        te = d[d.pa_id > 2]
        train_ev = ev[ev.pa_id <= 2]
        ref = targets.fit_reference(tr, train_ev)
        got, counts = targets.run_values(te, ev[ev.pa_id > 2], reference=ref)
        changed_events = ev[ev.pa_id > 2].assign(pa_event='hr')
        changed, counts_changed = targets.run_values(te, changed_events, reference=ref)
        pd.testing.assert_series_equal(counts, counts_changed)
        np.testing.assert_allclose(got.loc[got.PitchCall == 'BallCalled', 'rv'],
                                   changed.loc[changed.PitchCall == 'BallCalled', 'rv'])
        self.assertNotEqual(got.rv.iloc[1], changed.rv.iloc[1])
        self.assertAlmostEqual(ref[0], (1.65 - .25) / 2)

    def test_fold_baseline_never_uses_heldout_outcomes(self):
        d, _ = self.frame()
        d["file_order"] = np.arange(len(d))
        for flag in ["base_on_balls", "strikeout", "single", "double", "triple", "home_run"]:
            d[flag] = 0
        d.loc[d.pa_id == 1, "home_run"] = 1
        d.loc[d.pa_id == 3, "single"] = 1
        tr, te = d[d.pa_id <= 2], d[d.pa_id > 2]
        train_targets, _, base1 = models.fold_run_values(tr, te)
        changed = te.copy()
        changed["home_run"] = 1
        changed["single"] = 0
        train_targets2, _, base2 = models.fold_run_values(tr, changed)
        np.testing.assert_allclose(base1, base2)
        np.testing.assert_allclose(train_targets.rv, train_targets2.rv)
        expected = train_targets.groupby("count").rv.mean()
        counts = te.Balls.astype(str) + "-" + te.Strikes.astype(str)
        np.testing.assert_allclose(base1, counts.map(expected))

    def test_missing_pitchers_are_one_explicit_group(self):
        got = models.group_ids(pd.Series(['a', None, pd.NA, 'b'], dtype='string'))
        self.assertEqual(got.tolist(), ['a', '__desconocido__', '__desconocido__', 'b'])
        self.assertFalse(pd.isna(got).any())

    def test_ols_predictions_match_manual_group_holdout(self):
        rng = np.random.default_rng(89)
        groups = np.repeat(np.arange(12), 2)
        x, z, y = rng.normal(size=(3, len(groups)))
        p1, p2 = models.incremental_oof(y, x, z, groups)
        a = np.c_[np.ones(len(x)), x]
        b = np.c_[a, z]
        for tr, te in GroupKFold(4).split(y, groups=models.group_ids(pd.Series(groups))):
            self.assertFalse(set(groups[tr]) & set(groups[te]))
            np.testing.assert_allclose(p1[te], a[te] @ np.linalg.lstsq(a[tr], y[tr], rcond=None)[0])
            np.testing.assert_allclose(p2[te], b[te] @ np.linalg.lstsq(b[tr], y[tr], rcond=None)[0])

    def test_heldout_incremental_gain_can_be_negative(self):
        rng = np.random.default_rng(2)
        x, z, y = rng.normal(size=(3, 60))
        p1, p2 = models.incremental_oof(y, x, z, np.arange(60))
        gain = np.mean((y-p1)**2 - (y-p2)**2) / np.var(y)
        self.assertLess(gain, 0)

    def test_incomplete_rows_are_excluded_from_both_models(self):
        y = np.arange(10, dtype=float)
        x, z = y.copy(), y.copy()
        z[3] = np.nan
        p1, p2 = models.incremental_oof(y, x, z, np.arange(10))
        self.assertTrue(np.isnan(p1[3]) and np.isnan(p2[3]))
        np.testing.assert_allclose(p1[np.arange(10) != 3], y[np.arange(10) != 3], atol=1e-10)

    def test_default_selected_training_is_todo(self):
        text = (Path(__file__).resolve().parents[1] / 'scripts/03_models.py').read_text()
        self.assertIn('os.environ.get("STUFF_ENTRENA", "todo")', text)


if __name__ == '__main__':
    unittest.main()
