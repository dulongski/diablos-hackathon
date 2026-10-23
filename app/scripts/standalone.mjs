/** Build a self-contained dashboard from the verified Vite build and exported JSON. */
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dist=path.join(root,'app/dist');
const html=readFileSync(path.join(dist,'index.html'),'utf8');
const script=html.match(/src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const css=html.match(/href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if(!script||!css)throw new Error('Run npm run build first');
let js=readFileSync(path.join(dist,script),'utf8');
for(const [name,mime] of [['isac.svg','image/svg+xml'],['diablos.png','image/png']]){
 const data='data:'+mime+';base64,'+readFileSync(path.join(dist,'logos',name)).toString('base64');
 js=js.replaceAll('./logos/'+name,data);
}
const files=Object.fromEntries(readdirSync(path.join(dist,'data')).filter(f=>f.endsWith('.json')).map(f=>[f,JSON.parse(readFileSync(path.join(dist,'data',f),'utf8'))]));
const safe=JSON.stringify(files).replaceAll('<','\\u003c');
const bootstrap=`const embedded=JSON.parse(document.getElementById('dashboard-data').textContent);const realFetch=window.fetch.bind(window);window.fetch=async(input,options)=>{const value=typeof input==='string'?input:input instanceof URL?input.href:input.url;const name=value.split('?')[0].split('/').pop();if(value.includes('data/')&&Object.hasOwn(embedded,name))return new Response(JSON.stringify(embedded[name]),{status:200,headers:{'Content-Type':'application/json'}});return realFetch(input,options)};`;
const result=`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diablos Stuff+ · Entrega corregida</title><style>${readFileSync(path.join(dist,css),'utf8').replaceAll('</style','<\\/style')}</style></head><body><div id="root"></div><script id="dashboard-data" type="application/json">${safe}</script><script>${bootstrap}</script><script type="module">${js.replaceAll('</script','<\\/script')}</script></body></html>`;
mkdirSync(path.join(root,'entrega'),{recursive:true});
writeFileSync(path.join(root,'entrega/dashboard.html'),result);
console.log('Standalone dashboard:',result.length,'characters;',Object.keys(files).length,'embedded JSON datasets');
