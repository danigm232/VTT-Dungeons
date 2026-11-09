import {describe,expect,it} from 'vitest';
import {GameState} from './game.js';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
import {dragonRestScene,retreatTerrain} from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import {WINCH_JUNCTION} from '../../campaigns/stormwreck-isle/public/retreat-winch-junction-navigation.js';
import {surfaceNeighbors,surfacePoint,surfaceStepPath,terrainTile} from '../shared/terrain.js';
import assembly from '../../campaigns/stormwreck-isle/public/retreat-zones/global-layout.json' with {type:'json'};

describe('Unión de los caminos de la caseta A2',()=>{
 it('uses a full supported 1.5 m cell and connects both stairs without changing the stored address',()=>{
  const {tile,upper,cliff}=WINCH_JUNCTION,t=retreatTerrain;
  expect(t.tileMeters).toBe(1.5);
  expect(terrainTile(t,tile)).toMatchObject({kind:'floor',corners:[15,15,15,15]});
  expect(terrainTile(t,tile)?.polygon).toBeUndefined();
  expect(surfacePoint(t,tile)).toEqual([155.25,15,68.25]);
  for(const col of [103,104,105])expect(terrainTile(t,{surfaceId:'a2',cell:{col,row:44}})?.corners).toEqual([15,15,15,15]);
  expect(terrainTile(t,{surfaceId:'a2',cell:{col:105,row:44}})?.polygon).toEqual([[0,0],[.82,0],[.82,1],[0,1]]);
  const north={surfaceId:'a2',cell:{col:103,row:44}},northStair={surfaceId:'upper',cell:{col:102,row:44}};
  expect(surfaceNeighbors(t,north)).toContainEqual(northStair);
  expect(surfaceNeighbors(t,northStair)).toContainEqual(north);
  expect(surfaceNeighbors(t,{surfaceId:'a2',cell:{col:105,row:44}})).not.toContainEqual({surfaceId:'a2',cell:{col:106,row:44}});
  for(const other of [upper,cliff]){
   expect(surfaceNeighbors(t,tile)).toContainEqual(other);
   expect(surfaceNeighbors(t,other)).toContainEqual(tile);
  }
  const steps=surfaceStepPath(t,upper,tile);
  expect(steps).toEqual([[153.75,15.25,68.25],[154.5,15,68.25],[155.25,15,68.25]]);
  expect(surfaceStepPath(t,tile,upper)).toEqual([...steps].reverse());
 });
 it('keeps the widened lane outside the real wall and winch collision boxes',()=>{
  const a=(surfaceId:string,col:number,row:number)=>({surfaceId,cell:{col,row}});
  const edges=[
   [a('upper',102,44),a('a2',103,44)],
   [a('a2',103,44),a('a2',104,44)],[a('a2',104,44),a('a2',105,44)],
   [a('a2',103,44),a('a2',103,45)],[a('a2',104,44),a('a2',104,45)],
   [a('a2',105,44),a('a2',105,45)],
  ];
  for(const [from,to] of edges){
   const points=surfaceStepPath(retreatTerrain,from!,to!);
   for(let segment=1;segment<points.length;segment++){
    const p=points[segment-1]!,q=points[segment]!,n=Math.ceil(Math.hypot(q[0]-p[0],q[2]-p[2])/.04);
    for(let i=0;i<=n;i++){
     const x=p[0]+(q[0]-p[0])*i/n,z=p[2]+(q[2]-p[2])*i/n;
     for(const box of assembly.collisionBoxes.filter(box=>box.zone==='a2')){
      const [x0,x1,z0,z1]=box.bounds;
      expect(Math.max(x0!-x,0,x-x1!)**2+Math.max(z0!-z,0,z-z1!)**2,box.id).toBeGreaterThanOrEqual(.09-1e-7);
     }
    }
   }
  }
 });
 it('walks the junction in both directions with the actual server and respects the A2 door',()=>{
  const state=new GameState(stormwreckBundle);state.focusScene('dragon-rest');
  for(const c of state.characters.values())c.sceneId='wreck-ship';
  const actor=state.characters.get('mike')!;
  Object.assign(actor,{sceneId:'dragon-rest',...structuredClone(WINCH_JUNCTION.upper),step:null,moving:false,sessionToken:'junction-test'});
  const advance=(surfaceId:string,col:number,row:number)=>{
   expect(state.moveEntityOneSquare(actor.id,{col,row})).toBe('MOVED');
   expect(actor.step).not.toBeNull();actor.step!.startedAt=Date.now()-actor.step!.durationMs-1;state.tick();
   expect({surfaceId:actor.surfaceId,cell:actor.cell}).toEqual({surfaceId,cell:{col,row}});
  };
  advance('upper',102,44);advance('a2',103,44);advance('a2',104,44);advance('a2',105,44);
  expect(state.moveEntityOneSquare(actor.id,{col:106,row:44})).toBe('BLOCKED_CELL');
  expect(state.moveEntityOneSquare(actor.id,{col:105,row:45})).toBe('BLOCKED_CELL');
  advance('a2',104,44);advance('a2',103,44);advance('upper',102,44);advance('upper',102,45);
  advance('a2',103,45);advance('cliff',103,46);advance('a2',103,45);advance('upper',102,45);
  advance('a2',103,45);advance('a2',104,45);
  expect(state.moveEntityOneSquare(actor.id,{col:105,row:45})).toBe('BLOCKED_CELL');
  const command=state.applyObjectCommand({type:'object:door',commandId:crypto.randomUUID(),sceneEpoch:state.sceneEpoch,objectRevision:state.objectRevision,objectId:'a2-winch-door',state:'open'});
  expect(command.code).toBe('APPLIED');
  advance('a2',105,45);advance('a2',104,45);advance('a2',103,45);advance('upper',102,45);
  expect(dragonRestScene.props.find(prop=>prop.id==='a2-winch-door')?.cell).toEqual({col:105,row:45});
 });
 it('keeps an existing saved character in the same grid cell',()=>{
  const state=new GameState(stormwreckBundle),saved=state.captureDurable();
  Object.assign(saved.characters[0]!,{sceneId:'dragon-rest',...structuredClone(WINCH_JUNCTION.tile)});
  const restored=new GameState(stormwreckBundle);restored.restoreDurable(saved);
  expect(restored.captureDurable().characters[0]).toMatchObject({sceneId:'dragon-rest',...WINCH_JUNCTION.tile});
 });
});
