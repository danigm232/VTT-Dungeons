import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Plane } from '@babylonjs/core/Maths/math.plane.js';
import { Frustum } from '@babylonjs/core/Maths/math.frustum.js';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Mesh as MeshBuilderMesh, type Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S, wreckBeamAt } from '../shared/wreck-structure.js';
import { fracturedStone } from './diorama-kit.js';
import { buildDragonRemains,buildDistantDragonBones } from './wreck-dragon-bones.js';
import { buildWreckScenicDepth } from './wreck-scenic-depth.js';
import { buildWreckOceanGrid } from './wreck-ocean-grid.js';
import { wreckReflectionCandidates, WreckReflectionCadence } from './wreck-reflections.js';
import { buildWreckWaterContact, sliceWreckWaterline, wreckBeamGLSL, wreckSideBreachEnd, wreckWaterlineBeam, wreckWaveGLSL, type WaterPoint } from './wreck-water-contact.js';

/** Jagged marine stacks, not bevelled rectangular blocks. UVs belong to each
 * face and their stratum tint changes with height; gameplay clips the final
 * footprint to the authored blocked reef cells below. */
function reefStack(scene:Scene,name:string,width:number,height:number,depth:number,seed:number,impact=false){
  const rings=Array.from({length:5},(_,r)=>Array.from({length:12},(_,i)=>{
    const a=i/12*Math.PI*2,scale=[.9,1,.83,.68,.29][r]!,y=[-.55,-.30,.02,.30,.55][r]!;
    const rough=1+.1*Math.sin(i*3.7+seed);
    const x=Math.cos(a)*width*.5*scale*rough+width*.07*r/4;
    const saddle=impact&&r>1?(1-Math.min(1,Math.max(0,(x+1.3)/3.4)))*[0,0,.16,1.45,3.1][r]!:0;
    return new Vector3(x,height*(y+Math.sin(seed+i*2.4)*.075*(r===4?1:.35))-saddle,
      Math.sin(a)*depth*.5*scale*rough-depth*.05*r/4);
  }));
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[],colors:number[]=[],normals:number[]=[];
  const triangle=(a:Vector3,b:Vector3,c:Vector3)=>{
    const n=Vector3.Cross(b.subtract(a),c.subtract(a)),horizontal=Math.abs(n.y)>Math.max(Math.abs(n.x),Math.abs(n.z)),side=Math.abs(n.x)>Math.abs(n.z),k=positions.length/3;
    for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);uvs.push((horizontal?p.x:side?p.z:p.x)/7+seed*.13,(horizontal?p.z:p.y)/7);
      const tone=.66+.25*(p.y/height+.55);colors.push(tone,tone*.99,tone*.94,1);}
    indices.push(k,k+2,k+1);
  };
  for(let r=0;r<4;r++)for(let i=0;i<12;i++){const j=(i+1)%12;triangle(rings[r]![i]!,rings[r+1]![i]!,rings[r+1]![j]!);triangle(rings[r]![i]!,rings[r+1]![j]!,rings[r]![j]!);}
  const top=new Vector3(width*(impact?.23:.1),height*(impact?.44:.61),-depth*.05);
  for(let i=0;i<12;i++)triangle(rings[4]![i]!,top,rings[4]![(i+1)%12]!);
  VertexData.ComputeNormals(positions,indices,normals);const m=new MeshBuilderMesh(name,scene),d=new VertexData();Object.assign(d,{positions,indices,uvs,colors,normals});d.applyToMesh(m);return m;
}

/** One continuous world-space sea. There is deliberately no screen-space
 * painted backdrop and no second water level under the navigable tile grid. */
export function buildWreckOcean(scene: Scene, terrain: TerrainDefinition, reefTexture?: BaseTexture) {
  const meshes: Mesh[]=[];
  const draws=(mesh:Mesh)=>mesh.isVisible&&mesh.visibility>0&&mesh.isEnabled();
  const reefIds=[...new Set((terrain.obstacles??[]).filter(o=>o.surfaceId==='sea'&&!/wreckage|dragon-bone/.test(o.obstacleId)).map(o=>o.obstacleId))];
  const shoalExpression=reefIds.map(id=>{
    const cells=terrain.obstacles!.filter(o=>o.surfaceId==='sea'&&o.obstacleId===id),xs=cells.map(o=>(o.cell.col+.5)*1.5),zs=cells.map(o=>(o.cell.row+.5)*1.5);
    const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    const rx=(Math.max(...xs)-Math.min(...xs))*.7+2.6,rz=(Math.max(...zs)-Math.min(...zs))*.7+2.6;
    return `{vec2 d=(uv-vec2(${x.toFixed(3)},${z.toFixed(3)}))/vec2(${rx.toFixed(3)},${rz.toFixed(3)});nearest=min(nearest,dot(d,d));}`;
  }).join('\n');
  const vertexSource=`precision highp float; attribute vec3 position; uniform mat4 worldViewProjection;
    uniform mat4 world; uniform float time; varying vec3 p; varying vec4 reflectionClip;
    ${wreckWaveGLSL}
    void main(){vec3 q=position;vec3 w=(world*vec4(position,1.)).xyz;
      q.y+=wreckWave(w.xz,time);
      p=(world*vec4(q,1.)).xyz;reflectionClip=worldViewProjection*vec4(position,1.);gl_Position=worldViewProjection*vec4(q,1.);}`;
  const fragmentSource=`precision highp float; varying vec3 p; varying vec4 reflectionClip; uniform float time; uniform float lightLevel; uniform vec3 eye; uniform sampler2D reflectionSampler; uniform float reflectionStrength; uniform float roughness; uniform float scenicHorizon;
    float hash(vec2 v){vec3 q=fract(vec3(v.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    float noise(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    ${wreckBeamGLSL}
    // The strongest reef contribution comes from the smallest elliptical
    // distance. Evaluate the same falloff once, after finding that distance.
    float shallows(vec2 uv){${reefIds.length ? `float nearest=1.e20;${shoalExpression}return exp(-nearest*.72);` : 'return 0.;'}}
    void main(){vec2 uv=p.xz;vec2 drift=vec2(time*.06,-time*.035);
      vec2 ship=uv-vec2(${S.origin.x.toFixed(2)},${S.origin.z.toFixed(2)});
      // Ocean belongs outside the hull. Internal holes reveal a real shaft
      // and the flooded interior, not a bright rectangle of distant sea.
      float beam=wreckBeam(ship.x);
      float wetBeam=beam*(.986-.00018*ship.y);
      if(ship.x> ${S.sternX.toFixed(2)} && ship.x<${S.bowX.toFixed(2)}
        && abs(ship.y)<wetBeam-.05 && !(ship.x<${wreckSideBreachEnd.toFixed(2)} && ship.y>wetBeam-.32))discard;
      // Keep the same entrance transparency and horizon. Fully transparent
      // fragments never need waves, lighting or reflection samples.
      float entry=exp(-pow((ship.x+32.0)/3.3,4.)-pow(ship.y/2.1,4.));
      // Keep near and mid-distance formations sitting in the sea even at
      // shallow pitch. Only distant water can dissolve into the skyline.
      float horizon=1.-scenicHorizon*smoothstep(20.,55.,length(ship))*smoothstep(.30,.76,reflectionClip.y/reflectionClip.w);
      float alpha=(1.-entry*.73)*horizon;if(alpha<.002)discard;
      vec2 warp=vec2(noise(uv*.043+drift),noise(uv*.061-drift))*7.;
      float n=noise((uv+warp)*.11+drift)*.56+noise((uv-warp)*.29-drift)*.28+noise(uv*.022)*.16;
      float swell=sin((uv.x+warp.x)*.67+(uv.y+warp.y)*.31+time*.65);
      float broken=noise(uv*.8-drift*3.);
      vec3 deep=vec3(.020,.103,.135),teal=vec3(.065,.252,.28);
      vec3 color=mix(deep,teal,smoothstep(.12,.85,n));
      // The same blocked reef footprints inform water colour: submerged
      // shelves merge the stacks into a coastal formation, not isolated balls.
      float reefShoal=shallows(uv);
      color=mix(color,vec3(.085,.365,.345),reefShoal*.55);
      float caustic1=sin(uv.x*2.8+sin(uv.y*3.2+time*1.4)+time*.9);
      float caustic2=sin(uv.y*2.6+cos(uv.x*3.4-time*1.2)-time*.8);
      float caustics=pow(max(0.,(caustic1+caustic2)*.5),3.5)*reefShoal;
      color+=vec3(.18,.38,.36)*caustics*.38;
      float hullDistance=max(0.,abs(ship.y)-wetBeam);
      float hullShade=(1.-smoothstep(0.,2.7,hullDistance))*smoothstep(-31.8,-29.,ship.x)*(1.-smoothstep(29.5,31.8,ship.x));
      color*=1.-hullShade*.23;
      // Broken travelling crests, not a checkerboard of crossing sine peaks.
      color+=vec3(.88,.96,.95)*pow(max(0.,swell),7.)*smoothstep(.28,.76,broken)*.72;
      vec3 normal=normalize(vec3(-.05*cos(uv.x*.24+uv.y*.19+time*.75),1.,-.045*cos(uv.y*.71-uv.x*.37-time*.93)));
      vec3 view=normalize(eye-p);float fresnel=pow(1.-max(0.,dot(normal,view)),4.);
      color=mix(color,vec3(.17,.29,.31),fresnel*.42);
      float sun=pow(max(0.,dot(reflect(normalize(vec3(.42,-1.,-.35)),normal),view)),96.);
      color+=vec3(.69,.66,.51)*sun*.24;
      if(reflectionStrength>0.){
        vec2 reflectionUV=reflectionClip.xy/reflectionClip.w*.5+.5;
        vec2 distortion=vec2(sin(uv.y*1.2+time*.8),cos(uv.x*.85-time*.65))*(.002+roughness*.003);
        vec4 reflected=texture2D(reflectionSampler,clamp(reflectionUV+distortion,.001,.999));
        float inImage=step(0.,reflectionUV.x)*step(reflectionUV.x,1.)*step(0.,reflectionUV.y)*step(reflectionUV.y,1.);
        color=mix(color,reflected.rgb,reflected.a*inImage*reflectionStrength*(.33+fresnel*.32)*(1.-roughness*.4)*(1.-hullShade*.22));
      }
      float haze=1.-exp(-length(uv-vec2(42.,20.25))*.0019);
      color=mix(color,vec3(.105,.19,.22),haze);
      gl_FragColor=vec4(color*lightLevel,alpha);}`;
  const waterMat=new ShaderMaterial('wreck-continuous-ocean',scene,{vertexSource,fragmentSource},
    {attributes:['position'],uniforms:['world','worldViewProjection','time','lightLevel','eye','reflectionStrength','roughness','scenicHorizon'],samplers:['reflectionSampler'],needAlphaBlending:true});
  waterMat.setFloat('lightLevel',1);waterMat.setFloat('scenicHorizon',0);
  waterMat.setFloat('roughness',.25);waterMat.setFloat('reflectionStrength',0);
  const emptyReflection=RawTexture.CreateRGBATexture(new Uint8Array([0,0,0,0]),1,1,scene,false,false);waterMat.setTexture('reflectionSampler',emptyReflection);
  waterMat.forceDepthWrite=true;
  waterMat.backFaceCulling=false;
  const water=buildWreckOceanGrid(scene);
  water.position.set(S.origin.x,S.seaHeight,S.origin.z);water.material=waterMat;water.isPickable=false;water.alphaIndex=0;
  water.metadata={visualOnly:true,kind:'continuous-ocean',deckSurfaceId:'sea'};meshes.push(water);
  const foamMat=new ShaderMaterial('wreck-contact-foam',scene,{vertexSource:`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;uniform float time;varying vec2 vUV;varying vec2 at;
    ${wreckWaveGLSL}
    void main(){vUV=uv;at=position.xz;vec3 p=position;p.y+=wreckWave(at,time);gl_Position=worldViewProjection*vec4(p,1.);}`,
    fragmentSource:`precision highp float;varying vec2 vUV;varying vec2 at;uniform float time;uniform float lightLevel;
    void main(){
      float d=vUV.x, surge=.50+.28*sin(at.x*.65-at.y*.75-time*1.25);
      float turb1=sin(at.x*5.2+at.y*6.4+time*.95), turb2=sin(at.x*14.3-at.y*9.8-time*1.6), turb3=sin(at.x*29.1+at.y*23.4+time*2.3);
      float turbulence=turb1+.48*turb2+.25*turb3;
      float broken=smoothstep(-.52,1.05,turbulence);
      float lip=1.-smoothstep(.02,.32,d);
      float crest=(1.-smoothstep(.015,.26,abs(d-surge)))*broken;
      float flecks=smoothstep(.45,1.4,turbulence)*sin(d*3.14159)*(1.-d*.75)*.42;
      float froth=clamp(crest*.75+flecks+lip*.45,0.,1.)*(broken*.75+.25);
      vec3 waterContact=vec3(.08,.26,.29), pureFoam=vec3(.92,.98,.96);
      vec3 foamColor=mix(waterContact,pureFoam,smoothstep(.05,.42,froth+lip*.5));
      float alpha=clamp((lip*.88+froth*.75)*vUV.y,0.,1.)*(1.-smoothstep(.78,1.,d));
      gl_FragColor=vec4(foamColor*lightLevel,alpha);
    }`},
    {attributes:['position','uv'],uniforms:['worldViewProjection','time','lightLevel'],needAlphaBlending:true});
  foamMat.setFloat('lightLevel',1);foamMat.backFaceCulling=false;
  const foamMeshes:Mesh[]=[];
  const foam=(name:string,paths:WaterPoint[][],width:number,strength:number)=>{
    const m=buildWreckWaterContact(scene,name,paths,width,strength);
    if(m){m.material=foamMat;meshes.push(m);foamMeshes.push(m);}
  };
  for(const side of [-1,1]){
    const start=side>0?wreckSideBreachEnd:S.sternX;
    const xs=[start,...S.stations.map(([x])=>x).filter(x=>x>start&&x<S.bowX),S.bowX];
    const path=xs.flatMap((x,i)=>{
      const next=xs[i+1];
      return next===undefined?[x]:Array.from({length:Math.ceil(next-x)},(_,n)=>x+(next-x)*n/Math.ceil(next-x));
    }).map(x=>({x:S.origin.x+x,z:S.origin.z+side*wreckWaterlineBeam(wreckBeamAt(x),side)}));
    foam(`wreck-wake:${side}`,[side<0?path.reverse():path],side>0?1.45:1.15,.92);
  }
  const stoneMat=new StandardMaterial('wreck-reef-strata',scene);
  stoneMat.diffuseColor=Color3.FromHexString('#a8b3a6');stoneMat.diffuseTexture=reefTexture??null;
  stoneMat.specularColor=Color3.FromHexString('#152327');
  const groups=new Map<string,Array<{col:number;row:number}>>();
  for(const o of terrain.obstacles??[])if(o.surfaceId==='sea'){
    const group=groups.get(o.obstacleId)??[];group.push(o.cell);groups.set(o.obstacleId,group);
  }
  for(const [id,cells] of groups){
    if(id.startsWith('wreckage')){
      const drift=new StandardMaterial(`wreck:flotsam:${id}`,scene);drift.diffuseColor=Color3.FromHexString('#4d4a37');drift.specularColor=Color3.Black();
      for(let i=0;i<3;i++){const p=MeshBuilder.CreateBox(`wreck:flotsam:${id}:${i}`,{width:.65,height:.09,depth:.18},scene);
        p.position.set((cells[0]!.col+.35+i*.25)*1.5,S.seaHeight+.02,(cells[0]!.row+.3+i*.18)*1.5);p.rotation.y=.35+i*.7;p.material=drift;p.isPickable=false;p.metadata={visualOnly:true,kind:'floating-wreckage',deckSurfaceId:'sea'};meshes.push(p);
        scene.onBeforeRenderObservable.add(()=>{
          if(!draws(p))return;
          const t=performance.now()/1000;p.position.y=S.seaHeight+.03+Math.sin(t*.8+i)*.035;p.rotation.z=Math.sin(t*.7+i)*.03;
        });}
      continue;
    }
    const minX=Math.min(...cells.map(c=>c.col))*1.5,maxX=(Math.max(...cells.map(c=>c.col))+1)*1.5;
    const minZ=Math.min(...cells.map(c=>c.row))*1.5,maxZ=(Math.max(...cells.map(c=>c.row))+1)*1.5;
    if(id.startsWith('dragon-bone'))continue;
    // All emergent geometry stays inside the blocked footprint. Narrow ledges
    // overlap underwater, making a formation instead of isolated stone balls.
    const width=maxX-minX,depth=maxZ-minZ,grounded=id==='impact-reef-stern';
    const foremast=id==='foremast-reef';
    const rock=reefStack(scene,`wreck:reef:${id}`,width*.95,grounded?7.2:foremast?12.2:5.1+cells.length*.1,depth*.94,id.length*3,grounded);
    rock.position.set((minX+maxX)/2,grounded?-2.5:foremast?-3.0:id==='reef-south-west'?-5.0:-3.4,(minZ+maxZ)/2);rock.material=stoneMat;
    // Clamp bevel overshoot to the authored footprint. Grounding cells can be
    // concave along the hull; project vertices to their nearest blocked cell.
    const p=rock.getVerticesData('position')!;
    for(let i=0;i<p.length;i+=3){let wx=p[i]!+rock.position.x,wz=p[i+2]!+rock.position.z;
      if(!cells.some(c=>wx>=c.col*1.5&&wx<=(c.col+1)*1.5&&wz>=c.row*1.5&&wz<=(c.row+1)*1.5)){
        const nearest=cells.reduce((best,c)=>Math.hypot((c.col+.5)*1.5-wx,(c.row+.5)*1.5-wz)<Math.hypot((best.col+.5)*1.5-wx,(best.row+.5)*1.5-wz)?c:best,cells[0]!);
        wx=Math.max(nearest.col*1.5+.04,Math.min((nearest.col+1)*1.5-.04,wx));wz=Math.max(nearest.row*1.5+.04,Math.min((nearest.row+1)*1.5-.04,wz));
      }
      p[i]=wx-rock.position.x;p[i+2]=wz-rock.position.z;
    }rock.setVerticesData('position',p);
    const normals:number[]=[];VertexData.ComputeNormals(p,rock.getIndices()!,normals);rock.setVerticesData('normal',normals);
    rock.receiveShadows=true;rock.isPickable=false;rock.metadata={visualOnly:true,kind:'reef-rock-obstacle',deckSurfaceId:'sea'};meshes.push(rock);
    foam(`reef-wash:${id}`,sliceWreckWaterline(rock),grounded?1.65:1.20,grounded?1.05:.92);
  }
  // Deep supporting reef intersects the damaged stern below the waterline.
  // It cannot create an invisible above-water obstacle in navigable sea.
  for(let i=0;i<4;i++){
    const m=fracturedStone(scene,`wreck:grounding-bed:${i}`,7,4.5,6,i+71);
    m.position.set(S.origin.x-29+i*.9,-7.9,S.origin.z+3+i*.6);m.material=stoneMat;m.isPickable=false;
    m.metadata={visualOnly:true,kind:'submerged-grounding-reef',deckSurfaceId:'sea'};meshes.push(m);
  }
  // Reefs beyond the authored navigable boundary continue the world in depth.
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2,r=59+(i%4)*6;
    const m=reefStack(scene,`wreck:distant-reef:${i}`,7+(i%3)*2,8+(i%4)*1.8,6+(i%2)*3,i+30);
    m.position.set(S.origin.x+Math.cos(a)*r,-4.8,S.origin.z+Math.sin(a)*r);m.material=stoneMat;m.isPickable=false;
    m.metadata={visualOnly:true,kind:'distant-reef',deckSurfaceId:'sea'};meshes.push(m);
  }
  // Distant wrecks use real broken hull ribs and timbers, not painted cards.
  // They remain outside the navigable scene and never introduce unseen
  // obstacles or invented interactive loot.
  const driftwood=new StandardMaterial('wreck-distant-timber',scene);driftwood.diffuseColor=Color3.FromHexString('#605d4e');driftwood.specularColor=Color3.Black();
  for(const [index,x,z,angle] of [[0,-49,-27,.35],[1,52,32,-.6],[2,-39,40,1.2]] as const){
    const center=new Vector3(S.origin.x+x,S.seaHeight,S.origin.z+z);
    const rotate=(a:number,y:number,b:number)=>center.add(new Vector3(a*Math.cos(angle)-b*Math.sin(angle),y,a*Math.sin(angle)+b*Math.cos(angle)));
    for(let i=0;i<7;i++) {
      const t=(i-3)*1.5,w=2.6*Math.sqrt(Math.max(0,1-(t/5.8)**2));
      const rib=MeshBuilder.CreateTube(`wreck:distant-rib:${index}:${i}`,{path:[rotate(t,-1.8,0),rotate(t,-.4,-w*.8),rotate(t,.62+(i%3)*.13,-w)],radius:.13,tessellation:6},scene);
      rib.material=driftwood;rib.isPickable=false;rib.metadata={visualOnly:true,kind:'distant-wreck',deckSurfaceId:'sea'};meshes.push(rib);
    }
    const spar=MeshBuilder.CreateTube(`wreck:distant-keel:${index}`,{path:[rotate(-5.4,-.15,0),rotate(5.4,.3,0)],radius:.22,tessellation:6},scene);
    spar.material=driftwood;spar.isPickable=false;spar.metadata={visualOnly:true,kind:'distant-wreck',deckSurfaceId:'sea'};meshes.push(spar);
    // Weathered waterline strakes join the ribs into a recognizable broken
    // hull. Isolated tips above opaque water formerly looked like a rake.
    const p:number[]=[],ind:number[]=[],uv:number[]=[],ns:number[]=[];
    for(const side of [-1,1])for(let i=0;i<6;i++){
      if(side===1&&i%3===1)continue;
      const a=(i-3)*1.5,b=a+1.5,wa=2.6*Math.sqrt(Math.max(0,1-(a/5.8)**2)),wb=2.6*Math.sqrt(Math.max(0,1-(b/5.8)**2));
      const low=-.15,high=side<0?.52+.09*Math.sin(i*2.4):.25;
      const points=[rotate(a,low,side*wa),rotate(b,low,side*wb),rotate(b,high,side*wb),rotate(a,high,side*wa)],n=p.length/3;
      p.push(...points.flatMap(q=>[q.x,q.y,q.z]));ind.push(n,n+1,n+2,n,n+2,n+3);uv.push(0,0,1,0,1,1,0,1);
    }
    const hull=new MeshBuilderMesh(`wreck:distant-fractured-hull:${index}`,scene),v=new VertexData();Object.assign(v,{positions:p,indices:ind,uvs:uv});VertexData.ComputeNormals(p,ind,ns);v.normals=ns;v.applyToMesh(hull);
    const shell=driftwood.clone(`wreck-distant-hull:${index}`);shell.backFaceCulling=false;shell.diffuseColor=Color3.FromHexString('#484c40');hull.material=shell;hull.isPickable=false;hull.metadata={visualOnly:true,kind:'distant-wreck',deckSurfaceId:'sea'};meshes.push(hull);
  }
  const bones=[...buildDragonRemains(scene,terrain),...buildDistantDragonBones(scene)];
  for(const m of bones){
    const paths=sliceWreckWaterline(m).filter(path=>path.length>=5);
    foam(`bone-wash:${m.name}`,paths,.85,.90);
  }
  scene.onBeforeRenderObservable.add(()=>{
    const t=performance.now()/1000;
    if(draws(water)){
      waterMat.setFloat('time',t);
      if(scene.activeCamera)waterMat.setVector3('eye',scene.activeCamera.globalPosition);
    }
    if(foamMeshes.some(draws))foamMat.setFloat('time',t);
  });
    const driftMat = new StandardMaterial('wreck-drifting-plank', scene);
  driftMat.diffuseColor = Color3.FromHexString('#504738');
  driftMat.specularColor = Color3.FromHexString('#101413');
  driftMat.specularPower = 16;
  const driftPlanks = [
    { x: S.origin.x + 14.5, z: S.origin.z + 18.2, l: 2.2, w: 0.24, seed: 0.9 },
    { x: S.origin.x + 2.5, z: S.origin.z + 16.5, l: 1.8, w: 0.22, seed: 1.7 },
    { x: S.origin.x - 12.0, z: S.origin.z + 17.8, l: 2.4, w: 0.26, seed: 2.4 },
    { x: S.origin.x - 22.5, z: S.origin.z + 15.2, l: 1.9, w: 0.21, seed: 3.1 },
    { x: S.origin.x - 28.0, z: S.origin.z + 12.8, l: 2.6, w: 0.28, seed: 4.0 },
    { x: S.origin.x + 24.0, z: S.origin.z + 20.5, l: 1.6, w: 0.20, seed: 5.2 },
    { x: S.origin.x + 32.5, z: S.origin.z + 9.5, l: 2.1, w: 0.25, seed: 6.1 },
    { x: S.origin.x + 28.0, z: S.origin.z - 11.2, l: 1.7, w: 0.22, seed: 7.3 },
    { x: S.origin.x + 11.5, z: S.origin.z - 17.5, l: 2.5, w: 0.27, seed: 8.0 },
    { x: S.origin.x - 6.5, z: S.origin.z - 18.0, l: 2.0, w: 0.23, seed: 9.2 },
    { x: S.origin.x - 21.0, z: S.origin.z - 16.5, l: 2.3, w: 0.25, seed: 1.5 },
    { x: S.origin.x - 33.5, z: S.origin.z - 6.8, l: 1.8, w: 0.21, seed: 2.9 }
  ];
  driftPlanks.forEach((dp, idx) => {
    const plank = MeshBuilder.CreateBox(`wreck:ocean-drift-plank:${idx}`, { width: dp.l, height: 0.08, depth: dp.w }, scene);
    plank.position.set(dp.x, S.seaHeight + 0.03, dp.z);
    plank.rotation.y = dp.seed;
    plank.material = driftMat;
    plank.isPickable = false;
    plank.receiveShadows = true;
    plank.metadata = { visualOnly: true, kind: 'floating-drift-plank', deckSurfaceId: 'sea', originX: dp.x, originZ: dp.z, baseAngle: dp.seed };
    meshes.push(plank);
    scene.onBeforeRenderObservable.add(() => {
      if (!draws(plank)) return;
      const t = performance.now() / 1000;
      plank.position.x = dp.x + Math.sin(t * 0.18 + dp.seed) * 1.5;
      plank.position.z = dp.z + Math.cos(t * 0.14 + dp.seed * 1.2) * 1.1;
      plank.position.y = S.seaHeight + 0.03 + Math.sin(t * 1.15 + dp.seed) * 0.08 + Math.cos(t * 1.45 + dp.seed) * 0.04;
      plank.rotation.z = Math.sin(t * 1.05 + dp.seed) * 0.12;
      plank.rotation.x = Math.cos(t * 0.95 + dp.seed) * 0.09;
      plank.rotation.y = dp.seed + Math.sin(t * 0.12 + dp.seed) * 0.28;
    });
  });
  meshes.push(...bones,...buildWreckScenicDepth(scene));
  if(typeof window!=='undefined'){
    const compact=scene.getEngine().getRenderWidth()<800,mirror=new MirrorTexture('wreck:object-reflections',compact?256:512,scene,true);
    mirror.mirrorPlane=new Plane(0,-1,0,S.seaHeight);mirror.clearColor=new Color4(0,0,0,0);mirror.refreshRate=0;
    mirror.renderParticles=false;mirror.renderSprites=false;mirror.renderList=[];scene.customRenderTargets.push(mirror);waterMat.setTexture('reflectionSampler',mirror);
    const planes=Array.from({length:6},()=>new Plane(0,0,0,0));
    // MirrorTexture installs its reflected view before the render list is
    // queried. Reject only meshes fully outside that view; the main camera's
    // frustum would incorrectly remove geometry visible in the reflection.
    mirror.getCustomRenderList=(_pass,meshes)=>{
      if(!meshes||typeof scene.customLODSelector==='function')return null;
      Frustum.GetPlanesToRef(scene.getTransformMatrix(),planes);
      return meshes.filter(mesh=>{
        if(!(mesh instanceof MeshBuilderMesh)||mesh.alwaysSelectAsActiveMesh||mesh.hasInstances||mesh.hasThinInstances
          ||mesh.hasLODLevels||mesh.skeleton||mesh.morphTargetManager||mesh.bakedVertexAnimationManager
          ||mesh.getVertexBuffer('position')?.isUpdatable())return true;
        mesh.computeWorldMatrix();
        return mesh.isInFrustum(planes);
      });
    };
    const candidates=wreckReflectionCandidates(scene),cadence=new WreckReflectionCadence(compact);
    scene.onBeforeRenderObservable.add(()=>{
      const t=performance.now()/1000,camera=scene.activeCamera;
      const interior=scene.metadata?.wreckInterior===true,enabled=scene.metadata?.wreckReflectionsEnabled!==false;
      waterMat.setFloat('reflectionStrength',interior||!enabled?0:1);
      if(!cadence.update(t,!interior&&enabled&&draws(water)&&Boolean(camera),camera))return;
      mirror.renderList=candidates.get();mirror.resetRefreshCounter();
      scene.metadata={...scene.metadata,wreckReflection:{size:compact?256:512,objects:mirror.renderList.length,planar:true,maxPassesPerSecond:compact?9:15}};
    });
    scene.onDisposeObservable.addOnce(()=>{candidates.dispose();mirror.dispose();});
  }
  return meshes;
}
