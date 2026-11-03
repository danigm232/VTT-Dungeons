import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { GameState } from '../engine/server/game';
import { oneShotBundle } from '../campaigns/one-shot/server';
import { d8CellToWorld } from '../campaigns/one-shot/public/pack';
const dir='output/d8-mirror-candidate-20261018';
const state=new GameState(oneShotBundle);
state.claim('a'.repeat(32),'isolated-mirror','maria');state.changeScene('mirror');
const initial=state.publicSnapshot(),scene=initial.scene,hero=state.characters.get('maria')!;
const key=(c:{col:number;row:number})=>`${c.col},${c.row}`;
const hazards=new Set(scene.movementHazards!.flatMap(h=>h.cells.map(key)));
assert.equal(scene.walkable.length,260);assert.equal(scene.difficultCells!.length,205);assert.equal(hazards.size,49);
const goals=[['arrival',17,11],['south-bank',11,10],['north-bank',11,2],['relic',4,5],['encounter',5,4]] as const;
const routes:any[]=[],snapshots:any[]=[];
for(const [id,col,row] of goals){
 const target={col,row},queue=[{...hero.cell}],prev=new Map([[key(hero.cell),null as any]]);
 for(let i=0;i<queue.length&&!prev.has(key(target));i++)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const from=queue[i]!,next={col:from.col+dc!,row:from.row+dr!};
  if(prev.has(key(next))||hazards.has(key(next))||!scene.walkable.some(c=>key(c)===key(next)))continue;
  prev.set(key(next),from);queue.push(next);
 }
 assert(prev.has(key(target)),`No safe path to ${id}`);
 const path=[target];while(prev.get(key(path[0]!)))path.unshift(prev.get(key(path[0]!)));
 for(const next of path.slice(1)){
  const facing=next.col>hero.cell.col?'east':next.col<hero.cell.col?'west':next.row>hero.cell.row?'south':'north';
  assert(state.startStep(hero,facing),`Server rejected ${id} ${key(next)}`);
  hero.step!.startedAt=Date.now()-3000;state.tick();assert.deepEqual(hero.cell,next);assert(hero.hp>0);
 }
 const snapshot=state.publicSnapshot();snapshots.push({id,snapshot});routes.push({id,cell:target,world:d8CellToWorld('mirror',target),path,hp:hero.hp});
}
const sources=['campaigns/one-shot/playground/renderer.ts','campaigns/one-shot/playground/d8night.config.ts','campaigns/one-shot/public/pack.ts','engine/client/world-billboards.ts','apps/web/world.ts'];
const hashes=Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
await mkdir(dir,{recursive:true});await writeFile(`${dir}/e0.json`,JSON.stringify({at:new Date().toISOString(),walkable:260,difficult:205,hazards:[...hazards],props:scene.props,spawns:scene.spawns,routes,hashes},null,2));
await writeFile(`${dir}/safe-snapshots.json`,JSON.stringify(snapshots));
console.log(JSON.stringify({points:routes.map(r=>({id:r.id,cell:r.cell,steps:r.path.length-1})),walkable:260,difficult:205,hazards:49}));

