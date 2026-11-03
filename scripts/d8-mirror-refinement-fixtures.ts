import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GameState} from '../engine/server/game';
import {oneShotBundle} from '../campaigns/one-shot/server';
import {d8CellToWorld} from '../campaigns/one-shot/public/pack';
import {mirrorDistanceToWall} from '../campaigns/one-shot/playground/mirror-cave-layout';
const option=(name:string,fallback:string)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const dir=option('output','output/d8-mirror-refinement-20261019'),old=JSON.parse((await readFile(option('baseline',`${dir}/working-baseline.json`),'utf8')).replace(/^\uFEFF/,''));
const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'refinement','maria');state.changeScene('mirror');
const base=state.publicSnapshot(),scene=base.scene,hero=state.characters.get('maria')!,key=(c:{col:number;row:number})=>`${c.col},${c.row}`;
assert.deepEqual(scene.grid.worldOrigin,old.scene.grid.worldOrigin);
for(const field of ['movementHazards','props','spawns'])assert.deepEqual((scene as any)[field],old.scene[field],field);
const allowed=new Set(scene.walkable.map(key)),hazards=new Set(scene.movementHazards!.flatMap(h=>h.cells.map(key)));
assert(old.scene.walkable.every((cell:any)=>allowed.has(key(cell))));
assert.deepEqual(scene.difficultCells!.filter(c=>c.col<20&&c.row<13),old.scene.difficultCells);
const minimumClearance=Math.min(...scene.walkable.map(c=>{const p=d8CellToWorld('mirror',c);return mirrorDistanceToWall(p.x,p.z);}));assert(minimumClearance>1.05);
const goals=[['arrival',17,11],['south-bank',11,10],['north-bank',11,2],['relic',4,5],['encounter',5,4],['east-wall',23,8],['south-wall',12,16],['west-wall',0,6]] as const;
const snapshots:any[]=[],routes:any[]=[];
for(const [id,col,row] of goals){
 const target={col,row},queue=[{...hero.cell}],previous=new Map<string,any>([[key(hero.cell),null]]);
 for(let i=0;i<queue.length&&!previous.has(key(target));i++)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const next={col:queue[i]!.col+dc!,row:queue[i]!.row+dr!};if(!allowed.has(key(next))||hazards.has(key(next))||previous.has(key(next)))continue;
  previous.set(key(next),queue[i]);queue.push(next);
 }
 assert(previous.has(key(target)),`No safe route to ${id}`);const path=[target];while(previous.get(key(path[0]!)))path.unshift(previous.get(key(path[0]!)));
 for(const next of path.slice(1)){const facing=next.col>hero.cell.col?'east':next.col<hero.cell.col?'west':next.row>hero.cell.row?'south':'north';assert(state.startStep(hero,facing));hero.step!.startedAt=Date.now()-3000;state.tick();assert.deepEqual(hero.cell,next);assert.equal(hero.hp,hero.maxHp);}
 snapshots.push({id,snapshot:state.publicSnapshot()});routes.push({id,path,world:d8CellToWorld('mirror',target)});
}
const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);assert.deepEqual(restored.captureDurable(now),save);
await writeFile(`${dir}/safe-snapshots.json`,JSON.stringify(snapshots));
await writeFile(`${dir}/e0.json`,JSON.stringify({routes,walkable:scene.walkable.length,difficult:scene.difficultCells!.length,hazards:hazards.size,minimumClearance},null,2));
state.changeScene('cafe');const cafe=state.publicSnapshot();state.changeScene('mirror');const before=state.publicSnapshot();state.prepareMirrorEncounter('maria');state.creature!.visible=true;const after=state.publicSnapshot();
await writeFile(`${dir}/sequence-fixtures.json`,JSON.stringify({before,after,cafe,reflectionId:state.creature!.id}));
await writeFile(`${dir}/gameplay-invariants.json`,JSON.stringify({pass:true,oldCells:old.scene.walkable.length,addedCells:scene.walkable.length-old.scene.walkable.length,unchanged:['old world origin and cells','49 hazard addresses','old difficult cells','props','spawns','durable round trip'],minimumClearance},null,2));
console.log(JSON.stringify({walkable:scene.walkable.length,addedCells:scene.walkable.length-old.scene.walkable.length,hazards:hazards.size,minimumClearance,points:snapshots.length}));
