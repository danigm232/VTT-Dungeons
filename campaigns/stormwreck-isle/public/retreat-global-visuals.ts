import type {Scene} from '@babylonjs/core/scene.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Vector3,Quaternion} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
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
import {installRetreatRefinement} from './retreat-refinement.js';

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
export function createRetreatGlobalVisuals(scene:Scene,options:{refinementPhase?:number}={}){
 const beforeLights=new Set(scene.lights),beforeParticles=new Set(scene.particleSystems);
 const definition=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-a1-rooms')!;
 const base=createA1Visuals(scene,definition),root=base.root;
 const offset=new Vector3(72,9,72),sourceMaterials=new Map(scene.materials.map(m=>[m.name,m]));
 root.position.copyFrom(offset);
 const source= root.getChildMeshes(false);
 for(const m of source){m.unfreezeWorldMatrix();m.computeWorldMatrix(true);if(contextNames.some(n=>m.name.includes(n)))m.setEnabled(false);m.metadata={...m.metadata,tokenOccluder:!/lit-floor|static:.*(earth|plaza)|halo|flame|glow|bounce|pool|shadow|mist|fire|foliage|breeze|smoke|bay|shore-wash|water/.test(m.name)};}
 for(const l of scene.lights)if(!beforeLights.has(l)&&l.getClassName()==='PointLight'&&!l.parent)(l as any).position.addInPlace(offset);
 for(const p of scene.particleSystems)if(!beforeParticles.has(p)&&p.emitter instanceof Vector3)p.emitter.addInPlace(offset);
 const modules:Mesh[]=[],floors:Mesh[]=[],roofs:TransformNode[]=[],walls:TransformNode[]=[],props:TransformNode[]=[],doors=new Map<string,TransformNode>();
 const fixtures:{node:TransformNode;owner:TransformNode}[]=[];
 const originalVisibility=new Map<Mesh,number>(),states=new Map<string,boolean>();
 const stats={source:'Approved zones A1–A5 / Blender GLB',loaded:false,loadMs:0,meshes:0,error:'',materials:[] as any[],refinement:null as any};
 let refinement:Awaited<ReturnType<typeof installRetreatRefinement>>|undefined;
 // Babylon's default PBR LUT can otherwise add an unneeded asynchronous IBL load.
 if(!scene.environmentBRDFTexture)scene.environmentBRDFTexture=RawTexture.CreateRGBATexture(new Uint8Array([128,128,0,255]),1,1,scene,false,false,Texture.NEAREST_SAMPLINGMODE);
 let disposed=false,lastTime=0,pallet:TransformNode|undefined,palletRest=0,liftElevation=12,focusPoint:Vector3|null=null;
 let occlusionRevision=0,lastOcclusionKey='',lastOcclusionTime=-Infinity;let cachedOccluders:Mesh[]=[];
 const chainLinks:TransformNode[]=[];
 const faded=new Map<Mesh,{visibility:number;isVisible:boolean}>(),heightCache=new Map<string,number>();
 const setDoor=(id:string,open:boolean)=>{if(states.get(id)!==open)occlusionRevision++;states.set(id,open);const node=doors.get(id);if(node){node.rotationQuaternion=null;node.rotation.y=open?(id==='a2-winch-door'?-Math.PI/2:Math.PI/2):0;node.computeWorldMatrix(true);}};
 const setLift=(elevation:number)=>{const next=Math.max(0,Math.min(15,elevation));if(next!==liftElevation)occlusionRevision++;liftElevation=next;if(pallet){pallet.position.y=palletRest+(liftElevation-12);const end=pallet.position.y+1.03;for(const link of chainLinks){link.computeWorldMatrix(true);link.setEnabled(link.getAbsolutePosition().y>=end-.06);}}};
 const ready=(async()=>{
  const started=performance.now();
  for(const [zone,url] of Object.entries(urls)){
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
    if(e.role==='cargo-pallet'){pallet=n;palletRest=n.position.y;setLift(liftElevation);}
    if(e.role==='chain-link')chainLinks.push(n);
   }
   for(const m of result.meshes){
    if(!(m instanceof Mesh)||!m.getTotalVertices())continue;
    m.computeWorldMatrix(true);modules.push(m);m.isPickable=true;m.receiveShadows=false;
    const name=m.name,e=extra(m),role=e.role??extra(m.parent).role;
    const isFloor=/walkable-floor|walkable-stair/.test(role??'')||/CANON_Floor_|Global_.*walkable|APPROACH_(floor|stair)/.test(name);
    if(isFloor)floors.push(m);
    m.metadata={...m.metadata,retreatZone:zone,retreatFloor:isFloor,tokenOccluder:!isFloor};
    // Context and the new connections share the preserved camp's material palette.
    if(['a1','shore','connections'].includes(zone)&&m.material){
     const replacement=sourceMaterials.get(m.material.name.replace(/\.\d+$/,''));if(replacement)m.material=replacement;
    }
   }
  }
  for(const material of scene.materials)if('environmentBRDFTexture' in material){(material as any).environmentBRDFTexture=null;}
  refinement=await installRetreatRefinement(scene,options.refinementPhase);
  stats.refinement=refinement.stats;
  occlusionRevision++;
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
 const visibility=(node:TransformNode,value:number)=>{for(const m of node.getChildMeshes(false) as Mesh[]){if(!originalVisibility.has(m))originalVisibility.set(m,m.visibility);m.visibility=value*originalVisibility.get(m)!;}if(node instanceof Mesh){if(!originalVisibility.has(node))originalVisibility.set(node,node.visibility);node.visibility=value*originalVisibility.get(node)!;}};
 const update:CampVisuals['update']=(time,phase,interactions,focus,environment,now,climate,light)=>{
  for(const [mesh,value] of faded){mesh.visibility=value.visibility;mesh.isVisible=value.isVisible;}faded.clear();
  const local=focus?{col:focus.col-48,row:focus.row-48}:null;
  base.update(time,phase,interactions,local,environment,now,climate,light);
  const dt=Math.min(.1,Math.max(0,time-lastTime));lastTime=time;
  const room=local?A1_ROOMS.find(r=>r.cells.some(c=>c.col===local.col&&c.row===local.row)):undefined;
  for(const m of source)if(/a1:room-\d+:face-/.test(m.name)&&!m.name.startsWith(`a1:room-${room?.id}:`))m.visibility=1;
  if(room){for(const m of source)if(m.name.startsWith(`a1:room-${room.id}:`)&&/face-[0123]|mountain-roof/.test(m.name))m.visibility=Math.max(0,m.visibility-dt*8);for(const m of source)if(m.name.startsWith('a1:bedrock-partition:')){const i=Number(m.name.split(':')[2]);if(i===room.id||i===room.id-1)m.visibility=.06;}}
  else for(const m of source)if(m.name.startsWith('a1:bedrock-partition:'))m.visibility=1;
  const camera=scene.activeCamera;if(!camera)return;
  const p=focus?new Vector3((focus.col+.5)*1.5,0,(focus.row+.5)*1.5):null;
  const active=p?(p.x>153&&p.z<72?'a2':p.x>116&&p.x<128&&p.z<66?'a3':p.x>95&&p.x<109&&p.z<66?'a4':p.x<51&&p.z<73?'a5':null):null;
  // Canonical roofs read in exterior views and lift automatically when their
  // space is occupied. This presentation choice never removes a collider.
  for(const roof of roofs){const exterior=roof.metadata?.retreatRoofZone!==active;roof.setEnabled(exterior);for(const mesh of roof.getChildMeshes(false)){mesh.isVisible=exterior;mesh.visibility=exterior?1:0;}}
  for(const wall of walls){const z=extra(wall).globalZone??extra(wall).zone,show=!(active&&(!z||z===active));wall.setEnabled(show);if(wall instanceof Mesh)wall.isVisible=show;for(const mesh of wall.getChildMeshes(false))mesh.isVisible=show;}
  for(const {node,owner} of fixtures){const show=owner.isEnabled()&&(!(owner instanceof Mesh)||owner.isVisible);node.setEnabled(show);if(node instanceof Mesh)node.isVisible=show;for(const mesh of node.getChildMeshes(false))mesh.isVisible=show;}
  // Furniture keeps its physical collision footprint. Only the piece in front of
  // the current character fades; this affects presentation, never movement.
  for(const node of props)visibility(node,1);
  const actual=focusPoint??(p?new Vector3(p.x,active?(layout.canonElevations[active as keyof typeof layout.canonElevations]??9):9,p.z):null);
  refinement?.update(room?`room${room.id}`:active,actual,time);
  if(actual){const direction=camera.getForwardRay().direction;
   const key=[actual.x,actual.y,actual.z].map(v=>Math.round(v*20)).join(',')+':'+[direction.x,direction.y,direction.z].map(v=>Math.round(v*1000)).join(',')+':'+(room?.id??active??'outside')+':'+occlusionRevision;
   const hide=(mesh:Mesh)=>{if(!faded.has(mesh))faded.set(mesh,{visibility:mesh.visibility,isVisible:mesh.isVisible});mesh.isVisible=false;};
   if(key===lastOcclusionKey&&time>=lastOcclusionTime&&time-lastOcclusionTime<.25){for(const mesh of cachedOccluders)if(!mesh.isDisposed()&&mesh.isEnabled()&&mesh.isVisible)hide(mesh);}
   else{lastOcclusionKey=key;lastOcclusionTime=time;
    for(const h of [.6,.75,1.3,1.35]){const target=actual.add(new Vector3(0,h,0)),ray=new Ray(target.subtract(direction.scale(160)),direction,159.9);const hits=scene.multiPickWithRay(ray,m=>m.isEnabled()&&m.isVisible&&m.visibility>.3&&m.metadata?.tokenOccluder===true);for(const hit of hits??[]){const mesh=hit.pickedMesh as Mesh|null;if(mesh)hide(mesh);}}
    cachedOccluders=[...faded.keys()];
   }
  }
 };
 const weatherCovered=(x:number,z:number)=>base.weatherCovered?.(x-72,z-72)||([['a2',153,163,64,73],['a3',116,127,55,65],['a4',95,109,56,65]] as const).some(([,x0,x1,z0,z1])=>x>x0&&x<x1&&z>z0&&z<z1);
 return {root,ready,stats,update,supportHeight,setDoor,setLift,setFocusPoint:(point:Vector3|null)=>{focusPoint=point?.clone()??null;},weatherCovered,openLibraryDoor:(open:boolean)=>setDoor('a4-library-door',open),dispose:()=>{disposed=true;}};
}
