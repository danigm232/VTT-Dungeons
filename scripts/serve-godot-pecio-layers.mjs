import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('output/godot-pecio-layers-20261114');
const types = {'.html':'text/html; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((req,res)=>{
  const relative = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root,relative);
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
server.listen(4686,'127.0.0.1',()=>console.log('Pecio layers: http://127.0.0.1:4686'));
setTimeout(()=>server.close(),20*60*1000).unref();
