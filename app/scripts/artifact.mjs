/**
 * Arma el archivo que se publica como Artifact a partir del build de Vite.
 *
 * El contrato de Artifacts envuelve el archivo en su propio <!doctype>/<html>/<head>/<body>,
 * así que aquí se emite solo el contenido: título, fuentes, hoja de estilos y el punto de
 * montaje. Los nombres de los bundles llevan hash y cambian en cada build, por eso se leen
 * del index.html generado en vez de escribirse a mano.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const js = html.match(/src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const css = html.match(/href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if (!js || !css) throw new Error('No se encontraron los bundles en dist/index.html');

writeFileSync('dist/artifact.html', `<title>Stuff+ a 2,240 m</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Martian+Mono:wght@300..700&display=swap">
<link rel="stylesheet" href="${css}">
<div id="root"></div>
<script type="module" src="${js}"></script>
`);
console.log(`envoltorio listo -> ${js}, ${css}`);
