import {afterEach,describe,expect,it,vi} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {includeCampActors} from '../../campaigns/camp-rests/public/camp-surface-effects.js';
const engines:NullEngine[]=[];afterEach(()=>{vi.restoreAllMocks();engines.splice(0).forEach(e=>e.dispose());});
function fixture(){const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine),light=new PointLight('existing-light',Vector3.Zero(),scene),floor=MeshBuilder.CreateGround('existing-floor',{},scene),actor=MeshBuilder.CreatePlane('actor:hero:body',{},scene);actor.metadata={nativeBillboard:true};light.includedOnlyMeshes=[floor];return{scene,light,floor,actor};}
describe('Camp lighting · unchanged targets',()=>{
 it('avoids scene-wide resynchronization when the same scenery and actors still belong to a light',()=>{
  const {scene,light,floor,actor}=fixture(),resync=vi.spyOn(light as any,'_resyncMeshes');
  includeCampActors(light,()=>true,scene);expect(Array.from(light.includedOnlyMeshes,m=>m.name)).toEqual([floor.name,actor.name]);const list=light.includedOnlyMeshes;resync.mockClear();
  for(let n=0;n<60;n++){actor.position.x=n*.01;includeCampActors(light,()=>true,scene);}
  expect(light.includedOnlyMeshes).toBe(list);expect(resync).not.toHaveBeenCalled();expect(actor.lightSources).toContain(light);expect(floor.lightSources).toContain(light);
 });
 it('immediately resynchronizes actors entering/leaving the light and created or disposed sprite layers',()=>{
  const {scene,light,floor,actor}=fixture(),belongs=(m:any)=>m.position.x<2;
  includeCampActors(light,belongs,scene);actor.position.x=3;includeCampActors(light,belongs,scene);expect(Array.from(light.includedOnlyMeshes,m=>m.name)).toEqual([floor.name]);expect(actor.lightSources).not.toContain(light);
  actor.position.x=1;includeCampActors(light,belongs,scene);expect(actor.lightSources).toContain(light);
  const blend=MeshBuilder.CreatePlane('actor:hero:blend',{},scene);blend.metadata={nativeBillboard:true};includeCampActors(light,belongs,scene);expect(Array.from(light.includedOnlyMeshes,m=>m.name)).toEqual([floor.name,actor.name,blend.name]);expect(blend.lightSources).toContain(light);
  blend.dispose();includeCampActors(light,belongs,scene);expect(Array.from(light.includedOnlyMeshes,m=>m.name)).toEqual([floor.name,actor.name]);
  const other=new PointLight('other-room',Vector3.Zero(),scene);other.includedOnlyMeshes=[floor];includeCampActors(other,()=>false,scene);expect(Array.from(other.includedOnlyMeshes,m=>m.name)).toEqual([floor.name]);expect(Array.from(light.includedOnlyMeshes,m=>m.name)).toEqual([floor.name,actor.name]);
 });
});
