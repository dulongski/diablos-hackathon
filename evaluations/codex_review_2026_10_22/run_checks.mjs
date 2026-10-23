import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const out=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(out,'../..');
const esbuild=await import(path.join(root,'app/node_modules/esbuild/lib/main.js'));
const checks=[];
for(const test of ['physics','gbm']) {
 const bundle=await esbuild.build({entryPoints:[path.join(root,`app/test/${test}.test.ts`)],bundle:true,platform:'node',format:'cjs',write:false});
 const r=spawnSync(process.execPath,[],{input:bundle.outputFiles[0].text,encoding:'utf8',cwd:root});
 fs.writeFileSync(path.join(out,`${test}_test.log`),r.stdout+r.stderr);
 checks.push({name:test,exit_code:r.status,passed:r.status===0});
}
const tc=spawnSync(path.join(root,'app/node_modules/.bin/tsc'),['--project',path.join(root,'app/tsconfig.json'),'--noEmit','--incremental','false'],{encoding:'utf8',cwd:root});
fs.writeFileSync(path.join(out,'typecheck.log'),tc.stdout+tc.stderr);
checks.push({name:'typescript_no_emit',exit_code:tc.status,passed:tc.status===0});
fs.writeFileSync(path.join(out,'verification_results.json'),JSON.stringify({checks,scope:'Existing tests compiled in memory; typecheck emits no files. No full Vite build or visual browser review.'},null,2));
console.log(JSON.stringify(checks));
