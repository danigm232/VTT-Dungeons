import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';

/** Rounded, weathered crags with local variation and meter-based texture scale. */
export function organicStone(scene: Scene, name: string, width: number, height: number, depth: number, seed: number) {
  const mesh = MeshBuilder.CreateIcoSphere(name, { radius: 1, subdivisions: 3, flat: false }, scene);
  const positions = mesh.getVerticesData('position')!, indices = mesh.getIndices()!;
  for (let i = 0; i < positions.length; i += 3) {
    const x=positions[i]!, y=positions[i+1]!, z=positions[i+2]!;
    const swell=1+.085*Math.sin(x*5+y*3+seed)+.06*Math.cos(z*7-x*4+seed*.71);
    positions[i]=x*width*.5*swell+y*width*.035;
    positions[i+1]=y*height*.5*swell+.035*height*Math.sin(z*6+seed);
    positions[i+2]=z*depth*.5*swell+y*depth*.025;
  }
  mesh.setVerticesData('position',positions);
  const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);
  // Icospheres duplicate vertices at UV seams. Recomputing their normals after
  // deformation otherwise makes every triangle look like a separate flat face.
  const shared=new Map<string,Vector3>();
  const vertexKey=(i:number)=>[positions[i]!,positions[i+1]!,positions[i+2]!].map(v=>Math.round(v*100000)).join(',');
  for(let i=0;i<positions.length;i+=3){const key=vertexKey(i),sum=shared.get(key)??Vector3.Zero();sum.addInPlace(Vector3.FromArray(normals,i));shared.set(key,sum);}
  for(let i=0;i<positions.length;i+=3){const n=shared.get(vertexKey(i))!.normalizeToNew();normals[i]=n.x;normals[i+1]=n.y;normals[i+2]=n.z;}
  mesh.setVerticesData('normal',normals);
  // Choose one projection for each triangle, avoiding stretched UVs when a
  // curved face's vertex normals cross different dominant axes.
  const uvs=new Array<number>(positions.length/3*2).fill(0);
  for(let i=0;i<indices.length;i+=3){
    const a=Vector3.FromArray(positions,indices[i]!*3),b=Vector3.FromArray(positions,indices[i+1]!*3),c=Vector3.FromArray(positions,indices[i+2]!*3),n=Vector3.Cross(b.subtract(a),c.subtract(a));
    const horizontal=Math.abs(n.y)>Math.abs(n.x)&&Math.abs(n.y)>Math.abs(n.z),side=Math.abs(n.x)>Math.abs(n.z);
    for(const index of [indices[i]!,indices[i+1]!,indices[i+2]!]){const p=Vector3.FromArray(positions,index*3);uvs[index*2]=(horizontal?p.x:side?p.z:p.x)/2.8;uvs[index*2+1]=(horizontal?p.z:p.y)/2.8;}
  }
  mesh.setVerticesData('uv',uvs);
  return mesh;
}

/** Fractured, bevelled strata with face-local UVs: no axis switching inside a triangle. */
export function fracturedStone(scene:Scene,name:string,width:number,height:number,depth:number,seed:number) {
  const outline=[[-.34,-.5],[.31,-.5],[.5,-.29],[.5,.32],[.3,.5],[-.32,.5],[-.5,.28],[-.5,-.3]];
  const rings:number[][][]=[];
  for(let r=0;r<4;r++){
    const scale=[.8,1,.91,.67][r]!,y=[-.5,-.36,.34,.5][r]!;
    rings.push(outline.map(([x,z],i)=>[
      (x!*scale+y*.14*Math.sin(seed)+Math.sin(seed*3+i*7)*.065)*width,
      (y+Math.sin(seed+i*1.8)*.075)*height,
      (z!*scale+y*.18+Math.cos(seed*2+i*3)*.06)*depth
    ]));
  }
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[],colors:number[]=[],normals:number[]=[];
  function triangle(a:number[],b:number[],c:number[]){
    const n=Vector3.Cross(Vector3.FromArray(b).subtract(Vector3.FromArray(a)),Vector3.FromArray(c).subtract(Vector3.FromArray(a)));
    const ny=Math.abs(n.y),nx=Math.abs(n.x),nz=Math.abs(n.z),base=positions.length/3;
    for(const p of [a,b,c]){
      positions.push(...p);
      uvs.push((ny>nx&&ny>nz?p[0]!:nx>nz?p[2]!:p[0]!)/3+seed*.17,(ny>nx&&ny>nz?p[2]!:p[1]!)/3);
      const tint=.82+.12*(p[1]!/height+.5)+Math.sin(seed*2.3)*.06;
      colors.push(tint,tint*.995,tint*.965,1);
    }
    // Babylon's default left-handed winding is clockwise from the outside.
    indices.push(base,base+2,base+1);
  }
  for(let r=0;r<3;r++)for(let i=0;i<8;i++){
    const j=(i+1)%8;triangle(rings[r]![i]!,rings[r+1]![i]!,rings[r+1]![j]!);triangle(rings[r]![i]!,rings[r+1]![j]!,rings[r]![j]!);
  }
  for(let i=1;i<7;i++){triangle(rings[3]![0]!,rings[3]![i+1]!,rings[3]![i]!);triangle(rings[0]![0]!,rings[0]![i]!,rings[0]![i+1]!);}
  VertexData.ComputeNormals(positions,indices,normals);
  // Partially blend normals at the bevels; broad faces remain legible without crystal-sharp edges.
  const shared=new Map<string,Vector3>();
  for(let i=0;i<positions.length;i+=3){
    const key=positions.slice(i,i+3).join(','),sum=shared.get(key)??Vector3.Zero();
    sum.addInPlace(Vector3.FromArray(normals,i));shared.set(key,sum);
  }
  for(let i=0;i<positions.length;i+=3){
    const average=shared.get(positions.slice(i,i+3).join(','))!.normalizeToNew();
    const mixed=Vector3.Lerp(Vector3.FromArray(normals,i),average,.45).normalize();
    normals[i]=mixed.x;normals[i+1]=mixed.y;normals[i+2]=mixed.z;
  }
  const mesh=new Mesh(name,scene),data=new VertexData();Object.assign(data,{positions,indices,normals,uvs,colors});data.applyToMesh(mesh);
  return mesh;
}

/** Soft painted AO and lamp bounce, shared by the low-cost contact planes. */
export function softPoolMaterial(scene:Scene,id:string,tint:string,opacity:number) {
  const material=illustratedMaterial(scene,id,tint);
  material.alpha=opacity;material.disableLighting=true;material.backFaceCulling=false;
  if(typeof document!=='undefined') {
    const texture=new DynamicTexture(id+':falloff',{width:64,height:64},scene,false);
    const ctx=texture.getContext(),gradient=ctx.createRadialGradient(32,32,2,32,32,31);
    gradient.addColorStop(0,'rgba(255,255,255,.9)');gradient.addColorStop(.5,'rgba(255,255,255,.4)');gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.clearRect(0,0,64,64);ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);texture.hasAlpha=true;texture.update();
    material.diffuseTexture=texture;material.useAlphaFromDiffuseTexture=true;
  }
  return material;
}

/** Meter-based UVs prevent long floors from stretching a square illustration. */
export function worldSurfaceUV(mesh: Mesh, meters: number) {
  const positions=mesh.getVerticesData('position'), normals=mesh.getVerticesData('normal');
  if(!positions || !normals)return;
  const matrix=mesh.computeWorldMatrix(true),uv:number[]=[];
  for(let i=0;i<positions.length;i+=3){
    const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),matrix);
    const ny=Math.abs(normals[i+1]!),nx=Math.abs(normals[i]!);
    uv.push((ny>.5?p.x:nx>.5?p.z:p.x)/meters,(ny>.5?p.z:p.y)/meters);
  }
  mesh.setVerticesData('uv',uv);
}

export function createRestLighting(scene:Scene,id:string) {
  const ambient=new HemisphericLight(`camp-ambient:${id}`,new Vector3(.15,1,.2),scene);
  ambient.renderPriority=100;
  ambient.groundColor=Color3.FromHexString('#363b40');
  const sun=new DirectionalLight(`camp-key:${id}`,new Vector3(-.45,-1,-.25),scene);
  sun.renderPriority=90;
  sun.position.set(44,35,22);
  // Frame the playable A1 terrace rather than the much wider coastal background.
  sun.shadowFrustumSize=66;
  return {ambient,sun,update(dark:number){
    const day=1-dark;
    ambient.intensity=.53+day*.18;
    ambient.diffuse=Color3.Lerp(Color3.FromHexString('#7c9fc9'),Color3.FromHexString('#e3e3d4'),day);
    sun.intensity=.26+day*.47;
    sun.diffuse=Color3.Lerp(Color3.FromHexString('#779cdb'),Color3.FromHexString('#ffe1b3'),day);
  }};
}

/** Illustrated materials on world geometry: no camera-fixed scenery or baked map. */
export function illustratedMaterial(scene: Scene, name: string, tint: string, url?: string, repeat = 1) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(tint);
  material.specularColor = Color3.FromHexString('#131619');
  material.maxSimultaneousLights = 4;
  if (url && typeof document !== 'undefined') {
    const texture = new Texture(url, scene);
    texture.uScale = texture.vScale = repeat;
    texture.anisotropicFilteringLevel = 4;
    material.diffuseTexture = texture;
  }
  return material;
}

/** Keep batches separate by cutaway face, so visibility remains camera dependent. */
export function mergeDecoration(scene: Scene, root: TransformNode, meshes: Mesh[], name: string, freeze = false) {
  const groups = new Map<StandardMaterial, Mesh[]>();
  for (const mesh of meshes) {
    if (!(mesh.material instanceof StandardMaterial)) continue;
    const group = groups.get(mesh.material) ?? []; group.push(mesh); groups.set(mesh.material, group);
  }
  const result: Mesh[] = [];
  for (const [material, group] of groups) {
    // Colored rock variants can share a draw batch with neutral architectural pieces.
    if(group.some(mesh=>mesh.isVerticesDataPresent('color'))) {
      for(const mesh of group)if(!mesh.isVerticesDataPresent('color'))mesh.setVerticesData('color',new Float32Array(mesh.getTotalVertices()*4).fill(1));
    }
    // Bake even a single mesh into world coordinates. Otherwise scaling a cutaway
    // face leaves its lone coping floating at the original local Y position.
    const merged = Mesh.MergeMeshes(group, true, true, undefined, false, false);
    if (!merged) continue;
    merged.name = `${name}:${material.name}`; merged.parent = root; merged.isPickable = false;
    merged.checkCollisions = false; merged.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true };
    if(freeze)merged.freezeWorldMatrix();
    result.push(merged);
  }
  return result;
}

/** Smoothly collapse camera-facing walls, preserving a readable low stone edge. */
export function updateCutaway(meshes: Mesh[], facing: number, delta: number) {
  const target = facing > .18 ? .035 : 1;
  for (const mesh of meshes) mesh.scaling.y += (target - mesh.scaling.y) * Math.min(1, delta * 10);
}
