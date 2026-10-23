"""Read-only target and future-meta-model diagnostics; outputs aggregates only."""
from pathlib import Path
import sys,json
import numpy as np,pandas as pd
from sklearn.model_selection import GroupKFold
R=Path(__file__).resolve().parents[2]; O=Path(__file__).resolve().parent
sys.path.insert(0,str(R))
from src.stuffplus import sequence
x=pd.read_pickle(R/'artifacts/model_frame.pkl').reset_index(drop=True)
e=sequence.pa_outcome(x); last=x.sort_values('file_order').groupby('pa_id',sort=False).tail(1)
unknown=last[last.pa_id.isin(e.loc[e.pa_event=='none','pa_id'])]
out={'unknown_terminal_pas':len(unknown),'total_pas':len(e),'unknown_fraction':len(unknown)/len(e),
     'unknown_last_pitch_calls':unknown.PitchCall.value_counts(dropna=False).to_dict(),
     'unknown_last_play_results':{str(k):int(v) for k,v in unknown.play_result.value_counts(dropna=False).items()},
     'hbp_calls':int((x.PitchCall=='HitByPitch').sum()),'hbp_flags':int(x.is_hit_by_pitch.sum()),
     'hbp_flag_mismatch':int(((x.PitchCall=='HitByPitch') != (x.is_hit_by_pitch==1)).sum())}
p=np.load(R/'artifacts/oof_rv.npy')[0]
t=pd.DataFrame({'p':x.pitcher_anon_id.fillna('__unknown__').astype(str),'year':x.year,'s':-p,'r':-x.rv})
a=t.groupby(['p','year']).agg(n=('r','size'),s=('s','mean'),r=('r','mean')).reset_index(); a=a[a.n>=200]
b=a.assign(year=a.year-1)[['p','year','r']].rename(columns={'r':'next_r'})
a=a.merge(b,on=['p','year']); y=a.next_r.to_numpy(); ids=a.p.to_numpy()
x1=np.c_[np.ones(len(a)),a.r]; x2=np.c_[x1,a.s]
pred=[]
for X in [x1,x2]:
 q=np.full(len(a),np.nan)
 for tr,te in GroupKFold(5).split(X,groups=ids):
  beta=np.linalg.lstsq(X[tr],y[tr],rcond=None)[0]; q[te]=X[te]@beta
 pred.append(q)
sst=((y-y.mean())**2).sum(); r2=[float(1-((y-q)**2).sum()/sst) for q in pred]
gain=(y-pred[0])**2-(y-pred[1])**2
z=pd.DataFrame({'g':ids,'d':gain}).groupby('g').agg(s=('d','sum'),n=('d','size')); rng=np.random.default_rng(20261022); bs=[]
for _ in range(2000):
 i=rng.integers(0,len(z),len(z)); bs.append(float(z.s.to_numpy()[i].sum()/z.n.to_numpy()[i].sum()))
out['incremental_future_meta_model']={'pairs':len(a),'pitchers':len(z),'past_rv_only_oof_r2':r2[0],'past_rv_plus_stuff_oof_r2':r2[1],'incremental_oof_r2':r2[1]-r2[0],
 'paired_mse_improvement':float(gain.mean()),'paired_mse_improvement_ci95':np.quantile(bs,[.025,.975]).tolist(),
 'limitation':'Repairs second-stage resubstitution only; original Stuff+ scores still use other pitchers from future calendar years. This remains retrospective, not prospective.'}
(O/'target_and_future_diagnostics.json').write_text(json.dumps(out,indent=2,allow_nan=False))
print(json.dumps(out,indent=2))
