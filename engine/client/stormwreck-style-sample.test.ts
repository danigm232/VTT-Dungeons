import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {RawTexture} from '@babylonjs/core/Materials/Textures/rawTexture.js';
import {createStormwreckStyleSample,stormwreckSampleFamily} from '../../campaigns/stormwreck-isle/public/style-sample';

function fixture(run:(scene:Scene)=>void){const engine=new NullEngine(),scene=new Scene(engine);try{run(scene);}finally{scene.dispose();engine.dispose();}}
const loader=(scene:Scene)=>(url:string)=>{const texture=new Texture(null,scene);texture.name=url;return texture;};
describe('approved Stormwreck VIS-2 material sample',()=>{
 it('limits Retiro objects to A3, unifies continuous stone and preserves actors and other maps',()=>{
  expect(stormwreckSampleFamily('dragon-rest',{name:'Dining_East_Base',metadata:{retreatZone:'a3'}},'retreat:pbr:carved')).toBe('basalt');
  expect(stormwreckSampleFamily('dragon-rest',{name:'CANON_Long_Table_primitive0',metadata:{retreatZone:'a3'}},'retreat:pbr:wood:planks')).toBe('oak');
  expect(stormwreckSampleFamily('dragon-rest',{name:'Floor',metadata:{retreatZone:'a3',retreatFloor:true}},'retreat:pbr:wood')).toBe('limestone');
  expect(stormwreckSampleFamily('dragon-rest',{name:'Library',metadata:{retreatZone:'a4'}},'retreat:pbr:wood')).toBeNull();
  expect(stormwreckSampleFamily('dragon-rest',{name:'Cliff',metadata:{retreatZone:'a1'}},'retreat:pbr:carved')).toBe('basalt');
  expect(stormwreckSampleFamily('dragon-rest',{name:'a1:room-1:wall',metadata:{retreatZone:'a1'}},'retreat:pbr:carved')).toBeNull();
  expect(stormwreckSampleFamily('mirror',{name:'wood'},'wood')).toBeNull();
  expect(stormwreckSampleFamily('wreck-ship',{name:'actor',metadata:{nativeBillboard:true}},'wood')).toBeNull();
 });
 it('separates C4 props and exposed timber from other cabins, lower deck and hold',()=>{
  expect(stormwreckSampleFamily('wreck-ship',{name:'floor',metadata:{surfaceId:'main'}},'terrain-material:exterior-deck')).toBe('ship');
  expect(stormwreckSampleFamily('wreck-ship',{name:'bed',metadata:{cabinId:'c4'}},'cabin:old-wood')).toBe('ship');
  expect(stormwreckSampleFamily('wreck-ship',{name:'bed',metadata:{cabinId:'c5'}},'cabin:old-wood')).toBeNull();
  expect(stormwreckSampleFamily('wreck-ship',{name:'floor',metadata:{surfaceId:'hold-air'}},'wood')).toBeNull();
  expect(stormwreckSampleFamily('wreck-ship',{name:'water'},'wreck-continuous-ocean')).toBeNull();
  expect(stormwreckSampleFamily('wreck-ship',{name:'dragon-remains:skull',metadata:{surfaceId:'main'}},'wood')).toBeNull();
  expect(stormwreckSampleFamily('wreck-ship',{name:'support',metadata:{kind:'dragon-bone'}},'ship-hull')).toBeNull();
  expect(stormwreckSampleFamily('wreck-ship',{name:'support'},'dragon-remains:salt-cracks')).toBeNull();
 });
 it('keeps geometry, UVs, transforms, collision, alpha and original shared materials exact',()=>fixture(scene=>{
  const base=new PBRMaterial('retreat:pbr:carved',scene);base.alpha=.65;
  const wall=MeshBuilder.CreateBox('Dining_East_Base',{},scene),other=MeshBuilder.CreateBox('a1:room-1:wall',{},scene);
  wall.material=other.material=base;wall.metadata={retreatZone:'a3'};other.metadata={retreatZone:'a1'};wall.position.set(2,3,4);wall.checkCollisions=true;
  const geometry=wall.geometry,uv=wall.getVerticesData('uv')!.slice(),positions=wall.getVerticesData('position')!.slice(),matrix=wall.computeWorldMatrix(true).asArray().slice(),colour=base.albedoColor.asArray();
  const sample=createStormwreckStyleSample(scene,'dragon-rest',loader(scene))!;sample.refresh();
  expect(wall.material).not.toBe(base);expect(other.material).toBe(base);expect(wall.material!.alpha).toBe(.65);
  expect(base.albedoColor.asArray()).toEqual(colour);expect(wall.geometry).toBe(geometry);expect(wall.getVerticesData('uv')).toEqual(uv);
  expect(wall.getVerticesData('position')).toEqual(positions);expect(wall.computeWorldMatrix(true).asArray()).toEqual(matrix);expect(wall.checkCollisions).toBe(true);
  sample.setEnabled(false);expect(wall.material).toBe(base);sample.dispose();expect(other.material).toBe(base);expect(scene.materials.includes(base)).toBe(true);
 }));
 it('toggles repeatedly without new meshes, lights, materials or textures and restores on disposal',()=>fixture(scene=>{
  const floor=MeshBuilder.CreateGround('floor',{},scene),base=new StandardMaterial('terrain-material:exterior-deck',scene);floor.material=base;floor.metadata={surfaceId:'main'};
  const sample=createStormwreckStyleSample(scene,'wreck-ship',loader(scene))!;sample.refresh();
  const counts=[scene.meshes.length,scene.materials.length,scene.textures.length,scene.lights.length];
  for(let i=0;i<20;i++){sample.setEnabled(false);expect(floor.material).toBe(base);sample.setEnabled(true);sample.refresh();}
  expect([scene.meshes.length,scene.materials.length,scene.textures.length,scene.lights.length]).toEqual(counts);
  sample.dispose();expect(floor.material).toBe(base);expect(scene.materials).toContain(base);expect(scene.meshes).toHaveLength(1);expect(scene.lights).toHaveLength(0);
 }));
 it('handles an asynchronous material upgrade on the same mesh and the existing LOD swap',()=>fixture(scene=>{
  const wall=MeshBuilder.CreateBox('Dining_East_Base',{},scene);wall.metadata={retreatZone:'a3'};wall.material=new StandardMaterial('gltf-unknown',scene);
  const sample=createStormwreckStyleSample(scene,'dragon-rest',loader(scene))!;sample.refresh();expect(sample.stats.meshes).toBe(0);
  const near=new PBRMaterial('retreat:pbr:carved',scene);wall.material=near;sample.refresh();expect(wall.material).not.toBe(near);
  const far=new StandardMaterial('retreat:pbr:carved:distant',scene);wall.material=far;sample.refresh();expect(wall.material).not.toBe(far);
  sample.setEnabled(false);expect(wall.material).toBe(far);sample.setEnabled(true);expect(sample.stats.albedoImages).toBe(1);
 }));
 it('shares the existing normal image with independent strength and unchanged UV coordinates',()=>fixture(scene=>{
  const floor=MeshBuilder.CreateGround('floor',{},scene),base=new StandardMaterial('terrain-material:exterior-deck',scene);
  const original=RawTexture.CreateRGBATexture(new Uint8Array([128,128,255,255]),1,1,scene);
  original.level=.85;original.uScale=2;original.vScale=3;original.uOffset=.2;original.vOffset=.4;original.wAng=.15;original.gammaSpace=false;original.coordinatesIndex=1;
  base.bumpTexture=original;floor.material=base;floor.metadata={surfaceId:'main'};
  const sample=createStormwreckStyleSample(scene,'wreck-ship',loader(scene))!;sample.refresh();
  const candidate=(floor.material as StandardMaterial).bumpTexture as Texture;
  expect(candidate).not.toBe(original);expect(candidate.getInternalTexture()).toBe(original.getInternalTexture());expect(candidate.level).toBe(.5);expect(original.level).toBe(.85);
  expect([candidate.uScale,candidate.vScale,candidate.uOffset,candidate.vOffset,candidate.wAng,candidate.gammaSpace,candidate.coordinatesIndex]).toEqual([2,3,.2,.4,.15,false,1]);
  sample.dispose();expect(base.bumpTexture).toBe(original);expect(scene.textures).toContain(original);
 }));
 it('does not create a controller or graphics resources in D8',()=>fixture(scene=>{
  const before=[scene.materials.length,scene.textures.length,scene.meshes.length];
  expect(createStormwreckStyleSample(scene,'dinner',loader(scene))).toBeNull();
  expect([scene.materials.length,scene.textures.length,scene.meshes.length]).toEqual(before);
 }));
});
