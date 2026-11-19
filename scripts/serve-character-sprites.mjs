import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),port=Number(process.env.SPRITE_REVIEW_PORT||4606);
const allowed=['output/sprite-audit-20261115/','output/npc-sprites-20261115/','prototypes/godot-shared/sprites/','campaigns/one-shot/public/art/player-walks-v2/','docs/evidence/CHARACTER_SPRITES_20261115.md','docs/evidence/NPC_SPRITES_20261116.md'];
const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);
  if(!path)path='output/sprite-audit-20261115/index.html';
  const file=resolve(root,path),name=relative(root,file).replaceAll('\\','/');
  if(name.startsWith('..')||!allowed.some(prefix=>name.startsWith(prefix))||!mime[extname(file)]){res.writeHead(404).end('Not found');return;}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-store'}).end(bytes);
 }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Sprite review: http://127.0.0.1:${port}/output/sprite-audit-20261115/index.html`));
