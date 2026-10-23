import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
for (const test of ['physics', 'gbm', 'scoring']) {
  const bundle = await build({ entryPoints: [`test/${test}.test.ts`], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'error' });
  const run = spawnSync(process.execPath, ['-e', bundle.outputFiles[0].text], { stdio: 'inherit' });
  if (run.error) throw run.error;
  if (run.status !== 0) process.exit(run.status ?? 1);
}
console.log('All physics, GBM parity and scoring checks passed.');
