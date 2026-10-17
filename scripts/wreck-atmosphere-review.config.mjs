import { defineConfig } from 'vite';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve,sep } from 'node:path';
const evidence=resolve(process.env.WRECK_EVIDENCE_DIR??'output/pecio-atmosphere-20261012');
export default defineConfig({cacheDir:'node_modules/.vite-wreck-atmosphere',server:{host:'127.0.0.1',port:4612,strictPort:true,hmr:false,watch:{ignored:['**/output/**','**/dist/**']}},plugins:[{name:'wreck-atmosphere-review',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/__wreck_sight'&&req.method==='POST'){
    const chunks=[];for await(const c of req)chunks.push(c);const data=JSON.parse(Buffer.concat(chunks).toString());await mkdir(evidence,{recursive:true});await writeFile(resolve(evidence,'sight-audit.json'),JSON.stringify(data,null,2));res.end('saved');return;
  }
  if(url.pathname==='/__wreck_capture'&&req.method==='POST'){
    const name=url.searchParams.get('name');if(!/^wreck-[a-z0-9-]+\.png$/.test(name??'')){res.statusCode=400;res.end();return;}
    const chunks=[];for await(const c of req)chunks.push(c);await mkdir(evidence,{recursive:true});await writeFile(resolve(evidence,name),Buffer.concat(chunks));res.end('saved');return;
  }
  if(url.pathname==='/__wreck_report'&&req.method==='POST'){
    const chunks=[];for await(const c of req)chunks.push(c);const data=JSON.parse(Buffer.concat(chunks).toString());await mkdir(evidence,{recursive:true});await writeFile(resolve(evidence,'visual-audit.json'),JSON.stringify(data,null,2));res.end('saved');return;
  }
  if(!url.pathname.startsWith('/art/')){next();return;}
  for(const folder of ['stormwreck-isle','camp-rests']){
    const root=resolve('campaigns',folder,'public','art'),file=resolve(root,decodeURIComponent(url.pathname.slice(5)));if(!file.startsWith(root+sep))continue;
    try{res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':'image/png');res.end(await readFile(file));return;}catch{}
  }res.statusCode=404;res.end('Art not found');
});}}]});
