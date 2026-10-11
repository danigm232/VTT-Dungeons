import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S, wreckListHeight, wreckBeamAt, wreckHullPlan, wreckUpperDeckPlan, clipPlanToRect } from '../shared/wreck-structure.js';
import { buildWreckAgeDetails } from './wreck-age-details.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { wornTimberRelief } from './wreck-materials.js';

export const isRebuiltWreck = (terrain: TerrainDefinition) => terrain.cols === 56 && terrain.rows === 32
  && terrain.baseSurfaceId === 'main' && terrain.surfaces.some(s => s.id === 'c1-hull');

/** Structural exterior only. Interior rooms, narrative props and authoritative
 * collision addresses remain owned by the campaign. Every stair is built from
 * exactly the same run, rise and endpoints as its movement ramp. */
export function buildWreckExterior(scene: Scene, terrain: TerrainDefinition,
  textures: { deck?: BaseTexture; hull?: BaseTexture; sail?: BaseTexture; debris?: BaseTexture } = {}) {
  const meshes: Mesh[] = [], batches = new Map<string, Mesh[]>();
  const wood = (id: string, tint: string, texture?: BaseTexture) => {
    const m = new StandardMaterial(`wreck-rebuild:${id}`, scene);
    m.diffuseColor = Color3.FromHexString(tint); m.diffuseTexture = texture ?? null;
    m.specularColor = Color3.FromHexString('#18211e'); m.specularPower = 28;
    m.backFaceCulling = false;if(texture)wornTimberRelief(scene,m);return m;
  };
  const shell = wood('shell', '#a49378', textures.hull), dark = wood('frames', '#796e54', textures.hull);
  const edge = wood('worn-cants', '#b9a17a', textures.hull), rope = wood('rope', '#83745b');
  const iron = wood('iron', '#353d39'), stepWood = wood('treads', '#c0af91', textures.deck);
  const kelp = wood('algae', '#384936'), endgrain = wood('splinter-oak','#9b8763',textures.hull);
  const mark = (m: Mesh, surface: string, kind: string, bottom: number, top: number, batch = true) => {
    m.isPickable = false; m.receiveShadows = true;
    m.metadata = { visualOnly: true, kind, deckSurfaceId: surface, bottom, height: top, top };
    if (batch) { const key = `${surface}:${kind}:${m.material?.name}`; const group = batches.get(key) ?? []; group.push(m); batches.set(key, group); }
    else meshes.push(m);
    return m;
  };
  const at = (x: number, y: number, z: number) => new Vector3(x + S.origin.x, y + wreckListHeight(z+S.origin.z), z + S.origin.z);
  const beam = (id: string, a: Vector3, b: Vector3, width: number, depth: number,
    material = dark, surface = 'main', kind = 'ship-frame', batch = true) => {
    const delta = b.subtract(a), m = MeshBuilder.CreateBox(`wreck:${id}`, { width, depth, height: delta.length() }, scene);
    m.position.copyFrom(a.add(b).scale(.5));
    m.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), delta.normalize(), new Quaternion());
    m.material = material; worldSurfaceUV(m, 4.5);
    return mark(m, surface, kind, Math.min(a.y,b.y) - width/2, Math.max(a.y,b.y) + width/2, batch);
  };
  const panel = (id: string, points: Vector3[], material: StandardMaterial, surface: string, kind: string) => {
    const data = new VertexData(), m = new Mesh(`wreck:${id}`, scene), normals: number[] = [];
    data.positions = points.flatMap(p => [p.x,p.y,p.z]); data.indices = [];
    for (let i=1;i<points.length-1;i++) data.indices.push(0,i,i+1);
    data.uvs = points.flatMap(p => [(p.x + p.z*.15)/4.5,p.y/4.5]);
    VertexData.ComputeNormals(data.positions,data.indices,normals); data.normals=normals; data.applyToMesh(m);
    m.material = material; return mark(m,surface,kind,Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y)));
  };

  // Curved transverse sections: narrow keel -> bilge -> shoulder -> sheer.
  // Individual strakes reveal thickness and accumulate asymmetric aft damage.
  // The bilge must enclose the existing broad hold floor at -6.4 m. The old
  // narrow V section intersected that playable floor when inspected sideways.
  const bands = [-7.1,-6.55,-5.8,-4.35,S.sternBreachTop,-1.7,-.48,0];
  const fullness = [.19,.92,.955,.97,.99,1,1,1];
  for (const side of [-1,1]) for (let b=0;b<bands.length-1;b++) {
    for (let x=S.sternX;x<S.bowX;x+=1.5) {
      const next=Math.min(S.bowX,x+1.5), low=bands[b]!, high=bands[b+1]!;
      // Canonical submerged stern breach. It has staggered broken edges and
      // exposed ribs, rather than a rectangular transparent decal.
      const breach = side === 1 && x < -28.5 && low < -3.15 && high > -6.55;
      if (breach && (b===1 || b===2 || b===3)) continue;
      const scar = side===1 && x<-25 ? .07*Math.sin(x*4+b*2) : 0;
      panel(`shell:${side}:${b}:${x}`,[at(x,low,side*wreckBeamAt(x)*fullness[b]!+scar),
        at(next,low,side*wreckBeamAt(next)*fullness[b]!),at(next,high-.016,side*wreckBeamAt(next)*fullness[b+1]!),
        at(x,high-.016,side*wreckBeamAt(x)*fullness[b+1]!+scar)], b<3?dark:shell,'c1-hull','ship-hull');
    }
    const strake: Vector3[] = S.stations.map(([x,w])=>at(x,bands[b+1]!-.035,side*w*fullness[b+1]!));
    for(let i=0;i<strake.length-1;i++) {
      if(side===1 && b<4 && strake[i]!.x-S.origin.x<-29)continue;
      beam(`wale:${side}:${b}:${i}`,strake[i]!,strake[i+1]!,.10,.11,b===4?edge:dark,'c1-hull','ship-wale');
    }
  }
  // Exposed curved ribs at the stern fracture give the opening real depth.
  for(const x of [-31.1,-30.2,-28.8]) {
    const points=bands.slice(0,5).map((y,i)=>at(x,y,wreckBeamAt(x)*fullness[i]!-.20));
    for(let i=0;i<points.length-1;i++)beam(`torn-rib:${x}:${i}`,points[i]!,points[i+1]!,.20,.24,edge,'c1-hull','fractured-rib');
  }
  beam('keel',at(-31.3,-7.12,0),at(30.9,-7.12,0),.46,.48,dark,'c1-hull','keel');
  // Real end walls, not an open set of independent parallel side planes.
  // Build convex strakes around the irregular mouth. A triangle fan over
  // the former concave transom polygon crossed the opening diagonally.
  const levels=bands;
  for(let i=0;i<levels.length-1;i++){
    const low=levels[i]!,high=levels[i+1]!,wl=4.2*fullness[i]!,wh=4.2*fullness[i+1]!,open=i>=1&&i<=3;
    if(!open)panel(`transom-whole:${i}`,[at(S.sternX,low,-wl),at(S.sternX,low,wl),at(S.sternX,high,wh),at(S.sternX,high,-wh)],shell,'c1-hull','transom');
    else for(const side of [-1,1]){
      const gl=1.10+.09*Math.sin(i*2.4),gh=1.10+.08*Math.sin((i+1)*2.4);
      panel(`transom-torn:${i}:${side}`,[at(S.sternX,low,side*wl),at(S.sternX,low,side*gl),at(S.sternX,high,side*gh),at(S.sternX,high,side*wh)],shell,'c1-hull','fractured-transom');
    }
  }
  for(let i=0;i<9;i++) {
    const z=(i-4)*.32;
    beam(`breach-splinter:${i}`,at(S.sternX-.01,S.sternBreachTop+.04,z),at(S.sternX-.2-(i%3)*.06,-3.36-(i%4)*.12,z+.07),.055,.08,endgrain,'c1-hull','breach-splinter');
  }
  beam('stem',at(31.3,-5.6,0),at(31.55,3.32,0),.22,.28,edge,'c1-hull','stem');

  const plan=wreckHullPlan(false);
  // Cant bands provide a visible structural edge at each real deck level.
  for (const [surface,min,max,y] of [['main',S.sternDeckEnd,S.bowDeckStart,0],['c3',S.sternX,S.sternDeckEnd,3],['c2',S.bowDeckStart,S.bowX,3]] as const) {
    const outline=clipPlanToRect(surface==='c2'||surface==='c3'?wreckUpperDeckPlan(surface,false):plan,min,-20,max,20);
    if(y===3) {
      // Close the residual half-cell border outside the navigation centres.
      const pieces=[outline];
      for(const [index,piece] of pieces.entries()) {
        if(piece.length<3)continue;
        const d=new VertexData(),positions=piece.flatMap(p=>[p.x+S.origin.x,y-.018+S.listSlope*p.z,p.z+S.origin.z]),indices:number[]=[],normals:number[]=[];
        for(let i=1;i<piece.length-1;i++)indices.push(0,i,i+1);
        d.positions=positions;d.indices=indices;d.uvs=piece.flatMap(p=>[(p.x+S.origin.x)/9,(p.z+S.origin.z)/6]);
        VertexData.ComputeNormals(positions,indices,normals);d.normals=normals;
        const m=new Mesh(`wreck:${surface}:rim-floor:${index}`,scene);d.applyToMesh(m);m.material=stepWood;mark(m,surface,'deck-rim',y-.02,y-.018);
      }
    }
    for(let i=0;i<outline.length;i++) {
      const a=outline[i]!, b=outline[(i+1)%outline.length]!;
      beam(`deck-cant:${surface}:${i}`,at(a.x,y-.18,a.z),at(b.x,y-.18,b.z),.32,.32,edge,surface,'deck-cant');
      if(y===3 && !(Math.abs(a.x-b.x)<.01 && (Math.abs(a.x-S.bowDeckStart)<.1 || Math.abs(a.x-S.sternDeckEnd)<.1)))
        panel(`upper-side:${surface}:${i}`,[at(a.x,0,a.z),at(b.x,0,b.z),at(b.x,2.81,b.z),at(a.x,2.81,a.z)],shell,surface,'upper-side');
      // Raised bulwarks follow the curved vessel, not the tile raster.
      if(Math.abs(a.x-b.x)<.01 && (Math.abs(a.x-S.bowDeckStart)<.1 || Math.abs(a.x-S.sternDeckEnd)<.1))continue;
      const length=Math.hypot(b.x-a.x,b.z-a.z), segments=Math.max(1,Math.ceil(length/1.9));
      for(let n=0;n<segments;n++) {
        const t=n/segments, u=(n+1)/segments, x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        const x2=a.x+(b.x-a.x)*u,z2=a.z+(b.z-a.z)*u;
        if(surface==='main' && z>10 && x<4.5 && x2>1.5)continue; // P01 boarding opening
        // Impact damage propagates from the stern-port grounding; fore rail is
        // also broken where the fallen foremast described in C2 rests.
        if(surface==='c3' && z>0 && x<-26 || surface==='c2' && z<0 && x>26) {
          if(n%2===0)beam(`broken-stanchion:${surface}:${i}:${n}`,at(x,y,z),at(x+.2,y+.45,z+.18),.14,.16,edge,surface,'broken-rail');
          continue;
        }
        beam(`stanchion:${surface}:${i}:${n}`,at(x,y-.2,z),at(x,y+1.02,z),.15,.16,dark,surface,'bulwark');
        const cap=MeshBuilder.CreateCylinder(`wreck:rail-cap:${surface}:${i}:${n}`,{diameter:.24,height:.09,tessellation:8},scene);
        cap.position.copyFrom(at(x,y+1.05,z));cap.material=iron;mark(cap,surface,'rail-cap',y+.99,y+1.10);
        for(const lift of [.23,.67,1.04])beam(`rail:${surface}:${i}:${n}:${lift}`,at(x,y+lift,z),at(x2,y+lift,z2),lift===1.04?.14:.08,.10,lift===1.04?edge:dark,surface,'bulwark');
      }
    }
  }
  // Forecastle/quarterdeck are hollow framed superstructures, with visible
  // transverse risers and a full thickness deck, not stacked hull duplicates.
  for(const [x,surface] of [[S.sternDeckEnd,'c3'],[S.bowDeckStart,'c2']] as const) {
    // Two real doorway recesses align with the canonical rooms beneath this
    // raised deck. A full front panel used to wall off an otherwise open door.
    for(const [a,b] of [[-8.4,-5.25],[-3.75,3.75],[5.25,8.4]])
      panel(`upper-bulkhead:${surface}:${a}`,[at(x,0,a!),at(x,0,b!),at(x,2.77,b!),at(x,2.77,a!)],shell,surface,'upper-bulkhead');
    for(const z of [-4.5,4.5])panel(`door-lintel:${surface}:${z}`,[at(x,2.1,z-.75),at(x,2.1,z+.75),at(x,2.77,z+.75),at(x,2.77,z-.75)],shell,surface,'upper-bulkhead');
    for(const z of [-8,-4,0,4,8])beam(`upper-frame:${surface}:${z}`,at(x-.03,0,z),at(x-.03,2.8,z),.17,.2,edge,surface,'upper-frame');
    beam(`upper-header:${surface}`,at(x,2.8,-8.5),at(x,2.8,8.5),.30,.32,edge,surface,'upper-frame');
  }

  // Grounding damage is localized at aft-port: displaced planking and sheared
  // rail ends continue the exposed ribs below. All splinters stay out of the
  // clear cell centres used for walking and combat.
  for(let i=0;i<19;i++) {
    const x=-31.3+i*.25,z=x< -30 ? 1.2+(x+31.5)*2.4 :x< -27?4.8+(x+30)*1.2:wreckBeamAt(x)-.22;
    const height=3+(i%3)*.065;
    beam(`impact-deck-splinter:${i}`,at(x-.5,height,z-.05),at(x+.24,height+.22+(i%4)*.065,z+.26),.09,.12,endgrain,'c3','grounding-damage');
  }
  for(const side of [-1,1])for(let x=-30;x<31;x+=2.8){
    const w=wreckBeamAt(x);
    for(const y of [-2.8,-2.1,-.9]) {
      const z=side*(w+.045);
      const path=[at(x,y,z),at(x+.17,y-.22,z+side*.03),at(x+.04,y-.61,z+side*.06)];
      const frond=MeshBuilder.CreateTube('wreck:hull-kelp',{path,radius:.026,tessellation:5},scene);frond.material=kelp;mark(frond,'c1-hull','hull-kelp',y-.61,y);
    }
  }
  // Small clustered growth marks the old waterline and explains decades of
  // salt exposure. It is batched by material and never obstructs a deck.
  for(let i=0;i<74;i++){
    const x=-30+(i%37)*1.62,side=i<37?-1:1,z=side*(wreckBeamAt(x)+.055),y=-2.55+(i%5)*.23;
    const shell=MeshBuilder.CreateIcoSphere(`wreck:barnacles:${i}`,{radius:.075+(i%3)*.015,subdivisions:1},scene);
    shell.position.copyFrom(at(x,y,z));shell.scaling.set(1,.8,.46);shell.material=endgrain;mark(shell,'c1-hull','barnacle-growth',y-.1,y+.1);
  }

  for(const f of terrain.structures??[]) {
    if(f.kind!=='stair')continue;
    const axisX=f.direction==='east'||f.direction==='west',sign=f.direction==='west'||f.direction==='north'?-1:1;
    const run=f.runCells*terrain.tileMeters, base=f.baseHeight??0, surface=base<-.2?'lower-deck':'main';
    const start=new Vector3((f.cell.col+(f.direction==='west'?1:f.direction==='east'?0:.5))*1.5,base,
      (f.cell.row+(f.direction==='north'?1:f.direction==='south'?0:.5))*1.5);
    const point=(t:number,side=0,lift=0)=>{const p=start.add(new Vector3(axisX?sign*run*t:side, f.riseMeters*t+lift,axisX?side:sign*run*t));if(base>=0)p.y+=wreckListHeight(p.z);return p;};
    for(let i=0;i<f.steps;i++) {
      const t=(i+.5)/f.steps, height=base+f.riseMeters*t;
      const m=MeshBuilder.CreateBox(`wreck:stair:${f.id}:${i}`,{width:axisX?run/f.steps+.006:1.40,
        depth:axisX?1.40:run/f.steps+.006,height:Math.abs(f.riseMeters)/f.steps+.07},scene);
      m.position.copyFrom(point(t,0,-Math.abs(f.riseMeters)/f.steps/2));m.material=stepWood;worldSurfaceUV(m,4.5);
      mark(m,surface,'stair-tread',height-.32,height,false);
    }
    for(const side of [-.72,.72]) {
      beam(`stringer:${f.id}:${side}`,point(0,side,-.13),point(1,side,-.13),.20,.16,dark,surface,'stair-support',false);
      beam(`handrail:${f.id}:${side}`,point(0,side,.96),point(1,side,.96),.09,.10,edge,surface,'stair-handrail',false);
      for(const t of [0,.33,.66,1])beam(`stair-post:${f.id}:${side}:${t}`,point(t,side,-.12),point(t,side,.96),.10,.10,dark,surface,'stair-post',false);
    }
    if(f.riseMeters<0 && base===0) {
      // The access is an engineered stair box. Its cheeks screen the exterior
      // sea, while the open head and foot remain traversable.
      for(const side of [-.81,.81])panel(`stairwell-cheek:${f.id}:${side}`,[point(0,side,-.23),point(1,side,-.23),point(1,side,-f.riseMeters),point(0,side,0)],dark,'main','stairwell-lining');
      // Show the genuine first landing when the rest of C8 is cut away. The
      // old empty opening exposed the blue clear colour, like a sea rectangle.
      // This is the same authored floor, not a cap across the stair route.
      const col=f.cell.col+(axisX?sign*f.runCells:0),row=f.cell.row+(!axisX?sign*f.runCells:0);
      const tile=terrain.surfaces.find(s=>s.id==='lower-deck')?.tiles.find(t=>t.cell.col===col&&t.cell.row===row);
      if(tile){const points=[new Vector3(col*1.5,tile.corners[0],row*1.5),new Vector3((col+1)*1.5,tile.corners[1],row*1.5),
        new Vector3((col+1)*1.5,tile.corners[2],(row+1)*1.5),new Vector3(col*1.5,tile.corners[3],(row+1)*1.5)];
        const m=panel(`landing-preview:${f.id}`,points,dark,'main','stair-landing-preview');
        m.setVerticesData('uv',points.flatMap(p=>[p.x/9,p.z/6]));}
    }
  }
  // The engineered hatch is a wooden lid with a coaming and real hardware;
  // the former solid blue placeholder could be mistaken for missing floor.
  for(const f of terrain.structures??[])if(f.kind==='hatch'&&f.id!=='c4-shaft'){
    const cx=(f.cell.col+.5)*1.5,cz=(f.cell.row+.5)*1.5,y=f.height;
    for(const side of [-1,1]){
      beam(`hatch-coaming:${f.id}:x:${side}`,new Vector3(cx-.65,y+.08,cz+side*.65),new Vector3(cx+.65,y+.08,cz+side*.65),.10,.12,dark,'main','hatch-frame');
      beam(`hatch-coaming:${f.id}:z:${side}`,new Vector3(cx+side*.65,y+.08,cz-.65),new Vector3(cx+side*.65,y+.08,cz+.65),.10,.12,dark,'main','hatch-frame');
    }
    for(let i=0;i<6;i++)beam(`hatch-lid:${f.id}:${i}`,new Vector3(cx-.5+i*.2,y+.055,cz-.54),new Vector3(cx-.5+i*.2,y+.055,cz+.54),.185,.095,stepWood,'main','hatch-lid');
    for(const side of [-.34,.34])beam(`hatch-hinge:${f.id}:${side}`,new Vector3(cx+side,y+.12,cz-.6),new Vector3(cx+side,y+.12,cz-.29),.075,.045,iron,'main','hatch-hardware');
    const handle=MeshBuilder.CreateTorus(`wreck:hatch-handle:${f.id}`,{diameter:.16,thickness:.025,tessellation:12},scene);
    handle.position.set(cx,y+.13,cz+.35);handle.rotation.x=.55;handle.material=iron;mark(handle,'main','hatch-hardware',y+.05,y+.22);
  }
  // One tapered main mast. The old duplicate crow-mast is no longer rendered.
  const mast=terrain.occluders.find(o=>o.id==='c1-mast')!;
  const mx=(mast.cell.col+.5)*1.5,mz=(mast.cell.row+.5)*1.5;
  const main=MeshBuilder.CreateCylinder('wreck:main-mast',{height:23,diameterBottom:.85,diameterTop:.31,tessellation:14},scene);
  main.position.set(mx,11.5,mz);main.material=dark;mark(main,'main','main-mast',0,23);
  const mastAt=(x:number,y:number,z:number)=>new Vector3(mx+x,y,mz+z);
  for(const y of [.5,1.4,14.55,15.4,20]) {
    const collar=MeshBuilder.CreateTorus(`wreck:mast-collar:${y}`,{diameter:y<2?.89:y<16?.64:.44,thickness:.055,tessellation:16},scene);
    collar.position.set(mx,y,mz);collar.material=iron;mark(collar,'main','mast-collar',y-.03,y+.03);
  }
  for(const side of [-1,1])for(const z of [-1,1])beam(`mast-knee:${side}:${z}`,mastAt(side*.95,.12,z*.65),mastAt(side*.28,1.45,z*.22),.19,.22,edge,'main','mast-knee');
  const crowCenter=new Vector3(S.origin.x,15,S.origin.z);
  // Full circular structural floor; the nav ring is clipped to this same circle.
  const nest=MeshBuilder.CreateCylinder('wreck:cofa-floor',{height:.22,diameter:5.8,tessellation:40},scene);
  nest.position.copyFrom(crowCenter);nest.position.y-=.12;nest.material=stepWood;worldSurfaceUV(nest,4.5);mark(nest,'crow','cofa-floor',14.76,15);
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;
    const p=(angle:number,y:number,r=2.77)=>new Vector3(crowCenter.x+Math.cos(angle)*r,y,crowCenter.z+Math.sin(angle)*r);
    // East-facing entrance follows P10's existing rope ladder cell.
    if(i!==0 && i!==15) {
      beam(`cofa-post:${i}`,p(a,15),p(a,16),.10,.11,dark,'crow','cofa-rail');
      beam(`cofa-rail:${i}`,p(a,15.96),p(b,15.96),.12,.12,edge,'crow','cofa-rail');
      panel(`cofa-kickboard:${i}`,[p(a,15),p(b,15),p(b,15.4),p(a,15.4)],shell,'crow','cofa-rail');
    }
    if(i%2===0)beam(`cofa-bracket:${i}`,mastAt(0,12.9,0),p(a,14.8,2.55),.17,.18,edge,'crow','cofa-bracket');
  }
  const ladderX=S.origin.x+2.25, ladderZ=mz;
  for(const side of [-.48,.48])beam(`ratline-rope:${side}`,new Vector3(ladderX,0,ladderZ+side),new Vector3(ladderX,15.5,ladderZ+side),.035,.035,rope,'main','mast-ladder');
  for(let y=.25;y<15.2;y+=.32)beam(`ratline-rung:${y}`,new Vector3(ladderX,y,ladderZ-.48),new Vector3(ladderX,y,ladderZ+.48),.047,.047,rope,'main','mast-ladder');
  for(const z of [-7.6,7.6]) {
    beam(`standing-rigging:${z}`,mastAt(0,21,0),mastAt(-8,0,z),.025,.025,rope,'main','rigging');
    beam(`standing-rigging-forward:${z}`,mastAt(0,20,0),mastAt(9,0,z),.025,.025,rope,'main','rigging');
  }
  // P01's tattered canvas and hanging rigging show the boarding route from
  // the rowboat. No gangway or invented door is substituted for the canon.
  const boardingRim=wreckBeamAt(2.25);
  for(const side of [-.45,.45])beam(`boarding-rope:${side}`,at(2.25+side,.88,boardingRim),at(2.25+side,S.seaHeight+.22,12.0),.04,.04,rope,'main','boarding-rigging');
  for(let i=0;i<8;i++) {
    const t=i/8,y=.65+(S.seaHeight+.25-.65)*t,z=boardingRim+(12-boardingRim)*t;
    beam(`boarding-ratline:${i}`,at(1.8,y,z),at(2.7,y,z),.035,.045,rope,'main','boarding-rigging');
  }
  for(const y of [10.4,19.8])beam(`yard:${y}`,mastAt(0,y,-4.8),mastAt(0,y,4.8),.16,.16,dark,'main','mast-yard');
  if(textures.sail) {
    const mat=wood('torn-linen','#ada588');mat.diffuseTexture=textures.sail;mat.useAlphaFromDiffuseTexture=true;mat.alphaCutOff=.35;mat.transparencyMode=1;
    for(const [id,x,y,z,w,h,surface] of [['main',mx-.55,10.4,mz,7.2,5.1,'main'],['fore',S.origin.x+33.5,3.5,S.origin.z-4.8,3.4,5.8,'c2']] as const){
      const positions:number[]=[],uvs:number[]=[],indices:number[]=[],normals:number[]=[];
      for(let row=0;row<=8;row++)for(let col=0;col<=6;col++){const u=col/6,v=row/8;const rag=col%3===0?.75:col%3===1?1:.87;positions.push(x+Math.sin(u*4)*v*.19,y-v*h*(v>.75?rag:1),z+(u-.5)*w);uvs.push(u,1-v);
        // Real missing strips and torn lower corners survive a texture audit.
        if(row<8&&col<6&&!(row>2&&col===3)&&!(row>5&&(col===0||col===5))){const n=row*7+col;indices.push(n,n+1,n+7,n+1,n+8,n+7);}}
      const cloth=new Mesh(`wreck:torn-sail:${id}`,scene),data=new VertexData();Object.assign(data,{positions,uvs,indices});VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;data.applyToMesh(cloth,true);
      cloth.material=mat;mark(cloth,surface,'torn-sail',y-h,y,false);
      scene.onBeforeRenderObservable.add(()=>{if(!cloth.isVisible)return;const t=performance.now()/1000;
        for(let row=0;row<=8;row++)for(let col=0;col<=6;col++)positions[(row*7+col)*3]=x+Math.sin(t*1.3+col*.7+row*.27)*row/8*.23;
        cloth.updateVerticesData('position',positions);
      });
    }
  }
  meshes.push(...buildWreckAgeDetails(scene,terrain,textures.hull));
  if(textures.debris){const mat=wood('canonical-c1-debris','#cbc4ad');mat.diffuseTexture=textures.debris;mat.useAlphaFromDiffuseTexture=true;mat.transparencyMode=1;mat.alphaCutOff=.25;
    const m=MeshBuilder.CreateGround('wreck:boots-bones-blood',{width:3.4,height:3.4},scene);m.position.set(41.25,.035,27.75);m.material=mat;mark(m,'main','canonical-deck-debris',0,.04,false);}
  // Canonical fallen foremast and fractured quarterdeck mast. Their bases stay
  // at the collision anchors, and their spars lean out over already broken rail.
  for(const id of ['c2-mast','c3-mast']) {
    const o=terrain.occluders.find(o=>o.id===id);if(!o)continue;
    const a=new Vector3((o.cell.col+.5)*1.5,id==='c2-mast'?3.4:3,(o.cell.row+.5)*1.5);
    const b=a.add(id==='c2-mast'?new Vector3(4.3,.1,-5.3):new Vector3(-1.2,1.8,1));
    beam(id,a,b,.42,.46,dark,id==='c2-mast'?'c2':'c3','broken-mast');
    for(let i=0;i<5;i++)beam(`${id}:splinter:${i}`,b.add(new Vector3((i-2)*.06,-.2,0)),b.add(new Vector3((i-2)*.14,.4+(i%3)*.13,.2)),.045,.055,edge,id==='c2-mast'?'c2':'c3','mast-splinter');
  }
  // Merge by visibility group/material, not by the whole ship. Levels remain
  // independently removable and shadow draw calls stay bounded.
  for(const [key,group] of batches) {
    const metadata={...group[0]!.metadata,bottom:Math.min(...group.map(m=>m.metadata.bottom)),height:Math.max(...group.map(m=>m.metadata.height))};
    const merged=Mesh.MergeMeshes(group,true,true,undefined,false,true);
    if(merged){merged.name=`wreck-batch:${key}`;merged.metadata=metadata;merged.receiveShadows=true;merged.isPickable=false;meshes.push(merged);}
  }
  return meshes;
}
