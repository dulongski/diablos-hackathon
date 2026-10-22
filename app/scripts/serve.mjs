/**
 * Servidor estático mínimo con gzip, para exponer el build por un túnel.
 *
 * `python3 -m http.server` no negocia compresión, y el modelo son 2.4 MB de JSON: por un
 * túnel gratuito eso es media hora de espera para quien abra el link. Comprimido baja a
 * unos 400 KB.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const RAIZ = new URL('../dist/', import.meta.url).pathname;
const PUERTO = Number(process.argv[2] ?? 8788);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const COMPRIMIBLES = new Set(['.html', '.js', '.css', '.json', '.svg']);

createServer((req, res) => {
  // normalize + el prefijo obligatorio evitan que un ../ se escape de dist/
  const pedido = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let ruta = normalize(join(RAIZ, pedido === '/' ? 'index.html' : pedido));
  if (!ruta.startsWith(RAIZ)) { res.writeHead(403).end('Prohibido'); return; }
  if (!existsSync(ruta) || statSync(ruta).isDirectory()) ruta = join(RAIZ, 'index.html');

  const ext = extname(ruta);
  res.setHeader('Content-Type', TIPOS[ext] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const aceptaGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  const stream = createReadStream(ruta);
  if (aceptaGzip && COMPRIMIBLES.has(ext)) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    stream.pipe(createGzip({ level: 6 })).pipe(res);
  } else {
    stream.pipe(res);
  }
}).listen(PUERTO, () => console.log(`sirviendo dist/ en http://localhost:${PUERTO}`));
