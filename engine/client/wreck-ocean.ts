import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Plane } from '@babylonjs/core/Maths/math.plane.js';
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
import { WRECK_STRUCTURE as S, wreckHullPlan } from '../shared/wreck-structure.js';
import { fracturedStone } from './diorama-kit.js';
import { buildDragonRemains,buildDistantDragonBones } from './wreck-dragon-bones.js';

/** Jagged marine stacks, not bevelled rectangular blocks. UVs belong to each
 * face and their stratum tint changes with height; gameplay clips the final
 * footprint to the authored blocked reef cells below. */
function reefStack(scene:Scene,name:string,width:number,height:number,depth:number,seed:number){
  const rings=Array.from({length:5},(_,r)=>Array.from({length:12},(_,i)=>{
    const a=i/12*Math.PI*2,scale=[.9,1,.83,.68,.29][r]!,y=[-.55,-.30,.02,.30,.55][r]!;
    const rough=1+.1*Math.sin(i*3.7+seed);
    return new Vector3(Math.cos(a)*width*.5*scale*rough+width*.07*r/4,
      height*(y+Math.sin(seed+i*2.4)*.075*(r===4?1:.35)),Math.sin(a)*depth*.5*scale*rough-depth*.05*r/4);
  }));
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[],colors:number[]=[],normals:number[]=[];
  const triangle=(a:Vector3,b:Vector3,c:Vector3)=>{
    const n=Vector3.Cross(b.subtract(a),c.subtract(a)),horizontal=Math.abs(n.y)>Math.max(Math.abs(n.x),Math.abs(n.z)),side=Math.abs(n.x)>Math.abs(n.z),k=positions.length/3;
    for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);uvs.push((horizontal?p.x:side?p.z:p.x)/7+seed*.13,(horizontal?p.z:p.y)/7);
      const tone=.66+.25*(p.y/height+.55);colors.push(tone,tone*.99,tone*.94,1);}
    indices.push(k,k+2,k+1);
  };
  for(let r=0;r<4;r++)for(let i=0;i<12;i++){const j=(i+1)%12;triangle(rings[r]![i]!,rings[r+1]![i]!,rings[r+1]![j]!);triangle(rings[r]![i]!,rings[r+1]![j]!,rings[r]![j]!);}
  const top=new Vector3(width*.1,height*.61,-depth*.05);
  for(let i=0;i<12;i++)triangle(rings[4]![i]!,top,rings[4]![(i+1)%12]!);
  VertexData.ComputeNormals(positions,indices,normals);const m=new MeshBuilderMesh(name,scene),d=new VertexData();Object.assign(d,{positions,indices,uvs,colors,normals});d.applyToMesh(m);return m;
}

/** One continuous world-space sea. There is deliberately no screen-space
 * painted backdrop and no second water level under the navigable tile grid. */
export function buildWreckOcean(scene: Scene, terrain: TerrainDefinition, reefTexture?: BaseTexture) {
  const meshes: Mesh[]=[];
  const reefIds=[...new Set((terrain.obstacles??[]).filter(o=>o.surfaceId==='sea'&&!/wreckage|dragon-bone/.test(o.obstacleId)).map(o=>o.obstacleId))];
  const shoalExpression=reefIds.map(id=>{
    const cells=terrain.obstacles!.filter(o=>o.surfaceId==='sea'&&o.obstacleId===id),xs=cells.map(o=>(o.cell.col+.5)*1.5),zs=cells.map(o=>(o.cell.row+.5)*1.5);
    const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    const rx=(Math.max(...xs)-Math.min(...xs))*.7+2.6,rz=(Math.max(...zs)-Math.min(...zs))*.7+2.6;
    return `{vec2 d=(uv-vec2(${x.toFixed(3)},${z.toFixed(3)}))/vec2(${rx.toFixed(3)},${rz.toFixed(3)});s=max(s,exp(-dot(d,d)*.72));}`;
  }).join('\n');
  const beamExpression=S.stations.slice(0,-1).map(([x,w],i)=>{
    const [nx,nw]=S.stations[i+1]!;return `if(x<=${nx.toFixed(3)})return mix(${w.toFixed(3)},${nw.toFixed(3)},clamp((x-(${x.toFixed(3)}))/${(nx-x).toFixed(3)},0.,1.));`;
  }).join('\n');
  const vertexSource=`precision highp float; attribute vec3 position; uniform mat4 worldViewProjection;
    uniform mat4 world; uniform float time; varying vec3 p; varying vec4 reflectionClip;
    void main(){vec3 q=position;vec3 w=(world*vec4(position,1.)).xyz;
      q.y+=.035*sin(w.x*.08+w.z*.06+time*.75)+.012*sin(w.z*.11-w.x*.07-time*.93);
      p=(world*vec4(q,1.)).xyz;reflectionClip=worldViewProjection*vec4(position,1.);gl_Position=worldViewProjection*vec4(q,1.);}`;
  const fragmentSource=`precision highp float; varying vec3 p; varying vec4 reflectionClip; uniform float time; uniform float lightLevel; uniform vec3 eye; uniform sampler2D reflectionSampler; uniform float reflectionStrength; uniform float roughness;
    float hash(vec2 v){vec3 q=fract(vec3(v.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    float noise(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    float beamAt(float x){${beamExpression}return .12;}
    float shallows(vec2 uv){float s=0.;${shoalExpression}return s;}
    void main(){vec2 uv=p.xz;vec2 drift=vec2(time*.06,-time*.035);
      vec2 ship=uv-vec2(${S.origin.x.toFixed(2)},${S.origin.z.toFixed(2)});
      // Ocean belongs outside the hull. Internal holes reveal a real shaft
      // and the flooded interior, not a bright rectangle of distant sea.
      if(ship.x> ${S.sternX.toFixed(2)} && ship.x<${S.bowX.toFixed(2)} && abs(ship.y)<beamAt(ship.x)*.985)discard;
      vec2 warp=vec2(noise(uv*.043+drift),noise(uv*.061-drift))*7.;
      float n=noise((uv+warp)*.11+drift)*.56+noise((uv-warp)*.29-drift)*.28+noise(uv*.022)*.16;
      float swell=sin((uv.x+warp.x)*.67+(uv.y+warp.y)*.31+time*.65);
      float broken=noise(uv*.8-drift*3.);
      vec3 deep=vec3(.020,.103,.135),teal=vec3(.065,.252,.28);
      vec3 color=mix(deep,teal,smoothstep(.12,.85,n));
      // The same blocked reef footprints inform water colour: submerged
      // shelves merge the stacks into a coastal formation, not isolated balls.
      color=mix(color,vec3(.07,.29,.27),shallows(uv)*.45);
      // Broken travelling crests, not a checkerboard of crossing sine peaks.
      color+=vec3(.16,.29,.29)*pow(max(0.,swell),15.)*smoothstep(.44,.8,broken)*.33;
      vec3 normal=normalize(vec3(-.05*cos(uv.x*.24+uv.y*.19+time*.75),1.,-.045*cos(uv.y*.71-uv.x*.37-time*.93)));
      vec3 view=normalize(eye-p);float fresnel=pow(1.-max(0.,dot(normal,view)),4.);
      color=mix(color,vec3(.17,.29,.31),fresnel*.42);
      float sun=pow(max(0.,dot(reflect(normalize(vec3(.42,-1.,-.35)),normal),view)),96.);
      color+=vec3(.69,.66,.51)*sun*.24;
      vec2 reflectionUV=reflectionClip.xy/reflectionClip.w*.5+.5;
      vec2 distortion=vec2(sin(uv.y*1.2+time*.8),cos(uv.x*.85-time*.65))*(.002+roughness*.003);
      vec4 reflected=texture2D(reflectionSampler,clamp(reflectionUV+distortion,.001,.999));
      float inImage=step(0.,reflectionUV.x)*step(reflectionUV.x,1.)*step(0.,reflectionUV.y)*step(reflectionUV.y,1.);
      color=mix(color,reflected.rgb,reflected.a*inImage*reflectionStrength*(.40+fresnel*.36)*(1.-roughness*.4));
      float haze=1.-exp(-length(uv-vec2(42.,20.25))*.0019);
      color=mix(color,vec3(.105,.19,.22),haze);
      // A restrained clear-water patch reveals the submerged stern entrance
      // and timber depth behind it. Not a second sea or a rectangular decal.
      float entry=exp(-pow((ship.x+32.0)/3.3,4.)-pow(ship.y/2.1,4.));
      gl_FragColor=vec4(color*lightLevel,1.-entry*.73);}`;
  const waterMat=new ShaderMaterial('wreck-continuous-ocean',scene,{vertexSource,fragmentSource},
    {attributes:['position'],uniforms:['world','worldViewProjection','time','lightLevel','eye','reflectionStrength','roughness'],samplers:['reflectionSampler'],needAlphaBlending:true});
  waterMat.setFloat('lightLevel',1);
  waterMat.setFloat('roughness',.25);waterMat.setFloat('reflectionStrength',0);
  const emptyReflection=RawTexture.CreateRGBATexture(new Uint8Array([0,0,0,0]),1,1,scene,false,false);waterMat.setTexture('reflectionSampler',emptyReflection);
  waterMat.forceDepthWrite=true;
  waterMat.backFaceCulling=false;
  const water=MeshBuilder.CreateGround('wreck-ocean',{width:1600,height:1600,subdivisions:128},scene);
  water.position.set(S.origin.x,S.seaHeight,S.origin.z);water.material=waterMat;water.isPickable=false;
  water.metadata={visualOnly:true,kind:'continuous-ocean',deckSurfaceId:'sea'};meshes.push(water);
  const foamMat=new ShaderMaterial('wreck-contact-foam',scene,{vertexSource:`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;
    void main(){vUV=uv;gl_Position=worldViewProjection*vec4(position,1.);}`,
    fragmentSource:`precision highp float;varying vec2 vUV;uniform float time;uniform float lightLevel;
    void main(){float ribbon=pow(max(0.,sin(vUV.y*3.14159)),1.5);
      float breakup=.48+.26*sin(vUV.x*5.7-time*.7)+.22*sin(vUV.x*12.3+time*1.1);
      float pulse=.62+.25*sin(time*.8+vUV.x*.4);
      gl_FragColor=vec4(vec3(.63,.75,.73)*lightLevel,ribbon*smoothstep(.17,.64,breakup)*pulse*.55);}`},
    {attributes:['position','uv'],uniforms:['worldViewProjection','time','lightLevel'],needAlphaBlending:true});
  foamMat.setFloat('lightLevel',1);foamMat.backFaceCulling=false;
  const foam=(name:string,path:Vector3[])=>{
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[],normals:number[]=[];let length=0;
    for(let i=0;i<path.length;i++){
      const p=path[i]!,direction=path[Math.min(path.length-1,i+1)]!.subtract(path[Math.max(0,i-1)]!).normalize();
      if(i)length+=Vector3.Distance(p,path[i-1]!);
      for(const side of [-1,1]){positions.push(p.x-direction.z*side*.32,p.y,p.z+direction.x*side*.32);uvs.push(length,(side+1)/2);}
      if(i){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const m=new MeshBuilderMesh(name,scene),data=new VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;
    VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;data.applyToMesh(m);m.material=foamMat;m.isPickable=false;
    m.metadata={visualOnly:true,kind:'contact-foam',deckSurfaceId:'sea'};meshes.push(m);return m;
  };
  // Broken short wakes at hull contact; spatially anchored, not texture tiles.
  const outline=wreckHullPlan();
  for(let i=0;i<outline.length-1;i++){
    const a=outline[i]!,b=outline[i+1]!,distance=Math.hypot(b.x-a.x,b.z-a.z);
    if(distance<.3)continue;
    foam(`wreck-wake:${i}`,Array.from({length:7},(_,n)=>{
      const t=.05+n/6*.8;return new Vector3(a.x+(b.x-a.x)*t,S.seaHeight+.05,
        a.z+(b.z-a.z)*t+(a.z<S.origin.z?-.1:.1));
    }));
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
        scene.onBeforeRenderObservable.add(()=>{const t=performance.now()/1000;p.position.y=S.seaHeight+.03+Math.sin(t*.8+i)*.035;p.rotation.z=Math.sin(t*.7+i)*.03;});}
      continue;
    }
    const minX=Math.min(...cells.map(c=>c.col))*1.5,maxX=(Math.max(...cells.map(c=>c.col))+1)*1.5;
    const minZ=Math.min(...cells.map(c=>c.row))*1.5,maxZ=(Math.max(...cells.map(c=>c.row))+1)*1.5;
    if(id.startsWith('dragon-bone'))continue;
    // All emergent geometry stays inside the blocked footprint. Narrow ledges
    // overlap underwater, making a formation instead of isolated stone balls.
    const width=maxX-minX,depth=maxZ-minZ,grounded=id==='impact-reef-stern';
    const foremast=id==='foremast-reef';
    const rock=reefStack(scene,`wreck:reef:${id}`,width*.95,grounded?8.3:foremast?12.2:5.1+cells.length*.1,depth*.94,id.length*3);
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
    const rim=Array.from({length:21},(_,n)=>new Vector3(rock.position.x+Math.cos(n/20*Math.PI*2)*width*.43,S.seaHeight+.065,rock.position.z+Math.sin(n/20*Math.PI*2)*depth*.43));
    foam(`reef-wash:${id}`,rim);
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
  const started=performance.now();scene.onBeforeRenderObservable.add(()=>{
    const t=(performance.now()-started)/1000;waterMat.setFloat('time',t);foamMat.setFloat('time',t);
    if(scene.activeCamera)waterMat.setVector3('eye',scene.activeCamera.globalPosition);
  });
  meshes.push(...buildDragonRemains(scene,terrain),...buildDistantDragonBones(scene));
  if(typeof window!=='undefined'){
    const compact=scene.getEngine().getRenderWidth()<800,mirror=new MirrorTexture('wreck:object-reflections',compact?256:512,scene,true);
    mirror.mirrorPlane=new Plane(0,-1,0,S.seaHeight);mirror.clearColor=new Color4(0,0,0,0);mirror.refreshRate=0;
    mirror.renderParticles=false;mirror.renderSprites=false;mirror.renderList=[];scene.customRenderTargets.push(mirror);waterMat.setTexture('reflectionSampler',mirror);
    let count=-1,lastUpdate=-1;const lastCamera=Vector3.Zero();
    scene.onBeforeRenderObservable.add(()=>{
      const t=performance.now()/1000,camera=scene.activeCamera;
      const interior=scene.metadata?.wreckInterior===true,enabled=scene.metadata?.wreckReflectionsEnabled!==false;
      waterMat.setFloat('reflectionStrength',interior||!enabled?0:1);
      if(interior||!enabled||!camera)return;
      if(count!==scene.meshes.length){count=scene.meshes.length;mirror.renderList=scene.meshes.filter(m=>!m.metadata?.nativeBillboard&&!/actor:|weather:|water|ocean|foam|wake|wash|shimmer|darkness|shadow|stain|decal|algae|bubble|fish/i.test(m.name)&&m.material&&m.getTotalVertices()>0);}
      // One cached planar pass, not six cube faces per object. Camera movement
      // invalidates immediately; boat/waves update at a bounded cadence.
      if(t-lastUpdate>(compact?.24:.12)||Vector3.DistanceSquared(camera.position,lastCamera)>.06){lastUpdate=t;lastCamera.copyFrom(camera.position);mirror.resetRefreshCounter();}
      scene.metadata={...scene.metadata,wreckReflection:{size:compact?256:512,objects:mirror.renderList?.length??0,planar:true}};
    });
    scene.onDisposeObservable.addOnce(()=>mirror.dispose());
  }
  return meshes;
}
