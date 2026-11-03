import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {buildDragonRemains} from './wreck-dragon-bones';
import {wreckRuntimeScenes} from '../../campaigns/stormwreck-isle/public/wreck-runtime';
import {WRECK_STRUCTURE} from '../shared/wreck-structure';

describe('completion of Antigravity dragon skull',()=>{
 const terrain=wreckRuntimeScenes[0]!.terrain!,before=JSON.stringify(terrain),sea=WRECK_STRUCTURE.seaHeight;
 const cells=terrain.obstacles!.filter(o=>o.obstacleId==='reef-south-west').map(o=>o.cell);
 const cx=(Math.min(...cells.map(c=>c.col))+Math.max(...cells.map(c=>c.col))+1)*.75;
 const cz=(Math.min(...cells.map(c=>c.row))+Math.max(...cells.map(c=>c.row))+1)*.75;
 let engine:NullEngine,scene:Scene,meshes:ReturnType<typeof buildDragonRemains>;
 beforeAll(()=>{engine=new NullEngine();scene=new Scene(engine);meshes=buildDragonRemains(scene,terrain);meshes.forEach(m=>m.computeWorldMatrix(true));});
 afterAll(()=>{scene.dispose();engine.dispose();});
 const firstHit=(ray:Ray)=>meshes.map(mesh=>({mesh,hit:mesh.intersects(ray,false)})).filter(item=>item.hit.hit).sort((a,b)=>a.hit.distance-b.hit.distance)[0];
 it('keeps all skull vertices above the waterline and within its original blocked footprint',()=>{
  let count=0,minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;
  for(const mesh of meshes){const vertices=mesh.getVerticesData('position')!;for(let i=0;i<vertices.length;i+=3){
   const x=vertices[i]!,y=vertices[i+1]!,z=vertices[i+2]!;if(Math.abs(x-cx)>4||Math.abs(z-cz)>4)continue;
   count++;expect(cells.some(c=>x>=c.col*1.5-.001&&x<=(c.col+1)*1.5+.001&&z>=c.row*1.5-.001&&z<=(c.row+1)*1.5+.001)).toBe(true);
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  }}
  expect(count).toBeGreaterThan(500);expect(minY).toBeGreaterThan(sea+.05);expect(maxY-minY).toBeGreaterThan(2);expect(maxX-minX).toBeGreaterThan(3.5);
 });
 it('exposes two inset orbital cavities instead of burying them under the vault',()=>{
  for(const side of [-1,1]){
   const hit=firstHit(new Ray(new Vector3(cx-.28,sea+.80+.76,cz+side*3),new Vector3(0,0,-side),6));
   expect(hit?.mesh.material?.name).toContain('cavities');
  }
 });
 it('has an open lateral mouth with visible jaw rather than a filled wedge',()=>{
  for(const side of [-1,1])expect(firstHit(new Ray(new Vector3(cx+.75,sea+.80+.035,cz+side*2),new Vector3(0,0,-side),4))).toBeUndefined();
 });
 it('preserves terrain, lights, batch count, independent materials and finite vertex data',()=>{
  expect(JSON.stringify(terrain)).toBe(before);expect(scene.lights).toHaveLength(0);expect(meshes).toHaveLength(3);
  for(const mesh of meshes){expect(mesh.isPickable).toBe(false);expect(mesh.metadata.anatomy).toBe(true);
   for(const kind of ['position','normal','uv'])expect(Array.from(mesh.getVerticesData(kind)!).every(Number.isFinite)).toBe(true);
  }
 });
});
