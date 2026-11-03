import {createServer} from 'vite';
import {d8PublicRendererConfig} from '../campaigns/one-shot/renderer-config.ts';
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5189,strictPort:true},plugins:[{name:'review-fixtures',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url?.startsWith('/api/d8/renderer-config')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d8PublicRendererConfig()));return;}
  if(req.url?.startsWith('/art/'))req.url='/campaigns/one-shot/public'+req.url;
  next();
});}}]});
await server.listen();console.log('Revisión aislada: http://127.0.0.1:5189/scripts/combat-ui-review.html');
