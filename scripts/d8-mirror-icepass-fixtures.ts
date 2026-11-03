import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GameState} from '../engine/server/game';
import {oneShotBundle} from '../campaigns/one-shot/server';
import {footprintFor} from '../engine/shared/geometry';
const dir=process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'output/d8-mirror-icepass-20261020';
await mkdir(dir,{recursive:true});
const s=new GameState(oneShotBundle);s.claim('e'.repeat(32),'ice-review','maria');s.changeScene('mirror');
const old=JSON.parse(await readFile('output/d8-mirror-artpass-20261019/safe-snapshots.json','utf8'))[0].snapshot.scene,scene=s.currentScene(),hero=s.characters.get('maria')!,key=(c:{col:number;row:number})=>`${c.col},${c.row}`;
for(const field of ['walkable','difficultCells','movementHazards','spawns'])assert.deepEqual((scene as any)[field],old[field],field);
assert.deepEqual(scene.props.filter(p=>p.id!=='mirror-ice-seal'),old.props);
const allowed=new Set(scene.walkable.map(key)),hazards=new Set(scene.movementHazards!.flatMap(h=>h.cells.map(key))),blocked=new Set(s.publicSnapshot().props.flatMap(p=>footprintFor(p.cell,p.rotation,p.footprint).map(key)));
const goals=[['arrival',17,11],['south-bank',11,10],['north-bank',11,2],['relic',4,5],['encounter',5,4],['east-wall',23,8],['south-wall',12,16],['west-wall',0,6]] as const;
const points:any[]=[],routes:any[]=[];
function walk(col:number,row:number){const goal={col,row},q=[{...hero.cell}],prev=new Map<string,any>([[key(hero.cell),null]]);
 for(let i=0;i<q.length&&!prev.has(key(goal));i++)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const next={col:q[i]!.col+dc!,row:q[i]!.row+dr!};if(!allowed.has(key(next))||hazards.has(key(next))||blocked.has(key(next))||prev.has(key(next)))continue;prev.set(key(next),q[i]);q.push(next);}
 assert(prev.has(key(goal)));const path=[goal];while(prev.get(key(path[0]!)))path.unshift(prev.get(key(path[0]!)));
 for(const next of path.slice(1)){assert(s.startStep(hero,next.col>hero.cell.col?'east':next.col<hero.cell.col?'west':next.row>hero.cell.row?'south':'north'));hero.step!.startedAt=Date.now()-3000;s.tick();assert.deepEqual(hero.cell,next);assert.equal(hero.hp,hero.maxHp);}return path;
}
for(const [id,col,row] of goals){const path=walk(col,row);points.push({id,snapshot:s.publicSnapshot()});routes.push({id,path});}
await writeFile(`${dir}/safe-snapshots.json`,JSON.stringify(points));
await writeFile(`${dir}/gameplay-invariants.json`,JSON.stringify({pass:true,walkable:scene.walkable.length,difficult:scene.difficultCells!.length,hazards:hazards.size,unchanged:['all existing cells and hazards','mirror prop','spawns','stats'],authorizedAddition:'Sealed gallery and defeat-conditioned exit to Anteros',routes},null,2));
s.changeScene('cafe');const cafe=s.publicSnapshot();s.changeScene('mirror');walk(5,2);const before=s.publicSnapshot();s.prepareMirrorEncounter('maria');s.creature!.visible=true;const after=s.publicSnapshot();
await writeFile(`${dir}/sequence-fixtures.json`,JSON.stringify({before,after,cafe,reflectionId:s.creature!.id}));
const closed=s.publicSnapshot();walk(5,1);const closedNear=s.publicSnapshot();walk(5,2);
s.applyHitPoints(s.creature!.id,-s.creature!.maxHp);const open=s.publicSnapshot();assert(s.startStep(hero,'north'));const approaching=s.publicSnapshot(),approachMs=hero.step!.durationMs;hero.step!.startedAt=Date.now()-3000;s.tick();assert(s.startStep(hero,'north'));const walking=s.publicSnapshot(),durationMs=hero.step!.durationMs;hero.step!.startedAt=Date.now()-3000;s.tick();assert.equal(hero.step!.movementKind,'passage');const departure=s.publicSnapshot(),departureMs=hero.step!.durationMs;hero.step!.startedAt=Date.now()-departureMs-10;s.tick();assert.equal(hero.sceneId,'dinner');
await writeFile(`${dir}/exit-fixtures.json`,JSON.stringify({closed,closedNear,open,approaching,approachMs,walking,durationMs,departure,departureMs,dinner:s.publicSnapshot()}));
console.log('8 safe routes; unchanged 399 cells / 49 hazards; sealed -> defeat -> walking -> dinner verified');
