import { Vector3, Vector4, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { buildWreckFloorClosure } from './wreck-floor-closure.js';
import { WRECK_STRUCTURE as S, wreckBeamAt } from '../shared/wreck-structure.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { wornTimberRelief } from './wreck-materials.js';
import { wreckBeamGLSL } from './wreck-water-contact.js';

/** Inside the same hull, not a second rectangular boat. There are deliberately
 * no new centre pillars or cargo colliders: structural knees stay outside the
 * authoritative walkable cell centres. Visibility remains grouped by level. */
export function buildWreckInterior(scene: Scene, hullTexture?: BaseTexture, terrain?:TerrainDefinition) {
  const meshes: Mesh[] = [], groups = new Map<string, Mesh[]>();
  const timber = new StandardMaterial('wreck-interior:wet-timber', scene);
  timber.diffuseTexture = hullTexture ?? null; timber.diffuseColor = Color3.FromHexString('#ad9b78');
  timber.specularColor = Color3.FromHexString('#122022'); timber.backFaceCulling = false;
  if(hullTexture)wornTimberRelief(scene,timber);
  const worn = timber.clone('wreck-interior:exposed-grain'); worn.diffuseColor = Color3.FromHexString('#bcad87');
  const algae = new StandardMaterial('wreck-interior:algae', scene);
  algae.diffuseColor = Color3.FromHexString('#42573b'); algae.specularColor = Color3.Black();
  const at = (x: number, y: number, z: number) => new Vector3(S.origin.x+x,y,S.origin.z+z);
  const add = (m: Mesh, surface: string, kind: string, batched=true, cutSide=0) => {
    m.isPickable=false;m.receiveShadows=true;m.metadata={visualOnly:true,deckSurfaceId:surface,kind,cutSide};
    if(batched){const key=`${surface}:${kind}:${m.material?.name}:${cutSide}`;const group=groups.get(key)??[];group.push(m);groups.set(key,group);}else meshes.push(m);
    return m;
  };
  const beam = (id:string,a:Vector3,b:Vector3,w:number,material:StandardMaterial,surface:string,kind='interior-frame',cutSide=0) => {
    const delta=b.subtract(a),m=MeshBuilder.CreateBox(`wreck-interior:${id}`,{width:w,depth:w*1.15,height:delta.length()},scene);
    m.position.copyFrom(a.add(b).scale(.5));m.rotationQuaternion=Quaternion.FromUnitVectorsToRef(Vector3.Up(),delta.normalize(),new Quaternion());
    m.material=material;worldSurfaceUV(m,4.5);return add(m,surface,kind,true,cutSide);
  };
  for(const [surface,floor,top,inset] of [['lower-deck',-3.5,-.65,.87],['hold-air',-6.4,-4.12,1.25]] as const) {
    const cut=floor+(surface==='lower-deck'?.57:.45);
    for(const side of [-1,1])for(let x=S.sternX;x<S.bowX;x+=1.5){
      // Close both sides all the way to the stern. The entry is in the end
      // transom; omitting both sides here left the whole room open to the sea.
      const nx=Math.min(S.bowX,x+1.5),width=Math.max(.06,wreckBeamAt(x)-inset),next=Math.max(.06,wreckBeamAt(nx)-inset);
      const board=(kind:string,vertices:Vector3[],material:StandardMaterial,cutSide=0)=>{
        const m=new Mesh(`wreck-interior:${kind}:${surface}:${side}:${x}`,scene),d=new VertexData(),normals:number[]=[];
        d.positions=vertices.flatMap(p=>[p.x,p.y,p.z]);d.indices=side===1?[0,1,2,0,2,3]:[0,2,1,0,3,2];
        d.uvs=vertices.map(p=>[p.x/4.5,(kind==='interior-cut-grain'?p.z:p.y)/4.5]).flat();
        VertexData.ComputeNormals(d.positions,d.indices,normals);d.normals=normals;d.applyToMesh(m);
        m.material=material;add(m,surface,kind,true,cutSide);
      };
      const lowA=at(x,floor,side*width),lowB=at(nx,floor,side*next);
      const cutOffset=.12*(cut-floor)/(top-floor);
      const cutA=at(x,cut,side*(width+cutOffset)),cutB=at(nx,cut,side*(next+cutOffset));
      board('interior-lining',[lowA,lowB,cutB,cutA],timber);
      board('interior-upper-lining',[cutA,cutB,at(nx,top,side*(next+.12)),at(x,top,side*(width+.12))],timber,side);
      const outward=new Vector3(0,0,side*.17);
      board('interior-cut-grain',[cutA,cutB,cutB.add(outward),cutA.add(outward)],worn,side);
    }
    for(let x=-30;x<=27;x+=3){
      const w=wreckBeamAt(x)-inset-.14;
      for(const side of [-1,1]){
        beam(`rib-foot:${surface}:${x}:${side}`,at(x,floor+.02,side*w),at(x,cut,side*w),.21,worn,surface);
        beam(`rib:${surface}:${x}:${side}`,at(x,cut,side*w),at(x,top,side*w),.21,worn,surface,'interior-upper-lining',side);
        beam(`knee:${surface}:${x}:${side}`,at(x,top-.9,side*w),at(x,top-.04,side*(w-.85)),.16,worn,surface,'interior-upper-lining',side);
      }
      // Cutaway removes overhead beams but retains the side knees and ribs.
      beam(`ceiling:${surface}:${x}`,at(x,top,-w),at(x,top,w),.19,timber,surface,'interior-overhead');
    }
    for(const side of [-1,1]) {
      for(let x=-27;x<=24;x+=4.5){
        const z=side*(wreckBeamAt(x)-inset-.1);
        for(let n=0;n<3;n++) {
          const path=[at(x+n*.11,floor+.08,z),at(x+n*.11+.09,floor+.22+n*.04,z-side*.04),at(x+n*.11-.06,cut-.04+n*.02,z-side*.03)];
          const frond=MeshBuilder.CreateTube(`wreck-interior:kelp:${surface}:${side}:${x}:${n}`,{path,radius:.03,tessellation:5},scene);
          frond.material=algae;add(frond,surface,'interior-algae');
        }
      }
    }
  }
  // The chest broke through both floors. Expose end-grain and supporting
  // joists around the existing C4/C8 shaft, never cap it with a blue rectangle.
  for(const [surface,y] of [['main',0],['lower-deck',-3.35]] as const) {
    const cx=-19.5,cz=-4.5;
    for(const side of [-1,1]) {
      beam(`shaft-joist:${surface}:${side}`,at(cx-1.5,y-.18,cz+side*.75),at(cx+1.5,y-.18,cz+side*.75),.2,worn,surface,'shaft-frame');
      for(let i=0;i<7;i++) {
        const x=cx-1.25+i*.4;
        beam(`shaft-splinter:${surface}:${side}:${i}`,at(x,y,cz+side*.75),at(x+.1,y-.08-(i%3)*.025,cz+side*(.45+(i%3)*.075)),.065,worn,surface,'shaft-frame');
      }
    }
    // The irregular plank ends continue down a genuine two-floor opening.
    // Its dimensions come from the existing 2×1 missing-cell shaft.
    const bottom=-6.4;
    for(const [axis,side] of [['x',-1],['x',1],['z',-1],['z',1]] as const){
      const vertices=axis==='x'?[at(cx-1.5,bottom,cz+side*.75),at(cx+1.5,bottom,cz+side*.75),at(cx+1.5,y-.14,cz+side*.75),at(cx-1.5,y-.14,cz+side*.75)]
        :[at(cx+side*1.5,bottom,cz-.75),at(cx+side*1.5,bottom,cz+.75),at(cx+side*1.5,y-.14,cz+.75),at(cx+side*1.5,y-.14,cz-.75)];
      const lining=new Mesh(`wreck-interior:shaft-depth:${surface}:${axis}:${side}`,scene),v=new VertexData(),normals:number[]=[];
      v.positions=vertices.flatMap(p=>[p.x,p.y,p.z]);v.indices=[0,1,2,0,2,3];v.uvs=vertices.flatMap(p=>[(p.x+p.z)/4.5,p.y/4.5]);
      VertexData.ComputeNormals(v.positions,v.indices,normals);v.normals=normals;v.applyToMesh(lining);lining.material=timber;add(lining,surface,'shaft-depth');
    }
    const bed=MeshBuilder.CreateGround(`wreck-interior:shaft-bottom:${surface}`,{width:3,height:1.5},scene);
    bed.position.copyFrom(at(cx,-6.4,cz));bed.material=timber;add(bed,surface,'shaft-depth');
  }
  // A single shallow sheet at the sea level makes the listed 15–45 cm depth
  // readable; the floor and characters remain visible through it.
  const waterVertex=`precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;uniform mat4 world;varying vec3 p;
    void main(){p=(world*vec4(position,1.)).xyz;gl_Position=worldViewProjection*vec4(position,1.);}`;
  const waterFragment=`precision highp float;varying vec3 p;uniform float time;uniform float lightLevel;uniform vec4 source0;uniform vec4 source1;uniform vec4 source2;
    ${wreckBeamGLSL}
    float pool(vec4 s){return s.w*pow(max(0.,1.-distance(p.xz,s.xy)/max(.01,s.z)),2.);}
    void main(){float a=sin(p.x*1.7+p.z*.49+sin(p.z*.83-time*.22)+time*.49);
      float b=sin(p.z*1.9-p.x*.61+sin(p.x*.67+time*.26)-time*.38);
      float glint=pow(1.-abs(a),9.)*.55+pow(1.-abs(b),11.)*.45;
      bool deep=p.y< -5.;
      vec2 hull=p.xz-vec2(${S.origin.x.toFixed(2)},${S.origin.z.toFixed(2)});
      float bank=wreckBeam(hull.x)-(deep?1.25:.87);
      float edge=max(0.,bank-abs(hull.y));
      float contact=1.-smoothstep(.04,.69,edge);
      glint*=1.-contact*.73;
      vec3 c=deep?vec3(.06,.30,.34):vec3(.10,.32,.33);
      c=mix(c,vec3(.047,.115,.12),contact*.56);
      float meniscus=(1.-smoothstep(.015,.092,abs(edge-.05)))*(.55+.45*sin(p.x*7.1+time*.48));
      c+=glint*vec3(.50,.85,.83)+(deep?0.:meniscus)*vec3(.07,.12,.11);
      float lit=pool(source0)+pool(source1)+pool(source2);
      // Read as shallow standing water, not a dark varnish on dry boards.
      // Glints stay tied to daylight/carried light; night never self-lights.
      float illumination=lightLevel+lit*.85;
      gl_FragColor=vec4(c*illumination,.25+contact*.08+glint*(.20+min(.22,lit*.22)));}`;
  const water=new ShaderMaterial('wreck-interior:shallow-water',scene,{vertexSource:waterVertex,fragmentSource:waterFragment},
    {attributes:['position'],uniforms:['world','worldViewProjection','time','lightLevel','source0','source1','source2'],needAlphaBlending:true});
  water.backFaceCulling=false;water.setFloat('lightLevel',.8);
  const waterSkin=(name:string,y:number,inset:number)=>{
    const end=S.bowX-1.1,stations=[...S.stations.filter(([x])=>x<end),[end,wreckBeamAt(end)] as const];
    const outline=[...stations.map(([x,w])=>at(x,y,-Math.max(.07,w-inset))),
      ...stations.reverse().map(([x,w])=>at(x,y,Math.max(.07,w-inset)))];
    const mesh=new Mesh(`wreck-interior:${name}`,scene),data=new VertexData(),indices:number[]=[];
    for(let i=1;i<outline.length-1;i++)indices.push(0,i,i+1);
    data.positions=outline.flatMap(p=>[p.x,p.y,p.z]);data.indices=indices;data.applyToMesh(mesh);mesh.material=water;
    return mesh;
  };
  const m=waterSkin('continuous-flood',S.seaHeight+.016,.84);add(m,'lower-deck','shallow-water',false);
  // C9 is submerged, not a dry room. A restrained light-dependent caustic
  // skin follows its real floor; it never invents a second surface to walk on.
  const holdSkin=waterSkin('hold-caustics',-6.36,1.23);add(holdSkin,'hold-air','submerged-caustics',false);
  // Tiny submerged fish are ambient life in C9, not interactable creatures.
  const fish=new StandardMaterial('wreck-interior:fish',scene);fish.diffuseColor=Color3.FromHexString('#879188');fish.specularColor=Color3.Black();
  const fishes:Mesh[]=[],bubbles:Mesh[]=[];
  for(let i=0;i<9;i++) {
    const f=MeshBuilder.CreateSphere(`wreck-interior:fish:${i}`,{diameter:.18,segments:6},scene);f.scaling.set(1.8,.55,.45);f.material=fish;
    add(f,'hold-air','submerged-fish',false);
    fishes.push(f);
  }
  const bubble=new StandardMaterial('wreck-interior:submerged-bubbles',scene);bubble.diffuseColor=Color3.FromHexString('#72999a');bubble.specularColor=Color3.FromHexString('#6d9394');bubble.alpha=.22;
  // Sparse rising air/silt sells a submerged volume rather than a flooded
  // floor. It adds no sunlight or gameplay creature to the dark hold.
  for(let i=0;i<18;i++){
    const b=MeshBuilder.CreateSphere(`wreck-interior:bubble:${i}`,{diameter:.035+(i%3)*.013,segments:6},scene);b.material=bubble;add(b,'hold-air','submerged-bubbles',false);
    bubbles.push(b);
  }
  for(const [key,group] of groups){const metadata={...group[0]!.metadata};const m=Mesh.MergeMeshes(group,true,true,undefined,false,false);if(m){m.name=`wreck-interior-batch:${key}`;m.metadata=metadata;m.isPickable=false;m.receiveShadows=true;meshes.push(m);}}
  const uniforms=[new Vector4(0,0,1,0),new Vector4(0,0,1,0),new Vector4(0,0,1,0)];
  const observer=scene.onBeforeRenderObservable.add(()=>{
    // One callback/clock for the entire interior instead of one per fish and
    // bubble. Hidden floors do no animation/light-list work. Absolute time
    // resumes at the current phase, with no deferred catch-up simulation.
    if(!m.isVisible&&!holdSkin.isVisible)return;
    const now=performance.now();water.setFloat('time',now/1000);
    if(holdSkin.isVisible){
      for(let i=0;i<fishes.length;i++){const f=fishes[i]!;if(!f.isVisible)continue;const t=now*.00035+i,x=-14+i*3+Math.sin(t)*1.2,z=Math.cos(t*.7+i)*3.5;
        f.position.set(S.origin.x+x,-5.5+(i%3)*.23,S.origin.z+z);f.rotation.y=-t*.7;}
      for(let i=0;i<bubbles.length;i++){const b=bubbles[i]!;if(!b.isVisible)continue;const t=now*.00015+i*.31,x=-27+(i%9)*5.4+Math.sin(t)*.09,z=(i%5-2)*1.6;
        b.position.set(S.origin.x+x,-6.1+(t%1)*1.75,S.origin.z+z);}
    }
    let count=0;
    for(const light of scene.lights){if(count===3)break;if(!light.name.startsWith('carried-light:')||!light.isEnabled())continue;
      const source=light as typeof light&{position?:Vector3};if(source.position)uniforms[count++]!.set(source.position.x,source.position.z,source.range*.5,source.intensity);}
    for(let i=count;i<3;i++)uniforms[i]!.set(0,0,1,0);
    for(let i=0;i<3;i++)water.setVector4(`source${i}`,uniforms[i]!);
  });
  scene.onDisposeObservable.addOnce(()=>scene.onBeforeRenderObservable.remove(observer));
  if(terrain)meshes.push(...buildWreckFloorClosure(scene,terrain,timber));
  return meshes;
}
