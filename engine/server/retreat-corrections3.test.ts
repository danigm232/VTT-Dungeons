import {describe,it,expect,vi,afterEach} from 'vitest';
import {GameState} from './game.js';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
import {dragonRestPorts,retreatTerrain,retreatLandmarks} from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import {surfaceNeighbors,surfacePoint,surfaceStepPath,terrainSchema} from '../shared/terrain.js';
import assembly from '../../campaigns/stormwreck-isle/public/retreat-zones/global-layout.json' with {type:'json'};
const key=(a:{surfaceId:string;cell:{col:number;row:number}})=>a.surfaceId+':'+a.cell.col+','+a.cell.row;
afterEach(()=>vi.restoreAllMocks());
describe('R3 measured circulation and manual mechanics',()=>{
 it('reaches every new floor through the native graph at the same metre scale',()=>{
  const t=terrainSchema.parse(retreatTerrain),start={surfaceId:'beach',cell:retreatLandmarks.spawn.cell},seen=new Set([key(start)]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const n of surfaceNeighbors(t,queue[i]!))if(!seen.has(key(n))){seen.add(key(n));queue.push(n);}
  const all=t.surfaces.flatMap(s=>s.tiles.map(p=>({surfaceId:s.id,cell:p.cell})));expect(all.filter(a=>!seen.has(key(a)))).toEqual([]);expect(all.length).toBeGreaterThan(1500);expect(t.tileMeters).toBe(1.5);
  expect(t.surfaces.find(s=>s.id==='a3')!.tiles.some(t=>t.cell.col===86)).toBe(true);expect(t.surfaces.find(s=>s.id==='a4')!.tiles.some(t=>t.cell.col===58)).toBe(true);
  for(const row of [44,45,46,47])expect(t.surfaces.find(s=>s.id==='upper')!.tiles.some(t=>t.cell.col===65&&t.cell.row===row)).toBe(true);
 });
 it('joins every physical edge to its current stopping points and clears room furniture and walls',()=>{
  let samples=0;
  const existingPaths=new Set((retreatTerrain.edgePaths??[]).map(p=>[key(p.from),key(p.to)].sort().join('|')));
  const edges=[...(retreatTerrain.edgePaths??[]),...retreatTerrain.transitions.filter(t=>t.mode!=='portal'&&!existingPaths.has([key(t.from),key(t.to)].sort().join('|')))];
  for(const edge of edges){
   const points=surfaceStepPath(retreatTerrain,edge.from,edge.to),a=surfacePoint(retreatTerrain,edge.from),b=surfacePoint(retreatTerrain,edge.to);
   expect(Math.hypot(...points[0]!.map((v,i)=>v-a[i]!)),key(edge.from)).toBeLessThan(1e-5);expect(Math.hypot(...points.at(-1)!.map((v,i)=>v-b[i]!)),key(edge.to)).toBeLessThan(1e-5);
   const boxes=assembly.collisionBoxes.filter(box=>[edge.from.surfaceId,edge.to.surfaceId].includes(box.zone));
   for(let j=1;j<points.length;j++){const p=points[j-1]!,q=points[j]!,n=Math.max(1,Math.ceil(Math.hypot(q[0]-p[0],q[2]-p[2])/.04));for(let k=0;k<=n;k++){const x=p[0]+(q[0]-p[0])*k/n,z=p[2]+(q[2]-p[2])*k/n;for(const box of boxes){const [a,b,c,d]=box.bounds;expect(Math.max(a!-x,0,x-b!)**2+Math.max(c!-z,0,z-d!)**2,box.id).toBeGreaterThanOrEqual(.09-1e-7);}samples++;}}
  }
  expect(samples).toBeGreaterThan(25000);
 });
 it('walks aboard and rows only after DM adjudication, then lands party members on separate cells',()=>{
  let now=1_800_000_000_000;vi.spyOn(Date,'now').mockImplementation(()=>now);const s=new GameState(stormwreckBundle),p=dragonRestPorts[0]!;
  for(const [index,id]of ['mike','mia','maria'].entries()){
   const c=s.characters.get(id)!;s.claim(String.fromCharCode(97+index).repeat(32),'socket-'+id,id);Object.assign(c,{sceneId:p.from.mapId,surfaceId:p.from.surfaceId,cell:{...p.from.cell},step:null,moving:false});
   s.tick();expect(c.sceneId).toBe('dragon-rest');expect(c.step).toBeNull();expect(s.traversePort(id,p.id,'forward')).toBe('PORT_REQUIRES_ADJUDICATION');
   expect(s.traversePort(id,p.id,'forward',true)).toBe('MOVED');expect(c.sceneId).toBe('dragon-rest');expect(c.step?.movementKind).toBe('passage');expect(s.traversePort(id,p.id,'forward',true)).toBe('ENTITY_MOVING');
   const snapshot=s.publicSnapshot(false,'dragon-rest');expect(snapshot.entities.find(e=>e.id===id)?.step?.passage?.portId).toBe(p.id);
   now+=p.departureWalk!.durationMs+1;s.tick();expect(c.sceneId).toBe('wreck-ship');expect(c.step).toBeNull();
  }
  expect(new Set([...s.characters.values()].map(c=>key(c))).size).toBe(3);
 });
 it('persists only the winch pose and publishes it only in its own scene',()=>{
  const s=new GameState(stormwreckBundle);s.progress['private-audit-sentinel']=true;expect(s.publicSnapshot(false,'dragon-rest').retreat).toEqual({winchLowered:false});expect(s.applyWreckProgressToggle('retreat.winch.lowered',true)).toBe('APPLIED');
  const saved=s.captureDurable(),r=new GameState(stormwreckBundle);r.restoreDurable(saved);expect(r.publicSnapshot(true,'dragon-rest').retreat).toEqual({winchLowered:true});expect(r.publicSnapshot(true,'wreck-ship').retreat).toBeUndefined();expect('progress' in r.publicSnapshot(true,'dragon-rest')).toBe(false);expect(r.progress['private-audit-sentinel']).toBe(true);
 });
 it('repairs only retired bench/column addresses in a version-4 save, keeping resources and valid positions exact',()=>{
  vi.spyOn(Date,'now').mockReturnValue(1_800_000_000_000);
  const s=new GameState(stormwreckBundle),saved=s.captureDurable();saved.retreatGridVersion=4;const actor=saved.characters[0]!;Object.assign(actor,{sceneId:'dragon-rest',surfaceId:'a1',cell:{col:69,row:61}});const resources=saved.characters.map(c=>({id:c.id,hp:c.hp,inventory:c.inventory,resources:c.resources})),valid=structuredClone(saved.characters[1]);
  const r=new GameState(stormwreckBundle);r.restoreDurable(saved);const after=r.captureDurable();expect(after.retreatGridVersion).toBe(5);expect(after.characters[0]!.cell).not.toEqual(actor.cell);expect(after.characters[1]).toEqual(valid);expect(after.characters.map(c=>({id:c.id,hp:c.hp,inventory:c.inventory,resources:c.resources}))).toEqual(resources);
  for(const [flag,value]of Object.entries(saved.progress??{}))expect(after.progress?.[flag]).toBe(value);
  for(const [flag,value]of Object.entries(after.progress??{}))if(!(flag in (saved.progress??{}))){expect(flag).toMatch(/^wreck\.rowboat\.(aboard|pilot)\.(mike|mia|maria)$/);expect(value).toBe(false);}
  expect(after.gameClock?.seconds).toBe(saved.gameClock?.seconds);
 });
});
