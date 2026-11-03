/** Mirror-only presentation. No navigation, rules, campaign clock or private data. */
import {MIRROR_WALL_OUTLINE,MIRROR_GALLERY} from './mirror-cave-layout';
import {createMirrorArtDirection} from './mirror-art-direction';
type Point = {x:number;y:number;z:number};
/** Segment/slab intersection, bounded at the protected target (not an infinite ray). */
export function mirrorSegmentHitsBounds(origin:Point,direction:Point,length:number,min:Point,max:Point){
 let enter=0,exit=length;
 for(const axis of ['x','y','z'] as const){const d=direction[axis];if(Math.abs(d)<1e-8){if(origin[axis]<min[axis]||origin[axis]>max[axis])return false;continue;}
  const a=(min[axis]-origin[axis])/d,b=(max[axis]-origin[axis])/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(exit<enter)return false;
 }return true;
}
/** Bounds are a broad phase only: arches and sloped vaults need triangle hits. */
export function mirrorMeshBlocksSegment(mesh:any,ray:any){
 mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox;
 return mirrorSegmentHitsBounds(ray.origin,ray.direction,ray.length,box.minimumWorld,box.maximumWorld)&&ray.intersectsMesh(mesh,false).hit;
}
type View = {focus:Point;cameraPosition?:Point;actorPositions?:Record<string,Point>;props?:{id:string;structure:string}[];combat?:boolean;naturalLight?:{ambient:number};environment?:{timeOfDay?:string}};
export function createMirrorEnvironment({B,scene,parent,track}:{B:any;scene:any;parent:any;track:(resource:any)=>any}){
 const root=new B.TransformNode('mirror-presentation',scene);root.parent=parent;
 const owned:any[]=[],occluders:any[]=[],held=new Map<number,number>();let disposed=false,last=0,lastCutaway=0,cutawayKey='';
 const rand=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const material=(name:string,hex:string)=>{const m=new B.StandardMaterial('mirror:'+name,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.emissiveColor=m.diffuseColor.scale(.10);m.specularColor=new B.Color3(.04,.05,.06);m.maxSimultaneousLights=4;owned.push(m);return m;};
 const rock=material('slate','#354655'),far=material('gallery','#273543'),snow=material('snow','#c8d1d4'),near=material('foreground','#17232e');
 for(const m of [rock,far,near,snow]){m.backFaceCulling=false;m.twoSidedLighting=true;}
 function layer(mesh:any,mat:any,cut=true){mesh.parent=root;mesh.material=mat;mesh.isPickable=false;mesh.receiveShadows=true;mesh.metadata={mirrorPresentation:true,tokenOccluder:false,d8Animated:true};if(cut)occluders.push(mesh);return mesh;}
 // Replace only legacy decorative masses, never gameplay meshes or the lake.
 for(const mesh of parent.getChildMeshes())if(mesh!==root&&(/^(artIceWall|merged_artIceWall|merged_iceRidge|merged_iceBank|iceRidge|iceBank|d8-horizon-ridge|d8-horizon-crystal)/.test(mesh.name)||mesh.metadata?.cameraCutawayRidge)){mesh.setEnabled(false);mesh.isVisible=false;mesh.metadata={...mesh.metadata,d8Animated:true};}
 function surface(name:string,rows:Point[][],mat:any,cut=true,uvScale=.25){
  const p:number[]=[],uv:number[]=[],ix:number[]=[],norm:number[]=[],cols=rows[0]!.length;
  rows.forEach((row,r)=>row.forEach((v,c)=>{p.push(v.x,v.y,v.z);uv.push(c/(cols-1)*uvScale,r/(rows.length-1)*uvScale);if(r<rows.length-1&&c<cols-1){const k=r*cols+c;ix.push(k,k+cols,k+1,k+1,k+cols,k+cols+1);}}));
  B.VertexData.ComputeNormals(p,ix,norm);const m=new B.Mesh('mirror:'+name,scene),d=new B.VertexData();d.positions=p;d.indices=ix;d.normals=norm;d.uvs=uv;d.applyToMesh(m);return layer(m,mat,cut);
 }
 function lump(name:string,x:number,y:number,z:number,w:number,h:number,d:number,seed:number,mat:any,cut=false){
  const m=B.MeshBuilder.CreateSphere('mirror:'+name,{diameter:1,segments:4},scene),positions=m.getVerticesData('position');
  for(let i=0;i<positions.length;i+=3){const k=.85+rand(seed+Math.round(positions[i]*21)+Math.round(positions[i+2]*37))*.28;positions[i]*=k;positions[i+1]*=k;positions[i+2]*=k;}
  m.setVerticesData('position',positions);m.convertToFlatShadedMesh();m.position.set(x,y,z);m.scaling.set(w,h,d);m.rotation.y=seed;return layer(m,mat,cut);
 }
 const wallPoints:Point[]=[],wallFeet:any[]=[],contactSeeds:{x:number;z:number;w:number;d:number}[]=[];
 let distance=0;
 for(let edge=0;edge<MIRROR_WALL_OUTLINE.length;edge++){
  // The front is a section through the chamber, under a continuous ceiling.
  // There is no second entrance or row of cropped cylindrical columns.
  const a=MIRROR_WALL_OUTLINE[edge]!,b=MIRROR_WALL_OUTLINE[(edge+1)%MIRROR_WALL_OUTLINE.length]!,dx=b[0]!-a[0]!,dz=b[1]!-a[1]!,length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
  const count=Math.ceil(length/2.7);
  for(let segment=0;segment<count;segment++){
   const point=(u:number,y:number)=>{const along=(segment+u)/count,run=distance+along*length;
    // Continuous world-space folds: shared panel edges meet exactly. Relief
    // grows above head height, retaining the original clearance at every cell.
    const high=Math.max(0,Math.min(1,(y-2.4)/4)),fold=Math.sin(run*.51+y*.13+Math.sin(y*.38+run*.11)*1.7),fracture=Math.sin(run*2.9-y*.7+Math.sin(run*.91+y*.28));
    const relief=(.29+high*.8)*fold+(.13+high*.22)*fracture+.08*Math.sin(run*7.1+y*1.3);
    return {x:a[0]!+dx*along+nx*relief,y,z:a[1]!+dz*along+nz*relief};};
   const base=point(.5,0);wallPoints.push(base);
   if(edge===5)continue;
   const rows=Array.from({length:25},(_,r)=>Array.from({length:7},(_,c)=>{
    const p=point(c/6,0),arch=edge===0&&Math.abs(p.x-MIRROR_GALLERY.x)<MIRROR_GALLERY.halfWidth;
    const t=(p.x-MIRROR_GALLERY.x)/MIRROR_GALLERY.halfWidth;
    const bottom=arch?1.6*(1-Math.abs(t))+3.55*Math.sqrt(Math.max(0,1-t*t)):-.35;
    return point(c/6,bottom+(26-bottom)*r/24);
   }));
   if(edge!==5){const wall=surface('glacial-wall',rows,rock,true,1);const uv=wall.getVerticesData('uv');for(let k=0;k<uv.length;k+=2){uv[k]=(distance+(segment+uv[k])/count*length)*.23;uv[k+1]*=4;}wall.setVerticesData('uv',uv);}
   if(edge===0&&Math.abs(base.x-MIRROR_GALLERY.x)<3.4)continue;
   // A broken skirt sinks below the floor and meets it over an irregular width.
   const skirt=surface('wall-toe',Array.from({length:3},(_,r)=>Array.from({length:5},(_,c)=>{
    const p=point(c/4,0),inset=r===0?-.2:r===1?.28:1.0+.22*Math.sin((distance+(segment+c/4)/count*length)*3.7);
    return {x:p.x-nx*inset,y:r===0?.38:r===1?.16:-.025,z:p.z-nz*inset};
   })),snow,false,2);wallFeet.push(skirt);
   contactSeeds.push({x:base.x-nx*.52,z:base.z-nz*.52,w:3.3,d:1.9});
   if(edge!==5)for(let j=0;j<2;j++){
    const q=point(.22+j*.5,0),seed=edge*53+segment*7+j;
    wallFeet.push(lump('frozen-rubble',q.x+nx*.15,.08+rand(seed)*.1,q.z+nz*.15,.3+rand(seed+1)*.5,.2+rand(seed+2)*.4,.3+rand(seed+3)*.5,seed,snow));
   }
  }
  distance+=length;
 }
 // One real, bent passage: successive ice ribs recede into an unlit bend.
 const tunnelMats=Array.from({length:5},(_,i)=>{const m=material('tunnel-'+i,['#476777','#304e60','#1c3546','#0c1b29','#030811'][i]!);m.backFaceCulling=false;m.emissiveColor=B.Color3.Black();return m;});
 const archRing=(depth:number)=>Array.from({length:19},(_,i)=>{
  const angle=i/18*Math.PI,t=depth/MIRROR_GALLERY.depth,shape=1+.045*Math.sin(i*2.7+t*6);
  return {x:MIRROR_GALLERY.x+Math.cos(angle)*MIRROR_GALLERY.halfWidth*(1-t*.26)*shape+t*t*2.4,
   y:Math.sin(angle)*3.55*(1-t*.18)+1.6*(1-Math.abs(Math.cos(angle)))+.03,
   z:MIRROR_GALLERY.z+.55-depth+.12*Math.sin(i*2.2)};
 });
 for(let i=0;i<5;i++){
  surface('gallery-depth',Array.from({length:4},(_,j)=>archRing((i+j/3)*3)),tunnelMats[i],false,2);
  const floor=layer(B.MeshBuilder.CreateGround('mirror:gallery-floor',{width:5.5-i*.35,height:3.3},scene),tunnelMats[i],false);floor.position.set(MIRROR_GALLERY.x+i*i*.09,.003,MIRROR_GALLERY.z-i*3-1.5);
 }
 const end=archRing(15),backRows=[end,end.map(p=>({x:MIRROR_GALLERY.x+2.4,y:.02,z:p.z-.3}))];surface('gallery-dark-bend',backRows,tunnelMats[4],false);
 // Overhead ice vault. Only its real sight intersections soften, leaving the
 // ceiling silhouette and hanging ice visible across the top of the frame.
 for(let band=0;band<12;band++){
  const x=-18+band*3.5;
  surface('vault',Array.from({length:6},(_,r)=>Array.from({length:5},(_,c)=>({x:x+c*.875,y:10.8+Math.sin((x+c*.875)*.31)*.55+Math.sin(r*.9+x+c*.875)*.2,z:13.4+r*1.9+.5*Math.sin((x+c*.875)*.7)}))),rock,true,2);
 }
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const outer=side<0?-16.1:22.1;
  surface('side-vault',Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>({x:outer-side*r*.6,y:7.5+Math.sin(r/4*Math.PI/2)*3.5+.2*Math.sin(-10+i*4+c),z:-10+i*4+c}))),rock,true,1.4);
 }
 const icicles:any[]=[];
 function icicle(x:number,top:number,z:number,length:number,seed:number,mat:any){
  const m=layer(B.MeshBuilder.CreateCylinder('mirror:stalactite',{diameterTop:.15+rand(seed)*.28,diameterBottom:.015,height:length,tessellation:6,subdivisions:2},scene),mat,true);
  m.position.set(x,top-length/2,z);m.rotation.set((rand(seed+2)-.5)*.16,seed,.05*Math.sin(seed));icicles.push(m);return m;
 }
 for(let i=0;i<28;i++){const x=-16+rand(i+18)*38,z=19+rand(i+81)*4;icicle(x,10.8+Math.sin(x*.31)*.55,z,.6+rand(i+25)*2.2,i,rock);}
 for(let i=0;i<11;i++){const x=MIRROR_GALLERY.x-2.5+i*.5,top=1.6+3.55*Math.sqrt(Math.max(0,1-((x-MIRROR_GALLERY.x)/2.75)**2));icicle(x,top-.1,MIRROR_GALLERY.z-.2,.3+rand(i+71)*.8,i+55,rock);}
 // Original, tileable glacial surfaces: broad blue ice, oblique fissures and
 // frost accretion instead of repeated horizontal sediment bands.
 function paint(name:string,kind:'rock'|'snow'|'ice'){
  const tex=new B.DynamicTexture('mirror:'+name,{width:512,height:512},scene,true,B.Texture.TRILINEAR_SAMPLINGMODE),c=tex.getContext();owned.push(tex);
  c.fillStyle=kind==='rock'?'#476c80':kind==='snow'?'#c8d1d4':'#354d60';c.fillRect(0,0,512,512);
  if(kind==='rock'){
   for(let i=0;i<36;i++){const x=rand(i+71)*512,y=rand(i+22)*512,r=30+rand(i+32)*100;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%3?'#97b8c45c':'#13374b99');g.addColorStop(1,'#476c8000');c.fillStyle=g;c.fillRect(0,0,512,512);}
   for(let i=0;i<45;i++)for(const offset of [-512,0,512]){
    let x=rand(i+19)*512+offset,y=-80+rand(i+11)*150;c.beginPath();c.moveTo(x,y);
    for(let j=0;j<8;j++){x+=12+rand(i*17+j)*24;y+=48+rand(i*19+j)*42;c.lineTo(x,y);}
    c.strokeStyle=i%4?'#0e354b66':'#c9e0e099';c.lineWidth=i%4?2.5:1;c.stroke();
    c.strokeStyle='#8db8c744';c.lineWidth=6;c.stroke();
   }
   for(let i=0;i<450;i++){const x=rand(i+500)*512,y=rand(i+600)*512;c.fillStyle='#dcebed55';c.fillRect(x,y,2+rand(i+901)*6,1+rand(i+810)*4);}
  }
  for(let i=0;i<850;i++){const x=Math.floor(rand(i+71)*128)*4,y=Math.floor(rand(i+91)*128)*4;c.fillStyle=kind==='rock'?(i%3?'#48586366':'#afbdc044'):kind==='snow'?(i%3?'#a6b8c144':'#eef0eb88'):(i%3?'#718c9c44':'#172d3c66');c.fillRect(x,y,4+rand(i+33)*22,2+rand(i+45)*6);}
  if(kind==='ice')for(let i=0;i<14;i++){const x=rand(i+19)*512,y=rand(i+29)*512;c.strokeStyle=i%2?'#b8ccd1':'#0e2434';c.lineWidth=i%2?2:4;c.beginPath();c.moveTo(x,y);c.lineTo(x+25,y+35);c.lineTo(x-8,y+74);c.lineTo(x+42,y+112);c.stroke();}
  tex.update();tex.wrapU=tex.wrapV=B.Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=4;return tex;
 }
 const strata=paint('glacial-fissures','rock'),snowPaint=paint('snow-drift','snow'),icePaint=paint('fractured-ice','ice');
 const normal=new B.DynamicTexture('mirror:ice-normal',{width:256,height:256},scene,true);owned.push(normal);const nc=normal.getContext(),pixels=nc.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,slope=Math.sin(x*.09+y*.025)*18+Math.sin(x*.39-y*.08)*9;pixels.data[i]=128+slope;pixels.data[i+1]=128+Math.cos(x*.08+y*.06)*8;pixels.data[i+2]=251;pixels.data[i+3]=255;}nc.putImageData(pixels,0,0);normal.update();normal.wrapU=normal.wrapV=B.Texture.WRAP_ADDRESSMODE;normal.level=.55;
 for(const m of [rock,near,far,...tunnelMats]){m.diffuseTexture=strata;m.bumpTexture=normal;m.diffuseColor=B.Color3.FromHexString(m===near?'#66818e':m===far?'#738597':m===rock?'#afc8d0':m.diffuseColor.toHexString());m.specularColor=new B.Color3(.24,.36,.42);m.specularPower=38;}
 snow.diffuseTexture=snowPaint;snow.diffuseColor=new B.Color3(.82,.87,.87);
 const ground=material('snow-ground','#9ca8b3');ground.diffuseTexture=snowPaint;
 const ice=material('ice','#8babb9');ice.diffuseTexture=icePaint;ice.specularColor=new B.Color3(.15,.22,.27);ice.backFaceCulling=false;
 for(const mesh of parent.getChildMeshes()){
  if(/^(floor|artGround|d8-continuous-ground-patch|d8-horizon-(ground|continuous-floor|island|cave-apron))$/.test(mesh.name)){mesh.material=ground;}
  if(/^(iceFloeTop|merged_iceFloeTop|iceFloeUnder|merged_iceFloeUnder|waterArea)/.test(mesh.name)){mesh.material=ice;}
 }
 const floorPositions:number[]=[2,.006,2,...MIRROR_WALL_OUTLINE.flatMap(p=>[p[0]!,.006,p[1]!])],floorIndices:number[]=[],floorNormals:number[]=[];
 for(let i=0;i<MIRROR_WALL_OUTLINE.length;i++)floorIndices.push(0,(i+1)%MIRROR_WALL_OUTLINE.length+1,i+1);
 B.VertexData.ComputeNormals(floorPositions,floorIndices,floorNormals);const extendedFloor=new B.Mesh('mirror:continuous-cave-floor',scene),floorData=new B.VertexData();floorData.positions=floorPositions;floorData.indices=floorIndices;floorData.normals=floorNormals;floorData.uvs=[];for(let i=0;i<floorPositions.length;i+=3)floorData.uvs.push(floorPositions[i]!*.25,floorPositions[i+2]!*.25);floorData.applyToMesh(extendedFloor);layer(extendedFloor,ground,false);
 // Continue the observer's section below the frame, especially in portrait;
 // this is scenery only and never adds navigation outside the authored grid.
 surface('foreground-floor',[[{x:-12.6,y:.006,z:16.6},{x:20.4,y:.006,z:16.6}],[{x:-30,y:.006,z:75},{x:38,y:.006,z:75}]],ground,false,14);
 for(const mesh of parent.getChildMeshes())if(!mesh.metadata?.mirrorPresentation&&/^(floor|artGround|d8-continuous-ground-patch|d8-horizon-(ground|continuous-floor|island|cave-apron))$/.test(mesh.name)){mesh.setEnabled(false);mesh.isVisible=false;}
 const contactTexture=new B.DynamicTexture('mirror:contact-mask',{width:128,height:128},scene,false);owned.push(contactTexture);contactTexture.hasAlpha=true;
 const cc=contactTexture.getContext(),cg=cc.createRadialGradient(64,64,5,64,64,63);cg.addColorStop(0,'rgba(5,17,25,.68)');cg.addColorStop(.38,'rgba(9,27,34,.34)');cg.addColorStop(.76,'rgba(16,40,47,.10)');cg.addColorStop(1,'rgba(16,40,47,0)');cc.fillStyle=cg;cc.fillRect(0,0,128,128);
 for(let i=0;i<500;i++){cc.fillStyle='rgba(136,168,175,.045)';cc.fillRect(rand(i+70)*128,rand(i+40)*128,2,2);}contactTexture.update();
 const contactMat=material('contact-occlusion','#FFFFFF');contactMat.diffuseTexture=contactTexture;contactMat.useAlphaFromDiffuseTexture=true;contactMat.disableLighting=true;contactMat.emissiveColor=B.Color3.White();contactMat.disableDepthWrite=true;contactMat.backFaceCulling=false;
 const stamps:any[]=[];
 function contact(x:number,z:number,w:number,d:number){const m=layer(B.MeshBuilder.CreateGround('mirror:contact-shadow',{width:w,height:d},scene),contactMat,false);m.position.set(x,.018,z);return m;}
 for(const p of contactSeeds)stamps.push(contact(p.x,p.z,p.w,p.d));
 for(const [name,pieces,mat] of [['contact-grime',stamps,contactMat],['ice-taluses',wallFeet,snow]] as const){if(pieces.length){const m=B.Mesh.MergeMeshes(pieces,true,true,undefined,false,false);if(m){m.name='mirror:'+name;layer(m,mat,false);}}}
 // Coplanar decorative ground shares a material and needs no independent fade.
 // Preserve its exact vertex coordinates/UVs while reducing repeated draws.
 for(const name of ['artGround','d8-continuous-ground-patch']){
  const pieces=parent.getChildMeshes().filter((m:any)=>m.name===name);if(pieces.length<2)continue;
  const merged=B.Mesh.MergeMeshes(pieces,true,true,undefined,false,false);if(merged){merged.name=name;merged.parent=parent;merged.material=ground;merged.isPickable=false;merged.metadata={tokenOccluder:false};}
 }
 // Fractured, oblique prisms clustered at the wall feet; no floating cones.
 for(let i=0;i<16;i++){
  const side=i%2?1:-1,x=side<0?-15.8:21.65,z=-5+i%8*2.3;
  for(let j=0;j<3;j++){
   const h=.6+rand(i*7+j+10)*1.8,shard=layer(B.MeshBuilder.CreateCylinder('mirror:fractured-crystal',{diameterTop:.12,diameterBottom:.35,height:h,tessellation:5},scene),ice);
   shard.position.set(x+j*.17,.2+h/2,z+j*.3);shard.rotation.set(.14*(j-1),i*.77,.18*side);
  }
 }
 const legacyRelic=parent.getChildMeshes().filter((m:any)=>!m.metadata?.mirrorPresentation&&(m.metadata?.authoredPropId==='true-love-mirror'||/^(mirrorFrame|mirrorGlass|mirrorSupport|magicBase|magicCore|magicRing)/.test(m.name)));
 const relic=layer(B.MeshBuilder.CreatePlane('mirror:ornate-silver',{width:4.1,height:4.1},scene),material('ornate-silver','#b5c0ca'),false);
 relic.position.set(-9.2,2.053,-2.5);relic.rotation.y=.18;
 const relicTexture=new B.Texture('/art/tokens/Espejo/espejo_amor_verdadero_base.png',scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);owned.push(relicTexture);relicTexture.hasAlpha=true;
 const silver=relic.material;silver.diffuseTexture=relicTexture;silver.useAlphaFromDiffuseTexture=true;silver.backFaceCulling=false;silver.transparencyMode=B.Material.MATERIAL_ALPHATEST;silver.alphaCutOff=.15;silver.specularColor=new B.Color3(.3,.33,.38);silver.emissiveColor=new B.Color3(.15,.17,.19);
 const activationTextures=['espejo_amor_verdadero_activacion_01.png','espejo_amor_verdadero_activacion_02.png'].map(name=>{const t=new B.Texture('/art/tokens/Espejo/'+name,scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);t.hasAlpha=true;owned.push(t);return t;});
 let sequence:{started:number;duration:number}|null=null;
 function transform({age=0,duration=1600}={}){sequence={started:performance.now()-age,duration};}
 // The painted object already includes its full pedestal. A second cylinder
 // underneath created the bright mismatching band reported in review.
 const foot=contact(-9.2,-2.5,2.05,1.0);
 // Interior lighting is independent of exterior weather/time. A small entrance
 // contribution changes with the shared clock; the relic retains its own light.
 const oldLights=scene.lights.filter((l:any)=>l.parent===parent);for(const l of oldLights)l.setEnabled(false);
 const main=new B.PointLight('mirror:relic-light',new B.Vector3(-9.2,2.4,-2.0),scene);main.parent=root;main.diffuse=new B.Color3(.53,.77,.88);main.intensity=1.7;main.range=10;owned.push(main);
 const entrance=new B.PointLight('mirror:entrance-light',new B.Vector3(11,4.8,10.5),scene);entrance.parent=root;entrance.diffuse=new B.Color3(.79,.80,.76);entrance.intensity=.7;entrance.range=12;owned.push(entrance);
 const fills=scene.lights.filter((l:any)=>/Hemispheric|Directional/.test(l.getClassName()));
 const fillsBefore=fills.map((l:any)=>({light:l,intensity:l.intensity,color:l.diffuse.clone()}));
 const obsolete=parent.getChildMeshes().filter((m:any)=>!m.metadata?.mirrorPresentation&&(/^(artDetail|merged_artDetail|lampPool|magicMote|ambientWaterRipple|ripple|iceCrystal|rock|merged_rock|v13_mirror_shadow)/.test(m.name)));
 for(const m of obsolete){m.setEnabled(false);m.isVisible=false;}
 function actorLight(point:Point){const directed=art.actorLight(point);if(directed)return directed;const amount=main.isEnabled()?Math.max(0,1-Math.hypot(point.x+9.2,point.z+2.5)/9):0;return {r:.72+amount*.13,g:.77+amount*.16,b:.84+amount*.13};}
 const glow=scene.getGlowLayerByName('glow'),glowBefore=glow?.intensity;
 const hazePaint=new B.DynamicTexture('mirror:mist-mask',{width:128,height:64},scene,false);owned.push(hazePaint);hazePaint.hasAlpha=true;
 const hc=hazePaint.getContext(),gradient=hc.createRadialGradient(64,32,2,64,32,62);gradient.addColorStop(0,'rgba(161,185,198,.2)');gradient.addColorStop(.5,'rgba(112,146,169,.09)');gradient.addColorStop(1,'rgba(100,130,160,0)');hc.fillStyle=gradient;hc.fillRect(0,0,128,64);hazePaint.update();
 const hazeMat=material('low-mist','#829eac');hazeMat.diffuseTexture=hazePaint;hazeMat.useAlphaFromDiffuseTexture=true;hazeMat.disableLighting=true;hazeMat.emissiveColor=new B.Color3(.42,.53,.63);hazeMat.disableDepthWrite=true;hazeMat.backFaceCulling=false;
 const haze=Array.from({length:6},(_,i)=>{const m=layer(B.MeshBuilder.CreateGround('mirror:localized-mist',{width:9,height:3.5},scene),hazeMat,false);m.position.set(-12+i*5,.20,-10.8-(i%2)*.6);return m;});
 const dustMat=material('ice-dust','#adc7d0');dustMat.disableLighting=true;dustMat.emissiveColor=new B.Color3(.4,.59,.7);
 const dust=Array.from({length:18},(_,i)=>{const m=layer(B.MeshBuilder.CreateSphere('mirror:ice-dust',{diameter:.025+rand(i+4)*.025,segments:3},scene),dustMat,false);glow?.addIncludedOnlyMesh(m);return m;});
 const art=createMirrorArtDirection({B,scene,root,parent,owned,layer,surface,lump,contact,material,rock,far,snow,near,ground,ice,silver,main,entrance,fills,glow,relic});
 let quality='balanced',combat=false;
 function motion(time:number){
  const width=scene.getEngine().getRenderWidth(),height=scene.getEngine().getRenderHeight();quality=Math.min(width,height)<600?'light':width>=1800?'high':'balanced';
  const count=quality==='light'?6:quality==='high'?18:12;
  dust.forEach((m,i)=>{m.setEnabled(i<count);m.position.set(-12+rand(i+3)*25+Math.sin(time*.16+i)*.3,.4+rand(i+17)*2.5+Math.sin(time*.22+i)*.12,-9+rand(i+44)*17);m.visibility=(combat?.18:.4)*(.6+.4*Math.sin(time*.6+i));});
  haze.forEach((m,i)=>{m.setEnabled(quality!=='light'||i%2===0);m.position.x=-12+i*5+Math.sin(time*.045+i)*.45;m.visibility=combat?.45:.8;});
  if(glow)glow.intensity=quality==='light'?.08:.13;
 }
 function update(view:View){
  if(disposed)return;const now=performance.now(),dt=Math.min(100,now-last||16);last=now;
  combat=Boolean(view.combat);motion(now/1000);
  for(const m of legacyRelic)m.setEnabled(false);
  const progress=sequence?Math.min(1,(now-sequence.started)/sequence.duration):1;
  if(progress>=1)sequence=null;
  const intact=view.props?.find(p=>p.id==='true-love-mirror')?.structure!=='destroyed',active=Boolean(sequence);
  relic.setEnabled(intact||active&&progress<.72);foot.setEnabled(intact||active&&progress<.72);
  const activeTexture=activationTextures[progress<.35?0:1];silver.diffuseTexture=active&&activeTexture?.isReady()?activeTexture:relicTexture;
  silver.emissiveColor.set(.15+(active?.24*Math.sin(progress*Math.PI):0),.17+(active?.33*Math.sin(progress*Math.PI):0),.19+(active?.38*Math.sin(progress*Math.PI):0));
  main.setEnabled(intact||active);main.intensity=active?1.7*(1-progress)+Math.sin(progress*Math.PI)*2:1.7;entrance.intensity=.45+.25*(view.naturalLight?.ambient??.5);
  for(const l of fills){const hemi=l.getClassName()==='HemisphericLight';l.intensity=hemi?.24:.17;l.diffuse=new B.Color3(.73,.79,.87);if(l.groundColor)l.groundColor=new B.Color3(.17,.20,.26);}
  scene.ambientColor=new B.Color3(.12,.15,.19);scene.clearColor=new B.Color4(.045,.065,.09,1);scene.fogColor=new B.Color3(.07,.105,.15);scene.fogDensity=.007;
  const cam=view.cameraPosition;
  if(cam){
   const key=[cam.x,cam.y,cam.z,view.focus.x,view.focus.z,...Object.values(view.actorPositions??{}).flatMap(p=>[p.x,p.z])].map(n=>Math.round(n*8)).join(':');
   if(now-lastCutaway>120||key!==cutawayKey){lastCutaway=now;cutawayKey=key;
   const points=Object.values(view.actorPositions??{});if(!points.length)points.push(view.focus);
   // Orthographic rays are parallel; rays from camera.position diverge and miss
   // blockers near the frame edges, especially on mobile and at ±30 degrees.
   const direction=scene.activeCamera.getForwardRay().direction;
   const right=scene.activeCamera.getDirection(B.Vector3.Right());
   const rays=points.flatMap(p=>[.3,.95,1.55].flatMap(h=>[-.24,0,.24].map(w=>{const aim=new B.Vector3(p.x+right.x*w,p.y+h,p.z+right.z*w),length=150;return new B.Ray(aim.subtract(direction.scale(length)),direction,length-.08);})));
   // The relic matters when being approached, not as a global cutaway trigger.
   if(Math.hypot(view.focus.x+9.2,view.focus.z+2.5)<4)for(const h of [.3,1.4,2.8,4]){const aim=new B.Vector3(-9.2,h,-2.5);rays.push(new B.Ray(aim.subtract(direction.scale(150)),direction,149.9));}
   for(const m of occluders){const blocked=rays.some(r=>mirrorMeshBlocksSegment(m,r));if(blocked)held.set(m.uniqueId,now+220);}
   }
   // Several foreground layers can overlap the same actor at a limited orbit.
   // A 32% opacity on every layer compounded until the actor nearly vanished.
   // Open only the blocking foreground; the opaque far wall/floor remains.
   for(const m of occluders){const target=(held.get(m.uniqueId)??0)>now?.035:1;m.visibility+=(target-m.visibility)*(1-Math.exp(-dt/110));if(Math.abs(target-m.visibility)<.008)m.visibility=target;m.isVisible=true;}
  }
  art.update(view,now/1000);
 }
 function dispose(){if(disposed)return;disposed=true;art.dispose();if(glow)glow.intensity=glowBefore;for(const f of fillsBefore){f.light.intensity=f.intensity;f.light.diffuse=f.color;}root.dispose(false,false);for(const r of owned)r.dispose();held.clear();}
 scene.onDisposeObservable.addOnce(dispose);
 const controller={update,dispose,actorLight,sampleIce:art.sampleIce,transform,get diagnostics(){return {phase:'art-direction',art:art.diagnostics,quality,sequence:sequence?'activation':'rest',focus:'body-only triangle occlusion; translucent ice',meshes:root.getChildMeshes().length,occluders:occluders.length,softened:occluders.filter(m=>m.visibility<.99).length,hidden:occluders.filter(m=>!m.isVisible).length,galleries:1,wallHeight:26,stalactites:icicles.length};}};
 track(controller);return controller;
}

