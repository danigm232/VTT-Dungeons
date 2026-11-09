import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';

// The visible corner joins the existing meadow edge to the upper stone walk.
// It is visual terrain; only the pre-existing upper-surface cells are playable.
const MEADOW_EDGE:readonly [number,number][]=[[131.2,60.15],[136,63.86],[139.55,64.42],[131.15,64.53]];

function makeMesh(scene:Scene,name:string,positions:number[],indices:number[],material:NonNullable<Mesh['material']>,metadata:Record<string,unknown>,uvs?:number[]){
 const mesh=new Mesh(name,scene),normals:number[]=[];
 VertexData.ComputeNormals(positions,indices,normals);
 const data=new VertexData();Object.assign(data,{positions,indices,normals,...uvs?{uvs}:{}});data.applyToMesh(mesh);
 mesh.material=material;mesh.metadata=metadata;mesh.checkCollisions=false;mesh.receiveShadows=true;
 return mesh;
}
function source(scene:Scene,name:string){
 const mesh=scene.getMeshByName(name);
 if(!(mesh instanceof Mesh)||!mesh.material)throw Error(`Retiro: no se encuentra ${name}`);
 return mesh;
}
function inside(x:number,z:number){
 let result=false;
 for(let i=0,j=MEADOW_EDGE.length-1;i<MEADOW_EDGE.length;j=i++){
  const [a,b]=MEADOW_EDGE[i]!,[c,d]=MEADOW_EDGE[j]!;
  if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)result=!result;
 }
 return result;
}
function meadow(scene:Scene){
 const soil=source(scene,'R3_Expedition_Soil_R3_Meadow_Base'),dark=source(scene,'R3_Expedition_Meadow_R3_Grass'),light=source(scene,'R3_Expedition_Meadow_R3_Grass_Light');
 const cream=source(scene,'R3_Expedition_Meadow_R3_Flower_Cream'),lavender=source(scene,'R3_Expedition_Meadow_R3_Lavender');
 const metadata={content:'VTT_AMBIENCE',decorativeOnly:true,refinementPhase:8,retreatFloor:true,tokenOccluder:false,retreatExpeditionSeam:'meadow'};
 const positions=MEADOW_EDGE.flatMap(([x,z])=>[x,18.004,z]),uvs=MEADOW_EDGE.flatMap(([x,z])=>[x/2.7,1-z/2.7]);
 const ground=makeMesh(scene,'retreat:expedition-meadow-edge',positions,[1,3,2,1,0,3],soil.material!,metadata,uvs);
 ground.isPickable=true;
 // Batched blades use the same geometry scale and materials as the existing
 // meadow, with a fixed seed and no props or collision bodies on the walk.
 let seed=11082026;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000);
 const blades=[{p:[] as number[],i:[] as number[],colors:[] as number[],material:dark.material!,name:'retreat:expedition-edge-grass'},
  {p:[] as number[],i:[] as number[],colors:[] as number[],material:light.material!,name:'retreat:expedition-edge-grass-light'}];
 const flowers=[{p:[] as number[],i:[] as number[],colors:[] as number[],material:cream.material!,name:'retreat:expedition-edge-cream'},
  {p:[] as number[],i:[] as number[],colors:[] as number[],material:lavender.material!,name:'retreat:expedition-edge-lavender'}];
 let placed=0,attempts=0;
 while(placed<380&&attempts++<10000){
  const x=131.2+8.35*random(),z=60.15+4.38*random();if(!inside(x,z))continue;
  // The delivered meadow uses this same grouped height/tint field.
  const field=.5+.30*Math.sin(x*1.30+Math.sin(z*.70))+.20*Math.cos(z*1.60-x*.42),density=Math.max(0,Math.min(1,(field-.32)/.42));
  const h=(.09+.20*random())*(.30+.70*density),tint=.84+.16*density,angle=random()*Math.PI*2,batch=blades[placed%3===0?1:0]!;
  for(let j=0;j<3;j++){
   const a=angle+j*2.1,dx=Math.cos(a),dz=Math.sin(a),w=.025,k=batch.p.length/3;
   batch.p.push(x-dz*w,18.018,z+dx*w,x+dz*w,18.018,z-dx*w,x+dx*h*.24,18.018+h,z+dz*h*.24);
   for(let v=0;v<3;v++)batch.colors.push(tint,tint,tint,1);
   batch.i.push(k,k+1,k+2,k+2,k+1,k);
  }
  if(placed%19===0){
   const flower=flowers[placed%2]!,k=flower.p.length/3,y=18.018+h;
   flower.p.push(x-.035,y,z,x+.035,y,z,x,y+.05,z,x,y,z-.035,x,y,z+.035,x,y+.05,z);
   flower.i.push(k,k+1,k+2,k+2,k+1,k,k+3,k+4,k+5,k+5,k+4,k+3);
  }
  placed++;
 }
 if(placed!==380)throw Error('Retiro: no se pudo completar el césped');
 const decorations=[...blades,...flowers].map(batch=>{
  const mesh=makeMesh(scene,batch.name,batch.p,batch.i,batch.material,{...metadata,retreatFloor:false,retreatExpeditionSeam:'grass'});
  // Every blade is intentionally double-sided. Computing normals from both
  // opposing windings cancels them to zero and renders the grass almost black.
  const normals:number[]=[];for(let i=0;i<batch.p.length;i+=3)normals.push(0,1,0);
  mesh.setVerticesData('normal',normals);
  if(batch.colors.length){mesh.setVerticesData('color',batch.colors);mesh.useVertexColors=true;mesh.hasVertexAlpha=false;}
  mesh.isPickable=false;return mesh;
 });
 return [ground,...decorations];
}

/** Join the existing A3 façade and side to the cave crown. The surface is
 * recessed at the existing sconce so its flame remains in front of the rock. */
function caveCorner(scene:Scene){
 const original=source(scene,'Stone_P3_Sculpted_Carved_Front_2');
 const xs=[128.82,129.05,129.4,129.75,130.05,130.35,130.7,131.05,131.3];
 const ys=[17.96,18.5,19.1,19.5,20.1,20.55,21.15,21.8,22.35,22.9];
 const positions:number[]=[],indices:number[]=[],uvs:number[]=[];
 for(let ix=0;ix<xs.length;ix++)for(let iy=0;iy<ys.length;iy++){
  const x=xs[ix]!,y=ys[iy]!,left=Math.max(0,(129.45-x)/.63),right=Math.max(0,(x-130.6)/.7);
  let z=63.25+.50*left+.76*right+.055*Math.sin(ix*2.12+iy*1.47);
  if(x>=130.05&&x<=130.35&&y>=19.1&&y<=20.55)z=Math.min(z,63.33);
  positions.push(x,y,z);uvs.push(x/3.3,y/3.3);
 }
 for(let ix=0;ix<xs.length-1;ix++)for(let iy=0;iy<ys.length-1;iy++){
  const a=ix*ys.length+iy,b=(ix+1)*ys.length+iy;
  indices.push(a,b,a+1,a+1,b,b+1);
 }
 // Close the shallow sides and cap into the original wall; no path or doorway
 // is covered and the original source remains in the scene.
 const add=(x:number,y:number,z:number,u:number,v:number)=>{const i=positions.length/3;positions.push(x,y,z);uvs.push(u,v);return i;};
 for(const ix of [0,xs.length-1])for(let iy=0;iy<ys.length-1;iy++){
  const first=ix*ys.length+iy,second=first+1,z0=positions[first*3+2]!,z1=positions[second*3+2]!,x=xs[ix]!,y0=ys[iy]!,y1=ys[iy+1]!;
  const a=add(x,y0,z0,z0/3.3,y0/3.3),b=add(x,y1,z1,z1/3.3,y1/3.3),c=add(x,y0,62.96,62.96/3.3,y0/3.3),d=add(x,y1,62.96,62.96/3.3,y1/3.3);
  indices.push(a,b,c,b,d,c);
 }
 for(let ix=0;ix<xs.length-1;ix++)for(const iy of [0,ys.length-1]){
  const first=ix*ys.length+iy,second=(ix+1)*ys.length+iy,x0=xs[ix]!,x1=xs[ix+1]!,y=ys[iy]!,z0=positions[first*3+2]!,z1=positions[second*3+2]!;
  const a=add(x0,y,z0,x0/3.3,z0/3.3),b=add(x1,y,z1,x1/3.3,z1/3.3),c=add(x0,y,62.96,x0/3.3,62.96/3.3),d=add(x1,y,62.96,x1/3.3,62.96/3.3);
  indices.push(a,c,b,b,c,d);
 }
 const e=original.metadata?.gltf?.extras??{};
 const metadata={...original.metadata,content:'VTT_AMBIENCE',retreatZone:'a3',retreatFloor:false,tokenOccluder:true,stoneShadowCaster:false,
  gltf:{...original.metadata?.gltf,extras:{...e,vttInterior:'a3',vttCutaway:'wall',role:'context-rock'}}};
 // Separate vertices allow one stable projection on each face instead of
 // switching projections inside a triangle and stretching the stone at corners.
 const mesh=makeMesh(scene,'Stone_P3_Sculpted_Carved_Front_A3_Seam',positions,indices,original.material!,metadata,uvs);
 mesh.isPickable=true;return mesh;
}

/** Small local additions; existing walkability, light and room geometry stay. */
export function installRetreatExpeditionSeams(scene:Scene){
 return {meshes:[...meadow(scene),caveCorner(scene)]};
}
