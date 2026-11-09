import type {Scene} from '@babylonjs/core/scene.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import {Vector3,Quaternion} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {updateRetreatCellVisibility} from './retreat-cell-visibility.js';
import {RawTexture} from '@babylonjs/core/Materials/Textures/rawTexture.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import '@babylonjs/loaders/glTF/index.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js';
import '@babylonjs/core/Particles/particleSystemComponent.js';
import '@babylonjs/core/Shaders/particles.vertex.js';
import '@babylonjs/core/Shaders/particles.fragment.js';
import '@babylonjs/core/Layers/effectLayerSceneComponent.js';
import '@babylonjs/core/Shaders/glowMapGeneration.vertex.js';
import '@babylonjs/core/Shaders/glowMapGeneration.fragment.js';
import '@babylonjs/core/Shaders/glowMapMerge.vertex.js';
import '@babylonjs/core/Shaders/glowMapMerge.fragment.js';
import '@babylonjs/core/Shaders/glowBlurPostProcess.fragment.js';
import '@babylonjs/core/Shaders/kernelBlur.vertex.js';
import '@babylonjs/core/Shaders/kernelBlur.fragment.js';
import '@babylonjs/core/Shaders/postprocess.vertex.js';
import '@babylonjs/core/Shaders/pass.fragment.js';
// Eager registration also keeps the developer preview on the same shader store
// as the compiled VTT; hidden grids must not wait for a separate lazy bundle.
import '@babylonjs/core/Shaders/default.vertex.js';
import '@babylonjs/core/Shaders/default.fragment.js';
import '@babylonjs/core/Shaders/color.vertex.js';
import '@babylonjs/core/Shaders/color.fragment.js';
import {createA1Visuals} from '../../camp-rests/public/a1-visuals.js';
import {campRestsPublicCampaign} from '../../camp-rests/public/pack.js';
import {A1_ROOMS} from '../../camp-rests/public/a1-layout.js';
import type {CampVisuals} from '../../camp-rests/public/visuals.js';
import layout from './retreat-zones/global-layout.json' with {type:'json'};
import adapted from './retreat-zones/adapted-context.json' with {type:'json'};
import {createRetreatLocalOcclusion,keepRetreatCellWallsStable,separateRetreatCellStructure,retreatExcavationCutsMesh} from './retreat-local-occlusion.js';
import {preserveRetreatWeatherVisibility} from './retreat-weather-visibility.js';
import {installRetreatRefinement} from './retreat-refinement.js';
import {retreatFinishStage,bindRetreatWinchCargo} from './retreat-zone-finishes.js';
import {retreatExpansionModules,retreatExpandedInterior,retreatExpandedCovered} from './retreat-expansion.js';
import {authoredMeshLookup,indexRetreatView} from './retreat-quick-opt.js';
import {isRetreatModuleFloor,preserveOpaqueRetreatGround,clearRetreatPlazaRock} from './retreat-ground-presentation.js';
import {retreatRevisionModules,retreatRevisionStage} from './retreat-visual-revisions.js';
export {conformRetreatGrid} from './retreat-grid-presentation.js';

const urls={
 a1:new URL('./art/retreat-modules/retreat_global_a1_context_runtime.glb',import.meta.url).href,
 shore:new URL('./art/retreat-modules/retreat_global_shore_runtime.glb',import.meta.url).href,
 connections:new URL('./art/retreat-modules/retreat_global_connections_runtime.glb',import.meta.url).href,
 a2:new URL('./art/retreat-modules/retreat_global_a2.glb',import.meta.url).href,
 a3:new URL('./art/retreat-modules/retreat_global_a3.glb',import.meta.url).href,
 a4:new URL('./art/retreat-modules/retreat_global_a4.glb',import.meta.url).href,
 a5:new URL('./art/retreat-modules/retreat_global_a5.glb',import.meta.url).href,
 roof2:new URL('./art/retreat-modules/retreat_global_a2_roof.glb',import.meta.url).href,
 roof3:new URL('./art/retreat-modules/retreat_global_a3_roof.glb',import.meta.url).href,
 roof4:new URL('./art/retreat-modules/retreat_global_a4_roof.glb',import.meta.url).href,
 roof5:new URL('./art/retreat-modules/retreat_global_a5_roof.glb',import.meta.url).href
};
const extra=(n:any)=>n.metadata?.gltf?.extras??{};
const contextNames=adapted.names;
export function createRetreatGlobalVisuals(scene:Scene,options:{refinementPhase?:number;stoneStage?:number;expanded?:boolean;islandStage?:number;finishStage?:number;departureStage?:number;polishStage?:number;revisionStage?:number}={}){
 const expanded=options.expanded!==false,revisionStage=expanded?retreatRevisionStage(options.revisionStage):0,moduleUrls=expanded?{...urls,...retreatExpansionModules,...retreatRevisionModules(revisionStage)}:urls;
 const finishingStage=retreatFinishStage(options.finishStage);
 const beforeLights=new Set(scene.lights),beforeParticles=new Set(scene.particleSystems);
 const definition=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-a1-rooms')!;
 const base=createA1Visuals(scene,definition,{
  pauseInvisibleSea:true,courtyardSpread:revisionStage>=6,retreatTorchMounts:revisionStage>=6,cullShadowCasters:true,
  updateFog:density=>{
   // Assign the final mode once. Switching exponential → linear every
   // rainy frame invalidates the scene's material defines twice.
   if(!scene.activeCamera||!Number.isFinite(density)||density<=.0001)scene.fogMode=density===0?0:2;
   else preserveRetreatWeatherVisibility(scene,density);
  }
 }),root=base.root;
 const offset=new Vector3(72,9,72),sourceMaterials=new Map(scene.materials.map(m=>[m.name,m]));
 root.position.copyFrom(offset);
 const source= root.getChildMeshes(false);
 for(const m of source){m.unfreezeWorldMatrix();m.computeWorldMatrix(true);if(contextNames.some(n=>m.name.includes(n)))m.setEnabled(false);m.metadata={...m.metadata,retreatFloor:/lit-floor/.test(m.name),tokenOccluder:!/lit-floor|static:.*(earth|plaza)|halo|flame|glow|bounce|pool|shadow|mist|fire|foliage|breeze|smoke|bay|shore-wash|water/.test(m.name)};}
 for(const l of scene.lights)if(!beforeLights.has(l)&&l.getClassName()==='PointLight'&&!l.parent)(l as any).position.addInPlace(offset);
 for(const p of scene.particleSystems)if(!beforeParticles.has(p)&&p.emitter instanceof Vector3)p.emitter.addInPlace(offset);
 const modules:AbstractMesh[]=[],floors:AbstractMesh[]=[],roofs:TransformNode[]=[],walls:TransformNode[]=[],props:TransformNode[]=[],doors=new Map<string,TransformNode>();
 const fixtures:{node:TransformNode;owner:TransformNode}[]=[],liftCargo:TransformNode[]=[];
 const originalVisibility=new Map<AbstractMesh,number>(),states=new Map<string,boolean>();
 const localOcclusion=createRetreatLocalOcclusion(scene,{coherentPrimitives:finishingStage>=3});
 scene.metadata={...scene.metadata,retreatOcclusion:localOcclusion.stats};
 // Preserve the authored rest transforms of the original cell walls. The camp
 // owner operates in local coordinates; this translated scene resolves its
 // camera cutaway through visibility, never by rebuilding the cell geometry.
 const cellWalls=keepRetreatCellWallsStable(source as Mesh[]);
 const cellWallOrder=new Map(cellWalls.map(mesh=>[mesh,mesh.alphaIndex]));
 const cellStructure=separateRetreatCellStructure(scene,source as Mesh[]);
 const stats={source:'Approved zones A1–A5 / Blender GLB',loaded:false,loadMs:0,meshes:0,error:'',boundLiftCargo:0,groundRepair:null as ReturnType<typeof clearRetreatPlazaRock>,materials:[] as any[],refinement:null as any};
 const authoredChildren=authoredMeshLookup(()=>stats.loaded);
 let refinement:Awaited<ReturnType<typeof installRetreatRefinement>>|undefined;
 // Babylon's default PBR LUT can otherwise add an unneeded asynchronous IBL load.
 if(!scene.environmentBRDFTexture)scene.environmentBRDFTexture=RawTexture.CreateRGBATexture(new Uint8Array([128,128,0,255]),1,1,scene,false,false,Texture.NEAREST_SAMPLINGMODE);
 let disposed=false,focusHeight=1.65,focusActorId:string|undefined,focusSurfaceId:string|undefined,pallet:TransformNode|undefined,palletRest=0,liftElevation=12,focusPoint:Vector3|null=null;
 let combatFocus:ReadonlyArray<{point:Vector3;height:number;id:string}>=[];
 const chainLinks:TransformNode[]=[];
 let winchLowered:boolean|undefined,liftTween:{from:number;to:number;start:number}|null=null,liftFollowUntil=0,liftCable:Mesh|undefined,liftCableHeight=NaN,winchAxle:TransformNode|undefined;
 const setMechanicalState=(lowered:boolean,now:number)=>{
  if(revisionStage<6||lowered===winchLowered)return;
  const to=lowered ? .24 : 12;
  if(winchLowered===undefined)setLift(to);else {liftTween={from:liftElevation,to,start:now};liftFollowUntil=now+14_000;}
  winchLowered=lowered;
 };
 const heightCache=new Map<string,number>();
 const setDoor=(id:string,open:boolean)=>{if(states.get(id)!==open)localOcclusion.invalidate();states.set(id,open);const node=doors.get(id);if(node){node.rotationQuaternion=null;node.rotation.y=open?(id==='a2-winch-door'?-Math.PI/2:Math.PI/2):0;node.computeWorldMatrix(true);}};
 const setLift=(elevation:number)=>{const next=Math.max(0,Math.min(15,elevation));if(next!==liftElevation)localOcclusion.invalidate();liftElevation=next;if(pallet){pallet.position.y=palletRest+(liftElevation-12);if(revisionStage<6){const end=pallet.position.y+1.03;for(const link of chainLinks){link.computeWorldMatrix(true);link.setEnabled(link.getAbsolutePosition().y>=end-.06);}}}};
 const ready=(async()=>{
  const started=performance.now();
  for(const [zone,url] of Object.entries(moduleUrls)){
   if(disposed||scene.isDisposed)return;
   const result=await SceneLoader.ImportMeshAsync('',url.slice(0,url.lastIndexOf('/')+1),url.slice(url.lastIndexOf('/')+1),scene);
   if(disposed||scene.isDisposed){result.meshes.forEach(m=>m.dispose());return;}
   const gltfRoot=result.meshes[0]!;gltfRoot.rotationQuaternion=Quaternion.Identity();gltfRoot.scaling.set(1,1,-1);
   const nodes=[...result.transformNodes,...result.meshes];
   for(const node of nodes){const ownerName=extra(node).vttOcclusionOwner;if(ownerName){const owner=nodes.find(n=>n.name.replace(/\.\d+$/,'')===ownerName);if(owner)fixtures.push({node,owner});}}
   for(const n of nodes){
    const e=extra(n);if(e.role==='roof'||zone.startsWith('roof')){if(n===gltfRoot){roofs.push(n);n.metadata={...n.metadata,retreatRoofZone:'a'+zone.slice(-1)};n.setEnabled(false);}}
    if(e.role==='wall-upper'||e.role==='entrance')walls.push(n);
    if(['wall-shelf','freestanding-shelf','study-table','lectern','winch-frame','winch-drum','winch-crank','column','bahamut-statue'].includes(e.role))props.push(n);
    if(e.role==='hinged-door'){doors.set(zone==='a2'?'a2-winch-door':'a4-library-door',n);setDoor(zone==='a2'?'a2-winch-door':'a4-library-door',states.get(zone==='a2'?'a2-winch-door':'a4-library-door')??false);}
    if(e.role==='cargo-pallet'){pallet=n;palletRest=n.position.y;if(finishingStage<4)setLift(liftElevation);}
    if(e.role==='supply-cargo'&&e.globalZone==='a2')liftCargo.push(n);
    if(e.role==='chain-link')chainLinks.push(n);
   }
   for(const m of result.meshes){
    if(!(m instanceof AbstractMesh)||!m.getTotalVertices())continue;
    m.computeWorldMatrix(true);modules.push(m);m.isPickable=true;m.receiveShadows=false;
    const name=m.name,e=extra(m),role=e.role??extra(m.parent).role;
    // Vertical clearances measured against the actual R3 head, shoulders and palms.
    const canary = zone === 'a5' && /^CANON_Canary_V3_([1-7])$/.exec(name);
    if (canary) {
     m.position.y -= [.104, .065, .065, .074, .086, .074, .086][Number(canary[1]) - 1]!;
     m.computeWorldMatrix(true);
    }
    const authoredRevision=e.revision??extra(m.parent).revision;
    if(authoredRevision==='V3')preserveOpaqueRetreatGround(m);
    const isFloor=isRetreatModuleFloor(zone,name,role);
    if(isFloor){floors.push(m);preserveOpaqueRetreatGround(m);}
    // This preserved batch contains all low outdoor props, including both
    // benches. Fading one kettle primitive used to fade every bench as well.
    // Individual cell furniture keeps its existing occlusion policy.
    const lowOutdoorProps=zone==='a1'&&m.name.startsWith('a1:static:small-props');
    m.metadata={...m.metadata,retreatZone:zone,retreatAuthoredRevision:authoredRevision,retreatFloor:isFloor,tokenOccluder:!isFloor&&!lowOutdoorProps};
    if(zone==='a1'&&m instanceof Mesh){const repaired=clearRetreatPlazaRock(m);if(repaired)stats.groundRepair=repaired;}
    // Context and the new connections share the preserved camp's material palette.
    if(['a1','shore','connections'].includes(zone)&&m.material){
     const replacement=sourceMaterials.get(m.material.name.replace(/\.\d+$/,''));if(replacement)m.material=replacement;
    }
   }
  }
  if(finishingStage>=4&&pallet)stats.boundLiftCargo=bindRetreatWinchCargo(pallet,liftCargo);
  if(revisionStage>=6){
   for(const link of chainLinks)link.setEnabled(false);
   const drum=props.find(n=>extra(n).role==='winch-drum'),crank=props.find(n=>extra(n).role==='winch-crank');
   if(drum){drum.computeWorldMatrix(true);winchAxle=new TransformNode('retreat:winch-axle',scene);winchAxle.position.copyFrom(drum.getAbsolutePosition());for(const node of [drum,crank])if(node){node.setParent(winchAxle,true);if(node instanceof Mesh)node.metadata={...node.metadata,retreatDynamic:true};for(const mesh of node.getChildMeshes())mesh.metadata={...mesh.metadata,retreatDynamic:true};}}
  }
  for(const material of scene.materials)if('environmentBRDFTexture' in material){(material as any).environmentBRDFTexture=null;}
  refinement=await installRetreatRefinement(scene,options.refinementPhase,options.stoneStage,expanded,options.islandStage,options.finishStage,options.departureStage,options.polishStage,revisionStage);
  if(disposed||scene.isDisposed)return;
  indexRetreatView(scene);
  stats.refinement=refinement.stats;
  localOcclusion.prepare();
  localOcclusion.invalidate();
  floors.push(...refinement.meshes.filter(m=>m.metadata?.retreatFloor));
  stats.meshes=modules.length+source.filter(m=>m.isEnabled()).length+refinement.meshes.length;stats.loaded=true;stats.loadMs=Math.round(performance.now()-started);
  setLift(liftElevation);
  stats.materials=scene.materials.filter(m=>/Wood_End|coastal-cliff|plaza-v6/.test(m.name)).map((m:any)=>({name:m.name,type:m.getClassName(),color:m.albedoColor?.asArray()??m.diffuseColor?.asArray(),texture:m.albedoTexture?.name??m.diffuseTexture?.name,alpha:m.alpha}));
 })().catch(error=>{stats.error=String(error);console.error('No se pudo cargar el Retiro del Dragón',error);throw error;});
 const supportHeight=(p:Vector3)=>{
  const cacheKey=`${Math.round(p.x*50)},${Math.round(p.y*10)},${Math.round(p.z*50)}`;const cached=heightCache.get(cacheKey);if(cached!==undefined)return cached;
  if(!stats.loaded)return p.y+(p.y>8.5&&p.y<9.5?.14:.055);
  const ray=new Ray(new Vector3(p.x,p.y+1,p.z),Vector3.Down(),2);
  const hits=scene.multiPickWithRay(ray,m=>floors.includes(m as Mesh)||source.includes(m)&&/lit-floor|static:.*(earth|plaza)/.test(m.name));
  const y=Math.max(...(hits??[]).filter(h=>h.hit&&h.pickedPoint).map(h=>h.pickedPoint!.y));const result=Number.isFinite(y)?y+.055:p.y+.055;if(heightCache.size>4096)heightCache.clear();heightCache.set(cacheKey,result);return result;
 };
 const stablePropOpacity=new WeakSet<AbstractMesh>();
 const restorePropOpacity=(mesh:AbstractMesh)=>{
  if(!originalVisibility.has(mesh))originalVisibility.set(mesh,mesh.visibility);
  stablePropOpacity.add(mesh);
  localOcclusion.setBaseVisibility(mesh,originalVisibility.get(mesh)!);
 };
 const update:CampVisuals['update']=(time,phase,interactions,focus,environment,now,climate,light)=>{
  if(revisionStage>=6&&pallet){
   if(liftTween){const t=Math.max(0,Math.min(1,((now??Date.now())-liftTween.start)/8500)),ease=t*t*(3-2*t);setLift(liftTween.from+(liftTween.to-liftTween.from)*ease);if(t>=1)liftTween=null;}
   if(!Number.isFinite(liftCableHeight)||Math.abs(liftCableHeight-liftElevation)>1e-5){
    pallet.computeWorldMatrix(true);const load=pallet.getAbsolutePosition(),path=[new Vector3(load.x,15.45,load.z),new Vector3(load.x,load.y+1.03,load.z)];
    liftCable=MeshBuilder.CreateTube('retreat:winch-live-cable',{path,radius:.027,tessellation:7,updatable:true,instance:liftCable},scene);liftCable.material=scene.getMaterialByName('Iron_Weathered')??scene.materials.find(m=>/iron|Iron/.test(m.name))??null;liftCable.isPickable=false;liftCable.metadata={tokenOccluder:false,retreatDynamic:true};liftCableHeight=liftElevation;
    if(winchAxle)winchAxle.rotation.x=(liftElevation-12)*2.6;
   }
  }
  // The authored furniture has a fixed base opacity. Reuse the last visible
  // fade until this frame resolves it, avoiding 1 → translucent shader churn.
  localOcclusion.restore(true,stablePropOpacity);
  const local=focus?{col:focus.col-48,row:focus.row-48}:null;
  base.update(time,phase,interactions,local,environment,now,climate,light);
  cellStructure.sync();
  const room=local?A1_ROOMS.find(r=>r.cells.some(c=>c.col===local.col&&c.row===local.row)):undefined;
  const eyeDirection=scene.activeCamera?.getForwardRay().direction.scale(-1);
  updateRetreatCellVisibility(cellWalls,room?.id,eyeDirection,cellWallOrder);
  for(const m of source)if(m.name.startsWith('a1:bedrock-partition:'))m.visibility=1;
  // Only the roof over the occupied cell lifts. The rear/side walls remain
  // until an actual body sight ray identifies the obstructing face.
  if(room)for(const m of source)if(m.name.startsWith(`a1:room-${room.id}:mountain-roof`))m.visibility=0;
  const camera=scene.activeCamera;if(!camera){localOcclusion.finishFrame();return;}
  const p=focus?new Vector3((focus.col+.5)*1.5,0,(focus.row+.5)*1.5):null;
  const candidate=p?(expanded?retreatExpandedInterior(p.x,p.z,revisionStage):(p.x>153&&p.z<72?'a2':p.x>116&&p.x<128&&p.z<66?'a3':p.x>95&&p.x<109&&p.z<66?'a4':p.x<51&&p.z<73?'a5':null)):null;
  // A street tile can share X/Z with the edge of an entrance. Entering the
  // room's navigation surface is what opens its coherent cutaway; walking
  // past a closed library door must not expose the whole room.
  const active=candidate&&(!focusSurfaceId||focusSurfaceId===candidate)?candidate:null;
  // Canonical roofs read in exterior views and lift automatically when their
  // space is occupied. This presentation choice never removes a collider.
   for(const roof of roofs){const exterior=roof.metadata?.retreatRoofZone!==active;roof.setEnabled(exterior);for(const mesh of authoredChildren(roof)){mesh.isVisible=exterior;mesh.visibility=exterior?1:0;}}
   for(const wall of walls){wall.setEnabled(true);if(wall instanceof AbstractMesh)wall.isVisible=true;for(const mesh of authoredChildren(wall))mesh.isVisible=true;}
   for(const {node,owner} of fixtures){const show=owner.isEnabled()&&(!(owner instanceof Mesh)||owner.isVisible);node.setEnabled(show);if(node instanceof Mesh)node.isVisible=show;for(const mesh of authoredChildren(node))mesh.isVisible=show;}
  // Furniture keeps its physical collision footprint. Only the piece in front of
  // the current character fades; this affects presentation, never movement.
  for(const node of props){
   for(const mesh of authoredChildren(node))restorePropOpacity(mesh);
   if(node instanceof AbstractMesh)restorePropOpacity(node);
  }
  const actual=focusPoint??(p?new Vector3(p.x,active?(layout.canonElevations[active as keyof typeof layout.canonElevations]??9):9,p.z):null);
  refinement?.update(room?`room${room.id}`:active,actual,time);
  if(eyeDirection)for(const wall of walls)if(wall instanceof AbstractMesh&&retreatExcavationCutsMesh(wall,active,eyeDirection,actual))wall.isVisible=false;
  if(actual||!combatFocus.length)localOcclusion.update(actual,focusHeight,time,focusActorId);
  for(const actor of combatFocus)localOcclusion.update(actor.point,actor.height,time,actor.id);
  if(revisionStage>=6){
   // An occupied excavation opens its complete doorway visually. The hinged
   // transform and the server's closed-door collider keep their real state.
   for(const [id,node]of doors){const zone=id==='a4-library-door'?'a4':'a2';if(node instanceof Mesh)node.isVisible=zone!==active;for(const mesh of authoredChildren(node))mesh.isVisible=zone!==active;}
   for(const wall of walls)if(extra(wall).role==='entrance'&&(wall.metadata?.retreatZone===active||extra(wall).globalZone===active)){if(wall instanceof AbstractMesh&&!wall.metadata?.retreatFloor)wall.isVisible=false;for(const mesh of authoredChildren(wall))if(!mesh.metadata?.retreatFloor)mesh.isVisible=false;}
  }
  // Wall shelves belong to the same camera-facing cutaway as their stone
  // wall. Leaving a solid 2 m bookcase across the cut otherwise closes the
  // room again. Rear and freestanding shelves keep normal body-ray fading.
  if(eyeDirection&&(active==='a3'||active==='a4'))for(const node of props){
   const children=authoredChildren(node).filter(m=>m.getTotalVertices()&&retreatExcavationCutsMesh(m,active,eyeDirection,actual));
   const opacity=1-Math.pow(.84,1/Math.max(1,children.length));
   for(const mesh of children)localOcclusion.cutaway(mesh,opacity);
  }
  localOcclusion.finishFrame();
  refinement?.syncWinchHouse?.();
  const darkness=light?1-light.ambient:environment?.timeOfDay==='night'?1:environment?.timeOfDay==='sunset'?.55:0;
  refinement?.updateFixtures?.(time,darkness);
 };
 const weatherCovered=(x:number,z:number)=>base.weatherCovered?.(x-72,z-72)||(expanded?retreatExpandedCovered(x,z,revisionStage):([['a2',153,163,64,73],['a3',116,127,55,65],['a4',95,109,56,65]] as const).some(([,x0,x1,z0,z1])=>x>x0&&x<x1&&z>z0&&z<z1));
 return {root,ready,stats,update,supportHeight,setDoor,setLift,setMechanicalState,liftCameraFollow:(now:number)=>now<liftFollowUntil,getLiftPosition:()=>{pallet?.computeWorldMatrix(true);return pallet?.getAbsolutePosition()??null;},setFocusPoint:(point:Vector3|null,height=1.65,actorId?:string,combat:ReadonlyArray<{point:Vector3;height:number;id:string}>=[],surfaceId?:string)=>{focusPoint=point?.clone()??null;focusHeight=Number.isFinite(height)?Math.max(.3,Math.min(3,height)):1.65;focusActorId=actorId;focusSurfaceId=surfaceId;combatFocus=combat;},weatherCovered,openLibraryDoor:(open:boolean)=>setDoor('a4-library-door',open),dispose:()=>{disposed=true;localOcclusion.dispose();cellStructure.dispose();}};
}
