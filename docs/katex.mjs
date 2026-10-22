// Fórmulas LaTeX → HTML con KaTeX, sin red. Lee [{tex, display}] por stdin y escribe [html] por stdout.
import { createRequire } from 'module';
const require = createRequire(new URL('../app/package.json', import.meta.url));
const katex = require('katex');
let entrada = '';
process.stdin.on('data', d => (entrada += d));
process.stdin.on('end', () => {
  const formulas = JSON.parse(entrada);
  const html = formulas.map(({ tex, display }) =>
    katex.renderToString(tex, { displayMode: display, throwOnError: true, output: 'html', strict: 'ignore' }));
  process.stdout.write(JSON.stringify(html));
});
