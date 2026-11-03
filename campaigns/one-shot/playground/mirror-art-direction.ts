/** Authored presentation of the Mirror. All relief is cosmetic; the server owns terrain. */
import {MIRROR_WALL_OUTLINE,MIRROR_GALLERY} from './mirror-cave-layout';
export const MIRROR_ART_STEP=10;
type P={x:number;y:number;z:number};
type Context={B:any;scene:any;root:any;parent:any;owned:any[];layer:(m:any,mat:any,cut?:boolean)=>any;surface:(name:string,rows:P[][],mat:any,cut?:boolean,uv?:number)=>any;lump:(...args:any[])=>any;contact:(x:number,z:number,w:number,d:number)=>any;material:(name:string,hex:string)=>any;rock:any;far:any;snow:any;near:any;ground:any;ice:any;silver:any;main:any;entrance:any;fills:any[];glow:any;relic:any};
const hash=(x:number,z:number)=>{const q=Math.sin(x*127.1+z*311.7)*43758.5453;return q-Math.floor(q);};
const smooth=(v:number)=>v*v*(3-2*v);
function noise(x:number,z:number){const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;}
const fbm=(x:number,z:number)=>noise(x,z)*.57+noise(x*2.03+11,z*2.03)*.27+noise(x*4.13,z*4.13+7)*.11+noise(x*8.3,z*8.3)*.05;
const routePoints=[[11.25,7.5],[10,9],[1,8],[-8.5,7],[-10,2],[-8.25,-1.5]];
function routeDistance(x:number,z:number){let distance=100;for(let i=1;i<routePoints.length;i++){const a=routePoints[i-1]!,b=routePoints[i]!,dx=b[0]!-a[0]!,dz=b[1]!-a[1]!,t=Math.max(0,Math.min(1,((x-a[0]!)*dx+(z-a[1]!)*dz)/(dx*dx+dz*dz)));distance=Math.min(distance,Math.hypot(x-a[0]!-dx*t,z-a[1]!-dz*t));}return distance;}
/** Ignore renderer-only preview frames; mounting an already open save must
 * never be mistaken for a new break that happened in this connection. */
export function mirrorSealTransition(previous:boolean|undefined,structure:string|undefined){
 const next=structure===undefined?previous:structure==='destroyed';return {next,burst:previous===false&&next===true};
}
/** The front neck stays inside the three blocked cells. Widen only behind
 * the last legal row, then overlap the original irregular cave opening. */
export function mirrorSealSection(depth:number){
 const t=Math.max(0,Math.min(1,depth)),back=smooth(Math.max(0,(t-.44)/.56));
 return {z:-8.35-t*3.35,halfWidth:2.46+back*.70,height:5.52+back*.48};
}
export function mirrorSealArch(t:number,height:number){return height/5.15*(1.6*(1-Math.abs(t))+3.55*Math.sqrt(Math.max(0,1-t*t)));}
/** A closed extrusion, including the underside. No camera can look behind
 * a paper face; neighbouring legal cells retain their body clearance. */
export function mirrorSealGeometry(){
 const positions:number[]=[],indices:number[]=[],uvs:number[]=[],rings=9,segments=48;
 for(let r=0;r<rings;r++){
  const section=mirrorSealSection(r/(rings-1));
  for(let j=0;j<=segments;j++){const t=j/segments*2-1,y=mirrorSealArch(t,section.height)-.08;positions.push(MIRROR_GALLERY.x+t*section.halfWidth,y,section.z);uvs.push(j/segments,y/section.height);}
  // Explicit bottom corners keep the entire base below the terrain.
  positions.push(MIRROR_GALLERY.x+section.halfWidth,-.12,section.z,MIRROR_GALLERY.x-section.halfWidth,-.12,section.z);uvs.push(1,0,0,0);
 }
 const count=segments+3;
 for(let r=0;r<rings-1;r++)for(let j=0;j<count;j++){const a=r*count+j,b=r*count+(j+1)%count;indices.push(a,b,a+count,b,b+count,a+count);}
 for(const r of [0,rings-1]){
  const centre=positions.length/3,section=mirrorSealSection(r/(rings-1));positions.push(MIRROR_GALLERY.x,section.height*.36,section.z);uvs.push(.5,.36);
  for(let j=0;j<count;j++){const a=r*count+j,b=r*count+(j+1)%count;indices.push(...(r===0?[centre,b,a]:[centre,a,b]));}
 }
 return {positions,indices,uvs};
}
export function createMirrorArtDirection(ctx:Context){
 const {B,scene,root,parent,owned,layer,surface,lump,contact,material,rock,far,snow,near,ground,ice,silver,main,entrance,fills,glow,relic}=ctx;
 const meshes:any[]=[],roofSections:any[]=[],animated:{mesh:any;kind:string;seed:number}[]=[];
 const groundVeils:{mesh:any;x:number;z:number;seed:number;ground:boolean}[]=[],frostFalls:{mesh:any;x:number;z:number;seed:number}[]=[];
 const keep=(m:any)=>{meshes.push(m);return m;};
 const merge=(name:string,pieces:any[],mat:any,cut=false)=>{if(!pieces.length)return;const m=B.Mesh.MergeMeshes(pieces,true,true,undefined,false,false);if(m){m.name='mirror:'+name;return keep(layer(m,mat,cut));}};
 const texture=(name:string,size:number,draw:(c:any)=>void,alpha=false)=>{const t=new B.DynamicTexture('mirror:'+name,{width:size,height:size},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE);owned.push(t);t.hasAlpha=alpha;draw(t.getContext());t.update();if(!alpha)t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=4;return t;};
 const worldUV=(m:any)=>{const p=m.getVerticesData('position'),uv=[];for(let i=0;i<p.length;i+=3)uv.push((p[i]+20)/46,(p[i+2]+15)/45);m.setVerticesData('uv',uv);return m;};
 const shard=(name:string,x:number,y:number,z:number,radius:number,height:number,seed:number,mat:any,hang=false)=>surface(name,Array.from({length:4},(_,r)=>Array.from({length:8},(_,i)=>{const a=i%7/7*Math.PI*2,scale=[1,.82,.5,.015][r]!,t=r/3;return {x:x+Math.cos(a)*radius*scale*(.8+hash(i,seed)*.35)+t*t*.12*Math.sin(seed),y:y+(hang?-1:1)*height*t,z:z+Math.sin(a)*radius*scale};})),mat,false,1);
 // A unique world-space material: frost islands break into clear, abraded ice.
 const terrainSize=MIRROR_ART_STEP>=10?512:1024;
 const floorPaint=texture('terrain-albedo',terrainSize,c=>{
  const image=c.createImageData(terrainSize,terrainSize),d=image.data;
  for(let y=0;y<terrainSize;y++)for(let x=0;x<terrainSize;x++){
   const wx=x/(terrainSize-1)*46-20,wz=y/(terrainSize-1)*45-15,broad=fbm(wx*.22,wz*.22),grain=noise(wx*12,wz*12),ridges=Math.abs(noise(wx*1.8,wz*1.8)-.5)*2;
   const bank=Math.max(0,1-Math.min(Math.abs(wx+15.8),Math.abs(wx-21.7),Math.abs(wz+11))/3);
   const route=MIRROR_ART_STEP>=5?Math.exp(-((routeDistance(wx,wz)/1.3)**2)):Math.exp(-(((wx+7+Math.sin(wz*.3)*2)/2.5)**2));
   const snowMask=Math.max(0,Math.min(1,(broad-.40+bank*.24-route*(MIRROR_ART_STEP>=5?.16:.08))*4.4)),s=smooth(snowMask),fine=(grain-.5)*16;
   const fleck=grain>.82&&ridges>.6?14:0,i=(y*terrainSize+x)*4;
   d[i]=(MIRROR_ART_STEP>=10?92+s*70:63+s*125)+fine+fleck+route*13;d[i+1]=(MIRROR_ART_STEP>=10?135+s*55:100+s*104)+fine+fleck+route*16;d[i+2]=(MIRROR_ART_STEP>=10?160+s*43:124+s*87)+fine+fleck+route*17;d[i+3]=255;
  }c.putImageData(image,0,0);
  // Small branching hairline fractures, separated from the blue hazard boundary.
  c.save();c.scale(terrainSize/1024,terrainSize/1024);for(let i=0;i<55;i++){let x=hash(i,37)*1024,y=hash(i,48)*1024;c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=(hash(i*7+j,12)-.5)*32;y+=8+hash(i+j,91)*16;c.lineTo(x,y);}c.strokeStyle=i%3?'#294d6248':'#d8e9eb66';c.lineWidth=i%3?.8:1.3;c.stroke();}c.restore();
 });
 const floorNormal=texture('terrain-normal',256,c=>{const image=c.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,a=fbm(x*.12,y*.12),dx=fbm((x+1)*.12,y*.12)-a,dz=fbm(x*.12,(y+1)*.12)-a;image.data.set([128+dx*110,128+dz*110,253,255],i);}c.putImageData(image,0,0);});
 const sheen=texture('terrain-polish',256,c=>{const image=c.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=fbm((x/255*46-20)*.22,(y/255*45-15)*.22),k=30+Math.max(0,.63-n)*460;image.data.set([k,k,k,255],(y*256+x)*4);}c.putImageData(image,0,0);});
 ground.diffuseTexture=floorPaint;ground.diffuseColor=new B.Color3(.97,.99,1);ground.bumpTexture=floorNormal;floorNormal.level=.5;ground.specularTexture=sheen;ground.specularColor=new B.Color3(.45,.65,.76);ground.specularPower=62;
 const perimeter:P[]=[];
 for(let i=0;i<MIRROR_WALL_OUTLINE.length;i++){const a=MIRROR_WALL_OUTLINE[i]!,b=MIRROR_WALL_OUTLINE[(i+1)%MIRROR_WALL_OUTLINE.length]!;const count=Math.ceil(Math.hypot(b[0]!-a[0]!,b[1]!-a[1]!)*2);for(let j=0;j<count;j++)perimeter.push({x:a[0]!+(b[0]!-a[0]!)*j/count,y:0,z:a[1]!+(b[1]!-a[1]!)*j/count});}perimeter.push(perimeter[0]!);
 perimeter.reverse();
 const rows=Array.from({length:34},(_,r)=>perimeter.map(p=>{const t=r/33,x=2+(p.x-2)*t,z=2+(p.z-2)*t,lake=((x-2)/10.8)**2+((z-.6)/5.3)**2<1;return {x,y:lake?-.055:-.02+(fbm(x*.8,z*.8)-.5)*.07,z};}));
 // Legacy artGround batches are merged after the old floor is hidden. Merging
 // re-enables them; hide those batches too, rather than painting over them.
 for(const m of parent.getChildMeshes())if(m.name==='mirror:continuous-cave-floor'||(!m.metadata?.mirrorPresentation&&/^(artGround|merged_artGround|d8-continuous-ground-patch)$/.test(m.name))){m.setEnabled(false);m.isVisible=false;}
 const terrain=keep(worldUV(surface('sculpted-snow-ice',rows,ground,false,1)));
 // The perimeter and Babylon ground use opposite handedness. Keep the
 // observer's section double sided and orient its shading toward the ceiling.
 ground.backFaceCulling=false;ground.twoSidedLighting=false;
 const normals=terrain.getVerticesData('normal');for(let i=0;i<normals.length;i+=3)if(normals[i+1]<0){normals[i]*=-1;normals[i+1]*=-1;normals[i+2]*=-1;}terrain.setVerticesData('normal',normals);
 for(const m of root.getChildMeshes())if(m.name==='mirror:foreground-floor'){worldUV(m);const n=m.getVerticesData('normal');for(let i=0;i<n.length;i+=3){n[i]=0;n[i+1]=1;n[i+2]=0;}m.setVerticesData('normal',n);}
 // Raised banks remain against the walls, outside all legal actor footprints.
 const banks:any[]=[];for(let i=0;i<24;i++){const x=-13.8+i*1.38,z=-10.76+hash(i,8)*.18;if(Math.abs(x-MIRROR_GALLERY.x)<3)continue;banks.push(lump('snow-accumulation',x,.08,z,1.5+hash(i,3),.18+hash(i,7)*.22,.65+hash(i,2)*.5,i+70,snow,false));}merge('snow-accumulations',banks,snow);
 if(MIRROR_ART_STEP>=2){
  const deep=material('deep-blue-ice','#688caa');deep.backFaceCulling=false;deep.twoSidedLighting=true;deep.specularColor=new B.Color3(.16,.28,.40);deep.specularPower=48;
  deep.diffuseTexture=texture('deep-ice-facets',512,c=>{const image=c.createImageData(512,512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const n=fbm(x*.025,y*.008),ridge=Math.pow(1-Math.abs(noise(x*.08,y*.013)-.5)*2,7),grain=noise(x*.6,y*.6);image.data.set([24+n*48+ridge*32+grain*5,45+n*57+ridge*42+grain*6,66+n*61+ridge*45+grain*7,255],(y*512+x)*4);}c.putImageData(image,0,0);});
  for(const m of root.getChildMeshes())if(m.name==='mirror:glacial-wall'&&m.getBoundingInfo().boundingBox.maximum.z<-9.5)m.material=deep;
  // Faceted ice buttresses read as overlapping planes, joined to the far wall.
  for(const [i,x] of [-14,-10.7,-2.8,4.4,12.2,19.6].entries()){
   keep(surface('rear-ice-buttress',Array.from({length:25},(_,r)=>Array.from({length:11},(_,j)=>{
    const y=r*1.1,t=j/10*Math.PI,high=Math.min(1,y/3),sway=Math.sin(y*.27+i*2.4)*.24*high;
    const width=.48+noise(i*7,y*.21)*.7+Math.max(0,Math.sin(y*.62+i))*.30*high;
    const depth=.24+high*(.3+noise(i*3+7,y*.28)*.65),ridge=1+.13*Math.sin(j*2.3+y*.7+i);
    return {x:x+sway+Math.cos(t)*width*ridge,y,z:-11.17+Math.sin(t)*depth*ridge};
   })),i%2?deep:rock,true,1.8));
  }
  const mist=material('depth-veil','#b9d6e7');mist.disableLighting=true;mist.emissiveColor=new B.Color3(.36,.54,.68);mist.backFaceCulling=false;mist.disableDepthWrite=true;
  mist.diffuseTexture=texture('depth-mist',128,c=>{const g=c.createRadialGradient(64,85,1,64,85,72);g.addColorStop(0,'#a8ccdf40');g.addColorStop(.55,'#8fb9d41d');g.addColorStop(1,'#8fb9d400');c.fillStyle=g;c.fillRect(0,0,128,128);},true);mist.useAlphaFromDiffuseTexture=true;
  for(let i=0;i<7;i++){const m=keep(layer(B.MeshBuilder.CreatePlane('mirror:depth-veil',{width:i<5?8:4,height:3.5},scene),mist,false));m.position.set(i<5?-12+i*7:MIRROR_GALLERY.x,1.6,i<5?-10.6:MIRROR_GALLERY.z-3-(i-5)*5);animated.push({mesh:m,kind:'mist',seed:i});}
  // Successive ribs and a light patch stop the passage reading as a flat decal.
  for(let i=1;i<4;i++){const depth=i*3.8;for(const side of [-1,1])keep(lump('gallery-rib',MIRROR_GALLERY.x+side*(2.55-i*.13)+i*i*.12,2.2,MIRROR_GALLERY.z-depth,.35,5.1,.65,300+i*7+side,i===1?deep:far,false));}
 }
 if(MIRROR_ART_STEP>=3){
  const close=material('near-ice-facets','#324e66');close.backFaceCulling=false;close.twoSidedLighting=true;close.bumpTexture=floorNormal;close.specularColor=new B.Color3(.23,.44,.60);close.specularPower=80;
  // Three scales of foreground detail, all outside the navigable footprint.
  for(const [i,p] of [[-15.2,18.6],[-10.8,23.2],[-3,25.5],[8,25.2],[18.6,22.5],[22,17.5]].entries()){
   const pieces:any[]=[];for(let j=0;j<6;j++){const x=p[0]!+(hash(i*13+j,8)-.5)*2.8,z=p[1]!+(hash(i*17+j,7)-.5)*1.5;pieces.push(lump('near-rock',x,.14,z,.7+hash(i+j,3)*1.1,.35+hash(i+j,5)*.65,.7+hash(i+j,6),j+i*4,close,false));if(j<3)pieces.push(shard('near-ice-edge',x,.05,z,.16+hash(j,i)*.2,.6+hash(i,j+9)*1.5,i*7+j,close));}merge('foreground-cluster-'+i,pieces,close,true);
  }
  for(let i=0;i<9;i++){const x=-16+i*4.6,pieces:any[]=[];for(let j=0;j<3;j++)pieces.push(shard('near-hanging-ice',x+j*.25,10.5+Math.sin(x*.31)*.4,20.5+hash(i,3),.14+j*.06,.6+hash(i,j+4)*2.1,i*5+j,close,true));merge('near-icicle-group-'+i,pieces,close,true);}
 }
 if(MIRROR_ART_STEP>=5){
  // Lateral masses stay inside the wall's existing relief allowance. Their
  // spacing leaves the extended grid and all actor centres untouched.
  for(const side of [-1,1])for(let i=0;i<4;i++){const x=side<0?-16.2:22.25,z=-6+i*6,pieces:any[]=[];for(let j=0;j<4;j++)pieces.push(lump('lateral-ice-mass',x+side*.08*j,.4+j*.25,z+(j-1.5)*.4,.8+hash(i,j)*.4,.8+j*.65,1.3,i*7+j,rock,false));merge('lateral-mass-'+side+'-'+i,pieces,rock,true);}
  const border=material('snow-shelf-edge','#b6cdd9');border.diffuseTexture=floorPaint;border.specularColor=new B.Color3(.12,.23,.3);border.backFaceCulling=false;
  for(const [i,p] of [[-15.8,-5],[-15.8,4],[21.85,-2],[21.85,8]].entries())keep(lump('ice-bank-shelf',p[0]!, .13,p[1]!, .75,.4,3.4,i+65,border,false));
 }
 const relicEffects:any[]=[];
 let bounce:any;
 if(MIRROR_ART_STEP>=6){
  for(const m of root.getChildMeshes())if(m.material)m.material.maxSimultaneousLights=5;
  bounce=new B.PointLight('mirror:ice-bounce',new B.Vector3(2,.8,1),scene);bounce.parent=root;bounce.diffuse=new B.Color3(.21,.43,.65);bounce.specular=new B.Color3(.18,.35,.48);bounce.intensity=.72;bounce.range=15;owned.push(bounce);
  entrance.position.set(MIRROR_GALLERY.x,4.2,MIRROR_GALLERY.z+.8);entrance.diffuse=new B.Color3(.40,.64,.85);entrance.range=15;
  main.diffuse=new B.Color3(.63,.86,1);main.range=11.5;
  const shadows:any[]=[];for(const p of [[-9.2,-2.5,2.8,1.6],[-15.6,-5,2.6,3],[-15.6,4,2.5,3],[21.7,-2,2.5,3],[21.7,8,2.5,3],[-15,18,3,2],[22,17,3,2]])shadows.push(contact(p[0]!,p[1]!,p[2]!,p[3]!));merge('soft-contact-shadows',shadows,shadows[0].material);
 }
 if(MIRROR_ART_STEP>=4){
  const ritual=material('ritual-engraved-ice','#c4e5ed');ritual.backFaceCulling=false;ritual.specularColor=new B.Color3(.5,.75,.85);ritual.specularPower=90;ritual.emissiveColor=new B.Color3(.08,.16,.20);
  const platform=keep(surface('ritual-frozen-inlay',Array.from({length:4},(_,r)=>Array.from({length:33},(_,j)=>{const a=j/32*Math.PI*2,t=r/3;return {x:-9.2+Math.cos(a)*1.22*t,y:.020+(1-t)*.008,z:-2.5+Math.sin(a)*1.02*t};})),ritual,false,1));ritual.twoSidedLighting=false;
  const n=platform.getVerticesData('normal');for(let i=0;i<n.length;i+=3){n[i]=0;n[i+1]=1;n[i+2]=0;}platform.setVerticesData('normal',n);
  const engraving=material('silver-ritual-traces','#ffffff');engraving.disableLighting=true;engraving.emissiveColor=new B.Color3(.62,.86,.95);engraving.backFaceCulling=false;engraving.disableDepthWrite=true;
  engraving.diffuseTexture=texture('ritual-traces',512,c=>{
   c.clearRect(0,0,512,512);for(const radius of [103,134]){c.beginPath();for(let j=0;j<=120;j++){const a=j/120*Math.PI*2,r=radius+Math.sin(a*7)*1.8;const x=256+Math.cos(a)*r,y=256+Math.sin(a)*r;j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#dbf7ff94';c.lineWidth=1.5;c.stroke();}
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.save();c.translate(256+Math.cos(a)*119,256+Math.sin(a)*119);c.rotate(a);c.strokeStyle='#d4f4f6b8';c.lineWidth=2;c.beginPath();c.moveTo(-5,-4);c.lineTo(4,0);c.lineTo(-5,4);c.stroke();c.restore();}
   for(let i=0;i<9;i++){const a=hash(i,23)*Math.PI*2;c.beginPath();for(let j=0;j<6;j++){const r=70+j*21,aa=a+(hash(i,j)-.5)*.14,x=256+Math.cos(aa)*r,y=256+Math.sin(aa)*r;j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#ecffff70';c.lineWidth=1;c.stroke();}
  },true);engraving.useAlphaFromDiffuseTexture=true;
  const traces=keep(layer(B.MeshBuilder.CreateGround('mirror:ritual-traces',{width:4.6,height:3.9},scene),engraving,false));traces.position.set(-9.2,.032,-2.5);relicEffects.push(traces);glow?.addIncludedOnlyMesh(traces);
  const aura=material('relic-cold-halo','#ffffff');aura.disableLighting=true;aura.emissiveColor=new B.Color3(.33,.61,.76);aura.backFaceCulling=false;aura.disableDepthWrite=true;
  aura.diffuseTexture=texture('relic-halo',256,c=>{const g=c.createRadialGradient(128,128,9,128,128,126);g.addColorStop(0,'#d8faff75');g.addColorStop(.28,'#9fe8ff3a');g.addColorStop(.65,'#6cbeed10');g.addColorStop(1,'#6cbeed00');c.fillStyle=g;c.fillRect(0,0,256,256);},true);aura.useAlphaFromDiffuseTexture=true;
  const halo=keep(layer(B.MeshBuilder.CreatePlane('mirror:relic-halo',{width:5.6,height:5.8},scene),aura,false));halo.position.set(-9.2,2.7,-2.72);halo.rotation.y=.18;relicEffects.push(halo);
  const pool=keep(layer(B.MeshBuilder.CreateGround('mirror:relic-falloff',{width:8.2,height:7},scene),aura,false));pool.position.set(-9.2,.029,-2.5);relicEffects.push(pool);
  // Crystalline collar surrounds the painted pedestal; never another cylinder.
  const collar:any[]=[];for(let i=0;i<9;i++){const a=Math.PI+i/8*Math.PI;collar.push(shard('pedestal-frost',-9.2+Math.cos(a)*.87,.02,-2.5+Math.sin(a)*.7,.06+hash(i,3)*.08,.12+hash(i,9)*.25,i,ice));}merge('pedestal-frost',collar,ice);
 }
 const oldDust=parent.getChildMeshes().filter((m:any)=>/^(mirror:ice-dust|snowFlake|magicMote)$/.test(m.name));
 if(MIRROR_ART_STEP>=7){
  const flakes=material('suspended-snow','#e4f3fa');flakes.disableLighting=true;flakes.emissiveColor=new B.Color3(.57,.72,.82);
  for(let i=0;i<30;i++){const m=keep(layer(B.MeshBuilder.CreateSphere('mirror:powder-snow',{diameter:.012+hash(i,7)*.022,segments:3},scene),flakes,false));animated.push({mesh:m,kind:'snow',seed:i});if(i%7===0)glow?.addIncludedOnlyMesh(m);}
  const frost=material('column-hoarfrost','#d5ebf4');frost.backFaceCulling=false;frost.emissiveColor=new B.Color3(.07,.12,.17);frost.disableDepthWrite=true;
  frost.diffuseTexture=texture('hoarfrost',256,c=>{c.clearRect(0,0,256,256);for(let i=0;i<85;i++){const x=hash(i,11)*256,y=hash(i,12)*256,h=8+hash(i,15)*24;c.strokeStyle='#d9f7ff80';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.lineTo(x+2,y-h);for(let j=1;j<4;j++){c.moveTo(x+j*.5,y-j*h/4);c.lineTo(x-4-j*2,y-j*h/4-4);c.moveTo(x+j*.5,y-j*h/4);c.lineTo(x+5+j*2,y-j*h/4-5);}c.stroke();}},true);frost.useAlphaFromDiffuseTexture=true;
  for(let i=0;i<10;i++){const m=keep(layer(B.MeshBuilder.CreatePlane('mirror:wall-frost',{width:1.2+hash(i,2),height:2+hash(i,3)*3},scene),frost,false));m.position.set(-14.4+i*3.6,2.5+hash(i,6)*4,-10.55);}
  const fragments:any[]=[];for(let i=0;i<65;i++){const x=-14+i*.52;if(Math.abs(x-MIRROR_GALLERY.x)<3)continue;fragments.push(lump('glacial-chips',x,.04,-10.52+hash(i,6)*.30,.07+hash(i,7)*.15,.06+hash(i,8)*.12,.08+hash(i,9)*.18,i,ice,false));}merge('glacial-chips',fragments,ice);
  // Small pockets of interior frost, never a second snowfall/weather system.
  const breath=material('ground-frost-veil','#d4e7f0');breath.disableLighting=true;breath.emissiveColor=new B.Color3(.72,.83,.91);breath.backFaceCulling=false;breath.disableDepthWrite=true;
  breath.diffuseTexture=texture('ground-frost',128,c=>{const p=c.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const u=(x-64)/64,v=(y-64)/64,edge=Math.max(0,1-u*u-v*v),cloud=fbm(x*.065,y*.06);p.data.set([210,228,242,Math.pow(edge,1.5)*(.30+cloud*.70)*220],(y*128+x)*4);}c.putImageData(p,0,0);},true);breath.useAlphaFromDiffuseTexture=true;
  for(const [i,p] of [[9,5.7,7.4],[-7.3,-.2,7.2],[2.4,5.7,8.5],[-6.6,-10.3,4.7]].entries())for(const ground of [false,true]){
   const m=keep(layer(ground?B.MeshBuilder.CreateGround('mirror:ground-frost',{width:p[2],height:3.5},scene):B.MeshBuilder.CreatePlane('mirror:ground-frost',{width:p[2],height:.72},scene),breath,false));m.position.set(p[0],ground?.115:.32,p[1]);groundVeils.push({mesh:m,x:p[0]!,z:p[1]!,seed:i,ground});
  }
  // Sparse bursts fall from three fixed ceiling patches. They are quiet for
  // most of their cycle, and disappear entirely with reduced motion.
  for(let i=0;i<12;i++){const group=Math.floor(i/4),p=[[-13,-8.7],[7.7,-8.8],[19,9.5]][group]!,m=keep(layer(B.MeshBuilder.CreateSphere('mirror:falling-hoarfrost',{diameter:.012+hash(i,85)*.014,segments:3},scene),flakes,false));frostFalls.push({mesh:m,x:p[0]!,z:p[1]!,seed:i});}
 }
 if(MIRROR_ART_STEP>=8){
  const glacial=new B.Texture('/art/materials/mirror/'+(MIRROR_ART_STEP>=10?'glacial-slate-v1-1024.png':'glacial-slate-v1.png'),scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);owned.push(glacial);glacial.wrapU=glacial.wrapV=B.Texture.WRAP_ADDRESSMODE;glacial.anisotropicFilteringLevel=4;
  const wallMats=new Set<any>();for(const m of root.getChildMeshes())if(/^(mirror:(glacial-wall|side-vault|rear-ice-buttress|lateral-mass|gallery-rib|foreground-cluster|near-icicle-group))/.test(m.name))wallMats.add(m.material);
  for(const m of wallMats){m.diffuseTexture=glacial;m.bumpTexture=floorNormal;m.diffuseColor=new B.Color3(.75,.87,.97);m.emissiveColor=new B.Color3(.018,.032,.05);m.specularColor=new B.Color3(.28,.46,.6);m.specularPower=72;m.maxSimultaneousLights=5;}
  for(const m of new Set<any>(root.getChildMeshes().map((m:any)=>m.material))){const depth=Number(m?.name?.match(/^mirror:tunnel-(\d)$/)?.[1]);if(!Number.isFinite(depth))continue;const fade=[.64,.39,.21,.09,.018][depth]!;m.diffuseTexture=glacial;m.bumpTexture=floorNormal;m.diffuseColor=new B.Color3(fade*.62,fade*.83,fade);m.emissiveColor=new B.Color3(.004,.008,.015);m.specularColor=new B.Color3(.06,.10,.15);}
  // A continuous inner vault, joined to both walls and the rear chamber.
  // There is no transverse slab or visible top/cut face. Only the part above
  // the camera's useful frame remains opaque; its hanging ice fades locally.
  for(const m of root.getChildMeshes())if(m.name==='mirror:vault'||m.name==='mirror:side-vault'||m.name==='mirror:stalactite'&&m.position.z>15||m.name.startsWith('mirror:near-icicle-group'))m.setEnabled(false);
  const ceiling=material('broken-vault-ice','#9bb9d0');ceiling.diffuseTexture=glacial;ceiling.bumpTexture=floorNormal;ceiling.specularColor=new B.Color3(.32,.49,.63);ceiling.specularPower=70;ceiling.maxSimultaneousLights=5;
  ceiling.diffuseColor.set(.30,.43,.56);ceiling.emissiveColor.set(.008,.014,.023);
  ceiling.backFaceCulling=false;ceiling.twoSidedLighting=true;ceiling.disableDepthWrite=true;ceiling.transparencyMode=2;
  const roofHeight=(x:number,z:number)=>10.5+Math.sin(Math.max(0,Math.min(1,(x+16.3)/38.6))*Math.PI)*6.5+(fbm(x*.38,z*.34)-.5)*2.1;
  for(let i=0;i<7;i++){
   const start=-16.3+i*38.6/7,pieces:any[]=[];
   pieces.push(surface('vault-inner-skin',Array.from({length:27},(_,r)=>Array.from({length:9},(_,j)=>{const x=start+j/8*38.6/7,z=-11.5+r*1.9;return {x,y:roofHeight(x,z),z};})),ceiling,false,2));
   for(let j=0;j<15;j++){
    const x=start+.3+hash(i*19+j,4)*(38.6/7-.6),z=-9+hash(i*31+j,7)*42,y=roofHeight(x,z);
    pieces.push(shard('vault-pendant',x,y+.15,z,.13+hash(i,j+50)*.25,.5+hash(i,j+10)*2.5,i*19+j,ceiling,true));
   }
   const section=merge('camera-vault-'+i,pieces,ceiling,false);if(section){section.hasVertexAlpha=true;section.useVertexColors=true;section.metadata.roofHeights=section.getVerticesData('position').filter((_:number,k:number)=>k%3===0).map((x:number,k:number)=>roofHeight(x,section.getVerticesData('position')[k*3+2]));roofSections.push(section);}
  }
  // Keep a continuous, high wall, but give its near edges irregular ice faces.
  for(const side of [-1,1])for(let i=0;i<6;i++){
   const x=side<0?-16.08:22.08,z=-7+i*4.4;
   keep(surface('wall-crystal-face',Array.from({length:12},(_,r)=>Array.from({length:6},(_,j)=>{const t=j/5;return {x:x-side*(.08+Math.sin(t*Math.PI)*(.18+hash(i,r)*.16)),y:r*2.5,z:z+(t-.5)*2.8+.2*Math.sin(r*.6+i)};})),rock,true,2));
  }
  const rim=keep(surface('gallery-fractured-rim',Array.from({length:3},(_,r)=>Array.from({length:29},(_,j)=>{const a=j/28*Math.PI,extra=r*.19*(.85+hash(j,3)*.5);return {x:MIRROR_GALLERY.x+Math.cos(a)*(2.75+extra),y:1.6*(1-Math.abs(Math.cos(a)))+Math.sin(a)*3.55+extra*.8,z:MIRROR_GALLERY.z+.26+Math.sin(j*2.1)*.10-r*.13};})),ceiling,false,1.5));void rim;
 }
 let corruption:any;
 if(MIRROR_ART_STEP>=9){
  corruption=material('mirror-altered-ice','#e4d7f5');corruption.disableLighting=true;corruption.backFaceCulling=false;corruption.disableDepthWrite=true;corruption.emissiveColor=new B.Color3(.36,.32,.49);
  corruption.diffuseTexture=texture('mirror-fracture-scars',512,c=>{c.clearRect(0,0,512,512);for(let i=0;i<13;i++){const a=hash(i,61)*Math.PI*2;c.beginPath();for(let j=0;j<9;j++){const r=18+j*24,x=256+Math.cos(a+(hash(i,j)-.5)*.18)*r,y=286+Math.sin(a+(hash(i,j+20)-.5)*.17)*r;j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#191e3b72';c.lineWidth=5;c.stroke();c.strokeStyle='#d6c9ef88';c.lineWidth=.9;c.stroke();}for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=256+Math.cos(a)*83,y=286+Math.sin(a)*83;c.strokeStyle='#e9dcf6a0';c.lineWidth=1;c.strokeRect(x,y,4,9);}},true);corruption.useAlphaFromDiffuseTexture=true;
  const scar=keep(layer(B.MeshBuilder.CreateGround('mirror:altered-ice-scars',{width:4.9,height:4.5},scene),corruption,false));scar.position.set(-9.5,.034,-3.2);glow?.addIncludedOnlyMesh(scar);
  const debris:any[]=[];for(let i=0;i<13;i++)debris.push(lump('ritual-fragment',-9.7+(hash(i,13)-.5)*.6,.022,-3.08+(hash(i,23)-.5)*.6,.08+hash(i,17)*.11,.028,.06+hash(i,43)*.14,i,snow,false));merge('ritual-fragments',debris,snow);
  const motes=material('relic-spindrift','#e4e3f6');motes.disableLighting=true;motes.emissiveColor=new B.Color3(.62,.65,.82);
  for(let i=0;i<6;i++){const m=keep(layer(B.MeshBuilder.CreateSphere('mirror:ritual-mote',{diameter:.022,segments:3},scene),motes,false));animated.push({mesh:m,kind:'ritual-mote',seed:i});glow?.addIncludedOnlyMesh(m);}
 }
 const ip=scene.imageProcessingConfiguration,ipBefore={exposure:ip.exposure,contrast:ip.contrast,vignetteEnabled:ip.vignetteEnabled,vignetteWeight:ip.vignetteWeight,vignetteStretch:ip.vignetteStretch,vignetteColor:ip.vignetteColor.clone()};
 if(MIRROR_ART_STEP>=10){
  const detail=new B.Texture('/art/materials/mirror/glacial-floor-v1-512.png',scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);owned.push(detail);
  // This painted image is not a seamless tile. A repeated edge (including
  // the resampled alpha fringe) made a straight lattice across the floor.
  // Read it once in world space, inside its opaque border; the authored
  // terrain mask and normal map still supply the small-scale variation.
  // Include the observer's floor apron (-30..38, -15..75) in the single
  // sample. Clamping at the playable rectangle stretched its border into
  // bright stripes in an overview of the near section.
  detail.wrapU=detail.wrapV=B.Texture.CLAMP_ADDRESSMODE;detail.uScale=.5;detail.vScale=.4;detail.uOffset=.25;detail.vOffset=.16;detail.anisotropicFilteringLevel=4;
  // The detail map supplies fine albedo variation only. The authored world
  // masks continue to control the path, snow banks, polish and hazard reading.
  ground.detailMap.texture=detail;ground.detailMap.isEnabled=true;ground.detailMap.diffuseBlendLevel=.32;ground.detailMap.bumpLevel=0;ground.detailMap.roughnessBlendLevel=0;
  for(const m of root.getChildMeshes()){
   if(/^(mirror:(glacial-wall|side-vault|rear-ice-buttress|wall-crystal-face))/.test(m.name)){
    const p=m.getVerticesData('position'),colors=[];for(let i=0;i<p.length;i+=3){const height=Math.max(0,Math.min(1,p[i+1]/20)),shade=(.65-height*.43)*( .89+.11*noise(p[i]*.7,p[i+2]*.7));colors.push(shade*.84,shade*.94,shade,1);}m.setVerticesData('color',colors);m.useVertexColors=true;
   }
   if(m.name.startsWith('mirror:broken-vault')){m.material.diffuseColor.set(.46,.58,.70);m.material.emissiveColor.set(.012,.023,.04);}
   if(/^mirror:foreground-cluster-[23]$/.test(m.name)){const p=m.getVerticesData('position');for(let i=0;i<p.length;i+=3){p[i+1]*=.65;p[i+2]+=9;}m.setVerticesData('position',p);}
  }
 }
 // The sealed vestibule reaches the last legal row. Its authoritative door
 // occupies cells 4..6,0; crossing 5,0 after the break leads into the passage.
 const sealPaint=material('gallery-seal','#b3dbe9');sealPaint.bumpTexture=floorNormal;sealPaint.backFaceCulling=false;sealPaint.twoSidedLighting=true;sealPaint.specularColor=new B.Color3(.56,.74,.85);sealPaint.specularPower=94;
 sealPaint.diffuseTexture=texture('sealed-glacial-depth',256,c=>{
  const image=c.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=fbm(x*.028,y*.012),vein=Math.pow(1-Math.abs(noise(x*.09,y*.018)-.5)*2,11),frost=Math.max(0,Math.abs(x-128)/128-.54)*80,v=n*55+vein*32+frost;image.data.set([53+v,93+v,119+v,255],(y*256+x)*4);}c.putImageData(image,0,0);
 });
 const sealZ=-8.35,sealX=MIRROR_GALLERY.x;
 const geometry=mirrorSealGeometry(),sealData=new B.VertexData();sealData.positions=geometry.positions;sealData.indices=geometry.indices;sealData.uvs=geometry.uvs;sealData.normals=[];B.VertexData.ComputeNormals(geometry.positions,geometry.indices,sealData.normals);
 const seal=keep(layer(new B.Mesh('mirror:gallery-ice-seal',scene),sealPaint,false));sealData.applyToMesh(seal);
 // Continuous arched lining replaces the two disconnected vertical sheets.
 // It covers the crown and overlaps the rear wall; it survives the break.
 const lining=keep(surface('gallery-vestibule',Array.from({length:10},(_,r)=>Array.from({length:49},(_,j)=>{const section=mirrorSealSection(r/9),t=j/48*2-1;return {x:sealX+t*(section.halfWidth-.015),y:mirrorSealArch(t,section.height)-.10,z:section.z-.035};})),rock,false,1.8));void lining;
 // A sloping forehead joins the forward arch to the cavern above. Without
 // this mass, a closed plug still looked like a loose door below a dark gap.
 keep(surface('gallery-joined-hood',Array.from({length:13},(_,r)=>Array.from({length:49},(_,j)=>{const f=r/12,t=j/48*2-1,arch=mirrorSealArch(t,5.52),relief=Math.sin(j*1.7+r*.8)*.05*Math.sin(f*Math.PI);return {x:sealX+t*(2.46+f*.70),y:arch-.10+f*(8.6-arch)+relief,z:sealZ-.04-smooth(f)*3.65};})),rock,false,1.6));
 // An irregular continuous frost weld, rather than repeated bead-like rocks.
 keep(surface('seal-frozen-joint',Array.from({length:4},(_,r)=>Array.from({length:49},(_,j)=>{const f=r/3,t=j/48*2-1,edge=.09+hash(j,850)*.08;return {x:sealX+t*(2.44+f*edge),y:mirrorSealArch(t,5.52)-.11+f*edge*1.8,z:sealZ+.014-f*.10+Math.sin(j*1.7)*.008};})),ice,false,1));
 const cracks=material('seal-fractures','#ffffff');cracks.disableLighting=true;cracks.emissiveColor=new B.Color3(.62,.87,1);cracks.backFaceCulling=false;cracks.disableDepthWrite=true;
 cracks.diffuseTexture=texture('seal-cracks',256,c=>{c.clearRect(0,0,256,256);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.beginPath();for(let j=0;j<7;j++){const r=j*24,x=128+Math.cos(a+(hash(i,j)-.5)*.28)*r,y=144+Math.sin(a+(hash(i,j+5)-.5)*.25)*r;j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#e7fdffde';c.lineWidth=i%3?.7:1.6;c.stroke();}},true);cracks.useAlphaFromDiffuseTexture=true;
 const fracture=keep(surface('seal-fractures',Array.from({length:12},(_,r)=>Array.from({length:49},(_,j)=>{const t=j/48*2-1;return {x:sealX+t*2.44,y:-.06+r/11*(mirrorSealArch(t,5.50)),z:sealZ+.012};})),cracks,false,1));
 const burstMat=material('seal-ice-debris','#aedfec');burstMat.diffuseTexture=rock.diffuseTexture;burstMat.specularColor=new B.Color3(.45,.67,.84);
 const sealDebris=Array.from({length:16},(_,i)=>{const x=sealX+(hash(i,101)-.5)*4.4,y=.6+hash(i,111)*3.4,m=keep(lump('seal-falling-ice',x,y,sealZ,.15+hash(i,115)*.32,.25+hash(i,117)*.38,.12+hash(i,119)*.18,i+401,burstMat,false));m.setEnabled(false);return {mesh:m,x,y,z:sealZ,seed:i};});
 const powder=material('seal-powder','#d6f6ff');powder.disableLighting=true;powder.emissiveColor=new B.Color3(.54,.73,.84);
 const powderMeshes=Array.from({length:16},(_,i)=>{const m=keep(layer(B.MeshBuilder.CreateSphere('mirror:seal-powder',{diameter:.025+hash(i,155)*.045,segments:3},scene),powder,false));m.setEnabled(false);return m;});
 let sealDestroyed:boolean|undefined,burstStart=-Infinity,roofKey='';
 function update(view:any,time:number){
  const transition=mirrorSealTransition(sealDestroyed,view.props?.find((p:any)=>p.id==='mirror-ice-seal')?.structure),open=transition.next??false;
  if(transition.burst)burstStart=time;sealDestroyed=transition.next;
  const age=time-burstStart,reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const breaking=open&&age<1.8;
  seal.setEnabled(!open||age<.9);sealPaint.alpha=open?1-smooth(Math.max(0,Math.min(1,(age-.2)/.7))):1;
  fracture.setEnabled(!open||age<.8);cracks.alpha=open?Math.max(0,1-age/.8):.055;
  for(const piece of sealDebris){const i=piece.seed,t=Math.max(0,age-.2);piece.mesh.setEnabled(breaking&&!reduced&&age>.2);if(breaking){piece.mesh.position.set(piece.x+(hash(i,130)-.5)*t*2,piece.y+t*.5-t*t*2.6,piece.z+t*(.5+hash(i,133)*1.3));piece.mesh.rotation.z=t*(hash(i,137)-.5)*3;piece.mesh.visibility=Math.max(0,1-t/1.6);}}
  for(const [i,m] of powderMeshes.entries()){m.setEnabled(breaking&&!reduced);if(breaking){m.position.set(sealX+(hash(i,141)-.5)*(1.2+age*3),.5+hash(i,145)*3+age*.4,sealZ+age*(.4+hash(i,147)*2));m.visibility=Math.max(0,1-age/1.8);m.scaling.setAll(1+age*1.3);}}
  // Feather the roof in screen space: high-angle/overview cameras do not see
  // a floating cross-section, while low views keep the enclosing upper vault.
  const camera=scene.activeCamera,up=camera.getDirection(B.Vector3.Up()),target=camera.getTarget?.()??view.focus,half=Math.max(1,((camera.orthoTop??10)-(camera.orthoBottom??-10))/2);
  const key=[up.x,up.y,up.z,target.x,target.y,target.z,half].map(n=>n.toFixed(3)).join(':');
  if(key!==roofKey){roofKey=key;for(const roof of roofSections){const p=roof.getVerticesData('position'),colors=[];let visible=false;for(let i=0;i<p.length;i+=3){const screen=((p[i]-target.x)*up.x+(Math.max(p[i+1],roof.metadata.roofHeights[i/3]-.25)-target.y)*up.y+(p[i+2]-target.z)*up.z)/half,alpha=smooth(Math.max(0,Math.min(1,(screen-.60)/.32)));colors.push(1,1,1,alpha);visible ||= alpha>.005;}roof.setVerticesData('color',colors);roof.setEnabled(visible);}}
  // Absolute positions avoid drift accumulating with frame rate or long play.
  for(const a of animated)if(a.kind==='mist'){a.mesh.position.x=(a.seed<5?-12+a.seed*7:MIRROR_GALLERY.x)+(reduced?0:Math.sin(time*.045+a.seed)*.22);a.mesh.visibility=view.combat?.28:.65;}
  const economical=Math.min(scene.getEngine().getRenderWidth(),scene.getEngine().getRenderHeight())<600;
  const nearest=[...new Set(groundVeils.map(a=>a.seed))].filter(seed=>seed!==3||open).sort((a,b)=>{const p=groundVeils.find(v=>v.seed===a)!,q=groundVeils.find(v=>v.seed===b)!;return Math.hypot(p.x-view.focus.x,p.z-view.focus.z)-Math.hypot(q.x-view.focus.x,q.z-view.focus.z);}).slice(0,2);
  for(const a of groundVeils){a.mesh.setEnabled((!economical||nearest.includes(a.seed))&&(a.seed!==3||open));a.mesh.position.x=a.x+(reduced?0:Math.sin(time*.085+a.seed*2)*.62);a.mesh.position.z=a.z+(reduced?0:Math.sin(time*.06+a.seed)*.32);a.mesh.visibility=(view.combat?.22:a.ground?.44:.68)*(reduced?1:.90+.10*Math.sin(time*.19+a.seed));}
  for(const a of frostFalls){const group=Math.floor(a.seed/4),phase=((time+group*7.7)%23+23)%23,fall=phase-(a.seed%4)*.09;a.mesh.setEnabled(!reduced&&!view.combat&&(!economical||group===0)&&fall>0&&fall<2.8);a.mesh.position.set(a.x+(hash(a.seed,92)-.5)*.5+fall*.08,5.4-fall*.8-fall*fall*.35,a.z+(hash(a.seed,93)-.5)*.5);a.mesh.visibility=.40*Math.max(0,Math.min(1,fall*2,(2.8-fall)*2));}
  if(MIRROR_ART_STEP>=4){main.intensity*=1.3;for(const m of relicEffects)m.setEnabled(relic.isEnabled());}
  if(MIRROR_ART_STEP>=6){
   for(const l of fills){l.intensity=l.getClassName()==='HemisphericLight'?.32:.30;l.diffuse.set(.64,.78,.98);if(l.groundColor)l.groundColor.set(.10,.18,.29);}
   scene.ambientColor.set(.09,.14,.23);scene.clearColor.set(.035,.065,.115,1);scene.fogColor.set(.065,.12,.20);
   entrance.intensity=.8+.16*(view.naturalLight?.ambient??.5)+(breaking?Math.max(0,Math.sin(Math.min(1,age/.8)*Math.PI))*1.8:0);main.intensity*=1.12;
   silver.emissiveColor.scaleInPlace(1.5);if(glow)glow.intensity=view.combat?.09:.17;
  }
  if(MIRROR_ART_STEP>=7){
   for(const m of oldDust)m.setEnabled(false);
   const light=Math.min(scene.getEngine().getRenderWidth(),scene.getEngine().getRenderHeight())<600,still=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
   for(const a of animated)if(a.kind==='snow'){const i=a.seed,m=a.mesh;m.setEnabled(i<(light?10:30));m.position.set(-14+hash(i,3)*34+Math.sin((still?0:time)*.09+i)*.35,.3+((hash(i,7)*5-(still?0:time)*.032)%5+5)%5,-9+hash(i,4)*28);m.visibility=(view.combat?.12:.38)*(.65+Math.sin(time*.3+i)*.20);}
  }
  if(MIRROR_ART_STEP>=9){
   const live=relic.isEnabled();corruption.emissiveColor.set(live?.36:.12,live?.32:.14,live?.49:.21);
   for(const a of animated)if(a.kind==='ritual-mote'){a.mesh.setEnabled(live);a.mesh.position.set(-9.2+Math.sin(time*.2+a.seed)*1.1,.35+((time*.06+a.seed*.3)%2.7),-2.5+Math.cos(time*.17+a.seed)*.8);a.mesh.visibility=view.combat?.15:.45;}
  }
  if(MIRROR_ART_STEP>=10){
   for(const l of fills)l.intensity=l.getClassName()==='HemisphericLight'?.26:.27;
   scene.fogDensity=.0085;scene.fogColor.set(.065,.115,.18);
   ip.exposure=1.04;ip.contrast=1.1;ip.vignetteEnabled=!view.combat;ip.vignetteWeight=.65;ip.vignetteStretch=.20;ip.vignetteColor.set(.015,.035,.06,1);
  }
 }
 const iceTriangles:{p:P[];minX:number;maxX:number;minZ:number;maxZ:number}[]=[];
 for(const mesh of parent.getChildMeshes())if(/^(waterArea|(?:merged_)?iceFloeTop)/.test(mesh.name)){
  const positions=mesh.getVerticesData('position'),indices=mesh.getIndices(),matrix=mesh.computeWorldMatrix(true);if(!positions||!indices)continue;
  for(let i=0;i<indices.length;i+=3){const p=Array.from(indices.slice(i,i+3),(k:any)=>B.Vector3.TransformCoordinates(new B.Vector3(positions[k*3],positions[k*3+1],positions[k*3+2]),matrix));if(Math.max(...p.map((q:P)=>q.y))-Math.min(...p.map((q:P)=>q.y))>.015)continue;iceTriangles.push({p,minX:Math.min(...p.map((q:P)=>q.x)),maxX:Math.max(...p.map((q:P)=>q.x)),minZ:Math.min(...p.map((q:P)=>q.z)),maxZ:Math.max(...p.map((q:P)=>q.z))});}
 }
 const sampleIce=(point:P)=>{
  const {x,z}=point,broad=fbm(x*.22,z*.22),bank=Math.max(0,1-Math.min(Math.abs(x+15.8),Math.abs(x-21.7),Math.abs(z+11))/3),route=Math.exp(-((routeDistance(x,z)/1.3)**2));
  const snow=smooth(Math.max(0,Math.min(1,(broad-.4+bank*.24-route*.16)*4.4))),lake=((x-2)/10.8)**2+((z-.6)/5.3)**2<1;
  const focal=main.isEnabled()?Math.max(0,1-Math.hypot(x+9.2,z+2.5)/10):0;
  // Frost breaks up reflections; the mirror's local light strengthens them.
  let height=-.02+(fbm(x*.8,z*.8)-.5)*.07,polished=false;
  for(const tri of iceTriangles){if(x<tri.minX||x>tri.maxX||z<tri.minZ||z>tri.maxZ)continue;const a=tri.p[0]!,b=tri.p[1]!,c=tri.p[2]!,d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-6)continue;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;if(u>=0&&v>=0&&u+v<=1){height=Math.max(height,a.y);polished=true;}}
  return {strength:(polished?.19:.17*(1-snow))*(.72+focal*.8),height:Math.max(.018,height+.012)};
 };
 return {update,sampleIce,dispose:()=>{if(MIRROR_ART_STEP>=10)Object.assign(ip,ipBefore);},actorLight:(point:P)=>{const a=main.isEnabled()?Math.max(0,1-Math.hypot(point.x+9.2,point.z+2.5)/9):0,depth=Math.max(.28,1-Math.max(0,-point.z-9)*.085);return MIRROR_ART_STEP>=6?{r:(.78+a*.18)*depth,g:(.86+a*.14)*depth,b:(.96+a*.04)*depth}:null;},get diagnostics(){return {step:MIRROR_ART_STEP,meshes:meshes.length,reliefMetres:.07,terrainCoordinates:'world',mist:{pockets:4,enabled:groundVeils.filter(a=>a.mesh.isEnabled()).length,profile:'crossed-low-veils-nearest-pockets'},seal:{destroyed:sealDestroyed,age:performance.now()/1000-burstStart,debris:sealDebris.filter(p=>p.mesh.isEnabled()).length},gameplayChanged:false};}};
}
