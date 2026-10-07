import { defineConfig } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const evidenceRoot=resolve('output/d8-v49-review-20261006');
export default defineConfig({cacheDir:'node_modules/.vite-camera-review',server:{host:'127.0.0.1',port:4587,strictPort:true,hmr:false,watch:{ignored:['**/output/**','**/dist/**']}},plugins:[{
  name:'isolated-camera-review', configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname==='/api/d8/renderer-config'){
        const {d8PublicRendererConfig}=await server.ssrLoadModule('/campaigns/one-shot/renderer-config.ts');
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d8PublicRendererConfig()));return;
      }
      if(url.pathname==='/__camera_report'&&req.method==='POST'){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const data=JSON.parse(Buffer.concat(chunks).toString());
        await mkdir(evidenceRoot,{recursive:true});
        const kind=data.kind==='focus'?'focus-audit':'audit';
        await writeFile(resolve(evidenceRoot,`${data.campaign==='d8'?'d8':'storm'}-${kind}.json`),JSON.stringify(data,null,2));
        res.end('saved');return;
      }
      if(url.pathname==='/__camera_capture'&&req.method==='POST'){
        const name=url.searchParams.get('name');if(!/^(d8|storm)-[a-z0-9-]+\.png$/.test(name??'')){res.statusCode=400;res.end();return;}
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        await mkdir(evidenceRoot,{recursive:true});await writeFile(resolve(evidenceRoot,name),Buffer.concat(chunks));res.end('saved');return;
      }
      if(!url.pathname.startsWith('/art/')){next();return;}
      const campaign=new URL(req.headers.referer??'http://localhost').searchParams.get('campaign');
      const folders=campaign==='storm'?['stormwreck-isle','camp-rests']:['one-shot','stormwreck-isle','camp-rests'];
      for(const folder of folders){
        const root=resolve('campaigns',folder,'public','art'),file=resolve(root,decodeURIComponent(url.pathname.slice(5)));
        if(!file.startsWith(root+sep))continue;
        try{const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':'image/png');res.end(bytes);return;}catch{}
      }
      res.statusCode=404;res.end('Art not found');
    });
  }
}]});
