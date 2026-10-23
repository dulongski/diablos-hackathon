"""Regression diagnostic: transferring to the observed air should preserve measured features."""
from pathlib import Path
import sys,json
import numpy as np,pandas as pd
R=Path(__file__).resolve().parents[2]; O=Path(__file__).resolve().parent; sys.path.insert(0,str(R))
from src.stuffplus import physics,features
x=pd.read_pickle(R/'artifacts/model_frame.pkl').sample(128,random_state=20261022)
p=json.loads((R/'artifacts/physics.json').read_text())
kw=dict(rho_observed=x.rho_game.to_numpy(),aero=physics.decompose(x),magnus_gamma=p['magnus_gamma_vertical'],magnus_gamma_h=p['magnus_gamma_horizontal'])
obs=physics.transfer_shape(x,x.rho_game.to_numpy(),**kw); sea=physics.transfer_shape(x,1.,**kw)
result={}
for name,ref in [('existing_sea_reference',sea),('observed_reference',obs)]:
 z=physics.transfer_features(x[features.SHAPE],ref,obs)
 err={c:float(np.nanmax(np.abs(z[c].to_numpy()-x[c].to_numpy()))) for c in features.SHAPE}
 result[name]={'max_absolute_feature_errors':err,'identity_pass_1e_minus_9':all(v<1e-9 for v in err.values())}
assert not result['existing_sea_reference']['identity_pass_1e_minus_9']
assert result['observed_reference']['identity_pass_1e_minus_9']
(O/'transfer_identity_results.json').write_text(json.dumps(result,indent=2,allow_nan=False))
print(json.dumps(result,indent=2))
