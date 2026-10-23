"""Read-only 5k-row evaluation of transfer reference consistency; output a NEW JSON file.
Run from repo root: PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -B evaluations/codex_review_2026_10_22/eval_transfer_reference.py /tmp/transfer_reference_repeat.json
"""
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import lightgbm as lgb
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from src.stuffplus import physics

def main():
    destination=Path(sys.argv[1])
    if destination.exists():
        raise FileExistsError(destination)
    df=pd.read_pickle(ROOT/'artifacts/scored.pkl').sample(5000,random_state=20261022)
    p=json.loads((ROOT/'artifacts/physics.json').read_text())
    s=json.loads((ROOT/'artifacts/scale.json').read_text())['stuff']
    m=lgb.Booster(model_file=str(ROOT/'artifacts/model_stuff.txt'))
    features=m.feature_name()
    kw=dict(rho_observed=df.rho_game.to_numpy(),aero=physics.decompose(df),magnus_gamma=p['magnus_gamma_vertical'],magnus_gamma_h=p['magnus_gamma_horizontal'])
    sea=physics.transfer_shape(df,1.,**kw)
    observed=physics.transfer_shape(df,df.rho_game.to_numpy(),**kw)
    altitude=physics.transfer_shape(df,p['rho_altitud_extrema'],**kw)
    results={};arrays={}
    for mode,ref in [('existing_sea_reference',sea),('observed_reference',observed)]:
        arrays[mode]={}
        for name,shp in [('sea',sea),('altitude',altitude)]:
            X=physics.transfer_features(df[features],ref,shp)
            v=100+10*(-m.predict(X)-s['center'])/s['scale']
            arrays[mode][name]=v
            results[mode+'_'+name]={'mean_plus':float(v.mean()),'mean_VertBreak':float(X.VertBreak.mean()),'mean_spin_efficiency':float(X.spin_efficiency.mean())}
        arrays[mode]['delta']=arrays[mode]['altitude']-arrays[mode]['sea']
        results[mode+'_delta_mean']=float(arrays[mode]['delta'].mean())
    for name in ['sea','altitude','delta']:
        change=arrays['observed_reference'][name]-arrays['existing_sea_reference'][name]
        results['corrected_minus_existing_'+name]={'mean':float(change.mean()),'mean_abs':float(np.abs(change).mean()),'p05':float(np.quantile(change,.05)),'p95':float(np.quantile(change,.95)),'max_abs':float(np.abs(change).max())}
    results['by_pitch_type']=[]
    for t,idx in df.groupby('pitch_type',observed=True).indices.items():
        results['by_pitch_type'].append({'type':str(t),'n':len(idx),'existing_delta':float(arrays['existing_sea_reference']['delta'][idx].mean()),'observed_reference_delta':float(arrays['observed_reference']['delta'][idx].mean())})
    results['sample']={'n':len(df),'random_state':20261022,'source':'artifacts/scored.pkl','no_retraining':True,'limitation':'Reference correction alone; does not validate full physical transfer or model generalization.'}
    with destination.open('x') as f:
        json.dump(results,f,indent=2)
    print(json.dumps(results,indent=2))

if __name__=='__main__':
    main()
