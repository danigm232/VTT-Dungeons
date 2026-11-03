import {afterEach,describe,expect,it,vi} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {authoredMeshLookup,releaseReplacedRetreatBackdrops} from '../../campaigns/stormwreck-isle/public/retreat-quick-opt.js';
import {createCoastalAnimationVisibility} from './coastal-animation-visibility.js';
import {createCoastalBackdrop} from './coastal-backdrop.js';
const engines:NullEngine[]=[];afterEach(()=>{engines.splice(0).forEach(e=>e.dispose());vi.restoreAllMocks();});
function scene(){const e=new NullEngine({renderWidth:1280,renderHeight:720,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4});engines.push(e);return new Scene(e);}
function camera(s:Scene,x=0){const c=new FreeCamera('camera',new Vector3(x,10,-20),s);c.setTarget(new Vector3(x,0,0));c.minZ=.1;c.maxZ=200;return c;}
describe('Retiro · primera pasada sin reducción visual',()=>{
 it('releases disabled R3 predecessors and instances only after a complete replacement is present',()=>{
  const s=scene(),old=MeshBuilder.CreateBox('P5_Refined_Existing_Pine_1_primitive0',{},s),copy=old.createInstance('SAL2_Reused_Pine_1_primitive0'),live=MeshBuilder.CreateBox('preserved-tree',{},s),owned=[old,live];old.setEnabled(false);copy.setEnabled(false);
  expect(releaseReplacedRetreatBackdrops(s,owned).releasedMeshes).toBe(0);expect(old.isDisposed()).toBe(false);
  const replacement=MeshBuilder.CreateBox('R3_Tree_1_palette',{},s);replacement.metadata={retreatVisualRevision:6};const result=releaseReplacedRetreatBackdrops(s,owned);
  expect(result.releasedMeshes).toBe(2);expect(copy.isDisposed()).toBe(true);expect(old.isDisposed()).toBe(true);expect(live.isDisposed()).toBe(false);expect(replacement.isDisposed()).toBe(false);expect(owned).toEqual([live]);
 });
 it('releases only replaced disabled leaf backdrops and preserves shared materials/geometry and every other mesh',()=>{
  const s=scene(),material=new StandardMaterial('shared',s),old=MeshBuilder.CreateBox('G2_Backland_Connected_Volcanic_Island',{},s),one=MeshBuilder.CreateBox('SAL1_Backland_Presentation',{},s),two=MeshBuilder.CreateBox('SAL2_Backland_Presentation',{},s),floor=old.clone('walkable-floor')!;
  old.material=one.material=two.material=floor.material=material;old.setEnabled(false);one.setEnabled(false);const geometry=floor.geometry,owned=[old,one,two,floor],light=new PointLight('unchanged-light',Vector3.Zero(),s);light.excludedMeshes=[old,one,floor];const result=releaseReplacedRetreatBackdrops(s,owned);
  expect(result.releasedMeshes).toBe(2);expect(old.isDisposed()).toBe(true);expect(one.isDisposed()).toBe(true);expect(owned.map(m=>m.name)).toEqual([two.name,floor.name]);expect(floor.geometry).toBe(geometry);expect(floor.getTotalVertices()).toBeGreaterThan(0);expect(s.materials).toContain(material);expect(s.lights.map(l=>l.name)).toEqual([light.name]);expect(light.excludedMeshes.map(m=>m.name)).toEqual([floor.name]);
 });
 it('retains a live fallback when no successful replacement exists and retains disabled parents with live children',()=>{
  const s=scene(),old=MeshBuilder.CreateBox('G2_Backland_Connected_Volcanic_Island',{},s),owned=[old];old.setEnabled(false);expect(releaseReplacedRetreatBackdrops(s,owned).releasedMeshes).toBe(0);
  MeshBuilder.CreateBox('SAL1_Backland_Presentation',{},s);const child=MeshBuilder.CreateBox('preserved',{},s);child.parent=old;expect(releaseReplacedRetreatBackdrops(s,owned).releasedMeshes).toBe(0);expect(child.isDisposed()).toBe(false);
 });
 it('keeps seeing asynchronous authored children until loading finishes, then reuses the complete hierarchy',()=>{
  const s=scene(),root=new TransformNode('furniture',s);let ready=false;const lookup=authoredMeshLookup(()=>ready),spy=vi.spyOn(root,'getChildMeshes');expect(lookup(root)).toEqual([]);const child=MeshBuilder.CreateBox('loaded-chair',{},s);child.parent=root;expect(lookup(root)).toEqual([child]);ready=true;const children=lookup(root);expect(lookup(root)).toBe(children);expect(spy).toHaveBeenCalledTimes(3);child.position.y=3;expect(lookup(root)[0]!.position.y).toBe(3);
 });
 it('pauses only outside every active camera, restores immediately when the camera returns, and honors secondary views',()=>{
  const s=scene(),water=MeshBuilder.CreateGround('water',{width:10,height:10},s),c=camera(s),gate=createCoastalAnimationVisibility(s,[water]);s.activeCamera=c;expect(gate()).toBe(true);c.position.x=1000;c.setTarget(new Vector3(1000,0,0));expect(gate()).toBe(false);const second=camera(s);s.activeCameras=[c,second];expect(gate()).toBe(true);s.activeCameras=[];c.position.x=0;c.setTarget(Vector3.Zero());expect(gate()).toBe(true);
 });
 it('retains water updates for render targets and the late-created distant water skirt',()=>{
  const s=scene(),water=MeshBuilder.CreateGround('water',{width:10,height:10},s),c=camera(s,1000),gate=createCoastalAnimationVisibility(s,[water]);s.activeCamera=c;expect(gate()).toBe(false);const target={renderList:[water]} as any;s.customRenderTargets.push(target);expect(gate()).toBe(true);s.customRenderTargets.length=0;const skirt=MeshBuilder.CreateGround('retreat:bay-maritime-skirt',{width:10,height:10},s);skirt.position.x=1000;expect(gate()).toBe(true);
 });
 it('preserves the whole sea/foam output after pausing and resumes at current world time without catch-up frames',()=>{
  const s=scene(),c=camera(s,1000);s.activeCamera=c;
  const root=new TransformNode('root',s),paused=createCoastalBackdrop(s,root,'',{pauseOffscreen:true}),control=createCoastalBackdrop(s,new TransformNode('control',s),'');
  const version=paused.sea.metadata.coastalGeometryVersion;paused.update(20,.2,.8);expect(paused.sea.metadata.coastalGeometryVersion).toBe(version);expect(paused.sea.metadata.coastalAnimation.skippedOffscreenUpdates).toBe(1);
  c.position.set(28.5,20,0);c.setTarget(new Vector3(28.5,-9,22));paused.update(21,.2,.8);control.update(21,.2,.8);expect(paused.sea.metadata.coastalGeometryVersion).toBe(version+1);
  for(const channel of ['position','normal','color'])expect(Array.from(paused.sea.getVerticesData(channel)!)).toEqual(Array.from(control.sea.getVerticesData(channel)!));
  const foam=root.getChildMeshes().find(m=>m.name==='a1:shore-wash')!,reference=s.meshes.find(m=>m.name==='a1:shore-wash'&&m!==foam)!;
  for(const channel of ['position','normal','color']){const actual=foam.getVerticesData(channel),expected=reference.getVerticesData(channel);expect(actual===null).toBe(expected===null);if(actual&&expected)expect(Array.from(actual)).toEqual(Array.from(expected));}
 });
 it('pauses offscreen surf independently while the distant sea remains visible',()=>{
  const s=scene();s.activeCamera=camera(s,250);const root=new TransformNode('root',s),backdrop=createCoastalBackdrop(s,root,'',{pauseOffscreen:true});MeshBuilder.CreateGround('retreat:bay-maritime-skirt',{width:600,height:600},s);
  const start=backdrop.sea.metadata.coastalAnimation;expect(start.foamUpdates).toBe(1);backdrop.update(10,.2,.6);expect(start.geometryUpdates).toBe(2);expect(start.foamUpdates).toBe(1);expect(start.skippedFoamUpdates).toBe(1);
 });
});
