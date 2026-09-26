import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { CampRestPhase } from '../../../engine/shared/camp-rest.js';
import { illustratedMaterial, mergeDecoration, updateCutaway, worldSurfaceUV, createRestLighting, softPoolMaterial } from '../../../engine/client/diorama-kit.js';
import { createCoastalBackdrop } from '../../../engine/client/coastal-backdrop.js';
import type { CampVisuals } from './visuals.js';

const starts = [4, 9, 14, 19, 24, 29];
const darkness: Record<CampRestPhase, number> = { arrival: .12, dusk: .65, night: .95, dawn: .4, finalization: .12 };
const cell = (col: number, row: number) => new Vector3((col+.5)*1.5,0,(row+.5)*1.5);

/** CANON: six excavated cells, four beds, eight hammocks and open entrances.
 * All surfaces, plants and small personal props below are VTT_AMBIENCE.
 * Existing terrain cells, furniture obstacles and interaction IDs remain authoritative. */
export function createA1Visuals(scene: Scene, definition: PublicSceneDefinition): CampVisuals {
  const root = new TransformNode(`camp-visuals:${definition.id}`,scene);
  root.metadata={content:'CANON',source:'Los Dragones de la Isla de las Tempestades, A1, p. 10',cells:6,beds:4,hammocks:8,openEntrances:6};
  const asset = '/art/a1-hd2d-v1/';
  const material = (name: string, tint: string, texture?: string, repeat=1) => illustratedMaterial(scene,`a1:${name}`,tint,texture?asset+texture+'.webp':undefined,repeat);
  const M = {
    rock:material('cliff','#a4adb0','limestone-v3',1), stone:material('masonry','#dccbb4','masonry',.85),
    floor:material('flagstone','#d0c4ac','flagstone',1.2), earth:material('earth','#bdb097','earth',1.1),
    wood:material('wood','#b5946d','wood'), darkWood:material('dark-wood','#6c5039','wood'),
    linen:material('linen','#ede1c7','linen'), blue:material('blue-cloth','#687f8a','linen'), red:material('red-cloth','#9c6455','linen'),
    metal:material('iron','#424b4e'), brass:material('brass','#ba9250'), paper:material('paper','#d9bd88'),
    leaf:material('leaves','#43604a'), leafLight:material('leaf-tips','#718354'), flower:material('flowers','#d3b56a'),
    glow:material('lamp-glass','#ffce87'), shade:softPoolMaterial(scene,'a1:contact-shadow','#282321',.36), halo:material('interaction-halo','#ffe0a0')
  };
  M.glow.emissiveColor=Color3.FromHexString('#ffba65'); M.halo.emissiveColor=Color3.FromHexString('#ffc56b');
  const warmPool=softPoolMaterial(scene,'a1:warm-bounce','#efad55',.18);
  const backdrop=createCoastalBackdrop(scene,root,asset+'bay-v2.webp');
  const inland=material('inland-scrub','#7c8c79','earth',.8);
  const foliage=material('painted-foliage','#ffffff');
  if(typeof document!=='undefined') { const texture=new Texture(asset+'foliage.webp',scene); texture.hasAlpha=true; foliage.diffuseTexture=texture; foliage.useAlphaFromDiffuseTexture=true; }
  foliage.transparencyMode=Material.MATERIAL_ALPHATEST; foliage.backFaceCulling=false;foliage.twoSidedLighting=true;
  foliage.emissiveTexture=foliage.diffuseTexture;
  foliage.emissiveColor=new Color3(.28,.3,.25);
  const statics: Mesh[]=[], cliffs: Mesh[]=[], walls: {meshes:Mesh[];normal:Vector3;center:Vector3}[]=[], roomLamps:PointLight[]=[], candleLights:PointLight[]=[];
  let bucket=statics;
  function add(mesh:Mesh, at:Vector3, mat:StandardMaterial) { mesh.position.copyFrom(at); mesh.material=mat; mesh.parent=root; mesh.isPickable=false; mesh.checkCollisions=false; bucket.push(mesh); return mesh; }
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:StandardMaterial) { const mesh=add(MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene),new Vector3(x,y,z),mat); if([M.earth,M.floor,M.stone,M.rock].includes(mat))worldSurfaceUV(mesh,mat===M.earth?9:5);return mesh; }
  function sphere(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:StandardMaterial) { const m=add(MeshBuilder.CreateSphere(name,{diameter:1,segments:8},scene),new Vector3(x,y,z),mat);m.scaling.set(w,h,d);return m; }
  function rock(name:string,x:number,y:number,z:number,w:number,h:number,d:number,seed:number) {
    const m=add(MeshBuilder.CreateIcoSphere(name,{radius:.5,subdivisions:3,flat:false},scene),new Vector3(x,y,z),M.rock);
    const positions=m.getVerticesData('position')!,indices=m.getIndices()!,normals:number[]=[];
    for(let v=0;v<positions.length;v+=3){
      const px=positions[v]!,py=positions[v+1]!,pz=positions[v+2]!;
      const n=1+.18*Math.sin(px*7+pz*5+seed)+.09*Math.sin(py*17+seed);
      // Broad fractured planes and slanted strata, rather than repeated egg shapes.
      const plane=(p:number)=>Math.sign(p)*Math.pow(Math.abs(p)*2,.9)*.5;
      positions[v]=plane(px)*w*n+py*.23*w*Math.sin(seed);
      positions[v+1]=plane(py)*h*n;
      positions[v+2]=plane(pz)*d*n+py*.16*d*Math.cos(seed);
    }
    VertexData.ComputeNormals(positions,indices,normals);m.updateVerticesData('position',positions);m.updateVerticesData('normal',normals);
    const colors:number[]=[],tint=.83+.13*Math.sin(seed*2.3);
    for(let i=0;i<positions.length;i+=3)colors.push(tint,tint,tint,1);
    m.setVerticesData('color',colors);worldSurfaceUV(m,6);return m;
  }
  function shadow(x:number,z:number,w:number,d:number) { const m=add(MeshBuilder.CreateDisc('a1:contact',{radius:.5,tessellation:24},scene),new Vector3(x,.032,z),M.shade);m.rotation.x=Math.PI/2;m.scaling.set(w,d,1); }
  function shrub(x:number,z:number,size:number,seed:number,y=0) {
    for(let k=0;k<3;k++){const leaf=add(MeshBuilder.CreatePlane('a1:foliage',{width:size*1.9,height:size*1.1},scene),new Vector3(x,y+size*.48,z),foliage);leaf.rotation.y=seed*.7+k*Math.PI/3;leaf.rotation.z=Math.sin(seed+k)*.13;}
  }
  // Raised geological slice; only the existing front corridor is navigable.
  // A1 is the lower +9 m ledge of Dragon's Rest, with the coast continuing east/west.
  // The extended background remains scenery outside the unchanged navigable cells.
  box('a1:diorama-earth',28.5,-.38,12,128,.72,8.8,M.earth);
  box('a1:front-path',28.5,.005,14.25,128,.035,4.3,M.earth);
  box('a1:flagstone-walk',28.5,.012,12.6,51,.036,1.35,M.floor);
  // A hand-laid apron breaks up the ruler-straight ground without blocking movement.
  for(let i=0;i<47;i++)for(let r=0;r<2;r++){
    const p=box('a1:apron-paver',3.8+i*1.06+(r%2)*.42,.045,12.05+r*.68,.99,.06,.62,M.stone);
    p.rotation.y=Math.sin(i*2.4+r)*.035;
  }
  box('a1:cliff-plinth',28.5,-4.65,7.8,128,9.3,13.3,M.rock);
  // A continuous irregular rock face widens into the water, anchoring the terrace.
  // One light mesh replaces a row of tall rock ellipsoids.
  const coastalFace:Vector3[][]=[];
  for(let layer=0;layer<5;layer++){
    const y=[-.16,-1.8,-4.7,-7.5,-9.5][layer]!,z=[16.6,17.4,19.1,20.2,22.1][layer]!;
    const strip:Vector3[]=[];
    for(let i=0;i<=128;i++)strip.push(new Vector3(-35.5+i,y+Math.sin(i*.45+layer)*.35,z+Math.sin(i*.31)*.85+Math.cos(i*.77+layer)*.32));
    coastalFace.push(strip);
  }
  const face=add(MeshBuilder.CreateRibbon('a1:continuous-coastal-face',{pathArray:coastalFace,sideOrientation:Mesh.DOUBLESIDE},scene),Vector3.Zero(),M.rock);
  // Keep a continuous vertical projection: changing UV axes between noisy normals
  // creates stretched bands on the otherwise continuous coastal ribbon.
  const facePositions=face.getVerticesData('position')!,faceUV:number[]=[];
  for(let i=0;i<facePositions.length;i+=3)faceUV.push(facePositions[i]!/6,facePositions[i+1]!/6);
  face.setVerticesData('uv',faceUV);
  for(let i=0;i<16;i++) {
    const x=3.8+i*3.3+Math.sin(i*2.3)*.6;
    rock('a1:coastal-stratum',x,-2.4-(i%3)*.72,18.2+Math.sin(i*.9),3.7+(i%3)*.7,3.2+(i%4)*.6,2.9,i+40);
    if(i===1||i===7||i===13){rock('a1:tidal-foot',x,-8.8,23+Math.cos(i)*1.3,4.4,2.1,4.6,i+80);rock('a1:tidal-small',x+2,-9,24,1.9,1.2,2.7,i+95);}
  }
  // Plants and rocks stay outside all walkable cells; no new gameplay blockers.
  bucket=cliffs;
  const land=add(MeshBuilder.CreateGround('a1:inland-background',{width:360,height:180},scene),new Vector3(28.5,9,-100),inland);worldSurfaceUV(land,15);
  const upperFace:Vector3[][]=[];
  for(let layer=0;layer<5;layer++){
    const strip:Vector3[]=[];
    for(let i=0;i<=86;i++)strip.push(new Vector3(-35.5+i*1.5,layer===4?9:[0,2,4.7,7.7][layer]!+Math.sin(i*.7+layer)*.2,layer===4?-10:[2.7,.8,-1.5,-5][layer]!+Math.sin(i*.33)*.5));
    upperFace.push(strip);
  }
  const upper=add(MeshBuilder.CreateRibbon('a1:retreat-mountainside',{pathArray:upperFace,sideOrientation:Mesh.DOUBLESIDE},scene),Vector3.Zero(),M.rock);
  const upperPositions=upper.getVerticesData('position')!,upperUV:number[]=[];
  for(let i=0;i<upperPositions.length;i+=3)upperUV.push(upperPositions[i]!/9,upperPositions[i+1]!/9);
  upper.setVerticesData('uv',upperUV);
  for(let i=0;i<19;i++) {
    const x=3.3+i*2.85+Math.sin(i*1.8)*.6, z=-.4+Math.sin(i*1.8)*.75, h=3.1+Math.sin(i*.83)*1.1;
    rock('a1:cliff-ridge',x,h*.38,z,4.2+(i%3)*.7,h,4.3,i+71);
    shrub(x+Math.sin(i)*.8,1.5,1.25+(i%3)*.4,i,Math.max(.3,h*.35));
  }
  for(let i=0;i<14;i++){const x=-10+i*5.7+Math.sin(i*1.37),h=8.5+Math.sin(i*1.71)*1.8;rock('a1:upper-bluff',x,h/2-.8,-2.8+Math.sin(i)*.8,7.8,h,6.8,i+120);shrub(x,-.5,1.9+Math.cos(i)*.5,i,2.7);}
  bucket=statics;
  for(let i=0;i<25;i++){const x=3.8+i*2.05+Math.sin(i*2.73)*.5;shrub(x,16.75+Math.cos(i*1.47)*.2,1.15+(i%4)*.23,i);if(i%3===0)rock('a1:edge-rock',x,-.3,17.4,2.4,1.25,2,i+180);}
  for(const x of [-4,61])for(let i=0;i<4;i++){rock('a1:outer-scrub-rock',x+i*.7,.1,17.8+i*.22,2.1,1.8,2.6,i+210);shrub(x+i,17.4,1.3,i);}
  starts.forEach((start,index)=>{
    const x0=start*1.5, cx=x0+3.75, z0=3, front=12;
    const roomStatics:Mesh[]=[]; bucket=roomStatics; const wallOffset=walls.length;
    box(`a1:room-${index+1}:floor`,cx,.007,7.5,7.25,.035,8.75,M.floor);
    // Each face is batched independently and collapses around floor level.
    const faces=[{x:cx,z:z0,w:7.5,d:.45,n:new Vector3(0,0,-1)}, {x:x0,z:7.5,w:.45,d:9,n:new Vector3(-1,0,0)}, {x:x0+7.5,z:7.5,w:.45,d:9,n:new Vector3(1,0,0)}, {x:cx-2.25,z:front,w:3,d:.45,n:new Vector3(0,0,1)}, {x:cx+2.25,z:front,w:3,d:.45,n:new Vector3(0,0,1)}];
    const frontMeshes:Mesh[]=[];
    faces.forEach((f,j)=>{
      box('a1:wall-foot',f.x,.22,f.z,f.w,.44,f.d,M.stone);
      const face:Mesh[]=j>=3?frontMeshes:[];bucket=face;
      box('a1:excavated-wall',f.x,1.55,f.z,f.w,2.25,f.d,j>=3?M.stone:M.rock);
      if(j===0){
        for(const dx of [-3.1,3.1])box('a1:rear-timber-post',cx+dx,1.36,3.31,.22,2.65,.23,M.wood);
        box('a1:rear-timber-beam',cx,2.54,3.34,6.42,.21,.25,M.wood);
      }
      box('a1:stone-coping',f.x,2.73,f.z,f.w+.08,.18,f.d+.08,j===0?M.rock:M.stone);
      if(j>=3) for(let k=0;k<3;k++) box('a1:front-buttress',f.x-f.w/2+.35+k*1.15,1.35,f.z+.15,.23,2.65,.3,M.stone);
      if(j===3) { bucket=roomStatics; return; }
      const merged=mergeDecoration(scene,root,face,`a1:room-${index+1}:face-${j}`);
      walls.push({meshes:merged,normal:f.n,center:new Vector3(cx,0,7.5)});bucket=roomStatics;
    });
    // Open stone thresholds: no doors, canopies, tents or campfire.
    box('a1:threshold',cx,.024,11.95,1.5,.04,.8,M.floor);
    const at=cell(start+1,4), desk=cell(start+3,4), chair=cell(start+3,5), bedside=cell(start+1,3);
    // Permanent low jambs retain the entrance silhouette while upper walls cut away.
    for(const side of [-1,1]){
      for(let course=0;course<3;course++)box('a1:threshold-jamb',cx+side*1.05,.16+course*.28,11.86,.52,.25,.65,M.stone);
      box('a1:jamb-cap',cx+side*1.05,.94,11.86,.64,.12,.77,M.stone);
    }
    // Wall-mounted storage sits in the already non-walkable border strip.
    for(let shelf=0;shelf<2;shelf++)box('a1:recess-shelf',x0+.74,.92+shelf*.72,9.25,.78,.12,2.2,M.wood);
    const roomCloth=index===2||index===5?M.blue:index===3?M.red:M.linen;
    if(index!==3){
      for(const dx of [-1.6,1.6])box('a1:rear-shelf-upright',cx+dx,1.05,3.64,.14,1.9,.52,M.wood);
      for(let k=0;k<3;k++)box('a1:rear-shelf',cx,.2+k*.65,3.64,3.35,.12,.55,M.wood);
      for(let k=0;k<10;k++){const p=box('a1:stored-books',cx-1.35+k*.27,.48+(k%2)*.66,3.65,.2,.44+(k%3)*.04,.37,index<4?M.paper:roomCloth);p.rotation.z=Math.sin(k)*.07;}
    }
    for(let k=0;k<5;k++){
      const b=box('a1:shelf-book',x0+.77,1.19,8.51+k*.25,.34,.42+(k%2)*.1,.16,roomCloth);b.rotation.x=(k%3-1)*.07;
    }
    box('a1:storage-chest',x0+.82,.36,10.87,1.03,.66,.67,M.wood);
    box('a1:storage-lid',x0+.82,.73,10.87,1.08,.13,.73,index<4?M.darkWood:M.wood);
    for(const side of [-.34,.34])box('a1:chest-binding',x0+.82+side,.43,11.22,.08,.66,.035,M.brass);
    shadow(x0+.82,10.9,1.3,.9);
    // Flat woven rugs enrich the room without suggesting new collision volumes.
    box('a1:woven-rug',cx,.024,9.25,2.05,.025,1.72,roomCloth);
    for(const dz of [-.72,.72])box('a1:rug-border',cx,.04,9.25+dz,1.96,.009,.065,index===5?M.blue:M.linen);
    for(let k=0;k<9;k++)for(const dz of [-.88,.88])box('a1:rug-fringe',cx-.87+k*.215,.035,9.25+dz,.055,.016,.12,index===5?M.blue:M.linen);
    if(index<4){
      // Length extends into the existing bedside obstacle, never the free row in front.
      at.z-=.3;bedside.z-=.44;
      box('a1:bed-frame',at.x,.36,at.z,1.35,.3,2.05,M.darkWood);
      sphere('a1:mattress',at.x,.62,at.z,1.37,.46,2.05,M.linen);
      const duvet:Vector3[][]=[];
      for(let r=0;r<=10;r++) {const row:Vector3[]=[];for(let c=0;c<=12;c++){const dx=-.71+c*.1183,dz=-.38+r*.137;row.push(new Vector3(at.x+dx,.84+.035*Math.cos(c*1.6+r*.8)-Math.max(0,Math.abs(dx)-.51)*1.4,at.z+dz));}duvet.push(row);}
      add(MeshBuilder.CreateRibbon('a1:soft-duvet',{pathArray:duvet,sideOrientation:Mesh.DOUBLESIDE},scene),Vector3.Zero(),index===2?M.blue:index===3?M.red:M.linen);
      sphere('a1:pillow',at.x,.88,at.z-.7,.94,.26,.46,M.linen);
      box('a1:headboard',at.x,.72,at.z-1.01,1.43,1.14,.13,M.wood);
      box('a1:footboard',at.x,.43,at.z+1.02,1.43,.54,.11,M.wood);
      for(const dx of [-.62,.62])for(const dz of [-.96,.96]){box('a1:bed-post',at.x+dx,.49,at.z+dz,.13,.93,.13,M.wood);sphere('a1:bed-finial',at.x+dx,1,at.z+dz,.18,.15,.18,M.brass);}
      box('a1:nightstand',bedside.x,.39,bedside.z,.7,.72,.65,M.wood);
      box('a1:candle-holder',bedside.x,.77,bedside.z,.23,.05,.23,M.brass);
      box('a1:candle',bedside.x,.85,bedside.z,.08,.13,.08,M.linen);
      sphere('a1:candle-flame',bedside.x,.95,bedside.z,.06,.13,.06,M.glow);
      box('a1:desk-top',desk.x,.82,desk.z,1.18,.12,.8,M.wood);
      for(const dx of [-.48,.48])for(const dz of [-.3,.3])box('a1:desk-leg',desk.x+dx,.39,desk.z+dz,.09,.78,.09,M.darkWood);
      box('a1:chair-seat',chair.x,.49,chair.z,.64,.1,.64,M.wood);
      box('a1:chair-back',chair.x,.82,chair.z+.29,.64,.72,.08,M.wood);
      for(const dx of [-.24,.24])for(const dz of [-.24,.24])box('a1:chair-leg',chair.x+dx,.24,chair.z+dz,.08,.48,.08,M.darkWood);
      box('a1:desk-journal',desk.x-.16,.9,desk.z,.42,.07,.32,index===2?M.blue:M.red);
      box('a1:desk-parchment',desk.x+.29,.892,desk.z+.07,.25,.02,.28,M.paper);
      const cup=add(MeshBuilder.CreateCylinder('a1:desk-cup',{height:.18,diameter:.16,tessellation:10},scene),new Vector3(desk.x+.36,.99,desk.z-.23),M.brass);
      cup.rotation.z=.08;
      shadow(at.x,at.z,1.7,2.4);shadow(desk.x,desk.z,1.3,1.1);
      if(index===1) {sphere('a1:tarak-bowl',desk.x,.99,desk.z-.16,.27,.16,.27,M.wood);shrub(bedside.x,bedside.z,.55,2,.72);for(let k=0;k<3;k++)shrub(x0+.6,8.7+k*.56,.45,k,1.73);}
      if(index===2) {box('a1:varnoth-scrolls',desk.x+.27,.95,desk.z-.16,.1,.1,.42,M.paper);box('a1:varnoth-keepsake',bedside.x,.78,bedside.z,.28,.12,.22,M.brass);box('a1:varnoth-folded-cloak',x0+.75,1.78,9.2,.67,.2,1.12,M.blue);}
      if(index===3) {
        const tool=cell(start+2,3);box('a1:myla-workbench',tool.x,.64,tool.z,1.25,1.15,1.05,M.wood);
        for(let k=0;k<8;k++){const x=tool.x-.46+(k%4)*.27,z=tool.z-.28+Math.floor(k/4)*.45;box('a1:myla-tool',x,1.27,z,.13,.13,.32,k%2?M.metal:M.brass);}
        for(let k=0;k<3;k++)box('a1:myla-shelf',cx-.5,1.1+k*.4,3.32,1.9,.1,.32,M.wood);
        for(let k=0;k<7;k++)sphere('a1:myla-parts',cx-1.2+k*.22,1.58,3.32,.14,.22,.13,k%2?M.brass:M.metal);
      }
    }else{
      for(const col of [start+1,start+3])for(const row of [4,5]){
        const p=cell(col,row),path:Vector3[][]=[];
        for(let s=0;s<=12;s++){const t=s/12,z=p.z-.66+t*1.32,y=1.16-Math.sin(t*Math.PI)*.45;path.push([new Vector3(p.x-.36,y,z),new Vector3(p.x+.36,y,z)]);}
        add(MeshBuilder.CreateRibbon(`a1:room-${index+1}:hammock`,{pathArray:path,sideOrientation:Mesh.DOUBLESIDE},scene),Vector3.Zero(),index===4?M.linen:M.blue);
        for(const dz of [-.7,.7])box('a1:hammock-post',p.x,.72,p.z+dz,.07,1.44,.07,M.wood);
        shadow(p.x,p.z,.95,1.45);
      }
    }
    // Warm fixtures are local to their room; this avoids six lamp calculations per surface.
    box('a1:lamp-bracket',cx+1.7,1.8,3.39,.32,.1,.52,M.metal);
    box('a1:lamp-cage',cx+1.7,1.58,3.6,.26,.49,.26,M.brass);
    sphere('a1:lamp-glass',cx+1.7,1.58,3.6,.21,.38,.21,M.glow);
    const light=new PointLight(`room-${index+1}:warm-lamp`,new Vector3(cx+.6,2.3,5.5),scene);light.diffuse=Color3.FromHexString('#ffb969');light.range=12;roomLamps.push(light);
    const pool=add(MeshBuilder.CreateDisc('a1:lamp-bounce',{radius:3.15,tessellation:24},scene),new Vector3(cx+.5,.051,6.5),warmPool);pool.rotation.x=Math.PI/2;pool.scaling.set(.95,1.15,1);
    for(const sign of [-1,1]){const contact=add(MeshBuilder.CreateDisc('a1:wall-contact',{radius:1,tessellation:16},scene),new Vector3(cx+sign*3.27,.046,7.5),M.shade);contact.rotation.x=Math.PI/2;contact.scaling.set(.44,4.15,1);}
    light.includedOnlyMeshes=[...mergeDecoration(scene,root,roomStatics,`a1:room-${index+1}:furniture`,true),...walls.slice(wallOffset).flatMap(w=>w.meshes)]; bucket=statics;
    if(index<4){const candle=new PointLight(`a1:room-${index+1}:candle-light`,new Vector3(bedside.x,1.1,bedside.z),scene);candle.diffuse=Color3.FromHexString('#ffd5a7');candle.range=3.6;candle.includedOnlyMeshes=light.includedOnlyMeshes;candleLights.push(candle);}
  });
  // Welcoming greenery stays beside the open thresholds, outside the entrance cells.
  starts.forEach((start,i)=>{const cx=start*1.5+3.75;add(MeshBuilder.CreateCylinder('a1:threshold-planter',{height:.42,diameterTop:.48,diameterBottom:.32,tessellation:12},scene),new Vector3(cx+1.05,.24,11.76),M.wood);shrub(cx+1.05,11.76,.45,i,.4);});
  const merged=mergeDecoration(scene,root,statics,'a1:static',true),ridge=mergeDecoration(scene,root,cliffs,'a1:ridge',true);
  const lighting=createRestLighting(scene,definition.id);
  // Mobile keeps painted contact shadows; desktop also receives a small sun shadow map.
  if(typeof window!=='undefined' && window.matchMedia('(pointer: fine)').matches) {
    const shadows=new ShadowGenerator(1024,lighting.sun);
    shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=ShadowGenerator.QUALITY_LOW;shadows.bias=.0025;shadows.normalBias=.025;
    const geometry=[...merged,...ridge,...walls.flatMap(w=>w.meshes),...roomLamps.flatMap(l=>l.includedOnlyMeshes)].filter((m,i,a)=>a.indexOf(m)===i);
    geometry.forEach(m=>{m.receiveShadows=true;if(m.material!==M.shade && m.material!==M.floor && m.material!==M.earth && m.material!==foliage && m.material!==warmPool && m.material!==inland)shadows.addShadowCaster(m,false);});
    const glow=new GlowLayer('a1:warm-glow',scene,{mainTextureRatio:.25,blurKernelSize:24});glow.intensity=.28;
    geometry.filter((m):m is Mesh=>m instanceof Mesh && m.material===M.glow).forEach(m=>glow.addIncludedOnlyMesh(m));
  }
  // Disable the generic terrain light stack for A1 only, so the phase palette is authoritative.
  scene.getLightByName('terrain-ambient')?.setEnabled(false);
  for(const light of scene.lights)if(light.name.startsWith(`light:${definition.id}-`))light.setEnabled(false);
  const rings=definition.camp!.interactionPoints.map(p=>{
    const ring=MeshBuilder.CreateTorus(`${p.id}:dm-interaction-halo`,{diameter:1.1,thickness:.05,tessellation:24},scene);ring.position=cell(p.cell.col,p.cell.row);ring.position.y=.08;ring.material=M.halo;ring.parent=root;ring.isPickable=false;ring.visibility=0;return ring;
  });
  let highlights=false,lastTime=0;
  const update=(time:number,phase?:CampRestPhase|null)=>{
    const dark=darkness[phase??'arrival'],day=1-dark,dt=Math.min(.1,Math.max(.016,time-lastTime));lastTime=time;
    lighting.update(dark);
    roomLamps.forEach((l,i)=>l.intensity=.82+dark*2.1+Math.sin(time*2.1+i)*.018);
    candleLights.forEach((l,i)=>l.intensity=.16+dark*.34+Math.sin(time*1.7+i)*.012);
    warmPool.alpha=.16+dark*.23;backdrop.update(time,dark);
    foliage.emissiveColor.set(.16+day*.13,.2+day*.12,.22+day*.06);
    scene.clearColor.set(.075+day*.075,.12+day*.08,.18+day*.08,1);
    scene.fogMode=0;
    const camera=scene.activeCamera;if(camera){const pos=camera.globalPosition;for(const wall of walls){const dir=pos.subtract(wall.center);dir.y=0;dir.normalize();updateCutaway(wall.meshes,Vector3.Dot(wall.normal,dir),dt);}const behind=pos.z<3;ridge.forEach(m=>{
      // Alpha-tested leaves must disappear cleanly, not become pale translucent silhouettes.
      if(m.material===foliage)m.visibility=behind?0:1;
      else {m.visibility+=((behind?0:1)-m.visibility)*Math.min(1,dt*10);if(m.visibility<.005)m.visibility=0;}
    });}
    rings.forEach((r,i)=>r.visibility=highlights?.58+Math.sin(time*2+i)*.06:0);
  };
  update(0,'arrival');
  return {root,update,setInteractionHighlights:enabled=>{highlights=enabled;}};
}
