# App, export, and documentation audit

Existing application, model, data and documentation files were only read. New evaluation files were created in this directory. No retraining was performed by this audit.

## P1: Feature-transfer reference mismatch changes published counterfactuals

`scripts/04_export.py:71` sets the reference shape to sea level, then line 75 passes original observed features to `transfer_features`. `src/stuffplus/physics.py:440-449` adjusts original `VertBreak` and `spin_efficiency` relative to that sea shape. For a pitch observed in altitude, transferring to sea therefore leaves its observed raw vertical break and efficiency unchanged, although IVB, total movement and other transferred features have changed. The reference should describe the environment underlying the supplied feature frame. The same pattern occurs in `scripts/05_deliverables.py:45`, `scripts/10_local_extras.py:170`, and `scripts/11_robustez.py:127`.

A controlled 5,000-row sample (`random_state=20261022`) scores the production model with the original reference and an observed-shape reference. Mean altitude-minus-sea Stuff+ changes from **−8.215 to −9.250**. The mean absolute per-pitch change in the altitude penalty is **2.664** points, with maximum **18.136**. Four-Seam mean penalty changes from −11.436 to −13.584. This establishes numerical materiality; the corrected counterfactual still needs full physical and generalization validation. See `transfer_reference_checks.json` and `eval_transfer_reference.py`.

## P2: H4's near-zero RPM claim hides nonlinear sensitivity

`app/scripts/experimentos.ts:108-112` calculates only the slope between the first and last RPM grid points. The saved grid spans 98.1–104.0 Stuff+ at sea level. Adjacent 100 RPM changes range from −2.2 to +2.8 points; their mean absolute change is **1.7375**. Endpoint cancellation yields −0.01. `docs/documento_tecnico.md:450-455` and `app/src/components/Hipotesis.tsx:142` generalize that endpoint slope as negligible effect from 100 more RPM.

Report the sensitivity curve, finite differences, and multiple baseline pitch shapes. The experiment also reconstructs spin efficiency when RPM changes, so “all else fixed” needs that qualification. See `app_checks.json`.

## P2: Simulator and population exports disagree materially

Using current measured drag dispersion (0.0766589) and exact production simulator presets, the mean absolute difference between simulator and published population altitude penalties is **4.2303 points** across seven pitch types. Four-Seam: −18.493 vs −11.59; Slider: −10.728 vs −5.30; Changeup: −3.494 vs −7.31. This is a diagnostic comparison, not a proof the typical-pitch score should equal a population average. Both representations should be checked after fixing the transfer-reference issue; do not tune noise dispersion solely to force agreement.

`app/scripts/consistencia.ts:37-45` prints this difference but has no acceptance threshold or failing exit status. `CLAUDE.md:57` acknowledges ~4.2 points, while line 89 still says 3.2. Keep the numerical limitation visible in the simulator and update the stale guidance in a future authorized change.

## P2: Primary score parity test is outside npm test

`app/package.json:10` runs only `app/test/physics.test.ts`. `app/test/gbm.test.ts` exists but is not part of the test command. The consistency script also does not enforce a condition. Add both score parity and actual transfer-invariant tests to normal checks in a future authorized change.

The existing GBM fixtures **pass exactly**: 12/12 cases, zero maximum raw or Stuff+ error. This supports the current JavaScript tree evaluator and exported model agreement on observed examples. It does not cover feature transfer. `eval_app.mjs` compiles in memory with esbuild `write:false` and writes only a new results JSON.

## Artifact synchronization

Parsed copies of jurado, extras, hipotesis, causal, models, robustez and scale JSON match their artifact sources. Physics JSON intentionally adds the altitude-to-drag mapping in `scripts/04_export.py:109-115`; this is not a stale-copy defect. No material copied-artifact mismatch was found in those checks.
