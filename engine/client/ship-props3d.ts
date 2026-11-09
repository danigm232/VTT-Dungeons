import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { PublicProp } from '../shared/protocol.js';
import { worldSurfaceUV, softPoolMaterial } from './diorama-kit.js';
import { wornTimberRelief } from './wreck-materials.js';
import { WRECK_STRUCTURE } from '../shared/wreck-structure.js';

// Decorative geometry only. Walkability, barriers and interactions remain
// entirely server-authoritative; none of these meshes can be picked or collide.
const palette = {
  timber: '#73583e', dark: '#342b27', edge: '#a48358', canvas: '#59483a', blanket: '#544d3e',
  iron: '#485354', rust: '#985d3d', bone: '#998d74', gold: '#b99955',
  glass: '#5b9c9d', rope: '#b7a47b', shadow: '#242c2d'
} as const;
type MaterialName = keyof typeof palette;
const materialCache = new WeakMap<Scene, Map<string, StandardMaterial>>();
function material(scene: Scene, name: MaterialName, woodTexture?: BaseTexture) {
  let cache = materialCache.get(scene);
  if (!cache) { cache = new Map(); materialCache.set(scene, cache); }
  const wooden=name==='timber'||name==='edge'||name==='dark';
  const key = `${name}:${wooden ? woodTexture?.uniqueId ?? 'plain' : 'shared'}`;
  let result = cache.get(key);
  if (!result) {
    result = new StandardMaterial(`ship-prop:${name}`, scene);
    result.diffuseColor = Color3.FromHexString(palette[name]);
    if (wooden && woodTexture) {
      result.diffuseTexture = woodTexture;
      result.diffuseColor = Color3.FromHexString(name === 'timber' ? '#c4b395' : name==='dark'?'#8a8370':'#b69a71');
      wornTimberRelief(scene,result);
    }
    if(typeof document!=='undefined' && (name==='canvas'||name==='blanket')){
      const textile=new DynamicTexture(`ship-prop:${name}:salt-worn-linen`,{width:128,height:128},scene,false);
      const ctx=textile.getContext();ctx.fillStyle=name==='canvas'?'#887963':'#77715c';ctx.fillRect(0,0,128,128);
      for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){
        const worn=Math.sin(x*.37+y*.51)*Math.cos(x*.09-y*.17);
        ctx.fillStyle=worn>.4?'rgba(191,181,148,.14)':'rgba(40,48,35,.13)';ctx.fillRect(x,y,1,2);
      }
      for(let i=0;i<11;i++){ctx.fillStyle='rgba(37,47,37,.09)';ctx.fillRect((i*37)%128,(i*53)%128,17+i%5,7+i%3);}
      textile.update();result.diffuseTexture=textile;result.diffuseColor=Color3.White();
    }
    result.specularColor = name === 'iron' || name === 'gold' || name === 'glass'
      ? Color3.FromHexString('#4e5251') : Color3.FromHexString('#111614');
    cache.set(key, result);
  }
  return result;
}

export function shipPropVisualKey(prop: PublicProp) {
  return [prop.id, prop.kind, prop.rotation, prop.structure,
    prop.kind === 'door' ? prop.state : prop.kind === 'wheel' ? `${prop.state}:${prop.attachment}` : '',
    prop.kind !== 'wheel' && prop.interaction ? JSON.stringify(prop.interaction) : ''].join(':');
}

export function buildShipPropVisual(scene: Scene, prop: PublicProp, width: number, depth: number, woodTexture?: BaseTexture): TransformNode {
  const root = new TransformNode(`ship-prop:${prop.id}`, scene);
  root.metadata = { visualKey: shipPropVisualKey(prop) };
  let serial = 0;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, color: MaterialName) => {
    const mesh = MeshBuilder.CreateBox(`${prop.id}:${name}:${serial++}`, { width: w, height: h, depth: d }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(scene, color, woodTexture); mesh.isPickable = false;
    mesh.receiveShadows=true;if(woodTexture && (color==='timber'||color==='edge'))worldSurfaceUV(mesh,4.5);
    return mesh;
  };
  const cylinder = (name: string, x: number, y: number, z: number, diameter: number, height: number, color: MaterialName, tessellation = 12) => {
    const mesh = MeshBuilder.CreateCylinder(`${prop.id}:${name}:${serial++}`, { diameter, height, tessellation }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(scene, color, woodTexture); mesh.isPickable = false;
    mesh.receiveShadows=true;if(woodTexture && (color==='timber'||color==='edge'))worldSurfaceUV(mesh,4.5);
    return mesh;
  };
  const torus = (name: string, x: number, y: number, z: number, diameter: number, thickness: number, color: MaterialName) => {
    const mesh = MeshBuilder.CreateTorus(`${prop.id}:${name}:${serial++}`, { diameter, thickness, tessellation: 20 }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(scene, color, woodTexture); mesh.isPickable = false;
    return mesh;
  };
  const plank = (name: string, x: number, y: number, z: number, w: number, d: number) => {
    box(name, x, y, z, w, .12, d, 'timber');
    box(`${name}-rim`, x, y + .065, z, w, .025, d, 'edge');
  };
  const leg = (x: number, z: number, h: number) => box('leg', x, h / 2, z, .12, h, .12, 'dark');
  const cloth=(name:string,x:number,y:number,z:number,w:number,d:number,color:MaterialName)=>{
    const m=new Mesh(`${prop.id}:${name}:${serial++}`,scene),v=new VertexData(),p:number[]=[],ind:number[]=[],uv:number[]=[],ns:number[]=[];
    for(let row=0;row<=4;row++)for(let col=0;col<=8;col++){
      const a=col/8,b=row/4,sag=-.045*Math.sin(a*Math.PI)*Math.sin(b*Math.PI),fold=.012*Math.sin(a*24+b*13);
      p.push(x+(a-.5)*w,y+sag+fold,z+(b-.5)*d);uv.push(a,b);if(row<4&&col<8){const i=row*9+col;ind.push(i,i+1,i+9,i+1,i+10,i+9);}
    }
    v.positions=p;v.indices=ind;v.uvs=uv;VertexData.ComputeNormals(p,ind,ns);v.normals=ns;v.applyToMesh(m);m.parent=root;m.material=material(scene,color,woodTexture);m.isPickable=false;m.receiveShadows=true;return m;
  };
  const id = prop.id;

  if (prop.kind === 'door') {
    // Hinged panel, iron straps, latch, and C4's removable transverse bar.
    box('frame-left', -.665, 1.03, 0, .17, 2.06, .20, 'dark');
    box('frame-right', .665, 1.03, 0, .17, 2.06, .20, 'dark');
    box('lintel', 0, 2.05, 0, 1.54, .14, .25, 'edge');
    box('header-infill',0,2.27,0,1.54,.32,.16,'timber');
    const open = prop.state === 'open';
    const panel = box('hinged-leaf', open ? -.64 : 0, 1.0, open ? -.54 : 0, open ? .16 : 1.16, 1.92, open ? 1.16 : .13, 'timber');
    panel.rotation.y = open ? -.08 : 0;
    for (const y of [.32, 1.6]) box('iron-strap', open ? -.54 : 0, y, open ? -.48 : -.09,
      open ? .17 : .96, .075, open ? .92 : .055, 'iron');
    cylinder('latch', open ? -.54 : .32, 1, open ? -.14 : -.16, .12, .08, 'gold');
    if (prop.interaction?.kind === 'barred-door' && prop.interaction.barrier === 'barred')
      box('wooden-bar', 0, 1.18, -.22, 1.34, .17, .17, 'edge');
  } else if (prop.kind === 'wheel') {
    plank('wheel-plinth', 0, .09, .10, .72, .82);
    box('pedestal', 0, .51, .10, .24, 1.02, .27, 'timber');
    for(const side of [-1,1]){const brace=box('helm-brace',side*.24,.32,.10,.10,.60,.17,'dark');brace.rotation.z=side*-.45;}
    cylinder('helm-axle',0,1.3,.12,.12,.38,'iron').rotation.x=Math.PI/2;
    for (const y of [.25, .8]) box('pedestal-band', 0, y, -.015, .32, .065, .31, 'iron');
    const ring = torus('wheel-rim', 0, 1.3, 0, .97, .09, 'edge');
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const spoke = box('spoke', Math.sin(a) * .28, 1.3 + Math.cos(a) * .28, 0, .065, .64, .07, 'timber');
      spoke.rotation.z = -a;
      const handle = cylinder('handle', Math.sin(a) * .58, 1.3 + Math.cos(a) * .58, 0, .09, .2, 'edge');
      handle.rotation.z = -a;
      const rivet = cylinder('rim-rivet', Math.sin(a) * .475, 1.3 + Math.cos(a) * .475, -.055, .045, .035, 'iron', 8);
      rivet.rotation.x = Math.PI / 2;
    }
    cylinder('hub', 0, 1.3, 0, .23, .20, 'iron').rotation.x = Math.PI / 2;
    root.rotation.z = prop.state === 'fallen' ? 1.1 : .10;
    if(typeof document!=='undefined') {
      const tex=new DynamicTexture('wreck:wheel-inlaid-name',{width:512,height:128},scene,false);
      const ctx=tex.getContext() as CanvasRenderingContext2D;ctx.clearRect(0,0,512,128);ctx.fillStyle='#d8d2ae';ctx.textAlign='center';ctx.font='38px Georgia';
      ctx.fillText('Rosa de los Vientos',256,78);tex.hasAlpha=true;tex.update();
      const inlayMat=new StandardMaterial('wreck:wheel-mother-of-pearl',scene);inlayMat.diffuseTexture=tex;inlayMat.useAlphaFromDiffuseTexture=true;inlayMat.specularColor=Color3.FromHexString('#4c5048');
      const inlay=MeshBuilder.CreatePlane('wreck:wheel-upside-down-name',{width:.8,height:.20},scene);inlay.position.set(0,1.28,-.12);inlay.rotation.z=Math.PI;
      inlay.material=inlayMat;inlay.parent=root;inlay.isPickable=false;
    }
  } else if (id.includes('ballista')) {
    for (const side of [-1, 1]) {
      plank('carriage-foot', 0, .12, side * .42, 1.65, .2);
      const brace = box('carriage-brace', side * .39, .5, 0, .16, .94, .2, 'timber');
      brace.rotation.z = side * -.5;
      cylinder('torsion-drum', side * .87, 1.08, 0, .28, .52, 'dark');
      for (let turn = 0; turn < 5; turn++) torus('torsion-binding', side * .87, .88 + turn * .075, 0, .3, .035, 'rope');
      box('stock-band', side * .58, 1.13, 0, .075, .28, .42, 'iron');
    }
    box('stand', 0, .55, 0, .4, 1.1, .4, 'dark');
    box('stock', 0, 1.12, 0, Math.min(width, 2.9), .24, .38, 'timber');
    const brokenStock=box('fractured-stock',.70,1.22,.11,.83,.08,.13,'rust');brokenStock.rotation.y=.23;brokenStock.rotation.z=-.14;
    for (const side of [-1, 1]) {
      const arm = box('spring-arm', side * .73, 1.17, side * .45, 1.45, .16, .12, 'edge');
      arm.rotation.y = side * .48;arm.rotation.z=side<0?-.18:.08;
    }
    for(const side of [-1,1]){const brokenString=box('snapped-bowstring',side*.95,1.02,-.7,.84,.019,.019,'rope');brokenString.rotation.z=side*.35;}
    torus('winch', -.5, 1.12, .32, .38, .07, 'rust');
  } else if (id.includes('bowsprit') || id.includes('flotsam') || id.includes('debris')) {
    for (let i = 0; i < (id.includes('bowsprit') ? 3 : 5); i++) {
      const beam = box('splinter', (i - 2) * .15, .16 + i * .045, (i % 2 - .5) * .35,
        Math.max(.48, width * (.5 + (i % 3) * .13)), .13, .17, i % 3 === 0 ? 'edge' : 'timber');
      beam.rotation.y = (i - 2) * .26;
    }
    if (id.includes('flotsam')) torus('loose-rope', 0, .29, .25, .55, .06, 'rope');
    if(id.startsWith('c9-debris')){
      for(const side of [-1,1]){const sideBoard=box('broken-cargo-stave',side*.27,.20,0,.065,.37,.70,'dark');sideBoard.rotation.z=side*.13;}
      const hoop=torus('broken-cargo-hoop',.05,.15,0,.56,.035,'rust');hoop.rotation.z=.35;
      box('cargo-hessian',-.12,.09,.15,.43,.065,.31,'canvas');
    }
  } else if (id.includes('bookshelf')) {
    box('back', 0, 1.05, .28, Math.min(width, 1.35), 2.1, .13, 'dark');
    for (const y of [.12, .8, 1.48]) plank('shelf', 0, y, 0, Math.min(width, 1.35), .53);
    const brokenShelf=box('collapsed-shelf',.22,.22,-.24,.92,.09,.47,'timber');brokenShelf.rotation.z=.13;
    for (const x of [-.58, .58]) box('upright', x, 1.05, 0, .12, 2.1, .56, 'timber');
    for (let i = 0; i < 12; i++) box('waterlogged-book', -.5 + (i % 7) * .155, i < 7 ? .49 : 1.17,
      -.09, .11, .48 + (i % 3) * .03, .28, i % 4 === 0 ? 'canvas' : i % 3 === 0 ? 'rust' : 'dark');
    for(let i=0;i<4;i++){
      const scroll=cylinder('waterlogged-scroll',-.35+i*.22,i<2?.84:1.53,-.1,.10,.32,'canvas',8);scroll.rotation.z=Math.PI/2;scroll.rotation.y=i*.08;
      box('frayed-scroll-end',-.44+i*.22,i<2?.82:1.51,-.13,.19,.012,.15,'blanket');
    }
  } else if (id.includes('desk') || id.includes('counter') || id.includes('table')) {
    const w = Math.min(width * .88, id.includes('c7-table') ? 5.4 : 3.8), d = Math.min(depth * .76, 1.5);
    plank('worktop', 0, .84, 0, w, d);
    for (const x of [-w / 2 + .16, w / 2 - .16]) for (const z of [-d / 2 + .13, d / 2 - .13]) {
      // The captain's polished desk barely stands on three legs in C4.
      if (id.includes('c4-desk') && x > 0 && z > 0) continue;
      leg(x, z, .8);
    }
    if (id.includes('desk')) {
      box('chart', -.35, .925, 0, .55, .008, .4, 'canvas');
    } else if (!id.includes('counter')) {
      // C7 crockery is broken on the floor, not a pristine laid table.
      for(let i=0;i<5;i++) {
        const joint=box('table-plank-joint',-w*.4+i*w*.2,.916,0,.012,.012,d*.94,'dark');joint.rotation.y=.003*(i-2);
      }
    }
    // Framed drawers belong to the desk; kitchen stays an empty counter.
    if(id.includes('c4-desk')){
      box('drawer-apron',w*.19,.68,-d*.45,w*.50,.24,.09,'dark');
      for(const side of [-1,1]){
        box('drawer-front',w*(.19+side*.115),.69,-d*.50,w*.21,.16,.05,'timber');
        torus('drawer-pull',w*(.19+side*.115),.69,-d*.535,.075,.014,'iron').rotation.x=Math.PI/2;
      }
    }
    for(const side of [-1,1])box('table-apron',0,.72,side*(d/2-.09),w*.90,.13,.09,'dark');
  } else if (id.includes('bed') || id.includes('bunk')) {
    const w = Math.min(width * .8, 2.6), d = Math.min(depth * .76, 1.1);
    plank('bed-frame', 0, .43, 0, w, d);
    if(id.includes('c4-bed')) {
      for(const side of [-1,1]){
        const sag=box('sagging-mattress',side*w*.23,.50,0,w*.46,.10,d-.12,'canvas');sag.rotation.z=side*.075;
        const sheet=box('rotting-sheet',side*w*.17,.56,0,w*.39,.028,d-.18,'blanket');sheet.rotation.z=side*.09;
      }
    }else{
      box('mattress', 0, .53, 0, w - .14, .12, d - .12, 'canvas');
    }
    cloth('creased-rotting-sheet',w*.11,.655,0,w*.62,d-.18,'blanket');
    const pillow=MeshBuilder.CreateSphere(`${prop.id}:collapsed-pillow`,{diameter:1,segments:8},scene);
    pillow.parent=root;pillow.position.set(-w*.30,.635,0);pillow.scaling.set(.40,.105,d-.24);pillow.material=material(scene,'canvas');pillow.isPickable=false;pillow.receiveShadows=true;
    for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-d / 2 + .1, d / 2 - .1]) leg(x, z, .43);
    if (id.includes('bunk')) {
      plank('upper-frame', 0, 1.55, 0, w, d);
      box('upper-mattress', 0, 1.66, 0, w - .14, .11, d - .12, 'canvas');
      cloth('upper-creased-sheet',w*.12,1.78,0,w*.58,d-.18,'blanket');
      for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-d / 2 + .1, d / 2 - .1])
        box('bunk-post', x, 1, z, .08, 1.85, .08, 'dark');
      for(const height of [.59,1.72]){
        const fold=box('linen-fold',w*.19,height+.045,d*.27,w*.43,.025,.12,'blanket');fold.rotation.z=.035;
        for(let i=0;i<3;i++){const rag=box('frayed-linen',w*.05+i*.17,height-.055,-d*.37,.08,.17+i*.015,.02,'canvas');rag.rotation.z=.08*(i-1);}
      }
    }
  } else if (id.includes('chair')) {
    plank('seat', 0, .48, 0, .62, .61);
    for (const x of [-.24, .24]) for (const z of [-.24, .24]) if(!(id.endsWith('04')&&x>0&&z>0))leg(x, z, .47);
    const back=box('backrest', 0, .94, .28, .62, .9, .11, 'timber');back.rotation.z=id.endsWith('02')?.12:id.endsWith('04')?-.08:0;
    for(const side of [-1,1])box('chair-stretcher',0,.21,side*.23,.53,.06,.065,'timber');
  } else if (id.includes('skeleton')) {
    const spine=box('spine',-.4,.60,0,.055,.58,.065,'bone');spine.rotation.z=-.19;
    for (let i = 0; i < 4; i++) {
      const rib = torus('rib', -.4+i*.018, .5+i*.105, 0, .3-i*.025, .028, 'bone');
      rib.scaling.z=.7;
    }
    for (const side of [-1, 1]) {
      const legBone=box('leg-bone',-.15,.18,side*.10,.48,.045,.05,'bone');legBone.rotation.z=-.18;
      const arm=box('arm-bone',-.33,.75,side*.22,.40,.045,.05,'bone');arm.rotation.z=.25;
    }
    // No skull: it is explicitly headless and propped against C5's counter.
  } else if (id.includes('barrel')) {
    cylinder('staves', 0, .49, 0, .69, .98, 'timber', 10);
    for (const y of [.17, .76]) torus('iron-hoop', 0, y, 0, .68, .075, 'rust');
    cylinder('barrel-head', 0, .99, 0, .65, .04, 'dark', 10);
  } else if (id.includes('chest')) {
    const open = prop.kind === 'crate' && prop.interaction?.kind === 'chest' && prop.interaction.open;
    box('iron-chest', 0, .38, 0, 1.12, .67, .77, 'dark');
    for (const x of [-.44, .44]) box('iron-band', x, .39, -.4, .1, .73, .07, 'iron');
    const lid = box('chest-lid', 0, open ? .83 : .76, open ? .4 : 0, 1.18, .17, .81, 'iron');
    if (open) lid.rotation.x = .9;
    box('lock', 0, .38, -.43, .19, .23, .06, 'gold');
    for(const x of [-.47,.47])for(const y of [.19,.57]){
      const rivet=cylinder('corroded-rivet',x,y,-.448,.045,.027,'rust',6);rivet.rotation.x=Math.PI/2;
    }
    for(const side of [-1,1])box('iron-end-brace',side*.572,.37,0,.025,.55,.66,'iron');
    if(open&&id==='c9-iron-chest'){
      // Canonical contents are visible only after the authoritative chest
      // opens. These meshes are not additional pickups or duplicated loot.
      for(const side of [-1,1]){
        box('elven-boot',side*.17,.72,-.10,.15,.12,.32,'canvas');
        const toe=box('elven-boot-point',side*.17,.74,-.27,.11,.05,.13,'edge');toe.rotation.x=-.12;
      }
      if(prop.interaction?.kind==='chest'&&prop.interaction.package!=='taken'){
        const y=prop.interaction.package==='released'?3.6:.89;
        box('waxed-logbook-package',0,y,.16,.48,.15,.34,'canvas');
        for(const x of [-.15,.15])box('package-binding',x,y+.083,.16,.018,.012,.36,'rope');
      }
    }
  } else if (id.includes('stash')) {
    plank('loose-floorboard', 0, .11, 0, Math.min(width * .8, 1.25), .5);
    for (const x of [-.35, .35]) cylinder('nail', x, .19, 0, .035, .02, 'iron');
  } else {
    const open = prop.kind === 'crate' && prop.interaction?.kind === 'container' && prop.interaction.open;
    const w = Math.min(width * .78, 1.25), d = Math.min(depth * .78, 1.25);
    box('crate-body', 0, .35, 0, w, .69, d, 'timber');
    for (const x of [-w * .38, w * .38]) box('crate-band', x, .35, -d / 2 - .01, .08, .67, .06, 'dark');
    if (!open) plank('lid', 0, .75, 0, w + .07, d + .07);
    else box('open-lid', 0, 1.12, d / 2, w + .07, .1, d + .07, 'edge').rotation.x = .95;
  }
  // C4-C7 doors fill a north-south opening (the adjoining bulkheads have
  // axis z). Rotate the whole hinged frame, not only the leaf: otherwise the
  // panel cuts across the passage instead of sitting in its wall.
  root.rotation.y += prop.rotation * Math.PI / 180 + (prop.kind === 'door' && /^c[4-7]-/.test(prop.id) ? Math.PI / 2 : 0);
  const floating=prop.surfaceId==='lower-deck'&&['c8-container-01','c8-barrel-03'].includes(prop.id);
  if(floating){
    // Small drift stays inside the original obstacle footprint. No cargo,
    // collision or treasure state moves: these are two floating C8 objects.
    const observer=scene.onBeforeRenderObservable.add(()=>{
      const floor=root.metadata?.floorHeight;if(!Number.isFinite(floor)||!root.isEnabled())return;
      const time=performance.now()*.0008+(prop.id.includes('barrel')?2:0);
      root.position.y=Math.max(floor,WRECK_STRUCTURE.seaHeight-(prop.id.includes('barrel')?.34:.15))+Math.sin(time)*.016;
      root.rotation.x=Math.sin(time*.7)*.012;root.rotation.z=Math.cos(time*.83)*.009;
    });
    root.onDisposeObservable.add(()=>scene.onBeforeRenderObservable.remove(observer));
  }
  if(typeof document!=='undefined'&&!floating) {
    const cache=materialCache.get(scene)!;
    let shadow=cache.get('contact-ao');if(!shadow){shadow=softPoolMaterial(scene,'ship-prop:contact-ao','#11191a',.55);cache.set('contact-ao',shadow);}
    const inverse=root.computeWorldMatrix(true).clone().invert();
    const parts=root.getChildMeshes().map(mesh=>{
      mesh.computeWorldMatrix(true);
      return {box:mesh.getBoundingInfo().boundingBox,leg:mesh.name.includes(':leg:')};
    });
    const feet=parts.filter(p=>p.leg),lowest=Math.min(...parts.map(p=>p.box.minimumWorld.y));
    const supports=feet.length?feet:parts.filter(p=>p.box.minimumWorld.y<=Math.max(.075,lowest+.025));
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[],normals:number[]=[];
    const slope=prop.surfaceId==='hold-air'||prop.surfaceId==='sea'?0:WRECK_STRUCTURE.listSlope;
    for(const {box} of supports){
      const min=box.minimumWorld,max=box.maximumWorld,padding=.20,n=positions.length/3;
      for(const [x,z] of [[min.x-padding,min.z-padding],[max.x+padding,min.z-padding],
        [max.x+padding,max.z+padding],[min.x-padding,max.z+padding]] as const){
        const p=Vector3.TransformCoordinates(new Vector3(x,.025+z*slope,z),inverse);
        positions.push(p.x,p.y,p.z);
      }
      uvs.push(0,0,1,0,1,1,0,1);indices.push(n,n+1,n+2,n,n+2,n+3);
    }
    if(indices.length){
      const pool=new Mesh(`${prop.id}:contact-shadow`,scene),data=new VertexData();
      VertexData.ComputeNormals(positions,indices,normals);
      Object.assign(data,{positions,uvs,indices,normals});data.applyToMesh(pool);
      pool.parent=root;pool.material=shadow;pool.isPickable=false;pool.metadata={visualOnly:true};
    }
  }
  return root;
}

/** Physical unlit pickup: charred linen wraps on a timber handle, no flame,
 * lamp light, floating icon or ring. Shared pickup state decides its lifetime. */
export function buildShipTorch(scene:Scene):TransformNode {
  const root=new TransformNode('wreck:unlit-torch',scene);
  const handle=MeshBuilder.CreateCylinder('wreck:torch-handle',{height:.68,diameter:.055,tessellation:8},scene);
  handle.parent=root;handle.rotation.z=Math.PI/2;handle.position.set(-.08,.06,0);handle.material=material(scene,'timber');
  const head=MeshBuilder.CreateCylinder('wreck:torch-charred-wrapping',{height:.19,diameterTop:.095,diameterBottom:.077,tessellation:8},scene);
  head.parent=root;head.rotation.z=Math.PI/2;head.position.set(.3,.066,0);head.material=material(scene,'dark');
  for(let i=0;i<5;i++){
    const band=MeshBuilder.CreateTorus('wreck:torch-binding',{diameter:.086,thickness:.013,tessellation:10},scene);
    band.parent=root;band.rotation.z=Math.PI/2;band.position.set(.24+i*.031,.066,0);band.material=material(scene,'blanket');
  }
  for(const mesh of root.getChildMeshes()){mesh.isPickable=false;mesh.receiveShadows=true;}
  root.rotation.y=.38;return root;
}

/** Pickups are small real objects, not HUD diamonds floating over the deck.
 * The original pickup id/cell still owns reach, inventory and persistence. */
export function buildShipPickup(scene:Scene,id:string,kind:string):TransformNode {
  if(kind==='unlit-torch')return buildShipTorch(scene);
  const root=new TransformNode(`wreck:pickup:${id}`,scene);
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:MaterialName)=>{
    const m=MeshBuilder.CreateBox(`wreck:pickup:${id}:${name}`,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.parent=root;m.material=material(scene,color);return m;
  };
  const ring=(name:string,diameter:number,thickness:number)=>{
    const m=MeshBuilder.CreateTorus(`wreck:pickup:${id}:${name}`,{diameter,thickness,tessellation:20},scene);
    m.position.y=.035;m.parent=root;m.material=material(scene,'gold');return m;
  };
  if(/bracelet|earring/.test(id)){
    ring('jewellery',id.includes('bracelet')?.24:.14,.027);box('clasp',.085,.045,0,.055,.04,.055,'gold');
  }else if(/tiger-eye|heliotrope/.test(id)){
    const m=MeshBuilder.CreatePolyhedron(`wreck:pickup:${id}:gem`,{type:1,size:.12},scene);m.scaling.y=.48;m.position.y=.06;
    m.parent=root;m.material=material(scene,id.includes('heliotrope')?'glass':'gold');
    if(id.includes('heliotrope'))box('red-inclusion',.035,.09,0,.018,.008,.03,'rust');
  }else if(id.includes('compass')){
    const m=MeshBuilder.CreateCylinder(`wreck:pickup:${id}:compass`,{diameter:.25,height:.04,tessellation:20},scene);
    m.parent=root;m.position.y=.04;m.material=material(scene,'gold');
    const needle=box('needle',0,.065,0,.015,.008,.16,'rust');needle.rotation.y=.65;ring('case-rim',.235,.014);
  }else if(id.includes('dagger')){
    box('blade',0,.025,-.09,.06,.018,.32,'iron');box('grip',0,.027,.14,.045,.037,.13,'timber');box('guard',0,.027,.06,.17,.025,.026,'gold');
  }else if(id.includes('cartographer')){
    box('tool-roll',0,.035,0,.48,.045,.31,'canvas');box('ruler',-.10,.067,0,.035,.015,.25,'timber');
    for(const side of [-1,1]){const arm=box('dividers',.08+side*.034,.068,0,.013,.012,.21,'iron');arm.rotation.y=side*.35;}
  }else{
    const m=MeshBuilder.CreateSphere(`wreck:pickup:${id}:purse`,{diameter:.3,segments:8},scene);m.parent=root;m.position.y=.13;m.scaling.set(1,.72,.8);m.material=material(scene,'canvas');
    ring('purse-binding',.12,.02).position.y=.245;box('purse-cord',0,.25,0,.14,.025,.02,'rope');
  }
  root.rotation.y=.37;
  for(const m of root.getChildMeshes()){m.isPickable=false;m.receiveShadows=true;}
  return root;
}
