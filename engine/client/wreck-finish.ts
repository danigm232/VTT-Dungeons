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
    const contactMask=new Float32Array(size*size);
    const stamp=(x:number,z:number,halfX:number,halfZ:number,falloff:number,strength:number)=>{
      const minX=Math.max(0,Math.floor((x-halfX-falloff)/84*(size-1))),maxX=Math.min(size-1,Math.ceil((x+halfX+falloff)/84*(size-1)));
      const minZ=Math.max(0,Math.floor((z-halfZ-falloff)/48*(size-1))),maxZ=Math.min(size-1,Math.ceil((z+halfZ+falloff)/48*(size-1)));
      for(let row=minZ;row<=maxZ;row++)for(let col=minX;col<=maxX;col++){
        const dx=Math.max(0,Math.abs(col/(size-1)*84-x)-halfX),dz=Math.max(0,Math.abs(row/(size-1)*48-z)-halfZ);
        const t=Math.max(0,1-Math.hypot(dx,dz)/falloff),i=row*size+col;
        contactMask[i]=Math.max(contactMask[i]!,strength*t*t*(3-2*t));
      }
    };
    if(surface==='main'){
      for(const wall of terrain.occluders)if(wall.kind==='wall'){
        const alongZ=wall.axis==='z';
        stamp((wall.cell.col+.5)*S.tileMeters,(wall.cell.row+.5)*S.tileMeters,alongZ?.09:.75,alongZ?.75:.09,.74,.34);
      }
      const mast=terrain.occluders.find(o=>o.id==='c1-mast');
      if(mast)stamp((mast.cell.col+.5)*S.tileMeters,(mast.cell.row+.5)*S.tileMeters,.32,.32,1.15,.39);
    }
    for(const fixture of terrain.structures??[]){
      const x=(fixture.cell.col+.5)*S.tileMeters,z=(fixture.cell.row+.5)*S.tileMeters;
      if(fixture.kind==='hatch'&&surface==='main'&&fixture.id!=='c4-shaft')stamp(x,z,.61,.61,.65,.32);
      if(fixture.kind==='stair'&&surface===((fixture.baseHeight??0)<-.2?'lower-deck':'main')){
        const axisX=fixture.direction==='east'||fixture.direction==='west';
        const run=fixture.runCells*S.tileMeters;
        const sign=fixture.direction==='east'||fixture.direction==='south'?1:-1;
        for(const side of [-.72,.72]){
          stamp(x+(axisX?sign*(run-S.tileMeters)/2:side),z+(axisX?side:sign*(run-S.tileMeters)/2),
            axisX?run/2:.08,axisX?.08:run/2,.56,.29);
        }
      }
    }
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const wx=x/(size-1)*84,wz=y/(size-1)*48,lx=wx-S.origin.x,lz=wz-S.origin.z;
      const inside=surface==='lower-deck'?.87:surface==='hold-air'?1.25:0;
      const beamDistance=Math.abs(wreckBeamAt(lx)-Math.abs(lz)-inside);
      const edge=surface==='c1-hull'?0:surface==='crow'?.33*Math.exp(-Math.abs(Math.hypot(lx,lz)-2.63)*3.8)
        :Math.exp(-beamDistance*(inside?2.6:3.8))*(inside?.38:.24);
      const contact=Math.max(edge,contactMask[y*size+x]!);
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
