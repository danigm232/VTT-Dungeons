import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {GameState} from './game.js';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
import {surfaceNeighbors,type SurfaceAddress} from '../shared/terrain.js';
import navigation from '../../campaigns/stormwreck-isle/public/retreat-island-navigation.json' with {type:'json'};
const terrain=stormwreckBundle.public.scenes.find(s=>s.id==='dragon-rest')!.terrain!;
const key=(a:SurfaceAddress)=>`${a.surfaceId}:${a.cell.col},${a.cell.row}`;
function path(a:SurfaceAddress,b:SurfaceAddress){
 const queue=[a],parents=new Map<string,SurfaceAddress|null>([[key(a),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i]!;
  if(key(p)===key(b)){const result=[p];while(parents.get(key(result[0]!)))result.unshift(parents.get(key(result[0]!))!);return result;}
  for(const next of surfaceNeighbors(terrain,p))if(next.surfaceId===a.surfaceId&&!parents.has(key(next))){parents.set(key(next),p);queue.push(next);}
 }
 throw Error('Missing local route '+key(a)+' / '+key(b));
}
describe('Retreat additive island navigation',()=>{
 it('retains every original floor, edge, wall and connection at the original grid scale',()=>{
  const original=JSON.parse(readFileSync('prototypes/retreat-island-g2-20261023/baseline/retreat-terrain-v2.json','utf8'));
  expect(terrain.tileMeters).toBe(1.5);expect([terrain.cols,terrain.rows]).toEqual([112,80]);
  for(const surface of original.surfaces){
   const current=terrain.surfaces.find(s=>s.id===surface.id)!;
   // Preserve every authored record in order, while allowing the subsequent
   // user-requested beach expansion to append outdoor walkable cells.
   if(!['a1','a2','a3','a4','a5','upper','beach'].includes(surface.id))expect({...current,tiles:current.tiles.slice(0,surface.tiles.length)}).toEqual(surface);
   if(surface.id==='a1')for(const tile of surface.tiles.filter((t:any)=>t.cell.row<60))expect(current.tiles.find(t=>t.cell.col===tile.cell.col&&t.cell.row===tile.cell.row)).toEqual(tile);
   expect(new Set(current.tiles.map(t=>`${t.cell.col},${t.cell.row}`)).size).toBe(current.tiles.length);
  }
  const outsideTemple=(p:any)=>!['a1','a2','a3','a4','a5','upper','beach'].includes(p.surfaceId??p.from?.surfaceId)&&!['a1','a2','a3','a4','a5','upper','beach'].includes(p.to?.surfaceId);
  for(const edge of original.transitions.filter(outsideTemple))expect(terrain.transitions).toContainEqual(edge);
  for(const name of ['edgePaths','obstacles','blockedEdges'] as const)expect(terrain[name]!.filter(outsideTemple).slice(0,original[name].filter(outsideTemple).length)).toEqual(original[name].filter(outsideTemple));
 });
 for(const branch of navigation.surfaces){
  it(`walks ${branch.surfaceId} with three characters out and back without overlapping`,()=>{
   const state=new GameState(stormwreckBundle);state.focusScene('dragon-rest');
   const members=['mike','mia','maria'];for(const c of state.characters.values())c.sceneId='wreck-ship';
   const a={surfaceId:branch.surfaceId,cell:branch.start},b={surfaceId:branch.surfaceId,cell:branch.ends[0]!.cell},route=path(a,b);
   expect(route.length).toBeGreaterThan(4);
   members.forEach((id,i)=>Object.assign(state.characters.get(id)!,{sessionToken:'g2-test-'+id,sceneId:'dragon-rest',...structuredClone(route[2-i]!),step:null,moving:false}));
   const step=(id:string,destination:SurfaceAddress)=>{
    expect(state.moveEntityOneSquare(id,destination.cell)).toBe('MOVED');const c=state.characters.get(id)!;expect(c.step).not.toBeNull();
    c.step!.startedAt=Date.now()-c.step!.durationMs-1;state.tick();expect(c.surfaceId).toBe(destination.surfaceId);expect(c.cell).toEqual(destination.cell);
    expect(new Set(members.map(id=>key(state.characters.get(id)!))).size).toBe(3);
   };
   expect(state.moveEntityOneSquare('maria',route[1]!.cell)).toBe('OCCUPIED_CELL');
   for(let lead=3;lead<route.length;lead++)members.forEach((id,i)=>step(id,route[lead-i]!));
   const saved=state.captureDurable(),restored=new GameState(stormwreckBundle);restored.restoreDurable(saved);
   for(const id of members)expect(restored.characters.get(id)!.cell).toEqual(state.characters.get(id)!.cell);
   for(let head=route.length-4;head>=0;head--)['maria','mia','mike'].forEach((id,i)=>step(id,route[head+i]!));
   members.forEach((id,i)=>expect(state.characters.get(id)!.cell).toEqual(route[2-i]!.cell));
  });
 }
});
