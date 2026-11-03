import {describe,it,expect} from 'vitest';
import {GameState} from './game.js';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
import {surfaceNeighbors,type SurfaceAddress} from '../shared/terrain.js';
import forest from '../../campaigns/stormwreck-isle/public/retreat-forest-walkability.json' with {type:'json'};
import original from '../../campaigns/stormwreck-isle/public/retreat-terrain-v2.json' with {type:'json'};
import {RETREAT_SAVE_GRID_VERSION} from './retreat-migration.js';
const scene=stormwreckBundle.public.scenes.find(s=>s.id==='dragon-rest')!,terrain=scene.terrain!;
const addressKey=(a:SurfaceAddress)=>`${a.surfaceId}:${a.cell.col},${a.cell.row}`;
// These two historic flat cells had less than body-height clearance under the
// rising stair. R3 retains the stair surface instead of standing in its underside.
const belowStair=new Set(['upper:93,31','upper:93,32']);
describe('Verified forest movement instead of copied staircase heights',()=>{
 it('retains every authored cell and reaches every added clearing from the landing',()=>{
  for(const s of original.surfaces){const current=terrain.surfaces.find(t=>t.id===s.id)!;if(!['a1','a2','a3','a4','a5','upper','beach'].includes(s.id))expect(current.tiles.slice(0,s.tiles.length)).toEqual(s.tiles);if(s.id==='a1')for(const tile of s.tiles.filter(t=>t.cell.row<60))expect(current.tiles.find(t=>t.cell.col===tile.cell.col&&t.cell.row===tile.cell.row)).toEqual(tile);}
  const start:SurfaceAddress={surfaceId:'beach',cell:scene.spawns[0]!},queue=[start],seen=new Set([addressKey(start)]);
  for(let i=0;i<queue.length;i++)for(const p of surfaceNeighbors(terrain,queue[i]!))if(!seen.has(addressKey(p))){seen.add(addressKey(p));queue.push(p);}
  for(const c of forest.cells)if(belowStair.has(addressKey(c))){expect(seen.has(addressKey(c))).toBe(false);expect(seen.has(addressKey({...c,surfaceId:'island-observatory'}))).toBe(true);}else expect(seen.has(addressKey(c)),JSON.stringify(c)).toBe(true);
  expect(terrain.surfaces.reduce((n,s)=>n+s.tiles.length,0)).toBeGreaterThan(1500);
  expect(terrain.tileMeters).toBe(1.5);
 });
 it('allows authoritative movement on every new adjacent edge with physical height retained',()=>{
  const state=new GameState(stormwreckBundle);state.focusScene('dragon-rest');for(const actor of state.characters.values())actor.sceneId='wreck-ship';
  const actor=state.characters.get('mike')!;let edges=0;
  for(const record of forest.cells.filter(c=>!belowStair.has(addressKey(c))))for(const next of surfaceNeighbors(terrain,record)){
   Object.assign(actor,{sceneId:'dragon-rest',surfaceId:record.surfaceId,cell:{...record.cell},step:null,moving:false});
   expect(state.moveEntityOneSquare('mike',next.cell),addressKey(record)+' -> '+addressKey(next)).toBe('MOVED');edges++;
  }
  expect(edges).toBeGreaterThan(500);
 });
 it('keeps valid durable positions and repairs only an obsolete unsupported address',()=>{
  const state=new GameState(stormwreckBundle),saved=state.captureDurable();saved.retreatGridVersion=3;
  const actor=saved.characters[0]!,valid=saved.characters[1]!;Object.assign(actor,{sceneId:'dragon-rest',surfaceId:'beach',cell:{col:42,row:61}});
  const before=structuredClone(valid),resources=saved.characters.map(c=>({hp:c.hp,inventory:c.inventory}));
  const restored=new GameState(stormwreckBundle);restored.restoreDurable(saved);const result=restored.captureDurable();
  expect(result.retreatGridVersion).toBe(RETREAT_SAVE_GRID_VERSION);expect(result.characters[1]).toEqual(before);
  expect(result.characters.map(c=>({hp:c.hp,inventory:c.inventory}))).toEqual(resources);
  const fixed=result.characters[0]!;expect(fixed.cell).not.toEqual({col:42,row:61});expect(terrain.surfaces.find(s=>s.id===fixed.surfaceId)!.tiles.some(t=>t.cell.col===fixed.cell.col&&t.cell.row===fixed.cell.row)).toBe(true);
 });
});
