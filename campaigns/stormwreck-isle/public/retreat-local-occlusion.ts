import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {Material} from '@babylonjs/core/Materials/material.js';
import {createRetreatOcclusionQueries} from './retreat-occlusion-queries.js';

const extras=(mesh:AbstractMesh|null)=>mesh?.metadata?.gltf?.extras??{};
const shellNames=new Set([
 'Stone_P6_Joined_Excavated_Mountain_Crest',
 'Stone_P6_Joined_Excavated_Mountain_Sides',
 'Stone_P7_Cave_Exterior_Edge_Closures',
 'Stone_P3_Sculpted_Carved_Front_0',
 'Stone_P3_Sculpted_Carved_Front_1',
 'Stone_P3_Sculpted_Carved_Front_2'
]);
type Vertex={world:Vector3;values:Record<string,number[]>};
function clip(polygon:Vertex[],axis:'x'|'z',value:number,positive:boolean){
 const result:Vertex[]=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=(a.world[axis]-value)*(positive?1:-1),db=(b.world[axis]-value)*(positive?1:-1);
  if(da>=-1e-8)result.push(a);
  if((da>1e-8&&db< -1e-8)||(da< -1e-8&&db>1e-8)){
   const t=da/(da-db),values:Record<string,number[]>={};
   for(const [kind,buffer] of Object.entries(a.values))values[kind]=buffer.map((v,k)=>v+(b.values[kind]![k]!-v)*t);
   result.push({world:Vector3.Lerp(a.world,b.world,t),values});
  }
 }
 return result;
}

/** Divide only the delivered decorative upper shell. Triangle clipping copies
 * the same surface and interpolates its existing UV/normals; no new rock or
 * floor is invented. The original GLB mesh remains available and untouched. */
export function splitRetreatUpperShells(meshes:Mesh[]){
 const added:Mesh[]=[],sources:Mesh[]=[],records:any[]=[];
 for(const source of [...meshes]){
  if(!shellNames.has(source.name)||!source.isEnabled()||source.metadata?.retreatOcclusionSource)continue;
  const positions=source.getVerticesData('position'),indices=source.getIndices();
  // The delivered rock skin has one shared material.
  if(!positions||!indices||source.subMeshes.length!==1)continue;
  const world=source.computeWorldMatrix(true),kinds=source.getVerticesDataKinds(),buffers=new Map(kinds.map(kind=>[kind,source.getVerticesData(kind)!])),strides=new Map(kinds.map(kind=>[kind,source.getVertexBuffer(kind)!.getSize()]));
  const regions=[{zone:'backing',cuts:[['z',49.2,false]] as const},{zone:'a4',cuts:[['z',49.2,true],['x',112.5,false]] as const},{zone:'a3',cuts:[['z',49.2,true],['x',112.5,true]] as const}];
  const parts:Mesh[]=[];
  for(const region of regions){
   const arrays:Record<string,number[]>={};for(const kind of kinds)arrays[kind]=[];
   const outIndices:number[]=[];
   for(let i=0;i<indices.length;i+=3){
    let polygon:Vertex[]=[];
    for(let corner=0;corner<3;corner++){
     const id=indices[i+corner]!,values:Record<string,number[]>={};
     for(const kind of kinds){const stride=strides.get(kind)!,data=buffers.get(kind)!;values[kind]=Array.from(data.slice(id*stride,(id+1)*stride));}
     polygon.push({world:Vector3.TransformCoordinates(Vector3.FromArray(values.position!),world),values});
    }
    for(const [axis,value,positive] of region.cuts)polygon=clip(polygon,axis,value,positive);
    for(let triangle=1;triangle<polygon.length-1;triangle++){
     const vertices=[polygon[0]!,polygon[triangle]!,polygon[triangle+1]!];
     if(Vector3.Cross(vertices[1]!.world.subtract(vertices[0]!.world),vertices[2]!.world.subtract(vertices[0]!.world)).lengthSquared()<1e-14)continue;
     for(const vertex of vertices){outIndices.push(arrays.position!.length/3);for(const kind of kinds)arrays[kind]!.push(...vertex.values[kind]!);}
    }
   }
   if(!outIndices.length)continue;
   const part=new Mesh(`${source.name}:o1:${region.zone}`,source.getScene());
   part.parent=source.parent;part.position.copyFrom(source.position);part.scaling.copyFrom(source.scaling);part.rotation.copyFrom(source.rotation);part.rotationQuaternion=source.rotationQuaternion?.clone()??null;
   for(const kind of kinds)part.setVerticesData(kind,arrays[kind]!,false,strides.get(kind));part.setIndices(outIndices);
   part.material=source.material;part.isPickable=source.isPickable;part.receiveShadows=source.receiveShadows;part.checkCollisions=false;part.hasVertexAlpha=source.hasVertexAlpha;part.useVertexColors=source.useVertexColors;part.cullingStrategy=Mesh.CULLINGSTRATEGY_STANDARD;
   const e:Record<string,any>={...extras(source),vttInterior:region.zone,vttCutaway:extras(source).vttCutaway};
   if(region.zone==='backing'){delete e.vttCutaway;delete e.vttInterior;}
   part.metadata={...source.metadata,gltf:{...source.metadata?.gltf,extras:e},retreatOcclusionPart:region.zone,retreatOcclusionOriginal:source.name,permanentBackdrop:region.zone==='backing',tokenOccluder:region.zone!=='backing',stoneShadowCaster:false};
   part.computeWorldMatrix(true);parts.push(part);
  }
  if(!parts.length)continue;
  source.setEnabled(false);source.metadata={...source.metadata,retreatOcclusionSource:true};sources.push(source);added.push(...parts);
  records.push({source:source.name,sourceVertices:source.getTotalVertices(),sourceTriangles:indices.length/3,parts:parts.map(p=>({name:p.name,vertices:p.getTotalVertices(),triangles:p.getTotalIndices()/3}))});
 }
 meshes.push(...added);
 return {sources,parts:added,records,additionalMeshes:added.length-sources.length};
}

/** Roofs lift over their own occupied room. Walls keep their shape and are
 * attenuated only if an actual sight ray crosses them. Rear terrain is stable. */
export function retreatRoofCutsMesh(mesh:Mesh,interior:string|null){
 if(mesh.metadata?.permanentBackdrop)return false;
 const e=extras(mesh),zone=e.vttInterior;
 return e.vttCutaway==='roof'&&(zone===interior||zone==='upper-caves'&&(interior==='a3'||interior==='a4'));
}

/** Reveal the occupied excavation as a room, including its entrance. A body
 * ray only opens a narrow slit in a long rock face. The imported facade is
 * partitioned at the existing A3/A4 boundary so the other room stays enclosed.
 * Backing beyond the rooms and low wall bases remain at their authored pose. */
export function retreatExcavationCutsMesh(mesh:AbstractMesh,interior:string|null,eye:Vector3,focus?:Vector3|null){
 if(interior==='a2'&&!mesh.metadata?.permanentBackdrop){
  const e=extras(mesh),role=e.role??extras(mesh.parent as AbstractMesh).role,zone=e.vttInterior??e.globalZone??mesh.metadata?.retreatZone;
  if(zone!=='a2'||role!=='wall-upper')return false;
  const b=mesh.getBoundingInfo().boundingBox,c=b.centerWorld,thinX=b.extendSizeWorld.x<b.extendSizeWorld.z;
  return (thinX?Math.sign(c.x-161.25)*eye.x:Math.sign(c.z-67)*eye.z)>.12;
 }
 if(interior!=='a3'&&interior!=='a4'||mesh.metadata?.permanentBackdrop)return false;
 const e=extras(mesh),role=e.role??extras(mesh.parent as AbstractMesh).role,zone=e.vttInterior??e.globalZone??mesh.metadata?.retreatZone;
 if(zone!==interior)return false;
 if(e.authoredRole==='wall-light-fixture')return true;
 // A4's fixed reveals belong to the same portal as the door leaf. Open the
 // complete occupied entrance visually, retaining its physical collision data.
 if(interior==='a4'&&(role==='fixed-door-reveal'||e.authoredRole==='fixed-door-reveal'||/^South_Access_.*_Upper(?:_primitive\d+)?$/.test(mesh.name)))return true;
 if(interior==='a3'&&/^Dining_Access_.*_Upper(?:_primitive\d+)?$/.test(mesh.name))return true;
 if(e.vttCutaway==='roof')return true;
 if(e.vttCutaway==='wall'){
  // Keep the rear rock at a frontal view. Side/back views still use the
  // existing body-ray controller for the particular obstructing surface.
  return eye.z>.12&&/Carved_Front|Exterior_Edge_Closures/.test(mesh.name);
 }
 if(role!=='wall-upper'&&role!=='wall-shelf')return false;
 const b=mesh.getBoundingInfo().boundingBox,c=b.centerWorld;
 // The small kitchen is a separate cavity joined by the short passage. Its
 // front is north of the dining-room centre and needs its own facing test.
 const inKitchen=interior==='a3'&&focus&&focus.x>=114&&focus.x<=120&&focus.z<55.5;
 const center=interior==='a4'?new Vector3(102,18,57.75):inKitchen||c.z<55&&c.x<120.5?new Vector3(117,18,52.5):new Vector3(121.5,18,59.25);
 const thinX=b.extendSizeWorld.x<b.extendSizeWorld.z;
 const facing=thinX?Math.sign(c.x-center.x)*eye.x:Math.sign(c.z-center.z)*eye.z;
 return facing>.12;
}

/** The original camp's animated scale is expressed before its 72 m offset.
 * Keep the exact authored world transforms and let this scene own visibility.
 * Freezing also allows the camp's shadow cache to settle normally. */
export function keepRetreatCellWallsStable(meshes:Mesh[]){
 const walls=meshes.filter(m=>/^a1:room-\d+:face-/.test(m.name));
 for(const wall of walls)wall.freezeWorldMatrix(wall.computeWorldMatrix(true).clone());
 return walls;
}

/** The original furniture batch also contains the stone entrance jambs and
 * thresholds. Partition its existing material submeshes without changing a
 * single vertex/index, cloning a material or rebuilding canonical furniture. */
export function separateRetreatCellStructure(scene:Scene,meshes:Mesh[]){
 const pairs:{source:Mesh;proxy:Mesh;original:Mesh['subMeshes']}[]=[];
 for(const source of meshes){
  if(!/^a1:room-\d+:furniture$/.test(source.name))continue;
  const stone=(sub:Mesh['subMeshes'][number])=>/cliff|plaza|earth|basalt|stone/.test(sub.getMaterial()?.name??'');
  if(!source.subMeshes.some(stone)||source.subMeshes.every(stone))continue;
  const original=[...source.subMeshes],proxy=source.clone(source.name+':entrance-structure',source.parent,true)!;
  proxy.subMeshes=proxy.subMeshes.filter(stone);source.subMeshes=source.subMeshes.filter(sub=>!stone(sub));
  proxy.metadata={...source.metadata,tokenOccluder:true,retreatCellStructuralProxy:true};proxy.isPickable=false;proxy.checkCollisions=false;
  for(const light of scene.lights)if(light.includedOnlyMeshes.includes(source)&&!light.includedOnlyMeshes.includes(proxy))light.includedOnlyMeshes.push(proxy);
  pairs.push({source,proxy,original});
 }
 // The visible furniture batch belongs to the occupied cell. Its detached
 // stone is the entrance structure, so it must not sit in front of the room.
 function sync(){for(const {proxy} of pairs)proxy.isVisible=false;}
 return {pairs,sync,dispose:()=>{for(const {source,proxy,original} of pairs){if(!source.isDisposed())source.subMeshes=original;if(!proxy.isDisposed())proxy.dispose(false,false);}}};
}

export function retreatOcclusionOpacity(mesh:AbstractMesh){
 if(/^a1:room-\d+:furniture$/.test(mesh.name))return .38;
 const role=extras(mesh).role??extras(mesh.parent as Mesh).role;
 if(/column|statue|shelf|table|lectern|door|winch|pallet/.test(role??''))return .30;
 return .18;
}

/** One owner restores the previous presentation before the existing base,
 * roof and fixture owners update. No collision or game-state fields change. */
export function createRetreatLocalOcclusion(scene:Scene,options:{coherentPrimitives?:boolean}={}){
 const faded=new Map<AbstractMesh,{visibility:number;isVisible:boolean;alphaIndex:number;proxy?:Mesh}>();
 const pendingOpacity=new Map<AbstractMesh,number>();
 const proxies=new Map<AbstractMesh,{mesh:Mesh;used:number}>();
 const materialModes=new Map<Material,number|null>();
 const fadedMaterials=new Set<Material>();
 const actorGroups=new Map<AbstractMesh,number>(),groupSetup={...scene.getAutoClearDepthStencilSetup(1)};
 // Compose the known focus actor after translucent cutaway surfaces while
 // retaining the opaque depth buffer. Walls that remain opaque still occlude.
 scene.setRenderingAutoClearDepthStencil(1,false);
 type Hit={mesh:AbstractMesh;opacity:number};
 const targetCache=new Map<string,{key:string;time:number;hits:Hit[]}>();
 let candidates:AbstractMesh[]=[],meshCount=-1,revision=0;
 const queryIndex=createRetreatOcclusionQueries();
 const stats={rays:0,candidates:0,faded:0,hiddenFurniture:0,instanceProxies:0,instanceProxyPool:0,peakInstanceProxies:0,acceleration:queryIndex.stats};
 function releaseProxy(mesh:Mesh){for(const light of scene.lights){const i=light.includedOnlyMeshes.indexOf(mesh);if(i>=0)light.includedOnlyMeshes.splice(i,1);}mesh.dispose(false,false);}
 function finishFrame(){
  for(const [mesh,opacity] of pendingOpacity)if(!mesh.isDisposed()&&!faded.has(mesh))mesh.visibility=opacity;
  pendingOpacity.clear();
  for(const [material,mode] of materialModes){
   if(fadedMaterials.has(material))continue;
   if(scene.materials.includes(material))material.transparencyMode=mode;
   materialModes.delete(material);
  }
 }
 function setBaseVisibility(mesh:AbstractMesh,opacity:number){
  if(pendingOpacity.has(mesh))pendingOpacity.set(mesh,opacity);
  else mesh.visibility=opacity;
 }
 function restore(keepMaterialModes=false,stableProps?:WeakSet<AbstractMesh>){
  stats.rays=0;
  for(const [mesh,group] of actorGroups)if(!mesh.isDisposed())mesh.renderingGroupId=group;actorGroups.clear();
  for(const [mesh,state] of faded)if(!mesh.isDisposed()){
   if(state.proxy)state.proxy.isVisible=false;
   else if(stableProps?.has(mesh))pendingOpacity.set(mesh,state.visibility);
   else mesh.visibility=state.visibility;
   mesh.isVisible=state.isVisible;mesh.alphaIndex=state.alphaIndex;delete mesh.metadata?.retreatOcclusionOpacity;
  }
  faded.clear();
  fadedMaterials.clear();
  if(!keepMaterialModes)finishFrame();
  // A short-lived cache avoids per-frame cloning and does not accumulate one
  // proxy for every instance encountered over a long exploration session.
  const now=performance.now();for(const [owner,entry] of proxies)if(owner.isDisposed()||now-entry.used>2000){releaseProxy(entry.mesh);proxies.delete(owner);}
 }
 function attenuate(mesh:AbstractMesh,opacity=retreatOcclusionOpacity(mesh)){
  const alreadyFaded=faded.get(mesh);
  const visibility=alreadyFaded?mesh.visibility:pendingOpacity.get(mesh)??mesh.visibility;
  if(!mesh.isEnabled()||!mesh.isVisible||visibility<=.3||mesh.metadata?.permanentBackdrop)return;
  if(!alreadyFaded)faded.set(mesh,{visibility,isVisible:mesh.isVisible,alphaIndex:mesh.alphaIndex});
  // InstancedMesh.visibility delegates to the source and cannot fade one copy.
  // A temporary regular mesh shares its geometry/material and exact matrix;
  // neither the source's opacity nor any neighbouring instance is modified.
  if(mesh instanceof InstancedMesh||mesh instanceof Mesh&&mesh.instances.length>0){
   const source=mesh instanceof InstancedMesh?mesh.sourceMesh:mesh;
   let entry=proxies.get(mesh);
   if(!entry){
    const proxy=source.clone(`retreat:occlusion-proxy:${mesh.uniqueId}`,null,true,false)!;
    proxy.metadata={tokenOccluder:false,retreatOcclusionProxy:true,retreatOcclusionOriginal:mesh.name,retreatOcclusionOwnerId:mesh.uniqueId,decorativeOnly:true};proxy.isPickable=false;proxy.checkCollisions=false;
    entry={mesh:proxy,used:0};proxies.set(mesh,entry);
    for(const light of scene.lights)if(light.includedOnlyMeshes.includes(mesh)&&!light.includedOnlyMeshes.includes(proxy))light.includedOnlyMeshes.push(proxy);
   }
   entry.used=performance.now();entry.mesh.material=source.material;entry.mesh.freezeWorldMatrix(mesh.computeWorldMatrix(true).clone());
   entry.mesh.visibility=faded.get(mesh)!.visibility*opacity;entry.mesh.alphaIndex=2;entry.mesh.isVisible=true;
   faded.get(mesh)!.proxy=entry.mesh;mesh.isVisible=false;
  }else mesh.visibility=faded.get(mesh)!.visibility*opacity;
  // Water uses indices 0/1; character cards retain their existing later order.
  if(!faded.get(mesh)!.proxy)mesh.alphaIndex=2;
  // glTF OPAQUE explicitly ignores per-mesh visibility in Babylon. Automatic
  // mode allows this one faded piece to blend; its unfaded siblings remain
  // opaque. Keep the mode while any piece still needs it; toggling it twice
  // per frame invalidates the shader state of every mesh using the material.
  // The shared material and every texture stay in place; no clones or images.
  if(options.coherentPrimitives){
   const shown=faded.get(mesh)!.proxy??mesh,material=shown.material;
   if(material?.transparencyMode===Material.MATERIAL_OPAQUE){
    materialModes.set(material,material.transparencyMode);
    material.transparencyMode=null;
   }
   if(material&&materialModes.has(material))fadedMaterials.add(material);
  }
  mesh.metadata={...mesh.metadata,retreatOcclusionOpacity:opacity};
 }
 function update(point:Vector3|null,height=1.65,time=0,focusId?:string){
  const camera=scene.activeCamera;if(!point||!camera){targetCache.clear();stats.faded=0;return;}
  if(meshCount!==scene.meshes.length){meshCount=scene.meshes.length;candidates=scene.meshes.filter(m=>m.getTotalVertices()>0&&m.metadata?.tokenOccluder===true&&!m.metadata?.retreatFloor&&!m.metadata?.permanentBackdrop&&!m.metadata?.retreatOcclusionSource);targetCache.clear();}
  const direction=camera.getForwardRay().direction,key=[...point.asArray().map(v=>Math.round(v*20)),Math.round(height*100),...direction.asArray().map(v=>Math.round(v*1000)),revision].join(':');
  const identity=focusId??'focus',entry=targetCache.get(identity);let cached=entry?.hits??[];
  if(!entry||key!==entry.key||time<entry.time||time-entry.time>=.25){
   const hitMeshes=new Set<AbstractMesh>(),rayLayers:AbstractMesh[][]=[],right=Vector3.Cross(direction,Vector3.Up()).normalize();
   // All twelve rays see the same mesh state. Read visibility and bounds once
   // before tracing; attenuate only after every ray has been evaluated.
   const visible=candidates.flatMap(mesh=>{
    const original=faded.get(mesh);
    if(!mesh.isEnabled()||!(original?.isVisible??mesh.isVisible)||(original?.visibility??pendingOpacity.get(mesh)??mesh.visibility)<=.3)return [];
    return [{mesh,box:mesh.getBoundingInfo().boundingBox}];
   });
   for(const offset of [-.22,0,.22])for(const lift of [.08,.4,height*.6,height*.92]){
    const target=point.add(new Vector3(0,lift,0)).add(right.scale(offset)),ray=new Ray(target.subtract(direction.scale(160)),direction,159.97),layers:AbstractMesh[]=[];stats.rays++;
    for(const {mesh,box} of visible){
     if(!ray.intersectsBoxMinMax(box.minimumWorld,box.maximumWorld))continue;
     if(queryIndex.intersects(ray,mesh)){hitMeshes.add(mesh);layers.push(mesh);}
    }
    rayLayers.push(layers);
   }
   // A material primitive can miss the sparse body rays while another part of
   // the same shelf intersects them. Fade that one object's complete material
   // set coherently; books must not stay opaque over the sprite's silhouette.
   // Distinct shelves and instances retain their own presentation.
   const primitiveGroup=(m:AbstractMesh)=>/_primitive\d+$/.test(m.name)?m.name.replace(/_primitive\d+$/,''):null;
   if(options.coherentPrimitives){
    const crossed=new Set([...hitMeshes].map(primitiveGroup).filter((key):key is string=>key!==null));
    for(const {mesh} of visible){
     const key=primitiveGroup(mesh);
     if(key&&crossed.has(key))hitMeshes.add(mesh);
    }
   }
   // A GLB object with six material primitives must not stack six 30% layers
   // over the actor. Allocate the same total opacity across its hit primitives.
   const groups=new Map<string,number>();
   const group=(m:AbstractMesh)=>primitiveGroup(m)??String(m.uniqueId);
   for(const mesh of hitMeshes)groups.set(group(mesh),(groups.get(group(mesh))??0)+1);
   const opacity=new Map([...hitMeshes].map(mesh=>[mesh,1-Math.pow(1-retreatOcclusionOpacity(mesh),1/groups.get(group(mesh))!)]));
   for(const layers of rayLayers){
    if(layers.reduce((t,m)=>t*(1-opacity.get(m)!),1)>=.55)continue;
    const furniture=layers.filter(m=>/^a1:room-\d+:furniture$/.test(m.name)),others=layers.filter(m=>!furniture.includes(m));
    const retained=furniture.reduce((t,m)=>t*(1-opacity.get(m)!),1);
    const cap=others.length?1-Math.pow(Math.min(1,.55/retained),1/others.length):1;
    for(const mesh of others)opacity.set(mesh,Math.min(opacity.get(mesh)!,cap));
   }
   cached=[...opacity].map(([mesh,value])=>({mesh,opacity:value}));
   // The perched birds are separate meshes. Follow the elder's cutaway even
   // when no body ray strikes them, without dimming unrelated temple props.
   const elderFade=cached.find(({mesh})=>/^CANON_Bahamut_Kind_Elder(?:_primitive\d+)?$/.test(mesh.name));
   if(elderFade)for(const {mesh} of visible){
    if(/^CANON_Canary_V3_[1-7]$/.test(mesh.name)&&!opacity.has(mesh))cached.push({mesh,opacity:elderFade.opacity});
   }
   targetCache.set(identity,{key,time,hits:cached});
   if(targetCache.size>40)targetCache.delete(targetCache.keys().next().value!);
  }
  for(const {mesh,opacity} of cached)if(!mesh.isDisposed())attenuate(mesh,opacity);
  stats.candidates=candidates.length;stats.faded=faded.size;stats.instanceProxies=[...faded.values()].filter(s=>s.proxy).length;stats.hiddenFurniture=[...faded.keys()].filter(m=>/^a1:room-\d+:furniture$/.test(m.name)&&!m.isVisible).length;
  stats.instanceProxyPool=proxies.size;stats.peakInstanceProxies=Math.max(stats.peakInstanceProxies,stats.instanceProxies);
  if(focusId)for(const suffix of ['body','blend']){
   const actor=scene.getMeshByName(`actor:${focusId}:${suffix}`);if(!actor)continue;
   if(!actorGroups.has(actor))actorGroups.set(actor,actor.renderingGroupId);actor.renderingGroupId=1;
  }
 }
 return {restore,finishFrame,setBaseVisibility,update,cutaway:(mesh:AbstractMesh,opacity:number)=>{attenuate(mesh,opacity);stats.faded=faded.size;},prepare:()=>queryIndex.prepare(scene.meshes.filter(m=>m.metadata?.tokenOccluder===true&&!m.metadata?.retreatFloor&&!m.metadata?.permanentBackdrop&&!m.metadata?.retreatOcclusionSource)),invalidate:()=>{revision++;},stats,dispose:()=>{restore();queryIndex.dispose();scene.setRenderingAutoClearDepthStencil(1,groupSetup.autoClear,groupSetup.depth,groupSetup.stencil);for(const entry of proxies.values())releaseProxy(entry.mesh);proxies.clear();targetCache.clear();candidates=[];}};
}
