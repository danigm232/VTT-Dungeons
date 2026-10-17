import {describe,expect,it,vi} from 'vitest';
import {readFile} from 'node:fs/promises';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader.js';
import {campRestsPublicCampaign} from '../../campaigns/camp-rests/public/pack.js';
import {A1_ROOMS,A1_BLOCKED} from '../../campaigns/camp-rests/public/a1-layout.js';
import {createCampVisuals} from '../../campaigns/camp-rests/public/visuals.js';
import {createForestFauna} from '../../campaigns/camp-rests/public/forest-fauna.js';
import {actorShadow} from './actor-shadow.js';
import {buildTerrain3D} from './terrain3d.js';

describe('acabado de campamentos y luz coherente',()=>{
 it('conserva seis celdas, sus camas/hamacas, y despeja todas las entradas',()=>{
  expect(A1_ROOMS).toHaveLength(6);
  for(const room of A1_ROOMS){expect(A1_BLOCKED.some(p=>p.cell.col===room.entry.col&&p.cell.row===room.entry.row)).toBe(false);
   expect(new Set(room.furniture.map(f=>`${f.cell.col},${f.cell.row}`)).size).toBe(room.furniture.length);
   for(const f of room.furniture)expect(room.cells).toContainEqual(f.cell);
  }
  expect(A1_ROOMS.flatMap(r=>r.furniture).filter(f=>f.kind==='bed')).toHaveLength(4);
  expect(A1_ROOMS.flatMap(r=>r.furniture).filter(f=>f.kind==='hammock')).toHaveLength(8);
 });
 it('proyecta sombras del personaje según la dirección, alcance y encendido reales',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),body=MeshBuilder.CreatePlane('actor',{},scene),at=Vector3.Zero();
  const sun=new DirectionalLight('sun',new Vector3(-1,-1,0),scene);sun.intensity=.3;
  const light=new PointLight('torch',new Vector3(1,2,0),scene);light.range=8;light.intensity=4;
  expect(actorShadow(scene,at,body,1.6).direction.x).toBeLessThan(0);
  light.position.x=-1;expect(actorShadow(scene,at,body,1.6).direction.x).toBeGreaterThan(0);
  light.includedOnlyMeshes=[MeshBuilder.CreateBox('other-room',{},scene)];expect(actorShadow(scene,at,body,1.6).direction.x).toBeLessThan(0);
  expect(sun.direction.asArray()).toEqual([-1,-1,0]);
  sun.intensity=0;light.intensity=0;expect(actorShadow(scene,at,body,1.6).alpha).toBe(0);scene.dispose();engine.dispose();
 });
 it('ancla la estatua al mar, prolonga A1 y limita las velas a la noche',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),def=campRestsPublicCampaign.scenes[0]!;buildTerrain3D(scene,def.terrain!,{batchTiles:true});
  const visuals=createCampVisuals(scene,def)!;expect(scene.getTransformNodeByName('a1:astalagan-seaward')?.rotation.y).toBe(Math.PI);
  // The plateau is statically batched; check its real vertices after merging.
  expect(scene.meshes.some(m=>(m.getVerticesData('position')??[]).some((v,i)=>i%3===0&&Math.abs(v)>115))).toBe(true);
  expect(scene.getMeshByName('a1:statue-votive-flame')?.metadata.candleCount).toBe(5);
  visuals.update(1,'night');expect(scene.getLightByName('a1:statue-votive-light')!.intensity).toBeGreaterThan(0);
  visuals.update(2,'arrival');expect(scene.getLightByName('a1:statue-votive-light')!.intensity).toBe(0);scene.dispose();engine.dispose();
 });
 it('mantiene las sombras de las tiendas exteriores y enciende las antorchas de guardia',()=>{
  const engine=new NullEngine();for(const def of campRestsPublicCampaign.scenes.slice(1)){
   const scene=new Scene(engine);buildTerrain3D(scene,def.terrain!,{batchTiles:true});const visuals=createCampVisuals(scene,def)!;
   visuals.update(1,'night');const lights=scene.lights.filter(l=>l.name.endsWith(':torch-light'));expect(lights.length).toBeGreaterThan(0);expect(lights.every(l=>l.intensity>0)).toBe(true);
   const tents=scene.meshes.filter(m=>m.name.includes(':shell'));expect(tents.every(m=>m.receiveShadows&&m.isVisible)).toBe(true);
   expect(scene.meshes.filter(m=>m.name.startsWith('ambient-life:'))).toHaveLength(2);
   visuals.update(2,'arrival');expect(lights.every(l=>l.intensity===0)).toBe(true);scene.dispose();
  }engine.dispose();
 });
 it('texturiza los cristales y mantiene su luz azul tenue y acotada',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),def=campRestsPublicCampaign.scenes[3]!;buildTerrain3D(scene,def.terrain!,{batchTiles:true});const visuals=createCampVisuals(scene,def)!;
  visuals.update(1,'night');const lights=scene.lights.filter(l=>l.name.startsWith('cliff:crystal-light')) as PointLight[];
  expect(lights.length).toBeGreaterThan(0);expect(lights.every(l=>l.intensity<.25&&l.range<4&&l.diffuse.b>l.diffuse.r)).toBe(true);scene.dispose();engine.dispose();
 });
 it('mueve las patas de ambos GLB desde la llegada y alterna reposo, pasto y salida fuera del grid',async()=>{
  const engine=new NullEngine(),scene=new Scene(engine),root=MeshBuilder.CreateBox('root',{},scene);
  const random=vi.spyOn(Math,'random').mockReturnValue(.2);
  try{
   const fauna=await createForestFauna(scene,root,{width:36,depth:33},async file=>LoadAssetContainerAsync(new Uint8Array(await readFile('campaigns/camp-rests/public/art/forest-fauna-v1/'+file)),scene,{pluginExtension:'.glb'}));
   const poses=new Map<string,Set<string>>(),clips=new Set<string>();
   expect(scene.animationGroups.every(g=>['Eating','Gallop','Idle','Idle_2','Idle_Headlow','Walk'].includes(g.name))).toBe(true);
   for(let t=0;t<230;t+=.2){fauna.update(t);
    for(const id of ['deer','stag']){const pivot=scene.getTransformNodeByName('forest:fauna:'+id)!;
     if(!pivot.isEnabled())continue;expect(pivot.position.x<=-1.25||pivot.position.x>=37.25||pivot.position.z<=-1.25||pivot.position.z>=34.25).toBe(true);
     const group=scene.animationGroups.find(g=>g.isStarted&&g.targetedAnimations.some(a=>a.target?.isDescendantOf?.(pivot)));expect(group,id+' debe tener pose desde su aparición').toBeDefined();if(!group)continue;clips.add(group.name);
     if(group.name==='Walk'){const target=group.targetedAnimations.find(a=>a.animation.targetProperty==='rotationQuaternion'&&/leg|ankle|hoof/i.test(a.target.name))?.target;
      expect(target,'articulación de las patas').toBeDefined();if(target){const set=poses.get(id)??new Set<string>();set.add(target.rotationQuaternion.asArray().map((n:number)=>n.toFixed(3)).join(','));poses.set(id,set);}}
    }
   }
   for(const id of ['deer','stag'])expect(poses.get(id)?.size,id+' llegada/salida animadas').toBeGreaterThan(8);
   expect(clips.has('Idle_2')).toBe(true);expect(clips.has('Eating')).toBe(true);expect(clips.has('Gallop')).toBe(true);fauna.dispose();
  }finally{random.mockRestore();scene.dispose();engine.dispose();}
 },30000);
});
