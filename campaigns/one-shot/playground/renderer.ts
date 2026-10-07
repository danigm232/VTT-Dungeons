// @ts-nocheck -- Babylon Playground uses an injected API namespace and legacy dynamic builders.
export type D8SceneRendererOptions = {
  config: any;
  version?: string;
  babylon?: any;
  integrated?: boolean;
  mapId?: string;
};
/** Surface deposition is cumulative; a short shower must not instantly paint everything. */
export function advanceD8WeatherSurface(wet:number,snow:number,kind:string,intensity:number,seconds:number){
  const level=Math.max(0,Math.min(1,intensity)),dt=Math.max(0,Math.min(1,seconds));
  return {wet:Math.max(0,Math.min(1,wet+dt*(kind==='rain'?level/20:-1/120))),snow:Math.max(0,Math.min(1,snow+dt*(kind==='snow'?level/60:kind==='rain'?-1/90:-1/240)))};
}

export function createD8Scene(engine: any, canvas: any, options: D8SceneRendererOptions) {
  const BABYLON: any = options.babylon ?? (globalThis as any).BABYLON;
  const D8NIGHT = options.config;
  const D8_VERSION = options.version ?? "V49";
  const integrated = options.integrated === true;
  if (!BABYLON || !D8NIGHT?.maps) throw new Error("D8 Babylon renderer is missing its public map config or Babylon runtime");
  const scene = new BABYLON.Scene(engine);
  scene.skipPointerMovePicking=true;
  const camera = new BABYLON.ArcRotateCamera("camera",-Math.PI/2.15,0.70,20,BABYLON.Vector3.Zero(),scene);
  if (!integrated) camera.attachControl(canvas,true);
  camera.lowerRadiusLimit=10; camera.upperRadiusLimit=34; camera.lowerBetaLimit=0.48; camera.upperBetaLimit=1.05; camera.wheelPrecision=38;

  const hemi=new BABYLON.HemisphericLight("global",new BABYLON.Vector3(0,1,0),scene);
  hemi.intensity=0.28;
  const glow=new BABYLON.GlowLayer("glow",scene,integrated?{mainTextureRatio:.25,blurKernelSize:16}:{}); glow.intensity=0.72;
  if(integrated)glow.setExcludedByDefault(true);

  // V18 GRAPHICS PIPELINE — shared visual foundation for every D8 Night scene.
  // CANON remains untouched; this only affects VTT_AMBIENCE rendering.
  const pipeline=new BABYLON.DefaultRenderingPipeline("d8_v18_pipeline",!integrated,scene,[camera]);
  // FXAA handles the post-processed image; stacking 4x MSAA on the HDR targets
  // was unnecessarily expensive on integrated GPUs and mobile clients.
  pipeline.samples=1;
  pipeline.fxaaEnabled=true;
  pipeline.bloomEnabled=!integrated;
  pipeline.bloomThreshold=0.82;
  pipeline.bloomWeight=0.18;
  pipeline.bloomKernel=48;
  pipeline.bloomScale=0.50;
  pipeline.sharpenEnabled=!integrated;
  pipeline.sharpen.edgeAmount=0.12;
  pipeline.sharpen.colorAmount=1.0;
  pipeline.imageProcessingEnabled=!integrated;

  // SSAO2 gives grounded contact depth to props/walls without changing gameplay geometry.
  // Half-resolution ratio keeps the Playground/WebGL2 cost controlled.
  let ssao:any=null;
  try{
    if(!integrated&&BABYLON.SSAO2RenderingPipeline){
      ssao=new BABYLON.SSAO2RenderingPipeline("d8_v18_ssao",scene,{ssaoRatio:0.45,blurRatio:0.45});
      ssao.samples=8;
      ssao.radius=1.25;
      ssao.totalStrength=0.72;
      ssao.base=0.08;
      ssao.expensiveBlur=false;
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("d8_v18_ssao",camera);
    }
  }catch(err){console.warn("[D8 "+D8_VERSION+"] SSAO2 unavailable; continuing without AO",err);ssao=null;}

  function graphicsV18(c:any){
    const e=c.VTT_AMBIENCE?.environment??{};
    const v=c.VTT_AMBIENCE?.visual??{};
    const mode=c.VTT_AMBIENCE?.lighting?.mode??"interior";
    // Restrained bloom: emissive magic/fire reads clearly without washing out the 2.5D floor.
    pipeline.bloomThreshold=v.bloomThreshold??(mode==="exterior"?0.88:0.80);
    pipeline.bloomWeight=v.bloomWeight??(mode==="exterior"?0.12:0.18);
    pipeline.bloomKernel=v.bloomKernel??48;
    pipeline.sharpen.edgeAmount=v.pipelineSharpen??0.12;
    // Existing per-map environment values remain authoritative.
    const ip=scene.imageProcessingConfiguration;
    ip.exposure=e.exposure??1.0;
    ip.contrast=e.contrast??1.0;
    ip.toneMappingEnabled=e.toneMapping!==false;
    if(ip.toneMappingEnabled && BABYLON.ImageProcessingConfiguration?.TONEMAPPING_ACES!==undefined){
      ip.toneMappingType=BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    }
    // Keep AO subtle on bright/exterior scenes and stronger in enclosed scenes.
    if(ssao){
      // The Temple and Mirror maps have the densest solid scenery and lights;
      // use half the AO taps there to keep their real-time view responsive.
      ssao.samples=rt.id==="temple"||rt.id==="mirror"?4:8;
      ssao.radius=v.aoRadius??(mode==="exterior"?0.95:1.25);
      ssao.totalStrength=v.aoStrength??(mode==="exterior"?0.52:0.72);
      ssao.base=v.aoBase??0.08;
    }
  }

  function mat(name:string,c:number[],o:any={}) {
    const m=new BABYLON.StandardMaterial(name,scene);
    m.diffuseColor=new BABYLON.Color3(c[0],c[1],c[2]);
    m.ambientColor=new BABYLON.Color3(1,1,1);
    const s=o.specular??0.035; m.specularColor=new BABYLON.Color3(s,s,s);
    if(o.emissive)m.emissiveColor=new BABYLON.Color3(o.emissive[0],o.emissive[1],o.emissive[2]);
    if(o.alpha!==undefined)m.alpha=o.alpha;
    if(o.disableLighting)m.disableLighting=true;
    m.maxSimultaneousLights=o.maxLights??6;
    return m;
  }

  const M:any={
    stone:mat("stone",[0.26,0.21,0.16]), stone2:mat("stone2",[0.34,0.27,0.20]), stoneDark:mat("stoneDark",[0.16,0.125,0.095]),
    stoneLight:mat("stoneLight",[0.47,0.39,0.29]), wood:mat("wood",[0.30,0.12,0.035]), woodLight:mat("woodLight",[0.47,0.23,0.07]),
    woodDark:mat("woodDark",[0.17,0.065,0.022]), green:mat("green",[0.14,0.28,0.07]), red:mat("red",[0.43,0.025,0.018]),
    purple:mat("purple",[0.31,0.13,0.45]), yellow:mat("yellow",[0.70,0.42,0.05]), snow:mat("snow",[0.73,0.79,0.84]),
    ice:mat("ice",[0.15,0.40,0.58],{alpha:0.88,specular:0.5}), water:mat("water",[0.005,0.18,0.24],{alpha:0.75,specular:0.85,emissive:[0,0.03,0.05]}),
    waterGlow:mat("waterGlow",[0.02,0.50,0.52],{alpha:0.15,emissive:[0,0.16,0.17]}),
    fireOuter:mat("fireOuter",[1,0.08,0.005],{emissive:[1,0.08,0]}), fireInner:mat("fireInner",[1,0.62,0.02],{emissive:[1,0.40,0]}),
    smoke:mat("smoke",[0.15,0.14,0.13],{alpha:0.13,disableLighting:true}), dust:mat("dust",[1,0.70,0.25],{alpha:0.5,emissive:[0.35,0.14,0]}),
    player:mat("player",[0.02,0.58,1],{emissive:[0,0.08,0.18]}), gold:mat("gold",[0.72,0.43,0.07]),
    wax:mat("wax",[0.82,0.72,0.53]), ceramic:mat("ceramic",[0.72,0.67,0.56],{specular:0.12}),
    iron:mat("iron",[0.18,0.17,0.16],{specular:0.18}), clothRed:mat("clothRed",[0.34,0.035,0.025]), clothBlue:mat("clothBlue",[0.05,0.12,0.24]),
    templeBurgundy:mat("templeBurgundy",[0.20,0.032,0.024]),
    rose:mat("rose",[0.62,0.025,0.035],{emissive:[0.025,0,0]}), rosePink:mat("rosePink",[0.78,0.14,0.22]), leaf:mat("leaf",[0.08,0.24,0.07]), leafDark:mat("leafDark",[0.035,0.12,0.035]),
    frost:mat("frost",[0.44,0.68,0.78],{alpha:0.80,specular:0.6,emissive:[0.006,0.020,0.032]}), magicBlue:mat("magicBlue",[0.08,0.52,1],{emissive:[0.03,0.30,0.85],alpha:0.92}),
    magicWhite:mat("magicWhite",[0.78,0.92,1],{emissive:[0.35,0.58,0.85]}), roof:mat("roof",[0.17,0.055,0.025]), roofLight:mat("roofLight",[0.40,0.20,0.095]), plaster:mat("plaster",[0.58,0.50,0.39]),
    soil:mat("soil",[0.17,0.08,0.035]), grass:mat("grass",[0.09,0.22,0.055]), lanternGlass:mat("lanternGlass",[1,0.56,0.10],{emissive:[0.9,0.28,0.02],alpha:0.72})
  };

  let rt:any={id:null,config:null,root:null,layers:{},colliders:[],interactables:[],geometryInteractables:[],navZones:[],navDebug:[],navBounds:null,updaters:[],grid:null,disposables:[],markers:{fireplaces:[],pools:[],roses:[],magic:[]}};
  let gridVisible=false, overview=false, nearest:any=null, elapsed=0;
  const reset=(id:string,c:any)=>{
    if(rt.disposables)rt.disposables.forEach((d:any)=>{try{d.dispose();}catch{}});
    if(rt.root)rt.root.dispose(false,false);
    const root=new BABYLON.TransformNode("MAP_"+id,scene);
    const layers:any={};
    for(const name of ["BASE","PROPS","VFX","INTERACTABLES","DEBUG"]){
      const node=new BABYLON.TransformNode("LAYER_"+name,scene);node.parent=root;layers[name]=node;
    }
    rt={id,config:c,root,layers,colliders:[],interactables:[],geometryInteractables:[],navZones:[],navDebug:[],interactionState:{},updaters:[],grid:null,disposables:[],markers:{fireplaces:[],pools:[],roses:[],magic:[]}};
  };

  const parentFor=(layer:string="PROPS")=>rt.layers?.[layer]??rt.root;
  const box=(n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:any,layer:string="PROPS")=>{const q=BABYLON.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);q.position.set(x,y,z);q.material=m;q.parent=parentFor(layer);return q;};
  const cyl=(n:string,x:number,y:number,z:number,d:number,h:number,m:any,layer:string="PROPS")=>{const q=BABYLON.MeshBuilder.CreateCylinder(n,{diameter:d,height:h,tessellation:24},scene);q.position.set(x,y,z);q.material=m;q.parent=parentFor(layer);return q;};
  const sph=(n:string,x:number,y:number,z:number,d:number,m:any,layer:string="PROPS")=>{const q=BABYLON.MeshBuilder.CreateSphere(n,{diameter:d,segments:12},scene);q.position.set(x,y,z);q.material=m;q.parent=parentFor(layer);return q;};
  const collider=(x:number,z:number,w:number,d:number)=>rt.colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
  const track=(d:any)=>{rt.disposables.push(d);return d;};

  const VISUAL_FLOORS:any={};
  const seeded=(n:number)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};

  // Build a small tangent-space normal map from our own procedural canvas.
  // This keeps the Playground payload self-contained while giving stone/ice
  // relief under the real map lights (no downloaded textures or CORS paths).
  function reliefTexture(source:any,name:string,strength=0.75,size=512){
    const sourceCanvas=source?.getContext?.()?.canvas;
    if(!sourceCanvas)return null;
    const tex=new BABYLON.DynamicTexture(name,{width:size,height:size},scene,false);
    const ctx:any=tex.getContext();
    ctx.drawImage(sourceCanvas,0,0,size,size);
    const image=ctx.getImageData(0,0,size,size),pixels=image.data;
    const luma=new Float32Array(size*size);
    for(let i=0,p=0;i<pixels.length;i+=4,p++)luma[p]=(pixels[i]*0.2126+pixels[i+1]*0.7152+pixels[i+2]*0.0722)/255;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const p=y*size+x,left=y*size+(x+size-1)%size,right=y*size+(x+1)%size;
      const up=((y+size-1)%size)*size+x,down=((y+1)%size)*size+x;
      let nx=-(luma[right]-luma[left])*strength,ny=-(luma[down]-luma[up])*strength,nz=1;
      const inv=1/Math.sqrt(nx*nx+ny*ny+nz*nz);nx*=inv;ny*=inv;nz*=inv;
      const i=p*4;pixels[i]=Math.round((nx*0.5+0.5)*255);pixels[i+1]=Math.round((ny*0.5+0.5)*255);pixels[i+2]=Math.round((nz*0.5+0.5)*255);pixels[i+3]=255;
    }
    ctx.putImageData(image,0,0);tex.update();
    tex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;tex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.uScale=source.uScale??1;tex.vScale=source.vScale??1;
    tex.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);tex.anisotropicFilteringLevel=4;
    return tex;
  }

  function proceduralSurfaceTexture(kind:string,name:string,size=512){
    const tex=new BABYLON.DynamicTexture(name,{width:size,height:size},scene,false);
    const ctx:any=tex.getContext(),W=size,H=size;
    ctx.fillStyle=kind==="roof"?"#c8c5bf":"#e0ded7";ctx.fillRect(0,0,W,H);
    if(kind==="wood"){
      const rows=8,rh=H/rows;
      for(let row=0;row<rows;row++){
        const y=row*rh;
        ctx.fillStyle=row%2?"rgba(76,58,43,0.035)":"rgba(255,255,255,0.045)";ctx.fillRect(0,y,W,rh);
        ctx.strokeStyle="rgba(42,30,20,0.18)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y+1);ctx.lineTo(W,y+1);ctx.stroke();
        for(let i=0;i<22;i++){
          const sy=y+seeded(row*91+i*2.2)*rh,sx=seeded(row*71+i*8.1)*W,len=W*(0.18+seeded(i*9.7+row)*0.72);
          ctx.strokeStyle=i%3===0?"rgba(57,39,25,0.10)":"rgba(255,255,255,0.095)";ctx.lineWidth=1+seeded(i+row)*2;
          ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+len*0.28,sy-2,sx+len*0.63,sy+2,sx+len,sy+(seeded(i*3+row)-0.5)*4);ctx.stroke();
        }
        if(row%2===0){
          const kx=seeded(row*17+2)*W,ky=y+rh*0.52;
          ctx.strokeStyle="rgba(54,34,22,0.16)";ctx.lineWidth=2;
          for(let ring=0;ring<3;ring++){ctx.beginPath();ctx.ellipse(kx,ky,5+ring*5,2+ring*2,0,0,Math.PI*2);ctx.stroke();}
        }
      }
      for(let i=0;i<520;i++){
        const x=seeded(i*7.3)*W,y=seeded(i*13.9)*H;
        ctx.fillStyle=i%2?"rgba(55,39,25,0.10)":"rgba(255,255,255,0.16)";ctx.fillRect(x,y,1+seeded(i)*2,2+seeded(i+1)*7);
      }
    }else if(kind==="stone"){
      const cols=5,rows=7,cw=W/cols,rh=H/rows;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const seed=row*73+col*131+31,pad=5+seeded(seed)*5,x=col*cw+(row%2?cw*0.5:0)+pad,y=row*rh+pad,w=cw-2*pad,h=rh-2*pad;
        ctx.fillStyle=seeded(seed+1)>0.52?"rgba(255,255,255,0.055)":"rgba(60,57,52,0.055)";
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*0.92,y+2);ctx.lineTo(x+w,y+h*0.72);ctx.lineTo(x+w*0.79,y+h);ctx.lineTo(x+2,y+h*0.89);ctx.closePath();ctx.fill();
        ctx.strokeStyle="rgba(52,47,41,0.12)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+w*0.16,y+h*0.28);ctx.lineTo(x+w*0.48,y+h*0.19);ctx.lineTo(x+w*0.53,y+h*0.33);ctx.stroke();
      }
      for(let i=0;i<720;i++){
        const x=seeded(i*9.1)*W,y=seeded(i*15.7)*H,r=0.4+seeded(i*3.7)*1.8;
        ctx.fillStyle=i%3?"rgba(42,39,35,0.12)":"rgba(255,255,255,0.19)";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
    }else if(kind==="stucco"){
      for(let i=0;i<120;i++){
        const x=seeded(i*5.3)*W,y=seeded(i*11.7)*H,r=5+seeded(i*2.1)*34;
        ctx.fillStyle=i%3?"rgba(78,65,49,0.040)":"rgba(255,255,255,0.080)";ctx.beginPath();ctx.ellipse(x,y,r,r*0.55,seeded(i)*Math.PI,0,Math.PI*2);ctx.fill();
      }
      for(let i=0;i<18;i++){
        let x=seeded(i*7.9)*W,y=seeded(i*13.1)*H;ctx.strokeStyle="rgba(86,72,54,0.14)";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y);
        for(let j=0;j<4;j++){x+=(seeded(i*21+j)-0.5)*24;y+=(seeded(i*31+j)-0.5)*21;ctx.lineTo(x,y);}ctx.stroke();
      }
    }else if(kind==="roof"){
      const cols=9,rows=8,cw=W/cols,rh=H/rows;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const seed=row*53+col*97+13,offset=row%2?cw*0.5:0,x=col*cw+offset,y=row*rh,w=cw-2,h=rh-2;
        const shade=118+Math.floor(seeded(seed)*74);ctx.fillStyle=`rgb(${shade},${shade},${shade})`;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-2,y+rh*0.78);ctx.quadraticCurveTo(x+w*0.5,y+rh*1.06,x+2,y+rh*0.78);ctx.closePath();ctx.fill();
        ctx.strokeStyle="rgba(44,37,34,0.36)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+1,y+rh*0.78);ctx.quadraticCurveTo(x+w*0.5,y+rh*1.05,x+w-1,y+rh*0.78);ctx.stroke();
        ctx.strokeStyle="rgba(255,255,255,0.14)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+4,y+4);ctx.lineTo(x+w-4,y+4);ctx.stroke();
      }
      for(let i=0;i<65;i++){
        const x=seeded(i*4.1)*W,y=seeded(i*8.9)*H;ctx.strokeStyle="rgba(54,40,33,0.22)";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4+seeded(i)*11,y+2+seeded(i+1)*9);ctx.stroke();
      }
    }else if(kind==="cloth"){
      ctx.fillStyle="#e2dfd7";ctx.fillRect(0,0,W,H);
      for(let i=0;i<W;i+=4){
        ctx.fillStyle=i%8?"rgba(255,255,255,.10)":"rgba(48,43,37,.09)";ctx.fillRect(i,0,1,H);ctx.fillRect(0,i,W,1);
      }
      for(let fold=0;fold<7;fold++){
        const px=fold*W/6,g=ctx.createLinearGradient(px-12,0,px+12,0);
        g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.5,"rgba(44,38,32,.075)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(px-12,0,24,H);
      }
    }else if(kind==="snow"){
      ctx.fillStyle="#e5e9e8";ctx.fillRect(0,0,W,H);
      for(let i=0;i<96;i++){
        const x=seeded(i*3.7)*W,y=seeded(i*8.3)*H,rx=8+seeded(i*9.1)*58,ry=3+seeded(i*2.7)*19;
        ctx.fillStyle=i%3?"rgba(89,119,137,0.11)":"rgba(255,255,255,0.25)";ctx.beginPath();ctx.ellipse(x,y,rx,ry,seeded(i)*Math.PI,0,Math.PI*2);ctx.fill();
      }
      for(let i=0;i<620;i++){
        const x=seeded(i*19.1)*W,y=seeded(i*23.7)*H,r=0.4+seeded(i*27.3)*1.5;ctx.fillStyle=i%3?"rgba(74,107,128,0.20)":"rgba(255,255,255,0.32)";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
    }else if(kind==="ice"){
      ctx.fillStyle="#d9e2e2";ctx.fillRect(0,0,W,H);
      for(let i=0;i<38;i++){
        const seed=i*43+17,x=seeded(seed)*W,y=seeded(seed+1)*H,rx=28+seeded(seed+2)*92,ry=18+seeded(seed+3)*56;
        ctx.fillStyle=i%2?"rgba(79,139,164,0.12)":"rgba(255,255,255,0.18)";ctx.beginPath();
        for(let k=0;k<6;k++){const a=k/6*Math.PI*2,r=0.70+seeded(seed+k+4)*0.48,px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
      }
      for(let i=0;i<28;i++){
        let x=seeded(i*12.7)*W,y=seeded(i*19.3)*H;ctx.strokeStyle="rgba(45,93,117,0.28)";ctx.lineWidth=1+seeded(i)*2;ctx.beginPath();ctx.moveTo(x,y);
        for(let j=0;j<4;j++){x+=(seeded(i*37+j)-0.5)*85;y+=(seeded(i*47+j)-0.5)*54;ctx.lineTo(x,y);}ctx.stroke();
      }
    }
    tex.update();tex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;tex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);tex.anisotropicFilteringLevel=4;
    return tex;
  }

  let materialSurfacesApplied=false;
  const PROCEDURAL_SURFACES:any={};
  function applyProceduralMaterialSurfaces(){
    if(materialSurfacesApplied)return;
    const bind=(kind:string,materials:any[],bumpLevel:number,repeat=1)=>{
      const texture=proceduralSurfaceTexture(kind,"surface_"+kind+"_v37");texture.uScale=repeat;texture.vScale=repeat;
      const normal=reliefTexture(texture,"surfaceNormal_"+kind+"_v37",kind==="ice"||kind==="roof"?0.9:0.62,256);
      if(normal){normal.uScale=repeat;normal.vScale=repeat;}
      PROCEDURAL_SURFACES[kind]={texture,normal};
      materials.forEach((material:any)=>{
        material.diffuseTexture=texture;
        if(normal){material.bumpTexture=normal;material.bumpTexture.level=bumpLevel;}
        material.maxSimultaneousLights=6;
      });
    };
    bind("wood",[M.wood,M.woodLight,M.woodDark],0.075,1.0);
    bind("stone",[M.stone,M.stone2,M.stoneDark,M.stoneLight],0.085,1.0);
    bind("stucco",[M.plaster],0.10,1.0);
    bind("roof",[M.roof,M.roofLight],0.12,1.0);
    bind("cloth",[M.clothRed,M.clothBlue,M.purple,M.templeBurgundy],0.035,1.0);
    bind("snow",[M.snow],0.035,1.0);
    bind("ice",[M.ice,M.frost],0.12,1.0);
    materialSurfacesApplied=true;
  }

  function visualFloorMaterial(preset:string){
    if(VISUAL_FLOORS[preset])return VISUAL_FLOORS[preset];

    const texSize=preset==="cafe_stone"?2048:1024;
    const tex=new BABYLON.DynamicTexture("visualFloor_"+preset,{width:texSize,height:texSize},scene,false);
    const ctx:any=tex.getContext();
    const W=texSize,H=texSize;

    const palette:any={
      cafe_stone:{base:"#624a36",stone:["#87674b","#9a7552","#75583f","#a27c59"],line:"#39271b"},
      temple_stone:{base:"#51474a",stone:["#695c5e","#79696a","#5b5053","#887575"],line:"#30282a"},
      night_cobble:{base:"#393b43",stone:["#55545a","#626068","#4a4b52","#6b6564"],line:"#28272d"},
      market_cobble:{base:"#554e49",stone:["#777064","#89806d","#686157","#99907a"],line:"#34302d"},
      snow:{base:"#879aa7",stone:[],line:"#536b7b"},
      ice:{base:"#496779",stone:["#5e8191","#446777","#73909d","#496371"],line:"#a9c8d2"}
    };
    const p=palette[preset]??palette.cafe_stone;

    ctx.fillStyle=p.base;
    ctx.fillRect(0,0,W,H);

    if(preset==="snow"){
      for(let i=0;i<92;i++){
        const x=seeded(i*3.1)*W,y=seeded(i*7.7)*H,rx=25+seeded(i*11.3)*82,ry=12+seeded(i*13.7)*42;
        const a=0.085+seeded(i*4.2)*0.13;
        const g=ctx.createRadialGradient(x,y,2,x,y,rx);
        g.addColorStop(0,`rgba(47,83,105,${a})`);g.addColorStop(0.68,`rgba(111,148,166,${a*0.62})`);g.addColorStop(1,"rgba(220,237,243,0)");
        ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,ry,seeded(i*9.1)*Math.PI,0,Math.PI*2);ctx.fill();
      }
      for(let i=0;i<56;i++){
        const x=seeded(i*15.1)*W,y=seeded(i*19.7)*H;
        ctx.strokeStyle=i%3===0?"rgba(249,255,255,0.26)":"rgba(48,82,101,0.24)";
        ctx.lineWidth=1.2+seeded(i)*2.8;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+26+seeded(i+1)*96,y-10+seeded(i+2)*22);ctx.stroke();
      }
      for(let i=0;i<420;i++){
        const x=seeded(i*27.1)*W,y=seeded(i*31.7)*H,r=0.5+seeded(i*34.3)*2.2;
        ctx.fillStyle=i%4===0?"rgba(255,255,255,0.34)":"rgba(48,83,105,0.22)";
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
    } else if(preset==="ice"){
      // Natural, uneven ice facets (not a regular tile pattern).
      for(let i=0;i<46;i++){
        const seed=i*37+41;
        const x=seeded(seed)*W,y=seeded(seed+1)*H;
        const rx=38+seeded(seed+2)*118,ry=24+seeded(seed+3)*76;
        ctx.fillStyle=p.stone[Math.floor(seeded(seed+4)*p.stone.length)];
        ctx.globalAlpha=0.12+seeded(seed+5)*0.20;
        ctx.beginPath();
        for(let k=0;k<7;k++){
          const a=k/7*Math.PI*2+(seeded(seed+k+6)-0.5)*0.42;
          const r=0.68+seeded(seed+k+19)*0.52;
          const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;
          if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();
      }
      ctx.globalAlpha=1;
      for(let i=0;i<22;i++){
        const sx=seeded(i*12.1)*W,sy=seeded(i*8.7)*H;
        ctx.strokeStyle="rgba(21,64,91,0.62)";
        ctx.lineWidth=1.2+seeded(i*2)*2.2;
        ctx.beginPath();ctx.moveTo(sx,sy);
        let x=sx,y=sy;
        for(let j=0;j<5;j++){x+=(seeded(i*30+j)-0.5)*120;y+=(seeded(i*40+j)-0.5)*90;ctx.lineTo(x,y);}
        ctx.stroke();
      }
    } else {
      const cobble=preset==="night_cobble"||preset==="market_cobble";
      const cols=cobble?26:17,rows=cobble?34:21,cw=W/cols,ch=H/rows;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const seed=gx*97+gy*193+17;
        const pad=cobble?1.2+seeded(seed)*1.5:2+seeded(seed)*3;
        const x=gx*cw+pad+(gy%2?cw*0.48:0);
        const y=gy*ch+pad;
        const w=cw-pad*2,h=ch-pad*2;
        ctx.fillStyle=p.stone[Math.floor(seeded(seed+3)*p.stone.length)];
        ctx.strokeStyle=p.line;
        ctx.lineWidth=cobble?0.8:1.4;
        ctx.beginPath();
        ctx.moveTo(x+w*0.10,y);
        ctx.lineTo(x+w*0.90,y+h*0.04);
        ctx.lineTo(x+w,y+h*0.80);
        ctx.lineTo(x+w*0.76,y+h);
        ctx.lineTo(x+w*0.08,y+h*0.92);
        ctx.lineTo(x,y+h*0.22);
        ctx.closePath();ctx.fill();ctx.stroke();

        ctx.strokeStyle="rgba(255,232,193,0.15)";
        ctx.lineWidth=cobble?0.8:1.2;
        ctx.beginPath();ctx.moveTo(x+w*0.15,y+h*0.16);ctx.lineTo(x+w*0.72,y+h*0.11);ctx.stroke();
        ctx.strokeStyle="rgba(12,10,9,0.18)";ctx.lineWidth=0.8;
        ctx.beginPath();ctx.moveTo(x+w*0.12,y+h*0.88);ctx.lineTo(x+w*0.78,y+h*0.94);ctx.stroke();
      }
      for(let i=0;i<360;i++){
        const x=seeded(i*2.7+57)*W,y=seeded(i*5.3+91)*H,r=0.7+seeded(i*7.9)*2.8;
        ctx.fillStyle=i%2?"rgba(255,231,193,0.075)":"rgba(18,15,13,0.075)";
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
    }

    tex.update();
    tex.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    tex.anisotropicFilteringLevel=8;

    const m=new BABYLON.StandardMaterial("visualMat_"+preset,scene);
    m.diffuseTexture=tex;
    m.ambientColor=new BABYLON.Color3(1,1,1);
    const normal=reliefTexture(tex,"visualNormal_"+preset,preset==="ice"?1.0:(preset==="snow"?0.48:0.78),512);
    if(normal){m.bumpTexture=normal;m.bumpTexture.level=preset==="ice"?0.24:0.20;}
    m.specularColor=preset==="ice"?new BABYLON.Color3(0.30,0.38,0.44):new BABYLON.Color3(0.025,0.025,0.025);
    m.roughness=preset==="ice"?0.42:0.92;
    m.maxSimultaneousLights=6;

    // V14.8 floor visibility floor: prevents black/invisible bases in WebGL2.
    const floorEmission:any={
      cafe_stone:0.20,
      temple_stone:0.30,
      night_cobble:0.10,
      market_cobble:0.09,
      snow:0.055,
      ice:0.045
    };
    const fe=floorEmission[preset]??0.20;
    m.emissiveTexture=tex;
    m.emissiveColor=new BABYLON.Color3(fe,fe,fe);
    m.disableLighting=false;

    VISUAL_FLOORS[preset]=m;
    return m;
  }

  function floor(c:any){
    // Procedural materials stay on the native Babylon floor mesh: these are
    // surface materials, never full-scene image backgrounds. The separate
    // tactical grid remains controlled by the VTT UI.
    const preset=c.MAP.visualFloor??c.MAP.floor??"stone";
    const baseMat=rt.id==="temple"
      ?new BABYLON.StandardMaterial("floorBaseMat_"+rt.id,scene)
      :visualFloorMaterial(preset);
    if(rt.id==="temple"){
      baseMat.diffuseColor=new BABYLON.Color3(0.90,0.94,0.84);
      baseMat.ambientColor=new BABYLON.Color3(1,1,1);
      baseMat.specularColor=new BABYLON.Color3(0.015,0.020,0.012);
      baseMat.emissiveColor=new BABYLON.Color3(0.035,0.046,0.026);
      baseMat.disableLighting=false;
      baseMat.alpha=1;
      const grassTex=new BABYLON.DynamicTexture("templeGrassV34",{width:512,height:512},scene,false);
      const gc:any=grassTex.getContext();
      gc.fillStyle="#5b6651";gc.fillRect(0,0,512,512);
      for(let i=0;i<110;i++){
        const gx=seeded(i*31.7)*512,gy=seeded(i*43.1)*512,r=3+seeded(i*53.9)*16;
        gc.fillStyle=i%3===0?"rgba(18,42,22,0.05)":"rgba(140,157,84,0.05)";
        gc.beginPath();gc.ellipse(gx,gy,r,r*(0.48+seeded(i*61.3)*0.72),seeded(i*19.7)*Math.PI,0,Math.PI*2);gc.fill();
      }
      for(let i=0;i<720;i++){
        const gx=seeded(i*7.31)*512,gy=seeded(i*11.17)*512;
        const light=seeded(i*5.93)>0.58;
        gc.fillStyle=light?"rgba(155,170,94,0.24)":"rgba(22,48,24,0.25)";
        gc.fillRect(gx,gy,1+seeded(i*13.4)*3,2+seeded(i*17.9)*7);
      }
      for(let i=0;i<150;i++){
        const gx=seeded(i*19.1)*512,gy=seeded(i*23.7)*512;
        gc.strokeStyle="rgba(177,183,111,0.13)";gc.lineWidth=1;
        gc.beginPath();gc.moveTo(gx,gy);gc.lineTo(gx+2+seeded(i*4.2)*5,gy-4-seeded(i*6.8)*7);gc.stroke();
      }
      grassTex.update();grassTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;grassTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;grassTex.uScale=4.0;grassTex.vScale=4.4;
      baseMat.diffuseTexture=grassTex;baseMat.emissiveTexture=grassTex;
      const grassNormal=reliefTexture(grassTex,"templeGrassNormalV37",0.62,256);
      if(grassNormal){baseMat.bumpTexture=grassNormal;baseMat.bumpTexture.level=0.16;rt.disposables.push(grassNormal);}
      baseMat.specularColor=new BABYLON.Color3(0.015,0.020,0.012);baseMat.maxSimultaneousLights=6;
      rt.disposables.push(grassTex);
    }
    baseMat.backFaceCulling=false;
    if(rt.id==="temple")rt.disposables.push(baseMat);

    const base=BABYLON.MeshBuilder.CreateBox("floor",{
      width:c.MAP.size[0],
      height:0.10,
      depth:c.MAP.size[1]
    },scene);
    base.position.y=-0.05;
    base.material=baseMat;
    base.parent=parentFor("BASE");
    base.receiveShadows=true;
    base.isPickable=false;
    base.alwaysSelectAsActiveMesh=true;
    if(glow.addExcludedMesh)glow.addExcludedMesh(base);

    // A shallow foundation gives the cutaway a readable edge without changing
    // the walkable height, collision bounds or tactical grid.
    const foundation=box("terrainFoundation",0,-0.23,0,c.MAP.size[0],0.34,c.MAP.size[1],rt.id==="mirror"?M.ice:M.stoneDark,"BASE");
    foundation.receiveShadows=true;
    if(glow.addExcludedMesh)glow.addExcludedMesh(foundation);

    console.log("[D8 "+D8_VERSION+"] floor",rt.id,preset,"size",c.MAP.size);
  }

  function visualComposition(c:any){
    const preset=c.MAP.visualComposition;
    const opacity=c.MAP.compositionOpacity??0;
    // Full-map composition overlays are disabled by default: they sit above the
    // floor and previously hid it on Dinner/Garden/Market and partially on Temple/Mirror.
    if(!preset||!c.MAP.enableVisualComposition||opacity<=0)return;

    const tex=new BABYLON.DynamicTexture("composition_"+preset,{width:1024,height:1024},scene,false);
    tex.hasAlpha=true;
    const ctx:any=tex.getContext();
    const W=1024,H=1024;

    ctx.clearRect(0,0,W,H);

    const rect=(x:number,y:number,w:number,h:number,color:string)=>{
      ctx.fillStyle=color;ctx.fillRect(x*W,y*H,w*W,h*H);
    };
    const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{
      ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x*W,y*H,rx*W,ry*H,0,0,Math.PI*2);ctx.fill();
    };
    const glowRadial=(x:number,y:number,r:number,inner:string,outer:string)=>{
      const g=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,r*W);
      g.addColorStop(0,inner);g.addColorStop(1,outer);
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x*W,y*H,r*W,0,Math.PI*2);ctx.fill();
    };

    if(preset==="cafe_reference"){
      rect(0.02,0.00,0.96,0.22,"rgba(28,12,5,0.28)");
      glowRadial(0.13,0.41,0.22,"rgba(255,82,18,0.24)","rgba(255,82,18,0)");
      ellipse(0.25,0.50,0.18,0.22,"rgba(40,72,18,0.10)");
      glowRadial(0.65,0.86,0.17,"rgba(20,185,210,0.22)","rgba(20,185,210,0)");
      rect(0.70,0.18,0.26,0.42,"rgba(18,11,7,0.16)");
      rect(0.02,0.78,0.34,0.15,"rgba(22,13,8,0.15)");
    } else if(preset==="temple_reference"){
      rect(0.00,0.00,1,0.18,"rgba(10,8,13,0.30)");
      rect(0.08,0.15,0.84,0.70,"rgba(26,20,25,0.12)");
      glowRadial(0.50,0.54,0.24,"rgba(255,132,58,0.12)","rgba(255,132,58,0)");
      ellipse(0.18,0.72,0.13,0.08,"rgba(132,20,42,0.10)");
      ellipse(0.82,0.72,0.13,0.08,"rgba(132,20,42,0.10)");
    } else if(preset==="dinner_reference"){
      rect(0.08,0.00,0.84,0.38,"rgba(14,12,18,0.34)");
      glowRadial(0.50,0.70,0.22,"rgba(255,161,66,0.20)","rgba(255,161,66,0)");
      ellipse(0.50,0.70,0.18,0.13,"rgba(120,82,44,0.12)");
      glowRadial(0.31,0.67,0.10,"rgba(255,122,36,0.13)","rgba(255,122,36,0)");
      glowRadial(0.69,0.67,0.10,"rgba(255,122,36,0.13)","rgba(255,122,36,0)");
    } else if(preset==="garden_reference"){
      rect(0.00,0.00,1,1,"rgba(100,150,178,0.04)");
      rect(0.05,0.41,0.74,0.12,"rgba(92,106,112,0.10)");
      rect(0.66,0.08,0.11,0.63,"rgba(92,106,112,0.10)");
      ellipse(0.77,0.32,0.16,0.18,"rgba(80,68,64,0.10)");
      ellipse(0.19,0.28,0.18,0.08,"rgba(130,20,40,0.12)");
      ellipse(0.20,0.52,0.20,0.09,"rgba(130,20,40,0.12)");
      ellipse(0.22,0.74,0.20,0.09,"rgba(130,20,40,0.10)");
    } else if(preset==="market_reference"){
      rect(0.00,0.00,1,1,"rgba(47,24,9,0.035)");
      rect(0.34,0.00,0.32,1,"rgba(22,17,15,0.07)");
      rect(0.00,0.39,1,0.22,"rgba(22,17,15,0.06)");
      glowRadial(0.50,0.50,0.30,"rgba(255,122,35,0.08)","rgba(255,122,35,0)");
      for(const p of [[0.16,0.18],[0.36,0.16],[0.56,0.18],[0.78,0.20],[0.17,0.52],[0.82,0.52],[0.26,0.78],[0.74,0.78]]){
        ellipse(p[0],p[1],0.09,0.06,"rgba(42,18,7,0.13)");
      }
    } else if(preset==="mirror_reference"){
      rect(0.00,0.00,1,1,"rgba(14,64,98,0.035)");
      ellipse(0.58,0.52,0.34,0.23,"rgba(10,78,112,0.12)");
      glowRadial(0.19,0.42,0.20,"rgba(40,150,255,0.25)","rgba(40,150,255,0)");
      glowRadial(0.52,0.50,0.27,"rgba(92,235,255,0.10)","rgba(92,235,255,0)");
      glowRadial(0.70,0.36,0.24,"rgba(55,255,165,0.13)","rgba(55,255,165,0)");
      glowRadial(0.48,0.72,0.22,"rgba(72,240,175,0.10)","rgba(72,240,175,0)");
      ctx.strokeStyle="rgba(160,245,225,0.20)";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(0.30*W,0.48*H);ctx.lineTo(0.48*W,0.42*H);ctx.lineTo(0.57*W,0.55*H);ctx.lineTo(0.74*W,0.48*H);ctx.stroke();
    }

    tex.update();

    const m=new BABYLON.StandardMaterial("compositionMat_"+preset,scene);
    m.diffuseTexture=tex;
    m.useAlphaFromDiffuseTexture=true;
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    m.disableLighting=true;
    m.disableDepthWrite=true;
    m.backFaceCulling=false;
    m.alpha=opacity;

    const size=c.MAP.size;
    const g=BABYLON.MeshBuilder.CreateGround("visualComposition",{width:size[0],height:size[1]},scene);
    g.position.y=0.028;
    g.material=m;
    g.parent=parentFor("BASE");
    rt.disposables.push(tex,m);
  }

  // DynamicTexture.clone() creates an empty canvas, not a copy of its pixels.
  // Clone the lighting parameters but retain the scene-owned texture resources.
  // Map materials are disposed without textures; shared surfaces survive reloads.
  function cloneSurfaceMaterial(source:any,name:string){
    const material=source.clone(name);
    const originals=new Set(source.getActiveTextures?.()??[]);
    const duplicates=new Set(material.getActiveTextures?.()??[]);
    for(const channel of ["diffuseTexture","ambientTexture","opacityTexture","reflectionTexture","emissiveTexture","specularTexture","bumpTexture","lightmapTexture","refractionTexture"]){
      material[channel]=source[channel]??null;
    }
    duplicates.forEach((texture:any)=>{if(!originals.has(texture))texture.dispose();});
    return material;
  }

  function applyReadableFallback(c:any){
    const cfg=c.MAP.readabilityFallback;
    if(!cfg?.enabled)return;

    const strength=cfg.strength??0.20;
    const textureStrength=cfg.textureStrength??0.22;
    const diffuseBoost=cfg.diffuseBoost??1.0;
    const cache=new Map<any,any>();

    rt.root.getChildMeshes().forEach((mesh:any)=>{
      if(!mesh.material||mesh.material.metadata?.d8Authored)return;
      if(mesh.name==="floor"||mesh.name==="floorDetail"||mesh.name==="cafe14_floor"||mesh.name==="cafe14_floorDetail")return;
      if(mesh.parent===rt.layers?.VFX)return;
      if(mesh.name.includes("Flame")||mesh.name.includes("fire")||mesh.name.includes("smoke")||mesh.name.includes("dust")||mesh.name.includes("ripple")||mesh.name.includes("poolGlow"))return;

      const source=mesh.material;
      let m=cache.get(source);
      if(!m){
        m=cloneSurfaceMaterial(source,source.name+"_readable_"+rt.id);
        m.disableLighting=false;
        m.ambientColor=new BABYLON.Color3(1,1,1);
        m.maxSimultaneousLights=6;
        m.specularColor=new BABYLON.Color3(0.025,0.025,0.025);
        if(m.diffuseColor){
          m.diffuseColor=new BABYLON.Color3(
            Math.min(1,m.diffuseColor.r*diffuseBoost),
            Math.min(1,m.diffuseColor.g*diffuseBoost),
            Math.min(1,m.diffuseColor.b*diffuseBoost)
          );
        }

        if(m.diffuseTexture){
          m.emissiveTexture=m.diffuseTexture;
          m.emissiveColor=new BABYLON.Color3(textureStrength,textureStrength,textureStrength);
        }else{
          const d=m.diffuseColor??new BABYLON.Color3(0.45,0.35,0.25);
          m.emissiveColor=new BABYLON.Color3(
            Math.min(1,d.r*strength+0.018),
            Math.min(1,d.g*strength+0.014),
            Math.min(1,d.b*strength+0.010)
          );
        }
        cache.set(source,m);
        rt.disposables.push(m);
      }
      mesh.material=m;
      if(cfg.glowExclude&&glow.addExcludedMesh)glow.addExcludedMesh(mesh);
    });
  }

  // Local authored surfaces share resources within a map and are released by
  // the existing map lifecycle. They must not go through the generic emissive
  // readability pass: glass, embroidery and carved stone have their own light.
  function sanctuaryMaterial(kind:string){
    rt.artMaterials??={};
    if(rt.artMaterials[kind])return rt.artMaterials[kind];
    const m=track(new BABYLON.StandardMaterial("sanctuary_"+kind,scene));
    m.metadata={d8Authored:true};m.maxSimultaneousLights=8;
    m.specularColor=new BABYLON.Color3(.035,.04,.055);
    const palettes:any={carving:[.57,.60,.65],recess:[.12,.16,.22],slate:[.16,.20,.28],gold:[.62,.43,.19],moss:[.14,.23,.14]};
    m.diffuseColor=new BABYLON.Color3(...(palettes[kind]??[.72,.72,.72]));
    if(kind==="gold"){m.specularColor=new BABYLON.Color3(.26,.20,.09);m.specularPower=48;}
    if(kind==="rug"||kind==="glass"||kind==="foliage"||kind==="shaft"){
      const tex=track(new BABYLON.DynamicTexture("sanctuary_"+kind+"_texture",{width:512,height:512},scene,false));
      const ctx:any=tex.getContext();ctx.clearRect(0,0,512,512);
      if(kind==="rug"){
        ctx.fillStyle="#4e1025";ctx.fillRect(0,0,512,512);
        for(let i=0;i<2600;i++){
          ctx.fillStyle=i%2?"rgba(184,63,63,.16)":"rgba(12,7,23,.15)";
          ctx.fillRect(seeded(i*3)*512,seeded(i*7)*512,1,3);
        }
        for(const inset of [16,26,44]){ctx.strokeStyle=inset===26?"#b99659":"#633a36";ctx.lineWidth=inset===26?3:6;ctx.strokeRect(inset,inset,512-inset*2,512-inset*2);}
        ctx.strokeStyle="#c3a268";ctx.lineWidth=2;
        for(let z=78;z<450;z+=72)for(let x=82;x<450;x+=70){
          ctx.beginPath();ctx.moveTo(x,z-22);ctx.lineTo(x+15,z);ctx.lineTo(x,z+22);ctx.lineTo(x-15,z);ctx.closePath();ctx.stroke();
          ctx.fillStyle="#b98a51";ctx.fillRect(x-2,z-2,4,4);
        }
        m.diffuseColor=new BABYLON.Color3(1,1,1);m.emissiveColor=new BABYLON.Color3(.035,.018,.025);
      }else if(kind==="glass"){
        tex.hasAlpha=true;
        ctx.beginPath();ctx.moveTo(36,500);ctx.lineTo(36,222);
        ctx.bezierCurveTo(36,120,156,44,256,8);
        ctx.bezierCurveTo(356,44,476,120,476,222);ctx.lineTo(476,500);ctx.closePath();ctx.save();ctx.clip();
        const colors=["#335d96","#567dac","#7b63a0","#243d70","#c09b65","#899ec1"];
        for(let row=0;row<12;row++)for(let col=0;col<10;col++){
          const xx=col*58-(row%2)*26,yy=row*48;
          ctx.fillStyle=colors[(row*3+col*5)%colors.length];ctx.fillRect(xx,yy,56,46);
          ctx.strokeStyle="#172239";ctx.lineWidth=3;ctx.strokeRect(xx,yy,56,46);
        }
        ctx.strokeStyle="#c4ab75";ctx.lineWidth=6;ctx.beginPath();ctx.arc(256,245,92,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(256,132);ctx.lineTo(256,448);ctx.moveTo(148,245);ctx.lineTo(364,245);ctx.stroke();
        ctx.restore();m.diffuseColor=new BABYLON.Color3(.65,.76,1);
        m.emissiveTexture=tex;m.emissiveColor=new BABYLON.Color3(.22,.29,.48);
        m.transparencyMode=BABYLON.Material.MATERIAL_ALPHATEST;m.useAlphaFromDiffuseTexture=true;m.backFaceCulling=false;
      }else if(kind==="shaft"){
        tex.hasAlpha=true;
        const gradient=ctx.createLinearGradient(0,0,0,512);
        gradient.addColorStop(0,"rgba(122,153,223,0)");gradient.addColorStop(.16,"rgba(156,181,231,.11)");
        gradient.addColorStop(.72,"rgba(156,181,231,.045)");gradient.addColorStop(1,"rgba(122,153,223,0)");
        ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
        m.useAlphaFromDiffuseTexture=true;m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
        m.disableLighting=true;m.disableDepthWrite=true;m.backFaceCulling=false;
        m.emissiveTexture=tex;m.emissiveColor=new BABYLON.Color3(.7,.8,1);
      }else{
        tex.hasAlpha=true;
        for(let i=0;i<380;i++){
          const a=seeded(i*3.7)*Math.PI*2,r=Math.sqrt(seeded(i*7.9))*208;
          const px=256+Math.cos(a)*r,py=256+Math.sin(a)*r*.82;
          const v=seeded(i*11.2);ctx.fillStyle=v>.7?"#637653":v>.35?"#384f3e":"#22382e";
          ctx.beginPath();ctx.ellipse(px,py,7+v*14,4+v*9,a,0,Math.PI*2);ctx.fill();
        }
        m.diffuseColor=new BABYLON.Color3(.75,.85,.78);m.useAlphaFromDiffuseTexture=true;
        m.transparencyMode=BABYLON.Material.MATERIAL_ALPHATEST;m.backFaceCulling=false;
      }
      tex.update();m.diffuseTexture=tex;
    }
    rt.artMaterials[kind]=m;return m;
  }

  // The pointed arch is actual segmented masonry, not an image of a building.
  function pointedArch(root:any,w:number,bottom:number,h:number,depth:number,material:any,name="sanctuaryArch"){
    const r=w/2,shoulder=bottom+h*.55,rise=h*.45;
    for(const side of [-1,1]){
      const jamb=box(name+"Jamb",0,0,0,.19,h*.55,depth,material);
      jamb.parent=root;jamb.position.set(side*r,bottom+h*.275,0);
      let prev=new BABYLON.Vector3(side*r,shoulder,0);
      for(let i=1;i<=12;i++){
        const t=i/12;
        const next=new BABYLON.Vector3(side*r*(1-t*t),shoulder+rise*t*(1.5-.5*t),0);
        const delta=next.subtract(prev),q=box(name+"Voussoir",0,0,0,delta.length()+.012,.19,depth,material);
        q.parent=root;q.position.copyFrom(prev.add(next).scale(.5));q.rotation.z=Math.atan2(delta.y,delta.x);
        q.isPickable=false;prev=next;
      }
    }
  }

  function templeMaterialPassV34(){
    if(rt.id!=="temple")return;

    const wallTex=new BABYLON.DynamicTexture("templeWallV34",{width:768,height:768},scene,false);
    const wc:any=wallTex.getContext();
    wc.fillStyle="#444b54";wc.fillRect(0,0,768,768);
    const wallRowH=92;
    for(let r=0;r<10;r++){
      const y=r*wallRowH;
      let xx=(r%2)*-70;
      let c=0;
      while(xx<820){
        const seed=r*97+c*31;
        const bw=112+Math.floor(seeded(seed)*82);
        const bh=wallRowH-7;
        const base=117+Math.floor(seeded(seed+1)*19);
        wc.fillStyle="rgb("+(base-6)+","+base+","+(base+7)+")";
        wc.fillRect(xx+4,y+4,bw-8,bh-3);
        wc.strokeStyle="rgba(35,43,54,0.45)";wc.lineWidth=3;
        wc.strokeRect(xx+2,y+2,bw-4,bh+1);
        if(seeded(seed+2)>0.62){
          wc.fillStyle="rgba(208,214,218,0.10)";
          wc.fillRect(xx+8,y+8,bw*0.46,8+seeded(seed+3)*10);
        }
        xx+=bw;c++;
      }
    }
    for(let i=0;i<48;i++){
      const x=seeded(i*4.7)*768,y=seeded(i*8.9)*768,r=4+seeded(i*5.6)*18;
      wc.fillStyle="rgba(35,54,31,"+(0.025+seeded(i*3.2)*0.055)+")";
      wc.beginPath();wc.arc(x,y,r,0,Math.PI*2);wc.fill();
    }
    wallTex.update();
    wallTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;wallTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
    wallTex.uScale=1;wallTex.vScale=1;

    const floorTex=new BABYLON.DynamicTexture("templeFloorV34",{width:768,height:768},scene,false);
    const fc:any=floorTex.getContext();
    fc.fillStyle="#454953";fc.fillRect(0,0,768,768);
    const slabW=102,slabH=78;
    for(let r=0;r<11;r++){
      const off=(r%2)*slabW*0.48;
      for(let xx=-slabW;xx<850;xx+=slabW){
        const seed=r*113+Math.floor(xx);
        const jx=(seeded(seed)-0.5)*3;
        const jy=(seeded(seed+1)-0.5)*3;
        const vv=116+Math.floor(seeded(seed+2)*13);
        fc.fillStyle="rgb("+(vv-4)+","+vv+","+(vv+5)+")";
        fc.fillRect(xx+off+2+jx,r*slabH+2+jy,slabW-4,slabH-4);
        fc.strokeStyle="rgba(38,43,51,0.34)";fc.lineWidth=1;
        fc.strokeRect(xx+off+2+jx,r*slabH+2+jy,slabW-4,slabH-4);
        if(seeded(seed+3)>0.66){
          fc.strokeStyle="rgba(54,46,39,0.28)";fc.lineWidth=2;
          fc.beginPath();
          fc.moveTo(xx+off+25+jx,r*slabH+34+jy);
          fc.lineTo(xx+off+70+jx,r*slabH+48+jy);
          fc.lineTo(xx+off+105+jx,r*slabH+40+jy);
          fc.stroke();
        }
      }
    }
    for(let i=0;i<110;i++){
      const x=seeded(i*3.7)*768,y=seeded(i*9.5)*768;
      fc.fillStyle="rgba(32,28,24,"+(0.018+seeded(i*2.2)*0.040)+")";
      fc.beginPath();fc.arc(x,y,2+seeded(i*5.1)*8,0,Math.PI*2);fc.fill();
    }
    floorTex.update();
    floorTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;floorTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
    floorTex.uScale=1;floorTex.vScale=1;

    const wallNormal=reliefTexture(wallTex,"templeWallNormalV37",0.88,512);
    const floorNormal=reliefTexture(floorTex,"templeFloorNormalV37",0.92,512);

    const wallMat=new BABYLON.StandardMaterial("templeWallMatV34",scene);
    wallMat.metadata={d8Authored:true};wallMat.diffuseTexture=wallTex;wallMat.diffuseColor=new BABYLON.Color3(.92,.94,1);wallMat.ambientColor=new BABYLON.Color3(.65,.70,.82);
    wallMat.emissiveTexture=wallTex;wallMat.emissiveColor=new BABYLON.Color3(.015,.019,.03);
    wallMat.specularColor=new BABYLON.Color3(0.040,0.035,0.030);wallMat.maxSimultaneousLights=8;
    if(wallNormal){wallMat.bumpTexture=wallNormal;wallMat.bumpTexture.level=0.36;}

    const floorMat=new BABYLON.StandardMaterial("templeFloorMatV34",scene);
    floorMat.metadata={d8Authored:true};floorMat.diffuseTexture=floorTex;floorMat.diffuseColor=new BABYLON.Color3(.89,.92,.98);floorMat.ambientColor=new BABYLON.Color3(.70,.75,.84);
    floorMat.emissiveTexture=floorTex;floorMat.emissiveColor=new BABYLON.Color3(.018,.022,.032);
    floorMat.specularColor=new BABYLON.Color3(0.020,0.020,0.020);floorMat.maxSimultaneousLights=8;
    if(floorNormal){floorMat.bumpTexture=floorNormal;floorMat.bumpTexture.level=0.30;}

    rt.disposables.push(wallTex,floorTex,wallMat,floorMat);
    if(wallNormal)rt.disposables.push(wallNormal);
    if(floorNormal)rt.disposables.push(floorNormal);

    const wallNames=["templeWallBody","templeWallPilaster","templeGatePier","templeGateLintel","templeGateCrown","wall","archLeft","archRight","archTop","column","columnBase","columnCap","templeAltar","templeWindow","templeButtress","templeBackdrop"];
      const floorNames=["templeFloorMain","path","patioInner","stair"];
    rt.root.getChildMeshes().forEach((m:any)=>{
      const n=m.name??"";
      if(m.material?.metadata?.d8Authored)return;
      if(wallNames.some(q=>n.includes(q))){m.material=wallMat;m.receiveShadows=true;}
      else if(floorNames.some(q=>n.includes(q))){m.material=floorMat;m.receiveShadows=true;}
      else return;
      // World-size UVs avoid stretching the same little brick image across a
      // 28 m back wall and squeezing it into the face of a tiny column.
      const positions=m.getVerticesData("position"),normals=m.getVerticesData("normal");
      if(!positions||!normals)return;
      const uv:number[]=[],matrix=m.computeWorldMatrix(true),scale=m.material===wallMat?7.2:10.4;
      for(let i=0;i<positions.length;i+=3){
        const p=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(positions[i],positions[i+1],positions[i+2]),matrix);
        const nn=BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(normals[i],normals[i+1],normals[i+2]),matrix);
        if(Math.abs(nn.y)>.7)uv.push(p.x/scale,p.z/scale);
        else if(Math.abs(nn.x)>.7)uv.push(p.z/scale,p.y/scale);
        else uv.push(p.x/scale,p.y/scale);
      }
      m.setVerticesData("uv",uv);
    });
  }

  function grid(c:any){
    if(integrated)return; // The VTT owns its cell grid and visibility preference.
    const w=c.MAP.size[0],h=c.MAP.size[1],lines:any[]=[];
    for(let x=-w/2;x<=w/2;x++)lines.push([new BABYLON.Vector3(x,0.07,-h/2),new BABYLON.Vector3(x,0.07,h/2)]);
    for(let z=-h/2;z<=h/2;z++)lines.push([new BABYLON.Vector3(-w/2,0.07,z),new BABYLON.Vector3(w/2,0.07,z)]);
    const g=BABYLON.MeshBuilder.CreateLineSystem("grid",{lines},scene);g.parent=parentFor("DEBUG");g.color=new BABYLON.Color3(0.15,0.13,0.10);g.alpha=0.15;g.setEnabled(gridVisible);rt.grid=g;
  }

  function asset(o:any){
    const x=o.position[0],z=o.position[1],s=o.scale??1;
    if(o.asset==="temple_gate"){
      const w=(o.width??6.4)*s,h=(o.height??4.5)*s,d=(o.depth??0.9)*s;
      const pierW=0.92*s;
      const left=box("templeGatePierL",x-w*0.50,h*0.46,z,pierW,h*0.92,d,M.stone2);
      const right=box("templeGatePierR",x+w*0.50,h*0.46,z,pierW,h*0.92,d,M.stone2);
      box("templeGateFootL",x-w*0.50,0.24,z,pierW*1.30,0.48,d*1.18,M.stoneDark);
      box("templeGateFootR",x+w*0.50,0.24,z,pierW*1.30,0.48,d*1.18,M.stoneDark);
      const capL=box("templeGateCapL",x-w*0.50,h*0.94,z,pierW*1.42,0.26*s,d*1.18,M.stoneLight);
      const capR=box("templeGateCapR",x+w*0.50,h*0.94,z,pierW*1.42,0.26*s,d*1.18,M.stoneLight);
      const lintel=box("templeGateLintel",x,h*0.88,z,w+1.15*s,0.48*s,d*1.02,M.stoneLight);
      const crown=box("templeGateCrown",x,h*1.01,z,w*0.70,0.32*s,d*0.90,M.stone2);
      if(o.pediment){
        const p1=box("templeGatePedimentL",x-w*0.18,h*1.13,z,w*0.38,0.22*s,d*0.78,M.stoneLight);p1.rotation.z=0.22;
        const p2=box("templeGatePedimentR",x+w*0.18,h*1.13,z,w*0.38,0.22*s,d*0.78,M.stoneLight);p2.rotation.z=-0.22;
      }
      left.receiveShadows=right.receiveShadows=lintel.receiveShadows=crown.receiveShadows=true;
      collider(x-w*0.50,z,pierW,d);collider(x+w*0.50,z,pierW,d);
    }
    else if(o.asset==="temple_wall"){
      const h=o.height??4.4,w=o.size[0],d=o.size[1];
      const body=box("templeWallBody",x,h/2,z,w,h,d,M.stone2);
      body.receiveShadows=true;
      const foot=box("templeWallFoot",x,0.16,z,w*1.02,0.32,d*1.10,M.stoneDark);
      const cap=box("templeWallCap",x,h+0.08,z,w*1.03,0.16,d*1.10,M.stoneLight);
      body.isPickable=foot.isPickable=cap.isPickable=false;
      if(o.pilasters){
        if(w>=d){
          const px=Math.max(0,w*0.5-0.26);
          const p1=box("templeWallPilaster",x-px,h*0.49,z,0.38,h*0.94,d*1.24,M.stone2);
          const p2=box("templeWallPilaster",x+px,h*0.49,z,0.38,h*0.94,d*1.24,M.stone2);
          p1.isPickable=p2.isPickable=false;
        }else{
          const pz=Math.max(0,d*0.5-0.26);
          const p1=box("templeWallPilaster",x,h*0.49,z-pz,w*1.24,h*0.94,0.38,M.stone2);
          const p2=box("templeWallPilaster",x,h*0.49,z+pz,w*1.24,h*0.94,0.38,M.stone2);
          p1.isPickable=p2.isPickable=false;
        }
      }
      collider(x,z,w,d);
    }
    else if(o.asset==="wall"){
      const h=o.height??1.6,material=M[o.material]??M.stoneDark;
      box("wall",x,h/2,z,o.size[0],h,o.size[1],material);
      collider(x,z,o.size[0],o.size[1]);
    }
    else if(o.asset==="temple_floor"){
      const w=o.size[0],d=o.size[1],tile=o.tileSize??1.35;
      const q=box("templeFloorMain",x,o.y??0.14,z,w,0.28,d,M.stone2,"BASE");
      q.receiveShadows=true;q.isPickable=false;
      if(o.joints!==false){
        const lines:any[]=[];
        const y=0.292;
        for(let gx=-w/2+tile;gx<w/2;gx+=tile){
          lines.push([new BABYLON.Vector3(x+gx,y,z-d/2+0.12),new BABYLON.Vector3(x+gx,y,z+d/2-0.12)]);
        }
        for(let gz=-d/2+tile;gz<d/2;gz+=tile){
          lines.push([new BABYLON.Vector3(x-w/2+0.12,y,z+gz),new BABYLON.Vector3(x+w/2-0.12,y,z+gz)]);
        }
        if(lines.length){
          const g=BABYLON.MeshBuilder.CreateLineSystem("templeFloorJoints",{lines},scene);
          g.parent=parentFor("BASE");g.color=new BABYLON.Color3(0.085,0.065,0.050);g.alpha=0.12;g.isPickable=false;
          if(glow.addExcludedMesh)glow.addExcludedMesh(g);
        }
      }
      if(o.border){
        box("templeFloorBorderN",x,0.31,z-d/2+0.12,w,0.10,0.24,M.stoneLight,"BASE");
        box("templeFloorBorderS",x,0.31,z+d/2-0.12,w,0.10,0.24,M.stoneLight,"BASE");
        box("templeFloorBorderW",x-w/2+0.12,0.31,z,0.24,0.10,d,M.stoneLight,"BASE");
        box("templeFloorBorderE",x+w/2-0.12,0.31,z,0.24,0.10,d,M.stoneLight,"BASE");
      }
    }
    else if(o.asset==="room_floor"){box("roomFloor",x,0.06,z,o.size[0],0.12,o.size[1],M[o.material]??M.wood);}
    else if(o.asset==="bar"){box("bar",x,0.56,z,10.8,1.12,1.05,M.wood);box("barTop",x,1.17,z,11.2,0.15,1.25,M.woodLight);box("barBack",x,0.85,z-1.55,10.6,1.7,0.38,M.woodDark);collider(x,z,10.8,1.05);for(let i=0;i<16;i++)cyl("bottle",x-4.8+i*0.63,1.24,z-1.15,0.14,0.45,i%3===0?M.green:(i%3===1?M.yellow:M.red));}
    else if(o.asset==="barrel_large"){cyl("barrel",x,1.05,z,1.65,2.1,M.wood);for(let i=0;i<4;i++)cyl("ring",x,0.2+i*0.58,z,1.72,0.05,M.stoneDark);collider(x,z,1.3,1.3);}
    else if(o.asset==="table_round"){cyl("table",x,0.68,z,2.1*s,0.18,M.woodLight);cyl("leg",x,0.34,z,0.48*s,0.68,M.woodDark);collider(x,z,1.35*s,1.35*s);}
    else if(o.asset==="chair"){const r=new BABYLON.TransformNode("chair",scene);r.parent=rt.root;r.position.set(x,0,z);r.rotation.y=o.rotation??0;const a=BABYLON.MeshBuilder.CreateBox("seat",{width:0.55,height:0.15,depth:0.55},scene);a.position.y=0.36;a.material=M.wood;a.parent=r;const b=BABYLON.MeshBuilder.CreateBox("back",{width:0.55,height:0.7,depth:0.1},scene);b.position.set(0,0.68,-0.23);b.material=M.woodDark;b.parent=r;}
    else if(o.asset==="stool"){
      cyl("stoolSeat",x,0.48,z,0.72*s,0.15,M.woodLight);
      cyl("stoolLeg",x,0.23,z,0.18*s,0.46,M.woodDark);
      cyl("stoolFoot",x,0.06,z,0.48*s,0.05,M.iron);
      collider(x,z,0.55*s,0.55*s);
    }
    else if(o.asset==="bench"){
      const w=(o.size?.[0]??2.2)*s,d=(o.size?.[1]??0.65)*s;
      box("benchSeat",x,0.42,z,w,0.16,d,M.woodLight);
      box("benchBack",x,0.78,z-d*0.38,w,0.62,0.10,M.woodDark);
      box("benchLegL",x-w*0.35,0.20,z,0.12,0.40,0.12,M.woodDark);
      box("benchLegR",x+w*0.35,0.20,z,0.12,0.40,0.12,M.woodDark);
      collider(x,z,w*0.9,d*0.9);
    }
    else if(o.asset==="wall_shelf"){
      const w=(o.size?.[0]??3.0)*s;
      box("wallShelf",x,1.18,z,w,0.12,0.45,M.woodLight);
      box("wallShelfBack",x,1.55,z+0.18,w,0.72,0.12,M.woodDark);
      for(let i=0;i<Math.max(3,Math.floor(w/0.45));i++){
        cyl("shelfBottle",x-w/2+0.3+i*0.42,1.42,z-0.06,0.12,0.34,i%3===0?M.green:(i%3===1?M.yellow:M.red));
      }
    }
    else if(o.asset==="plate_stack"){
      const count=o.count??5;
      for(let i=0;i<count;i++)cyl("plate",x,0.10+i*0.045,z,0.42*s,0.035,M.ceramic);
    }
    else if(o.asset==="bottle_cluster"){
      const count=o.count??5;
      for(let i=0;i<count;i++){
        const ox=((i%3)-1)*0.20*s,oz=(Math.floor(i/3)-0.5)*0.20*s;
        cyl("bottleCluster",x+ox,0.25,z+oz,0.13*s,0.42*s,i%3===0?M.green:(i%3===1?M.yellow:M.red));
      }
    }
    else if(o.asset==="candle"){
      const h=(o.height??0.30)*s;
      cyl("candleBody",x,h/2+0.70,z,0.10*s,h,M.wax);
      const flame=sph("candleFlame",x,0.70+h+0.10,z,0.12*s,M.fireInner);
      flame.scaling.y=1.35;
      const light=track(new BABYLON.PointLight("candleLight",new BABYLON.Vector3(x,0.70+h+0.18,z),scene));
      light.parent=rt.root; light.diffuse=new BABYLON.Color3(1,0.52,0.16); light.range=o.range??3.2; light.intensity=o.intensity??0.30;
      const base=flame.position.y,seed=x*1.7+z*2.3;
      rt.updaters.push((t:number)=>{const f=Math.sin(t*12.7+seed);flame.scaling.y=1.35+f*0.16;flame.position.y=base+f*0.012;light.intensity=(o.intensity??0.22)+f*0.03;});
    }
    else if(o.asset==="small_barrel"){
      const d=0.82*s,h=1.00*s;
      cyl("smallBarrel",x,h/2,z,d,h,M.wood);
      for(let i=0;i<3;i++)cyl("smallBarrelRing",x,0.14+i*(h-0.28)/2,z,d*1.04,0.045,M.iron);
      collider(x,z,d*0.75,d*0.75);
    }
    else if(o.asset==="sofa_red"){
      const w=(o.size?.[0]??2.3)*s,d=(o.size?.[1]??1.0)*s;
      box("sofaBase",x,0.30,z,w,0.32,d,M.woodDark);
      box("sofaSeat",x,0.52,z,w*0.88,0.22,d*0.72,M.clothRed);
      box("sofaBack",x,0.94,z+d*0.34,w*0.92,0.70,0.22,M.clothRed);
      box("sofaArmL",x-w*0.45,0.66,z,0.20,0.55,d*0.86,M.woodDark);
      box("sofaArmR",x+w*0.45,0.66,z,0.20,0.55,d*0.86,M.woodDark);
      collider(x,z,w,d);
    }
    else if(o.asset==="barrel_cluster"){
      const count=o.count??4,spacing=(o.spacing??1.25)*s;
      for(let i=0;i<count;i++){
        const px=x+(i-(count-1)/2)*spacing;
        cyl("clusterBarrel",px,0.92,z,1.35*s,1.84*s,M.wood);
        for(let r=0;r<3;r++)cyl("clusterRing",px,0.18+r*0.74,z,1.42*s,0.05,M.iron);
        collider(px,z,1.05*s,1.05*s);
      }
      box("barrelClusterRail",x,0.18,z-0.82*s,count*spacing+0.65*s,0.24,0.18,M.stoneDark);
      box("barrelClusterRail2",x,0.18,z+0.82*s,count*spacing+0.65*s,0.24,0.18,M.stoneDark);
    }
    else if(o.asset==="sideboard"){
      const w=(o.size?.[0]??3.6)*s,d=(o.size?.[1]??0.75)*s;
      box("sideboardBody",x,0.48,z,w,0.96,d,M.woodDark);
      box("sideboardTop",x,1.00,z,w*1.02,0.10,d*1.08,M.woodLight);
      const slots=Math.max(3,Math.floor(w/0.7));
      for(let i=0;i<slots;i++){
        const px=x-w*0.42+i*(w*0.84/(slots-1));
        cyl("sideboardDish",px,1.10,z,0.30*s,0.035,M.ceramic);
      }
      collider(x,z,w,d);
    }
    else if(o.asset==="table_dressing"){
      const radius=(o.radius??0.65)*s,count=o.count??5;
      for(let i=0;i<count;i++){
        const a=i/count*Math.PI*2,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
        cyl("dish",px,0.82,pz,0.28*s,0.03,M.ceramic);
        if(i%2===0)cyl("cup",px+0.08,0.91,pz-0.05,0.10*s,0.18,M.yellow);
      }
      if(o.paper)box("paperSheet",x,0.835,z,0.70*s,0.02,0.50*s,M.wax);
    }
    else if(o.asset==="stone_partition"){
      const w=o.size?.[0]??4,d=o.size?.[1]??0.45,h=o.height??1.25;
      box("stonePartition",x,h/2,z,w,h,d,M.stoneDark);
      const pieces=Math.max(3,Math.floor(w/0.7));
      for(let i=0;i<pieces;i++){
        const px=x-w/2+(i+0.5)*w/pieces;
        box("partitionCap",px,h+0.06,z,w/pieces*0.84,0.12,d*1.12,i%2?M.stone:M.stone2);
      }
      collider(x,z,w,d);
    }
    else if(o.asset==="wall_torch"){
      const h=(o.height??1.75)*s;
      const root=new BABYLON.TransformNode("wallTorch",scene);
      root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=o.rotation??0;
      const arm=BABYLON.MeshBuilder.CreateBox("torchArm",{width:0.46*s,height:0.08*s,depth:0.09*s},scene);
      arm.parent=root;arm.position.set(0,h,0);arm.material=M.iron;
      const shaft=BABYLON.MeshBuilder.CreateCylinder("torchShaft",{diameter:0.10*s,height:0.72*s,tessellation:10},scene);
      shaft.parent=root;shaft.position.set(0,h+0.18,-0.13*s);shaft.rotation.z=-0.30;shaft.material=M.wood;
      const flame=sph("torchFlame",x,h+0.63,z-0.22*s,0.28*s,M.fireInner,"VFX");
      flame.scaling.set(0.85,1.75,0.85);
      const outer=sph("torchOuter",x,h+0.60,z-0.22*s,0.40*s,M.fireOuter,"VFX");
      outer.scaling.set(0.75,1.55,0.75);
      const light=track(new BABYLON.PointLight("torchLight",new BABYLON.Vector3(x,h+0.64,z-0.20*s),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.40,0.08);
      light.range=o.range??7.5;light.intensity=o.intensity??1.20;
      const seed=x*1.37+z*2.11,fy=flame.position.y,oy=outer.position.y;
      rt.updaters.push((t:number)=>{
        const a=Math.sin(t*9.3+seed),b=Math.sin(t*15.7+seed*0.7);
        flame.position.y=fy+a*0.035;outer.position.y=oy+b*0.025;
        flame.scaling.y=1.72+a*0.18;outer.scaling.y=1.52+b*0.15;
        light.intensity=(o.intensity??0.90)+a*0.10+b*0.05;
      });
    }
    else if(o.asset==="chandelier"){
      const y=(o.height??3.4)*s,r=(o.radius??1.25)*s,count=o.count??8;
      cyl("chandelierChain",x,y+0.95*s,z,0.07*s,1.9*s,M.iron);
      const ring=BABYLON.MeshBuilder.CreateTorus("chandelierRing",{diameter:r*2,thickness:0.10*s,tessellation:36},scene);
      ring.position.set(x,y,z);ring.material=M.iron;ring.parent=rt.root;
      for(let i=0;i<count;i++){
        const a=i/count*Math.PI*2,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
        cyl("chandelierCandle",px,y+0.18*s,pz,0.08*s,0.32*s,M.wax);
        const flame=sph("chandelierFlame",px,y+0.43*s,pz,0.11*s,M.fireInner,"VFX");
        flame.scaling.y=1.35;
        const by=flame.position.y,seed=i*0.81+x+z;
        rt.updaters.push((t:number)=>{const f=Math.sin(t*10.4+seed)*0.08;flame.position.y=by+f*0.025;flame.scaling.y=1.35+f*0.4;});
      }
      const light=track(new BABYLON.PointLight("chandelierLight",new BABYLON.Vector3(x,y+0.30,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.52,0.16);
      light.range=o.range??10.0;light.intensity=o.intensity??1.55;
      const seed=x*0.73+z*1.31;
      rt.updaters.push((t:number)=>light.intensity=(o.intensity??1.15)+Math.sin(t*6.7+seed)*0.055);
    }
    else if(o.asset==="brazier"){
      const y=(o.height??0.82)*s;
      cyl("brazierBase",x,0.22*s,z,0.64*s,0.44*s,M.iron);
      const bowl=BABYLON.MeshBuilder.CreateCylinder("brazierBowl",{diameterTop:1.15*s,diameterBottom:0.72*s,height:0.34*s,tessellation:20},scene);
      bowl.position.set(x,y,z);bowl.material=M.iron;bowl.parent=rt.root;
      for(let i=0;i<5;i++)sph("brazierCoal",x-0.28*s+i*0.14*s,y+0.17*s,z+((i%2)?0.12:-0.10)*s,0.17*s,M.fireOuter,"VFX");
      const inner=sph("brazierInner",x,y+0.55*s,z,0.55*s,M.fireInner,"VFX");inner.scaling.y=1.55;
      const outer=sph("brazierOuter",x,y+0.50*s,z,0.78*s,M.fireOuter,"VFX");outer.scaling.y=1.40;
      const light=track(new BABYLON.PointLight("brazierLight",new BABYLON.Vector3(x,y+0.75*s,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.34,0.06);
      light.range=o.range??9.0;light.intensity=o.intensity??2.00;
      const seed=x*1.21+z*0.91,iy=inner.position.y,oy=outer.position.y;
      rt.updaters.push((t:number)=>{
        const a=Math.sin(t*8.9+seed),b=Math.sin(t*14.8+seed);
        inner.position.y=iy+a*0.04;outer.position.y=oy+b*0.03;
        light.intensity=(o.intensity??1.55)+a*0.16+b*0.08;
      });
      collider(x,z,0.95*s,0.95*s);
    }
    else if(o.asset==="wall_sconce"){
      const h=(o.height??1.65)*s;
      const arm=box("sconceArm",x,h,z,0.32*s,0.07*s,0.08*s,M.iron);
      arm.rotation.y=o.rotation??0;
      const cup=cyl("sconceCup",x,h+0.02,z,0.20*s,0.10*s,M.iron);
      const wax=cyl("sconceWax",x,h+0.19,z,0.09*s,0.28*s,M.wax);
      const flame=sph("sconceFlame",x,h+0.40,z,0.12*s,M.fireInner,"VFX");
      flame.scaling.y=1.35;
      const light=track(new BABYLON.PointLight("sconceLight",new BABYLON.Vector3(x,h+0.42,z),scene));
      light.parent=rt.root;
      light.diffuse=new BABYLON.Color3(1,0.42,0.10);
      light.range=o.range??4.2;
      light.intensity=o.intensity??0.42;
      const base=flame.position.y,seed=x*1.9+z*2.7;
      rt.updaters.push((t:number)=>{
        const f=Math.sin(t*10.7+seed)*0.07+Math.sin(t*17.1+seed)*0.035;
        flame.position.y=base+f*0.035;
        flame.scaling.y=1.35+f*0.35;
        light.intensity=(o.intensity??0.42)+f*0.45;
      });
    }
    else if(o.asset==="round_room"){
      const radius=o.radius??3.0,segments=o.segments??18,opening=o.opening??2;
      const segLen=2*Math.PI*radius/segments*1.06;
      for(let i=0;i<segments;i++){
        if(i<opening)continue;
        const a=i/segments*Math.PI*2+(o.openingAngle??0),px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
        const w=segLen,d=0.42,h=o.height??1.25;
        const q=box("roundRoomWall",px,h/2,pz,w,h,d,o.material?M[o.material]:i%3===0?M.stone2:M.stoneDark);
        q.rotation.y=-a-Math.PI/2;
        if(o.material&&[7,15].includes(i)){
          q.scaling.y=.5;q.position.y=h*.25;
          const frame=new BABYLON.TransformNode('cabinWindowFrame',scene);frame.parent=parentFor('PROPS');frame.position.set(px,0,pz);frame.rotation.y=q.rotation.y;
          const part=(name:string,lx:number,ly:number,pw:number,ph:number,mat:any)=>{const m=box(name,0,0,0,pw,ph,d,mat);m.parent=frame;m.position.set(lx,ly,0);m.metadata={d8Animated:true,buildingEnvelope:true};return m;};
          part('roundRoomWall',0,h-.15,w,.3,M.wood);for(const side of [-1,1])part('roundRoomWall',side*(w+.65)/4,h*.70,(w-.65)/2,h*.4-.3,M.wood);
          const glass=part('houseWindowGlass',0,h*.7,.65,h*.4-.3,windowGlass());glass.scaling.z=.08;part('houseWindowCross',0,h*.7,.045,h*.4-.3,M.woodDark);
        }
        const cap=box("roundRoomCap",px,h+0.045,pz,w*1.04,0.09,d*1.12,i%2===0?M.stoneLight:M.stone2);
        cap.rotation.y=-a-Math.PI/2;
        const aw=Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d;
        const ad=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d;
        collider(px,pz,aw,ad);
      }
      cyl("roundRoomFloor",x,0.035,z,radius*1.8,0.07,M.stone2);
    }
    else if(o.asset==="bed"){
      const w=(o.size?.[0]??1.25)*s,d=(o.size?.[1]??2.25)*s;
      box("bedFrame",x,0.26,z,w,0.28,d,M.woodDark);
      box("mattress",x,0.46,z,w*0.90,0.22,d*0.90,M.ceramic);
      box("pillow",x,0.62,z-d*0.33,w*0.55,0.16,d*0.20,M.wax);
      collider(x,z,w,d);
    }
    else if(o.asset==="rose_patch"){
      const count=o.count??14,spreadX=o.size?.[0]??3.0,spreadZ=o.size?.[1]??1.8;
      box("roseSoil",x,0.055,z,spreadX,0.08,spreadZ,M.soil);
      if(rt.id==="garden"){
        for(const side of [-1,1]){
          box("roseBedCurb",x,0.12,z+side*spreadZ*.51,spreadX+.14,.20,.13,M.stoneLight);
          box("roseBedCurb",x+side*spreadX*.51,0.12,z,.13,.20,spreadZ+.14,M.stoneLight);
          box("roseBedSnowLip",x,0.235,z+side*spreadZ*.51,spreadX+.10,.035,.10,M.snow);
        }
      }
      box("roseBedEdge",x,0.13,z-spreadZ/2,spreadX+0.12,0.16,0.10,M.woodDark);
      box("roseBedEdge",x,0.13,z+spreadZ/2,spreadX+0.12,0.16,0.10,M.woodDark);
      box("roseBedEdge",x-spreadX/2,0.13,z,0.10,0.16,spreadZ,M.woodDark);
      box("roseBedEdge",x+spreadX/2,0.13,z,0.10,0.16,spreadZ,M.woodDark);
      for(let i=0;i<count;i++){
        const px=x-spreadX*0.42+((i*37)%100)/100*spreadX*0.84;
        const pz=z-spreadZ*0.38+((i*61)%100)/100*spreadZ*0.76;
        const h=0.38+(i%4)*0.07;
        cyl("roseStem",px,h/2+0.08,pz,0.045,h,M.leafDark);
        const leafA=sph("roseLeaf",px-0.14,h*0.46+0.08,pz,0.22,M.leaf);leafA.scaling.set(1.45,0.28,0.72);leafA.rotation.z=-0.28;
        const leafB=sph("roseLeaf",px+0.14,h*0.60+0.08,pz,0.20,M.leafDark);leafB.scaling.set(1.40,0.27,0.68);leafB.rotation.z=0.31;
        const head=sph("roseHead",px,h+0.12,pz,0.34+(i%3)*0.025,i%4===0?M.rosePink:M.rose);
        head.scaling.y=0.75;
        if(i%2===0)for(let petal=0;petal<3;petal++){
          const a=petal/3*Math.PI*2;
          const bloom=sph("rosePetal",px+Math.cos(a)*0.13,h+0.12,pz+Math.sin(a)*0.13,0.17,i%4===0?M.rosePink:M.rose);
          bloom.scaling.set(1.05,0.72,0.82);
        }
        rt.markers.roses.push({mesh:head,baseY:head.position.y,seed:i});
      }
    }
    else if(o.asset==="snow_tree"){
      const h=(o.height??3.6)*s;
      cyl("snowTreeTrunk",x,h*0.25,z,0.34*s,h*0.50,M.woodDark);
      // Layered tapered fir boughs read clearly at tabletop scale; the former
      // sparse sticks disappeared against the snowy floor from the DM camera.
      const tiers:any[]=[
        {y:h*0.44,d:h*0.62,hh:h*0.43,mat:M.leafDark},
        {y:h*0.62,d:h*0.48,hh:h*0.39,mat:M.green},
        {y:h*0.79,d:h*0.34,hh:h*0.34,mat:M.leafDark}
      ];
      tiers.forEach((tier:any,index:number)=>{
        const canopy=BABYLON.MeshBuilder.CreateCylinder("snowPineCanopy",{height:tier.hh,diameterTop:0.035*s,diameterBottom:tier.d,tessellation:7},scene);
        canopy.position.set(x,tier.y,z);canopy.material=tier.mat;canopy.parent=parentFor("PROPS");canopy.rotation.y=index*0.31;
        // Three rounded snow shelves break the silhouette without crowding the path.
        for(let side=0;side<3;side++){
          const a=(side/3)*Math.PI*2+index*0.47+0.35,r=tier.d*0.30;
          const snow=sph("snowPineClump",x+Math.cos(a)*r,tier.y-tier.hh*0.12,z+Math.sin(a)*r,0.33*s,M.snow);
          snow.scaling.set(1.15,0.52,0.86);
        }
      });
      const drift=sph("snowTreeRootDrift",x,0.13,z,1.35*s,M.snow);drift.scaling.set(1.0,0.16,0.78);
      collider(x,z,0.78*s,0.78*s);
    }
    else if(o.asset==="market_stall"){
      const w=(o.size?.[0]??3.7)*s,d=(o.size?.[1]??2.0)*s,cloth=M[o.color]??M.clothRed;
      const movingCloth:any[]=[];
      box("stallCounter",x,0.62,z,w,0.20,d*0.55,M.woodLight);
      box("stallCounterFront",x,0.61,z-d*0.29,w*0.94,0.34,0.10,M.woodDark);
      for(const side of [-1,1])box("stallSidePanel",x+side*w*.46,.44,z,w*.05,.52,d*.55,M.wood);
      for(let crate=0;crate<3;crate++){
        const px=x+(crate-1)*w*.26;
        box("stallDisplayBox",px,.85,z,w*.20,.16,d*.30,M.woodDark);
        box("stallDisplayRim",px,.96,z-d*.15,w*.21,.09,.07,M.woodLight);
      }
      for(const sx of [-1,1])for(const sz of [-1,1])box("stallPost",x+sx*w*0.43,1.15,z+sz*d*0.38,0.12,2.3,0.12,M.woodDark);
      if(rt.id==="market"){
        const stripes=7,stripW=w*1.08/stripes;
        for(let i=0;i<stripes;i++){
          const stripeMat=i%2===0?cloth:M.wax;
          // A pitched, sagging woven awning, not a solid striped roof slab.
          const paths=[0,1].map(side=>Array.from({length:13},(_,j)=>{
            const t=j/12,zz=z+(t-.5)*d*1.14;
            return new BABYLON.Vector3(x-w*.54+stripW*(i+side),2.18+Math.sin(t*Math.PI)*.43-Math.sin(t*Math.PI*2)*.05,zz);
          }));
          const canopy=BABYLON.MeshBuilder.CreateRibbon("stallCanopyStripe",{pathArray:paths,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);
          canopy.material=stripeMat;canopy.parent=parentFor("PROPS");canopy.metadata={d8Animated:true};
          movingCloth.push({mesh:canopy,y:0,seed:i*0.71+x*0.3+z});
          const valance=box("stallValance",x-w*0.54+stripW*(i+.5),2.07,z-d*.57,stripW+.015,.23,.035,stripeMat);
          const hem=sph("artStallScallop",valance.position.x,1.96,valance.position.z,stripW,stripeMat);hem.scaling.set(1,.25,.10);
        }
      }else{
        const canopy=box("stallCanopy",x,2.20,z,w*1.08,0.12,d*1.10,cloth);
        canopy.rotation.z=0.03;canopy.metadata={d8Animated:true};movingCloth.push({mesh:canopy,y:canopy.position.y,seed:x*0.3+z});
      }
      const clothSeed=x*0.73+z*1.19;
      rt.updaters.push((time:number)=>movingCloth.forEach((q:any)=>{const breeze=Math.sin(time*1.25+q.seed+clothSeed);q.mesh.position.y=q.y+breeze*0.018;if(rt.id!=="market")q.mesh.rotation.z=0.03+breeze*0.012;}));
      collider(x,z,w*0.92,d*0.72);
      const fruit=[M.red,M.green,M.yellow];
      for(let i=0;i<7;i++)sph("produce",x-w*0.38+i*w*0.125,0.83,z,0.22,fruit[i%fruit.length]);
    }
    else if(o.asset==="trough"){
      const w=(o.size?.[0]??2.8)*s,d=(o.size?.[1]??1.0)*s;
      box("troughBottom",x,0.24,z,w,0.18,d,M.woodDark);
      box("troughSideA",x,0.48,z-d*0.44,w,0.48,0.12,M.wood);
      box("troughSideB",x,0.48,z+d*0.44,w,0.48,0.12,M.wood);
      box("troughEndA",x-w*0.47,0.48,z,0.12,0.48,d,M.wood);
      box("troughEndB",x+w*0.47,0.48,z,0.12,0.48,d,M.wood);
      const water=box("troughWater",x,0.43,z,w*0.86,0.04,d*0.70,M.water);
      gentleWater('troughFlow',x,z,w*.86,d*.70,.462);
      rt.updaters.push((t:number)=>{water.position.y=.43+Math.sin(t*1.8+x)*.009;});
      for(let i=0;i<3;i++){
        const ripple=BABYLON.MeshBuilder.CreateTorus("troughRipple",{diameter:.22,thickness:.008,tessellation:20},scene);
        ripple.position.set(x+(i-1)*w*.22,.461,z);ripple.material=M.waterGlow;ripple.parent=parentFor("VFX");ripple.isPickable=false;
        rt.updaters.push((t:number)=>{const p=(t*.27+i*.33)%1;ripple.scaling.set(.6+p*.9,1,.6+p*.9);ripple.visibility=(1-p)*.55;});
      }
      collider(x,z,w,d);
    }
    else if(o.asset==="lantern_post"){
      const h=(o.height??2.6)*s;
      cyl("lanternPost",x,h/2,z,0.12*s,h,M.iron);
      for(const side of [-1,1])for(const front of [-1,1])box("lanternFrame",x+side*.16*s,h+.05,z+front*.16*s,.045*s,.50*s,.045*s,M.iron);
      box("lanternCap",x,h+.31*s,z,.42*s,.075*s,.42*s,M.iron);
      box("lanternBase",x,h-.21*s,z,.38*s,.065*s,.38*s,M.iron);
      const glowBox=box("lanternGlow",x,h+0.05,z,0.24*s,0.34*s,0.24*s,M.lanternGlass);
      const light=track(new BABYLON.PointLight("lanternLight",new BABYLON.Vector3(x,h+0.05,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.45,0.10);light.range=o.range??5;light.intensity=o.intensity??0.62;
      const seed=x*0.7+z*1.3;
      rt.updaters.push((t:number)=>{const f=Math.sin(t*8.1+seed)*0.08+Math.sin(t*13.3+seed)*0.04;light.intensity=(o.intensity??0.62)+f;glowBox.scaling.y=1+f*0.18;});
      collider(x,z,0.32*s,0.32*s);
    }
    else if(o.asset==="house"){
      const w=(o.size?.[0]??8)*s,d=(o.size?.[1]??5)*s,h=(o.height??2.7)*s;
      const frontSign=rt.id==='dinner'||rt.id==='garden'?1:-1,frontZ=z+frontSign*d*.5,doorX=o.doorX??x-w*.28,doorW=o.playable?1.8:w*.18,wallMaterial=o.material?M[o.material]:M.plaster;
      const windowOffsets=[.05,.30];
      if(o.cutaway){
        const wall=0.22*s;
        box("houseBackWall",x,h/2,z-frontSign*(d/2-wall/2),w,h,wall,wallMaterial);
        facade('houseFrontWall',x,frontZ,w,h,wall,wallMaterial,[{x:doorX,w:doorW+.16,b:0,t:o.playable?Math.min(2.5,h-.1):h*.8},...windowOffsets.map(wx=>({x:x+w*wx,w:w*.16,b:h*.44,t:h*.72}))]);
        box("houseLeftWall",x-w/2+wall/2,h/2,z,wall,h,d-wall*2,wallMaterial);
        box("houseRightWall",x+w/2-wall/2,h/2,z,wall,h,d-wall*2,wallMaterial);
        box("houseInteriorFloor",x,0.08,z,w-wall*2,0.12,d-wall*2,M.woodLight);
      }else{
        box("houseBody",x,h/2,z,w,h,d,M.plaster);
      }
      box("houseBeamTop",x,h*0.88,z-d*0.51,w*1.02,0.16,0.14,M.woodDark);
      for(const bx of [-0.35,0.35])box("houseBeam",x+w*bx,h*0.50,z-d*0.51,0.16,h*0.90,0.14,M.woodDark);
      const roofDepth=d*1.18,roofZ=z,roofMat=M.roof;
      const pitch=0.30,rise=Math.tan(pitch)*w*0.5,slopeWidth=w*0.54/Math.cos(pitch);
      const roofA=box("roofA",x-w*0.25,h+rise*0.50,roofZ,slopeWidth,0.18,roofDepth,roofMat);roofA.rotation.z=pitch;
      const roofB=box("roofB",x+w*0.25,h+rise*0.50,roofZ,slopeWidth,0.18,roofDepth,roofMat);roofB.rotation.z=-pitch;
      for(const roof of [roofA,roofB])roof.metadata={...roof.metadata,interiorRoof:{x,z,w,d},tokenOccluder:true};
      // Close BOTH gable ends. Full rectangular walls still left an open
      // triangle beneath the pitched roof, making the house look unfinished.
      for(const end of [-1,1]){
        const centerZ=z+end*(d/2-.11*s),a=centerZ-.11*s,b=centerZ+.11*s;
        const gable=new BABYLON.Mesh("houseGable",scene),data=new BABYLON.VertexData();
        const positions=[x-w/2,h,a,x+w/2,h,a,x,h+rise,a,x-w/2,h,b,x+w/2,h,b,x,h+rise,b];
        const indices=[0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5],normals:number[]=[];
        BABYLON.VertexData.ComputeNormals(positions,indices,normals);
        data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=[0,0,1,0,.5,1,0,0,1,0,.5,1];data.applyToMesh(gable);
        gable.material=wallMaterial;gable.parent=parentFor("PROPS");gable.isPickable=false;gable.receiveShadows=true;
      }
      box("houseRoofRidge",x,h+rise+0.09,roofZ,0.22,0.20,roofDepth*1.04,M.woodDark);
      for(const side of [-1,1]){
        box("houseRoofEave",x+side*w*0.52,h+0.04,roofZ,0.18,0.20,roofDepth*1.06,M.woodDark);
        const fascia=box("houseRoofFascia",x+side*w*0.25,h+rise*0.50,roofZ-roofDepth*0.50,slopeWidth,0.16,0.13,M.woodLight);fascia.rotation.z=-side*pitch;
      }
      // Furnished rear corner stays within the existing, non-walkable house footprint.
      if(o.cutaway&&!o.material){
        box("houseCabinet",x-w*0.32,0.45,z+d*0.26,w*0.19,0.90,0.72,M.woodDark);
        box("houseCabinetTop",x-w*0.32,0.93,z+d*0.26,w*0.20,0.10,0.80,M.woodLight);
        for(let plate=0;plate<3;plate++)cyl("houseCabinetPlate",x-w*0.32+plate*0.30-0.30,1.00,z+d*0.26,0.22,0.05,M.ceramic);
        box("houseHearth",x+w*0.32,0.22,z+d*0.24,1.50,0.44,0.80,M.stoneDark);
        box("houseMantel",x+w*0.32,1.10,z+d*0.24,1.60,0.14,0.85,M.stoneLight);
        for(const side of [-1,1])box("houseHearthJamb",x+w*0.32+side*0.58,0.72,z+d*0.24,0.24,0.88,0.68,M.stone2);
        const coals=box("houseHearthCoals",x+w*0.32,0.50,z+d*0.23,0.86,0.09,0.48,M.fireOuter,"VFX");
        rt.updaters.push((time:number)=>{coals.visibility=.72+Math.sin(time*3.4)*.09;});
        box("houseWovenRug",x,0.16,z,w*0.29,0.03,d*0.45,M.clothRed);
        box("houseKitchenTable",x,0.73,z,2.2,0.14,1.15,M.woodLight);
        for(const side of [-1,1])box("houseKitchenLeg",x+side*0.74,0.38,z,0.14,0.70,0.82,M.woodDark);
        cyl("houseKitchenJug",x+0.53,0.97,z,0.23,0.32,M.ceramic);
      }
      if(!o.playable){
        box("houseDoor",doorX,h*0.38,frontZ,doorW,h*0.76,0.10,M.woodDark);
        box("houseDoorJambL",doorX-doorW*0.58,h*0.39,frontZ+frontSign*0.055,0.13,h*0.80,0.16,M.woodLight);
        box("houseDoorJambR",doorX+doorW*0.58,h*0.39,frontZ+frontSign*0.055,0.13,h*0.80,0.16,M.woodLight);
        box("houseDoorLintel",doorX,h*0.79,frontZ+frontSign*0.055,doorW+0.28,0.15,0.16,M.woodLight);
        sph("houseDoorKnob",doorX+doorW*0.30,h*0.39,frontZ+frontSign*0.12,0.11,M.gold);
      }
      for(const wx of windowOffsets){
        const px=x+w*wx,pz=z+frontSign*d*0.52;
        const win=box("windowGlow",px,h*0.58,frontZ,w*0.16,h*0.28,0.025,o.cutaway?windowGlass():M.lanternGlass);
        win.scaling.y=1;
        const frameW=w*0.19,frameH=h*0.34;
        box("houseWindowFrameTop",px,h*0.58+frameH*0.55,pz+frontSign*0.06,frameW,0.10,0.13,M.woodLight);
        box("houseWindowFrameBottom",px,h*0.58-frameH*0.55,pz+frontSign*0.06,frameW,0.10,0.13,M.woodLight);
        for(const side of [-1,1])box("houseWindowFrameSide",px+side*frameW*0.48,h*0.58,pz+frontSign*0.06,0.10,frameH,0.13,M.woodLight);
        box("houseWindowSill",px,h*0.58-frameH*0.66,pz+frontSign*0.15,frameW+0.22,0.12,0.32,M.woodDark);
        const wl=track(new BABYLON.PointLight("windowLight",new BABYLON.Vector3(px,h*0.72,pz+frontSign*d*0.18),scene));
        wl.parent=rt.root;
        wl.diffuse=new BABYLON.Color3(1,0.43,0.12);
        wl.intensity=o.windowLightIntensity??0.55;
        wl.range=o.windowLightRange??4.8;
      }
      for(let step=0;step<3;step++)box("houseEntryStone",doorX,h*0.045+step*0.015,frontZ+frontSign*(0.34+step*0.48),doorW+0.55-step*0.18,0.12,0.40,M.stoneLight);
      if(!o.playable)collider(x,z,w,d);
    }
    else if(o.asset==="long_table"){
      const w=(o.size?.[0]??5.2)*s,d=(o.size?.[1]??1.35)*s;
      box("longTableTop",x,0.78,z,w,0.18,d,M.woodLight);
      for(const sx of [-1,1])for(const sz of [-1,1])box("longTableLeg",x+sx*w*0.38,0.37,z+sz*d*0.30,0.16,0.74,0.16,M.woodDark);
      if(rt.id==="temple"){
        box("sanctuaryTableCloth",x,.883,z,w*.84,.025,d*.82,sanctuaryMaterial("rug"));
        for(const side of [-1,1]){
          const cloth=box("sanctuaryTableDrape",x,.68,z+side*d*.46,w*.84,.4,.025,sanctuaryMaterial("rug"));cloth.rotation.x=side*.09;
          box("sanctuaryTableGilt",x,.48,z+side*d*.46,w*.84,.035,.035,sanctuaryMaterial("gold"));
        }
      }
      collider(x,z,w*0.88,d*0.88);
    }
    else if(o.asset==="table_candelabrum"){
      const y=(o.y??0.88)*s,arms=o.arms??5,spread=(o.spread??0.62)*s,flames:any[]=[];
      cyl("tableCandelabrumBase",x,y-0.055,z,0.44*s,0.09*s,M.gold);
      cyl("tableCandelabrumStem",x,y+0.22*s,z,0.09*s,0.52*s,M.gold);
      for(let i=0;i<arms;i++){
        const t=arms===1?0:(i/(arms-1)-0.5)*2,px=x+t*spread;
        const arm=box("tableCandelabrumArm",x+t*spread*0.52,y+0.32*s,z,Math.max(0.14,Math.abs(t)*spread)*0.95+0.16,0.055*s,0.055*s,M.gold);arm.rotation.z=t*0.08;
        cyl("tableCandelabrumWax",px,y+0.48*s,z,0.085*s,0.30*s,M.wax);
        const mesh=sph("tableCandelabrumFlame",px,y+0.72*s,z,0.12*s,M.fireInner,"VFX");mesh.scaling.y=1.45;
        flames.push({mesh,by:mesh.position.y,seed:i*0.73+x-z,i});
      }
      const light=track(new BABYLON.PointLight("tableCandelabrumLight",new BABYLON.Vector3(x,y+0.70*s,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1.0,0.48,0.12);light.range=o.range??5.8;light.intensity=o.intensity??0.78;
      const seed=x*0.71+z*1.19;
      rt.updaters.push((time:number)=>{
        for(const q of flames){
          const flick=Math.sin(time*(10.6+q.i*0.35)+q.seed)*0.07+Math.sin(time*17.2+q.seed)*0.035;
          q.mesh.position.y=q.by+flick*0.035;q.mesh.scaling.y=1.45+flick*0.45;
        }
        light.intensity=(o.intensity??0.78)+Math.sin(time*7.1+seed)*0.06+Math.sin(time*13.4+seed)*0.025;
      });
    }
    else if(o.asset==="banquet_setting"){
      const w=(o.size?.[0]??6.2)*s,d=(o.size?.[1]??1.15)*s;
      const placeX=[-w*0.34,-w*0.12,w*0.12,w*0.34];
      placeX.forEach((pxOff:number,i:number)=>{
        const pz=z+(i%2===0?-d*0.23:d*0.23);
        cyl("banquetPlate",x+pxOff,0.895,pz,0.38*s,0.032*s,M.ceramic);
        const fork=box("banquetFork",x+pxOff-0.25*s,0.91,pz,0.025*s,0.018*s,0.30*s,M.iron);
        fork.rotation.y=0.03;
        const knife=box("banquetKnife",x+pxOff+0.25*s,0.91,pz,0.025*s,0.018*s,0.32*s,M.iron);
        knife.rotation.y=-0.03;
      });
      for(let i=0;i<7;i++){
        const px=x+(i-3)*0.36*s,pz=z+((i%2)?0.16:-0.15)*s;
        cyl("tableRoseStem",px,0.98,pz,0.035*s,0.22*s,M.leafDark);
        const rose=sph("tableRose",px,1.12,pz,0.18*s,i%3===0?M.rosePink:M.rose);
        rose.scaling.y=0.72;rt.markers.roses.push({mesh:rose,baseY:rose.position.y,seed:100+i});
      }
    }
    else if(o.asset==="temple_buttress"){
      const h=(o.height??2.25)*s,w=(o.width??0.72)*s,d=(o.depth??1.10)*s;
      box("templeButtressBase",x,h*0.18,z,w*1.35,h*0.36,d*1.12,M.stoneDark);
      const body=box("templeButtressBody",x,h*0.54,z,w,h*0.72,d,M.stone2);
      body.rotation.y=o.rotation??0;
      box("templeButtressCap",x,h*0.94,z,w*1.18,0.16*s,d*1.06,M.stoneLight);
      collider(x,z,Math.max(w,d)*0.72,Math.max(w,d)*0.72);
    }
    else if(o.asset==="temple_altar_backdrop"){
      const w=(o.size?.[0]??7.4)*s,h=(o.height??3.2)*s,d=(o.depth??0.48)*s;
      box("templeBackdropBase",x,0.18,z,w*1.08,0.36,d*1.25,M.stoneDark);
      box("templeBackdropPanel",x,h*0.48,z,w,h*0.82,d,M.stone2);
      for(const sx of [-1,1]){
        cyl("templeBackdropColumn",x+sx*w*0.39,h*0.48,z-d*0.18,0.58*s,h*0.90,M.stoneLight);
        cyl("templeBackdropCap",x+sx*w*0.39,h*0.94,z-d*0.18,0.82*s,0.18*s,M.stone2);
      }
      const crown=box("templeBackdropCrown",x,h*0.91,z,w*0.94,0.28*s,d*1.18,M.stoneLight);
      crown.rotation.z=0.01;
      const inset=box("sanctuaryAltarRecess",x,h*.51,z+d*.56,w*.62,h*.83,.08,sanctuaryMaterial("recess"));
      inset.isPickable=false;
      const archRoot=new BABYLON.TransformNode("sanctuaryReredos",scene);archRoot.parent=rt.root;archRoot.position.set(x,0,z+d*.65);
      pointedArch(archRoot,w*.62,.35,h*.92,.34,sanctuaryMaterial("carving"),"sanctuaryReredosArch");
      for(const side of [-1,1]){
        for(let i=0;i<3;i++)cyl("sanctuaryReredosSpire",x+side*(w*.42+i*.18),h+.25-i*.18,z,.22,.8-i*.12,sanctuaryMaterial("carving"));
        box("sanctuaryAltarGilt",x+side*w*.39,h*.48,z+d*.72,.075,h*.81,.04,sanctuaryMaterial("gold"));
      }
    }
    else if(o.asset==="temple_sanctuary_details"){
      const stone=sanctuaryMaterial("carving"),slate=sanctuaryMaterial("slate"),moss=sanctuaryMaterial("moss");
      const walls=rt.config.MAP.objects.filter((q:any)=>q.asset==="temple_wall");
      for(const wall of walls){
        const [wx,wz]=wall.position,[ww,dd]=wall.size,hh=wall.height;
        // Perimeter-only corbels/cornices and roof remnants leave the whole
        // nave/court open: no roof plane or beam hides the tactical board.
        box("sanctuaryCornice",wx,hh-.25,wz,ww+.14,.14,dd+.18,stone);
        box("sanctuaryCornice",wx,hh+.02,wz,ww+.30,.12,dd+.34,slate);
        const alongX=ww>dd,len=alongX?ww:dd;
        for(let i=0;i<Math.floor(len/1.25);i++){
          const offset=-len*.5+(i+.5)*1.25;
          const q=box("sanctuaryCorbel",wx+(alongX?offset:0),hh-.43,wz+(alongX?0:offset),alongX?.22:ww+.14,.23,alongX?dd+.14:.22,stone);
          q.rotation.y=seeded(i+wx)*.04;
        }
        if(wz<8&&Math.abs(wx)>12){
          const side=Math.sign(wx);
          const eave=box("sanctuaryRoofRemnant",wx+side*.20,hh+.30,wz,1.05,.14,dd+.15,slate);eave.rotation.z=-side*.32;
        }
      }
      // Inlaid court medallion: ornament, not a collision or a new objective.
      for(const diameter of [5.7,5.3,4.8]){
        const ring=BABYLON.MeshBuilder.CreateTorus("sanctuaryCourtInlay",{diameter,thickness:.045,tessellation:64},scene);
        ring.parent=parentFor("BASE");ring.position.set(0,.34,12.8);ring.material=sanctuaryMaterial("gold");ring.isPickable=false;
      }
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,q=box("sanctuaryCourtInlayRay",Math.cos(a)*2.04,.339,12.8+Math.sin(a)*2.04,.07,.018,.63,stone);q.rotation.y=-a+Math.PI/2;q.isPickable=false;
      }
      // Debris, roots, roses and candle clusters stay at existing wall/altar
      // footprints rather than placing unseen movement blockers in the aisle.
      for(const side of [-1,1]){
        for(const zz of [-3.55,.60]){
          const arcade=new BABYLON.TransformNode("sanctuarySideArcade",scene);arcade.parent=rt.root;
          arcade.position.set(side*8.5,0,zz);arcade.rotation.y=Math.PI/2;
          pointedArch(arcade,4.1,2.7,2.35,.26,stone,"sanctuaryAisleArch");
        }
        for(let i=0;i<38;i++){
          const zz=-8+seeded(i*2.7+side)*15;
          const xx=side*(12.7+seeded(i*7.1)*.55);
          const q=box("sanctuaryLooseStone",xx,.34,zz,.15+seeded(i)*.32,.12,.18+seeded(i*4)*.28,stone);q.rotation.y=i*.73;
          const leaf=sph("sanctuaryWallIvy",side*13.44,.36+seeded(i*3.7)*3.2,zz,.14+seeded(i)*.14,moss);leaf.scaling.set(.36,1,1.25);
          if(i%7===0){const rose=sph("sanctuaryWallRose",side*13.32,.55+seeded(i)*1.1,zz,.18,M.rose);rose.isPickable=false;}
        }
        for(let i=0;i<9;i++){
          const xx=side*(2.7+seeded(i*5.4)*1.1),zz=-7.3+seeded(i*9.3)*.6,h=.20+seeded(i*3.1)*.38;
          cyl("sanctuaryVotive",xx,.34+h*.5,zz,.105,h,M.wax);
          const flame=sph("sanctuaryVotiveFlame",xx,.37+h,zz,.07,M.fireInner,"VFX");flame.scaling.y=1.6;
        }
        // Low natural banks break the lawn's flat, rectangular toy silhouette.
        for(let i=0;i<20;i++){
          const zz=-12+i*2.1,xx=side*(23.9+Math.sin(i*1.7)*.45);
          const rock=sph("sanctuaryBoundaryRock",xx,.06,zz,1.1+seeded(i*4.1)*1.3,M.stoneDark);rock.scaling.set(.65,.42,1.15);
        }
      }
      // Recessed masonry and fine border around the nave, without floor grid.
      for(const side of [-1,1])box("sanctuaryFloorBorder",side*13.1,.31,-.45,.16,.025,16.2,slate,"BASE");
      box("sanctuaryFloorBorder",0,.31,-8.45,26.3,.025,.16,slate,"BASE");
    }
    else if(o.asset==="temple_garden_bed"){
      const w=(o.size?.[0]??4.4)*s,d=(o.size?.[1]??1.8)*s;
      box("templeGardenSoil",x,0.07,z,w*0.90,0.10,d*0.78,M.soil);
      box("templeGardenBorderN",x,0.18,z-d*0.46,w,0.30,0.22*s,M.stone2);
      box("templeGardenBorderS",x,0.18,z+d*0.46,w,0.30,0.22*s,M.stone2);
      box("templeGardenBorderW",x-w*0.49,0.18,z,0.22*s,0.30,d,M.stone2);
      box("templeGardenBorderE",x+w*0.49,0.18,z,0.22*s,0.30,d,M.stone2);
      const count=o.count??12;
      for(let i=0;i<count;i++){
        const px=x+(seeded(i*5.7+x)-0.5)*w*0.76,pz=z+(seeded(i*8.9+z)-0.5)*d*0.58;
        const hh=0.24+seeded(i*3.9)*0.42;
        cyl("templeGardenStem",px,0.10+hh*0.48,pz,0.038*s,hh,M.leafDark);
        const leaf=sph("templeGardenLeaf",px,0.18+hh,pz,0.20+seeded(i*7.1)*0.15,M.leaf);
        leaf.scaling.set(1.15,0.50,0.82);
        if(i%4===0){
          const flower=sph("templeGardenRose",px,0.24+hh,pz,0.16*s,i%8===0?M.rosePink:M.rose);
          flower.scaling.y=0.72;rt.markers.roses.push({mesh:flower,baseY:flower.position.y,seed:200+i});
        }
      }
    }
    else if(o.asset==="temple_brazier"){
      const y=(o.height??0.72)*s;
      cyl("templeBrazierFoot",x,0.18,z,0.42*s,0.36*s,M.iron);
      const bowl=BABYLON.MeshBuilder.CreateCylinder("templeBrazierBowl",{diameterTop:0.86*s,diameterBottom:0.56*s,height:0.25*s,tessellation:18},scene);
      bowl.position.set(x,y,z);bowl.material=M.iron;bowl.parent=rt.root;
      const flame=sph("templeBrazierFlame",x,y+0.37,z,0.30*s,M.fireInner,"VFX");flame.scaling.set(0.72,1.55,0.72);
      const outer=sph("templeBrazierOuter",x,y+0.34,z,0.38*s,M.fireOuter,"VFX");outer.scaling.set(0.64,1.38,0.64);
      const light=track(new BABYLON.PointLight("templeBrazierLight",new BABYLON.Vector3(x,y+0.55,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.36,0.07);light.range=o.range??6.8;light.intensity=o.intensity??1.25;
      const seed=x*0.87+z*1.41,fy=flame.position.y,oy=outer.position.y;
      rt.updaters.push((time:number)=>{const a=Math.sin(time*9.0+seed),b=Math.sin(time*14.4+seed);flame.position.y=fy+a*0.022;outer.position.y=oy+b*0.018;light.intensity=(o.intensity??1.25)+a*0.10+b*0.04;});
      collider(x,z,0.72*s,0.72*s);
    }
    else if(o.asset==="temple_pew"){
      const len=(o.length??3.4)*s;
      const root=new BABYLON.TransformNode("templePew",scene);root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=o.rotation??0;
      const seat=BABYLON.MeshBuilder.CreateBox("templePewSeat",{width:len,height:0.18,depth:0.72*s},scene);seat.position.y=0.48;seat.material=M.woodLight;seat.parent=root;
      const back=BABYLON.MeshBuilder.CreateBox("templePewBack",{width:len,height:0.82,depth:0.14*s},scene);back.position.set(0,0.88,0.30*s);back.material=M.woodDark;back.parent=root;
      for(const lx of [-len*0.36,len*0.36]){
        const leg=BABYLON.MeshBuilder.CreateBox("templePewLeg",{width:0.16*s,height:0.48,depth:0.54*s},scene);leg.position.set(lx,0.24,0);leg.material=M.woodDark;leg.parent=root;
      }
      collider(x,z,Math.abs(Math.cos(root.rotation.y))*len+Math.abs(Math.sin(root.rotation.y))*0.75,Math.abs(Math.sin(root.rotation.y))*len+Math.abs(Math.cos(root.rotation.y))*0.75);
    }
    else if(o.asset==="temple_lectern"){
      const root=new BABYLON.TransformNode("templeLectern",scene);root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=o.rotation??0;
      const base=BABYLON.MeshBuilder.CreateBox("templeLecternBase",{width:0.90,height:0.16,depth:0.72},scene);base.position.y=0.08;base.material=M.woodDark;base.parent=root;
      const post=BABYLON.MeshBuilder.CreateBox("templeLecternPost",{width:0.24,height:1.05,depth:0.24},scene);post.position.y=0.62;post.material=M.wood;post.parent=root;
      const top=BABYLON.MeshBuilder.CreateBox("templeLecternTop",{width:1.18,height:0.16,depth:0.78},scene);top.position.set(0,1.18,0);top.rotation.x=-0.28;top.material=M.woodLight;top.parent=root;
      const page=BABYLON.MeshBuilder.CreateBox("templeLecternPage",{width:0.88,height:0.025,depth:0.54},scene);page.position.set(0,1.28,-0.06);page.rotation.x=-0.28;page.material=M.wax;page.parent=root;
      collider(x,z,1.0,0.8);
    }
    else if(o.asset==="temple_pedestal"){
      box("templePedestalBase",x,0.12,z,1.05,0.24,1.05,M.stoneDark);
      box("templePedestalStem",x,0.66,z,0.68,0.92,0.68,M.stone2);
      box("templePedestalTop",x,1.18,z,1.00,0.16,1.00,M.stoneLight);
      if(o.bowl){
        const bowl=cyl("templeOfferingBowl",x,1.34,z,0.62,0.20,M.gold);
        bowl.scaling.y=0.55;
      }
      collider(x,z,0.95,0.95);
    }
    else if(o.asset==="temple_amphora_cluster"){
      const count=o.count??3;
      for(let i=0;i<count;i++){
        const ox=(i-(count-1)/2)*0.52,oz=(i%2?0.20:-0.16);
        const body=sph("templeAmphora",x+ox,0.42,z+oz,0.58,M.wood);
        body.scaling.set(0.72,1.20,0.72);
        cyl("templeAmphoraNeck",x+ox,0.76,z+oz,0.22,0.28,M.woodLight);
      }
    }
    else if(o.asset==="temple_floor_candelabrum"){
      const arms=o.arms??3,h=1.65*s;
      cyl("templeFloorCandBase",x,0.08,z,0.76*s,0.16,M.iron);
      cyl("templeFloorCandStem",x,h*0.48,z,0.12*s,h*0.86,M.iron);
      for(let i=0;i<arms;i++){
        const dx=(i-(arms-1)/2)*0.42*s;
        const arm=box("templeFloorCandArm",x+dx*0.5,h*0.86,z,Math.abs(dx)+0.18,0.08,0.08,M.iron);
        const flame=sph("templeFloorCandFlame",x+dx,h*0.98,z,0.12*s,M.fireInner,"VFX");flame.scaling.y=1.35;
      }
      collider(x,z,0.75,0.75);
    }
    else if(o.asset==="temple_offering_table"){
      const w=(o.size?.[0]??2.4)*s,d=(o.size?.[1]??0.9)*s;
      box("templeOfferingTable",x,0.58,z,w,0.16,d,M.woodLight);
      box("templeOfferingLegL",x-w*0.36,0.28,z,0.16,0.56,0.16,M.woodDark);
      box("templeOfferingLegR",x+w*0.36,0.28,z,0.16,0.56,0.16,M.woodDark);
      for(const dx of [-0.62,0,0.62])cyl("templeOfferingDish",x+dx,0.72,z,0.34,0.06,M.ceramic);
      collider(x,z,w*0.92,d*0.92);
    }
    else if(o.asset==="temple_altar"){
      const w=(o.size?.[0]??5.2)*s,d=(o.size?.[1]??2.0)*s,h=(o.height??1.08)*s;
      box("templeAltarStep",x,0.10,z,w*1.18,0.20,d*1.35,M.stoneDark);
      box("templeAltarPlinth",x,0.34,z,w,0.48,d,M.stone2);
      box("templeAltarTop",x,h,z,w*1.04,0.18,d*1.05,M.stoneLight);
      for(const sx of [-1,1])cyl("templeAltarBrazier",x+sx*w*0.35,h+0.23,z,0.28*s,0.18*s,M.gold);
      collider(x,z,w*1.05,d*1.10);
    }
    else if(o.asset==="temple_window"){
      const root=new BABYLON.TransformNode("templeWindow",scene);root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=o.rotation??0;
      const w=(o.width??1.75)*s,h=(o.height??2.35)*s,y=(o.y??1.55)*s;
      const stone=sanctuaryMaterial("carving"),bottom=y-h*.5;
      pointedArch(root,w,bottom,h,.42*s,stone,"templeWindowArch");
      pointedArch(root,w*.78,bottom+.12,h*.89,.22*s,stone,"templeWindowInnerArch");
      const sill=box("templeWindowSill",0,0,0,w*1.28,.18,.7,stone);sill.parent=root;sill.position.set(0,bottom-.06,0);
      const pane=BABYLON.MeshBuilder.CreatePlane("templeWindowGlass",{width:w,height:h,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);
      pane.position.set(0,y,0);pane.material=sanctuaryMaterial("glass");pane.parent=root;pane.isPickable=false;
      const mullion=box("templeWindowMullion",0,0,0,.085,h*.7,.19,stone);mullion.parent=root;mullion.position.set(0,bottom+h*.36,.12);
      const cross=box("templeWindowCross",0,0,0,w*.8,.09,.19,stone);cross.parent=root;cross.position.set(0,bottom+h*.4,.12);
      const rose=BABYLON.MeshBuilder.CreateTorus("templeWindowRose",{diameter:w*.38,thickness:.09,tessellation:20},scene);
      rose.parent=root;rose.position.set(0,bottom+h*.66,.13);rose.rotation.x=Math.PI/2;rose.material=stone;
      if(o.sunlit){
        const dir=o.direction??[1,-0.25,0],beam=o.beamLength??5.6;
        const spot=track(new BABYLON.SpotLight("goldenWindowLight",new BABYLON.Vector3(x-dir[0]*0.8,y+0.45,z-dir[2]*0.8),new BABYLON.Vector3(dir[0],dir[1],dir[2]),Math.PI/3.4,7.5,scene));
        spot.parent=rt.root;spot.diffuse=new BABYLON.Color3(.40,.57,1);spot.specular=new BABYLON.Color3(.10,.17,.3);spot.range=beam+3;spot.intensity=o.intensity??2.1;
        const horiz=Math.sqrt(dir[0]*dir[0]+dir[2]*dir[2])||1;
        const dx=dir[0]/horiz,dz=dir[2]/horiz;
        const mat=new BABYLON.StandardMaterial("goldenWindowPatchMat",scene);
        mat.metadata={d8Authored:true};mat.diffuseColor=new BABYLON.Color3(.24,.39,.70);mat.emissiveColor=new BABYLON.Color3(.16,.25,.40);mat.alpha=0.10;mat.disableLighting=true;
        rt.disposables.push(mat);
        const patch=BABYLON.MeshBuilder.CreateBox("goldenWindowPatch",{width:w*0.92,height:0.018,depth:beam},scene);
        patch.position.set(x+dx*beam*0.46,0.306,z+dz*beam*0.46);patch.rotation.y=Math.atan2(dx,dz);patch.material=mat;patch.parent=parentFor("VFX");
        if(glow.addExcludedMesh)glow.addExcludedMesh(patch);
        const shaft=BABYLON.MeshBuilder.CreateRibbon("sanctuaryWindowShaft",{pathArray:[
          [new BABYLON.Vector3(x-dz*w*.34,y+h*.28,z+dx*w*.34),new BABYLON.Vector3(x+dx*beam-dz*w*.72,.34,z+dz*beam+dx*w*.72)],
          [new BABYLON.Vector3(x+dz*w*.34,y+h*.28,z-dx*w*.34),new BABYLON.Vector3(x+dx*beam+dz*w*.72,.34,z+dz*beam-dx*w*.72)]
        ],sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);
        shaft.parent=parentFor("VFX");shaft.material=sanctuaryMaterial("shaft");shaft.isPickable=false;
        if(glow.addExcludedMesh)glow.addExcludedMesh(shaft);
      }
    }
    else if(o.asset==="temple_torch"){
      const h=(o.height??1.78)*s;
      const mount=box("templeTorchMount",x,h-0.18,z,0.34*s,0.10*s,0.12*s,M.iron);mount.rotation.y=o.rotation??0;
      const flame=sph("templeTorchFlame",x,h+0.34,z,0.18*s,M.fireInner,"VFX");flame.scaling.set(0.74,1.80,0.74);
      const outer=sph("templeTorchOuter",x,h+0.31,z,0.26*s,M.fireOuter,"VFX");outer.scaling.set(0.66,1.48,0.66);
      const light=track(new BABYLON.PointLight("templeTorchLight",new BABYLON.Vector3(x,h+0.34,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1.0,0.40,0.09);light.specular=new BABYLON.Color3(0.30,0.10,0.02);light.range=o.range??7.6;light.intensity=o.intensity??1.42;
      const fy=flame.position.y,oy=outer.position.y,seed=x*1.31+z*2.07,embers:any[]=[],smokes:any[]=[];
      for(let i=0;i<4;i++){embers.push({mesh:sph("templeTorchEmber",x,h+0.28,z,0.025+(i%2)*0.01,M.fireOuter,"VFX"),off:i/4,i});}
      for(let i=0;i<3;i++){smokes.push({mesh:sph("templeTorchSmoke",x,h+0.55+i*0.18,z,0.16+i*0.04,M.smoke,"VFX"),off:i/3,i});}
      rt.updaters.push((time:number)=>{
        const a=Math.sin(time*9.7+seed),b=Math.sin(time*15.1+seed*0.7);
        flame.position.y=fy+a*0.025;outer.position.y=oy+b*0.020;flame.scaling.y=1.80+a*0.16;outer.scaling.y=1.48+b*0.12;
        light.intensity=(o.intensity??1.42)+a*0.12+b*0.05;
        for(const q of embers){const c=(time*0.48+q.off+seed*0.01)%1,e=q.mesh;e.position.y=h+0.30+c*0.95;e.position.x=x+Math.sin(time*2+q.i+seed)*0.10*c;e.position.z=z+Math.cos(time*1.7+q.i)*0.07*c;const k=Math.max(0.05,1-c);e.scaling.set(k,k,k);}
        for(const q of smokes){const c=(time*0.16+q.off+seed*0.02)%1,m=q.mesh;m.position.y=h+0.52+c*1.35;m.position.x=x+Math.sin(time*0.6+q.i+seed)*0.10;const k=0.65+c*0.85;m.scaling.set(k,k*1.15,k);}
      });
    }
    else if(o.asset==="column"){
      const h=(o.height??3.0)*s,d=(o.diameter??0.75)*s;
      if(rt.id==="temple"){
        const stone=sanctuaryMaterial("carving"),dark=sanctuaryMaterial("recess");
        box("sanctuaryColumnPlinth",x,.40,z,d*1.8,.25,d*1.8,stone);
        cyl("sanctuaryColumnFoot",x,.60,z,d*1.45,.18,stone);
        cyl("sanctuaryColumnShaft",x,h*.5+.62,z,d,h-.25,stone);
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          cyl("sanctuaryColumnFlute",x+Math.cos(a)*d*.46,h*.5+.62,z+Math.sin(a)*d*.46,.065,h-.42,dark);
        }
        for(const [yy,dd,hh] of [[h+.48,d*1.12,.15],[h+.66,d*1.5,.22]])cyl("sanctuaryColumnCapital",x,yy,z,dd,hh,stone);
        box("sanctuaryColumnAbacus",x,h+.82,z,d*1.72,.16,d*1.72,stone);
      }else{
      cyl("columnBase",x,0.12,z,d*1.35,0.24,M.stone2);
      cyl("column",x,h/2+0.20,z,d,h,M.stoneLight);
      cyl("columnCap",x,h+0.30,z,d*1.35,0.22,M.stone2);
      }
      const light=track(new BABYLON.PointLight("templeCandleLight",new BABYLON.Vector3(x,h+.20,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,.56,.22);light.range=4.6;light.intensity=.65;
      rt.updaters.push((t:number)=>{light.intensity=.65+Math.sin(t*8.3+x)*.06;});
      collider(x,z,d,d);
    }
    else if(o.asset==="archway"){
      const w=(o.size?.[0]??3.2)*s,h=(o.height??3.2)*s;
      box("archLeft",x-w*0.43,h*0.45,z,0.45,h*0.90,0.60,M.stoneDark);
      box("archRight",x+w*0.43,h*0.45,z,0.45,h*0.90,0.60,M.stoneDark);
      const top=box("archTop",x,h*0.91,z,w,0.48,0.60,M.stone2);
      top.rotation.z=0.02;
      collider(x-w*0.43,z,0.45,0.60);collider(x+w*0.43,z,0.45,0.60);
    }
    else if(o.asset==="ice_crack"){
      const branches=o.branches??5,length=(o.length??3.0)*s;
      for(let b=0;b<branches;b++){
        const points:any[]=[new BABYLON.Vector3(x,0.085,z)];
        const a=(b/branches)*Math.PI*2+(o.rotation??0);
        for(let i=1;i<=4;i++){
          const t=i/4,j=(b*17+i*13)%7*0.035;
          points.push(new BABYLON.Vector3(x+Math.cos(a+j)*length*t,0.086,z+Math.sin(a+j)*length*t));
        }
        const line=BABYLON.MeshBuilder.CreateLines("iceCrack",{points},scene);line.parent=rt.root;line.color=new BABYLON.Color3(0.08,0.32,0.58);line.alpha=0.78;
      }
    }
    else if(o.asset==="magic_pedestal"){
      const base=cyl("magicBase",x,0.18,z,2.5*s,0.36,M.stoneDark);
      cyl("magicRing",x,0.42,z,1.95*s,0.20,M.gold);
      const core=cyl("magicCore",x,0.64,z,1.45*s,0.26,M.magicBlue);
      const light=track(new BABYLON.PointLight("magicPedestalLight",new BABYLON.Vector3(x,1.0,z),scene));
      const mc=o.lightColor??[0.10,0.55,1];light.parent=rt.root;light.diffuse=new BABYLON.Color3(mc[0],mc[1],mc[2]);light.range=o.range??11;light.intensity=o.intensity??1.35;
      rt.markers.magic.push({x,z,mesh:core,light,seed:x+z});
      collider(x,z,2.3*s,2.3*s);
    }
    else if(o.asset==="mirror_frame"){
      const root=new BABYLON.TransformNode("mirrorFrame",scene);root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=o.rotation??0;
      const frame=BABYLON.MeshBuilder.CreateTorus("mirrorFrameRing",{diameter:2.35*s,thickness:0.18*s,tessellation:40},scene);
      frame.parent=root;frame.position.y=1.65*s;frame.rotation.x=Math.PI/2;frame.material=M.gold;
      const glass=BABYLON.MeshBuilder.CreateDisc("mirrorGlass",{radius:0.96*s,tessellation:40},scene);
      glass.parent=root;glass.position.y=1.65*s;glass.rotation.y=Math.PI;glass.material=M.frost;
        const support=box("mirrorSupport",x,0.35,z,0.28*s,.70*s,0.32*s,M.gold);support.parent=root;support.position.set(0,.35,-.18*s);
      root.metadata={authoredPropId:'true-love-mirror'};
      rt.markers.magic.push({x,z,mesh:glass,seed:x-z});
      collider(x,z,1.4*s,1.0*s);
    }
    else if(o.asset==="ice_crystal"){
      const h=(o.height??1.4)*s;
      const q=BABYLON.MeshBuilder.CreateCylinder("iceCrystal",{diameterTop:0,diameterBottom:0.52*s,height:h,tessellation:5},scene);
      q.position.set(x,h/2,z);q.material=M.frost;q.parent=rt.root;q.rotation.y=(o.rotation??0);
      const baseY=q.position.y,seed=x*1.3+z*0.7;
      rt.updaters.push((t:number)=>{q.position.y=baseY+Math.sin(t*1.6+seed)*0.035;q.rotation.y+=0.0015;});
      if(o.lightColor){
        const lc=o.lightColor;
        const glow=track(new BABYLON.PointLight("crystalGlow",new BABYLON.Vector3(x,h*0.75,z),scene));
        glow.parent=rt.root;glow.diffuse=new BABYLON.Color3(lc[0],lc[1],lc[2]);
        glow.intensity=o.intensity??1.00;glow.range=o.range??9;
        rt.updaters.push((t:number)=>glow.intensity=(o.intensity??0.72)+Math.sin(t*1.8+seed)*0.08);
      }
    }
    else if(o.asset==="fireplace"){box("fireplace",x-0.9,0.85,z,1.4,1.7,3.9,M.stoneDark);box("opening",x,0.4,z,0.25,0.8,1.4,M.woodDark);collider(x-0.7,z,1.4,3.9);rt.markers.fireplaces.push({x,z});}
    else if(o.asset==="rug"){box("rugBorder",x,0.075,z,o.size[0],0.04,o.size[1],M.yellow);box("rug",x,0.09,z,o.size[0]-0.25,0.025,o.size[1]-0.25,M.green);}
    else if(o.asset==="pool"){const water=box("poolWater",x,0.055,z,5.3,0.08,1.7,M.water);box("poolGlow",x,0.095,z,4.4,0.02,1,M.waterGlow);for(let i=0;i<13;i++){box("poolStone",x-2.9+i*0.48,0.15,z-1.05,0.4,0.25,0.28,i%2?M.stone:M.stone2);box("poolStone",x-2.9+i*0.48,0.15,z+1.05,0.4,0.25,0.28,i%2?M.stone2:M.stone);}collider(x,z,6.2,2.3);rt.markers.pools.push({x,z,mesh:water,baseY:water.position.y});}
    else if(o.asset==="cabinet"){box("cabinet",x,0.48,z,o.size[0],0.96,o.size[1],M.woodDark);collider(x,z,o.size[0],o.size[1]);}
    else if(o.asset==="crate"){const q=0.8*s;box("crate",x,q/2,z,q,q,q,M.wood);box("crateCross",x,q+0.02,z,q*0.9,0.04,0.1,M.woodDark);collider(x,z,q,q);}
    else if(o.asset==="statue"){
      if(rt.id==="temple"){
        const stone=sanctuaryMaterial("carving");
        stone.diffuseTexture=PROCEDURAL_SURFACES.stone?.texture??stone.diffuseTexture;
        stone.bumpTexture=PROCEDURAL_SURFACES.stone?.normal??stone.bumpTexture;
        if(stone.bumpTexture)stone.bumpTexture.level=.24;
        box("sanctuaryStatuePlinth",x,.53,z,1.8,.50,1.5,stone);
        cyl("sanctuaryStatueFoot",x,.9,z,1.12,.25,stone);
        const robe=BABYLON.MeshBuilder.CreateCylinder("sanctuaryStatueRobe",{height:1.65,diameterTop:.38,diameterBottom:1.05,tessellation:12},scene);
        robe.parent=rt.root;robe.position.set(x,1.8,z);robe.material=stone;
        const torso=sph("sanctuaryStatueTorso",x,2.55,z,.65,stone);torso.scaling.set(.85,1.05,.65);
        sph("sanctuaryStatueHead",x,3.15,z,.43,stone);
        for(const side of [-1,1]){
          const arm=cyl("sanctuaryStatueArm",x+side*.4,2.50,z+.12,.16,.72,stone);arm.rotation.z=side*.8;
          for(let f=0;f<7;f++){
            const wing=cyl("sanctuaryStatueFeather",x+side*(.63+f*.11),2.9-f*.075,z-.12,.14,1.3-f*.085,stone);
            wing.rotation.z=side*(.60+f*.055);
          }
        }
        const halo=BABYLON.MeshBuilder.CreateTorus("sanctuaryStatueHalo",{diameter:.74,thickness:.06,tessellation:24},scene);
        halo.parent=rt.root;halo.position.set(x,3.25,z-.16);halo.rotation.x=Math.PI/2;halo.material=sanctuaryMaterial("gold");
      }else{box("statueBase",x,0.3,z,2,0.6,1.4,M.stoneLight);box("statue",x,1.5,z,0.8,2.4,0.7,M.stoneLight);}
      collider(x,z,2,1.4);
    }
    else if(o.asset==="stairs"){
      const steps=o.steps??5,sw=o.size?.[0]??2.6,depth=o.size?.[1]??2.8,totalH=o.height??0.75;
      for(let i=0;i<steps;i++){
        const h=totalH*(o.ascending==="north"?steps-i:i+1)/steps;
        const d=depth/steps;
        const zz=z-depth/2+d*(i+0.5);
        const q=box("stair",x,(o.baseHeight??0)+h/2,zz,sw,h,d+0.02,M[o.material]??M.stone);
        if(glow.addExcludedMesh)glow.addExcludedMesh(q);
      }
    }
    else if(o.asset==="bridge"){
      const bw=o.size?.[0]??2.4,bl=o.size?.[1]??4.8,planks=o.planks??12;
      const plankD=bl/planks;
      for(let i=0;i<planks;i++){
        const zz=z-bl/2+plankD*(i+0.5);
        const q=box("bridgePlank",x,0.14,zz,bw,0.18,plankD*0.88,M[o.material]??M.wood);
        q.rotation.y=(i%2?0.012:-0.012);
      }
      for(const side of [-1,1]){
        box("bridgeRail",x+side*(bw/2-0.08),0.54,z,0.10,0.10,bl,M.woodDark);
        for(let i=0;i<4;i++){
          const zz=z-bl/2+(i+0.5)*(bl/4);
          box("bridgePost",x+side*(bw/2-0.08),0.34,zz,0.12,0.68,0.12,M.woodDark);
        }
      }
    }
    else if(o.asset==="collider_only"){collider(x,z,o.size[0],o.size[1]);}
    else if(o.asset==="path"){box("path",x,0.04,z,o.size[0],0.08,o.size[1],M.stone);}
    else if(o.asset==="temple_tree"){
      const h=(o.height??4.1)*s,c=(o.crown??3.0)*s;
      cyl("templeTreeTrunk",x,h*0.38,z,0.48*s,h*0.76,M.woodDark);
      for(let i=0;i<22;i++){
        const a=i*2.4+x,r=Math.sqrt(seeded(i*7.3+z))*c*.48;
        const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
        const py=h*.78+seeded(i*4.7+x)*c*.45-r*.4;
        const leaf=BABYLON.MeshBuilder.CreatePlane("sanctuaryCanopy",{size:c*.64,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);
        leaf.parent=rt.root;leaf.position.set(px,py,pz);leaf.rotation.set(i%2?.45:-.35,a,i*.17);leaf.material=sanctuaryMaterial("foliage");leaf.isPickable=false;
        if(i%5===0){const branch=cyl("templeTreeTrunk",x+(px-x)*.4,h*.62,z+(pz-z)*.4,.13,h*.48,M.woodDark);branch.rotation.z=Math.sin(a)*.65;branch.rotation.x=Math.cos(a)*.65;}
      }
      collider(x,z,0.75*s,0.75*s);
    }
    else if(o.asset==="grass_tufts"){
      const count=o.count??14,spread=(o.spread??2.5)*s;
      for(let i=0;i<count;i++){
        const a=seeded(i*12.7+x*1.9-z)*Math.PI*2;
        const r=seeded(i*19.3+z*2.1+x)*spread;
        const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
        const hh=(0.16+seeded(i*7.7)*0.22)*s;
        const stem=cyl("grassStem",px,hh*0.48,pz,0.025*s,hh,M.leafDark);
        stem.rotation.z=(seeded(i*3.3)-0.5)*0.35;
        const blade=sph("grassLeaf",px,hh,pz,(0.10+seeded(i*5.1)*0.08)*s,i%3===0?M.green:M.leaf);
        blade.scaling.set(0.55,1.35,0.45);
      }
    }
    else if(o.asset==="tree"){box("treeTrunk",x,1.2,z,0.7,2.4,0.7,M.woodDark);sph("treeCrown",x,2.5,z,2.8,M.purple);collider(x,z,0.8,0.8);}
    else if(o.asset==="stall"){box("stall",x,0.5,z,4,1,1.4,M.wood);box("canopy",x,1.55,z,4.5,0.12,2,M[o.color]??M.green);collider(x,z,4,1.4);}
    else if(o.asset==="wall_trim"){
      const w=(o.size?.[0]??4)*s,d=(o.size?.[1]??0.22)*s,h=(o.height??0.20)*s,y=(o.y??0.22)*s;
      const q=box("wallTrim",x,y,z,w,h,d,M[o.material]??M.stone2);
      q.rotation.y=o.rotation??0;
    }
    else if(o.asset==="runner"){
      const w=(o.size?.[0]??2.0)*s,d=(o.size?.[1]??5.0)*s;
      const surface=o.surfaceY??(rt.id==="temple"?.28:0);
      const border=box("runnerBorder",x,surface+.025,z,w,0.025,d,rt.id==="temple"?sanctuaryMaterial("gold"):M[o.border]??M.yellow);
      const inner=box("runner",x,surface+.047,z,Math.max(0.2,w-0.10),0.018,Math.max(0.2,d-0.10),rt.id==="temple"?sanctuaryMaterial("rug"):M[o.material]??M.clothRed);
      border.rotation.y=inner.rotation.y=o.rotation??0;
      if(glow.addExcludedMesh){glow.addExcludedMesh(border);glow.addExcludedMesh(inner);}
    }
    else if(o.asset==="banner"){
      const root=new BABYLON.TransformNode("banner",scene);root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=o.rotation??0;
      const w=(o.size?.[0]??1.15)*s,h=(o.size?.[1]??1.9)*s;
      const rod=BABYLON.MeshBuilder.CreateCylinder("bannerRod",{diameter:0.07*s,height:w*1.18,tessellation:12},scene);
      rod.rotation.z=Math.PI/2;rod.position.y=(o.y??2.35)*s;rod.material=M.woodDark;rod.parent=root;
      const cloth=BABYLON.MeshBuilder.CreateBox("bannerCloth",{width:w,height:h,depth:0.055*s},scene);
      cloth.position.set(0,(o.y??2.35)*s-h*0.52,0);cloth.material=M[o.material]??M.clothRed;cloth.parent=root;
      if(rt.id==="temple"){
        cloth.material=sanctuaryMaterial("rug");
        for(const side of [-1,1]){
          const stitch=box("sanctuaryBannerEmbroidery",0,0,0,.025,h*.90,.012,sanctuaryMaterial("gold"));stitch.parent=cloth;stitch.position.set(side*w*.4,0,.033);stitch.metadata={d8Animated:true};
        }
      }
      const tip=cloth.clone("bannerTip");tip.scaling.x=0.72;tip.scaling.y=0.20;tip.position.y-=h*0.56;tip.material=cloth.material;
      cloth.metadata=tip.metadata={d8Animated:true};
      rt.updaters.push((time:number)=>{const sway=Math.sin(time*1.2+x*.3+z*.2)*.024;cloth.rotation.z=sway;tip.rotation.z=sway;});
    }
    else if(o.asset==="floor_scatter"){
      const count=o.count??10,spreadX=(o.size?.[0]??3.0)*s,spreadZ=(o.size?.[1]??2.0)*s;
      for(let i=0;i<count;i++){
        const px=x+(seeded(i*17.1+x*3.7)-0.5)*spreadX;
        const pz=z+(seeded(i*29.7+z*4.3)-0.5)*spreadZ;
        const sx=(0.10+seeded(i*11.2)*0.22)*s,sz=(0.08+seeded(i*7.4)*0.18)*s;
        const q=box("floorScatter",px,0.045,pz,sx,0.06,sz,M[o.material]??M.stoneDark);
        q.rotation.y=seeded(i*5.9)*Math.PI;
      }
    }
    else if(o.asset==="rock_cluster"){
      const count=o.count??7,spread=(o.spread??1.5)*s;
      for(let i=0;i<count;i++){
        const a=seeded(i*13.3+x)*Math.PI*2,r=seeded(i*19.1+z)*spread;
        const d=(0.25+seeded(i*23.7)*0.55)*s;
        const q=sph("rock",x+Math.cos(a)*r,d*0.30,z+Math.sin(a)*r,d,M[o.material]??M.stoneDark);
        q.scaling.set(1,0.55+seeded(i*3.1)*0.25,0.75+seeded(i*5.2)*0.35);
      }
    }
    else if(o.asset==="plant_cluster"){
      const count=o.count??7,spread=(o.spread??1.1)*s;
      for(let i=0;i<count;i++){
        const a=seeded(i*7.3+x*2.1)*Math.PI*2,r=seeded(i*9.1+z*2.7)*spread;
        const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,h=(0.24+seeded(i*4.7)*0.38)*s;
        cyl("plantStem",px,h/2+0.04,pz,0.045*s,h,M.leafDark);
        const leaf=sph("plantLeaf",px,h+0.05,pz,(0.22+seeded(i*3.9)*0.20)*s,M[o.material]??M.leaf);
        leaf.scaling.set(1.2,0.55,0.8);
      }
    }
    else if(o.asset==="thorn_wall"){
      const len=(o.length??5.0)*s,count=o.count??11,rot=o.rotation??0;
      const hedgeCore=box("thornHedgeCore",x,0.22,z,len,0.42,0.36,M.leafDark);
      hedgeCore.rotation.y=rot;
      for(let i=0;i<count;i++){
        const t=count===1?0:i/(count-1)-0.5;
        const along=t*len;
        const px=x+Math.cos(rot)*along,pz=z-Math.sin(rot)*along;
        const h=(0.55+(i%4)*0.12)*s;
        const branch=box("thornBranch",px,h*0.55,pz,0.10*s,h,0.10*s,M.woodDark);
        branch.rotation.y=rot+(i%2?0.25:-0.20);branch.rotation.z=(i%2?0.42:-0.35);
        if(i%2===0){
          const foliage=sph("thornFoliage",px,0.34,pz,0.62*s,i%4===0?M.leaf:M.leafDark);
          foliage.scaling.set(1.08,0.72,0.90);
          const rose=sph("thornRose",px,h+0.06,pz,0.24*s,(i%4===0?M.rosePink:M.rose));
          rose.scaling.y=0.72;
          rt.markers.roses.push({mesh:rose,baseY:rose.position.y,seed:i+x+z});
        }
      }
      collider(x,z,Math.abs(Math.cos(rot))*len+0.45,Math.abs(Math.sin(rot))*len+0.45);
    }
    else if(o.asset==="market_goods"){
      const count=o.count??8,spreadX=(o.size?.[0]??2.6)*s,spreadZ=(o.size?.[1]??1.5)*s;
      for(let i=0;i<count;i++){
        const px=x+(seeded(i*13.7+x)-0.5)*spreadX,pz=z+(seeded(i*17.9+z)-0.5)*spreadZ;
        if(i%3===0){
          const q=0.42*s;box("goodsCrate",px,q/2,pz,q,q,q,M.wood);
        }else{
          sph("marketProduce",px,0.15,pz,(0.14+seeded(i*4.1)*0.11)*s,i%2?M.red:M.green);
        }
      }
    }
    else if(o.asset==="ice_floe"){
      const d=(o.diameter??3.0)*s,h=(o.height??0.10)*s;
      const under=BABYLON.MeshBuilder.CreateCylinder("iceFloeUnder",{diameter:d*1.05,height:h*1.3,tessellation:o.tessellation??7},scene);
      under.position.set(x,h*0.45,z);under.scaling.z=o.depthScale??0.72;under.rotation.y=o.rotation??0;under.material=M.ice;under.parent=rt.root;
      const top=BABYLON.MeshBuilder.CreateCylinder("iceFloeTop",{diameter:d,height:h,tessellation:o.tessellation??7},scene);
      top.position.set(x,h*1.1,z);top.scaling.z=o.depthScale??0.72;top.rotation.y=o.rotation??0;top.material=M.frost;top.parent=rt.root;
    }
    else if(o.asset==="patio_ring"){
      const d=(o.diameter??5.0)*s,th=(o.thickness??0.28)*s;
      const ring=BABYLON.MeshBuilder.CreateTorus("patioRing",{diameter:d,thickness:th,tessellation:48},scene);
      ring.position.set(x,0.075,z);ring.material=M[o.material]??M.stone2;ring.parent=rt.root;
      if(glow.addExcludedMesh)glow.addExcludedMesh(ring);
    }
    else if(o.asset==="well"){
      const d=(o.diameter??2.0)*s,h=(o.height??0.70)*s;
      const base=cyl("wellBase",x,h*0.36,z,d,h*0.72,M[o.material]??M.stoneDark);
      const lip=BABYLON.MeshBuilder.CreateTorus("wellLip",{diameter:d*0.92,thickness:0.20*s,tessellation:32},scene);
      lip.position.set(x,h*0.82,z);lip.material=M.stone2;lip.parent=rt.root;
      const water=cyl("wellWater",x,h*0.70,z,d*0.72,0.05,M.water);rt.markers.pools.push({x,z,mesh:water,baseY:water.position.y});
      collider(x,z,d,d);
    }
    else if(o.asset==="fence"){
      const len=(o.length??5.0)*s,rot=o.rotation??0,posts=o.posts??5,h=(o.height??0.85)*s;
      const root=new BABYLON.TransformNode("fence",scene);root.parent=rt.root;root.position.set(x,0,z);root.rotation.y=rot;
      for(let i=0;i<posts;i++){
        const t=posts===1?0:(i/(posts-1)-0.5)*len;
        const p=BABYLON.MeshBuilder.CreateBox("fencePost",{width:0.13*s,height:h,depth:0.13*s},scene);
        p.position.set(t,h/2,0);p.material=M[o.material]??M.woodDark;p.parent=root;
      }
      for(const yy of [h*0.38,h*0.70]){
        const r=BABYLON.MeshBuilder.CreateBox("fenceRail",{width:len,height:0.10*s,depth:0.10*s},scene);
        r.position.set(0,yy,0);r.material=M[o.material]??M.wood;r.parent=root;
      }
      if(o.blocking!==false){
        const aw=Math.abs(Math.cos(rot))*len+Math.abs(Math.sin(rot))*0.18;
        const ad=Math.abs(Math.sin(rot))*len+Math.abs(Math.cos(rot))*0.18;
        collider(x,z,aw,ad);
      }
    }
    else if(o.asset==="arch_ruin"){
      const w=(o.size?.[0]??3.4)*s,h=(o.height??2.5)*s;
      box("ruinPierL",x-w*0.42,h*0.43,z,0.46*s,h*0.86,0.58*s,M.stoneDark);
      box("ruinPierR",x+w*0.42,h*0.36,z,0.46*s,h*0.72,0.58*s,M.stoneDark);
      const top=box("ruinLintel",x-w*0.05,h*0.88,z,w*0.78,0.34*s,0.58*s,M.stone2);top.rotation.z=o.tilt??-0.05;
      collider(x-w*0.42,z,0.46*s,0.58*s);collider(x+w*0.42,z,0.46*s,0.58*s);
    }
    else if(o.asset==="ice_ridge"){
      const len=(o.length??4.0)*s,count=o.count??7,rot=o.rotation??0;
      for(let i=0;i<count;i++){
        const t=count===1?0:i/(count-1)-0.5;
        const seed=i*31.7+x*3.1+z*1.7,along=t*len+(seeded(seed+1)-0.5)*len/(count*2),side=(seeded(seed+2)-0.5)*0.58*s;
        const px=x+Math.cos(rot)*along+Math.sin(rot)*side,pz=z-Math.sin(rot)*along+Math.cos(rot)*side;
        const h=(0.90+seeded(seed+3)*1.55)*s,d=(0.46+seeded(seed+4)*0.52)*s;
        const q=BABYLON.MeshBuilder.CreateCylinder("iceRidge",{diameterTop:0,diameterBottom:d,height:h,tessellation:5},scene);
        q.position.set(px,h/2,pz);q.rotation.y=rot+(seeded(seed+5)-0.5)*0.8;q.rotation.x=(seeded(seed+6)-0.5)*0.12;q.material=i%4===0?M.magicBlue:M.frost;q.parent=rt.root;
        if(i%3===0){
          const bank=sph("iceBank",px,.18,pz,d*1.9,M.frost);bank.scaling.set(1.2,.38,.86);
        }
        if(i%2===0){
          const shardH=h*(0.32+seeded(seed+7)*0.22),shardD=d*0.62;
          const shard=BABYLON.MeshBuilder.CreateCylinder("iceRidge",{diameterTop:0,diameterBottom:shardD,height:shardH,tessellation:5},scene);
          shard.position.set(px+Math.cos(rot+0.9)*d*0.60,shardH/2,pz-Math.sin(rot+0.9)*d*0.60);shard.rotation.y=rot+(seeded(seed+8)-0.5)*1.2;shard.material=i%4===0?M.frost:M.magicBlue;shard.parent=rt.root;
        }
      }
    }
    else if(o.asset==="patio_round"){
      const d=(o.diameter??6.0)*s,h=(o.height??0.10)*s;
      const rim=BABYLON.MeshBuilder.CreateCylinder("patioRim",{diameter:d,height:h*1.15,tessellation:40},scene);
      rim.position.set(x,h*0.45,z);rim.material=M[o.border]??M.stoneDark;rim.parent=rt.root;
      const inner=BABYLON.MeshBuilder.CreateCylinder("patioInner",{diameter:d*0.92,height:h,tessellation:40},scene);
      inner.position.set(x,h*1.12,z);inner.material=M[o.material]??M.stone2;inner.parent=rt.root;
      if(glow.addExcludedMesh){glow.addExcludedMesh(rim);glow.addExcludedMesh(inner);}
    }
    else if(o.asset==="low_wall"){
      const h=(o.height??0.62)*s,w=(o.size?.[0]??4)*s,d=(o.size?.[1]??0.42)*s;
      const q=box("lowWall",x,h/2,z,w,h,d,M[o.material]??M.stoneDark);
      q.rotation.y=o.rotation??0;
      const aw=Math.abs(Math.cos(q.rotation.y))*w+Math.abs(Math.sin(q.rotation.y))*d;
      const ad=Math.abs(Math.sin(q.rotation.y))*w+Math.abs(Math.cos(q.rotation.y))*d;
      collider(x,z,aw,ad);
    }
    else if(o.asset==="water_bank"){
      const len=(o.length??12)*s,depth=(o.depth??0.9)*s,count=o.count??18,rot=o.rotation??0,gap=(o.gap??0)*s;
      const c=Math.cos(rot),sn=Math.sin(rot);
      for(let i=0;i<count;i++){
        const t=count===1?0:(i/(count-1)-0.5)*len;
        if(gap>0&&Math.abs(t)<gap*0.5)continue;
        const jitter=(seeded(i*9.7+x+z)-0.5)*depth*0.55;
        const px=x+c*t-sn*jitter,pz=z-sn*t+c*jitter;
        const ds=(0.18+seeded(i*13.1)*0.36)*s;
        const rock=sph("waterBankRock",px,0.10+ds*0.22,pz,ds,i%3?M.stoneDark:M.stone2);
        rock.scaling.set(1.15,0.55,0.85);
        if(i%3===0){
          const hh=(0.30+seeded(i*6.7)*0.45)*s;
          const reed=cyl("waterReed",px+(seeded(i*4.1)-0.5)*0.3,hh/2,pz+(seeded(i*5.3)-0.5)*0.3,0.035*s,hh,M.leafDark);
          reed.rotation.z=(seeded(i*3.9)-0.5)*0.22;
        }
      }
    }
    else if(o.asset==="temple_hedge"){
      const len=(o.length??5)*s,h=(o.height??0.9)*s,rot=o.rotation??0;
      const count=Math.max(4,Math.ceil(len/0.72));
      for(let i=0;i<count;i++){
        const tt=count===1?0:(i/(count-1)-0.5)*len;
        const px=x+Math.cos(rot)*tt,pz=z-Math.sin(rot)*tt;
        const q=sph("templeHedge",px,h*0.58,pz,0.95*s,i%3===0?M.leafDark:M.leaf);
        q.scaling.set(1.15,h/0.95,0.86);
      }
      if(o.blocking)collider(x,z,Math.abs(Math.cos(rot))*len+0.8,Math.abs(Math.sin(rot))*len+0.8);
    }
    else if(o.asset==="stone_lantern"){
      const h=(o.height??1.65)*s;
      box("stoneLanternFoot",x,0.12,z,0.72*s,0.24*s,0.72*s,M.stoneDark);
      cyl("stoneLanternStem",x,h*0.42,z,0.24*s,h*0.62,M.stone2);
      for(const side of [-1,1])for(const front of [-1,1])box("stoneLanternFrame",x+side*.28*s,h*.78,z+front*.28*s,.12*s,.52*s,.12*s,M.stoneLight);
      box("stoneLanternTray",x,h*.62,z,.72*s,.10*s,.72*s,M.stoneLight);
      const glowBox=box("stoneLanternGlow",x,h*0.79,z,0.42*s,0.30*s,0.42*s,M.lanternGlass,"VFX");
      const roof=box("stoneLanternRoof",x,h*1.02,z,0.94*s,0.14*s,0.94*s,M.stoneDark);roof.rotation.y=Math.PI/4;
      const light=track(new BABYLON.PointLight("stoneLanternLight",new BABYLON.Vector3(x,h*0.82,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.48,0.13);light.range=o.range??4.0;light.intensity=o.intensity??0.28;
      const seed=x*1.1+z*0.7;rt.updaters.push((tt:number)=>{const f=Math.sin(tt*5.8+seed)*0.035;light.intensity=(o.intensity??0.28)+f;glowBox.scaling.y=1+f*0.8;});
      collider(x,z,0.65*s,0.65*s);
    }
    else if(o.asset==="water_area"){
      let waterMat=M.water,shimmerMat=M.waterGlow;
      if(rt.id==="mirror"){
        waterMat=new BABYLON.StandardMaterial("mirrorFrozenWater",scene);
        waterMat.diffuseColor=new BABYLON.Color3(0.075,0.18,0.25);
        waterMat.emissiveColor=new BABYLON.Color3(0.003,0.012,0.020);
        waterMat.specularColor=new BABYLON.Color3(0.26,0.38,0.48);
        waterMat.alpha=0.94;waterMat.maxSimultaneousLights=6;
        waterMat.backFaceCulling=false;
        waterMat.diffuseTexture=PROCEDURAL_SURFACES.ice?.texture??null;
        waterMat.bumpTexture=PROCEDURAL_SURFACES.ice?.normal??null;
        shimmerMat=new BABYLON.StandardMaterial("mirrorFrozenSheen",scene);
        shimmerMat.diffuseColor=new BABYLON.Color3(0.28,0.52,0.64);
        shimmerMat.emissiveColor=new BABYLON.Color3(0.008,0.028,0.044);
        shimmerMat.alpha=0.18;shimmerMat.maxSimultaneousLights=6;
        shimmerMat.backFaceCulling=false;
        rt.disposables.push(waterMat,shimmerMat);
      }
      const createFrozenPool=(name:string,y:number,scale:number,material:any)=>{
        const segments=40,positions=[0,0,0],uvs=[0.5,0.5],indices:number[]=[];
        for(let i=0;i<segments;i++){
          const a=i/segments*Math.PI*2,variation=0.92+seeded(i*8.7+13)*0.16;
          const nx=Math.cos(a)*scale*variation,nz=Math.sin(a)*scale*variation;
          const outline=o.outline?.[i];
          positions.push(outline?outline[0]*scale:nx*o.size[0]*0.5,0,outline?outline[1]*scale:nz*o.size[1]*0.5);uvs.push(0.5+nx*0.5,0.5+nz*0.5);
        }
        for(let i=0;i<segments;i++)indices.push(0,(i+1)%segments+1,i+1);
        const normals:number[]=[];for(let i=0;i<positions.length/3;i++)normals.push(0,1,0);
        const mesh=new BABYLON.Mesh(name,scene);
        mesh.setVerticesData("position",positions);mesh.setVerticesData("normal",normals);mesh.setVerticesData("uv",uvs);mesh.setIndices(indices);
        mesh.position.set(x,y,z);mesh.material=material;mesh.parent=parentFor(name==="waterArea"?"BASE":"VFX");mesh.isPickable=false;return mesh;
      };
      const water=rt.id==="mirror"?createFrozenPool("waterArea",0.055,1.0,waterMat):box("waterArea",x,0.055,z,o.size[0],0.10,o.size[1],waterMat,"BASE");
      if(rt.id==='temple'){
        gentleWater('templeFlow',x,z,o.size[0]*.985,o.size[1]*.96,.135);
        const texture=track(new BABYLON.DynamicTexture('templeWaterFlow',{width:256,height:256},scene,false)),ctx:any=texture.getContext();
        ctx.fillStyle='#24627c';ctx.fillRect(0,0,256,256);
        for(let i=0;i<28;i++){ctx.strokeStyle=`rgba(175,226,224,${.06+(i%4)*.025})`;ctx.lineWidth=1;ctx.beginPath();for(let px=0;px<=256;px+=4){const py=i*10+Math.sin(px*.05+i)*3;px?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}texture.update(false);texture.wrapU=texture.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
        const paint=track(cloneSurfaceMaterial(waterMat,'templeMovingWater'));paint.diffuseTexture=texture;paint.specularColor=new BABYLON.Color3(.34,.48,.55);paint.specularPower=96;
        paint.bumpTexture=PROCEDURAL_SURFACES.ice?.normal??null;water.material=paint;
        rt.updaters.push((t:number)=>{texture.uOffset=t*.009;texture.vOffset=Math.sin(t*.18)*.025;});
      }
      water.receiveShadows=true;
      water.isPickable=false;
      const shimmer=rt.id==="mirror"?createFrozenPool("waterShimmer",0.112,0.92,shimmerMat):box("waterShimmer",x,0.112,z,o.size[0]*0.985,0.014,o.size[1]*0.92,shimmerMat,"VFX");
      shimmer.isPickable=false;
      if(glow.addExcludedMesh)glow.addExcludedMesh(shimmer);
      rt.markers.pools.push({x,z,mesh:water,baseY:water.position.y});
      const rippleCount=o.rippleCount??7;
      const ripples:any[]=[];
      for(let i=0;i<rippleCount;i++){
        const ring=BABYLON.MeshBuilder.CreateTorus("ambientWaterRipple",{diameter:0.55+(i%3)*0.18,thickness:0.025,tessellation:28},scene);
        ring.position.set(x+(seeded(i*7.31)-0.5)*o.size[0]*0.88,0.135,z+(seeded(i*11.17)-0.5)*o.size[1]*0.62);
        ring.material=shimmerMat;ring.parent=parentFor("VFX");ring.isPickable=false;
        if(glow.addExcludedMesh)glow.addExcludedMesh(ring);
        ripples.push({mesh:ring,seed:i*0.71});
      }
      const flow=o.flow??0.18,amp=o.shimmer??0.12;
      rt.updaters.push((time:number)=>{
        shimmer.position.y=0.112+Math.sin(time*1.35)*0.012;
        shimmer.visibility=0.70+Math.sin(time*0.85)*amp;
        for(const r of ripples){
          const phase=(time*flow+r.seed)%1;
          const k=0.75+phase*1.65;
          r.mesh.scaling.set(k,1,k);
          r.mesh.visibility=0.34*(1-phase);
        }
      });
    }
    else if(o.asset==="mirror"){box("mirrorBase",x,0.45,z,2.5,0.9,2.5,M.stoneDark);box("mirror",x,1.8,z,1.6,2.2,0.25,M.gold);collider(x,z,2.5,2.5);}
  }

  function env(c:any){
    const e=c.VTT_AMBIENCE.environment;
    scene.ambientColor=new BABYLON.Color3(0,0,0);
    scene.clearColor=new BABYLON.Color4(e.clearColor[0],e.clearColor[1],e.clearColor[2],1);
    if(e.fog){scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=e.fogDensity;scene.fogColor=new BABYLON.Color3(e.clearColor[0],e.clearColor[1],e.clearColor[2]);}
    else scene.fogMode=BABYLON.Scene.FOGMODE_NONE;
    glow.intensity=e.glowIntensity??0.72;
    // V18: sharpening is centralized in DefaultRenderingPipeline to avoid stacked post-processes.
    if(e.sharpen) pipeline.sharpen.edgeAmount=e.sharpen;
    const ip=scene.imageProcessingConfiguration;
    ip.exposure=e.exposure??1.0;
    ip.contrast=e.contrast??1.0;
    ip.toneMappingEnabled=e.toneMapping!==false;
    ip.vignetteEnabled=!!e.vignette;
    if(e.vignette){
      ip.vignetteWeight=e.vignetteWeight??0.85;
      ip.vignetteStretch=e.vignetteStretch??0.25;
      ip.vignetteColor=new BABYLON.Color4(0.02,0.012,0.008,1);
    }
  }
  // V19 LIGHTING PROFILES — authored art direction per scene, VTT_AMBIENCE only.
  const LIGHTING_V19:any={
    temple:{key:[1.00,0.62,0.32],keyIntensity:0.72,keyDirection:[0.88,-0.50,0.18],keyPosition:[-22,13,4],ambient:0.12,shadow:0.70,shadowBias:0.00040,normalBias:0.015},
    cafe:{key:[1.00,0.72,0.45],keyIntensity:0.24,keyDirection:[-0.42,-1,0.28],keyPosition:[8,9,-5],ambient:0.32,shadow:0.48,shadowBias:0.00055,normalBias:0.020},
    dinner:{key:[1.00,0.63,0.34],keyIntensity:0.28,keyDirection:[0.48,-1,-0.30],keyPosition:[-7,9,7],ambient:0.16,shadow:0.64,shadowBias:0.00050,normalBias:0.018},
    garden:{key:[0.62,0.72,0.90],keyIntensity:0.52,keyDirection:[0.52,-1,0.36],keyPosition:[-10,12,-8],ambient:0.20,shadow:0.66,shadowBias:0.00040,normalBias:0.016},
    market:{key:[0.50,0.60,0.82],keyIntensity:0.46,keyDirection:[-0.58,-1,0.26],keyPosition:[10,12,-6],ambient:0.18,shadow:0.70,shadowBias:0.00042,normalBias:0.017},
    mirror:{key:[0.42,0.70,1.00],keyIntensity:0.50,keyDirection:[0.38,-1,0.52],keyPosition:[-8,11,-10],ambient:0.17,shadow:0.74,shadowBias:0.00038,normalBias:0.015}
  };

  function lightingV19(c:any){
    const p=LIGHTING_V19[rt.id]??LIGHTING_V19.temple;
    const l=c.VTT_AMBIENCE.lighting??{};
    // Preserve map-authored hue while giving every scene a deliberate ambient baseline.
    hemi.intensity=Math.max(l.ambientIntensity??0,p.ambient);
    const hc=l.ambientColor??p.key;
    hemi.diffuse=new BABYLON.Color3(hc[0],hc[1],hc[2]);
    hemi.groundColor=new BABYLON.Color3(hc[0]*0.12,hc[1]*0.10,hc[2]*0.09);
    return p;
  }

  function lights(c:any){
    const l=c.VTT_AMBIENCE.lighting??{};
    hemi.intensity=l.ambientIntensity??0.12;
    const hc=l.ambientColor??[1,1,1];
    hemi.diffuse=new BABYLON.Color3(hc[0],hc[1],hc[2]);
    hemi.groundColor=new BABYLON.Color3((hc[0]??1)*0.18,(hc[1]??1)*0.18,(hc[2]??1)*0.18);

    const gf=l.globalFill??{};
    const gc=gf.color??hc;
    const gi=gf.intensity??0;
    scene.ambientColor=new BABYLON.Color3(gc[0]*gi,gc[1]*gi,gc[2]*gi);

    if(gi>0){
      const fill=track(new BABYLON.HemisphericLight("readabilityFill",new BABYLON.Vector3(0,1,0),scene));
      fill.intensity=gf.hemiIntensity??0;
      fill.diffuse=new BABYLON.Color3(gc[0],gc[1],gc[2]);
      fill.groundColor=new BABYLON.Color3(gc[0]*0.32,gc[1]*0.32,gc[2]*0.32);
      if(gf.directionalIntensity){
        const dir=gf.direction??[-0.35,-1,0.25];
        const dl=track(new BABYLON.DirectionalLight("readabilityDirectional",new BABYLON.Vector3(dir[0],dir[1],dir[2]),scene));
        dl.intensity=gf.directionalIntensity;
        dl.diffuse=new BABYLON.Color3(gc[0],gc[1],gc[2]);
        dl.specular=new BABYLON.Color3(0,0,0);
      }
      (gf.points??[]).forEach((p:any,i:number)=>{
        const pos=p.position??[0,5,0];
        const pc=p.color??gc;
        const pl=track(new BABYLON.PointLight("readabilityPoint_"+i,new BABYLON.Vector3(pos[0],pos[1],pos[2]),scene));
        pl.parent=rt.root;
        pl.diffuse=new BABYLON.Color3(pc[0],pc[1],pc[2]);
        pl.specular=new BABYLON.Color3(0,0,0);
        pl.intensity=p.intensity??1.0;
        pl.range=p.range??14;
      });
    }

    (l.lights??[]).forEach((d:any)=>{
      const q=track(new BABYLON.PointLight("mapLight",new BABYLON.Vector3(d.position[0],d.position[1],d.position[2]),scene));
      q.parent=rt.root;
      q.diffuse=new BABYLON.Color3(d.color[0],d.color[1],d.color[2]);
      q.intensity=d.intensity??0.4;
      q.range=d.range??6;
    });
  }

  function fire(marker:any,v:any){
    const a=sph("fireOuter",marker.x,0.45,marker.z,0.58,M.fireOuter,"VFX");a.scaling.y=1.75;
    const b=sph("fireInner",marker.x,0.38,marker.z,0.32,M.fireInner,"VFX");b.scaling.y=1.7;
    const l=track(new BABYLON.PointLight("fireLight",new BABYLON.Vector3(marker.x,1.2,marker.z),scene));
    l.parent=rt.root;l.diffuse=new BABYLON.Color3(1,0.24,0.02);l.range=13.0;l.intensity=5.20;
    const ay=a.position.y,by=b.position.y;
    const smoke:any[]=[];
    if(v.smoke){
      for(let i=0;i<6;i++){
        const mesh=sph("smoke",marker.x,0.8+i*0.2,marker.z,0.3+i*0.05,M.smoke,"VFX");
        smoke.push({mesh,off:i/6,i});
      }
    }
    rt.updaters.push((t:number)=>{
      const x=Math.sin(t*9.4),y=Math.sin(t*14.2);
      a.position.y=ay+x*0.04;b.position.y=by+y*0.025;a.scaling.x=1+x*0.09;l.intensity=4.90+x*0.55+y*0.24;
      for(const q of smoke){
        const c=(t*0.18+q.off)%1,s=q.mesh;
        s.position.y=0.75+c*3;s.position.x=marker.x+Math.sin(t*0.6+q.i)*0.18;
        const k=0.7+c*1.4;s.scaling.set(k,k*1.2,k);
      }
    });
  }

  function dust(){
    const items:any[]=[];
    for(let i=0;i<16;i++){
      const x=-9+((i*37)%18),z=-5+((i*23)%10),mesh=sph("dust",x,0.7+(i%5)*0.42,z,0.035,M.dust,"VFX");
      items.push({mesh,y:mesh.position.y,i});
    }
    rt.updaters.push((t:number)=>{for(const q of items)q.mesh.position.y=q.y+Math.sin(t*0.7+q.i)*0.14;});
  }

  function ripple(x:number,z:number,o:number){
    const p:any[]=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;p.push(new BABYLON.Vector3(Math.cos(a)*0.45,0,Math.sin(a)*0.45));}
    const r=BABYLON.MeshBuilder.CreateLines("ripple",{points:p},scene);r.parent=parentFor("VFX");r.position.set(x,0.13,z);r.color=new BABYLON.Color3(0.2,0.75,0.8);
    rt.updaters.push((t:number)=>{const c=(t*0.2+o)%1,k=0.5+c*4;r.scaling.set(k,1,k);r.alpha=0.3*(1-c);});
  }

  function embers(marker:any){
    const items:any[]=[];
    for(let i=0;i<8;i++){
      const mesh=sph("ember",marker.x,0.35,marker.z,0.035+(i%3)*0.01,M.fireOuter,"VFX");
      items.push({mesh,off:i/8,i});
    }
    rt.updaters.push((t:number)=>{
      for(const q of items){
        const c=(t*0.55+q.off)%1,e=q.mesh;
        e.position.y=0.35+c*1.6;e.position.x=marker.x+Math.sin(t*2+q.i)*0.18*c;e.position.z=marker.z+Math.cos(t*1.7+q.i)*0.13*c;
        const k=1-c;e.scaling.set(k,k,k);
      }
    });
  }

  function snowfall(c:any,v:any){
    const size=c.MAP.size,count=v.snowCount??34,items:any[]=[];
    for(let i=0;i<count;i++){
      const x=-size[0]/2+((i*47)%100)/100*size[0],z=-size[1]/2+((i*71)%100)/100*size[1];
      const mesh=sph("snowFlake",x,0.8+((i*31)%100)/100*4.5,z,0.072+(i%4)*0.025,M.magicWhite,"VFX");
      items.push({mesh,x,z,startY:mesh.position.y,seed:i*0.73});
    }
    rt.updaters.push((t:number)=>{
      for(const q of items){
        let y=q.startY-((t*(v.snowSpeed??0.45)+q.seed)%5.2);if(y<0.18)y+=5.2;
        q.mesh.position.y=y;q.mesh.position.x=q.x+Math.sin(t*0.65+q.seed)*0.28;q.mesh.position.z=q.z+Math.cos(t*0.4+q.seed)*0.12;
      }
    });
  }

  function fireflies(c:any,v:any){
    const count=v.fireflyCount??18,size=c.MAP.size,items:any[]=[];
    for(let i=0;i<count;i++){
      const x=-size[0]*0.38+((i*43)%100)/100*size[0]*0.76,z=-size[1]*0.36+((i*67)%100)/100*size[1]*0.72;
      const mesh=sph("firefly",x,0.55+(i%5)*0.35,z,0.075,M.lanternGlass,"VFX");
      items.push({mesh,x,z,baseY:mesh.position.y,seed:i*1.17});
    }
    rt.updaters.push((t:number)=>{
      for(const q of items){
        q.mesh.position.y=q.baseY+Math.sin(t*1.1+q.seed)*0.22;q.mesh.position.x=q.x+Math.sin(t*0.55+q.seed)*0.35;q.mesh.position.z=q.z+Math.cos(t*0.72+q.seed)*0.28;
        const k=0.65+Math.sin(t*3.2+q.seed)*0.25;q.mesh.scaling.set(k,k,k);
      }
    });
  }

  function roseSway(){
    const roses=[...(rt.markers.roses??[])];
    if(!roses.length)return;
    rt.updaters.push((t:number)=>{
      for(const r of roses){r.mesh.position.y=r.baseY+Math.sin(t*1.4+r.seed)*0.018;r.mesh.rotation.z=Math.sin(t*1.1+r.seed)*(.02+(rt.windIntensity??.2)*.10);}
    });
  }

  function magicMotes(v:any){
    const particles:any[]=[];
    const animatedLights:any[]=[];
    for(const m of rt.markers.magic){
      for(let i=0;i<(v.magicCount??12);i++){
        const mesh=sph("magicMote",m.x,0.55,m.z,0.060+(i%3)*0.018,i%2?M.magicBlue:M.magicWhite,"VFX");
        particles.push({mesh,m,i,off:i/12,seed:i*0.9+m.seed});
      }
      if(m.light)animatedLights.push(m);
    }
    if(!particles.length&&!animatedLights.length)return;
    rt.updaters.push((t:number)=>{
      for(const q of particles){
        const a=t*0.65+q.seed,r=0.55+((q.i%4)*0.16),mesh=q.mesh,m=q.m;
        mesh.position.x=m.x+Math.cos(a)*r;mesh.position.z=m.z+Math.sin(a)*r;mesh.position.y=0.45+((t*0.22+q.off)%1)*2.7;
        const k=0.55+Math.sin(t*3+q.seed)*0.25;mesh.scaling.set(k,k,k);
      }
      for(const m of animatedLights)m.light.intensity=0.70+Math.sin(t*2+m.seed)*0.12;
    });
  }
  function gardenMotes(c:any,v:any){
    if(rt.id!=="temple")return;
    const count=v.gardenMoteCount??16,items:any[]=[];
    for(let i=0;i<count;i++){
      const x=-23+seeded(i*5.3)*46,z=8+seeded(i*8.7)*22;
      const mesh=sph("gardenMote",x,0.45+seeded(i*11.2)*2.6,z,0.028+(i%3)*0.009,M.dust,"VFX");
      mesh.visibility=0.22+seeded(i*3.1)*0.28;
      items.push({mesh,x,z,y:mesh.position.y,seed:i*0.91});
    }
    rt.updaters.push((tt:number)=>{
      for(const q of items){
        q.mesh.position.x=q.x+Math.sin(tt*0.25+q.seed)*0.24;
        q.mesh.position.z=q.z+Math.cos(tt*0.20+q.seed)*0.18;
        q.mesh.position.y=q.y+Math.sin(tt*0.42+q.seed)*0.12;
      }
    });
  }

  function vfx(c:any){
    const v=c.VTT_AMBIENCE.vfx??{};
    if(v.fireplace)rt.markers.fireplaces.forEach((m:any)=>{fire(m,v);if(v.embers)embers(m);});
    if(v.dust)dust();
    if(v.waterRipples)rt.markers.pools.forEach((m:any)=>{ripple(m.x,m.z,0);ripple(m.x,m.z,0.33);ripple(m.x,m.z,0.66);});
    if(v.waterMotion)rt.markers.pools.forEach((m:any)=>{if(!m.mesh)return;rt.updaters.push((t:number)=>{m.mesh.position.y=m.baseY+Math.sin(t*1.7)*0.016;m.mesh.scaling.z=1+Math.sin(t*1.2)*0.012;});});
    if(v.snowfall)snowfall(c,v);
    if(v.fireflies)fireflies(c,v);
    if(v.gardenMotes)gardenMotes(c,v);
    if(v.roseSway)roseSway();
    if(v.magicMotes)magicMotes(v);
  }

  function shadows(c:any){
    const sh=c.VTT_AMBIENCE.lighting?.shadows;
    if(!sh?.enabled)return;
    const lighting=c.VTT_AMBIENCE.lighting??{};
    const p19=LIGHTING_V19[rt.id]??LIGHTING_V19.temple;
    const natural=lighting.mode==="exterior"?(lighting.natural??{}):{};
    const pos=natural.position??sh.position??p19.keyPosition;
    const dir=natural.direction??sh.direction??p19.keyDirection;
    const color=natural.color??sh.color??p19.key;
    const light=track(new BABYLON.DirectionalLight("v19_key_"+rt.id,new BABYLON.Vector3(dir[0],dir[1],dir[2]),scene));
    // Keep the shadow-casting key in the six-light material budget, even when
    // a scene has many decorative candles, lanterns and crystal lights.
    light.renderPriority=100;
    light.position=new BABYLON.Vector3(pos[0],pos[1],pos[2]);
    light.intensity=lighting.mode==="exterior"?(natural.intensity??p19.keyIntensity):(sh.intensity??p19.keyIntensity);
    light.diffuse=new BABYLON.Color3(color[0],color[1],color[2]);
    light.specular=new BABYLON.Color3(color[0]*0.22,color[1]*0.22,color[2]*0.22);

    const mapSize=integrated?512:sh.mapSize??(lighting.mode==="exterior"?2048:1024);
    const gen=track(new BABYLON.ShadowGenerator(mapSize,light));
    gen.useBlurExponentialShadowMap=true;
    gen.blurKernel=sh.blurKernel??(lighting.mode==="exterior"?20:14);
    gen.bias=sh.bias??p19.shadowBias;
    gen.normalBias=sh.normalBias??p19.normalBias;
    gen.darkness=sh.darkness??(1-p19.shadow);
    gen.forceBackFacesOnly=false;
    gen.getShadowMap().refreshRate=2;
    if(rt.id==="temple"){
      // Tighten depth to the actual diorama. The camera's far plane is much
      // too broad for exponential shadows and was erasing column silhouettes.
      light.autoCalcShadowZBounds=true;light.shadowMinZ=.1;light.shadowMaxZ=95;
      gen.usePercentageCloserFiltering=true;
      gen.filteringQuality=integrated?BABYLON.ShadowGenerator.QUALITY_LOW:BABYLON.ShadowGenerator.QUALITY_MEDIUM;
      gen.bias=.00035;gen.normalBias=.025;
      gen.getShadowMap().refreshRate=0;
    }
    else if(["cafe","garden","market","mirror"].includes(rt.id)){
      light.autoCalcShadowZBounds=true;light.shadowMinZ=.1;light.shadowMaxZ=65;
      gen.usePercentageCloserFiltering=true;gen.filteringQuality=integrated?BABYLON.ShadowGenerator.QUALITY_LOW:BABYLON.ShadowGenerator.QUALITY_MEDIUM;
      gen.bias=.0004;gen.normalBias=.025;
    }

    const skip=(n:string)=>{
      const q=(n??"").toLowerCase();
      return q.includes("floor")||q.includes("path")||q.includes("runner")||q.includes("grid")||q.includes("overlay")||q.includes("shadow")||q.includes("lightpool")||q.includes("water")||q.includes("ripple")||q.includes("smoke")||q.includes("dust")||q.includes("snowflake")||q.includes("firefly")||q.includes("magicmote")||q.includes("ember")||q.includes("flame")||q.includes("torchouter")||q.includes("goldenwindowpatch")||q.includes("floorscatter")||q.includes("banquetfork")||q.includes("banquetknife")||q.includes("banquetplate")||q.includes("tablerose")||q.includes("templegardenrose")||q.includes("bottle")||q.includes("plate")||q.includes("dish")||q.includes("cup")||q.includes("produce")||q.includes("plant")||q.includes("grass")||q.includes("leaf")||q.includes("stem")||q.includes("rosehead");
    };
    const eligible:any[]=[];
    rt.root.getChildMeshes().forEach((m:any)=>{
      m.receiveShadows=true;
      if(skip(m.name)||m.parent===rt.layers?.VFX||m.isVisible===false||m.getTotalVertices?.()<12)return;
      m.computeWorldMatrix?.(true);
      const b=m.getBoundingInfo?.()?.boundingBox;
      if(!b)return;
      const sx=b.extendSizeWorld.x*2,sy=b.extendSizeWorld.y*2,sz=b.extendSizeWorld.z*2;
      const broadFootprint=sx*sz>=0.72&&sy>=0.10;
      const tallProp=sy>=0.62&&Math.max(sx,sz)>=0.34;
      if(!broadFootprint&&!tallProp)return;
      const score=sx*sy*sz;
      eligible.push({mesh:m,score});
    });
    // Shadow maps are the expensive part of this renderer on mobile GPUs.
    // Large architecture/trees/props provide most of the depth cues, so cap
    // casters deterministically instead of sending every plate, leaf and spark.
    eligible.sort((a:any,b:any)=>b.score-a.score);
    eligible.slice(0,112).forEach((q:any)=>gen.addShadowCaster(q.mesh));
    rt.shadowCasterCount=Math.min(112,eligible.length);
    rt.dayLightBases?.set(light,{intensity:light.intensity,color:light.diffuse.clone()});
  }

  const player=BABYLON.MeshBuilder.CreateCylinder("player",{diameter:0.62,height:0.84,tessellation:24},scene);player.material=M.player;player.isVisible=!integrated;
  const arrow=BABYLON.MeshBuilder.CreateCylinder("direction",{diameterTop:0,diameterBottom:0.2,height:0.42,tessellation:3},scene);arrow.parent=player;arrow.position.set(0,0,-0.48);arrow.rotation.z=Math.PI/2;arrow.material=M.gold;

  const ringPts:any[]=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;ringPts.push(new BABYLON.Vector3(Math.cos(a)*0.65,0,Math.sin(a)*0.65));}
  const ring=BABYLON.MeshBuilder.CreateLines("interactionRing",{points:ringPts},scene);ring.color=new BABYLON.Color3(1,0.65,0.12);ring.isVisible=false;

  const order=["temple","cafe","dinner","garden","market","mirror"];
  let title:any={text:"D8 NIGHT · "+D8_VERSION},buttons:any={},terrainText:any={text:""},ip:any={isVisible:false},it:any={text:""},msg:any={text:""};
  if(!integrated){
    if(!BABYLON.GUI)throw new Error("Babylon GUI is required by the standalone Playground wrapper");
    const ui=BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI"),panel=new BABYLON.GUI.StackPanel();
    panel.width="190px";panel.horizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;panel.paddingLeft="15px";panel.paddingTop="15px";ui.addControl(panel);
    title=new BABYLON.GUI.TextBlock();title.text="D8 NIGHT · "+D8_VERSION;title.height="42px";title.fontSize=20;title.color="#efd5a5";panel.addControl(title);
    const labels:any={temple:"1 · TEMPLO",cafe:"2 · TABERNA",dinner:"3 · DINNER",garden:"4 · GARDEN",market:"5 · MARKET",mirror:"6 · MIRROR"};
    order.forEach(id=>{const b=BABYLON.GUI.Button.CreateSimpleButton("btn_"+id,labels[id]);b.width="175px";b.height="37px";b.color="#dfcfb2";b.background="#25252a";b.cornerRadius=5;b.paddingBottom="4px";b.onPointerClickObservable.add(()=>loadMap(id));buttons[id]=b;panel.addControl(b);});
    const help=new BABYLON.GUI.TextBlock();help.text="\nWASD · mover\nE · interactuar\nG · grid/zonas\nC · cámara";help.height="100px";help.color="#888";help.fontSize=11;help.textHorizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.addControl(help);
    terrainText=new BABYLON.GUI.TextBlock();terrainText.text="";terrainText.height="30px";terrainText.color="#b9aa8e";terrainText.fontSize=11;terrainText.textHorizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.addControl(terrainText);
    ip=new BABYLON.GUI.Rectangle();ip.width="330px";ip.height="48px";ip.cornerRadius=8;ip.color="#c9aa70";ip.background="#101116E8";ip.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;ip.top="-25px";ip.isVisible=false;ui.addControl(ip);
    it=new BABYLON.GUI.TextBlock();it.color="#fff";it.fontSize=14;ip.addControl(it);
    msg=new BABYLON.GUI.TextBlock();msg.width="650px";msg.height="55px";msg.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;msg.top="15px";msg.color="#efdfc3";msg.fontSize=13;ui.addControl(msg);
  }
  let timer:any=null;const show=(t:string)=>{if(integrated)return;msg.text=t;if(timer)clearTimeout(timer);timer=setTimeout(()=>msg.text="",3000);};

  function buildTavernV34(c:any){
    // V34 Taberna: interior 2.5D + exterior horse yard. No legacy composition overlay,
    // no sharpen post-process. Base materials have a controlled emissive floor so
    // geometry stays readable while still reacting to real local lights.
    scene.fogMode=BABYLON.Scene.FOGMODE_NONE;
    scene.clearColor=new BABYLON.Color4(0.038,0.023,0.014,1);
    scene.ambientColor=new BABYLON.Color3(0.11,0.075,0.045);
    glow.intensity=0.22;
    const ip=scene.imageProcessingConfiguration;
    ip.exposure=1.06;ip.contrast=1.08;ip.toneMappingEnabled=false;ip.vignetteEnabled=false;

    // Keep the room readable, but leave enough contrast for the fireplace and torches to shape it.
    hemi.intensity=0.42;
    hemi.diffuse=new BABYLON.Color3(1.00,0.80,0.58);
    hemi.groundColor=new BABYLON.Color3(0.075,0.045,0.026);

    const mats:any={};
    const cmat=(name:string,color:number[],emissive=0.16,spec=0.025)=>{
      const m=new BABYLON.StandardMaterial("cafe12_"+name,scene);
      m.diffuseColor=new BABYLON.Color3(color[0],color[1],color[2]);
      m.ambientColor=new BABYLON.Color3(1,1,1);
      m.emissiveColor=new BABYLON.Color3(color[0]*emissive,color[1]*emissive,color[2]*emissive);
      m.specularColor=new BABYLON.Color3(spec,spec,spec);
      m.maxSimultaneousLights=6;
      rt.disposables.push(m);mats[name]=m;return m;
    };

    const stone=cmat("stone",[0.52,0.39,0.28],0.20);
    const stoneLight=cmat("stoneLight",[0.66,0.52,0.38],0.18);
    const stoneDark=cmat("stoneDark",[0.30,0.22,0.16],0.20);
    const wood=cmat("wood",[0.39,0.25,0.14],0.10);
    const woodLight=cmat("woodLight",[0.52,0.36,0.21],0.10);
    const woodDark=cmat("woodDark",[0.23,0.14,0.09],0.10);
    const iron=cmat("iron",[0.22,0.21,0.19],0.14,0.10);
    const ceramic=cmat("ceramic",[0.78,0.70,0.56],0.14,0.08);
    const green=cmat("green",[0.18,0.34,0.10],0.16);
    const red=cmat("red",[0.46,0.07,0.045],0.20);
    const wax=cmat("wax",[0.90,0.78,0.52],0.18);
    const bottleG=cmat("bottleG",[0.12,0.33,0.14],0.20,0.08);
    const bottleA=cmat("bottleA",[0.58,0.32,0.08],0.20,0.08);
    // Tavern materials are map-local, so explicitly reuse the same procedural
    // wood/stone surfaces as the shared palette instead of leaving them flat.
    const applySurface=(material:any,kind:string,bumpLevel:number)=>{
      const surface=PROCEDURAL_SURFACES[kind];if(!surface)return;
      material.diffuseTexture=surface.texture;
      if(surface.normal){material.bumpTexture=surface.normal;material.bumpTexture.level=bumpLevel;}
    };
    applySurface(stone,"stone",0.075);applySurface(stoneLight,"stone",0.075);applySurface(stoneDark,"stone",0.075);
    applySurface(wood,"wood",0.065);applySurface(woodLight,"wood",0.065);applySurface(woodDark,"wood",0.065);
    const shadowMat=new BABYLON.StandardMaterial("cafe12_contactShadow",scene);
    shadowMat.diffuseColor=new BABYLON.Color3(0.015,0.010,0.008);
    shadowMat.emissiveColor=new BABYLON.Color3(0.015,0.010,0.008);
    shadowMat.alpha=0.18;shadowMat.disableLighting=true;shadowMat.backFaceCulling=false;
    rt.disposables.push(shadowMat);


    // V34 TABERNA FLOOR — procedural warm stone, no geometric/debug line system.
    const floorTex=new BABYLON.DynamicTexture("tavernFloorV34",{width:1024,height:1024},scene,false);
    const fctx:any=floorTex.getContext();
    fctx.fillStyle="#624936";fctx.fillRect(0,0,1024,1024);
    const cw=91,ch=73;
    for(let r=0;r<15;r++){
      const off=(r%2)*cw*0.48;
      for(let xx=-cw;xx<1120;xx+=cw){
        const seed=r*137+Math.floor(xx);
        const jx=(seeded(seed)-0.5)*3,jy=(seeded(seed+1)-0.5)*3;
        const tone=Math.floor(seeded(seed+2)*22);
        const rr=104+tone,gg=88+tone,bb=69+tone;
        fctx.fillStyle="rgb("+rr+","+gg+","+bb+")";
        fctx.fillRect(xx+off+3+jx,r*ch+3+jy,cw-6,ch-6);
        fctx.strokeStyle="rgba(31,27,23,0.40)";fctx.lineWidth=1.5;
        fctx.strokeRect(xx+off+3+jx,r*ch+3+jy,cw-6,ch-6);
        fctx.strokeStyle="rgba(255,222,175,0.19)";fctx.lineWidth=2;
        fctx.beginPath();fctx.moveTo(xx+off+15+jx,r*ch+14+jy);fctx.lineTo(xx+off+cw*0.78+jx,r*ch+13+jy);fctx.stroke();
        for(let k=0;k<3;k++){
          const gx=xx+off+15+seeded(seed*5+k)*Math.max(1,cw-32),gy=r*ch+16+seeded(seed*7+k)*Math.max(1,ch-30);
          fctx.fillStyle=k===0?"rgba(229,189,143,0.12)":"rgba(28,17,12,0.09)";
          fctx.fillRect(gx,gy,6+seeded(seed*9+k)*24,1+seeded(seed*13+k)*3);
        }
      }
    }
    for(let i=0;i<165;i++){
      const x=seeded(i*4.1)*1024,y=seeded(i*7.9)*1024;
      const rad=5+seeded(i*5.7)*28;
      fctx.fillStyle="rgba(28,17,12,"+(0.025+seeded(i*2.9)*0.055)+")";
      fctx.beginPath();fctx.arc(x,y,rad,0,Math.PI*2);fctx.fill();
    }
    floorTex.update();
    floorTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;floorTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
    floorTex.uScale=1.55;floorTex.vScale=1.25;

    const floorNormal=reliefTexture(floorTex,"tavernFloorNormalV37",0.82,512);
    const floorMat=new BABYLON.StandardMaterial("tavernFloorMatV34",scene);
    floorMat.diffuseTexture=floorTex;
    floorMat.diffuseColor=new BABYLON.Color3(0.98,0.86,0.73);
    floorMat.ambientColor=new BABYLON.Color3(0.82,0.70,0.58);
    floorMat.emissiveTexture=floorTex;
    floorMat.emissiveColor=new BABYLON.Color3(0.16,0.115,0.082);
    floorMat.specularColor=new BABYLON.Color3(0.018,0.014,0.012);
    floorMat.maxSimultaneousLights=6;
    if(floorNormal){floorNormal.uScale=floorTex.uScale;floorNormal.vScale=floorTex.vScale;floorMat.bumpTexture=floorNormal;floorMat.bumpTexture.level=0.24;}
    rt.disposables.push(floorTex,floorMat);
    if(floorNormal)rt.disposables.push(floorNormal);

    const ground=BABYLON.MeshBuilder.CreateBox("cafe33_floor",{
      width:24,
      height:0.10,
      depth:16
    },scene);
    ground.position.y=-0.05;
    ground.material=floorMat;
    ground.parent=parentFor("BASE");
    ground.receiveShadows=true;
    ground.isPickable=false;
    ground.alwaysSelectAsActiveMesh=true;
    if(glow.addExcludedMesh)glow.addExcludedMesh(ground);

    // V34: explicit interior floor perimeter / threshold keeps the tavern readable against the exterior yard.
    const cafeWallTex=new BABYLON.DynamicTexture("tavernWallV34",{width:512,height:512},scene,false);
    const cwctx:any=cafeWallTex.getContext();cwctx.fillStyle="#817468";cwctx.fillRect(0,0,512,512);
    for(let row=0;row<8;row++)for(let col=-1;col<6;col++){
      const bx=col*112+(row%2)*56,by=row*64,tone=Math.floor(seeded(row*31+col)*18);
      cwctx.fillStyle=`rgb(${136+tone},${124+tone},${108+tone})`;
      cwctx.fillRect(bx+2,by+2,108,60);
      cwctx.strokeStyle="rgba(45,40,34,.26)";cwctx.lineWidth=1;cwctx.strokeRect(bx+2,by+2,108,60);
    }
    for(let i=0;i<180;i++){
      const x=seeded(i*3.9)*512,y=seeded(i*7.3)*512;
      const a=0.018+seeded(i*2.2)*0.05;
      cwctx.fillStyle=seeded(i*5.1)>0.5?"rgba(210,143,91,"+a+")":"rgba(52,29,19,"+a+")";
      cwctx.fillRect(x,y,3+seeded(i*4.7)*18,2+seeded(i*9.1)*9);
    }
    cafeWallTex.update();cafeWallTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;cafeWallTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
    cafeWallTex.uScale=1.8;cafeWallTex.vScale=1.2;
    const cafeWallNormal=reliefTexture(cafeWallTex,"tavernWallNormalV37",0.65,256);
    stoneDark.diffuseTexture=cafeWallTex;stoneDark.emissiveTexture=cafeWallTex;stoneDark.emissiveColor=new BABYLON.Color3(0.070,0.046,0.030);
    stone.diffuseTexture=cafeWallTex;stone.emissiveTexture=cafeWallTex;stone.emissiveColor=new BABYLON.Color3(0.060,0.040,0.028);
    if(cafeWallNormal){stoneDark.bumpTexture=cafeWallNormal;stone.bumpTexture=cafeWallNormal;stoneDark.bumpTexture.level=stone.bumpTexture.level=0.16;rt.disposables.push(cafeWallNormal);}
    rt.disposables.push(cafeWallTex);

    const b=(n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:any)=>{
      const q=box("cafe12_"+n,x,y,z,w,h,d,m);if(glow.addExcludedMesh)glow.addExcludedMesh(q);return q;
    };
    const cy=(n:string,x:number,y:number,z:number,d:number,h:number,m:any)=>{
      const q=cyl("cafe12_"+n,x,y,z,d,h,m);if(glow.addExcludedMesh)glow.addExcludedMesh(q);return q;
    };

    // V34 tavern floor frame and exterior arrival yard.
    b("floorEdgeBack",0,0.07,-7.86,24.2,0.14,0.22,woodDark);
    b("floorEdgeLeft",-11.86,0.07,0,0.22,0.14,15.8,woodDark);
    b("floorEdgeRight",11.86,0.07,0,0.22,0.14,15.8,woodDark);
    b("floorEdgeFrontL",-7.2,0.07,7.82,9.4,0.14,0.22,woodDark);
    b("floorEdgeFrontR",7.2,0.07,7.82,9.4,0.14,0.22,woodDark);

    const yardMat=new BABYLON.StandardMaterial("tavernYardMatV34",scene);
    // The forecourt shares the village's cool stone rather than forming a
    // separate brown rectangular mat underneath the road.
    yardMat.diffuseColor=new BABYLON.Color3(0.22,0.22,0.21);
    yardMat.ambientColor=new BABYLON.Color3(0.38,0.38,0.36);
    yardMat.emissiveColor=new BABYLON.Color3(0.026,0.026,0.024);
    yardMat.specularColor=new BABYLON.Color3(0.01,0.01,0.01);
    rt.disposables.push(yardMat);
    const yard=box("tavernExteriorYard",0,-0.055,9.85,28,0.10,4.9,yardMat,"BASE");
    yard.receiveShadows=true;yard.isPickable=false;

    const porch=b("porchStep",0,0.10,8.15,4.6,0.20,1.15,stoneLight);
    porch.receiveShadows=true;

    const lightPool=(name:string,x:number,z:number,w:number,d:number,color:number[],alpha:number)=>{
      const tex=new BABYLON.DynamicTexture("cafe12_poolTex_"+name,{width:256,height:256},scene,false);
      tex.hasAlpha=true;
      const ctx:any=tex.getContext();
      const g=ctx.createRadialGradient(128,128,0,128,128,126);
      g.addColorStop(0,`rgba(${Math.round(color[0]*255)},${Math.round(color[1]*255)},${Math.round(color[2]*255)},${alpha})`);
      g.addColorStop(0.42,`rgba(${Math.round(color[0]*255)},${Math.round(color[1]*255)},${Math.round(color[2]*255)},${alpha*0.52})`);
      g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.clearRect(0,0,256,256);ctx.fillStyle=g;ctx.fillRect(0,0,256,256);tex.update();
      const m=new BABYLON.StandardMaterial("cafe12_poolMat_"+name,scene);
      m.diffuseTexture=tex;m.opacityTexture=tex;m.emissiveTexture=tex;m.disableLighting=true;m.disableDepthWrite=true;m.backFaceCulling=false;
      const q=BABYLON.MeshBuilder.CreateGround("cafe12_lightPool_"+name,{width:w,height:d},scene);
      q.position.set(x,0.055,z);q.material=m;q.parent=parentFor("BASE");
      if(glow.addExcludedMesh)glow.addExcludedMesh(q);
      rt.disposables.push(tex,m);
      return q;
    };
    const contactShadow=(name:string,x:number,z:number,d:number,scaleX=1,scaleZ=1)=>{
      const q=BABYLON.MeshBuilder.CreateCylinder("cafe12_shadow_"+name,{diameter:d,height:0.012,tessellation:28},scene);
      q.position.set(x,0.020,z);q.scaling.set(scaleX,1,scaleZ);q.material=shadowMat;q.parent=parentFor("BASE");
      if(glow.addExcludedMesh)glow.addExcludedMesh(q);
      return q;
    };

    // Room shell.
    facade('cafe12_wallBack',0,-7.65,24,3.2,.65,stoneDark,[-6.4,1,8.7].map(x=>({x,w:1.39,b:1.52,t:2.82})));collider(0,-7.65,24,.65);
    b("wallLeft",-11.65,1.6,0,0.65,3.2,15.3,stoneDark);collider(-11.65,0,.65,15.3);
    b("wallRight",11.65,1.6,0,0.65,3.2,15.3,stoneDark);collider(11.65,0,.65,15.3);
    facade('cafe12_wallFront',0,7.55,24,3.2,.52,wood,[{x:.75,w:2.1,b:0,t:2.5},...[-8,-4,4,8].map(x=>({x,w:1.55,b:1.4,t:2.6}))]);
    collider(-6.15,7.55,11.7,.52);collider(6.975,7.55,10.05,.52);
    for(const x of [-10,-4.8,-2,3,6,10])b('wallTimberPost',x,1.6,-7.29,.16,3.2,.16,woodDark);
    for(const y of [.45,1.2,2.6])b('wallTimberRail',0,y,-7.29,23.3,.14,.12,woodLight);
    b('wallTimberWainscot',0,.48,-7.28,23.25,.96,.11,wood);
    for(const side of [-1,1])b('wallTimberWainscotSide',side*11.28,.48,0,.11,.96,14.6,wood);
    b("wallCopingBack",0,3.26,-7.65,24.1,0.15,0.77,stoneLight);
    b("wallCopingLeft",-11.65,3.26,0,0.77,0.15,15.3,stoneLight);
    b("wallCopingRight",11.65,3.26,0,0.77,0.15,15.3,stoneLight);
    // A real centred entrance. Hinges open inward, clear of the courtyard and trough.
    b('entryLintel',.75,2.65,7.55,2.25,.24,.7,woodLight);
    for(const x of [-8,-4,4,8]){
      const glass=b('frontWindowGlass',x,2,7.55,1.55,1.2,.025,windowGlass());
      b('frontWindowFrame',x,2,7.9,.08,1.24,.1,woodDark);b('frontWindowCross',x,2,7.9,1.58,.08,.1,woodDark);
      const light=track(new BABYLON.PointLight('cafeWindowLight',new BABYLON.Vector3(x,2,7.3),scene));light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,.62,.28);light.intensity=.65;light.range=5;
    }
    // Short eave strips imply a roof/ceiling, but leave the playable room open.
    b("cutawayEaveBack",0,2.06,-7.62,24.25,0.18,0.42,woodDark);
    for(const px of [-10.4,-6.2,-2,2.2,6.4,10.6])b("ceilingJoistStub",px,2.02,-7.0,0.17,0.18,1.35,wood);

    // Bar + backbar.
    contactShadow("bar",-3.15,-5.0,6.4,1.8,0.30);b("bar",-3.15,0.56,-5.0,10.8,1.12,1.05,wood);b("barTop",-3.15,1.17,-5.0,11.2,0.15,1.25,woodLight);collider(-3.15,-5.0,10.8,1.05);
    b("barBack",-3.15,0.92,-6.25,10.2,1.84,0.34,woodDark);
    for(let i=0;i<12;i++)cy("backBottle",-7.8+i*0.84,1.33,-6.0,0.14,0.46,i%2?bottleA:bottleG);
    for(const x of [-6.8,-4.35,-1.9,0.55]){cy("stoolSeat",x,0.48,-3.7,0.72,0.15,woodLight);cy("stoolLeg",x,0.23,-3.7,0.18,0.46,woodDark);}

    // V34 tavern dressing: mugs, hanging herbs, sacks and a wall sign.
    for(let i=0;i<7;i++){
      cy("barMug",-6.3+i*1.10,1.34,-4.72,0.16,0.22,ceramic);
    }
    for(const [sx,sz] of [[7.9,-5.9],[8.7,-5.9],[9.5,-5.9]] as any[]){
      const sack=sph("grainSack",sx,0.34,sz,0.72,cmat("sack_"+sx,[0.44,0.32,0.20],0.10));
      sack.scaling.set(0.72,1.0,0.82);
    }
    const tavernSign=b("tavernWallSign",8.7,1.55,-7.18,3.0,0.78,0.16,woodLight);
    tavernSign.rotation.y=0;

    // Fireplace body.
    b("hearth",-9.65,0.26,-1.3,2.7,0.52,1.75,stoneDark);
    b("fireL",-10.7,1.20,-1.3,0.45,2.15,1.55,stone);
    b("fireR",-8.6,1.20,-1.3,0.45,2.15,1.55,stone);
    b("fireTop",-9.65,2.08,-1.3,2.55,0.42,1.45,stoneLight);
    collider(-9.65,-1.3,2.7,1.75);

    // Sofas and rug.
    b("rug",-6.05,0.045,0.45,4.3,0.09,3.6,green);
    for(const [x,z] of [[-8.5,-4.15],[-8.85,4.2]]){
      contactShadow("sofa"+x+z,x,z,2.1,1.0,0.46);b("sofaBase",x,0.30,z,2.25,0.32,1.0,woodDark);b("sofaSeat",x,0.52,z,1.98,0.22,0.72,red);b("sofaBack",x,0.92,z+0.34,2.02,0.68,0.22,red);collider(x,z,2.25,1.0);
    }

    const table=(x:number,z:number)=>{
      contactShadow("table"+x+z,x,z,2.2,1.0,0.82);cy("tableTop",x,0.68,z,2.10,0.18,woodLight);cy("tableLeg",x,0.34,z,0.48,0.68,woodDark);collider(x,z,1.35,1.35);
      for(const [dx,dz,r] of [[0,-1.45,0],[0,1.45,Math.PI],[-1.45,0,Math.PI/2],[1.45,0,-Math.PI/2]] as any[]){
        const root=new BABYLON.TransformNode("cafe12_chair",scene);root.parent=rt.root;root.position.set(x+dx,0,z+dz);root.rotation.y=r;
        const seat=BABYLON.MeshBuilder.CreateBox("cafe12_chairSeat",{width:0.55,height:0.15,depth:0.55},scene);seat.position.y=0.36;seat.material=wood;seat.parent=root;
        const back=BABYLON.MeshBuilder.CreateBox("cafe12_chairBack",{width:0.55,height:0.68,depth:0.10},scene);back.position.set(0,0.68,-0.23);back.material=woodDark;back.parent=root;
        if(glow.addExcludedMesh){glow.addExcludedMesh(seat);glow.addExcludedMesh(back);}
      }
      for(let i=0;i<4;i++){const a=i*Math.PI/2;cy("plate",x+Math.cos(a)*0.58,0.80,z+Math.sin(a)*0.58,0.34,0.035,ceramic);}
      cy("tableJug",x+0.20,0.98,z+0.12,0.20,0.35,bottleA);
      cy("tableBread",x-0.25,0.86,z-0.10,0.30,0.09,wax);
    };
    table(-5.3,0.45);table(1.55,2.25);table(5.05,-0.45);

    // Right room / storage.
    b("partitionV",8.35,0.72,1.4,0.48,1.44,8.2,stone);
    b("partitionH",10.1,0.72,-2.7,3.8,1.44,0.48,stone);
    b("sideboard",-8.4,0.48,5.75,4.2,0.96,0.78,woodDark);b("sideboardTop",-8.4,1.00,5.75,4.28,0.10,0.84,woodLight);
    for(const x of [5.25,7.05]){contactShadow("barrel"+x,x,-5.25,1.35,1.0,0.75);cy("barrel",x,0.92,-5.25,1.46,1.84,wood);for(let r=0;r<3;r++)cy("barrelRing",x,0.18+r*0.74,-5.25,1.52,0.05,iron);collider(x,-5.25,1.2,1.2);}

    // V34: the indoor pool is removed. This is usable tavern floor near the entrance.
    b("entryBench",6.9,0.42,5.9,3.2,0.16,0.68,woodLight);
    b("entryBenchBack",6.9,0.78,6.16,3.2,0.62,0.10,woodDark);
    b("entryCrate",9.8,0.38,5.9,0.78,0.76,0.78,wood);

    // Crates.
    for(const [x,z,sc] of [[9.1,-6.5,1],[10,-6.5,.8],[10.8,-6.5,.85]] as any[]){b("crate",x,0.38*sc,z,0.78*sc,0.76*sc,0.78*sc,wood);}

    // Painted light pools add warmth/cool contrast without consuming WebGL lights.
    lightPool("fire",-8.9,-1.15,7.2,5.2,[1.00,0.22,0.045],0.26);
    lightPool("bar",-2.7,-4.5,11.0,4.0,[1.00,0.46,0.12],0.12);
    lightPool("tableA",-5.3,0.45,3.6,3.6,[1.00,0.58,0.20],0.10);
    lightPool("tableB",1.55,2.25,3.8,3.8,[1.00,0.56,0.18],0.10);
    lightPool("tableC",5.05,-0.45,3.5,3.5,[1.00,0.54,0.16],0.085);

    // V16 Café reference-match: strengthen the silhouette and match the reference composition.
    b("frontWallL",-7.15,0.42,7.55,9.4,0.84,0.52,stoneDark);collider(-7.15,7.55,9.4,0.52);
    b("frontWallR",8.45,0.42,7.55,6.3,0.84,0.52,stoneDark);collider(8.45,7.55,6.3,0.52);
    b("entryPierL",-2.05,0.72,7.45,0.55,1.44,0.62,stone);
    b("entryPierR",2.05,0.72,7.45,0.55,1.44,0.62,stone);

    // V34 exterior horse area.
    const troughWaterMat=new BABYLON.StandardMaterial("tavernTroughWaterV34",scene);
    troughWaterMat.diffuseColor=new BABYLON.Color3(0.05,0.34,0.40);
    troughWaterMat.emissiveColor=new BABYLON.Color3(0.018,0.075,0.085);
    troughWaterMat.specularColor=new BABYLON.Color3(0.22,0.30,0.32);troughWaterMat.alpha=0.92;
    rt.disposables.push(troughWaterMat);
    const tx=5.6,tz=10.0,tw=4.8,td=1.55;
    b("troughSideN",tx,0.38,tz-td*0.48,tw,0.70,0.24,woodDark);
    b("troughSideS",tx,0.38,tz+td*0.48,tw,0.70,0.24,woodDark);
    b("troughSideW",tx-tw*0.48,0.38,tz,0.24,0.70,td,woodDark);
    b("troughSideE",tx+tw*0.48,0.38,tz,0.24,0.70,td,woodDark);
    const troughWater=b("horseTroughWater",tx,0.28,tz,tw-0.42,0.10,td-0.42,troughWaterMat);
    rt.markers.pools.push({x:tx,z:tz,mesh:troughWater,baseY:troughWater.position.y});
    const troughY=troughWater.position.y;
    rt.updaters.push((tt:number)=>{
      troughWater.position.y=troughY+Math.sin(tt*1.25)*0.010;
      troughWater.scaling.x=1+Math.sin(tt*0.55)*0.006;
      troughWater.scaling.z=1+Math.cos(tt*0.48)*0.008;
    });
    collider(tx,tz,tw,td);

    const hx=-5.4,hz=10.0;
    b("hitchPostL",hx-2.15,0.80,hz,0.28,1.60,0.28,woodDark);
    b("hitchPostR",hx+2.15,0.80,hz,0.28,1.60,0.28,woodDark);
    b("hitchRail",hx,1.18,hz,4.6,0.24,0.24,wood);
    b("hitchBase",hx,0.14,hz,5.0,0.16,0.55,stoneDark);

    const straw=cmat("straw",[0.62,0.46,0.16],0.12);
    for(const [bx,bz,rot] of [[9.2,9.75,0],[10.2,10.35,Math.PI/2]] as any[]){
      const bale=b("hayBale",bx,0.42,bz,1.25,0.84,0.72,straw);bale.rotation.y=rot;
    }
    b("outsideCrate",-9.4,0.38,9.8,0.84,0.76,0.84,wood);

    // Additional wall shelves / crockery to match the dense tavern backdrop.
    b("rearNiche",-8.7,1.35,-6.18,1.5,1.20,0.30,woodDark);
    for(let i=0;i<4;i++)cy("rearPlate",-9.15+i*0.30,1.32,-6.00,0.22,0.035,ceramic);
    b("sideNiche",10.35,1.20,1.45,1.4,1.15,0.28,woodDark);

    // V15 Café art pass: more architectural depth without changing gameplay.
    const beamXs=[-10.9,-7.2,-3.5,0.2,3.9,7.6,10.9];
    for(const bx of beamXs){
      const beam=b("wallBeam",bx,1.02,-7.30,0.18,1.85,0.22,woodDark);
      beam.name="cafe15_wallBeam";
    }
    b("backShelfLip",-3.15,1.78,-6.18,10.4,0.12,0.40,woodLight);
    for(const bx of [-8.0,-6.2,-4.4,-2.6,-0.8,1.0]){
      const jar=cy("barJar",bx,1.66,-6.02,0.20,0.32,(Math.round((bx+8)*10)%2)?bottleA:bottleG);
      jar.scaling.y=1.1;
    }
    b("fireMantel",-9.65,2.30,-1.30,2.95,0.22,1.70,stoneLight);
    for(let i=0;i<5;i++){
      const log=b("firewood",-9.65+(i-2)*0.28,0.15,-0.40,0.22,0.20,0.95,woodDark);
      log.rotation.z=(i%2?0.14:-0.10);
    }
    // Small floor wear patches around high-traffic zones.
    for(const [px,pz,ww,dd] of [[-3.0,-3.4,7.0,1.0],[-5.3,0.45,3.2,2.6],[1.55,2.25,3.0,2.5],[5.0,-0.45,3.0,2.4]] as any[]){
      const wear=new BABYLON.StandardMaterial("cafe15_wearMat",scene);
      wear.diffuseColor=new BABYLON.Color3(0.23,0.15,0.10);wear.emissiveColor=new BABYLON.Color3(0.08,0.05,0.03);
      wear.disableLighting=true;wear.alpha=0.18;wear.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;wear.disableDepthWrite=true;
      rt.disposables.push(wear);
      const patch=box("cafe15_floorWear",px,0.012,pz,ww,0.012,dd,wear);
      if(glow.addExcludedMesh)glow.addExcludedMesh(patch);
    }

    // Local light helper with visible source.
    const warmLight=(name:string,x:number,y:number,z:number,intensity:number,range:number,color=[1,0.42,0.11])=>{
      const l=track(new BABYLON.PointLight("cafe12_"+name,new BABYLON.Vector3(x,y,z),scene));
      l.parent=rt.root;l.diffuse=new BABYLON.Color3(color[0],color[1],color[2]);l.intensity=intensity;l.range=range;return l;
    };

    // Fireplace flame + smoke + real light.
    const fo=sph("cafe12_fireOuter",-9.65,0.62,-1.3,0.72,M.fireOuter,"VFX");fo.scaling.y=1.65;
    const fi=sph("cafe12_fireInner",-9.65,0.56,-1.3,0.42,M.fireInner,"VFX");fi.scaling.y=1.70;
    const fireLight=warmLight("fireLight",-9.65,1.4,-1.3,2.55,8.6,[1,0.27,0.045]);
    rt.updaters.push((t:number)=>{const a=Math.sin(t*9.2),bb=Math.sin(t*14.5);fo.scaling.y=1.65+a*0.10;fi.scaling.y=1.70+bb*0.08;fireLight.intensity=2.55+a*0.16+bb*0.08;});
    for(let i=0;i<5;i++){const sm=sph("cafe12_smoke",-9.65,0.95+i*0.25,-1.3,0.22+i*0.05,M.smoke,"VFX");const off=i/5;rt.updaters.push((t:number)=>{const q=(t*0.16+off)%1;sm.position.y=0.9+q*2.4;sm.position.x=-9.65+Math.sin(t*0.7+i)*0.12;const k=0.65+q*1.1;sm.scaling.set(k,k*1.15,k);});}

    // Wall torches.
    const torchPts=[[-8.2,-6.85],[-3.2,-6.85],[1.4,-6.85],[7.4,-6.2],[-10.7,3.0],[10.7,2.3]];
    torchPts.forEach((p:any,i:number)=>{
      const x=p[0],z=p[1],y=1.75;
      const flame=sph("cafe12_torchFlame",x,y+0.30,z,0.22,M.fireInner,"VFX");flame.scaling.y=1.45;
      const by=flame.position.y;rt.updaters.push((t:number)=>{const f=Math.sin(t*10.2+i);flame.position.y=by+f*0.025;flame.scaling.y=1.45+f*0.10;});
      const light=warmLight('cafeTorchLight',x,y+.20,z,.95,4.5,[1,.48,.16]);
      rt.updaters.push((t:number)=>light.intensity=.95+Math.sin(t*9+i)*.065);
    });

    // Bounded per-mesh membership below selects the nearby candle lights.
    for(const [x,z] of [[-5.3,0.45],[1.55,2.25],[5.05,-0.45]] as any[]){
      cy("candle",x,0.87,z,0.095,0.30,wax);
      const flame=sph("cafe12_candleFlame",x,1.10,z,0.10,M.fireInner,"VFX");flame.scaling.y=1.28;
      const light=warmLight('cafeCandleLight',x,1.12,z,.50,2.8,[1,.60,.25]);
      rt.updaters.push((t:number)=>light.intensity=.50+Math.sin(t*7+x)*.035);
    }

    // V34 hanging tavern lanterns.
    for(const [lx,lz] of [[-1.5,1.8],[5.0,2.4]] as any[]){
      cyl("hangingLanternChain",lx,2.40,lz,0.05,1.00,iron);
      const lamp=sph("hangingLanternGlow",lx,1.88,lz,0.28,M.fireInner,"VFX");
      lamp.scaling.y=1.18;
    }

    // Only a few broad real lights: safe for WebGL2 shader limits.
    warmLight("wallFillLeft",-4.8,3.1,-4.25,0.58,9.6,[1,0.48,0.17]);
    warmLight("wallFillRight",5.4,3.0,-3.8,0.50,8.8,[1,0.42,0.12]);
    warmLight("porchFill",0,2.0,8.7,0.32,6.6,[1.00,0.48,0.18]);

    // One subtle warm bounce. Total scene lights affecting Café materials now stays <= 6.
    const bounce=track(new BABYLON.HemisphericLight("cafe12_bounce",new BABYLON.Vector3(0,1,0),scene));
    bounce.intensity=0.16;bounce.diffuse=new BABYLON.Color3(1,0.70,0.46);bounce.groundColor=new BABYLON.Color3(0.065,0.035,0.020);
  }

  function makeOverlayV13(name:string,x:number,z:number,w:number,d:number,color:number[],alpha:number,kind:"light"|"shadow"="light"){
    const tex=new BABYLON.DynamicTexture("v13_"+name+"_tex",{width:256,height:256},scene,false);
    tex.hasAlpha=true;
    const ctx:any=tex.getContext();
    const g=ctx.createRadialGradient(128,128,0,128,128,126);
    const rgb=`${Math.round(color[0]*255)},${Math.round(color[1]*255)},${Math.round(color[2]*255)}`;
    g.addColorStop(0,`rgba(${rgb},${alpha})`);
    g.addColorStop(0.48,`rgba(${rgb},${alpha*0.48})`);
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.clearRect(0,0,256,256);ctx.fillStyle=g;ctx.fillRect(0,0,256,256);tex.update();
    const m=new BABYLON.StandardMaterial("v13_"+name+"_mat",scene);
    m.diffuseTexture=tex;
    m.useAlphaFromDiffuseTexture=true;
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    m.disableLighting=true;m.disableDepthWrite=true;m.backFaceCulling=false;
    if(kind==="light"){m.emissiveTexture=tex;m.emissiveColor=new BABYLON.Color3(1,1,1);}
    const q=BABYLON.MeshBuilder.CreateGround("v13_"+name,{width:w,height:d},scene);
    const surface=rt.id==="temple"&&Math.abs(x)<13.6&&z>=-8.9&&z<=18.2?.28:0;
    q.position.set(x,surface+(kind==="light"?0.072:0.027),z);q.material=m;q.parent=parentFor(kind==="light"?"BASE":"PROPS");q.isPickable=false;
    if(glow.addExcludedMesh)glow.addExcludedMesh(q);
    rt.disposables.push(tex,m);
    return q;
  }

  function trimPointLightsV13(maxCount:number){
    const pts=(scene.lights??[]).filter((l:any)=>l&&l.getClassName&&l.getClassName()==="PointLight"&&l.parent===rt.root&&!l.isDisposed?.());
    if(pts.length<=maxCount)return;
    pts.sort((a:any,b:any)=>((b.intensity??0)*(b.range??1))-((a.intensity??0)*(a.range??1)));
    // Keep local sources alive. Their affected meshes are budgeted below,
    // rather than silently switching off candles that remain visibly lit.
    pts.forEach((l:any)=>l.setEnabled(true));
  }

  // The art pass is opt-in and map-local. In particular Dinner and the approved
  // Temple never enter it. It decorates the existing scene, not a second world.
  function landscapeMaterial(kind:string){
    rt.landscapeMaterials??={};
    if(rt.landscapeMaterials[kind])return rt.landscapeMaterials[kind];
    const palettes:any={stone:[.67,.65,.59],wood:[.60,.38,.20],darkwood:[.26,.16,.11],gold:[.80,.56,.24],leaf:[.22,.34,.22],rose:[.70,.065,.13],snow:[.81,.88,.94],ice:[.22,.52,.67],icewall:[.33,.64,.77],frost:[.77,.90,.94],red:[.53,.13,.18],recess:[.07,.105,.14]};
    const m=track(new BABYLON.StandardMaterial("landscape_"+rt.id+"_"+kind,scene));
    rt.landscapeMaterials[kind]=m;m.metadata={d8Authored:true};m.maxSimultaneousLights=8;
    m.diffuseColor=new BABYLON.Color3(...(palettes[kind]??[.86,.86,.86]));
    m.emissiveColor=m.diffuseColor.scale(kind==="icewall"?.025:.012);
    m.ambientColor=new BABYLON.Color3(1,1,1);m.specularColor=new BABYLON.Color3(.035,.035,.04);
    const surface=PROCEDURAL_SURFACES[/wood/.test(kind)?"wood":kind==="stone"?"stone":/ice|frost/.test(kind)?"ice":kind==="snow"?"snow":"cloth"];
    if(surface&&!["recess","gold","rose","leaf","snow"].includes(kind)){m.diffuseTexture=surface.texture;m.bumpTexture=surface.normal??null;}
    if(/ice|frost/.test(kind)){m.specularColor=new BABYLON.Color3(.22,.31,.38);m.specularPower=96;}
    if(kind==="gold"){m.specularColor=new BABYLON.Color3(.38,.29,.16);m.specularPower=72;}
    if(["pavement","snowfield","icefield","rug"].includes(kind)){
      const tex=track(new BABYLON.DynamicTexture("landscapeTexture_"+rt.id+"_"+kind,{width:1024,height:1024},scene,false));
      const ctx:any=tex.getContext(),n=1024;
      if(kind==="pavement"){
        ctx.fillStyle=rt.id==="cafe"?"#777269":"#696e70";ctx.fillRect(0,0,n,n);
        const rows=rt.id==="cafe"?12:23,hh=n/rows;
        for(let r=0;r<rows;r++){
          let px=-55+(r%2)*30,index=0;
          while(px<n){
            const seed=r*197+index*37,ww=(rt.id==="cafe"?68:32)+seeded(seed)*hh*.72,tone=Math.floor(seeded(seed+9)*20);
            const rgb=rt.id==="cafe"?[134+tone,126+tone,109+tone]:[111+tone,113+tone,110+tone];
            ctx.fillStyle=`rgb(${rgb})`;ctx.beginPath();
            ctx.moveTo(px+2,r*hh+2);ctx.lineTo(px+ww-3,r*hh+2+seeded(seed+1)*4);ctx.lineTo(px+ww-2,(r+1)*hh-3);ctx.lineTo(px+3,(r+1)*hh-2);ctx.closePath();ctx.fill();
            ctx.strokeStyle="rgba(235,228,204,.13)";ctx.lineWidth=1.5;ctx.stroke();
            if(index%4===0){ctx.strokeStyle="rgba(54,56,54,.18)";ctx.beginPath();ctx.moveTo(px+ww*.3,r*hh+4);ctx.lineTo(px+ww*.5,r*hh+hh*.45);ctx.lineTo(px+ww*.45,r*hh+hh*.7);ctx.stroke();}
            px+=ww;index++;
          }
        }
        // Quiet wear, not black mortar or an aggressive checkerboard.
        for(let i=0;i<5000;i++){ctx.fillStyle=i%2?"rgba(235,230,211,.055)":"rgba(49,48,44,.04)";ctx.fillRect(seeded(i*7.31)*n,seeded(i*11.17)*n,2,2);}
      }else if(kind==="rug"){
        ctx.fillStyle="#294a3e";ctx.fillRect(0,0,n,n);
        for(const margin of [18,35,78,96]){ctx.strokeStyle=margin<50?"#ae8b4b":"#d0b779";ctx.lineWidth=margin<50?7:4;ctx.strokeRect(margin,margin,n-margin*2,n-margin*2);}
        ctx.strokeStyle="#998354";ctx.lineWidth=5;
        for(let i=0;i<16;i++)for(const z of [59,965]){const x=65+i*59;ctx.beginPath();ctx.moveTo(x,z-13);ctx.lineTo(x+16,z);ctx.lineTo(x,z+13);ctx.lineTo(x-16,z);ctx.closePath();ctx.stroke();}
        for(let row=0;row<4;row++)for(let col=0;col<4;col++){
          const x=230+col*188,z=230+row*188;ctx.strokeStyle="#65856a";ctx.beginPath();ctx.ellipse(x,z,41,60,Math.PI/4,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(x,z,41,60,-Math.PI/4,0,Math.PI*2);ctx.stroke();
        }
        for(let y=0;y<n;y+=4){ctx.fillStyle="rgba(236,224,188,.045)";ctx.fillRect(0,y,n,1);}
      }else{
        ctx.fillStyle=kind==="snowfield"?"#c6d5df":"#46748b";ctx.fillRect(0,0,n,n);
        for(let i=0;i<90;i++){
          const x=seeded(i*7.7)*n,y=seeded(i*13.3)*n,r=40+seeded(i*17.1)*150;
          const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,kind==="snowfield"?"rgba(255,255,255,.17)":"rgba(168,222,236,.15)");g.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
        }
        if(kind==="icefield")for(let i=0;i<48;i++){
          let x=seeded(i*8.1)*n,y=seeded(i*19.7)*n;ctx.beginPath();ctx.moveTo(x,y);
          for(let j=0;j<5;j++){x+=(seeded(i*31+j*7)-.45)*155;y+=(seeded(i*17+j*13)-.5)*130;ctx.lineTo(x,y);}
          ctx.strokeStyle="rgba(30,61,83,.48)";ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle="rgba(181,230,241,.38)";ctx.lineWidth=1;ctx.stroke();
        }
        for(let i=0;i<14000;i++){ctx.fillStyle=i%3?"rgba(255,255,255,.075)":"rgba(58,98,133,.055)";ctx.fillRect(seeded(i*3.41)*n,seeded(i*5.73)*n,1.5,1.5);}
      }
      tex.update(false);m.diffuseColor=new BABYLON.Color3(1,1,1);m.diffuseTexture=tex;m.bumpTexture=null;
      m.emissiveColor=new BABYLON.Color3(.018,.018,.02);
      if(kind==="pavement"){tex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;tex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;tex.uScale=rt.id==="cafe"?1.4:1.2;tex.vScale=1.15;}
      if(kind==="icefield"){m.specularColor=new BABYLON.Color3(.18,.30,.38);m.specularPower=100;}
    }
    return m;
  }

  function authoredLandscape(c:any){
    if(!["cafe","garden","market","mirror"].includes(rt.id))return;
    const mat=landscapeMaterial;
    const meshes=rt.root.getChildMeshes();
    for(const mesh of meshes){
      const n=mesh.name,source=mesh.material;
      if(!source||mesh.parent===rt.layers.VFX||/flame|glow|shimmer|water|ripple|smoke|fire|shadow|lightpool/i.test(n))continue;
      if(n==="floor"||n==="cafe33_floor")mesh.material=mat(rt.id==="garden"?"snowfield":rt.id==="mirror"?"icefield":"pavement");
      else if(n==="floorDetail")mesh.setEnabled(false);
      else if(/rug/i.test(n))mesh.material=mat("rug");
      else if(n==="path"||n==="roundRoomFloor")mesh.material=mat("pavement");
      else if(/snow|frost/i.test(source.name))mesh.material=mat("snow");
      else if(/stone/i.test(source.name))mesh.material=mat("stone");
      else if(/wood/i.test(source.name))mesh.material=mat(/dark/i.test(source.name)?"darkwood":"wood");
      else if(/roseHead|rosePetal|thornRose/.test(n))mesh.material=mat("rose");
      else if(rt.id==="market"&&/stallCanopy|stallValance|artStallScallop/.test(n)){
        rt.clothMaterials??=new Map();let clone=rt.clothMaterials.get(source);
        if(!rt.awningWeave){
          rt.awningWeave=track(new BABYLON.DynamicTexture("marketAwningWeave",{width:256,height:256},scene,false));const ctx:any=rt.awningWeave.getContext();ctx.fillStyle="#dedbd2";ctx.fillRect(0,0,256,256);
          for(let line=0;line<256;line+=4){ctx.fillStyle="rgba(65,60,52,.06)";ctx.fillRect(line,0,1,256);ctx.fillRect(0,line,256,1);}
          rt.awningWeave.update(false);
        }
        if(!clone){clone=track(cloneSurfaceMaterial(source,"marketWoven_"+source.name));clone.metadata={d8Authored:true};clone.maxSimultaneousLights=8;clone.diffuseTexture=rt.awningWeave;clone.bumpTexture=null;clone.emissiveColor=new BABYLON.Color3(.01,.01,.01);rt.clothMaterials.set(source,clone);}
        mesh.material=clone;
      }
      mesh.receiveShadows=true;
    }
    // Lighting is evaluated per mesh. A single giant floor receives the lights
    // nearest its centre, leaving every edge lantern ineffective. Split only
    // the visual ground into small, UV-continuous patches at the SAME height.
    const base=meshes.find(m=>m.name===(rt.id==="cafe"?"cafe33_floor":"floor"));
    if(base){
      const width=rt.id==="cafe"?24:c.MAP.size[0],depth=rt.id==="cafe"?16:c.MAP.size[1],nx=Math.ceil(width/4),nz=Math.ceil(depth/4);
      for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
        const w=width/nx,d=depth/nz,px=-width/2+(ix+.5)*w,pz=-depth/2+(iz+.5)*d;
        const tile=BABYLON.MeshBuilder.CreateGround("artGround",{width:w,height:d,subdivisions:1},scene);
        const uv=tile.getVerticesData("uv");
        for(let k=0;k<uv.length;k+=2){uv[k]=(ix+uv[k])/nx;uv[k+1]=(iz+uv[k+1])/nz;}
        tile.setVerticesData("uv",uv);tile.position.set(px,0,pz);tile.parent=parentFor("BASE");tile.material=base.material;tile.receiveShadows=true;tile.isPickable=false;
      }
      base.setEnabled(false);
    }
    const detail=(x:number,y:number,z:number,w:number,h:number,d:number,kind:string)=>box("artDetail",x,y,z,w,h,d,mat(kind));
    const orb=(x:number,y:number,z:number,d:number,kind:string,sx=1,sy=1,sz=1)=>{const q=sph("artDetail",x,y,z,d,mat(kind));q.scaling.set(sx,sy,sz);return q;};
    const beam=(a:any,b:any,r:number,kind:string)=>{
      const start=new BABYLON.Vector3(...a),end=new BABYLON.Vector3(...b),delta=end.subtract(start);
      const q=cyl("artDetail",...(start.add(end).scale(.5).asArray()),r,delta.length(),mat(kind));
      const axisY=delta.normalize(),reference=Math.abs(axisY.z)>.95?new BABYLON.Vector3(1,0,0):new BABYLON.Vector3(0,0,1);
      const axisX=BABYLON.Vector3.Cross(axisY,reference).normalize(),axisZ=BABYLON.Vector3.Cross(axisX,axisY).normalize();
      q.rotation.copyFrom(BABYLON.Vector3.RotationFromAxis(axisX,axisY,axisZ));return q;
    };
    const localLight=(name:string,x:number,y:number,z:number,color:number[],intensity:number,range:number)=>{
      const light=track(new BABYLON.PointLight(name,new BABYLON.Vector3(x,y,z),scene));light.parent=rt.root;light.diffuse=new BABYLON.Color3(...color);light.intensity=intensity;light.range=range;return light;
    };
    const lantern=(x:number,y:number,z:number)=>{
      detail(x,y-.20,z,.27,.07,.27,"darkwood");detail(x,y+.23,z,.31,.08,.31,"darkwood");
      for(const a of [-1,1])for(const b of [-1,1])detail(x+a*.12,y,z+b*.12,.035,.42,.035,"gold");
      const core=box("artLanternGlow",x,y,z,.17,.29,.17,M.lanternGlass,"VFX");core.isPickable=false;
      localLight("artLanternLight",x,y,z,[1,.59,.27],rt.id==="market"?3.4:rt.id==="garden"?2.1:1.65,5.8);
      rt.updaters.push(t=>{core.scaling.y=1+Math.sin(t*5+x)*.035;});
    };
    const books=(x:number,y:number,z:number)=>{for(let i=0;i<5;i++){const q=detail(x+(i-2)*.15,y+.18,z,.12,.35+(i%3)*.05,.29,i%2?"red":"leaf");q.rotation.z=(i-2)*.035;detail(q.position.x,y+.30,z-.15,.10,.025,.02,"gold");}};
    const wovenBasket=(x:number,y:number,z:number,r:number)=>{
      cyl("artDetail",x,y+.13,z,r,.26,mat("wood"));
      for(let ring=0;ring<3;ring++){
        const q=BABYLON.MeshBuilder.CreateTorus("artDetail",{diameter:r*1.02,thickness:.025,tessellation:16},scene);q.position.set(x,y+.035+ring*.09,z);q.parent=rt.root;q.material=mat("gold");
      }
      for(let i=0;i<7;i++)orb(x+Math.cos(i*2.4)*r*.24,y+.30,z+Math.sin(i*2.4)*r*.24,r*.22,i%3?"red":"leaf");
    };
    if(rt.id==="cafe"){
      // Cool leaded windows and quiet stone relief against the amber hearth.
      hemi.diffuse=new BABYLON.Color3(.78,.84,.94);hemi.intensity=.42;
      scene.clearColor=new BABYLON.Color4(.027,.033,.045,1);
      for(const x of [-6.4,1.0,8.7]){
        for(const side of [-1,1]){detail(x+side*.76,2.17,-7.30,.13,1.56,.11,"darkwood");detail(x,2.17+side*.72,-7.30,1.65,.13,.11,"darkwood");}
        box("artWindow",x,2.17,-7.65,1.39,1.30,.025,windowGlass());
        for(const dx of [-.45,0,.45])detail(x+dx,2.17,-7.17,.038,1.31,.035,"gold");
        for(const y of [1.8,2.3])detail(x,y,-7.17,1.39,.035,.035,"gold");
        detail(x,1.32,-7.13,1.95,.16,.42,"stone");
      }
      localLight("tavernMoonWindow",1,2.7,-6.6,[.43,.65,1],.65,7);
      // Mantel mouldings, hearth voussoirs and firewood stay inside the hearth.
      for(const y of [1.87,2.15])detail(-9.65,y,-1.3,3.05,.13,1.20,"stone");
      for(const side of [-1,1])for(let k=0;k<4;k++)detail(-9.65+side*1.13,.36+k*.40,-1.02,.36,.33,.72,"stone");
      for(let k=0;k<5;k++){const q=beam([-10.1+k*.17,.25,-1.6],[-9.70+k*.17,.25,-.95],.13,"darkwood");}
      detail(-9.65,2.32,-1.55,1.2,.22,.42,"darkwood");
      for(let k=0;k<9;k++)detail(-8.1+k*1.2,.82,-4.73,.065,.67,.08,"gold");
      detail(-3.15,.42,-4.67,10.65,.06,.08,"gold");
      // Carved chair backs, scrolls, meals and bottles give human scale.
      for(const table of [[-5.3,.45],[1.55,2.25],[5.05,-.45]]){
        const [x,z]=table;detail(x-.4,.80,z+.1,.58,.02,.36,"snow").rotation.y=.3;
        cyl("artDetail",x+.35,.87,z+.25,.15,.24,mat("gold"));
        for(let k=0;k<3;k++)orb(x-.12+k*.12,.79,z-.34,.18,"wood",1.2,.4,.8);
        for(const side of [-1,1])for(let k=0;k<3;k++)detail(x+side*1.25,.69,z+(k-1)*.13,.035,.52,.035,"wood");
      }
      books(-7.7,1.08,5.7);wovenBasket(-9.3,1.06,5.7,.55);
      for(let k=0;k<8;k++){const x=-7.8+k*.49;beam([x,1.65,-6.92],[x+.05,1.15,-6.91],.045,"leaf");orb(x,1.15,-6.92,.29,"leaf",.5,1.6,.6);}
      for(const x of [-8.5,-1.4,5.2])lantern(x,1.8,-6.16);
      // Decorative coffered ends remain at the boundary, never across the map.
      for(let k=0;k<12;k++)detail(-11+k*2,1.97,-7.42,.18,.18,.8,"darkwood");
      for(const x of [-11.40,11.40])for(const z of [-5.8,-1.6,3.2]){
        detail(x,1.12,z,.25,2.24,.28,"darkwood");detail(x,.22,z,.38,.30,.40,"wood");
        beam([x,1.42,z],[x,1.95,z+.62],.12,"wood");beam([x,1.42,z],[x,1.95,z-.62],.12,"wood");
      }
      for(const table of [[-5.3,.45],[1.55,2.25],[5.05,-.45]]){
        const [x,z]=table;const light=localLight("tavernTableCandle",x,1.0,z,[1,.67,.34],.85,3.7);
        cyl("artDetail",x,.92,z,.085,.32,mat("snow"));const flame=sph("artCandleFlame",x,1.13,z,.11,M.fireInner,"VFX");flame.scaling.y=1.4;
        rt.updaters.push(t=>{light.intensity=.85+Math.sin(t*9+x)*.045;flame.scaling.y=1.4+Math.sin(t*11+z)*.08;});
      }
      box("artHearthRug",-6.05,.081,.45,4.25,.015,3.56,mat("rug"));
    }else if(rt.id==="garden"){
      // Dress the existing refuge; furnishings do not add collision volumes.
      detail(7.2,.605,-3.34,1.17,.065,1.65,"red");
      for(let k=0;k<7;k++)detail(6.69+k*.17,.643,-3.34,.025,.01,1.57,"gold");
      for(const z of [-4.77,-2.48]){detail(7.2,.62,z,1.43,.68,.13,"wood");for(const x of [6.61,7.79])cyl("artDetail",x,.69,z,.10,.92,mat("darkwood"));}
      cyl("artDetail",8.72,.65,-2.40,1.12,.11,mat("wood"));cyl("artDetail",8.72,.33,-2.4,.15,.60,mat("darkwood"));
      detail(8.72,.72,-2.4,.38,.02,.28,"snow");cyl("artDetail",8.96,.85,-2.4,.15,.23,mat("gold"));
      detail(5.57,.48,-3.9,.65,.86,1.35,"darkwood");detail(5.57,.94,-3.9,.74,.09,1.44,"wood");books(5.55,1,-4.14);
      wovenBasket(8.30,.12,-4.96,.60);lantern(5.57,1.22,-3.35);lantern(8.72,.96,-2.6);
      // The old circular refuge had snow caps at wall height. They cannot remain
      // suspended inside the new timber cabin when its roof is cut away.
      for(let i=0;c.MAP.objects.some(o=>o.asset==='round_room')&&i<20;i++){
        const a=i/20*Math.PI*2;if(i<3)continue;
        const x=7.2+Math.cos(a)*3.3,z=-3+Math.sin(a)*3.3;
        const q=orb(x,1.34,z,.76,"snow",1.18,.18,.58);q.rotation.y=-a;
        for(let k=0;k<2;k++)detail(x,.34+k*.44,z,.075,.022,.08,"recess");
      }
      const cabin=c.MAP.objects.find(o=>o.asset==='house'&&o.playable);
      if(cabin){const [cx,cz]=cabin.position,[w,d]=cabin.size;
        for(const side of [-1,1])for(let i=0;i<7;i++){
          const x=cx+(i/6-.5)*w,z=cz+side*(d/2+.22);
          if(side===1&&Math.abs(x-cabin.doorX)<1.15)continue;
          const drift=orb(x,.08,z,.55,'snow',1.3,.24,.65);drift.name='fritzCabinSnowDrift';
        }
      }
      // Raised snow banks break the board-like outline, within the existing beds.
      for(const bed of c.MAP.objects.filter(o=>o.asset==="rose_patch")){
        const [x,z]=bed.position,[w,d]=bed.size;
        for(let i=0;i<12;i++){
          const px=x+(seeded(i*7+x)-.5)*w*.96,pz=z+(seeded(i*13+z)-.5)*d*.90;
          const h=.55+seeded(i*11)*.45;
          beam([px,.12,pz],[px+.23,h,pz-.1],.055,"darkwood");
          beam([px+.12,h*.55,pz],[px-.25,h*.75,pz+.17],.035,"darkwood");
          orb(px+.23,h,pz-.1,.24,"rose",1,.72,1);
          orb(px-.23,h*.76,pz+.17,.21,"rose",1,.72,1);
          orb(px,.27,pz,.36,"leaf",1,.40,.8);
        }
        for(const side of [-1,1])for(let i=0;i<6;i++)orb(x+(i/5-.5)*w,.13,z+side*d*.54,.72,"snow",1,.28,.60);
      }
      for(const thorn of c.MAP.objects.filter(o=>o.asset==="thorn_wall")){
        const [x,z]=thorn.position,len=thorn.length,rot=thorn.rotation??0;
        for(let i=0;i<12;i++){
          const t=(i/11-.5)*len,px=x+Math.cos(rot)*t,pz=z-Math.sin(rot)*t;
          const end=[px+.30,.9+seeded(i*3+x)*.40,pz+.16];beam([px,.15,pz],end,.065,"darkwood");
          beam([px,.55,pz],[px-.28,1.12,pz-.18],.04,"darkwood");orb(...end,.22,"rose");
        }
      }
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2+.035*Math.sin(i*1.7),x=Math.cos(a)*13.25,z=Math.sin(a)*9.15;
        const paths=Array.from({length:5},(_,row)=>Array.from({length:9},(_,col)=>{
          const along=(col/8-.5)*3.9,across=(row/4-.5)*1.65;
          const y=.012+Math.sin(row/4*Math.PI)*Math.sin(col/8*Math.PI)*(.19+seeded(i*9+col)*.07);
          return new BABYLON.Vector3(x+Math.cos(a+Math.PI/2)*along+Math.cos(a)*across,y,z+Math.sin(a+Math.PI/2)*along+Math.sin(a)*across);
        }));
        const bank=BABYLON.MeshBuilder.CreateRibbon("artSnowBank",{pathArray:paths,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);bank.parent=rt.root;bank.material=mat("snowfield");
        const positions=bank.getVerticesData("position"),uv:number[]=[];
        for(let j=0;j<positions.length;j+=3)uv.push(.5+positions[j]/c.MAP.size[0],.5+positions[j+2]/c.MAP.size[1]);
        bank.setVerticesData("uv",uv);
      }
      // Gnarled winter rose trunks at the border, with asymmetrical branching.
      for(const [x,z] of [[-12.6,-7.6],[-12.2,6.9],[1,-8.8],[12.8,5.6]]){
        beam([x,.1,z],[x+.18,1.8,z+.16],.20,"darkwood");
        for(let i=0;i<6;i++){
          const a=i*2.4+x,ex=x+Math.cos(a)*(1+seeded(i+x)*.5),ez=z+Math.sin(a)*.8,ey=1.6+seeded(i+z)*1.3;
          beam([x+.1,1.1,z+.12],[ex,ey,ez],.075,"darkwood");beam([ex,ey,ez],[ex+Math.cos(a+.6)*.45,ey+.3,ez+Math.sin(a+.6)*.45],.035,"darkwood");
          orb(ex,ey+.03,ez,.30,"snow",1.6,.20,.7);orb(ex,ey-.2,ez,.19,"rose");
        }
      }
      // Low stone edging and fallen petals retain the exact clear path width.
      for(let i=0;i<23;i++){orb(-12+i,.12,3.57,.52,"snow",1,.20,.5);orb(-12+i,.12,6.02,.48,"snow",1,.18,.6);}
      for(let i=0;i<32;i++){const q=detail(-10+seeded(i*7)*10,.09,-6+seeded(i*11)*8,.09,.012,.07,"rose");q.rotation.y=i*2.4;}
    }else if(rt.id==="market"){
      for(const [index,stall] of c.MAP.objects.filter(o=>o.asset==="market_stall").entries()){
        const [x,z]=stall.position,w=stall.size[0];lantern(x-w*.38,1.73,z-.72);
        for(let i=0;i<3;i++){
          const px=x+(i-1)*w*.28;
          if(index%3===0)wovenBasket(px,.88,z-.08,.48);
          else if(index%3===1)books(px,.78,z-.12);
          else{
            cyl("artDetail",px,.83,z-.11,.52,.035,mat("gold"));
            for(let gem=0;gem<4;gem++)orb(px+Math.cos(gem*1.6)*.16,.88,z-.11+Math.sin(gem*1.6)*.16,.11,gem%2?"ice":"red");
          }
        }
        detail(x,.78,z+.55,w,.045,.055,"gold");
        for(let i=0;i<5;i++)detail(x-w*.41+i*w*.20,.45,z-.6,.07,.55,.045,"wood");
      }
      // A rear town edge anchors the plaza in a world without closing its routes.
      for(const x of [-11,-5,1,7,12]){
        const w=x===12?3.5:4.7;
        detail(x,1.25,-11.0,w,2.5,1.65,"stone");
        for(const side of [-1,1]){const roof=detail(x+side*w*.25,2.83,-11.05,w*.54,.13,2.45,"darkwood");roof.rotation.z=-side*.31;}
        detail(x,3.15,-11.05,.12,.15,2.50,"wood");
        for(const side of [-1,1])detail(x+side*w*.43,1.32,-10.12,.14,2.6,.12,"darkwood");
        detail(x,1.65,-10.13,1.16,1.1,.12,"darkwood");
        box("artTownWindow",x,1.65,-10.03,.90,.81,.035,M.lanternGlass,"VFX");
        detail(x,1.65,-9.99,.065,.86,.04,"gold");detail(x,1.65,-9.99,.94,.045,.04,"gold");
      }
      for(const x of [-12.8,12.8])for(const z of [-7.8,-3.5,3.4,7.6]){
        wovenBasket(x,.05,z,.72);orb(x,.42,z,.80,"leaf",1,.52,1);
        for(let i=0;i<5;i++)orb(x+Math.cos(i*2.4)*.25,.53,z+Math.sin(i*2.4)*.25,.18,"rose");
      }
      // Fine cords with discrete bulbs, not opaque beams over the board.
      for(const z of [-7.4,6.5]){
        for(let i=0;i<16;i++){
          const x=-12+i*1.6,y=3.18-Math.sin(i/15*Math.PI)*.5;
          if(i<15)beam([x,y,z],[x+1.6,3.18-Math.sin((i+1)/15*Math.PI)*.5,z],.018,"darkwood");
          box("artFestoonGlow",x,y-.14,z,.07,.13,.07,M.lanternGlass,"VFX");
        }
      }
    }else if(rt.id==="mirror"){
      // Broad, stratified cavern masses replace the sparse cone-only silhouette.
      for(let i=0;i<19;i++){
        const a=(i/18)*Math.PI,px=Math.cos(a)*14.0,pz=-Math.sin(a)*9.1,h=1.7+seeded(i*9)*2.8;
        const vertices:any[]=[],positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
        for(let ring=0;ring<3;ring++)for(let j=0;j<7;j++){
          const theta=j/7*Math.PI*2+i*.31,r=(ring===0?1.9:ring===1?1.55:.90)*( .78+seeded(i*31+j*7+ring*13)*.45);
          vertices.push(new BABYLON.Vector3(Math.cos(theta)*r+(ring===2?.30:0),ring===0?0:h*(ring===1?.56:.82+seeded(j*11+i)*.18),Math.sin(theta)*r*.72));
        }
        const triangle=(ia:number,ib:number,ic:number)=>{
          const va=vertices[ia],vb=vertices[ib],vc=vertices[ic],normal=BABYLON.Vector3.Cross(vb.subtract(va),vc.subtract(va)).normalize();
          for(const v of [va,vb,vc]){indices.push(positions.length/3);positions.push(...v.asArray());normals.push(...normal.asArray());uvs.push(v.x*.3+.5,v.y/h);}
        };
        for(let ring=0;ring<2;ring++)for(let j=0;j<7;j++){const k=(j+1)%7;triangle(ring*7+j,(ring+1)*7+j,ring*7+k);triangle(ring*7+k,(ring+1)*7+j,(ring+1)*7+k);}
        for(let j=1;j<6;j++)triangle(14,14+j+1,14+j);
        const q=new BABYLON.Mesh("artIceWall",scene);q.setVerticesData("position",positions);q.setVerticesData("normal",normals);q.setVerticesData("uv",uvs);q.setIndices(indices);q.position.set(px,0,pz);q.parent=rt.root;q.material=mat("icewall");
        orb(px,.15,pz,3.3,"snow",1.15,.12,.75);
      }
      for(const floe of c.MAP.objects.filter(o=>o.asset==="ice_floe")){
        const [x,z]=floe.position,d=floe.diameter,rot=floe.rotation??0,ds=floe.depthScale??.72;
        const original=meshes.filter(m=>m.name==="iceFloeTop"&&Math.abs(m.position.x-x)<.1&&Math.abs(m.position.z-z)<.1);
        original.forEach(m=>m.material=mat("ice"));
        for(let i=0;i<7;i++){
          const a=i/7*Math.PI*2+rot,b=(i+1)/7*Math.PI*2+rot;
          beam([x+Math.cos(a)*d*.48,.18,z+Math.sin(a)*d*.48*ds],[x+Math.cos(b)*d*.48,.18,z+Math.sin(b)*d*.48*ds],.075,"frost");
        }
        for(let i=0;i<4;i++){const a=i*2.1+rot;beam([x,.18,z],[x+Math.cos(a)*d*.35,.18,z+Math.sin(a)*d*.28],.018,"frost");}
      }
      const x=-9.2,z=-2.5;
      const beforeRelic=new Set(rt.root.getChildMeshes());
      // An ornate silver/gold relic becomes the focal point, not a green hoop.
      for(const m of meshes.filter(m=>/mirrorFrame|magicRing/i.test(m.name)))m.material=mat("gold");
      const mirror=meshes.find(m=>m.name==="mirrorGlass");
      if(mirror){
        const tex=track(new BABYLON.DynamicTexture("silverMirrorSurface",{width:512,height:512},scene,false)),ctx:any=tex.getContext();
        const gradient=ctx.createRadialGradient(223,203,8,256,256,256);gradient.addColorStop(0,"#e5ffff");gradient.addColorStop(.20,"#88d8e0");gradient.addColorStop(.65,"#294d75");gradient.addColorStop(1,"#071a38");ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
        for(let i=0;i<22;i++){
          ctx.strokeStyle=`rgba(198,245,255,${.04+(i%3)*.035})`;ctx.lineWidth=2;
          ctx.beginPath();ctx.ellipse(256,256,45+i*9,35+i*8,i*.07,i*.7,i*.7+Math.PI*1.15);ctx.stroke();
        }
        for(let i=0;i<18;i++){const px=seeded(i*7)*390+61,py=seeded(i*13)*390+61;ctx.fillStyle="#c5fcff";ctx.fillRect(px-3,py,6,1);ctx.fillRect(px,py-3,1,6);}
        tex.update(false);
        const glass=track(new BABYLON.StandardMaterial("silverMirrorGlass",scene));glass.metadata={d8Authored:true};glass.diffuseTexture=tex;glass.emissiveTexture=tex;glass.emissiveColor=new BABYLON.Color3(.18,.25,.32);glass.diffuseColor=new BABYLON.Color3(.6,.8,.9);glass.specularColor=new BABYLON.Color3(.5,.7,.8);glass.maxSimultaneousLights=8;glass.backFaceCulling=false;mirror.material=glass;
        rt.updaters.push(t=>{tex.wAng=Math.sin(t*.25)*.035;});
      }
      for(let i=0;i<18;i++){
        const a=i/18*Math.PI*2;
        orb(x+Math.cos(a)*1.19*Math.cos(.18),1.73+Math.sin(a)*1.19,z-Math.cos(a)*1.19*Math.sin(.18),.16,"gold",1,.8,.8);
      }
      for(const side of [-1,1]){
        beam([x+side*.86,.65,z],[x+side*1.04,1.45,z],.085,"gold");
        orb(x+side*1.02,1.56,z,.23,"ice");
      }
        for(let i=0;i<8;i++){const a=i/8*Math.PI*2;cyl("artDetail",x+Math.cos(a)*.89,.24,z+Math.sin(a)*.89,.12,.36,mat("gold"));}
      localLight("mirrorRelicLight",x,1.8,z,[.34,.82,1],1.1,7);
      for(const mesh of rt.root.getChildMeshes())if(!beforeRelic.has(mesh))mesh.metadata={...mesh.metadata,authoredPropId:'true-love-mirror',d8Animated:true};
      localLight("mirrorVioletRim",9,2,-6,[.39,.43,1],.8,10);
    }
    for(const mesh of rt.root.getChildMeshes())if(/^art/.test(mesh.name)){mesh.isPickable=false;mesh.receiveShadows=true;if(mesh.parent!==rt.layers.VFX)glow.addExcludedMesh?.(mesh);}
  }

  function balanceSanctuaryLights(){
    if(rt.id!=="temple"&&!["cafe","garden","market","mirror","dinner"].includes(rt.id))return;
    // Babylon's range limits attenuation, not shader-light allocation. Without
    // per-mesh membership, the first four torches consume the budget even for
    // the altar on the other side of the room. Reuse the actual local lights.
    const local=scene.lights.filter((l:any)=>l.parent===rt.root&&["PointLight","SpotLight"].includes(l.getClassName())&&l.isEnabled());
    const meshes=rt.root.getChildMeshes().filter((m:any)=>m.material&&m.parent!==rt.layers.VFX);
    const membership=new Map<any,any[]>(local.map((l:any)=>[l,[]]));
    if(rt.id!=="temple"){
      // Keep the ambient rig in fixed slots. Letting it appear/disappear as
      // tile-local lights enter the shader caused rectangular colour seams.
      for(const light of scene.lights){
        if(light.name==="readabilityFill")light.renderPriority=70;
        if(light.name==="readabilityDirectional")light.renderPriority=60;
      }
    }
    for(const mesh of meshes){
      mesh.computeWorldMatrix(true);
      const center=mesh.getBoundingInfo().boundingBox.centerWorld;
      const extent=mesh.getBoundingInfo().boundingBox.extendSizeWorld;
      const ranked=local.map((light:any)=>{
        const p=light.getAbsolutePosition(),d=BABYLON.Vector3.DistanceSquared(p,center);
        const nearest=rt.id==="temple"?d:Math.max(0,Math.abs(p.x-center.x)-extent.x)**2+Math.max(0,Math.abs(p.y-center.y)-extent.y)**2+Math.max(0,Math.abs(p.z-center.z)-extent.z)**2;
        return {light,score:light.intensity/(1+d*.16),d:nearest};
      }).filter((q:any)=>q.d<q.light.range*q.light.range).sort((a:any,b:any)=>b.score-a.score);
      for(const q of ranked.slice(0,4))membership.get(q.light).push(mesh);
    }
    for(const light of local){light.includedOnlyMeshes=membership.get(light).length?membership.get(light):[player];light.renderPriority=10;}
    hemi.renderPriority=80;
  }

  function polishMaterialsV13(v:any){
    if(!v)return;
    const cache=new Map<any,any>();
    const boost=v.diffuseBoost??1.0, emissive=v.emissiveFloor??0.0, spec=v.specular??0.025;
    rt.root.getChildMeshes().forEach((mesh:any)=>{
      if(!mesh.material)return;
      if(mesh.material.metadata?.d8Authored)return;
      const meshName=(mesh.name??"").toLowerCase();
      // Preserve dedicated textured ground materials. The previous generic
      // emissive polish overwrote their authored floor emission and flattened
      // the tavern/temple surfaces into near-black slabs.
      if(meshName==="floor"||meshName==="floordetail"||meshName==="templefloormain"||meshName==="cafe33_floor")return;
      if(mesh.parent===rt.layers?.VFX||mesh.name.includes("Flame")||mesh.name.includes("fire")||mesh.name.includes("smoke")||mesh.name.includes("mote")||mesh.name.includes("firefly"))return;
      if(glow.addExcludedMesh)glow.addExcludedMesh(mesh);
      const source=mesh.material;
      let m=cache.get(source);
      if(!m){
        m=cloneSurfaceMaterial(source,source.name+"_v13_"+rt.id);
        m.maxSimultaneousLights=v.maxMaterialLights??6;
        m.ambientColor=new BABYLON.Color3(1,1,1);
        const isMetal=/iron|gold|ring/i.test(source.name??"");
        const isIce=/ice|frost|magic|water/i.test(source.name??"");
        const sp=isMetal?Math.max(spec,0.10):(isIce?Math.max(spec,0.16):spec);
        m.specularColor=new BABYLON.Color3(sp,sp,sp);
        m.specularPower=isIce?96:64;
        if(m.diffuseColor){
          const d=m.diffuseColor;
          m.diffuseColor=new BABYLON.Color3(Math.min(1,d.r*boost),Math.min(1,d.g*boost),Math.min(1,d.b*boost));
          if(emissive>0&&!isMetal){
            m.emissiveColor=new BABYLON.Color3(d.r*emissive,d.g*emissive,d.b*emissive);
          }
        }
        cache.set(source,m);rt.disposables.push(m);
      }
      mesh.material=m;
    });
  }

  // The village is one place seen from different local boards. These landmarks
  // deliberately repeat: Café lies west of the square, the Temple road climbs
  // to the coast, and the estate sits beyond the same settlement.
  function authoredDistrictV2(p:any,makeMaterial:any,makeTerrainMaterial:any,continuousFloor:any){
    if(!["coast","village","nightMarket","estate"].includes(p.style))return;
    const district=p.style!=="coast";
    const verge=makeTerrainMaterial("districtVerge",p.style==="coast"?"#61735e":"#4b5c50","village",3);
    const stone=makeMaterial("districtStone",p.style==="coast"?"#a9ada1":"#777984",.6);
    const trim=makeMaterial("districtTrim","#433a3b",.12);
    const oak=makeMaterial("districtOak","#896d54",.82);
    const iron=makeMaterial("districtIron","#34383a",.50);
    const plaster=["#c3ae90","#ac9a82","#b4a28d","#bca38d"].map((hex,i)=>makeMaterial("districtPlaster"+i,hex,.8));
    const roofs=["#805c52","#646b6e","#70645b","#5e6864"].map((hex,i)=>makeMaterial("districtRoof"+i,hex,.82));
    const gold=makeMaterial("districtWindow","#ffca77",1);
    const leaf=makeMaterial("districtHedge",p.style==="coast"?"#476444":"#425e48",.04);
    const treeLeaf=makeMaterial("districtTreeLeaf","#476a55",.65);
    const awning=[makeMaterial("districtCanvasWine","#795055",.55),makeMaterial("districtCanvasCream","#b9a785",.55),makeMaterial("districtCanvasBlue","#657580",.55)];
    const textured=(material:any,kind:string)=>{
      material.disableLighting=false;material.emissiveColor=material.diffuseColor.scale(.025);
      material.diffuseTexture=PROCEDURAL_SURFACES[kind]?.texture??null;
      material.bumpTexture=PROCEDURAL_SURFACES[kind]?.normal??null;material.maxSimultaneousLights=4;
    };
    textured(stone,'stone');textured(oak,'wood');textured(trim,'wood');
    for(const material of plaster)textured(material,'stucco');
    for(const material of roofs)textured(material,'roof');
    for(const material of awning)textured(material,'cloth');
    leaf.disableLighting=false;leaf.emissiveColor=leaf.diffuseColor.scale(.025);
    const prop=(name:string,shape:any,position:[number,number,number],material:any,parent:any=parentFor("PROPS"))=>{
      const mesh=BABYLON.MeshBuilder.CreateBox("d8-horizon-"+name,shape,scene);
      mesh.position.set(...position);mesh.material=material;mesh.parent=parent;mesh.isPickable=false;mesh.receiveShadows=true;
      return mesh;
    };
    const floorPatch=(name:string,x:number,z:number,w:number,d:number,material:any,y=-.002)=>{
      const mesh=BABYLON.MeshBuilder.CreateGround("d8-horizon-"+name,{width:w,height:d},scene);
      mesh.position.set(x,y,z);mesh.material=material;mesh.parent=parentFor("BASE");mesh.isPickable=false;mesh.receiveShadows=false;
      return mesh;
    };
    // The surrounding floor remains visible between individual setts. A flat
    // rectangular overlay used to hide its texture and looked like a sticker.
    const road=(name:string,points:Array<[number,number]>,width:number)=>{
      const tones=(p.style==="coast"?["#9a9880","#aca88d","#8d8b78"]
        :p.style==="nightMarket"?["#899a9e","#9a9f9a","#829297"]
        :["#8d928e","#a09b91","#858b88"]).map((hex,i)=>makeMaterial("districtSetts"+i,hex,p.style==="village"?.42:.68));
      for(const material of tones)textured(material,'stone');
      const batches=tones.map(()=>({positions:[] as number[],normals:[] as number[],indices:[] as number[],uvs:[] as number[]}));
      const jitter=(n:number)=>seeded(n*17.13+rt.id.length*23.7);
      let stoneNo=0;
      for(let i=1;i<points.length;i++){
        const [x0,z0]=points[i-1],[x1,z1]=points[i],length=Math.hypot(x1-x0,z1-z0);
        const tx=(x1-x0)/length,tz=(z1-z0)/length,nx=tz,nz=-tx;
        const rows=Math.ceil(length/.66),columns=Math.max(3,Math.round(width/.57));
        for(let row=0;row<=rows;row++)for(let col=0;col<columns;col++){
          const n=stoneNo++;
          // Uneven edges and missing setts taper the lane into the same soil
          // or paving beneath it, instead of tracing a hard rectangular line.
          const edge=Math.abs((col+.5)/columns-.5)*2;
          if(jitter(n+301)<(edge>.72?.29:.055))continue;
          const distance=Math.min(length,(row+(col%2)*.37)*length/rows);
          const offset=((col+.5)/columns-.5)*width+(.5-jitter(n+3))*.17;
          const cx=x0+tx*distance+nx*offset,cz=z0+tz*distance+nz*offset;
          if(rt.id==="cafe"&&Math.abs(cx-5.6)<2.75&&Math.abs(cz-10)<1.15)continue;
          const halfW=(width/columns)*(.43+.05*jitter(n+8));
          const halfL=.28+.045*jitter(n+12);
          const b=batches[n%tones.length],base=b.positions.length/3,y=.006+.002*jitter(n+20);
          b.positions.push(cx,y,cz);b.normals.push(0,1,0);b.uvs.push(cx*.25,cz*.25);
          for(let k=0;k<6;k++){
            const a=k*Math.PI/3,r=.84+.16*jitter(n*9+k+41);
            b.positions.push(cx+nx*Math.cos(a)*halfW*r+tx*Math.sin(a)*halfL*r,y,cz+nz*Math.cos(a)*halfW*r+tz*Math.sin(a)*halfL*r);
            b.normals.push(0,1,0);b.uvs.push(b.positions[b.positions.length-3]*.25,b.positions[b.positions.length-1]*.25);
          }
          for(let k=0;k<6;k++)b.indices.push(base,base+1+k,base+1+(k+1)%6);
        }
      }
      batches.forEach((b,i)=>{
        if(!b.positions.length)return;
        const mesh=new BABYLON.Mesh("d8-horizon-embedded-setts-"+name+"-"+i,scene);
        const data=new BABYLON.VertexData();data.positions=b.positions;data.normals=b.normals;data.indices=b.indices;data.uvs=b.uvs;
        data.applyToMesh(mesh);mesh.material=tones[i];mesh.parent=parentFor("BASE");mesh.isPickable=false;mesh.receiveShadows=true;
      });
    };
    const lamp=(x:number,z:number)=>{
      prop("lamp-foot",{width:.52,height:.28,depth:.52},[x,.13,z],stone);
      prop("lantern-oak-post",{width:.19,height:2.5,depth:.19},[x,1.36,z],oak);
      prop("lantern-iron-arm",{width:.78,height:.10,depth:.13},[x+.35,2.63,z],iron);
      prop("lantern-amber-glass",{width:.36,height:.48,depth:.36},[x+.64,2.29,z],gold);
      for(const side of [-1,1])for(const depth of [-1,1])
        prop("lantern-cage-bar",{width:.055,height:.57,depth:.055},[x+.64+side*.20,2.31,z+depth*.20],iron);
      prop("lantern-iron-cap",{width:.54,height:.12,depth:.54},[x+.64,2.61,z],iron);
      prop("lantern-iron-base",{width:.48,height:.09,depth:.48},[x+.64,2.01,z],iron);
    };
    const hedge=(x:number,z:number,w:number,d:number)=>{
      prop("hedge-plinth",{width:w+.1,height:.25,depth:d+.1},[x,.12,z],stone);
      prop("hedge-heart",{width:w,height:.35,depth:d},[x,.43,z],leaf);
      const alongX=w>d,count=Math.max(2,Math.ceil(Math.max(w,d)/.82));
      for(let i=0;i<count;i++){
        const offset=(i/(count-1)-.5)*(alongX?w:d);
        const crown=BABYLON.MeshBuilder.CreateSphere("d8-horizon-hedge-crown",{diameter:.92,segments:5},scene);
        crown.position.set(x+(alongX?offset:0),.72+(i%3)*.055,z+(alongX?0:offset));
        crown.scaling.set(alongX?1.10:.82,.63,alongX?.82:1.10);
        crown.material=leaf;crown.parent=parentFor("PROPS");crown.isPickable=false;
      }
    };
    const house=(x:number,z:number,w:number,d:number,h:number,variant:number,rot=0)=>{
      const node=new BABYLON.TransformNode("d8-horizon-house-root",scene);
      node.position.set(x,0,z);node.rotation.y=rot;node.parent=parentFor("PROPS");
      prop("house-foundation",{width:w+.25,height:.42,depth:d+.25},[0,.1,0],stone,node);
      prop("house-plaster",{width:w,height:h,depth:d},[0,h/2+.25,0],plaster[variant%plaster.length],node);
      // Exposed timber frame gives the same architectural language to both
      // village scenes and to the houses visible from the Temple causeway.
      for(const level of [.35,h*.52,h-.18])
        prop("house-oak-crossbeam",{width:w+.09,height:.15,depth:.15},[0,level,-d/2-.10],oak,node);
      for(const level of [.35,h*.52,h-.18])
        prop("house-oak-rear-crossbeam",{width:w+.09,height:.15,depth:.15},[0,level,d/2+.10],oak,node);
      for(const side of [-1,1]){
        prop("house-oak-post",{width:.22,height:h,depth:.24},[side*(w/2-.11),h/2+.25,-d/2-.10],oak,node);
        prop("house-oak-rear-post",{width:.22,height:h,depth:.24},[side*(w/2-.11),h/2+.25,d/2+.10],oak,node);
        for(const level of [.35,h*.52,h-.18])
          prop("house-oak-side-beam",{width:.16,height:.15,depth:d+.12},[side*(w/2+.10),level,0],oak,node);
        const sideBrace=prop("house-oak-side-brace",{width:.16,height:h*.34,depth:.17},[side*(w/2+.18),h*.78,-d*.28],oak,node);
        sideBrace.rotation.x=side*.58;
        const brace=prop("house-oak-brace",{width:.15,height:h*.32,depth:.16},[side*(w*.39),h*.77,-d/2-.20],oak,node);
        brace.rotation.z=side*.57;
        const panel=prop("roof-slope",{width:w*.58,height:.22,depth:d+.7},[side*w*.25,h+.95,0],roofs[variant%roofs.length],node);
        panel.rotation.z=side*-.48;
        prop("window-frame",{width:.94,height:1.33,depth:.12},[side*w*.26,h*.55,-d/2-.08],trim,node);
        prop("window-glow",{width:.69,height:1.09,depth:.14},[side*w*.26,h*.55,-d/2-.15],gold,node);
        prop("shutter",{width:.22,height:1.31,depth:.17},[side*w*.26+.56,h*.55,-d/2-.16],roofs[variant%roofs.length],node);
      }
      prop("roof-ridge",{width:.20,height:.20,depth:d+.84},[0,h+1.50,0],trim,node);
      if(rt.id==='cafe'||rt.id==='market'){
        const front=d/2+.35,light=track(new BABYLON.PointLight('villageWindowLight',new BABYLON.Vector3(x+Math.sin(rot)*-front,h*.55,z+Math.cos(rot)*-front),scene));
        light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,.62,.28);light.range=5.5;light.intensity=.65;
      }
      prop("house-door",{width:1.1,height:2.05,depth:.13},[0,1.25,-d/2-.11],oak,node);
      prop("door-iron-bands",{width:1.1,height:.075,depth:.15},[0,1.65,-d/2-.20],iron,node);
      prop("door-lantern",{width:.40,height:.46,depth:.35},[w*.28,2.50,-d/2-.22],gold,node);
      for(const side of [-1,1]){
        const frame=prop("side-window-frame",{width:.13,height:1.22,depth:.90},[side*(w/2+.08),h*.56,0],trim,node);
        const glass=prop("side-window-glow",{width:.15,height:.95,depth:.68},[side*(w/2+.16),h*.56,0],gold,node);
        frame.isPickable=glass.isPickable=false;
        prop("flower-box",{width:.35,height:.22,depth:1.2},[side*(w/2+.24),h*.56-.76,0],roofs[variant%roofs.length],node);
        for(let flower=0;flower<4;flower++){
          const blossom=BABYLON.MeshBuilder.CreateSphere("d8-horizon-flower",{diameter:.21,segments:5},scene);
          blossom.position.set(side*(w/2+.25),h*.56-.51,-.42+flower*.28);
          blossom.material=flower%2?awning[0]:leaf;blossom.parent=node;blossom.isPickable=false;
        }
      }
      prop("chimney",{width:.62,height:1.45,depth:.62},[w*.25,h+1.58,d*.20],stone,node);
      prop("chimney-cap",{width:.82,height:.18,depth:.82},[w*.25,h+2.34,d*.20],trim,node);
    };
    const stall=(x:number,z:number,variant:number)=>{
      prop("stall-counter",{width:3.8,height:.72,depth:1.5},[x,.36,z],oak);
      for(const sx of [-1.65,1.65])prop("stall-post",{width:.13,height:2.4,depth:.13},[x+sx,1.25,z],oak);
      for(let band=0;band<4;band++)prop("stall-striped-canopy",{width:.96,height:.13,depth:2.3},[x-1.4+band*.94,2.53,z],awning[(variant+band)%awning.length]);
      prop("stall-lantern",{width:.3,height:.39,depth:.3},[x,2.06,z-.95],gold);
    };
    const streetTree=(x:number,z:number)=>{
      prop("tree-planter",{width:1.7,height:.42,depth:1.7},[x,.2,z],stone);
      prop("tree-trunk",{width:.43,height:3.4,depth:.43},[x,1.9,z],oak);
      for(let i=0;i<7;i++){
        const angle=i*2.399,r=i%2?.75:.35;
        const crown=BABYLON.MeshBuilder.CreateSphere("d8-horizon-street-tree",{diameter:2.25,segments:7},scene);
        crown.position.set(x+Math.cos(angle)*r,4.15+(i%3)*.36,z+Math.sin(angle)*r);
        crown.scaling.y=.76;crown.material=treeLeaf;crown.parent=parentFor("PROPS");crown.isPickable=false;
      }
    };
    const cart=(x:number,z:number)=>{
      prop("cart-bed",{width:2.8,height:.46,depth:1.6},[x,.91,z],oak);
      for(const side of [-1,1]){
        const wheel=BABYLON.MeshBuilder.CreateCylinder("d8-horizon-cart-wheel",{height:.2,diameter:.85,tessellation:10},scene);
        wheel.rotation.z=Math.PI/2;wheel.position.set(x+side*1.35,.53,z+side*.15);
        wheel.material=oak;wheel.parent=parentFor("PROPS");wheel.isPickable=false;
      }
      for(const dx of [-.7,0,.7])prop("cart-crate",{width:.58,height:.62,depth:.58},[x+dx,1.49,z],plaster[1]);
    };
    const sign=(x:number,z:number,text:string)=>{
      if(integrated)return; // Replaced by readable campaign signposts on playable roads.
      const tex=track(new BABYLON.DynamicTexture("d8-horizon-sign-text-"+rt.id+"-"+text,{width:512,height:128},scene,false));
      const ctx=tex.getContext();ctx.fillStyle="#463b37";ctx.fillRect(0,0,512,128);
      ctx.strokeStyle="#b88d5d";ctx.lineWidth=7;ctx.strokeRect(9,9,494,110);
      ctx.fillStyle="#ffe3ac";ctx.font="bold 39px Georgia";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,256,65);tex.update();
      const material=track(new BABYLON.StandardMaterial("d8-horizon-sign-material-"+rt.id+"-"+text,scene));
      material.diffuseTexture=tex;material.emissiveTexture=tex;material.emissiveColor=new BABYLON.Color3(.7,.7,.7);material.backFaceCulling=false;material.metadata={d8Authored:true,d8Backdrop:true};
      prop("sign-oak-post",{width:.20,height:3.0,depth:.20},[x-2.15,1.50,z],oak);
      prop("sign-oak-arm",{width:4.45,height:.16,depth:.19},[x,3.01,z],oak);
      for(const side of [-1,1])prop("sign-iron-chain",{width:.07,height:.36,depth:.08},[x+side*1.65,2.80,z],iron);
      const board=prop("sign-board",{width:4.1,height:.88,depth:.12},[x,2.30,z],material);
      board.isPickable=false;
    };
    if(p.style==="coast"){
      // The road continues through the front gate onto a causeway toward town.
      // Continue the island material and UVs into an irregular grassy spit.
      // A separate rectangular ground plane left an obvious seam in the sea.
      const mapSize=rt.config.MAP.size;
      const spit=new BABYLON.Mesh("d8-horizon-temple-grassy-spit",scene);
      const spitData=new BABYLON.VertexData();
      const spitPositions:number[]=[],spitNormals:number[]=[],spitUvs:number[]=[],spitIndices:number[]=[];
      for(let i=0;i<=34;i++){
        const t=i/34,z=31+55*t,half=8.2+.65*Math.sin(t*7.4);
        for(const side of [-1,1]){
          const x=side*(half+.65*Math.sin(i*1.69+side*2.1)+.29*Math.sin(i*3.8+side));
          spitPositions.push(x,-.018,z);spitNormals.push(0,1,0);
          spitUvs.push(.5+x/mapSize[0],.5+z/mapSize[1]);
        }
        if(i<34){const a=i*2;spitIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
      }
      spitData.positions=spitPositions;spitData.normals=spitNormals;spitData.uvs=spitUvs;spitData.indices=spitIndices;
      spitData.applyToMesh(spit);spit.material=rt.root.getChildMeshes().find((mesh:any)=>mesh.name==="d8-horizon-island")?.material??verge;
      spit.parent=parentFor("BASE");spit.isPickable=false;spit.receiveShadows=false;
      road("temple-to-cafe",[[-1.5,31.5],[-4,39],[-6,52],[-7,79]],2.45);
      road("temple-to-market",[[1.5,31.5],[4,39],[6,52],[7,79]],2.45);
      // Low masonry and clipped hedges mark the exact edge of the tactical area.
      for(const x of [-26.3,26.3])for(let z=-30.5;z<33;z+=6.0)hedge(x,z,1.1,6.1);
      for(const z of [-34,33.7])for(let x=-22.5;x<24;x+=6.1){if(z>0&&Math.abs(x)<6)continue;hedge(x,z,6.2,1.05);}
      for(const x of [-4.5,4.5]){prop("temple-gate-pier",{width:.78,height:1.65,depth:.78},[x,.82,33.7],stone);lamp(x,37.5);}
      for(const x of [-10,10])hedge(x,42,4.2,1.1);
      // A recognizable village roof-line occupies the end of the causeway.
      for(const [i,x] of [-16,-7,8,17].entries())house(x,81+(i%2)*5,6.5,5.1,4.6,i);
      sign(-7,51,"CAFÉ");sign(7,51,"MERCADO");
      return;
    }
    if(p.style==="village"){
      road("cafe-to-market",[[9,10.5],[12,19.5],[21,23],[38,23]],3.6);
      road("cafe-to-temple",[[-9,10.5],[-12,19.5],[-31,23],[-42,35]],3.6);
      for(const [i,x,z] of [[0,-19,2],[1,-22,16],[2,19,-2],[3,23,8],[4,-19,-17],[5,19,-17],[6,30,25]].map(v=>v as number[]))house(x,z,6+(i%3),5.3,4.5+(i%2),i,i%2?.22:-.13);
      for(const x of [17,23,29])stall(x,19,x%3);
      sign(18,16,"MERCADO");
      sign(-20,19,"TEMPLO");
      sign(-16,12,"NO-ME-OLVIDES");
      for(const x of [-16,-5,6,16]){hedge(x,22,3.8,.8);lamp(x,23);}
      floorPatch("village-green",-22,7,6,9,verge,-.006);
      for(const x of [-17,17]){
        floorPatch("cafe-side-verge",x,0,4.2,15,verge,-.006);
        for(const z of [-5,0,5])hedge(x,z,2.9,.9);
      }
      for(const [x,z] of [[-20,11],[19,9],[-16,-14],[19,-13]])streetTree(x,z);
      cart(20,13);
    }else if(p.style==="nightMarket"){
      road("market-to-cafe",[[-2,9],[-9,16],[-24,20],[-41,25]],4.3);
      road("market-to-temple",[[2,9],[10,16],[24,25],[41,39]],4.3);
      for(const [i,x,z] of [[0,-21,-2],[1,-25,14],[2,21,-5],[3,25,10],[4,-18,-19],[5,18,-19],[6,35,27]].map(v=>v as number[]))house(x,z,6.5+(i%3),5.5,4.7+(i%2),i,i%2?.18:-.15);
      // This warm inn frontage and sign match what is glimpsed from the Café.
      house(-25,20,10,7,6.0,0,.24);sign(-25,14,"NO-ME-OLVIDES");
      sign(23,23,"TEMPLO");
      for(const [x,z,v] of [[-18,24,0],[-11,25,1],[13,24,2],[21,25,0]])stall(x,z,v);
      for(const x of [-21,-9,9,21])lamp(x,19);
      for(const x of [-26,25])hedge(x,25,5.3,.9);
      for(const x of [-22,22])floorPatch("market-verge",x,3,5.0,8.5,verge,-.006);
      for(const [x,z] of [[-21,10],[21,10],[-18,-15],[18,-15]])streetTree(x,z);
      cart(-19,16);
    }else{
      // Dinner is the village's walled manor court, not a slab in empty grass.
      road("dinner-to-village",[[0,7],[0,17],[-8,29],[-24,39]],4.0);
      for(const x of [-18.1,18.1])for(let z=-13;z<11;z+=5.4)hedge(x,z,1.0,4.5);
      for(let x=-17;x<18;x+=5.7)hedge(x,-13,4.9,1.0);
      for(const x of [-14,-7,7,14]){hedge(x,13,3.7,.9);lamp(x,16);}
      house(-22,0,10,7,6.2,1,-Math.PI/2);house(22,-3,8,7,5.5,2,Math.PI/2);
      for(const [i,x,z] of [[0,-30,28],[1,-21,34],[2,18,31],[3,30,27]].map(v=>v as number[]))house(x,z,6.8,5.4,4.8,i);
      sign(-11,30,"AL PUEBLO");
      for(const x of [-21,21])floorPatch("estate-garden",x,12,7,12,verge,-.006);
      for(const [x,z] of [[-23,13],[23,13],[-22,-14],[22,-14]])streetTree(x,z);
      cart(20,18);
    }
    rt.districtSummary={style:p.style,connectedLandmarks:true,physicalBoundary:p.style==="estate"};
  }

  // Map-specific sky palettes sit behind a world-space 3D horizon. The distant
  // terrain/trees/buildings are real meshes, not a prerendered map backdrop.
  function authoredHorizonV1(c:any){
    const p=c.VTT_AMBIENCE?.horizon;if(!p)return;
    const [mapW,mapD]=c.MAP.size,span=Math.max(mapW,mapD),mapRadius=Math.hypot(mapW,mapD)*.5;
    const skyDiameter=Math.max(320,span*8),seedBase=rt.id.length*83;
    const color=(hex:string)=>BABYLON.Color3.FromHexString(hex);
    const zenith=color(p.zenith);
    scene.clearColor=new BABYLON.Color4(zenith.r,zenith.g,zenith.b,1);
    const makeMaterial=(name:string,hex:string,emission=0)=>{
      const m=track(new BABYLON.StandardMaterial(name+"_"+rt.id,scene));
      const c=color(hex);m.diffuseColor=c;m.emissiveColor=c.scale(emission);m.specularColor=new BABYLON.Color3(0,0,0);m.disableLighting=true;m.backFaceCulling=false;m.metadata={d8Authored:true,d8Backdrop:true};
      // The map's exponential fog intentionally fades gameplay depth; applying
      // it to distant scenery would fade the entire backdrop back to clearColor.
      m.fogEnabled=false;return m;
    };
    const makeTerrainMaterial=(name:string,hex:string,kind:string,tiles=3)=>{
      // This is a repeatable *material*, not a screenshot of the map. The
      // surface remains in Babylon world space as the camera turns or tilts.
      const texture=track(new BABYLON.DynamicTexture(name+"Texture_"+rt.id,{width:512,height:512},scene,false));
      const ctx=texture.getContext();
      ctx.fillStyle=hex;ctx.fillRect(0,0,512,512);
      const rand=(n:number)=>seeded(seedBase+n*17.371+(kind==="water"?991:113));
      for(let i=0;i<390;i++){
        const x=rand(i*3)*512,y=rand(i*3+1)*512,r=1+rand(i*3+2)*(kind==="water"?16:7);
        ctx.beginPath();ctx.ellipse(x,y,r,r*(.24+rand(i+73)*.54),rand(i+291)*Math.PI,0,Math.PI*2);
        ctx.fillStyle=i%3===0?"rgba(5,18,24,.055)":"rgba(255,255,255,.035)";ctx.fill();
      }
      if(kind==="water"){
        for(let i=0;i<390;i++){
          const x=rand(i*5+1500)*512,y=rand(i*5+1501)*512,w=8+rand(i*5+1502)*35;
          ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+w*.53,y-1.5-rand(i+1900)*3,x+w,y+.8);
          ctx.strokeStyle=i%4===0?"rgba(5,25,39,.22)":"rgba(184,230,225,.17)";
          ctx.lineWidth=i%6===0?1.5:.8;ctx.stroke();
        }
      }else if(kind==="snowForest"){
        for(let i=0;i<260;i++){
          const x=rand(i*4+3300)*512,y=rand(i*4+3301)*512;
          ctx.beginPath();ctx.arc(x,y,.4+rand(i+3302)*2.5,0,Math.PI*2);
          ctx.fillStyle=i%5===0?"rgba(38,71,83,.23)":"rgba(255,255,255,.36)";ctx.fill();
        }
      }else{
        for(let i=0;i<300;i++){
          const x=rand(i*4+3500)*512,y=rand(i*4+3501)*512;
          ctx.fillStyle=i%3===0?"rgba(6,16,22,.14)":"rgba(224,199,160,.10)";
          ctx.fillRect(x,y,1+rand(i+3502)*4,1+rand(i+3503)*3);
        }
        if(kind==="village"||kind==="nightMarket"){
          ctx.lineWidth=.8;ctx.strokeStyle="rgba(12,13,20,.24)";
          for(let row=0,y=0;y<512;row++,y+=12){
            const offset=row%2?10:0;
            for(let x=-20+offset;x<512;x+=20){
              ctx.strokeRect(x+1+rand(row*43+x)*2,y+1,18,10);
            }
          }
        }
      }
      texture.update();texture.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;texture.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
      texture.uScale=tiles;texture.vScale=tiles;
      const material=makeMaterial(name,hex,1.05);
      material.diffuseTexture=texture;
      return material;
    };
    // A full-strength unlit surface is essential here: a low emissive factor
    // turns the exterior into a near-black slab under the map's night grading.
    const groundMat=makeTerrainMaterial("horizonGround",p.style==="snowForest"?(p.snow??p.ground):p.ground,p.style,skyDiameter/115);
    const authoredFloor=rt.root.getChildMeshes().find((mesh:any)=>mesh.name===(rt.id==='cafe'?'cafe33_floor':'floor'))?.material;
    const floorLift=0;
    const districtFloor=authoredFloor&&floorLift?track(cloneSurfaceMaterial(authoredFloor,"districtFloor_"+rt.id)):authoredFloor;
    if(districtFloor&&districtFloor!==authoredFloor){
      const e=authoredFloor.emissiveColor??new BABYLON.Color3(0,0,0);
      districtFloor.emissiveColor=new BABYLON.Color3(e.r+floorLift,e.g+floorLift,e.b+floorLift);
      districtFloor.metadata={d8Authored:true,d8Backdrop:true};
    }
    const neighborhoodFloor=districtFloor??groundMat;
    // Continue the authored floor in world space. A second, differently lit
    // rectangle was what made all four maps read as floating model platforms.
    const continuousFloor=(name:string,width:number,depth:number,x=0,z=0,y=-.012)=>{
      const mesh=BABYLON.MeshBuilder.CreateGround(name,{width,height:depth},scene);
      mesh.position.set(x,y,z);mesh.parent=parentFor("BASE");mesh.material=neighborhoodFloor??groundMat;
      mesh.isPickable=false;mesh.receiveShadows=true;
      const uv=mesh.getVerticesData("uv");
      if(uv&&neighborhoodFloor===districtFloor){for(let i=0;i<uv.length;i+=2){uv[i]=(uv[i]-.5)*width/mapW+x/mapW+.5;uv[i+1]=(uv[i+1]-.5)*depth/mapD+z/mapD+.5;}mesh.setVerticesData("uv",uv);}
      return mesh;
    };
    if(p.style==="coast"){
      const sea=BABYLON.MeshBuilder.CreateGround("d8-horizon-water",{width:skyDiameter*.72,height:skyDiameter*.72},scene);
      sea.position.y=-.48;sea.material=makeTerrainMaterial("horizonSea",p.water??p.ground,"water",skyDiameter/100);sea.parent=parentFor("BASE");sea.isPickable=false;sea.receiveShadows=false;
      const shore=new BABYLON.Mesh("d8-horizon-island",scene);
      const vertex=new BABYLON.VertexData(),positions=[0,0,0],normals=[0,1,0],uvs=[.5,.5],indices=[];
      const sides=96,radius=mapRadius+12;
      for(let i=0;i<=sides;i++){
        const a=i/sides*Math.PI*2;
        const wave=1+.045*Math.sin(a*7+seedBase)+.035*Math.sin(a*13-seedBase)+.028*Math.sin(a*23);
        const x=Math.cos(a)*radius*wave,z=Math.sin(a)*radius*wave;
        positions.push(x,0,z);normals.push(0,1,0);uvs.push(.5+x/mapW,.5+z/mapD);
        if(i<sides)indices.push(0,i+2,i+1);
      }
      vertex.positions=positions;vertex.normals=normals;vertex.uvs=uvs;vertex.indices=indices;vertex.applyToMesh(shore);
      shore.position.y=-.012;shore.material=authoredFloor??groundMat;shore.parent=parentFor("BASE");shore.isPickable=false;
      const surf=shore.clone("d8-horizon-shallows");
      surf.scaling.x=1.045;surf.scaling.z=1.045;surf.position.y=-.47;
      surf.material=makeMaterial("horizonShallows","#587e83",.56);surf.isPickable=false;
    }else{
      const ground=BABYLON.MeshBuilder.CreateGround("d8-horizon-ground",{width:skyDiameter*.72,height:skyDiameter*.72},scene);
      ground.position.y=-.46;ground.material=groundMat;ground.parent=parentFor("BASE");ground.isPickable=false;ground.receiveShadows=false;
      // The full portrait overview reaches past a 104×94 apron. Continue the
      // same world-space surface all the way across the outer terrain, rather
      // than exposing a second-colour rectangle when the camera tilts/rotates.
      continuousFloor("d8-horizon-continuous-floor",skyDiameter*.72,skyDiameter*.72);
      if(p.style==="cavern"){
        const apron=BABYLON.MeshBuilder.CreateDisc("d8-horizon-cave-apron",{radius:mapRadius+7,tessellation:64},scene);
        apron.rotation.x=Math.PI/2;apron.position.y=-.445;
        apron.material=authoredFloor??groundMat;
        apron.parent=parentFor("BASE");apron.isPickable=false;apron.receiveShadows=false;
      }
    }

    const hills=[p.far,p.near].map((hex:string,i:number)=>makeMaterial("horizonRidge"+i,hex,0.88));
    const ridgeCount=p.style==="cavern"?32:0;
    for(let i=0;i<ridgeCount;i++){
      const a=(i+.23*Math.sin(i*4.7+seedBase))/ridgeCount*Math.PI*2;
      const r=mapRadius+(p.style==="cavern"?8:18)+seeded(seedBase+i*7.1)*(p.style==="cavern"?6:12);
      const width=p.style==="cavern"?4+seeded(i*5.3)*4:3+seeded(i*5.3)*4;
      const height=p.style==="cavern"?3+seeded(i*2.3)*6:1+seeded(i*2.3)*2;
      const mound=p.style==="cavern"
        ? BABYLON.MeshBuilder.CreateCylinder("d8-horizon-ridge",{height,diameterTop:width*.35,diameterBottom:width,tessellation:7},scene)
        : BABYLON.MeshBuilder.CreateSphere("d8-horizon-ridge",{diameter:1,segments:8},scene);
      mound.position.set(Math.cos(a)*r,-.46+height*(p.style==="cavern"?.5:.24),Math.sin(a)*r);
      if(p.style!=="cavern")mound.scaling.set(width,height*.68,width*(.7+seeded(i*11.7)*.5));
      mound.rotation.y=a;mound.material=hills[i%hills.length];mound.parent=parentFor("PROPS");mound.isPickable=false;mound.receiveShadows=false;
    }

    let horizonFoliage:any=null;
    const makeTree=(a:number,r:number,i:number,snow:boolean)=>{
      const x=Math.cos(a)*r,z=Math.sin(a)*r,scale=.66+seeded(seedBase+i*2.1)*.60;
      const trunk=BABYLON.MeshBuilder.CreateCylinder("d8-horizon-trunk",{height:4.5*scale,diameterTop:.32*scale,diameterBottom:.72*scale,tessellation:6},scene);
      trunk.position.set(x,1.75*scale-.55,z);trunk.material=makeTree.trunk;trunk.parent=parentFor("PROPS");trunk.isPickable=false;
      if(snow){
        for(let tier=0;tier<3;tier++){
          const crown=BABYLON.MeshBuilder.CreateCylinder("d8-horizon-canopy",{height:(3.5-tier*.42)*scale,diameterTop:0,diameterBottom:(4.3-tier*.82)*scale,tessellation:7},scene);
          crown.position.set(x,(3.3+tier*1.72)*scale-.55,z);
          crown.material=tier===0?makeTree.snow:makeTree.leaves[(i+tier)%makeTree.leaves.length];crown.parent=parentFor("PROPS");crown.isPickable=false;
        }
      }else{
        // Share the same leaf-cluster material as the authored Temple trees.
        // From an oblique/top-down view, isolated spheres read as green dots.
        if(!horizonFoliage){
          horizonFoliage=track(cloneSurfaceMaterial(sanctuaryMaterial("foliage"),"horizonFoliage_"+rt.id));
          horizonFoliage.disableLighting=true;
          horizonFoliage.emissiveColor=new BABYLON.Color3(.43,.58,.44);
          horizonFoliage.metadata={d8Authored:true,d8Backdrop:true};
        }
        const foliage=horizonFoliage,spread=3.5*scale;
        for(let leafIndex=0;leafIndex<16;leafIndex++){
          const a=leafIndex*2.4+i,r=Math.sqrt(seeded(i*61+leafIndex*7.3))*spread*.55;
          const leaf=BABYLON.MeshBuilder.CreatePlane("sanctuaryCanopy",{size:spread*.9,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);
          leaf.position.set(x+Math.cos(a)*r,(3.8+seeded(i*43+leafIndex)*1.25)*scale-.55,z+Math.sin(a)*r);
          leaf.rotation.set(leafIndex%2?.45:-.35,a,leafIndex*.17);
          leaf.material=foliage;leaf.parent=parentFor("PROPS");leaf.isPickable=false;
        }
      }
    };
    makeTree.trunk=makeMaterial("horizonTreeBark","#44392f",.7);
    makeTree.leaves=[makeMaterial("horizonPineA",p.style==="snowForest"?"#486d72":"#355f4b",.84),makeMaterial("horizonPineB",p.style==="snowForest"?"#6b9095":"#5c7d5d",.84)];
    makeTree.snow=makeMaterial("horizonSnow","#c3d8df",.94);
    if(["coast","snowForest","estate"].includes(p.style)){
      const count=p.style==="coast"?24:p.style==="snowForest"?46:26;
      for(let i=0;i<count;i++){
        const a=(i+.32*Math.sin(i*3.7+seedBase))/count*Math.PI*2;
        const r=p.style==="coast"?mapRadius+3+seeded(seedBase+i*4.2)*5:p.style==="snowForest"?mapRadius+3+seeded(seedBase+i*4.2)*10:mapRadius+8+seeded(seedBase+i*4.2)*15;
        makeTree(a,r,i,p.style==="snowForest");
      }
    }

    authoredDistrictV2(p,makeMaterial,makeTerrainMaterial,continuousFloor);
    if(p.style==="cavern"){
      // An opaque dome here used to sit across the camera sightline and hide
      // the actual mirror arena. The surrounding rock wall supplies enclosure
      // without placing a ceiling between the DM and the board.
      const crystal=makeMaterial("horizonCaveCrystal",p.crystal??"#176276",.95);
      for(let i=0;i<9;i++){
        const a=i/9*Math.PI*2,r=mapRadius+7+seeded(i*9.2)*8,h=2+seeded(i*8.3)*5;
        const shard=BABYLON.MeshBuilder.CreateCylinder("d8-horizon-crystal",{height:h,diameterTop:0,diameterBottom:.85+seeded(i*7.1)*.8,tessellation:5},scene);
        shard.position.set(Math.cos(a)*r,h/2-.5,Math.sin(a)*r);shard.rotation.z=(seeded(i*8)-.5)*.45;shard.material=crystal;shard.parent=parentFor("PROPS");shard.isPickable=false;
      }
    }
    rt.horizonSummary={style:p.style,skyDiameter,atmosphere:"scene-color-and-worldspace-horizon",sceneColor:scene.clearColor.toHexString(),backgroundMeshes:rt.root.getChildMeshes().filter((m:any)=>m.name.startsWith("d8-horizon")||m.name.startsWith("d8-environment")).length};
  }

  function applyScenePolishV13(id:string,c:any){
    const v=c.VTT_AMBIENCE?.visual??{};
    if(v.glow!==undefined)glow.intensity=v.glow;
    if(v.sceneAmbient){
      const a=v.sceneAmbient;scene.ambientColor=new BABYLON.Color3(a[0],a[1],a[2]);
    }
    if(v.exposure!==undefined)scene.imageProcessingConfiguration.exposure=v.exposure;
    if(v.contrast!==undefined)scene.imageProcessingConfiguration.contrast=v.contrast;
    if(v.fov!==undefined)camera.fov=v.fov;

    polishMaterialsV13(v);

    (v.contactShadows??[]).forEach((o:any,i:number)=>{
      makeOverlayV13(id+"_shadow_"+i,o.position[0],o.position[1],o.size[0],o.size[1],o.color??[0.02,0.015,0.012],o.alpha??0.16,"shadow");
    });
    (v.lightPools??[]).forEach((o:any,i:number)=>{
      makeOverlayV13(id+"_pool_"+i,o.position[0],o.position[1],o.size[0],o.size[1],o.color,o.alpha??0.10,"light");
    });

    trimPointLightsV13(v.maxRealPointLights??5);
  }

  function templeVisibilityPassV34(){
    if(rt.id!=="temple")return;
    // Materials already authored by the stone pass. Do not overwrite glass or
    // flatten their cool/warm lighting with a second blanket colour pass.
    for(const m of rt.root.getChildMeshes())if(m.material?.metadata?.d8Authored)m.receiveShadows=true;
  }

  function mergeStaticDetailMeshesV24(){
    const mergeNames=new Set([
      "artDetail","artIceWall","artCowPatch","artCowEar","artCowHoof","artStallScallop",
      "sanctuaryCanopy","sanctuaryColumnFlute","sanctuaryWallIvy","sanctuaryWallRose","sanctuaryBoundaryRock","sanctuaryLooseStone","sanctuaryVotive","sanctuaryCorbel","sanctuaryCornice","sanctuaryStatueFeather","templeWindowArchVoussoir","templeWindowInnerArchVoussoir","sanctuaryReredosArchVoussoir","sanctuaryAisleArchVoussoir","sanctuaryAisleArchJamb",
      "floorScatter","rock","plantStem","plantLeaf","grassStem","grassLeaf","templeTreeTrunk","templeTreeCrown","waterBankRock","waterReed","templeHedge",
      "templeGardenStem","templeGardenLeaf","tableRoseStem","roseStem",
      "thornBranch","snowBranch","branchSnow","snowPineCanopy","snowPineClump","snowTreeTrunk","snowTreeRootDrift",
      "iceRidge","iceBank","iceFloeUnder","iceFloeTop",
      "bridgePlank","bridgePost","wallTrim","poolStone","rosePetal","roseLeaf",
      "stallPost","stallCounter","stallCounterFront","stallValance",
      "houseCabinetPlate","houseKitchenLeg","houseWindowFrameSide","roseBedCurb","roseBedSnowLip","stallSidePanel","stallDisplayBox","stallDisplayRim","lanternFrame","stoneLanternFrame",
      "cafe12_chairSeat","cafe12_chairBack","cafe12_plate","cafe12_barMug",
      "cafe12_backBottle","cafe12_barJar","cafe12_rearPlate","cafe12_stoolSeat","cafe12_stoolLeg",
      "cafe15_wallBeam","cafe12_ceilingJoistStub"
    ]);
    const groups=new Map<string,any[]>();
    const meshes=rt.root?.getChildMeshes?.()??[];
    for(const m of meshes){
      if(!mergeNames.has(m.name))continue;
      if(!m.material||m.parent===rt.layers?.VFX||m.metadata?.d8Animated||m.isDisposed?.())continue;
      if(m.skeleton||m.morphTargetManager)continue;
      const matId=m.material.uniqueId??m.material.name??"mat";
      // Spatial batches retain local light selection; one map-wide batch would
      // put the books, roses and reliefs back under the lights at its centre.
      m.computeWorldMatrix(true);const p=m.getAbsolutePosition();
      const sector=/^art/.test(m.name)?"|"+Math.floor(p.x/5)+","+Math.floor(p.z/5):"";
      const key=m.name+"|"+matId+sector;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(m);
    }

    let mergedGroups=0,mergedSources=0;
    for(const [key,list] of groups){
      if(list.length<3)continue;
      try{
        list.forEach((m:any)=>m.computeWorldMatrix(true));
        const merged=BABYLON.Mesh.MergeMeshes(list,true,true,undefined,false,false);
        if(!merged)continue;
        merged.name="merged_"+key.split("|")[0]+"_"+mergedGroups;
        merged.parent=parentFor("PROPS");
        merged.isPickable=false;
        merged.receiveShadows=true;
        if(glow.addExcludedMesh)glow.addExcludedMesh(merged);
        mergedGroups++;
        mergedSources+=list.length;
      }catch(err){
      console.warn("[D8 "+D8_VERSION+"] merge skipped",key,err);
      }
    }
    rt.optimization={...(rt.optimization??{}),mergedGroups,mergedSources};
  }

  function reportRuntimeV24(){
    const meshes=rt.root?.getChildMeshes?.()??[];
    const mapLights=(scene.lights??[]).filter((l:any)=>l.parent===rt.root&&!l.isDisposed?.());
    const activeLights=mapLights.filter((l:any)=>l.isEnabled?.()!==false);
    const frozen=meshes.filter((m:any)=>m.isWorldMatrixFrozen).length;
    const vfxMeshes=rt.layers?.VFX?.getChildMeshes?.().length??0;
    console.log("[D8 "+D8_VERSION+" audit]",rt.id,{meshes:meshes.length,frozen,vfxMeshes,lights:mapLights.length,activeLights:activeLights.length,shadowCasters:rt.shadowCasterCount??0,updaters:rt.updaters.length,colliders:rt.colliders.length,interactables:rt.interactables.length,mergedGroups:rt.optimization?.mergedGroups??0,mergedSources:rt.optimization?.mergedSources??0,horizon:rt.horizonSummary??null});
  }

  function optimizeStaticMeshesV24(){
    const dynamicMeshes=new Set<any>();
    (rt.markers.roses??[]).forEach((r:any)=>r.mesh&&dynamicMeshes.add(r.mesh));
    (rt.markers.pools??[]).forEach((r:any)=>r.mesh&&dynamicMeshes.add(r.mesh));
    (rt.markers.magic??[]).forEach((r:any)=>r.mesh&&dynamicMeshes.add(r.mesh));
    const dynamicName=(name:string)=>{
      const q=(name??"").toLowerCase();
      return q.includes("flame")||q.includes("fireouter")||q.includes("fireinner")||q.includes("smoke")||q.includes("ember")||q.includes("lanternglow")||q.includes("icecrystal")||q.includes("marketproduce")||q.includes("goodscrate")||q.includes("rosehead")||q.includes("thornrose")||q.includes("tablerose")||q.includes("templegardenrose");
    };
    rt.root.getChildMeshes().forEach((m:any)=>{
      m.isPickable=false;
      if(m.parent===rt.layers?.VFX||m.metadata?.d8Animated||dynamicMeshes.has(m)||dynamicName(m.name))return;
      try{m.freezeWorldMatrix();}catch{}
    });
  }

  function setupGameplayGeometryV17(c:any){
    const nav=c.MAP.navigation??{};
    rt.navZones=[...(nav.zones??[])];
    rt.navBounds=nav.bounds??null;
    rt.geometryInteractables=[...(nav.interactions??[])];

    (nav.blockers??[]).forEach((q:any)=>collider(q.position[0],q.position[1],q.size[0],q.size[1]));
    // Use the same physical authoring as authoritative grid movement.
    if(nav.obstacles){rt.colliders=[];nav.obstacles.forEach((q:any)=>collider(q.position[0],q.position[1],q.size[0],q.size[1]));}
    rt.navZones.forEach((q:any)=>{if(q.blocking)collider(q.position[0],q.position[1],q.size[0],q.size[1]);});

    const zoneColors:any={
      walkable:[0.18,0.65,0.24],
      entry:[0.20,0.55,0.92],
      bridge:[0.78,0.58,0.18],
      stairs:[0.68,0.56,0.36],
      difficult:[0.82,0.48,0.12],
      water:[0.10,0.46,0.76],
      hazard:[0.78,0.14,0.12],
      blocked:[0.45,0.08,0.08]
    };

    rt.navDebug=[];
    rt.navZones.forEach((q:any,i:number)=>{
      if(!q.size)return;
      const col=zoneColors[q.type]??[0.65,0.65,0.65];
      const m=new BABYLON.StandardMaterial("navZoneMat_"+rt.id+"_"+i,scene);
      m.diffuseColor=new BABYLON.Color3(col[0],col[1],col[2]);
      m.emissiveColor=new BABYLON.Color3(col[0]*0.35,col[1]*0.35,col[2]*0.35);
      m.alpha=q.debugAlpha??0.13;
      m.disableLighting=true;
      m.disableDepthWrite=true;
      m.backFaceCulling=false;
      rt.disposables.push(m);

      const g=BABYLON.MeshBuilder.CreateGround("navZone_"+rt.id+"_"+i,{width:q.size[0],height:q.size[1]},scene);
      g.position.set(q.position[0],0.115,q.position[1]);
      g.material=m;g.parent=parentFor("DEBUG");g.isPickable=false;g.setEnabled(gridVisible);
      rt.navDebug.push(g);
      if(glow.addExcludedMesh)glow.addExcludedMesh(g);
    });
  }

  function navigationZoneAtV17(x:number,z:number){
    let found:any=null;
    for(const q of rt.navZones??[]){
      if(!q.size)continue;
      const hw=q.size[0]/2,hd=q.size[1]/2;
      if(x>=q.position[0]-hw&&x<=q.position[0]+hw&&z>=q.position[1]-hd&&z<=q.position[1]+hd)found=q;
    }
    return found;
  }

  function updateTerrainHudV17(){
    const q=navigationZoneAtV17(player.position.x,player.position.z);
    if(!gridVisible||!q){terrainText.text="";return;}
    const labels:any={walkable:"transitable",entry:"entrada",bridge:"puente",stairs:"escaleras",difficult:"terreno difícil",water:"agua",hazard:"peligro",blocked:"bloqueado"};
    terrainText.text="ZONA · "+(q.label??labels[q.type]??q.type);
  }

  function buildAmbientInspectablesV17(c:any){
    const defs:any={
      bar:["Examinar barra","La barra muestra botellas, utensilios y señales de uso."],
      fireplace:["Examinar chimenea","La chimenea aporta calor, luz y movimiento al espacio."],
      pool:["Examinar estanque","El agua forma un pequeño punto de interés dentro de la sala."],
      wall_shelf:["Examinar estantería","La estantería está cargada de objetos y recipientes."],
      barrel_cluster:["Examinar barriles","Varios barriles ocupan esta zona del escenario."],
      sideboard:["Examinar aparador","El aparador reúne vajilla y pequeños objetos."],
      statue:["Examinar estatua","La estatua domina visualmente esta parte de la estancia."],
      long_table:["Examinar mesa","La mesa ocupa el centro del espacio y organiza la escena."],
      bridge:["Examinar puente","El puente conecta las dos orillas y define la ruta de paso."],
      stairs:["Examinar escaleras","Las escaleras marcan el acceso entre niveles."],
      brazier:["Examinar brasero","El brasero ilumina y calienta el entorno inmediato."],
      chandelier:["Examinar candelabro","El candelabro cuelga sobre la zona principal."],
      house:["Examinar edificio","El edificio estructura el límite principal de la escena."],
      market_stall:["Examinar puesto","El puesto contiene mercancía y estrecha el paso cercano."],
      market_goods:["Examinar mercancías","Cajas y productos se acumulan alrededor del puesto."],
      well:["Examinar pozo","El pozo ocupa una parte del espacio exterior."],
      trough:["Examinar pilón","El pilón es un elemento fijo que condiciona el paso."],
      round_room:["Examinar estancia","La pequeña estancia circular forma un espacio diferenciado."],
      bed:["Examinar cama","La cama ocupa parte del interior del refugio."],
      rose_patch:["Examinar rosales","Los rosales forman una masa densa dentro del jardín."],
      thorn_wall:["Examinar espinos","Los espinos crean una barrera visual y física."],
      snow_tree:["Examinar árbol","El árbol sobresale sobre la nieve."],
      magic_pedestal:["Examinar pedestal","El pedestal concentra la atención de la cueva helada."],
      mirror_frame:["Examinar espejo","El espejo se alza sobre el pedestal."],
      ice_crystal:["Examinar cristal","El cristal emite un brillo frío sobre el hielo."],
      ice_floe:["Examinar placa de hielo","La placa de hielo rompe la continuidad de la superficie."],
      ice_ridge:["Examinar cresta de hielo","La cresta helada forma un límite irregular."],
      water_area:["Examinar agua","La superficie de agua delimita una zona distinta del terreno."]
    };

    const existing=[...(c.CANON?.interactables??[]),...(c.VTT_AMBIENCE?.interactables??[]),...(rt.geometryInteractables??[])];
    const out:any[]=[];
    const objects=c.MAP?.objects??[];
    let serial=0;
    for(const o of objects){
      const d=defs[o.asset];if(!d||!o.position)continue;
      const x=o.position[0],z=o.position[1];
      const duplicate=existing.some((q:any)=>{
        const dx=(q.position?.[0]??999)-x,dz=(q.position?.[1]??999)-z;
        return Math.sqrt(dx*dx+dz*dz)<0.85;
      })||out.some((q:any)=>{
        const dx=q.position[0]-x,dz=q.position[1]-z;
        return Math.sqrt(dx*dx+dz*dz)<0.85;
      });
      if(duplicate)continue;
      out.push({
        id:"auto_"+rt.id+"_"+(serial++),
        position:[x,z],
        radius:o.asset==="long_table"||o.asset==="market_stall"||o.asset==="rose_patch"?1.9:1.5,
        label:d[0],
        message:d[1],
        source:"VTT_AMBIENCE"
      });
    }
    return out;
  }

  function meshesNearV17(pos:number[],radius:number,match?:string[]){
    return rt.root.getChildMeshes().filter((m:any)=>{
      const p=m.getAbsolutePosition?m.getAbsolutePosition():m.position;
      const dx=p.x-pos[0],dz=p.z-pos[1];
      if(dx*dx+dz*dz>radius*radius)return false;
      if(!match?.length)return true;
      const n=(m.name??"").toLowerCase();
      return match.some((q:string)=>n.includes(q.toLowerCase()));
    });
  }

  function lightsNearV17(pos:number[],radius:number){
    return (scene.lights??[]).filter((l:any)=>{
      if(l.parent!==rt.root||!l.position)return false;
      const p=l.getAbsolutePosition?l.getAbsolutePosition():l.position;
      const dx=p.x-pos[0],dz=p.z-pos[1];
      return dx*dx+dz*dz<=radius*radius;
    });
  }

  function rippleV17(pos:number[],color:number[]=[0.20,0.70,0.90],size=0.8){
    const mat=new BABYLON.StandardMaterial("sceneryRippleMat",scene);
    mat.emissiveColor=new BABYLON.Color3(color[0],color[1],color[2]);
    mat.diffuseColor=new BABYLON.Color3(color[0]*0.25,color[1]*0.25,color[2]*0.25);
    mat.alpha=0.78;mat.disableLighting=true;mat.disableDepthWrite=true;
    const ring=BABYLON.MeshBuilder.CreateTorus("sceneryRipple",{diameter:size,thickness:0.055,tessellation:40},scene);
    ring.position.set(pos[0],0.14,pos[1]);ring.material=mat;ring.parent=parentFor("VFX");
    if(glow.addExcludedMesh)glow.addExcludedMesh(ring);
    rt.disposables.push(mat,ring);
    const born=elapsed;
    rt.updaters.push(()=>{
      if(ring.isDisposed?.())return;
      const age=elapsed-born;
      if(age>1.25){ring.dispose();mat.dispose();return;}
      const k=1+age*2.4;ring.scaling.set(k,k,k);mat.alpha=Math.max(0,0.78*(1-age/1.25));
    });
  }

  function pulseV17(pos:number[],color:number[]=[1,0.55,0.18],radius=4.0){
    const light=track(new BABYLON.PointLight("sceneryPulseLight",new BABYLON.Vector3(pos[0],1.1,pos[1]),scene));
    light.parent=rt.root;light.diffuse=new BABYLON.Color3(color[0],color[1],color[2]);light.range=radius;light.intensity=0;
    const born=elapsed;
    rt.updaters.push(()=>{
      if(light.isDisposed?.())return;
      const age=elapsed-born;
      if(age>1.0){light.dispose();return;}
      light.intensity=Math.sin(Math.PI*Math.min(1,age))*0.75;
    });
  }

  function performSceneryActionV17(q:any){
    show(q.message??q.label??"");
    const a=q.action;if(!a)return;
    const pos=q.position??[player.position.x,player.position.z];
    const radius=a.radius??2.5;

    if(a.type==="ripple"){
      rippleV17(pos,a.color??[0.20,0.70,0.90],a.size??0.9);
      return;
    }
    if(a.type==="pulse"){
      pulseV17(pos,a.color??[1,0.55,0.18],a.range??4.0);
      return;
    }
    if(a.type==="toggle_local"){
      const state=!(rt.interactionState[q.id]??false);
      rt.interactionState[q.id]=state;
      if(a.lights!==false){
        lightsNearV17(pos,radius).forEach((l:any)=>l.setEnabled(!state));
      }
      if(a.meshMatch?.length){
        meshesNearV17(pos,radius,a.meshMatch).forEach((m:any)=>m.setEnabled(!state));
      }
      show(state?(a.offMessage??"La fuente se apaga."):(a.onMessage??"La fuente vuelve a encenderse."));
      return;
    }
    if(a.type==="nudge"){
      const targets=meshesNearV17(pos,radius,a.meshMatch??[]);
      const born=elapsed;
      const bases=targets.map((m:any)=>({m,y:m.position.y,ry:m.rotation?.y??0}));
      rt.updaters.push(()=>{
        const age=elapsed-born;if(age>1.15)return;
        const wave=Math.sin(age*10)*Math.max(0,1-age/1.15);
        bases.forEach((b:any,i:number)=>{
          if(b.m.isDisposed?.())return;
          b.m.position.y=b.y+wave*0.035*(1+(i%3)*0.15);
          if(b.m.rotation)b.m.rotation.y=b.ry+wave*0.035;
        });
      });
      return;
    }
  }

  // Presentation derives from the authoritative snapshot, never a second set
  // of encounter flags. Roofs are removed only while the viewed actor is inside.
  function gentleWater(name:string,x:number,z:number,w:number,d:number,y:number){
    const surface=BABYLON.MeshBuilder.CreateGround(name,{width:w,height:d,subdivisions:12,updatable:true},scene);surface.position.set(x,y,z);surface.parent=parentFor('VFX');surface.isPickable=false;surface.metadata={d8Animated:true,tokenOccluder:false};
    const paint=track(cloneSurfaceMaterial(M.water,name+'Material'));paint.alpha=.72;paint.specularPower=120;paint.specularColor=new BABYLON.Color3(.55,.66,.7);paint.bumpTexture=PROCEDURAL_SURFACES.ice?.normal??null;surface.material=paint;
    const positions=surface.getVerticesData('position'),base=positions.slice();let last=-1;
    rt.updaters.push((t:number)=>{const tick=Math.floor(t*24);if(tick===last)return;last=tick;for(let i=0;i<positions.length;i+=3)positions[i+1]=Math.sin(base[i]*4.2+t*1.4)*.009+Math.sin(base[i+2]*6.1-t*.8)*.005;surface.updateVerticesData('position',positions,false,false);});
    for(let i=0;i<4;i++){
      const paths=[0,1].map(side=>Array.from({length:15},(_,j)=>new BABYLON.Vector3(x+(j/14-.5)*w,y+.023,z+(i/4-.375)*d+Math.sin(j*.7+i)*d*.05+side*.035)));
      const streak=BABYLON.MeshBuilder.CreateRibbon(name+'Caustic',{pathArray:paths,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene);streak.parent=parentFor('VFX');streak.isPickable=false;streak.metadata={d8Animated:true,tokenOccluder:false};streak.material=M.waterGlow;
      rt.updaters.push((t:number)=>{streak.visibility=.07+.05*Math.sin(t*.7+i);streak.position.z=Math.sin(t*.2+i)*d*.035;});
    }
  }

  function batchIntegratedScenery(){
    if(!integrated)return;
    const groups=new Map<string,any[]>();
    for(const mesh of rt.root.getChildMeshes()){
      const mat=mesh.material;
      const envelope=Boolean(mesh.metadata?.buildingEnvelope&&/^temple(Window.*(Voussoir|Jamb|Frame)|WallPilaster)/.test(mesh.name));
      if((!envelope&&(!mesh.isWorldMatrixFrozen||mesh.metadata?.d8Animated))||!mat||mat.alpha<1||mesh.parent===rt.layers.VFX||mesh.skeleton||mesh.morphTargetManager||mesh.subMeshes?.length>1||mesh.isVisible===false)continue;
      if(/floor|ground|water|grid|shadow|pool|sign|glass|lamp|glow|crystal/i.test(mesh.name)||(!envelope&&/window/i.test(mesh.name)))continue;
      const p=mesh.getBoundingInfo().boundingBox.centerWorld;
      const sector=envelope?4:8;
      const key=[mat.uniqueId,Math.floor(p.x/sector),Math.floor(p.z/sector),mesh.receiveShadows,mesh.metadata?.tokenOccluder!==false,envelope].join('|');
      const list=groups.get(key)??[];list.push(mesh);groups.set(key,list);
    }
    let count=0;
    for(const list of groups.values())if(list.length>=3){
      const merged=BABYLON.Mesh.MergeMeshes(list,true,true,undefined,false,false);
      if(!merged)continue;
      merged.name='d8-static-sector-'+count++;merged.parent=parentFor('PROPS');merged.isPickable=false;merged.receiveShadows=list[0].receiveShadows;merged.metadata={tokenOccluder:list[0].metadata?.tokenOccluder!==false,buildingEnvelope:Boolean(list[0].metadata?.buildingEnvelope)};merged.freezeWorldMatrix();glow.addExcludedMesh(merged);
    }
    rt.presentationNodes.envelopes=rt.root.getChildMeshes().filter((m:any)=>m.metadata?.buildingEnvelope);
  }
  function windowGlass(){
    if(rt.windowPane)return rt.windowPane;
    const mat=track(new BABYLON.StandardMaterial('transparentWindowPane',scene));mat.diffuseColor=new BABYLON.Color3(.72,.85,.86);mat.alpha=.22;mat.specularColor=new BABYLON.Color3(.6,.7,.75);mat.specularPower=96;mat.backFaceCulling=false;mat.disableDepthWrite=true;
    return rt.windowPane=mat;
  }
  function facade(name:string,x:number,z:number,w:number,h:number,depth:number,mat:any,holes:any[]){
    let left=x-w/2;
    const piece=(a:number,b:number,bottom:number,top:number)=>{if(b-a<.01||top-bottom<.01)return;const m=box(name,(a+b)/2,(bottom+top)/2,z,b-a,top-bottom,depth,mat);m.metadata={...m.metadata,d8Animated:true,buildingEnvelope:true};};
    for(const hole of [...holes].sort((a,b)=>a.x-b.x)){const a=hole.x-hole.w/2,b=hole.x+hole.w/2;piece(left,a,0,h);piece(a,b,0,hole.b);piece(a,b,hole.t,h);left=b;}
    piece(left,x+w/2,0,h);
  }
  function nativeDoor(door:any){
    const root=new BABYLON.TransformNode(door.id+'-frame',scene);root.parent=parentFor('PROPS');root.position.set(door.x,0,door.z);root.rotation.y=door.rotation;
    const hinge=new BABYLON.TransformNode(door.id+'-hinge',scene);hinge.parent=root;hinge.position.x=-door.width/2;hinge.rotation.y=Math.PI/2;
    const leaf=box('houseDoor',0,0,0,door.width,door.height,.14,M.woodDark);leaf.parent=hinge;leaf.position.set(door.width/2,door.height/2,0);leaf.metadata={d8Animated:true,tokenOccluder:true};
    for(const y of [.3,door.height-.3]){const strap=box('doorIronStrap',0,0,0,door.width*.94,.075,.16,M.iron);strap.parent=hinge;strap.position.set(door.width/2,y,-.025);strap.metadata={d8Animated:true};}
    const handle=box('doorHandle',0,0,0,.10,.2,.2,M.gold);handle.parent=hinge;handle.position.set(door.width-.2,door.height*.5,-.11);handle.metadata={d8Animated:true};
    for(const side of [-1,1]){const jamb=box('houseDoorJamb',0,0,0,.13,door.height+.12,.22,M.woodLight);jamb.parent=root;jamb.position.set(side*(door.width/2+.1),door.height/2,0);jamb.metadata={d8Animated:true,buildingEnvelope:true};}
    const lintel=box('houseDoorLintel',0,0,0,door.width+.32,.18,.24,M.woodLight);lintel.parent=root;lintel.position.set(0,door.height+.08,0);lintel.metadata={d8Animated:true,buildingEnvelope:true};
    (rt.nativeDoors??=[]).push({id:door.id,hinge,leaf,root,angle:Math.PI/2});
  }
  function finalPresentationPass(c:any){
    rt.nativeDoors=[];
    for(const door of c.MAP.doors??[])nativeDoor(door);
    const meshes=rt.root.getChildMeshes();
    const source=meshes.find((m:any)=>m.name===(rt.id==='cafe'?'cafe33_floor':'floor'));
    const yard=meshes.find((m:any)=>/exterioryard/i.test(m.name));
    const surface=rt.id==='cafe'?(yard??source):source;
    if(rt.id==='mirror'&&source){
      source.material.diffuseTexture=PROCEDURAL_SURFACES.snow?.texture??source.material.diffuseTexture;
      source.material.bumpTexture=PROCEDURAL_SURFACES.snow?.normal??null;
      source.material.diffuseColor=new BABYLON.Color3(.78,.89,.95);
    }
    if(surface){
      surface.receiveShadows=true;
      for(const m of meshes.filter((q:any)=>/^d8-horizon-(continuous-floor|island|cave-apron)$/.test(q.name))){
        m.material=surface.material;m.receiveShadows=true;
      }
      const foundation=meshes.find((m:any)=>m.name==='terrainFoundation');
      if(foundation)foundation.setEnabled(false);
      if(rt.id!=='temple'&&rt.id!=='cafe'){
        const [w,d]=c.MAP.size,nx=Math.ceil(w/4),nz=Math.ceil(d/4),tw=w/nx,td=d/nz,margin=3;
        for(let ix=-margin;ix<nx+margin;ix++)for(let iz=-margin;iz<nz+margin;iz++){
          if(ix>=0&&ix<nx&&iz>=0&&iz<nz)continue;
          const tile=BABYLON.MeshBuilder.CreateGround('d8-continuous-ground-patch',{width:tw,height:td},scene);
          const uv=tile.getVerticesData('uv');for(let i=0;i<uv.length;i+=2){uv[i]=(ix+uv[i])/nx;uv[i+1]=(iz+uv[i+1])/nz;}tile.setVerticesData('uv',uv);
          tile.position.set(-w/2+(ix+.5)*tw,0,-d/2+(iz+.5)*td);tile.material=surface.material;tile.parent=parentFor('BASE');tile.receiveShadows=true;tile.isPickable=false;tile.metadata={tokenOccluder:false};
        }
      }
    }
    const roof=(name:string,x:number,z:number,w:number,d:number,h:number)=>{
      const pitch=.32,rise=Math.tan(pitch)*w*.5;
      for(const side of [-1,1]){
        const m=box(name,x+side*w*.25,h+rise*.5,z,w*.55/Math.cos(pitch),.16,d*1.07,M.roof);
        m.rotation.z=-side*pitch;m.metadata={...m.metadata,d8Animated:true,interiorRoof:{x,z,w,d},tokenOccluder:true};
      }
      for(const end of [-1,1]){
        const mesh=new BABYLON.Mesh(name+'Gable',scene),data=new BABYLON.VertexData(),zz=z+end*d/2;
        data.positions=[x-w/2,h,zz,x+w/2,h,zz,x,h+rise,zz];data.indices=end<0?[0,2,1]:[0,1,2];const normals:number[]=[];BABYLON.VertexData.ComputeNormals(data.positions,data.indices,normals);data.normals=normals;data.uvs=[0,0,1,0,.5,1];data.applyToMesh(mesh);mesh.material=M.wood;mesh.parent=parentFor('PROPS');mesh.material.backFaceCulling=false;mesh.metadata={d8Animated:true,interiorRoof:{x,z,w,d},tokenOccluder:true};
      }
    };
    if(rt.id==='cafe')roof('cafeInteriorRoof',0,0,24,15.8,3.2);
    if(rt.id==='temple')roof('templeInteriorRoof',0,-.45,28.2,17.3,5.6);
    if(rt.id==='garden'){
      const room=c.MAP.objects.find((o:any)=>o.asset==='round_room');
      if(room){const [x,z]=room.position,r=room.radius??3.3;
        const m=BABYLON.MeshBuilder.CreateCylinder('fritzInteriorRoof',{diameterTop:0,diameterBottom:r*2.2,height:1.7,tessellation:12},scene);
        m.position.set(x,3.4,z);m.material=M.roof;m.parent=parentFor('PROPS');m.isPickable=false;
        m.metadata={d8Animated:true,interiorRoof:{x,z,w:r*2,d:r*2,radius:r},tokenOccluder:true};
      }
    }
    const signs=rt.id==='temple'?[{x:0,z:31.5,label:'CAMINO DEL PUEBLO'}]:rt.id==='cafe'?[{x:0,z:11,label:'CALLES DEL PUEBLO'}]:rt.id==='market'?[{x:0,z:9,label:'PLAZA DEL MERCADO'}]:[];
    for(const sign of signs){
      const x=sign.x+.55,z=sign.z+.45;
      box('readableSignPost',x,.70,z,.10,1.4,.10,M.woodDark);
      const board=box('readableSignBoard',x,1.35,z,.95,.45,.09,M.woodLight);
      board.metadata={tokenOccluder:false};
      const texture=track(new BABYLON.DynamicTexture('readableSignText',{width:512,height:256},scene,false)),ctx:any=texture.getContext();
      ctx.fillStyle='#654427';ctx.fillRect(0,0,512,256);ctx.fillStyle='#f5dfb0';ctx.textAlign='center';ctx.font='bold 32px serif';ctx.fillText(sign.label,256,110);ctx.font='28px serif';ctx.fillText('LEER · 5 CASILLAS',256,165);texture.update(false);
      const paint=track(new BABYLON.StandardMaterial('readableSignPaint',scene));paint.diffuseTexture=texture;paint.emissiveColor=new BABYLON.Color3(.12,.09,.05);paint.backFaceCulling=true;
      const face=BABYLON.MeshBuilder.CreatePlane('readableSignFace',{width:.93,height:.44},scene);face.parent=parentFor('PROPS');face.position.set(x,1.35,z-.05);face.material=paint;face.isPickable=false;face.metadata={tokenOccluder:false};
      const back=face.clone('readableSignBack');back.position.z=z+.05;back.rotation.y=Math.PI;
    }
    for(const m of rt.root.getChildMeshes())if(m.metadata?.interiorRoof)m.metadata.d8Animated=true;
    for(const m of rt.root.getChildMeshes()){
      if(/^(templeWall|templeWindow|lowWall|house(BackWall|FrontWall|LeftWall|RightWall|Body|Beam|Door|Window|Roof|Gable)|roof[AB]|windowGlow|roundRoom(Wall|Cap)|cafe12_(wall|frontWall|entryPier|cutawayEave|ceilingJoist|entryLintel|frontWindow))/.test(m.name))m.metadata={...m.metadata,d8Animated:true,buildingEnvelope:true};
      if(/^(cafe12_)?(chair|table|barTop|sofa|bench)|^(stallCanopy|stallValance|artStallScallop)/.test(m.name)||/^chair$/.test(m.parent?.name??''))m.metadata={...m.metadata,d8Animated:true,furnitureCutaway:true};
    }
    const seat=rt.id==='cafe'?{x:-5.3,z:1.9,id:'woman-cafe'}:rt.id==='dinner'?{x:0,z:1.4,id:'anteros-dinner'}:rt.id==='temple'?{x:4.35,z:.8,id:'anteros-temple'}:null;
    if(seat)for(const node of rt.root.getChildTransformNodes())if(/^(chair|cafe12_chair)$/.test(node.name)&&Math.hypot(node.position.x-seat.x,node.position.z-seat.z)<.15){
      node.metadata={seatedActor:seat.id};for(const child of node.getChildMeshes())child.metadata={...child.metadata,d8Animated:true};
    }
    // Light pools keep tiny candle flames legible even on a large ground mesh;
    // real point lights still illuminate local walls and furniture.
    for(const light of scene.lights.filter((l:any)=>l.parent===rt.root&&/candel|candle|torch|lantern|window/i.test(l.name))){
      const p=light.position;
      makeOverlayV13('lampPool',p.x,p.z,Math.min(4,light.range*.7),Math.min(4,light.range*.7),[1,.52,.20],.15,'light');
    }
    rt.dayLightBases=new Map(scene.lights.filter((l:any)=>/Hemispheric|Directional/.test(l.getClassName())).map((l:any)=>[l,{intensity:l.intensity,color:l.diffuse.clone()}]));
    // Cache authored visibility nodes once; do not traverse the whole scenery
    // several times on every frame, especially on a mobile player.
    rt.presentationNodes={chairs:rt.root.getChildTransformNodes().filter((n:any)=>n.metadata?.seatedActor),mirrorNodes:rt.root.getChildTransformNodes().filter((n:any)=>n.metadata?.authoredPropId==='true-love-mirror'),mirrorMeshes:rt.root.getChildMeshes().filter((m:any)=>m.metadata?.authoredPropId==='true-love-mirror'),roofs:rt.root.getChildMeshes().filter((m:any)=>m.metadata?.interiorRoof),envelopes:rt.root.getChildMeshes().filter((m:any)=>m.metadata?.buildingEnvelope),furniture:rt.root.getChildMeshes().filter((m:any)=>m.metadata?.furnitureCutaway),snow:rt.root.getChildMeshes().filter((m:any)=>/snowflake/i.test(m.name)),mirrorLight:scene.lights.find((l:any)=>l.name==='mirrorRelicLight')};
    rt.presentationPhase=null;
  }

  function prepareClimatePresentation(){
    const meshes=rt.root.getChildMeshes(),rooms=(rt.presentationNodes?.roofs??[]).map((m:any)=>m.metadata.interiorRoof);
    const inside=(p:any)=>rooms.some((room:any)=>room.radius?Math.hypot(p.x-room.x,p.z-room.z)<room.radius:Math.abs(p.x-room.x)<room.w/2&&Math.abs(p.z-room.z)<room.d/2);
    const surfaces=new Map(),glasses=new Map();rt.weatherMaterials=[];rt.lampMaterials=[];rt.localLightBases=[];rt.outdoorFlames=[];rt.lightPools=[];
    for(const m of meshes){
      m.computeWorldMatrix(true);const p=m.getBoundingInfo().boundingBox.centerWorld,mat=m.material;
      if(!mat?.diffuseColor||mat.disableLighting||m.metadata?.d8Billboard||/water|flame|fire|smoke|spark|snow|sky|fog|pool|grid|torch|lantern|windowglow|glass/i.test(m.name))continue;
      const exterior=!inside(p)||/roof|gable|exteriorYard|d8-horizon-(continuous-floor|island|cave-apron)/i.test(m.name);
      if(!exterior||rt.id==='mirror')continue;
      const snowExposure=/roof|ground|floor|yard|patio|leaf|foliage|cap|snow|d8-horizon-(island|cave-apron)/i.test(m.name)?1:.22,key=`${mat.uniqueId}:${snowExposure}`;
      let entry=surfaces.get(key);if(!entry){const clone=track(cloneSurfaceMaterial(mat,`${mat.name}:outdoorClimate`));entry={material:clone,color:mat.diffuseColor.clone(),specular:mat.specularColor?.clone(),power:mat.specularPower??64,snowExposure};surfaces.set(key,entry);rt.weatherMaterials.push(entry);}
      m.material=entry.material;
    }
    for(const m of meshes){
      const p=m.getBoundingInfo().boundingBox.centerWorld;
      if(/lampPool/i.test(m.name))rt.lightPools.push({mesh:m,indoor:inside(p)});
      if(!inside(p)&&/flame|fireOuter|fireInner/i.test(m.name))rt.outdoorFlames.push(m);
      if(!inside(p)&&/window[-_]?glow|lanternGlass|lantern-amber-glass|frontWindowGlass|LanternGlow|stoneLanternGlow|art(Town)?Window|FestoonGlow|door-lantern/i.test(m.name)&&m.material?.emissiveColor){
        const mat=m.material;let entry=glasses.get(mat.uniqueId);if(!entry){const clone=track(cloneSurfaceMaterial(mat,`${mat.name}:daylight`));const emission=mat.emissiveColor.clone();if(/lantern/i.test(m.name)){emission.set(1,.65,.22);clone.alpha=1;}entry={material:clone,emissive:emission,color:mat.diffuseColor.clone()};glasses.set(mat.uniqueId,entry);rt.lampMaterials.push(entry);}m.material=entry.material;
      }
    }
    for(const light of scene.lights){if(!/Hemispheric|Directional/.test(light.getClassName())&&light.position&&light.parent===rt.root&&light.name!=='mirrorRelicLight')rt.localLightBases.push({light,intensity:light.intensity,indoor:inside(light.position)});}
    rt.weatherAmount=0;rt.wetAmount=0;rt.snowAmount=0;rt.weatherTarget=0;rt.weatherKind='none';rt.outdoorLampFactor=1;
    rt.climateSkyBase=scene.clearColor.clone();rt.climateFogBase=scene.fogColor.clone();
    if(rt.id==='market'){
      const rope=BABYLON.MeshBuilder.CreateLines('marketCowLead',{points:[BABYLON.Vector3.Zero(),BABYLON.Vector3.One(),new BABYLON.Vector3(2,0,0)],updatable:true},scene);rope.parent=rt.root;rope.color=new BABYLON.Color3(.67,.49,.26);rope.isPickable=false;rt.cowLead=rope;
    }else rt.cowLead=null;
  }
  function updateClimateMaterials(dt:number){
    if(!rt.weatherMaterials)return;
    const amounts=advanceD8WeatherSurface(rt.wetAmount,rt.snowAmount,rt.weatherKind,rt.weatherTarget,dt);rt.wetAmount=amounts.wet;rt.snowAmount=amounts.snow;
    if(Math.abs(rt.wetAmount-(rt.wetApplied??-1))>.003||Math.abs(rt.snowAmount-(rt.snowApplied??-1))>.003){for(const base of rt.weatherMaterials){
      const snow=rt.snowAmount,wet=rt.wetAmount;
      base.material.diffuseColor=BABYLON.Color3.Lerp(base.color.scale(1-wet*.30),new BABYLON.Color3(.91,.96,1),snow*.78*base.snowExposure);
      if(base.specular)base.material.specularColor=BABYLON.Color3.Lerp(base.specular,new BABYLON.Color3(.38,.43,.49),wet*.8);
      base.material.specularPower=base.power+wet*96;
    }
    rt.wetApplied=rt.wetAmount;rt.snowApplied=rt.snowAmount;}
    for(const door of rt.nativeDoors??[]){const target=door.closed?0:Math.PI/2;door.angle+=(target-door.angle)*(1-Math.exp(-dt*12));door.hinge.rotation.y=door.angle;}
    for(const base of rt.localLightBases??[])base.light.intensity=base.intensity;
  }
  function applyClimateLights(){
    for(const base of rt.localLightBases??[])base.light.intensity*=base.indoor?1:rt.outdoorLampFactor;
    for(const m of rt.outdoorFlames??[])m.visibility=rt.outdoorLampFactor;
    for(const item of rt.lightPools??[])item.mesh.visibility=item.indoor?1:rt.outdoorLampFactor;
  }

  function setViewContext(view:any){
    if(!rt.root||!view.focus)return false;
    let indoor=rt.id==='mirror';
    rt.windIntensity=view.environment?.windIntensity??.2;
    rt.weatherKind=view.environment?.precipitation??(view.environment?.storm?'rain':'none');
    rt.weatherTarget=rt.weatherKind==='none'?0:(view.environment?.precipitationLevel??2)/3;
    const nodes=rt.presentationNodes;
    if(!nodes)return indoor;
    const activeRoom=nodes.roofs.map((m:any)=>m.metadata.interiorRoof).find((room:any)=>room.radius?Math.hypot(view.focus.x-room.x,view.focus.z-room.z)<room.radius-.1:Math.abs(view.focus.x-room.x)<room.w/2-.2&&Math.abs(view.focus.z-room.z)<room.d/2-.2);
    indoor ||= Boolean(activeRoom);
    // Architecture may obstruct the focused character even when they are
    // outside it at a low camera angle. Fade that envelope, never furniture
    // or its movement collider; the same real depth buffer remains in use.
    let sight:any=null;
    if(view.cameraPosition){const aim=new BABYLON.Vector3(view.focus.x,view.focus.y+.9,view.focus.z),direction=aim.subtract(view.cameraPosition),length=direction.length();sight=new BABYLON.Ray(view.cameraPosition,direction.normalize(),length);}
    const obstructs=(m:any)=>Boolean(sight&&sight.intersectsMesh(m,true).hit);
    for(const m of nodes.envelopes){
      const center=m.getBoundingInfo().boundingBox.centerWorld,room=activeRoom,camera=view.cameraPosition;
      const foreground=room&&camera&&(center.x-room.x)*(camera.x-view.focus.x)+(center.z-room.z)*(camera.z-view.focus.z)>0;
      m.visibility=foreground?.06:room&&obstructs(m)?.12:1;
    }
    if(view.cameraPosition){
      const rays=[.25,.75,1.3].map(h=>{const aim=new BABYLON.Vector3(view.focus.x,view.focus.y+h,view.focus.z),d=aim.subtract(view.cameraPosition),length=d.length();return new BABYLON.Ray(view.cameraPosition,d.normalize(),length);});
      for(const m of nodes.furniture){const p=m.getBoundingInfo().boundingBox.centerWorld,near=Math.hypot(p.x-view.focus.x,p.z-view.focus.z)<2.6;m.visibility=near&&rays.some(r=>r.intersectsMesh(m,true).hit)?.35:1;}
    }
    for(const native of rt.nativeDoors??[]){const door=(view.props??[]).find((p:any)=>p.id===native.id);native.closed=door?.state==='closed';native.root.setEnabled(door?.structure!=='destroyed');}
    if(rt.cowLead){const ben=view.actorPositions?.['ben-market'],cow=view.actorPositions?.['cow-market'];const near=ben&&cow&&Math.hypot(ben.x-cow.x,ben.z-cow.z)<3.5;rt.cowLead.setEnabled(Boolean(near));if(near){const a=new BABYLON.Vector3(ben.x+.25,ben.y+.68,ben.z),b=new BABYLON.Vector3(cow.x-.45,cow.y+.77,cow.z);BABYLON.MeshBuilder.CreateLines('marketCowLead',{points:[a,BABYLON.Vector3.Lerp(a,b,.5).add(new BABYLON.Vector3(0,-.14,0)),b],instance:rt.cowLead},scene);}}
    for(const node of nodes.chairs){
      const id=node.metadata.seatedActor,seat=(view.seats??[]).find((s:any)=>s.id===id),actor=(view.entities??[]).find((e:any)=>e.id===id);
      node.setEnabled(Boolean(view.combat||!actor||actor.moving||!seat||actor.cell.col!==seat.cell.col||actor.cell.row!==seat.cell.row));
    }
    if(view.environment?.precipitation!==undefined)for(const m of nodes.snow)m.setEnabled(false);
    for(const m of nodes.roofs){
      const room=m.metadata?.interiorRoof;
      if(room){const inside=room.radius?Math.hypot(view.focus.x-room.x,view.focus.z-room.z)<room.radius
        :Math.abs(view.focus.x-room.x)<room.w/2&&Math.abs(view.focus.z-room.z)<room.d/2;
        m.setEnabled(!inside);m.visibility=1;indoor ||= inside;
      }
    }
    const mirror=(view.props??[]).find((p:any)=>p.id==='true-love-mirror');
    if(mirror){
      for(const node of nodes.mirrorNodes)node.setEnabled(mirror.structure!=='destroyed');
      for(const m of nodes.mirrorMeshes)m.setEnabled(mirror.structure!=='destroyed');
      if(nodes.mirrorLight)nodes.mirrorLight.setEnabled(mirror.structure!=='destroyed');
    }
    const requested=view.environment?.timeOfDay??'auto',phase=requested==='auto'?(rt.id==='cafe'?'sunset':'authored'):requested;
    if(rt.presentationPhase===phase)return indoor;
    rt.presentationPhase=phase;
    const factor=phase==='night' ? .28 : phase==='sunset' ? .90 : phase==='dawn' ? .57 : phase==='day' ? 1.6 : 1;
    const tint=phase==='sunset'?new BABYLON.Color3(1,.70,.40):phase==='dawn'?new BABYLON.Color3(.72,.79,1):phase==='night'?new BABYLON.Color3(.48,.62,1):new BABYLON.Color3(1,1,.93);
    for(const [light,base] of rt.dayLightBases??[]){light.intensity=base.intensity*factor;light.diffuse=base.color.multiply(tint);}
    rt.outdoorLampFactor=phase==='day'?0:phase==='dawn'?.55:1;
    for(const base of rt.lampMaterials??[]){base.material.emissiveColor=base.emissive.scale(rt.outdoorLampFactor);base.material.diffuseColor=BABYLON.Color3.Lerp(new BABYLON.Color3(.34,.40,.43),base.color,rt.outdoorLampFactor);}
    if(rt.climateSkyBase){const sky=phase==='day'?new BABYLON.Color4(.50,.69,.80,1):phase==='sunset'?new BABYLON.Color4(.48,.30,.20,1):phase==='dawn'?new BABYLON.Color4(.22,.29,.43,1):phase==='night'?new BABYLON.Color4(.035,.055,.09,1):rt.climateSkyBase;scene.clearColor=sky;scene.fogColor=new BABYLON.Color3(sky.r,sky.g,sky.b);}
    return indoor;
  }
  function weatherCovered(x:number,z:number){
    if(rt.id==='mirror')return true;
    return (rt.presentationNodes?.roofs??[]).some((mesh:any)=>{const room=mesh.metadata.interiorRoof;return room.radius?Math.hypot(x-room.x,z-room.z)<room.radius:Math.abs(x-room.x)<room.w/2&&Math.abs(z-room.z)<room.d/2;});
  }

  function loadMap(id:string){
    const c=D8NIGHT.maps[id];if(!c)return;
    reset(id,c);
    rt.windowPane=null;
    applyProceduralMaterialSurfaces();
    if(id==="cafe"&&c.MAP.renderMode==="tavern_v34"){
      buildTavernV34(c);
      graphicsV18(c);
      lightingV19(c);
      grid(c);
      authoredLandscape(c);
      authoredHorizonV1(c);
      applyScenePolishV13(id,c);
      finalPresentationPass(c);
      mergeStaticDetailMeshesV24();
    }else{
      env(c);
      graphicsV18(c);
      floor(c);
      visualComposition(c);
      grid(c);
      c.MAP.objects.forEach(asset);
      applyReadableFallback(c);
      templeMaterialPassV34();
      lights(c);
      lightingV19(c);
      vfx(c);
      authoredLandscape(c);
      authoredHorizonV1(c);
      applyScenePolishV13(id,c);
      templeVisibilityPassV34();
      finalPresentationPass(c);
      mergeStaticDetailMeshesV24();
    }
    balanceSanctuaryLights();
    setupGameplayGeometryV17(c);
    optimizeStaticMeshesV24();
    prepareClimatePresentation();
    batchIntegratedScenery();
    shadows(c);
    // In-game glow draws only actual light sources, not every weakly emissive
    // stone/wood surface. Avoid a second full diorama pass per frame.
    if(integrated)for(const mesh of rt.root.getChildMeshes()){
      if(/flame|fireinner|fireouter|lanternglow|festoonGlow|crystal|magicmote|ember|waterGlow/i.test(mesh.name))glow.addIncludedOnlyMesh(mesh);
    }
    const autoInspectables=buildAmbientInspectablesV17(c);
    rt.interactables=integrated?[]:[...(c.CANON?.interactables??[]),...(c.VTT_AMBIENCE.interactables??[]),...(rt.geometryInteractables??[]),...autoInspectables];
    reportRuntimeV24();
    player.position.set(c.spawn[0],c.spawn[1],c.spawn[2]);
    const mapSpan=Math.max(c.MAP.size[0],c.MAP.size[1]);
    camera.upperRadiusLimit=Math.max(34,mapSpan*1.35);
    if(overview){
      camera.radius=Math.min(camera.upperRadiusLimit,mapSpan*1.05);
      camera.beta=0.46;
      camera.alpha=c.camera?.alpha??-Math.PI/2.15;
    }else if(c.camera){
      camera.radius=Math.min(camera.upperRadiusLimit,c.camera.radius??20);
      camera.beta=c.camera.beta??0.70;
      camera.alpha=c.camera.alpha??-Math.PI/2.15;
    }
    const camOff=c.camera?.targetOffset??[0,0,0];
    camera.target.set(player.position.x+(camOff[0]??0),camOff[1]??0,player.position.z+(camOff[2]??0));ring.isVisible=false;
    title.text=c.label+" · "+D8_VERSION;
    if(id==="cafe")console.log("[D8 "+D8_VERSION+"] Taberna meshes:",rt.root.getChildMeshes().length,"scene lights:",scene.lights.length);
    Object.keys(buttons).forEach(k=>buttons[k].background=k===id?"#765127":"#25252a");
    show("Mapa cargado: "+c.label);
  }

  const keys:any={};
  if(!integrated)scene.onKeyboardObservable.add((kb:any)=>{
    const e=kb.event as KeyboardEvent;
    const k=e.key.toLowerCase();
    if(kb.type===BABYLON.KeyboardEventTypes.KEYDOWN){
      keys[k]=true;
      if(e.repeat)return;
      if(k>="1"&&k<="6")loadMap(order[Number(k)-1]);
      if(k==="e"&&nearest)performSceneryActionV17(nearest);
      if(k==="g"){
        gridVisible=!gridVisible;
        if(rt.grid)rt.grid.setEnabled(gridVisible);
        (rt.navDebug??[]).forEach((m:any)=>m.setEnabled(gridVisible));
        show(gridVisible?"Grid + geometría VTT":"Grid oculto");
      }
      if(k==="c"){
        overview=!overview;
        const cfg=rt.config?.camera??{};
        const size=rt.config?.MAP?.size??[24,16];
        if(overview){camera.radius=Math.max(size[0],size[1])*1.05;camera.beta=0.46;}
        else{camera.radius=cfg.radius??20;camera.beta=cfg.beta??0.70;camera.alpha=cfg.alpha??-Math.PI/2.15;}
        show(overview?"Cámara general":"Cámara de escena");
      }
    }else if(kb.type===BABYLON.KeyboardEventTypes.KEYUP){
      keys[k]=false;
    }
  });

  const radius=0.32;
  function blocked(x:number,z:number){
    const b=rt.navBounds;
    if(b){
      if(x<b[0]+radius||x>b[1]-radius||z<b[2]+radius||z>b[3]-radius)return true;
    }else{
      const ms=rt.config.MAP.size;
      if(x<-ms[0]/2+radius||x>ms[0]/2-radius||z<-ms[1]/2+radius||z>ms[1]/2-radius)return true;
    }
    for(const c of rt.colliders)if(x>=c.minX-radius&&x<=c.maxX+radius&&z>=c.minZ-radius&&z<=c.maxZ+radius)return true;
    return false;
  }
  function interaction(){nearest=null;ip.isVisible=false;ring.isVisible=false;const zone=navigationZoneAtV17(player.position.x,player.position.z);player.metadata={...(player.metadata??{}),vttZone:zone?.label??zone?.type??null};let best=Infinity;rt.interactables.forEach((q:any)=>{const dx=player.position.x-q.position[0],dz=player.position.z-q.position[1],d=Math.sqrt(dx*dx+dz*dz);if(d<=q.radius&&d<best){best=d;nearest=q;}});if(nearest){ip.isVisible=true;it.text="[ E ]   "+nearest.label;ring.position.set(nearest.position[0],0.09,nearest.position[1]);ring.isVisible=true;}}

    scene.onBeforeRenderObservable.add(()=>{if(!rt.config)return;const frameSeconds=Math.min(engine.getDeltaTime()/1000,1),dt=Math.min(frameSeconds,.05);elapsed+=dt;updateClimateMaterials(frameSeconds);if(integrated){rt.updaters.forEach((u:any)=>u(elapsed));applyClimateLights();return;}let dx=0,dz=0;if(keys.w)dz--;if(keys.s)dz++;if(keys.a)dx++;if(keys.d)dx--;if(dx||dz){const l=Math.sqrt(dx*dx+dz*dz);dx/=l;dz/=l;const d=4*dt,nx=player.position.x+dx*d,nz=player.position.z+dz*d;if(!blocked(nx,player.position.z))player.position.x=nx;if(!blocked(player.position.x,nz))player.position.z=nz;player.rotation.y=Math.atan2(dx,dz);}const camOff=rt.config?.camera?.targetOffset??[0,0,0];const target=new BABYLON.Vector3(player.position.x+(camOff[0]??0),camOff[1]??0,player.position.z+(camOff[2]??0));camera.target=BABYLON.Vector3.Lerp(camera.target,target,overview?0.035:0.085);interaction();updateTerrainHudV17();rt.updaters.forEach((u:any)=>u(elapsed));applyClimateLights();});

  loadMap(options.mapId ?? "cafe");
    scene.metadata={...(scene.metadata??{}),d8Vtt:{camera,setViewContext,weatherCovered,get presentationDiagnostic(){return {wet:rt.wetAmount,snow:rt.snowAmount,lampFactor:rt.outdoorLampFactor,time:rt.presentationPhase,doors:(rt.nativeDoors??[]).map((d:any)=>({id:d.id,angle:d.angle,closed:d.closed}))};},mirrorTransformation:()=>{if(rt.id==='mirror'){
      const pedestal=rt.config.MAP.objects.find((o:any)=>o.asset==='magic_pedestal'),[x,z]=pedestal?.position??[-9.2,-2.5];
      pulseV17([x,z],[.28,.82,1],5);rippleV17([x,z],[.32,.90,1],1.8);
      const sparks=Array.from({length:28},(_,i)=>{const q=sph('mirrorTransformationSpark',x,.6,z,.045+i%3*.016,M.magicWhite,'VFX');q.metadata={d8Animated:true,tokenOccluder:false};if(integrated)glow.addIncludedOnlyMesh(q);return q;});
      let start:number|null=null;const animate=(t:number)=>{start??=t;const p=Math.min(1,(t-start)/1.6);for(const [i,q] of sparks.entries()){const angle=i*Math.PI*2/28+p*5,r=Math.sin(p*Math.PI)*(1.1+(i%4)*.12);q.position.set(x+Math.cos(angle)*r,.5+p*1.9+Math.sin(angle*2)*.2,z+Math.sin(angle)*r);q.visibility=Math.sin(p*Math.PI);}if(p>=1){for(const q of sparks)q.dispose();rt.updaters=rt.updaters.filter((u:any)=>u!==animate);}};rt.updaters.push(animate);
    }},get config(){return rt.config;},get horizon(){return rt.horizonSummary??null;},loadMap:(id:string)=>loadMap(id),version:D8_VERSION}};
  return scene;
}
