import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S,wreckBeamAt,wreckListHeight } from '../shared/wreck-structure.js';

/** Ship-only finishing: analytic static contact lightmaps (not emissive
 * lighting), world-scale weather/AO plus existing plank/micro-normal maps,
 * restrained physical decals, grading and mip/anisotropic filtering.
 * No screen-space blur pass or per-frame texture generation. */
export function finishWreck(scene:Scene,terrain:TerrainDefinition){
  const size=256,maps=new Map<string,RawTexture>();
  const makeMap=(surface:string)=>{
    const data=new Uint8Array(size*size*4);
    const walls=surface==='main'?terrain.occluders.filter(o=>o.kind==='wall'):[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const wx=x/(size-1)*84,wz=y/(size-1)*48,lx=wx-S.origin.x,lz=wz-S.origin.z;
      let contact=Math.exp(-Math.abs(wreckBeamAt(lx)-Math.abs(lz)-.8)*4)*.22;
      if(surface==='main')for(const wall of walls){const dx=wx-(wall.cell.col+.5)*1.5,dz=wz-(wall.cell.row+.5)*1.5;if(Math.abs(dx)>1.5||Math.abs(dz)>1.5)continue;contact=Math.max(contact,.27*Math.exp(-(dx*dx+dz*dz)*1.8));}
      if(['main','crow'].includes(surface))contact=Math.max(contact,.26*Math.exp(-(lx*lx+lz*lz)*1.6));
      const noise=Math.sin(wx*.34+Math.sin(wz*.19))*Math.cos(wz*.43-wx*.11);
      const fine=Math.sin(wx*4.7+wz*3.1)*.012;
      const shade=Math.max(.59,Math.min(1,.955-contact+noise*.025+fine));
      const i=(y*size+x)*4;data[i]=Math.round(shade*255);data[i+1]=Math.round(shade*255);data[i+2]=Math.round(shade*255);data[i+3]=255;
    }
    const texture=RawTexture.CreateRGBATexture(data,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    texture.name=`wreck:contact-lightmap:${surface}`;texture.coordinatesIndex=1;texture.wrapU=texture.wrapV=Texture.CLAMP_ADDRESSMODE;return texture;
  };
  // UV2 follows world space. Sharing a plank material must not duplicate its
  // contact shadows across all decks or paint a wall's shadow on the cofa.
  const variants=new Map<string,StandardMaterial>();
  for(const mesh of [...scene.meshes]){
    if(!(mesh instanceof Mesh)||!(mesh.material instanceof StandardMaterial)||mesh.name.includes('darkness'))continue;
    const surface=String(mesh.metadata?.deckSurfaceId??mesh.metadata?.surfaceId??mesh.metadata?.address?.surfaceId??'');
    if(!['main','c2','c3','crow','lower-deck','hold-air','c1-hull'].includes(surface))continue;
    const positions=mesh.getVerticesData('position');if(!positions)continue;
    mesh.computeWorldMatrix(true);const matrix=mesh.getWorldMatrix(),uv:number[]=[];
    for(let i=0;i<positions.length;i+=3){const p=Vector3.TransformCoordinates(new Vector3(positions[i]!,positions[i+1]!,positions[i+2]!),matrix);uv.push(p.x/84,p.z/48);}
    mesh.setVerticesData('uv2',uv);
    const original=mesh.material,key=`${original.uniqueId}:${surface}`;
    let m=variants.get(key);if(!m){m=original.clone(`wreck-finish:${original.name}:${surface}`);
      // Babylon clones DynamicTexture without its canvas pixels. Reuse the
      // authored texture objects (especially the C6 inscription) rather than
      // creating an empty, permanently unready copy for every material.
      const copies=m.getActiveTextures(),source=original.getActiveTextures();
      for(const slot of ['diffuseTexture','ambientTexture','bumpTexture','opacityTexture','emissiveTexture','specularTexture','reflectionTexture','refractionTexture','lightmapTexture'] as const)m[slot]=original[slot];
      for(const copy of copies)if(!source.includes(copy))copy.dispose();
      if(!maps.has(surface))maps.set(surface,makeMap(surface));
      m.lightmapTexture=maps.get(surface)!;m.useLightmapAsShadowmap=true;m.emissiveColor=Color3.Black();variants.set(key,m);}
    mesh.material=m;
  }
  const decals:Mesh[]=[],mat=new StandardMaterial('wreck:weathered-decals',scene);
  mat.diffuseColor=Color3.FromHexString('#333b2c');mat.specularColor=Color3.Black();mat.alpha=.15;mat.backFaceCulling=false;mat.zOffset=-1;
  for(const surface of ['main','c2','c3','lower-deck','hold-air']){
    const tiles=terrain.surfaces.find(s=>s.id===surface)?.tiles.filter(t=>t.kind!=='stair')??[],parts:Mesh[]=[];
    for(let i=0;i<tiles.length;i+=13){const t=tiles[i]!,x=(t.cell.col+.5)*1.5,z=(t.cell.row+.5)*1.5,r=.18+(i%5)*.045;
      const m=new Mesh('wreck:salt-and-rot-stain',scene),v=new VertexData(),ns:number[]=[];
      const height=surface==='hold-air'?-6.37:surface==='lower-deck'?t.corners.reduce((a,b)=>a+b)/4+.022:(surface==='main'?0:3)+wreckListHeight(z)+.021;
      v.positions=[x,height,z];v.indices=[];for(let n=0;n<=9;n++){const a=n/9*Math.PI*2,rad=r*(.72+.21*Math.sin(n*2.1+i));v.positions.push(x+Math.cos(a)*rad,height,z+Math.sin(a)*rad*.58);if(n>0)v.indices.push(0,n,n+1);}
      VertexData.ComputeNormals(v.positions,v.indices,ns);v.normals=ns;v.applyToMesh(m);m.material=mat;parts.push(m);
    }
    const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(m){m.name=`wreck:weather-decals:${surface}`;m.isPickable=false;m.receiveShadows=true;m.metadata={visualOnly:true,deckSurfaceId:surface,kind:'weather-decal'};decals.push(m);}
  }
  const curves=new ColorCurves();curves.globalSaturation=-7;curves.highlightsHue=43;curves.highlightsDensity=7;curves.shadowsHue=184;curves.shadowsDensity=5;
  scene.imageProcessingConfiguration.colorCurves=curves;scene.imageProcessingConfiguration.colorCurvesEnabled=true;
  scene.imageProcessingConfiguration.contrast=1.045;scene.imageProcessingConfiguration.exposure=1.015;
  const anisotropy=Math.min(8,scene.getEngine().getCaps().maxAnisotropy??1);
  for(const material of variants.values())for(const texture of material.getActiveTextures()){
    texture.anisotropicFilteringLevel=anisotropy;if(texture instanceof Texture)texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
  }
  return decals;
}
