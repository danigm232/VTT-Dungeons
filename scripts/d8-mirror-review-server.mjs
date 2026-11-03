import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const option=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const root=resolve(import.meta.dirname,'..'),base=resolve(root,option('runtime','runtime/d8-mirror-candidate')),evidence=resolve(root,option('evidence','output/d8-mirror-candidate-20261018')),port=Number(option('port','4596'));
if(!base.startsWith(root+sep)||!evidence.startsWith(root+sep)||!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid review workspace/port');
const stage=process.argv.find(a=>a.startsWith('--stage='))?.split('=')[1]??'candidate';
if(!/^(baseline|e[1-5]|p(?:0[1-9]|10)|candidate)$/.test(stage))throw Error('Invalid stage');
if(process.argv.includes('--build')){
 const require=createRequire(import.meta.url),esbuild=await import(pathToFileURL(require.resolve('esbuild',{paths:[dirname(require.resolve('vite'))]})).href);
 const output=resolve(base,stage);await mkdir(output,{recursive:true});
 await esbuild.build({absWorkingDir:root,entryPoints:['scripts/d8-mirror-review.ts'],outdir:resolve(output,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minifySyntax:true,logLevel:'warning'});
 await esbuild.build({absWorkingDir:root,entryPoints:['campaigns/one-shot/renderer-config.ts'],outfile:resolve(output,'config.mjs'),bundle:true,format:'esm',platform:'node',logLevel:'warning'});
 const {d8PublicRendererConfig}=await import(pathToFileURL(resolve(output,'config.mjs')).href);await writeFile(resolve(output,'config.json'),JSON.stringify(d8PublicRendererConfig()));
 await writeFile(resolve(output,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><title>Espejo · ${stage}</title><style>body{margin:0;background:#101923;color:#e2e8ea;font:14px system-ui}header{padding:8px}button,select{padding:8px;margin:4px;background:#24394c;color:white}#world{width:1280px;height:720px;position:relative;overflow:hidden}canvas{position:absolute}pre{white-space:pre-wrap}</style><header>Espejo · ${stage} · revisión aislada <button id="capture">Capturar avance</button><button id="smoke">Validar fase</button><button id="matrix">Capturar vistas</button><button id="extra">Luz y pantallas</button><button id="motion">Recorrido animado</button><button id="cleanup">Revisar limpieza</button><button id="sequence">Secuencia · 30 s</button><button id="acceptance">E6 completa · 20 minutos</button><select id="point"></select><button id="left">−15°</button><button id="right">+15°</button><button id="near">Acercar</button><button id="far">Alejar</button><button id="grid">Cuadrícula</button></header><div id="world"></div><pre id="status">Cargando…</pre><script type="module" src="/${stage}/assets/d8-mirror-review.js"></script></html>`);
 console.log(`Built ${stage}`);
}else createServer(async(req,res)=>{try{
 const url=new URL(req.url,`http://127.0.0.1:${port}`);res.setHeader('Cache-Control','no-store');
 if(req.method==='POST'&&url.pathname==='/evidence'){
  const name=url.searchParams.get('name');if(!/^(baseline|e[1-5]|p(?:0[1-9]|10)|candidate)-[a-z0-9-]+\.(png|json|webm)$/.test(name??''))throw Error('Invalid evidence name');
  const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>64000000)throw Error('Too large');chunks.push(chunk);}
  await writeFile(resolve(evidence,name),Buffer.concat(chunks));res.end('saved');return;
 }
 let file;
 if(url.pathname==='/api/d8/renderer-config'){const ref=new URL(req.headers.referer??'http://x/candidate/');file=resolve(base,ref.pathname.split('/')[1]||'candidate','config.json');}
 else if(['/safe-snapshots.json','/sequence-fixtures.json','/exit-fixtures.json','/movement-fixtures.json','/e0.json'].includes(url.pathname))file=resolve(evidence,url.pathname.slice(1));
 else if(url.pathname.startsWith('/gallery/'))file=resolve(evidence,url.pathname.slice(9)||'index.html');
 else if(url.pathname.startsWith('/art/')||url.pathname.startsWith('/audio/'))file=resolve(root,'campaigns/one-shot/public','.'+decodeURIComponent(url.pathname));
 else file=resolve(base,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+sep))throw Error('Invalid path');
 const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.md':'text/plain; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.svg':'image/svg+xml','.wav':'audio/wav','.ogg':'audio/ogg','.mp3':'audio/mpeg'})[extname(file)]??'application/octet-stream');res.end(bytes);
 }catch(e){res.writeHead(500);res.end(String(e));}}).listen(port,'127.0.0.1',()=>console.log(`Review http://127.0.0.1:${port}/candidate/`));



