import {describe,it,expect} from 'vitest';
import {retreatTerrain} from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import original from '../../campaigns/stormwreck-isle/public/retreat-terrain-v2.json' with {type:'json'};
import assembly from '../../campaigns/stormwreck-isle/public/retreat-zones/global-layout.json' with {type:'json'};
import {surfaceNeighbors,surfacePoint,surfaceStepPath,type SurfaceAddress} from '../shared/terrain.js';
import {GameState} from './game.js';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
const terrain=retreatTerrain,temple=terrain.surfaces.find(s=>s.id==='a5')!,boxes=assembly.collisionBoxes.filter(b=>b.zone==='a5');
const key=(a:SurfaceAddress)=>`${a.surfaceId}:${a.cell.col},${a.cell.row}`;
describe('V3 temple navigation follows the actual perimeter structure',()=>{
 it('retains original A5 addresses and every unaffected authored navigation record',()=>{
  const changed=new Set(['a1','a2','a3','a4','a5','upper','beach']),retired=new Set(['a5:22,42','a5:31,42','upper:58,43','upper:73,43','upper:82,43','a1:69,61','a1:73,62','a1:75,61']);
  for(const s of original.surfaces){const current=terrain.surfaces.find(t=>t.id===s.id)!;if(!changed.has(s.id))expect(current.tiles.slice(0,s.tiles.length)).toEqual(s.tiles);else for(const t of s.tiles)expect(current.tiles.some(p=>p.cell.col===t.cell.col&&p.cell.row===t.cell.row)).toBe(!retired.has(key({surfaceId:s.id,cell:t.cell})));}
  expect(temple.tiles.length).toBe(87);expect(terrain.tileMeters).toBe(1.5);for(const t of original.transitions)if(!retired.has(key(t.from))&&!retired.has(key(t.to)))expect(terrain.transitions).toContainEqual(t);
  expect(boxes.filter(b=>b.id.includes('Column'))).toHaveLength(4);
  const seen=new Set<string>(),q:SurfaceAddress[]=[{surfaceId:'a5',cell:{col:32,row:43}}];seen.add(key(q[0]!));
  for(let i=0;i<q.length;i++)for(const n of surfaceNeighbors(terrain,q[i]!))if(n.surfaceId==='a5'&&!seen.has(key(n))){seen.add(key(n));q.push(n);}
  expect(seen.size).toBe(temple.tiles.length);
 });
 it('samples every temple movement segment against the four columns, pedestal and rock wall',()=>{
  let samples=0;
  for(const edge of terrain.edgePaths!.filter(e=>e.from.surfaceId==='a5'&&e.to.surfaceId==='a5')){
   const points=surfaceStepPath(terrain,edge.from,edge.to),start=surfacePoint(terrain,edge.from);expect(Math.hypot(...points[0]!.map((v,i)=>v-start[i]!))).toBeLessThan(1e-5);
   for(let j=1;j<points.length;j++){const a=points[j-1]!,b=points[j]!,n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.025);for(let i=0;i<=n;i++){
    const x=a[0]+(b[0]-a[0])*i/n,z=a[2]+(b[2]-a[2])*i/n;
    for(const box of boxes){const [x0,x1,z0,z1]=box.bounds;const dx=Math.max(x0!-x,0,x-x1!),dz=Math.max(z0!-z,0,z-z1!);expect(dx*dx+dz*dz,box.id).toBeGreaterThanOrEqual(.09-1e-7);}samples++;
   }}
  }
  expect(samples).toBeGreaterThan(9000);
 });
 it('walks every permitted A5 edge with the existing authoritative mover and preserves saved resources',()=>{
  const state=new GameState(stormwreckBundle);state.focusScene('dragon-rest');for(const c of state.characters.values())c.sceneId='wreck-ship';const c=state.characters.get('mike')!;let steps=0;
  for(const t of temple.tiles){const a={surfaceId:'a5',cell:t.cell};for(const next of surfaceNeighbors(terrain,a).filter(n=>n.surfaceId==='a5')){
   Object.assign(c,{sceneId:'dragon-rest',...a,step:null,moving:false});expect(state.moveEntityOneSquare(c.id,next.cell)).toBe('MOVED');c.step!.startedAt=Date.now()-c.step!.durationMs-1;state.tick();expect(c.cell).toEqual(next.cell);steps++;
  }}
  expect(steps).toBe(306);const saved=state.captureDurable(),restored=new GameState(stormwreckBundle);restored.restoreDurable(saved);const after=restored.captureDurable();expect(after.characters.find(c=>c.id==='mike')).toEqual(saved.characters.find(c=>c.id==='mike'));expect(after.characters.map(c=>({hp:c.hp,inventory:c.inventory}))).toEqual(saved.characters.map(c=>({hp:c.hp,inventory:c.inventory})));
 });
});
