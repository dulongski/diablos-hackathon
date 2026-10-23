"""Check evaluation transition implementation against the unchanged production labels."""
from pathlib import Path
import ast,sys,json
import numpy as np,pandas as pd
R=Path(__file__).resolve().parents[2]; O=Path(__file__).resolve().parent; sys.path.insert(0,str(R))
from src.stuffplus import sequence,targets
x=pd.read_pickle(R/'artifacts/model_frame.pkl').reset_index(drop=True)
e=sequence.pa_outcome(x); event_value=e.set_index('pa_id').pa_event.map(targets.LINEAR_WEIGHTS).astype(float)
# Extract only the pure function; never execute the training script at import time.
module=ast.parse((O/'evaluate.py').read_text()); fun=next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name=='apply_target')
ns={'np':np,'pd':pd,'event_value':event_value}; exec(compile(ast.Module(body=[fun],type_ignores=[]),'<apply_target>','exec'),ns)
center=float(event_value.mean()); vals=x.pa_id.map(event_value)-center
cv=vals.groupby(x['count']).mean().reindex(targets.COUNTS).fillna(0)
y=ns['apply_target'](x,cv,center); maxerr=float(np.max(np.abs(y-x.rv.to_numpy())))
assert maxerr<1e-12
out={'n':len(x),'max_abs_rv_error_full_lookup':maxerr,'passed':True,'scope':'Checks transition parity when given the same full-data lookup. New benchmark instead fits these tables per training split.'}
(O/'target_reconstruction_check.json').write_text(json.dumps(out,indent=2)); print(json.dumps(out))
