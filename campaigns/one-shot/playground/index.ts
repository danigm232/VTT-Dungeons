import { D8NIGHT, D8_VERSION } from "./d8night.config";

export function createScene(engine: any, canvas: any) {
  const scene = new BABYLON.Scene(engine);
  scene.skipPointerMovePicking=true;
  const camera = new BABYLON.ArcRotateCamera("camera",-Math.PI/2.15,0.70,20,BABYLON.Vector3.Zero(),scene);
  camera.attachControl(canvas,true);
  camera.lowerRadiusLimit=10; camera.upperRadiusLimit=34; camera.lowerBetaLimit=0.48; camera.upperBetaLimit=1.05; camera.wheelPrecision=38;

  const hemi=new BABYLON.HemisphericLight("global",new BABYLON.Vector3(0,1,0),scene);
  hemi.intensity=0.28;
  const glow=new BABYLON.GlowLayer("glow",scene); glow.intensity=0.72;

  // V18 GRAPHICS PIPELINE — shared visual foundation for every D8 Night scene.
  // CANON remains untouched; this only affects VTT_AMBIENCE rendering.
  const pipeline=new BABYLON.DefaultRenderingPipeline("d8_v18_pipeline",true,scene,[camera]);
  pipeline.samples=4;
  pipeline.fxaaEnabled=true;
  pipeline.bloomEnabled=true;
  pipeline.bloomThreshold=0.82;
  pipeline.bloomWeight=0.18;
  pipeline.bloomKernel=48;
  pipeline.bloomScale=0.50;
  pipeline.sharpenEnabled=true;
  pipeline.sharpen.edgeAmount=0.12;
  pipeline.sharpen.colorAmount=1.0;
  pipeline.imageProcessingEnabled=true;

  // SSAO2 gives grounded contact depth to props/walls without changing gameplay geometry.
  // Half-resolution ratio keeps the Playground/WebGL2 cost controlled.
  let ssao:any=null;
  try{
    if(BABYLON.SSAO2RenderingPipeline){
      ssao=new BABYLON.SSAO2RenderingPipeline("d8_v18_ssao",scene,{ssaoRatio:0.55,blurRatio:0.50});
      ssao.radius=1.25;
      ssao.totalStrength=0.72;
      ssao.base=0.08;
      ssao.expensiveBlur=false;
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("d8_v18_ssao",camera);
    }
  }catch(err){console.warn("[D8 v30] SSAO2 unavailable; continuing without AO",err);ssao=null;}

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
    frost:mat("frost",[0.70,0.88,1],{alpha:0.80,specular:0.6,emissive:[0.02,0.05,0.08]}), magicBlue:mat("magicBlue",[0.08,0.52,1],{emissive:[0.03,0.30,0.85],alpha:0.92}),
    magicWhite:mat("magicWhite",[0.78,0.92,1],{emissive:[0.35,0.58,0.85]}), roof:mat("roof",[0.17,0.055,0.025]), plaster:mat("plaster",[0.46,0.40,0.32]),
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

  function visualFloorMaterial(preset:string){
    if(VISUAL_FLOORS[preset])return VISUAL_FLOORS[preset];

    const texSize=preset==="cafe_stone"?2048:1024;
    const tex=new BABYLON.DynamicTexture("visualFloor_"+preset,{width:texSize,height:texSize},scene,false);
    const ctx:any=tex.getContext();
    const W=texSize,H=texSize;

    const palette:any={
      cafe_stone:{base:"#624732",stone:["#806044","#906a4a","#725139","#9a7350"],line:"#34251a"},
      temple_stone:{base:"#443b3e",stone:["#5a4f52","#695b5d","#50474b","#746467"],line:"#292327"},
      night_cobble:{base:"#2b2927",stone:["#454039","#50483e","#393633","#5b5145"],line:"#171513"},
      market_cobble:{base:"#6b5138",stone:["#8a6c4b","#9a7953","#73583e","#ad875b"],line:"#3a2b20"},
      snow:{base:"#d9e2e7",stone:[],line:"#9aaeb9"},
      ice:{base:"#5b9fc0",stone:["#73b5d2","#5594b2","#82c1d8","#4f88a4"],line:"#d3f3fb"}
    };
    const p=palette[preset]??palette.cafe_stone;

    ctx.fillStyle=p.base;
    ctx.fillRect(0,0,W,H);

    if(preset==="snow"){
      for(let i=0;i<260;i++){
        const x=seeded(i*3.1)*W,y=seeded(i*7.7)*H,r=2+seeded(i*11.3)*18;
        const a=0.025+seeded(i*4.2)*0.09;
        ctx.fillStyle=`rgba(110,145,165,${a})`;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      for(let i=0;i<34;i++){
        const x=seeded(i*15.1)*W,y=seeded(i*19.7)*H;
        ctx.strokeStyle="rgba(120,145,158,0.15)";
        ctx.lineWidth=1+seeded(i)*2;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+25+seeded(i+1)*75,y-10+seeded(i+2)*20);ctx.stroke();
      }
    } else if(preset==="ice"){
      const cell=95;
      for(let gy=-1;gy<12;gy++)for(let gx=-1;gx<12;gx++){
        const seed=gx*71+gy*131+41;
        const x=gx*cell+(seeded(seed)-0.5)*34;
        const y=gy*cell+(seeded(seed+1)-0.5)*34;
        const w=cell*(0.80+seeded(seed+2)*0.34);
        const h=cell*(0.72+seeded(seed+3)*0.40);
        ctx.fillStyle=p.stone[Math.floor(seeded(seed+4)*p.stone.length)];
        ctx.strokeStyle="rgba(202,235,247,0.56)";
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.moveTo(x+w*0.12,y);
        ctx.lineTo(x+w,y+h*0.16);
        ctx.lineTo(x+w*0.84,y+h);
        ctx.lineTo(x,y+h*0.80);
        ctx.closePath();ctx.fill();ctx.stroke();
      }
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
      const cols=13,rows=13,cw=W/cols,ch=H/rows;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const seed=gx*97+gy*193+17;
        const pad=5+seeded(seed)*7;
        const x=gx*cw+pad+(gy%2?cw*0.18:0);
        const y=gy*ch+pad;
        const w=cw*(0.76+seeded(seed+1)*0.18);
        const h=ch*(0.68+seeded(seed+2)*0.22);
        ctx.fillStyle=p.stone[Math.floor(seeded(seed+3)*p.stone.length)];
        ctx.strokeStyle=p.line;
        ctx.lineWidth=4;
        ctx.beginPath();
        ctx.moveTo(x+w*0.10,y);
        ctx.lineTo(x+w*0.90,y+h*0.04);
        ctx.lineTo(x+w,y+h*0.80);
        ctx.lineTo(x+w*0.76,y+h);
        ctx.lineTo(x+w*0.08,y+h*0.92);
        ctx.lineTo(x,y+h*0.22);
        ctx.closePath();ctx.fill();ctx.stroke();

        ctx.strokeStyle="rgba(255,220,170,0.08)";
        ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x+w*0.18,y+h*0.18);ctx.lineTo(x+w*0.76,y+h*0.12);ctx.stroke();
      }
    }

    tex.update();
    tex.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    tex.anisotropicFilteringLevel=8;

    const m=new BABYLON.StandardMaterial("visualMat_"+preset,scene);
    m.diffuseTexture=tex;
    m.ambientColor=new BABYLON.Color3(1,1,1);
    m.specularColor=preset==="ice"?new BABYLON.Color3(0.30,0.38,0.44):new BABYLON.Color3(0.025,0.025,0.025);
    m.roughness=preset==="ice"?0.42:0.92;
    m.maxSimultaneousLights=6;

    // V14.8 floor visibility floor: prevents black/invisible bases in WebGL2.
    const floorEmission:any={
      cafe_stone:0.20,
      temple_stone:0.30,
      night_cobble:0.18,
      market_cobble:0.20,
      snow:0.28,
      ice:0.34
    };
    const fe=floorEmission[preset]??0.20;
    m.emissiveTexture=tex;
    m.emissiveColor=new BABYLON.Color3(fe,fe,fe);
    m.disableLighting=false;

    VISUAL_FLOORS[preset]=m;
    return m;
  }

  function floor(c:any){
    // V14.10 FLOOR AUDIT FIX
    // Do not rely on DynamicTexture/lighting for the base surface.
    // Every map gets a solid native 2.5D base first; procedural detail is drawn
    // as line geometry above it. This guarantees the floor remains visible.
    const preset=c.MAP.visualFloor??c.MAP.floor??"stone";
    const palettes:any={
      cafe_stone:{base:[0.40,0.29,0.20],line:[0.17,0.11,0.075]},
      temple_stone:{base:[0.34,0.29,0.28],line:[0.15,0.12,0.13]},
      night_cobble:{base:[0.25,0.24,0.23],line:[0.10,0.09,0.085]},
      market_cobble:{base:[0.50,0.37,0.24],line:[0.23,0.16,0.10]},
      snow:{base:[0.82,0.87,0.89],line:[0.56,0.66,0.72]},
      ice:{base:[0.34,0.62,0.75],line:[0.12,0.33,0.48]},
      stone:{base:[0.38,0.34,0.30],line:[0.18,0.15,0.13]},
      stone_tavern:{base:[0.40,0.29,0.20],line:[0.17,0.11,0.075]}
    };
    const p=rt.id==="temple"?{base:[0.105,0.185,0.070],line:[0.050,0.090,0.040]}:(palettes[preset]??palettes.stone);

    const baseMat=new BABYLON.StandardMaterial("floorBaseMat_"+rt.id,scene);
    baseMat.diffuseColor=new BABYLON.Color3(p.base[0],p.base[1],p.base[2]);
    const baseEmit=rt.id==="temple"?0.72:0.88;
    baseMat.emissiveColor=new BABYLON.Color3(p.base[0]*baseEmit,p.base[1]*baseEmit,p.base[2]*baseEmit);
    baseMat.ambientColor=new BABYLON.Color3(1,1,1);
    baseMat.specularColor=new BABYLON.Color3(0,0,0);
    baseMat.disableLighting=rt.id!=="temple";
    baseMat.alpha=1;
    if(rt.id==="temple"){
      const grassTex=new BABYLON.DynamicTexture("templeGrassV30",{width:512,height:512},scene,false);
      const gc:any=grassTex.getContext();
      gc.fillStyle="#31552d";gc.fillRect(0,0,512,512);
      for(let i=0;i<720;i++){
        const gx=seeded(i*7.31)*512,gy=seeded(i*11.17)*512;
        const light=seeded(i*5.93)>0.58;
        gc.fillStyle=light?"rgba(118,145,72,0.18)":"rgba(24,55,24,0.22)";
        gc.fillRect(gx,gy,1+seeded(i*13.4)*2,2+seeded(i*17.9)*5);
      }
      for(let i=0;i<90;i++){
        const gx=seeded(i*19.1)*512,gy=seeded(i*23.7)*512;
        gc.strokeStyle="rgba(150,165,90,0.12)";gc.lineWidth=1;
        gc.beginPath();gc.moveTo(gx,gy);gc.lineTo(gx+2+seeded(i*4.2)*5,gy-4-seeded(i*6.8)*7);gc.stroke();
      }
      grassTex.update();grassTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;grassTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;grassTex.uScale=5.2;grassTex.vScale=6.4;
      baseMat.diffuseTexture=grassTex;baseMat.emissiveTexture=grassTex;baseMat.emissiveColor=new BABYLON.Color3(0.075,0.095,0.050);
      baseMat.specularColor=new BABYLON.Color3(0.015,0.020,0.012);baseMat.maxSimultaneousLights=6;
      rt.disposables.push(grassTex);
    }
    baseMat.backFaceCulling=false;
    rt.disposables.push(baseMat);

    const base=BABYLON.MeshBuilder.CreateBox("floor",{
      width:c.MAP.size[0],
      height:0.10,
      depth:c.MAP.size[1]
    },scene);
    base.position.y=-0.05;
    base.material=baseMat;
    base.parent=parentFor("BASE");
    base.receiveShadows=rt.id==="temple";
    base.isPickable=false;
    base.alwaysSelectAsActiveMesh=true;
    if(glow.addExcludedMesh)glow.addExcludedMesh(base);

    // Native geometric detail layer: no texture sampling, no opacity material.
    const w=c.MAP.size[0],h=c.MAP.size[1],lines:any[]=[];
    const y=0.012;

    if(preset==="ice"){
      for(let i=0;i<42;i++){
        const sx=-w/2+seeded(i*11.7)*w;
        const sz=-h/2+seeded(i*17.3)*h;
        const pts=[new BABYLON.Vector3(sx,y,sz)];
        let x=sx,z=sz;
        const seg=3+Math.floor(seeded(i*7.1)*4);
        for(let j=0;j<seg;j++){
          x+=(seeded(i*31+j)-0.5)*2.8;
          z+=(seeded(i*47+j)-0.5)*2.2;
          pts.push(new BABYLON.Vector3(x,y,z));
        }
        lines.push(pts);
      }
    }else if(preset==="snow"){
      // Sparse shallow tracks / icy seams so snow is not a flat white slab.
      for(let i=0;i<24;i++){
        const sx=-w/2+seeded(i*13.2)*w;
        const sz=-h/2+seeded(i*21.9)*h;
        lines.push([
          new BABYLON.Vector3(sx,y,sz),
          new BABYLON.Vector3(sx+0.8+seeded(i+1)*1.8,y,sz-0.25+seeded(i+2)*0.5)
        ]);
      }
    }else if(rt.id==="temple"){
      // V30: unused ground is lawn. Do not draw the old stone/earth crack field over grass.
    }else{
      // Irregular cobble/stone courses.
      const cell=preset==="market_cobble"?1.35:1.45;
      let row=0;
      for(let z=-h/2+0.5;z<h/2;z+=cell){
        const zz=z+(seeded(row*7.7)-0.5)*0.12;
        lines.push([new BABYLON.Vector3(-w/2,y,zz),new BABYLON.Vector3(w/2,y,zz)]);
        let col=0;
        const offset=(row%2)*cell*0.45;
        for(let x=-w/2+offset;x<w/2;x+=cell){
          const xx=x+(seeded(row*101+col*17)-0.5)*0.14;
          lines.push([
            new BABYLON.Vector3(xx,y,Math.max(-h/2,zz-cell*0.55)),
            new BABYLON.Vector3(xx,y,Math.min(h/2,zz+cell*0.55))
          ]);
          col++;
        }
        row++;
      }
    }

    if(lines.length){
      const detail=BABYLON.MeshBuilder.CreateLineSystem("floorDetail",{lines},scene);
      detail.parent=parentFor("BASE");
      detail.color=new BABYLON.Color3(p.line[0],p.line[1],p.line[2]);
      detail.alpha=rt.id==="temple"?0.16:(preset==="snow"?0.24:(preset==="ice"?0.52:0.48));
      detail.isPickable=false;
      detail.alwaysSelectAsActiveMesh=true;
      if(glow.addExcludedMesh)glow.addExcludedMesh(detail);
    }

    console.log("[D8 v30] floor",rt.id,preset,"base",p.base,"size",c.MAP.size);
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

  function applyReadableFallback(c:any){
    const cfg=c.MAP.readabilityFallback;
    if(!cfg?.enabled)return;

    const strength=cfg.strength??0.20;
    const textureStrength=cfg.textureStrength??0.22;
    const diffuseBoost=cfg.diffuseBoost??1.0;
    const cache=new Map<any,any>();

    rt.root.getChildMeshes().forEach((mesh:any)=>{
      if(!mesh.material)return;
      if(mesh.name==="floor"||mesh.name==="floorDetail"||mesh.name==="cafe14_floor"||mesh.name==="cafe14_floorDetail")return;
      if(mesh.parent===rt.layers?.VFX)return;
      if(mesh.name.includes("Flame")||mesh.name.includes("fire")||mesh.name.includes("smoke")||mesh.name.includes("dust")||mesh.name.includes("ripple")||mesh.name.includes("poolGlow"))return;

      const source=mesh.material;
      let m=cache.get(source);
      if(!m){
        m=source.clone(source.name+"_readable_"+rt.id);
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

  function templeMaterialPassV23(){
    if(rt.id!=="temple")return;

    const wallTex=new BABYLON.DynamicTexture("templeWallV23",{width:512,height:512},scene,false);
    const wc:any=wallTex.getContext();wc.fillStyle="#796858";wc.fillRect(0,0,512,512);
    const rows=9,rowH=57;
    for(let r=0;r<rows;r++){
      const offset=(r%2)*34;
      for(let xx=-80;xx<600;xx+=68){
        const v=108+Math.floor(seeded(r*21+xx*0.17)*36);
        wc.fillStyle="rgb("+v+","+Math.max(60,v-13)+","+Math.max(52,v-21)+")";
        wc.fillRect(xx+offset+2,r*rowH+2,64,rowH-4);
      }
    }
    wc.strokeStyle="rgba(33,27,24,0.72)";wc.lineWidth=3;
    for(let r=0;r<=rows;r++){wc.beginPath();wc.moveTo(0,r*rowH);wc.lineTo(512,r*rowH);wc.stroke();}
    for(let i=0;i<34;i++){const x=seeded(i*4.1)*512,y=seeded(i*8.3)*512;wc.fillStyle="rgba(28,42,26,0.10)";wc.beginPath();wc.arc(x,y,3+seeded(i*5.6)*12,0,Math.PI*2);wc.fill();}
    wallTex.update();wallTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;wallTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;wallTex.uScale=2.5;wallTex.vScale=2.0;

    const floorTex=new BABYLON.DynamicTexture("templeFloorV23",{width:512,height:512},scene,false);
    const fc:any=floorTex.getContext();fc.fillStyle="#6e6258";fc.fillRect(0,0,512,512);
    const tw=86,th=58;
    for(let r=0;r<10;r++){
      const off=(r%2)*43;
      for(let xx=-90;xx<600;xx+=tw){
        const vv=96+Math.floor(seeded(r*14+xx*0.11)*30);
        fc.fillStyle="rgb("+vv+","+Math.max(58,vv-7)+","+Math.max(54,vv-10)+")";
        fc.fillRect(xx+off+3,r*th+3,tw-7,th-7);
        fc.strokeStyle="rgba(29,25,23,0.70)";fc.lineWidth=3;fc.strokeRect(xx+off+2,r*th+2,tw-5,th-5);
      }
    }
    for(let i=0;i<90;i++){const x=seeded(i*3.7)*512,y=seeded(i*9.5)*512;fc.fillStyle="rgba(20,17,15,"+(0.025+seeded(i*2.2)*0.06)+")";fc.fillRect(x,y,2+seeded(i*5.1)*7,1+seeded(i*7.2)*4);}
    floorTex.update();floorTex.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;floorTex.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;floorTex.uScale=3.6;floorTex.vScale=3.0;

    const wallMat=new BABYLON.StandardMaterial("templeWallMatV23",scene);
    wallMat.diffuseTexture=wallTex;wallMat.diffuseColor=new BABYLON.Color3(1.00,0.92,0.80);wallMat.ambientColor=new BABYLON.Color3(0.68,0.60,0.50);
    wallMat.emissiveTexture=wallTex;wallMat.emissiveColor=new BABYLON.Color3(0.20,0.16,0.12);
    wallMat.specularColor=new BABYLON.Color3(0.040,0.035,0.030);wallMat.maxSimultaneousLights=8;

    const floorMat=new BABYLON.StandardMaterial("templeFloorMatV23",scene);
    floorMat.diffuseTexture=floorTex;floorMat.diffuseColor=new BABYLON.Color3(0.95,0.87,0.76);floorMat.ambientColor=new BABYLON.Color3(0.66,0.59,0.50);
    floorMat.emissiveTexture=floorTex;floorMat.emissiveColor=new BABYLON.Color3(0.16,0.13,0.10);
    floorMat.specularColor=new BABYLON.Color3(0.020,0.020,0.020);floorMat.maxSimultaneousLights=8;

    rt.disposables.push(wallTex,floorTex,wallMat,floorMat);

    const wallNames=["templeWallBody","templeGatePier","templeGateLintel","templeGateCrown","wall","archLeft","archRight","archTop","column","columnBase","columnCap","templeAltar","templeWindow","templeButtress","templeBackdrop"];
    const floorNames=["templeFloorMain","path","patioInner","stair"];
    rt.root.getChildMeshes().forEach((m:any)=>{
      const n=m.name??"";
      if(wallNames.some(q=>n.includes(q))){m.material=wallMat;m.receiveShadows=true;}
      else if(floorNames.some(q=>n.includes(q))){m.material=floorMat;m.receiveShadows=true;}
    });
  }

  function grid(c:any){
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
      const foot=box("templeWallFoot",x,0.22,z,w*1.035,0.44,d*1.16,M.stoneDark);
      const cap=box("templeWallCap",x,h+0.14,z,w*1.055,0.28,d*1.18,M.stoneLight);
      body.isPickable=foot.isPickable=cap.isPickable=false;
      if(o.tiers){
        const horizontal=w>=d;
        const band1=box("templeWallBand",x,h*0.34,z,horizontal?w*1.012:d*1.22,0.13,horizontal?d*1.16:w*1.012,M.stoneLight);
        const band2=box("templeWallBand",x,h*0.69,z,horizontal?w*1.012:d*1.22,0.13,horizontal?d*1.16:w*1.012,M.stoneDark);
        band1.isPickable=band2.isPickable=false;
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
      const q=box("templeFloorMain",x,0.14,z,w,0.28,d,M.stone2,"BASE");
      q.receiveShadows=true;q.isPickable=false;
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
        g.parent=parentFor("BASE");g.color=new BABYLON.Color3(0.10,0.075,0.055);g.alpha=0.34;g.isPickable=false;
        if(glow.addExcludedMesh)glow.addExcludedMesh(g);
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
    else if(o.asset==="chair"){const r=new BABYLON.TransformNode("chair",scene);r.parent=rt.root;r.position.set(x,0,z);r.rotation.y=o.rotation??0;const a=BABYLON.MeshBuilder.CreateBox("seat",{width:0.55,height:0.15,depth:0.55},scene);a.position.y=0.36;a.material=M.wood;a.parent=r;const b=BABYLON.MeshBuilder.CreateBox("back",{width:0.55,height:0.7,depth:0.1},scene);b.position.set(0,0.68,0.23);b.material=M.woodDark;b.parent=r;}
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
      ring.position.set(x,y,z);ring.rotation.x=Math.PI/2;ring.material=M.iron;ring.parent=rt.root;
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
      const segLen=2*Math.PI*radius/segments*0.95;
      for(let i=0;i<segments;i++){
        if(i<opening)continue;
        const a=i/segments*Math.PI*2,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
        const w=segLen,d=0.42,h=o.height??1.55;
        const q=box("roundRoomWall",px,h/2,pz,w,h,d,M.stoneDark);
        q.rotation.y=-a;
        const aw=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d;
        const ad=Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d;
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
      for(let i=0;i<count;i++){
        const px=x-spreadX*0.42+((i*37)%100)/100*spreadX*0.84;
        const pz=z-spreadZ*0.38+((i*61)%100)/100*spreadZ*0.76;
        const h=0.38+(i%4)*0.07;
        cyl("roseStem",px,h/2+0.08,pz,0.045,h,M.leafDark);
        const head=sph("roseHead",px,h+0.12,pz,0.20+(i%3)*0.025,i%4===0?M.rosePink:M.rose);
        head.scaling.y=0.75;
        rt.markers.roses.push({mesh:head,baseY:head.position.y,seed:i});
      }
    }
    else if(o.asset==="snow_tree"){
      const h=(o.height??3.6)*s;
      cyl("snowTreeTrunk",x,h*0.34,z,0.42*s,h*0.68,M.woodDark);
      for(let i=0;i<7;i++){
        const a=i/7*Math.PI*2,len=(1.0+(i%3)*0.22)*s,y=h*0.55+(i%3)*0.25;
        const branch=box("snowBranch",x+Math.cos(a)*len*0.36,y,z+Math.sin(a)*len*0.36,len,0.10,0.10,M.woodDark);
        branch.rotation.y=-a;
        branch.rotation.z=(i%2?0.18:-0.15);
        const snow=sph("branchSnow",x+Math.cos(a)*len*0.72,y+0.11,z+Math.sin(a)*len*0.72,0.42*s,M.snow);
        snow.scaling.y=0.35;
      }
      collider(x,z,0.65*s,0.65*s);
    }
    else if(o.asset==="market_stall"){
      const w=(o.size?.[0]??3.7)*s,d=(o.size?.[1]??2.0)*s,cloth=M[o.color]??M.clothRed;
      box("stallCounter",x,0.62,z,w,0.20,d*0.55,M.woodLight);
      for(const sx of [-1,1])for(const sz of [-1,1])box("stallPost",x+sx*w*0.43,1.15,z+sz*d*0.38,0.12,2.3,0.12,M.woodDark);
      const canopy=box("stallCanopy",x,2.20,z,w*1.08,0.12,d*1.10,cloth);
      canopy.rotation.z=0.03;
      collider(x,z,w*0.92,d*0.72);
      for(let i=0;i<5;i++)sph("produce",x-w*0.32+i*w*0.16,0.82,z,0.18,i%2?M.green:M.red);
    }
    else if(o.asset==="trough"){
      const w=(o.size?.[0]??2.8)*s,d=(o.size?.[1]??1.0)*s;
      box("troughBottom",x,0.24,z,w,0.18,d,M.woodDark);
      box("troughSideA",x,0.48,z-d*0.44,w,0.48,0.12,M.wood);
      box("troughSideB",x,0.48,z+d*0.44,w,0.48,0.12,M.wood);
      box("troughEndA",x-w*0.47,0.48,z,0.12,0.48,d,M.wood);
      box("troughEndB",x+w*0.47,0.48,z,0.12,0.48,d,M.wood);
      box("troughWater",x,0.43,z,w*0.86,0.04,d*0.70,M.water);
      collider(x,z,w,d);
    }
    else if(o.asset==="cow_proxy"){
      const body=sph("cowBody",x,1.0,z,1.55*s,M.ceramic);body.scaling.set(1.35,0.75,0.82);
      const hx=x+(o.facing??1)*0.95*s;
      const head=sph("cowHead",hx,1.02,z,0.72*s,M.ceramic);head.scaling.set(0.95,0.82,0.75);
      for(const lx of [-0.45,0.45])for(const lz of [-0.38,0.38])cyl("cowLeg",x+lx*s,0.40,z+lz*s,0.14*s,0.80*s,M.woodDark);
      cyl("cowHornA",hx+(o.facing??1)*0.20,1.36,z-0.22*s,0.10*s,0.38*s,M.wax);
      cyl("cowHornB",hx+(o.facing??1)*0.20,1.36,z+0.22*s,0.10*s,0.38*s,M.wax);
      collider(x,z,1.9*s,1.2*s);
    }
    else if(o.asset==="lantern_post"){
      const h=(o.height??2.6)*s;
      cyl("lanternPost",x,h/2,z,0.12*s,h,M.iron);
      box("lanternBox",x,h+0.05,z,0.38*s,0.52*s,0.38*s,M.iron);
      const glowBox=box("lanternGlow",x,h+0.05,z,0.24*s,0.34*s,0.24*s,M.lanternGlass);
      const light=track(new BABYLON.PointLight("lanternLight",new BABYLON.Vector3(x,h+0.05,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.45,0.10);light.range=o.range??5;light.intensity=o.intensity??0.62;
      const seed=x*0.7+z*1.3;
      rt.updaters.push((t:number)=>{const f=Math.sin(t*8.1+seed)*0.08+Math.sin(t*13.3+seed)*0.04;light.intensity=(o.intensity??0.62)+f;glowBox.scaling.y=1+f*0.18;});
      collider(x,z,0.32*s,0.32*s);
    }
    else if(o.asset==="house"){
      const w=(o.size?.[0]??8)*s,d=(o.size?.[1]??5)*s,h=(o.height??2.7)*s;
      box("houseBody",x,h/2,z,w,h,d,M.plaster);
      box("houseBeamTop",x,h*0.88,z-d*0.51,w*1.02,0.16,0.14,M.woodDark);
      for(const bx of [-0.35,0.35])box("houseBeam",x+w*bx,h*0.50,z-d*0.51,0.16,h*0.90,0.14,M.woodDark);
      const roofA=box("roofA",x-w*0.23,h+0.72,z,w*0.58,0.18,d*1.18,M.roof);roofA.rotation.z=0.55;
      const roofB=box("roofB",x+w*0.23,h+0.72,z,w*0.58,0.18,d*1.18,M.roof);roofB.rotation.z=-0.55;
      const door=box("houseDoor",x-w*0.28,h*0.38,z-d*0.515,w*0.18,h*0.76,0.10,M.woodDark);
      for(const wx of [0.05,0.30]){
        const px=x+w*wx,pz=z-d*0.52;
        const win=box("windowGlow",px,h*0.58,pz,w*0.16,h*0.28,0.08,M.lanternGlass);
        win.scaling.y=1;
        const wl=track(new BABYLON.PointLight("windowLight",new BABYLON.Vector3(px,h*0.72,pz-d*0.18),scene));
        wl.parent=rt.root;
        wl.diffuse=new BABYLON.Color3(1,0.43,0.12);
        wl.intensity=o.windowLightIntensity??0.55;
        wl.range=o.windowLightRange??4.8;
      }
      collider(x,z,w,d);
    }
    else if(o.asset==="long_table"){
      const w=(o.size?.[0]??5.2)*s,d=(o.size?.[1]??1.35)*s;
      box("longTableTop",x,0.78,z,w,0.18,d,M.woodLight);
      for(const sx of [-1,1])for(const sz of [-1,1])box("longTableLeg",x+sx*w*0.38,0.37,z+sz*d*0.30,0.16,0.74,0.16,M.woodDark);
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
      const inset=box("templeBackdropInset",x,h*0.54,z-d*0.28,w*0.46,h*0.54,0.06*s,M.templeBurgundy);
      inset.isPickable=false;
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
      const jamb=(name:string,lx:number,ly:number,lw:number,lh:number)=>{
        const q=BABYLON.MeshBuilder.CreateBox(name,{width:lw,height:lh,depth:0.38*s},scene);
        q.position.set(lx,ly,0);q.material=M.stone2;q.parent=root;return q;
      };
      jamb("templeWindowJambL",-w*0.55,y,0.26*s,h);
      jamb("templeWindowJambR", w*0.55,y,0.26*s,h);
      jamb("templeWindowLintel",0,y+h*0.50,w*1.22,0.24*s);
      jamb("templeWindowSill",0,y-h*0.50,w*1.22,0.20*s);
      const paneMat=new BABYLON.StandardMaterial("templeWindowPaneMat",scene);
      paneMat.diffuseColor=new BABYLON.Color3(0.46,0.58,0.62);
      paneMat.emissiveColor=new BABYLON.Color3(o.sunlit?0.10:0.035,o.sunlit?0.075:0.045,0.045);
      paneMat.specularColor=new BABYLON.Color3(0.24,0.26,0.28);
      paneMat.alpha=o.sunlit?0.22:0.14;
      paneMat.backFaceCulling=false;
      rt.disposables.push(paneMat);
      const pane=BABYLON.MeshBuilder.CreateBox("templeWindowPane",{width:w*0.92,height:h*0.82,depth:0.045*s},scene);
      pane.position.set(0,y,0);pane.material=paneMat;pane.parent=root;pane.isPickable=false;
      if(glow.addExcludedMesh)glow.addExcludedMesh(pane);
      if(o.sunlit){
        const dir=o.direction??[1,-0.25,0],beam=o.beamLength??5.6;
        const spot=track(new BABYLON.SpotLight("goldenWindowLight",new BABYLON.Vector3(x-dir[0]*0.8,y+0.45,z-dir[2]*0.8),new BABYLON.Vector3(dir[0],dir[1],dir[2]),Math.PI/3.4,7.5,scene));
        spot.parent=rt.root;spot.diffuse=new BABYLON.Color3(1.0,0.53,0.20);spot.specular=new BABYLON.Color3(0.35,0.18,0.05);spot.range=beam+3;spot.intensity=o.intensity??2.1;
        const horiz=Math.sqrt(dir[0]*dir[0]+dir[2]*dir[2])||1;
        const dx=dir[0]/horiz,dz=dir[2]/horiz;
        const mat=new BABYLON.StandardMaterial("goldenWindowPatchMat",scene);
        mat.diffuseColor=new BABYLON.Color3(1.0,0.43,0.10);mat.emissiveColor=new BABYLON.Color3(0.42,0.15,0.025);mat.alpha=0.15;mat.disableLighting=true;
        rt.disposables.push(mat);
        const patch=BABYLON.MeshBuilder.CreateBox("goldenWindowPatch",{width:w*0.92,height:0.018,depth:beam},scene);
        patch.position.set(x+dx*beam*0.46,0.115,z+dz*beam*0.46);patch.rotation.y=Math.atan2(dx,dz);patch.material=mat;patch.parent=parentFor("VFX");
        if(glow.addExcludedMesh)glow.addExcludedMesh(patch);
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
      cyl("columnBase",x,0.12,z,d*1.35,0.24,M.stone2);
      cyl("column",x,h/2+0.20,z,d,h,M.stoneLight);
      cyl("columnCap",x,h+0.30,z,d*1.35,0.22,M.stone2);
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
      box("mirrorSupport",x,0.85,z,0.28*s,1.70*s,0.32*s,M.gold);
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
    else if(o.asset==="statue"){box("statueBase",x,0.3,z,2,0.6,1.4,M.stoneLight);box("statue",x,1.5,z,0.8,2.4,0.7,M.stoneLight);collider(x,z,2,1.4);}
    else if(o.asset==="stairs"){
      const steps=o.steps??5,sw=o.size?.[0]??2.6,depth=o.size?.[1]??2.8,totalH=o.height??0.75;
      for(let i=0;i<steps;i++){
        const h=totalH*(i+1)/steps;
        const d=depth/steps;
        const zz=z-depth/2+d*(i+0.5);
        const q=box("stair",x,h/2,zz,sw,h,d+0.02,M[o.material]??M.stone);
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
      const crownA=sph("templeTreeCrown",x,h*0.78,z,c,M.green);crownA.scaling.set(1.0,0.82,0.95);
      const crownB=sph("templeTreeCrown",x-c*0.28,h*0.72,z+c*0.12,c*0.68,M.leaf);crownB.scaling.set(1.0,0.82,0.95);
      const crownC=sph("templeTreeCrown",x+c*0.30,h*0.75,z-c*0.10,c*0.72,M.leafDark);crownC.scaling.set(1.0,0.86,1.0);
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
      const border=box("runnerBorder",x,0.045,z,w,0.045,d,M[o.border]??M.yellow);
      const inner=box("runner",x,0.070,z,Math.max(0.2,w-0.18),0.035,Math.max(0.2,d-0.18),M[o.material]??M.clothRed);
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
      const tip=cloth.clone("bannerTip");tip.scaling.x=0.72;tip.scaling.y=0.20;tip.position.y-=h*0.56;tip.material=cloth.material;
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
      for(let i=0;i<count;i++){
        const t=count===1?0:i/(count-1)-0.5;
        const along=t*len;
        const px=x+Math.cos(rot)*along,pz=z-Math.sin(rot)*along;
        const h=(0.55+(i%4)*0.12)*s;
        const branch=box("thornBranch",px,h*0.55,pz,0.10*s,h,0.10*s,M.woodDark);
        branch.rotation.y=rot+(i%2?0.25:-0.20);branch.rotation.z=(i%2?0.42:-0.35);
        if(i%2===0){
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
      top.position.set(x,h*1.1,z);top.scaling.z=o.depthScale??0.72;top.rotation.y=(o.rotation??0)+0.08;top.material=M.frost;top.parent=rt.root;
    }
    else if(o.asset==="patio_ring"){
      const d=(o.diameter??5.0)*s,th=(o.thickness??0.28)*s;
      const ring=BABYLON.MeshBuilder.CreateTorus("patioRing",{diameter:d,thickness:th,tessellation:48},scene);
      ring.position.set(x,0.075,z);ring.rotation.x=Math.PI/2;ring.material=M[o.material]??M.stone2;ring.parent=rt.root;
      if(glow.addExcludedMesh)glow.addExcludedMesh(ring);
    }
    else if(o.asset==="well"){
      const d=(o.diameter??2.0)*s,h=(o.height??0.70)*s;
      const base=cyl("wellBase",x,h*0.36,z,d,h*0.72,M[o.material]??M.stoneDark);
      const lip=BABYLON.MeshBuilder.CreateTorus("wellLip",{diameter:d*0.92,thickness:0.20*s,tessellation:32},scene);
      lip.position.set(x,h*0.82,z);lip.rotation.x=Math.PI/2;lip.material=M.stone2;lip.parent=rt.root;
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
        const along=t*len;
        const px=x+Math.cos(rot)*along,pz=z-Math.sin(rot)*along;
        const h=(0.45+seeded(i*8.3+x)*0.85)*s;
        const q=BABYLON.MeshBuilder.CreateCylinder("iceRidge",{diameterTop:0,diameterBottom:(0.28+seeded(i*3.7)*0.28)*s,height:h,tessellation:5},scene);
        q.position.set(px,h/2,pz);q.rotation.y=rot+seeded(i*5.1)*0.5;q.material=i%3===0?M.magicBlue:M.frost;q.parent=rt.root;
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
      box("stoneLanternHouse",x,h*0.78,z,0.72*s,0.52*s,0.72*s,M.stoneLight);
      const glowBox=box("stoneLanternGlow",x,h*0.79,z,0.42*s,0.30*s,0.42*s,M.lanternGlass,"VFX");
      const roof=box("stoneLanternRoof",x,h*1.02,z,0.94*s,0.14*s,0.94*s,M.stoneDark);roof.rotation.y=Math.PI/4;
      const light=track(new BABYLON.PointLight("stoneLanternLight",new BABYLON.Vector3(x,h*0.82,z),scene));
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(1,0.48,0.13);light.range=o.range??4.0;light.intensity=o.intensity??0.28;
      const seed=x*1.1+z*0.7;rt.updaters.push((tt:number)=>{const f=Math.sin(tt*5.8+seed)*0.035;light.intensity=(o.intensity??0.28)+f;glowBox.scaling.y=1+f*0.8;});
      collider(x,z,0.65*s,0.65*s);
    }
    else if(o.asset==="water_area"){
      const water=box("waterArea",x,0.055,z,o.size[0],0.10,o.size[1],M.water,"BASE");
      water.receiveShadows=true;
      water.isPickable=false;
      const shimmer=box("waterShimmer",x,0.112,z,o.size[0]*0.985,0.014,o.size[1]*0.92,M.waterGlow,"VFX");
      shimmer.isPickable=false;
      if(glow.addExcludedMesh)glow.addExcludedMesh(shimmer);
      rt.markers.pools.push({x,z,mesh:water,baseY:water.position.y});
      const rippleCount=o.rippleCount??7;
      const ripples:any[]=[];
      for(let i=0;i<rippleCount;i++){
        const ring=BABYLON.MeshBuilder.CreateTorus("ambientWaterRipple",{diameter:0.55+(i%3)*0.18,thickness:0.025,tessellation:28},scene);
        ring.rotation.x=Math.PI/2;
        ring.position.set(x+(seeded(i*7.31)-0.5)*o.size[0]*0.88,0.135,z+(seeded(i*11.17)-0.5)*o.size[1]*0.62);
        ring.material=M.waterGlow;ring.parent=parentFor("VFX");ring.isPickable=false;
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
      const mesh=sph("snowFlake",x,0.8+((i*31)%100)/100*4.5,z,0.045+(i%3)*0.018,M.magicWhite,"VFX");
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
      const mesh=sph("firefly",x,0.55+(i%5)*0.35,z,0.035,M.lanternGlass,"VFX");
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
      for(const r of roses){r.mesh.position.y=r.baseY+Math.sin(t*1.4+r.seed)*0.018;r.mesh.rotation.z=Math.sin(t*1.1+r.seed)*0.08;}
    });
  }

  function magicMotes(v:any){
    const particles:any[]=[];
    const animatedLights:any[]=[];
    for(const m of rt.markers.magic){
      for(let i=0;i<(v.magicCount??12);i++){
        const mesh=sph("magicMote",m.x,0.55,m.z,0.045+(i%3)*0.012,i%2?M.magicBlue:M.magicWhite,"VFX");
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
    light.position=new BABYLON.Vector3(pos[0],pos[1],pos[2]);
    light.intensity=lighting.mode==="exterior"?(natural.intensity??p19.keyIntensity):(sh.intensity??p19.keyIntensity);
    light.diffuse=new BABYLON.Color3(color[0],color[1],color[2]);
    light.specular=new BABYLON.Color3(color[0]*0.22,color[1]*0.22,color[2]*0.22);

    const mapSize=sh.mapSize??(lighting.mode==="exterior"?2048:1024);
    const gen=track(new BABYLON.ShadowGenerator(mapSize,light));
    gen.useBlurExponentialShadowMap=true;
    gen.blurKernel=sh.blurKernel??(lighting.mode==="exterior"?20:14);
    gen.bias=sh.bias??p19.shadowBias;
    gen.normalBias=sh.normalBias??p19.normalBias;
    gen.darkness=sh.darkness??(1-p19.shadow);
    gen.forceBackFacesOnly=false;

    const skip=(n:string)=>{const q=(n??"").toLowerCase();return q==="floorstone"||q.includes("smoke")||q.includes("dust")||q.includes("ripple")||q.includes("poolwater")||q.includes("poolglow")||q.includes("snowflake")||q.includes("firefly")||q.includes("magicmote")||q.includes("ember")||q.includes("flame")||q.includes("torchouter")||q.includes("goldenwindowpatch")||q.includes("floorscatter")||q.includes("banquetfork")||q.includes("banquetknife")||q.includes("banquetplate")||q.includes("tablerose")||q.includes("templegardenrose")||q.includes("bottle")||q.includes("plate")||q.includes("dish")||q.includes("cup")||q.includes("produce")||q.includes("plantstem")||q.includes("plantleaf")||q.includes("rosestem")||q.includes("rosehead");};
    rt.root.getChildMeshes().forEach((m:any)=>{
      m.receiveShadows=true;
      if(!skip(m.name)&&m.isVisible!==false&&m.getTotalVertices?.()>0)gen.addShadowCaster(m);
    });
  }

  const player=BABYLON.MeshBuilder.CreateCylinder("player",{diameter:0.62,height:0.84,tessellation:24},scene);player.material=M.player;
  const arrow=BABYLON.MeshBuilder.CreateCylinder("direction",{diameterTop:0,diameterBottom:0.2,height:0.42,tessellation:3},scene);arrow.parent=player;arrow.position.set(0,0,-0.48);arrow.rotation.z=Math.PI/2;arrow.material=M.gold;

  const ringPts:any[]=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;ringPts.push(new BABYLON.Vector3(Math.cos(a)*0.65,0,Math.sin(a)*0.65));}
  const ring=BABYLON.MeshBuilder.CreateLines("interactionRing",{points:ringPts},scene);ring.color=new BABYLON.Color3(1,0.65,0.12);ring.isVisible=false;

  const ui=BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI"),panel=new BABYLON.GUI.StackPanel();
  panel.width="190px";panel.horizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;panel.paddingLeft="15px";panel.paddingTop="15px";ui.addControl(panel);
  const title=new BABYLON.GUI.TextBlock();title.text="D8 NIGHT · "+D8_VERSION;title.height="42px";title.fontSize=20;title.color="#efd5a5";panel.addControl(title);
  const order=["temple","cafe","dinner","garden","market","mirror"],labels:any={temple:"1 · TEMPLO",cafe:"2 · CAFÉ",dinner:"3 · DINNER",garden:"4 · GARDEN",market:"5 · MARKET",mirror:"6 · MIRROR"},buttons:any={};
  order.forEach(id=>{const b=BABYLON.GUI.Button.CreateSimpleButton("btn_"+id,labels[id]);b.width="175px";b.height="37px";b.color="#dfcfb2";b.background="#25252a";b.cornerRadius=5;b.paddingBottom="4px";b.onPointerClickObservable.add(()=>loadMap(id));buttons[id]=b;panel.addControl(b);});
  const help=new BABYLON.GUI.TextBlock();help.text="\nWASD · mover\nE · interactuar\nG · grid/zonas\nC · cámara";help.height="100px";help.color="#888";help.fontSize=11;help.textHorizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.addControl(help);
  const terrainText=new BABYLON.GUI.TextBlock();terrainText.text="";terrainText.height="30px";terrainText.color="#b9aa8e";terrainText.fontSize=11;terrainText.textHorizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.addControl(terrainText);
  const ip=new BABYLON.GUI.Rectangle();ip.width="330px";ip.height="48px";ip.cornerRadius=8;ip.color="#c9aa70";ip.background="#101116E8";ip.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;ip.top="-25px";ip.isVisible=false;ui.addControl(ip);
  const it=new BABYLON.GUI.TextBlock();it.color="#fff";it.fontSize=14;ip.addControl(it);
  const msg=new BABYLON.GUI.TextBlock();msg.width="650px";msg.height="55px";msg.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;msg.top="15px";msg.color="#efdfc3";msg.fontSize=13;ui.addControl(msg);
  let timer:any=null;const show=(t:string)=>{msg.text=t;if(timer)clearTimeout(timer);timer=setTimeout(()=>msg.text="",3000);};

  function buildCafeCleanV12(c:any){
    // Café rebuilt from scratch: no legacy composition overlay, no readability hack,
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
    const wood=cmat("wood",[0.48,0.24,0.085],0.20);
    const woodLight=cmat("woodLight",[0.66,0.36,0.13],0.18);
    const woodDark=cmat("woodDark",[0.27,0.12,0.045],0.22);
    const iron=cmat("iron",[0.22,0.21,0.19],0.14,0.10);
    const ceramic=cmat("ceramic",[0.78,0.70,0.56],0.14,0.08);
    const green=cmat("green",[0.18,0.34,0.10],0.16);
    const red=cmat("red",[0.46,0.07,0.045],0.20);
    const wax=cmat("wax",[0.90,0.78,0.52],0.18);
    const bottleG=cmat("bottleG",[0.12,0.33,0.14],0.20,0.08);
    const bottleA=cmat("bottleA",[0.58,0.32,0.08],0.20,0.08);
    const shadowMat=new BABYLON.StandardMaterial("cafe12_contactShadow",scene);
    shadowMat.diffuseColor=new BABYLON.Color3(0.015,0.010,0.008);
    shadowMat.emissiveColor=new BABYLON.Color3(0.015,0.010,0.008);
    shadowMat.alpha=0.18;shadowMat.disableLighting=true;shadowMat.backFaceCulling=false;
    rt.disposables.push(shadowMat);


    // V14.11 CAFÉ FLOOR REBUILD
    // The old Café floor used a DynamicTexture on a Ground mesh. It was the only
    // map bypassing the audited global floor() pipeline and could disappear/black out.
    // Rebuild it as native 2.5D geometry: solid base + geometric cobble lines.
    const floorMat=new BABYLON.StandardMaterial("cafe14_floorBaseMat",scene);
    floorMat.diffuseColor=new BABYLON.Color3(0.43,0.31,0.22);
    floorMat.emissiveColor=new BABYLON.Color3(0.36,0.25,0.17);
    floorMat.ambientColor=new BABYLON.Color3(1,1,1);
    floorMat.specularColor=new BABYLON.Color3(0,0,0);
    floorMat.disableLighting=true;
    floorMat.alpha=1;
    floorMat.backFaceCulling=false;
    rt.disposables.push(floorMat);

    const ground=BABYLON.MeshBuilder.CreateBox("cafe14_floor",{
      width:24,
      height:0.10,
      depth:16
    },scene);
    ground.position.y=-0.05;
    ground.material=floorMat;
    ground.parent=parentFor("BASE");
    ground.receiveShadows=false;
    ground.isPickable=false;
    ground.alwaysSelectAsActiveMesh=true;
    if(glow.addExcludedMesh)glow.addExcludedMesh(ground);

    const floorLines:any[]=[];
    const fw=24,fh=16,cell=1.35,fy=0.012;
    let frow=0;
    for(let z=-fh/2+0.5;z<fh/2;z+=cell){
      const zz=z+(seeded(frow*7.7)-0.5)*0.10;
      floorLines.push([new BABYLON.Vector3(-fw/2,fy,zz),new BABYLON.Vector3(fw/2,fy,zz)]);
      let fcol=0;
      const offset=(frow%2)*cell*0.44;
      for(let x=-fw/2+offset;x<fw/2;x+=cell){
        const xx=x+(seeded(frow*101+fcol*17)-0.5)*0.12;
        floorLines.push([
          new BABYLON.Vector3(xx,fy,Math.max(-fh/2,zz-cell*0.54)),
          new BABYLON.Vector3(xx,fy,Math.min(fh/2,zz+cell*0.54))
        ]);
        fcol++;
      }
      frow++;
    }
    const floorDetail=BABYLON.MeshBuilder.CreateLineSystem("cafe14_floorDetail",{lines:floorLines},scene);
    floorDetail.parent=parentFor("BASE");
    floorDetail.color=new BABYLON.Color3(0.20,0.13,0.085);
    floorDetail.alpha=0.52;
    floorDetail.isPickable=false;
    floorDetail.alwaysSelectAsActiveMesh=true;
    if(glow.addExcludedMesh)glow.addExcludedMesh(floorDetail);

    const b=(n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:any)=>{
      const q=box("cafe12_"+n,x,y,z,w,h,d,m);if(glow.addExcludedMesh)glow.addExcludedMesh(q);return q;
    };
    const cy=(n:string,x:number,y:number,z:number,d:number,h:number,m:any)=>{
      const q=cyl("cafe12_"+n,x,y,z,d,h,m);if(glow.addExcludedMesh)glow.addExcludedMesh(q);return q;
    };

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
    b("wallBack",0,0.90,-7.65,24,1.8,0.65,stoneDark);collider(0,-7.65,24,0.65);
    b("wallLeft",-11.65,0.90,-2.35,0.65,1.8,10.6,stoneDark);collider(-11.65,-2.35,0.65,10.6);
    b("wallRight",11.65,0.90,-2.00,0.65,1.8,11.2,stoneDark);collider(11.65,-2.00,0.65,11.2);

    // Bar + backbar.
    contactShadow("bar",-3.15,-5.0,6.4,1.8,0.30);b("bar",-3.15,0.56,-5.0,10.8,1.12,1.05,wood);b("barTop",-3.15,1.17,-5.0,11.2,0.15,1.25,woodLight);collider(-3.15,-5.0,10.8,1.05);
    b("barBack",-3.15,0.92,-6.25,10.2,1.84,0.34,woodDark);
    for(let i=0;i<12;i++)cy("backBottle",-7.8+i*0.84,1.33,-6.0,0.14,0.46,i%2?bottleA:bottleG);
    for(const x of [-6.8,-4.35,-1.9,0.55]){cy("stoolSeat",x,0.48,-3.7,0.72,0.15,woodLight);cy("stoolLeg",x,0.23,-3.7,0.18,0.46,woodDark);}

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
      for(const [dx,dz,r] of [[0,-1.45,0],[0,1.45,Math.PI],[-1.45,0,-Math.PI/2],[1.45,0,Math.PI/2]] as any[]){
        const root=new BABYLON.TransformNode("cafe12_chair",scene);root.parent=rt.root;root.position.set(x+dx,0,z+dz);root.rotation.y=r;
        const seat=BABYLON.MeshBuilder.CreateBox("cafe12_chairSeat",{width:0.55,height:0.15,depth:0.55},scene);seat.position.y=0.36;seat.material=wood;seat.parent=root;
        const back=BABYLON.MeshBuilder.CreateBox("cafe12_chairBack",{width:0.55,height:0.68,depth:0.10},scene);back.position.set(0,0.68,0.23);back.material=woodDark;back.parent=root;
        if(glow.addExcludedMesh){glow.addExcludedMesh(seat);glow.addExcludedMesh(back);}
      }
      for(let i=0;i<4;i++){const a=i*Math.PI/2;cy("plate",x+Math.cos(a)*0.58,0.80,z+Math.sin(a)*0.58,0.34,0.035,ceramic);}
    };
    table(-5.3,0.45);table(1.55,2.25);table(5.05,-0.45);

    // Right room / storage.
    b("partitionV",8.35,0.72,1.4,0.48,1.44,8.2,stone);
    b("partitionH",10.1,0.72,-2.7,3.8,1.44,0.48,stone);
    b("sideboard",-8.4,0.48,5.75,4.2,0.96,0.78,woodDark);b("sideboardTop",-8.4,1.00,5.75,4.28,0.10,0.84,woodLight);
    for(const x of [5.25,7.05]){contactShadow("barrel"+x,x,-5.25,1.35,1.0,0.75);cy("barrel",x,0.92,-5.25,1.46,1.84,wood);for(let r=0;r<3;r++)cy("barrelRing",x,0.18+r*0.74,-5.25,1.52,0.05,iron);collider(x,-5.25,1.2,1.2);}

    // Pool: readable cyan focal point.
    const poolBorder=cy("poolBorder",3.5,0.09,6.25,5.2,0.18,stoneLight);
    const waterMat=new BABYLON.StandardMaterial("cafe12_water",scene);waterMat.diffuseColor=new BABYLON.Color3(0.04,0.38,0.46);waterMat.emissiveColor=new BABYLON.Color3(0.02,0.13,0.16);waterMat.alpha=0.92;waterMat.specularColor=new BABYLON.Color3(0.25,0.35,0.38);rt.disposables.push(waterMat);
    const water=cy("poolWater",3.5,0.15,6.25,4.55,0.10,waterMat);rt.markers.pools.push({x:3.5,z:6.25,mesh:water,baseY:water.position.y});

    // Crates.
    for(const [x,z,sc] of [[9.1,-6.5,1],[10,-6.5,.8],[10.8,-6.5,.85]] as any[]){b("crate",x,0.38*sc,z,0.78*sc,0.76*sc,0.78*sc,wood);}

    // Painted light pools add warmth/cool contrast without consuming WebGL lights.
    lightPool("fire",-8.9,-1.15,7.2,5.2,[1.00,0.22,0.045],0.26);
    lightPool("bar",-2.7,-4.5,11.0,4.0,[1.00,0.46,0.12],0.12);
    lightPool("tableA",-5.3,0.45,3.6,3.6,[1.00,0.58,0.20],0.10);
    lightPool("tableB",1.55,2.25,3.8,3.8,[1.00,0.56,0.18],0.10);
    lightPool("tableC",5.05,-0.45,3.5,3.5,[1.00,0.54,0.16],0.085);
    lightPool("water",3.5,6.15,6.3,4.6,[0.06,0.58,0.70],0.13);

    // V16 Café reference-match: strengthen the silhouette and match the reference composition.
    b("frontWallL",-7.15,0.42,7.55,9.4,0.84,0.52,stoneDark);collider(-7.15,7.55,9.4,0.52);
    b("frontWallR",8.45,0.42,7.55,6.3,0.84,0.52,stoneDark);collider(8.45,7.55,6.3,0.52);
    b("entryPierL",-2.05,0.72,7.45,0.55,1.44,0.62,stone);
    b("entryPierR",2.05,0.72,7.45,0.55,1.44,0.62,stone);

    // Stone coping gives the pool a built-in, architectural look instead of a loose prop.
    for(const [px,pz,ww,dd] of [[3.5,5.22,5.8,0.32],[3.5,7.28,5.8,0.32],[0.75,6.25,0.32,2.35],[6.25,6.25,0.32,2.35]] as any[]){
      b("poolCoping",px,0.16,pz,ww,0.28,dd,stoneLight);
    }
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
    });

    // Candles remain visible/emissive, but do not each allocate a WebGL light UBO.
    for(const [x,z] of [[-5.3,0.45],[1.55,2.25],[5.05,-0.45]] as any[]){
      cy("candle",x,0.87,z,0.095,0.30,wax);
      const flame=sph("cafe12_candleFlame",x,1.10,z,0.10,M.fireInner,"VFX");flame.scaling.y=1.28;
    }

    // Only a few broad real lights: safe for WebGL2 shader limits.
    warmLight("wallFillLeft",-4.8,3.1,-4.25,0.58,9.6,[1,0.48,0.17]);
    warmLight("wallFillRight",5.4,3.0,-3.8,0.50,8.8,[1,0.42,0.12]);
    warmLight("poolFill",3.5,1.7,5.7,0.28,6.4,[0.08,0.56,0.68]);

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
    q.position.set(x,kind==="light"?0.052:0.018,z);q.material=m;q.parent=parentFor(kind==="light"?"BASE":"PROPS");q.isPickable=false;
    if(glow.addExcludedMesh)glow.addExcludedMesh(q);
    rt.disposables.push(tex,m);
    return q;
  }

  function trimPointLightsV13(maxCount:number){
    const pts=(scene.lights??[]).filter((l:any)=>l&&l.getClassName&&l.getClassName()==="PointLight"&&l.parent===rt.root&&!l.isDisposed?.());
    if(pts.length<=maxCount)return;
    pts.sort((a:any,b:any)=>((b.intensity??0)*(b.range??1))-((a.intensity??0)*(a.range??1)));
    pts.forEach((l:any,i:number)=>{if(i>=maxCount)l.setEnabled(false);});
  }

  function polishMaterialsV13(v:any){
    if(!v)return;
    const cache=new Map<any,any>();
    const boost=v.diffuseBoost??1.0, emissive=v.emissiveFloor??0.0, spec=v.specular??0.025;
    rt.root.getChildMeshes().forEach((mesh:any)=>{
      if(!mesh.material)return;
      if(mesh.name==="floor"||mesh.name==="floorDetail")return;
      if(mesh.parent===rt.layers?.VFX||mesh.name.includes("Flame")||mesh.name.includes("fire")||mesh.name.includes("smoke")||mesh.name.includes("mote")||mesh.name.includes("firefly"))return;
      if(glow.addExcludedMesh)glow.addExcludedMesh(mesh);
      const source=mesh.material;
      let m=cache.get(source);
      if(!m){
        m=source.clone(source.name+"_v13_"+rt.id);
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

  function templeVisibilityPassV30(){
    if(rt.id!=="temple")return;
    for(const m of rt.root.getChildMeshes()){
      const n=(m.name??"").toLowerCase();
      if(n.includes("templewallbody")||n.includes("templegatepier")||n.includes("templegatelintel")||n.includes("templegatecrown")){
        const mat=m.material;
        if(mat){
          mat.diffuseColor=new BABYLON.Color3(0.95,0.84,0.70);
          mat.emissiveColor=new BABYLON.Color3(0.16,0.12,0.085);
          mat.ambientColor=new BABYLON.Color3(0.72,0.64,0.54);
        }
      }else if(n.includes("templefloormain")){
        const mat=m.material;
        if(mat){
          mat.diffuseColor=new BABYLON.Color3(0.88,0.80,0.68);
          mat.emissiveColor=new BABYLON.Color3(0.14,0.11,0.08);
          mat.ambientColor=new BABYLON.Color3(0.70,0.64,0.56);
        }
      }
    }
  }

  function mergeStaticDetailMeshesV24(){
    const mergeNames=new Set([
      "floorScatter","rock","plantStem","plantLeaf","grassStem","grassLeaf","templeTreeTrunk","templeTreeCrown","waterBankRock","waterReed","templeHedge",
      "templeGardenStem","templeGardenLeaf","tableRoseStem","roseStem",
      "thornBranch","snowBranch","branchSnow",
      "iceRidge","iceFloeUnder","iceFloeTop",
      "bridgePlank","bridgePost","wallTrim","poolStone"
    ]);
    const groups=new Map<string,any[]>();
    const meshes=rt.root?.getChildMeshes?.()??[];
    for(const m of meshes){
      if(!mergeNames.has(m.name))continue;
      if(!m.material||m.parent===rt.layers?.VFX||m.isDisposed?.())continue;
      if(m.skeleton||m.morphTargetManager)continue;
      const matId=m.material.uniqueId??m.material.name??"mat";
      const key=m.name+"|"+matId;
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
        console.warn("[D8 v30] merge skipped",key,err);
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
    console.log("[D8 v30 audit]",rt.id,{meshes:meshes.length,frozen,vfxMeshes,lights:mapLights.length,activeLights:activeLights.length,updaters:rt.updaters.length,colliders:rt.colliders.length,interactables:rt.interactables.length,mergedGroups:rt.optimization?.mergedGroups??0,mergedSources:rt.optimization?.mergedSources??0});
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
      if(m.parent===rt.layers?.VFX||dynamicMeshes.has(m)||dynamicName(m.name))return;
      try{m.freezeWorldMatrix();}catch{}
    });
  }

  function setupGameplayGeometryV17(c:any){
    const nav=c.MAP.navigation??{};
    rt.navZones=[...(nav.zones??[])];
    rt.navBounds=nav.bounds??null;
    rt.geometryInteractables=[...(nav.interactions??[])];

    (nav.blockers??[]).forEach((q:any)=>collider(q.position[0],q.position[1],q.size[0],q.size[1]));
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
      cow_proxy:["Examinar animal","El animal permanece junto al pilón."],
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
    ring.position.set(pos[0],0.14,pos[1]);ring.rotation.x=Math.PI/2;ring.material=mat;ring.parent=parentFor("VFX");
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

  function loadMap(id:string){
    const c=D8NIGHT.maps[id];if(!c)return;
    reset(id,c);
    if(id==="cafe"&&c.MAP.renderMode==="clean_v12"){
      buildCafeCleanV12(c);
      graphicsV18(c);
      lightingV19(c);
      shadows(c);
      grid(c);
      applyScenePolishV13(id,c);
    }else{
      env(c);
      graphicsV18(c);
      floor(c);
      visualComposition(c);
      grid(c);
      c.MAP.objects.forEach(asset);
      applyReadableFallback(c);
      templeMaterialPassV23();
      lights(c);
      lightingV19(c);
      vfx(c);
      applyScenePolishV13(id,c);
      templeVisibilityPassV30();
      mergeStaticDetailMeshesV24();
      shadows(c);
    }
    setupGameplayGeometryV17(c);
    optimizeStaticMeshesV24();
    const autoInspectables=buildAmbientInspectablesV17(c);
    rt.interactables=[...(c.CANON.interactables??[]),...(c.VTT_AMBIENCE.interactables??[]),...(rt.geometryInteractables??[]),...autoInspectables];
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
    if(id==="cafe")console.log("[D8 v30] Café meshes:",rt.root.getChildMeshes().length,"scene lights:",scene.lights.length);
    Object.keys(buttons).forEach(k=>buttons[k].background=k===id?"#765127":"#25252a");
    show("Mapa cargado: "+c.label);
  }

  const keys:any={};
  scene.onKeyboardObservable.add((kb:any)=>{
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

  scene.onBeforeRenderObservable.add(()=>{if(!rt.config)return;const dt=Math.min(engine.getDeltaTime()/1000,0.05);elapsed+=dt;let dx=0,dz=0;if(keys.w)dz--;if(keys.s)dz++;if(keys.a)dx++;if(keys.d)dx--;if(dx||dz){const l=Math.sqrt(dx*dx+dz*dz);dx/=l;dz/=l;const d=4*dt,nx=player.position.x+dx*d,nz=player.position.z+dz*d;if(!blocked(nx,player.position.z))player.position.x=nx;if(!blocked(player.position.x,nz))player.position.z=nz;player.rotation.y=Math.atan2(dx,dz);}const camOff=rt.config?.camera?.targetOffset??[0,0,0];const target=new BABYLON.Vector3(player.position.x+(camOff[0]??0),camOff[1]??0,player.position.z+(camOff[2]??0));camera.target=BABYLON.Vector3.Lerp(camera.target,target,overview?0.035:0.085);interaction();updateTerrainHudV17();rt.updaters.forEach((u:any)=>u(elapsed));});

  loadMap("cafe");
  return scene;
}
