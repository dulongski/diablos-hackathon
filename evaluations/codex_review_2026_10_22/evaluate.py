"""Isolated model audit. Reads production files, writes only inside this directory.
Run from repo root with PYTHONDONTWRITEBYTECODE=1 and existing Python environment.
No new tuning against the final chronological split is performed here.
"""
from pathlib import Path
import sys, json, time, platform, hashlib
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import GroupKFold
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from src.stuffplus import features as F, models, sequence, targets

def dump(name, obj):
    (OUT/name).write_text(json.dumps(obj, indent=2, allow_nan=False, default=lambda x: x.item() if hasattr(x,'item') else str(x)))

def metrics(y,p,base):
    return {'n':len(y),'rmse':float(np.sqrt(np.mean((y-p)**2))), 'r2':float(1-np.mean((y-p)**2)/np.var(y)),
            'skill_vs_training_count_baseline':float(1-np.mean((y-p)**2)/np.mean((y-base)**2)),
            'corr':float(np.corrcoef(y,p)[0,1]) if np.std(p)>0 else None}

def apply_target(d, count_values, event_center):
    # Same transition definition as production, but all fitted lookup values come from training only.
    balls=d.Balls.to_numpy(float); strikes=d.Strikes.to_numpy(float)
    call=d.PitchCall.astype(str)
    ball=call.isin(['BallCalled','BallinDirt','BallIntentional']).to_numpy() & (d.is_called_strike.fillna(0).to_numpy()==0)
    called=d.is_called_strike.fillna(0).to_numpy()==1
    whiff=d.is_whiff.fillna(0).to_numpy()==1
    strike=called|whiff|(call.str.startswith('Foul').to_numpy() & (strikes<2))
    terminal=(d.is_ball_in_play.fillna(0).to_numpy()==1)|(d.is_hit_by_pitch.fillna(0).to_numpy()==1)|(ball & (balls>=3))|((called|whiff)&(strikes>=2))
    nxt=pd.Series([f'{int(b)}-{int(s)}' for b,s in zip(np.clip(balls+ball,0,3),np.clip(strikes+strike,0,2))]).map(count_values).to_numpy()
    before=d['count'].map(count_values).to_numpy()
    return np.where(terminal,d.pa_id.map(event_value).to_numpy()-event_center,nxt)-before

def frozen_labels(tr,te):
    center=float(event_value.reindex(df.iloc[tr].pa_id.unique()).mean())
    vals=df.iloc[tr].pa_id.map(event_value).to_numpy()-center
    cv=pd.Series(vals).groupby(df.iloc[tr]['count'].to_numpy()).mean().reindex(targets.COUNTS).fillna(0)
    yt=apply_target(df.iloc[tr],cv,center); ye=apply_target(df.iloc[te],cv,center)
    btab=pd.Series(yt).groupby(df.iloc[tr]['count'].to_numpy()).mean()
    bt=df.iloc[tr]['count'].map(btab).to_numpy(); be=df.iloc[te]['count'].map(btab).to_numpy()
    return yt,ye,bt,be

def paired_ci(y,p,q,ids):
    # Paired pitcher-cluster bootstrap of MSE improvement, positive favors candidate.
    delta=(y-q)**2-(y-p)**2
    z=pd.DataFrame({'g':ids,'d':delta}).groupby('g').agg(s=('d','sum'),n=('d','size'))
    rng=np.random.default_rng(20261022); a=z.s.to_numpy(); n=z.n.to_numpy(); stats=[]
    for _ in range(2000):
        take=rng.integers(0,len(z),len(z)); stats.append(a[take].sum()/n[take].sum())
    return {'mse_improvement':float(delta.mean()),'ci95':np.quantile(stats,[.025,.975]).tolist(),'clusters':len(z)}

t0=time.time(); df=pd.read_pickle(ROOT/'artifacts/model_frame.pkl').reset_index(drop=True)
events=sequence.pa_outcome(df); event_value=events.set_index('pa_id').pa_event.map(targets.LINEAR_WEIGHTS).astype(float)
g=df.pitcher_anon_id.fillna("__unknown__").astype(str).to_numpy(); y=df.rv.to_numpy(); shape=list(F.SHAPE)
# Physically equivalent handedness plus smooth circular representation; no pitch labels or outcome features.
sign=np.where(df.is_rhp.to_numpy()==1,1.,-1.)
df['HB_arm']=df.HorzBreak*sign; df['RelSide_arm']=df.RelSide*sign
axis=np.deg2rad(np.where(sign>0,df.SpinAxis,360-df.SpinAxis))
df['axis_sin']=np.sin(axis); df['axis_cos']=np.cos(axis)
mirror=[c for c in shape if c not in ['HorzBreak','RelSide','SpinAxis']]+['HB_arm','RelSide_arm','axis_sin','axis_cos']
no_drag=[c for c in shape if c not in ['SpeedDrop','ZoneSpeed','ZoneTime']]
variants={'current':shape,'mirror_circular':mirror,'no_drag':no_drag,'environment_residual':shape}
params={**models.PARAMS,**models.capa('stuff')[0],'num_threads':4,'seed':20261022,'verbosity':-1}
# Diagnostic provenance and data quality, aggregates only.
old=np.load(ROOT/'artifacts/oof_rv.npy')[0]
base_global=df['count'].map(df.groupby('count').rv.mean()).to_numpy()
quality={'rows':len(df),'pitchers':len(np.unique(g)),'games':int(df.game_anon_id.nunique()),'years':{str(k):int(v) for k,v in df.groupby('year').size().items()},
 'unknown_terminal_pas':int((events.pa_event=='none').sum()),'pas':len(events),
 'shape_missing_fraction':{c:float(df[c].isna().mean()) for c in shape},
 'spin_efficiency_at_upper_cap_fraction':float((df.spin_efficiency>=2).mean()),
 'cached_oof_current':metrics(y,old,base_global),
 'cached_models_json':json.loads((ROOT/'artifacts/models.json').read_text()),
 'warning':'Cached metrics use full-data fitted target lookup. Newly fitted metrics use training-only lookups; do not compare these two protocols as treatment effect.'}
dump('data_audit.json',quality)
result={'protocol':{'target':'Production count-transition RV with PA centering and count-state values fitted on training split only', 'baseline':'Training-only mean RV by count','params':params,'rounds':400,'candidate_selection':'Fixed exploratory candidates, no search','caveats':['Four outer pitcher folds share training data; bootstrap captures held-out pitcher sampling, not full model-selection uncertainty.','2026 was already inspected by prior project development; chronological test is a retrospective check, not an untouched final test.','Only target tables and count baseline are fold-fitted here. Physics/shape preprocessing remains the supplied globally prepared artifact.','Environment-residual is a diagnostic deconfounding candidate; predictive accuracy does not identify a causal altitude effect.']},'grouped':{},'chronological':{}}
pred={k:np.full(len(df),np.nan) for k in [*variants,'current_shrink_half']}
yfold=np.zeros(len(df)); bfold=np.zeros(len(df)); foldlog=[]

def run_split(tr,te,label):
    yt,ye,bt,be=frozen_labels(tr,te)
    out={}; scores={}
    for name,fs in variants.items():
        target=yt.copy()
        # Remove training count and air-category averages; do not pass environment to scorer.
        if name=='environment_residual':
            nuisance=pd.DataFrame({'c':df.iloc[tr]['count'].to_numpy(),'e':df.iloc[tr].altitude_category.astype(str).to_numpy(),'y':yt})
            target=yt-nuisance.groupby(['c','e']).y.transform('mean').to_numpy()+float(yt.mean())
        booster=lgb.train(params,lgb.Dataset(df.iloc[tr][fs],target),num_boost_round=400)
        p=booster.predict(df.iloc[te][fs],num_threads=4)
        out[name]=p; scores[name]=metrics(ye,p,be)
        if name=='current':
            out['current_shrink_half']=float(yt.mean())+.5*(p-float(yt.mean()))
            scores['current_shrink_half']=metrics(ye,out['current_shrink_half'],be)
        print(label,name,json.dumps(scores[name]),flush=True)
    scores['count_baseline']=metrics(ye,be,be)
    return ye,be,out,scores

for k,(tr,te) in enumerate(GroupKFold(4).split(df,groups=g)):
    ye,be,ps,ms=run_split(tr,te,f'pitcher_fold_{k+1}')
    yfold[te]=ye; bfold[te]=be
    for name,p in ps.items(): pred[name][te]=p
    foldlog.append({'fold':k+1,'train':len(tr),'test':len(te),'pitcher_overlap':len(set(g[tr])&set(g[te])),'metrics':ms})
    dump('fold_progress.json',foldlog)
result['folds']=foldlog
for name,p in pred.items():
    result['grouped'][name]=metrics(yfold,p,bfold)
    result['grouped'][name]['paired_vs_current']=paired_ci(yfold,p,pred['current'],g)
result['grouped']['count_baseline']=metrics(yfold,bfold,bfold)
result['target_lookup_sensitivity']={'mean_abs_change_from_cached_rv':float(np.abs(yfold-y).mean()),'max_abs_change':float(np.abs(yfold-y).max())}
dump('results.json',result)
# Strictly chronological model fits. Existing physics transformations are not refitted.
for train_year,test_year in [(2024,2025),(2025,2026)]:
    tr=np.flatnonzero(df.year.to_numpy()<=train_year); te=np.flatnonzero(df.year.to_numpy()==test_year)
    ye,be,ps,ms=run_split(tr,te,f'train_through_{train_year}_test_{test_year}')
    for name,p in ps.items(): ms[name]['paired_vs_current']=paired_ci(ye,p,ps['current'],g[te])
    result['chronological'][str(test_year)]={'train_rows':len(tr),'test_rows':len(te),'metrics':ms}
    dump('results.json',result)
result['runtime_seconds']=round(time.time()-t0,2)
result['versions']={'python':platform.python_version(),'numpy':np.__version__,'pandas':pd.__version__,'lightgbm':lgb.__version__}
dump('results.json',result)
print('FINISHED',result['runtime_seconds'],flush=True)
