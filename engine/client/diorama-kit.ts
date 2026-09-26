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
  ambient.groundColor=Color3.FromHexString('#363b40');
  const sun=new DirectionalLight(`camp-key:${id}`,new Vector3(-.45,-1,-.25),scene);
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
    const merged = group.length > 1 ? Mesh.MergeMeshes(group, true, true, undefined, false, false) : group[0];
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
