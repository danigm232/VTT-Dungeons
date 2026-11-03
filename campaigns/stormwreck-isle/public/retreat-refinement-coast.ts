import type {Scene} from '@babylonjs/core/scene.js';
import '@babylonjs/core/Culling/ray.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {Matrix,Quaternion,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {installRetreatContactSurf} from './retreat-contact-surf.js';
import {preserveRetreatDryShore,installRetreatBoatBuoyancy} from './retreat-coastal-presentation.js';

/** Keep the native animated sea below the existing landing, independently of
 * the grid and of the distant decorative water. */
const shoreCache=new WeakMap<Mesh,{world:Matrix;indices:number[];inverse:Matrix}>();
export function keepRetreatLandingDry(sea:Mesh|null){
 if(!sea)return 0;
 const positions=sea.getVerticesData('position');if(!positions)return 0;
 const world=sea.computeWorldMatrix(true);let cache=shoreCache.get(sea);
 const point=new Vector3();
 if(!cache||!cache.world.equals(world)){
  const indices:number[]=[];
  for(let i=0;i<positions.length;i+=3){Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,point);if(point.x>=0&&point.x<=175&&point.z>=43&&point.z<=132)indices.push(i);}
  cache={world:world.clone(),inverse:world.clone().invert(),indices};shoreCache.set(sea,cache);
 }
 let changed=0;
 for(const i of cache.indices){
  Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,point);
  if(point.y<=.08)continue;
  point.y=.08;Vector3.TransformCoordinatesToRef(point,cache.inverse,point);positions[i+1]=point.y;changed++;
 }
 if(changed)sea.updateVerticesData('position',positions);
 return changed;
}

/** Three seaward sides of the existing square. The inland/north edge remains
 * open: this is a skirt around the bay, never new ocean behind the island. */
function maritimeSkirt(scene:Scene,sea:Mesh){
 const source=sea.getVerticesData('position')!,uv=sea.getVerticesData('uv')!;
 const world=sea.computeWorldMatrix(true),points:Vector3[]=[];
 for(let i=0;i<source.length;i+=3)points.push(Vector3.TransformCoordinates(new Vector3(source[i]!,source[i+1]!,source[i+2]!),world));
 const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const ids=points.map((_,i)=>i),west=ids.filter(i=>Math.abs(points[i]!.x-minX)<.001).sort((a,b)=>points[a]!.z-points[b]!.z);
 const south=ids.filter(i=>Math.abs(points[i]!.z-maxZ)<.001&&points[i]!.x>minX+.001).sort((a,b)=>points[a]!.x-points[b]!.x);
 const east=ids.filter(i=>Math.abs(points[i]!.x-maxX)<.001&&points[i]!.z<maxZ-.001).sort((a,b)=>points[b]!.z-points[a]!.z);
 const edge=[...west,...south,...east],bands=[-6,0,32,256,8192],count=edge.length;
 const centerX=(minX+maxX)/2,centerZ=(minZ+maxZ)/2,halfX=(maxX-minX)/2,halfZ=(maxZ-minZ)/2;
 const left=ids.find(i=>Math.abs(points[i]!.x-minX)<.001)!,right=ids.find(i=>Math.abs(points[i]!.x-maxX)<.001)!;
 const north=ids.find(i=>Math.abs(points[i]!.z-minZ)<.001)!,bottom=ids.find(i=>Math.abs(points[i]!.z-maxZ)<.001)!;
 const du=(uv[right*2]!-uv[left*2]!)/(maxX-minX),dv=(uv[bottom*2+1]!-uv[north*2+1]!)/(maxZ-minZ);
 const positions=new Float32Array(count*bands.length*3),normals=new Float32Array(positions.length),colors=new Float32Array(count*bands.length*4),uvs:number[]=[],indices:number[]=[];
 for(const distance of bands)for(const id of edge){
  const p=points[id]!,x=p.x+(p.x-centerX)/halfX*distance,z=p.z+(p.z-centerZ)/halfZ*distance;
  uvs.push(uv[id*2]!+(x-p.x)*du,uv[id*2+1]!+(z-p.z)*dv);
 }
 for(let row=0;row<bands.length-1;row++)for(let col=0;col<count-1;col++){
  const a=row*count+col,b=a+1,d=a+count+1,e=a+count;indices.push(a,b,e,b,d,e);
 }
 const mesh=new Mesh('retreat:bay-maritime-skirt',scene),data=new VertexData();
 data.positions=positions;data.normals=normals;data.colors=colors;data.uvs=uvs;data.indices=indices;data.applyToMesh(mesh,true);
 mesh.material=sea.material;mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=false;mesh.hasVertexAlpha=true;
 mesh.alphaIndex=0;
 mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,tokenOccluder:false,retreatFloor:false,stoneShadowCaster:false,permanentBackdrop:true,effect:'existing-sea-perimeter-extension',inlandEdgeOpen:true};
 const point=new Vector3(),normal=new Vector3(),baseY=world.getTranslation().y,mean=[.23,.43,.57];
 const fades=bands.map(distance=>distance>512?0:Math.exp(-Math.max(0,distance)/64));
 let previousEdgeHeight=NaN,initialized=false;
 function update(){
  if(!mesh.isEnabled())return;
  const current=sea.getVerticesData('position')!,sourceColors=sea.getVerticesData('color'),sourceNormals=sea.getVerticesData('normal');
  // The native ocean updates geometry at 24 Hz. Reuse that exact cadence and
  // transform each source edge vertex once, rather than once per skirt band.
  const height=current[edge[0]!*3+1]!;if(height===previousEdgeHeight)return;previousEdgeHeight=height;
  for(let col=0;col<count;col++){
   const id=edge[col]!;
   Vector3.TransformCoordinatesFromFloatsToRef(current[id*3]!,current[id*3+1]!,current[id*3+2]!,world,point);
   normal.set(sourceNormals?.[id*3]??0,sourceNormals?.[id*3+1]??1,sourceNormals?.[id*3+2]??0);Vector3.TransformNormalToRef(normal,world,normal);normal.normalize();
   for(let row=0;row<bands.length;row++){
   const distance=bands[row]!,vertex=row*count+col,at=vertex*3,ci=vertex*4,fade=fades[row]!;
   if(initialized&&fade===0)continue;
   positions[at]=point.x+(point.x-centerX)/halfX*distance;positions[at+2]=point.z+(point.z-centerZ)/halfZ*distance;
   positions[at+1]=baseY+(point.y-baseY)*fade-(distance<0?.35:0);
   normals[at]=normal.x*fade;normals[at+1]=1+(normal.y-1)*fade;normals[at+2]=normal.z*fade;
   for(let k=0;k<3;k++){const color=mean[k]!;colors[ci+k]=color+((sourceColors?.[id*4+k]??color)-color)*fade;}colors[ci+3]=1;
   }
  }
  initialized=true;
  mesh.updateVerticesData('position',positions);mesh.updateVerticesData('normal',normals);mesh.updateVerticesData('color',colors);
 }
 update();mesh.refreshBoundingInfo();
 return {mesh,update};
}

export function refineRetreatCoast(scene:Scene,polished=false,revisionStage=0){
 const sea=scene.getMeshByName('a1:bay-background') as Mesh|null;
 // The small original A2 placeholder painted a flat cyan rectangle on top
 // of the live bay. The same native animated water already covers this inlet.
 if(revisionStage>=6&&sea)scene.getMeshByName('VTT_Coastal_Water')?.setEnabled(false);
 if(sea?.material instanceof StandardMaterial){sea.material.specularPower=polished?128:96;sea.material.useSpecularOverAlpha=false;}
 const sky=scene.getMeshByName('P7_Maritime_Sky_Dome') as Mesh|null;
 scene.getMeshByName('P7_Extended_Existing_Sea')?.setEnabled(false);
 // These four provisional cones are not canonical regional geography. At low
 // angles they fill the sky with enormous triangular faces. Keep their source
 // meshes for E1, outside the current render and without touching playable land.
 for(const mesh of scene.meshes)if(mesh.name.startsWith('Scenic_L5_Distant_')){
  mesh.setEnabled(false);mesh.metadata={...mesh.metadata,retreatSuppressedPlaceholder:true};
 }
 if(sky){
  // Babylon applies infiniteDistance only to a root node. A frozen child of
  // the mirrored GLB root stayed at (90,0,78), exposing its white underside.
  sky.unfreezeWorldMatrix();sky.parent=null;sky.position.setAll(0);sky.rotationQuaternion=Quaternion.Identity();sky.scaling.setAll(12);sky.infiniteDistance=true;
  sky.metadata={...sky.metadata,content:'VTT_AMBIENCE',decorativeOnly:true,tokenOccluder:false,retreatFloor:false,permanentBackdrop:true};
  sky.isPickable=false;sky.checkCollisions=false;sky.receiveShadows=false;sky.hasVertexAlpha=false;sky.useVertexColors=true;
  const vertices=sky.getVerticesData('position')!,colors=new Float32Array(vertices.length/3*4);
  // Restore the same subdued gradient authored in refine_environment.py.
  for(let i=0;i<vertices.length;i+=3){const x=vertices[i]!,y=vertices[i+1]!,z=vertices[i+2]!,t=Math.max(0,Math.min(1,y/480)),cloud=.022*Math.sin(x*.025+z*.009)*Math.sin(z*.018),j=i/3*4;
   colors[j]=.39-.17*t+cloud;colors[j+1]=.52-.19*t+cloud;colors[j+2]=.59-.18*t+cloud;colors[j+3]=1;
   if(polished){const field=.5+.28*Math.sin(x*.018+Math.sin(z*.011)*1.2)+.22*Math.cos(z*.019-y*.013),f=Math.max(0,Math.min(1,(field-.47)/.29)),cover=f*f*(3-2*f)*(.28+.42*t);colors[j]=(.42-.22*t)*(1-cover)+(.69-.11*t)*cover;colors[j+1]=(.55-.28*t)*(1-cover)+(.72-.10*t)*cover;colors[j+2]=(.61-.24*t)*(1-cover)+(.71-.08*t)*cover;}
  }
  sky.setVerticesData('color',colors);
  const mat=new StandardMaterial('retreat:maritime-sky',scene);mat.disableLighting=true;mat.emissiveColor=Color3.White();mat.diffuseColor=Color3.Black();mat.backFaceCulling=false;mat.disableDepthWrite=true;sky.material=mat;
 }
 const skirt=sea?maritimeSkirt(scene,sea):null;
 const surf=polished&&sea?installRetreatContactSurf(scene,sea):null;
 const boat=revisionStage>=4&&sea?installRetreatBoatBuoyancy(scene,sea,revisionStage>=6):null;
 if(sea){sea.hasVertexAlpha=true;sea.alphaIndex=1;}
 let lastFade='';const fadePoint=new Vector3();
 function fadeDistantWater(){
  const camera=scene.activeCamera;if(!camera||!sea||!sea.hasVertexAlpha)return;
  camera.getViewMatrix(true);const eye=camera.globalPosition,direction=camera.getForwardRay().direction,source=sea.getVerticesData('position');
  const key=[source?.[1],eye.x,eye.y,eye.z,direction.x,direction.y,direction.z].join(':');if(key===lastFade)return;lastFade=key;
  for(const mesh of [sea,skirt?.mesh]){if(!mesh)continue;const positions=mesh.getVerticesData('position'),colors=mesh.getVerticesData('color');if(!positions||!colors)continue;const world=mesh.computeWorldMatrix(true);
   for(let i=0;i<positions.length;i+=3){
    Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,fadePoint);
    const local=fadePoint.x>=0&&fadePoint.x<=175&&fadePoint.z>=43&&fadePoint.z<=132;
    const depth=(fadePoint.x-eye.x)*direction.x+(fadePoint.y-eye.y)*direction.y+(fadePoint.z-eye.z)*direction.z;
    const seaBounds=sea.getBoundingInfo().boundingBox,margin=mesh===sea?0:Math.max(seaBounds.minimumWorld.x-fadePoint.x,0,fadePoint.x-seaBounds.maximumWorld.x,seaBounds.minimumWorld.z-fadePoint.z,fadePoint.z-seaBounds.maximumWorld.z);
    const t=revisionStage>=4&&(mesh===sea||margin<32)?0:local?0:Math.max(0,Math.min(1,(depth-260)/140));colors[i/3*4+3]=1-t*t*(3-2*t);
   }
   mesh.updateVerticesData('color',colors);
  }
 }
 const span=sea?Math.round(sea.getBoundingInfo().boundingBox.extendSizeWorld.x*2):0;
 return {update(_time:number){
  // The existing camp shadow owner refreshes receiveShadows on newly added
  // meshes. Distant water must stay out of both casting and receiving shadows.
  if(skirt)skirt.mesh.receiveShadows=false;
  if(sky)sky.receiveShadows=false;
  if(sea&&revisionStage>=4)preserveRetreatDryShore(sea);else keepRetreatLandingDry(sea);skirt?.update();surf?.update(_time);boat?.update(_time);fadeDistantWater();
  if(sky?.material instanceof StandardMaterial){const day=Math.max(0,Math.min(1,(scene.clearColor.r-.035)/.19));sky.material.emissiveColor.set(.10+.90*day,.17+.83*day,.28+.72*day);}
 },stats:{expandedPlayableArea:false,seaSpanMeters:span,distantSeaAddedMeshes:skirt?1:0,inlandOceanAdded:false,skyReused:Boolean(sky),skyRadiusMeters:5760,landingWaterCeilingMeters:.08,distanceFadeOnlyWater:true,polished,contactSurf:surf?.stats??null,newTextures:0,newLights:0,newReflectionPasses:0}};
}
