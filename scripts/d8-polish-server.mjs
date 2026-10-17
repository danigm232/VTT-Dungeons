// Stable local review build: production-style ESM chunks, no dependency optimizer.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname,sep,extname } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'runtime/d8-polish-review');
const evidence=resolve(root,'output/d8-polish-20261016');
if(process.argv.includes('--build')){
  const require=createRequire(import.meta.url);
  const esbuild=await import(pathToFileURL(require.resolve('esbuild',{paths:[dirname(require.resolve('vite'))]})).href);
  const baseline=process.argv.includes('--baseline')?JSON.parse(JSON.parse(JSON.parse(await readFile(resolve(root,'campaigns/one-shot/playground/historico/playground_v64.json'),'utf8')).payload).code).files:null;
  const plugins=baseline?[{name:'preserved-art-baseline',setup(build){build.onLoad({filter:/[\\/]playground[\\/](renderer|d8night\.config|temple-environment|sylvania-environment)\.ts$/},args=>({contents:baseline[args.path.split(/[\\/]/).at(-1)],loader:'ts',resolveDir:dirname(args.path)}));}}]:[];
  await mkdir(output,{recursive:true});
  await esbuild.build({absWorkingDir:root,entryPoints:['scripts/camera-review.ts'],outdir:resolve(output,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minifySyntax:true,chunkNames:'chunks/[name]-[hash]',plugins,logLevel:'info'});
  await esbuild.build({absWorkingDir:root,entryPoints:['campaigns/one-shot/renderer-config.ts'],outfile:resolve(output,'renderer-config.mjs'),bundle:true,format:'esm',platform:'node',plugins,logLevel:'warning'});
  const {d8PublicRendererConfig}=await import(pathToFileURL(resolve(output,'renderer-config.mjs')).href+'?t='+Date.now());
  await writeFile(resolve(output,'renderer-config.json'),JSON.stringify(d8PublicRendererConfig()));
  const html=(await readFile(resolve(root,'scripts/camera-review.html'),'utf8')).replace('/scripts/camera-review.ts','/assets/camera-review.js');
  await writeFile(resolve(output,'index.html'),html);
  console.log('Review built. Production data and installed application unchanged.');
}else{
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1:4587');res.setHeader('Cache-Control','no-store');
      if(req.method==='POST'&&['/__camera_capture','/__camera_report'].includes(url.pathname)){
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32000000)throw new Error('Review payload too large');chunks.push(chunk);}
        const bytes=Buffer.concat(chunks);await mkdir(evidence,{recursive:true});
        if(url.pathname==='/__camera_capture'){
          const name=url.searchParams.get('name');if(!/^d8-[a-z0-9-]+\.png$/.test(name??''))throw new Error('Invalid capture name');
          await writeFile(resolve(evidence,name),bytes);
        }else{
          const data=JSON.parse(bytes.toString());
          if(data.kind!=='polish'||! /^(temple|garden|market|cafe|mirror|dinner)$/.test(data.scene)||! /^(before|after)$/.test(data.stage))throw new Error('Invalid review report');
          await writeFile(resolve(evidence,`d8-${data.scene}-polish-${data.stage}.json`),JSON.stringify(data,null,2));
        }
        res.end('saved');return;
      }
      let file;
      if(url.pathname==='/api/d8/renderer-config')file=resolve(output,'renderer-config.json');
      else if(url.pathname.startsWith('/art/')){
        for(const campaign of ['one-shot','stormwreck-isle','camp-rests']){
          const base=resolve(root,'campaigns',campaign,'public','art'),candidate=resolve(base,decodeURIComponent(url.pathname.slice(5)));
          if(!candidate.startsWith(base+sep))throw new Error('Invalid art path');
          try{const bytes=await readFile(candidate);res.setHeader('Content-Type',extname(candidate)==='.svg'?'image/svg+xml':'image/png');res.end(bytes);return;}catch{}
        }
        res.writeHead(404);res.end('Missing art');return;
      }else{
        file=url.pathname==='/'||url.pathname==='/scripts/camera-review.html'?resolve(output,'index.html'):resolve(output,'.'+decodeURIComponent(url.pathname));
        if(!file.startsWith(output+sep))throw new Error('Invalid path');
      }
      const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]??'application/octet-stream');res.end(bytes);
    }catch(error){res.writeHead(500);res.end(String(error));}
  });
  server.listen(4587,'127.0.0.1',()=>console.log('Isolated review: http://127.0.0.1:4587/'));
}
