// HTML → PDF con el Chromium de Playwright. Uso: node docs/pdf.mjs entrada.html salida.pdf [carta|lamina]
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const [entrada, salida, formato = 'carta'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + path.resolve(entrada), { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf(formato === 'lamina'
  ? { path: salida, width: '1280px', height: '720px', printBackground: true }
  : { path: salida, format: 'Letter', printBackground: true, preferCSSPageSize: true });
await b.close();
console.log('PDF:', salida);
