from pathlib import Path
import hashlib,json,subprocess,zipfile,datetime
R=Path(__file__).resolve().parents[1]; E=R/'entrega'; D=R/'app/dist'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
files=[p for p in D.rglob('*') if p.is_file()]
with zipfile.ZipFile(E/'actualizacion_artifact.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files: z.write(p,p.relative_to(D))
manifest={'date_local':'2026-10-22','source_commit':(R/'delivery_checks/source_commit.txt').read_text().strip(),
 'working_branch':'codex/submission-consistency','production_models':'SHA256 unchanged; see delivery_checks/model_hashes_before.txt and after.txt',
 'dashboard':{'url':'https://claude.ai/artifact/1HXhuyBtkDd6szvLv9M7xo','publication':'update_files_prepared_not_published','public_data_files':13},
 'documents':json.loads((R/'delivery_checks/pdf_layout.json').read_text()),
 'headline_results':{'pitchers':561,'survive_half_run_cutoff':7,'lose_more_than_one_run':422,'league_transfer_delta_rounded':-9.3},
 'files':{name:{'bytes':(E/name).stat().st_size,'sha256':sha(E/name)} for name in ['documento_tecnico.pdf','reporte.pdf','dashboard.html','actualizacion_artifact.zip']},
 'artifact_files':{str(p.relative_to(D)):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in files},
 'limits':'Current trained model preserved. Revised transfer and narrative. Legacy calibration uses global target tables; strict audit is separate refits. Causal interpretation not identified. Standalone HTML structure checked; direct file execution not browser-tested.'}
(E/'manifest_entrega.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
paths=subprocess.check_output(['git','ls-files','-co','--exclude-standard'],cwd=R,text=True).splitlines()
selected=[]
for name in sorted(set(paths)):
 p=R/name
 if not p.is_file() or p.suffix in ('.zip','.pkl','.parquet','.rds','.npy'): continue
 if any(part in ('.git','.claude','.venv','node_modules','__pycache__') for part in p.relative_to(R).parts):continue
 if name.startswith(('delivery_checks/pdf_preview','delivery_checks/browser_probe')):continue
 selected.append(p)
# Include the already built static dashboard for inspection without npm.
selected+=files
with zipfile.ZipFile(E/'repositorio_corregido.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in selected:z.write(p,Path('diablos-entrega')/p.relative_to(R))
print(json.dumps({'artifact_zip_bytes':(E/'actualizacion_artifact.zip').stat().st_size,'source_zip_bytes':(E/'repositorio_corregido.zip').stat().st_size,'source_files':len(selected)},indent=2))
