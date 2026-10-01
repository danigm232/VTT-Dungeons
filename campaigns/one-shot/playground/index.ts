import { D8NIGHT } from "./d8night.config";

export function createScene(engine: any, canvas: any) {
  const scene = new BABYLON.Scene(engine);
  const camera = new BABYLON.ArcRotateCamera("camera",-Math.PI/2.15,0.70,20,BABYLON.Vector3.Zero(),scene);
  camera.attachControl(canvas,true);
  camera.lowerRadiusLimit=10; camera.upperRadiusLimit=34; camera.lowerBetaLimit=0.48; camera.upperBetaLimit=1.05; camera.wheelPrecision=38;

  const hemi=new BABYLON.HemisphericLight("global",new BABYLON.Vector3(0,1,0),scene);
  hemi.intensity=0.28;
  const glow=new BABYLON.GlowLayer("glow",scene); glow.intensity=0.5;

  function mat(name:string,c:number[],o:any={}) {
    const m=new BABYLON.StandardMaterial(name,scene);
    m.diffuseColor=new BABYLON.Color3(c[0],c[1],c[2]);
    const s=o.specular??0.035; m.specularColor=new BABYLON.Color3(s,s,s);
    if(o.emissive)m.emissiveColor=new BABYLON.Color3(o.emissive[0],o.emissive[1],o.emissive[2]);
    if(o.alpha!==undefined)m.alpha=o.alpha;
    if(o.disableLighting)m.disableLighting=true;
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
    rose:mat("rose",[0.62,0.025,0.035],{emissive:[0.025,0,0]}), rosePink:mat("rosePink",[0.78,0.14,0.22]), leaf:mat("leaf",[0.08,0.24,0.07]), leafDark:mat("leafDark",[0.035,0.12,0.035]),
    frost:mat("frost",[0.70,0.88,1],{alpha:0.80,specular:0.6,emissive:[0.02,0.05,0.08]}), magicBlue:mat("magicBlue",[0.08,0.52,1],{emissive:[0.03,0.30,0.85],alpha:0.92}),
    magicWhite:mat("magicWhite",[0.78,0.92,1],{emissive:[0.35,0.58,0.85]}), roof:mat("roof",[0.17,0.055,0.025]), plaster:mat("plaster",[0.46,0.40,0.32]),
    soil:mat("soil",[0.17,0.08,0.035]), grass:mat("grass",[0.09,0.22,0.055]), lanternGlass:mat("lanternGlass",[1,0.56,0.10],{emissive:[0.9,0.28,0.02],alpha:0.72})
  };

  let rt:any={id:null,config:null,root:null,layers:{},colliders:[],interactables:[],updaters:[],grid:null,disposables:[],markers:{fireplaces:[],pools:[],roses:[],magic:[]}};
  let gridVisible=false, overview=false, nearest:any=null, elapsed=0;
  const reset=(id:string,c:any)=>{
    if(rt.disposables)rt.disposables.forEach((d:any)=>{try{d.dispose();}catch{}});
    if(rt.root)rt.root.dispose(false,false);
    const root=new BABYLON.TransformNode("MAP_"+id,scene);
    const layers:any={};
    for(const name of ["BASE","PROPS","VFX","INTERACTABLES","DEBUG"]){
      const node=new BABYLON.TransformNode("LAYER_"+name,scene);node.parent=root;layers[name]=node;
    }
    rt={id,config:c,root,layers,colliders:[],interactables:[],updaters:[],grid:null,disposables:[],markers:{fireplaces:[],pools:[],roses:[],magic:[]}};
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

    const tex=new BABYLON.DynamicTexture("visualFloor_"+preset,{width:1024,height:1024},scene,false);
    const ctx:any=tex.getContext();
    const W=1024,H=1024;

    const palette:any={
      cafe_stone:{base:"#4b3627",stone:["#6b4b33","#77563b","#5e412d","#896343"],line:"#251912"},
      temple_stone:{base:"#242126",stone:["#39333a","#463e42","#302c32","#51464a"],line:"#171419"},
      night_cobble:{base:"#2b2927",stone:["#454039","#50483e","#393633","#5b5145"],line:"#171513"},
      market_cobble:{base:"#6b5138",stone:["#8a6c4b","#9a7953","#73583e","#ad875b"],line:"#3a2b20"},
      snow:{base:"#d9e2e7",stone:[],line:"#9aaeb9"},
      ice:{base:"#4d89ad",stone:["#5c9bc0","#477e9f","#6aa5c5","#3f7394"],line:"#c4e6f3"}
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

    const m=new BABYLON.StandardMaterial("visualMat_"+preset,scene);
    m.diffuseTexture=tex;
    m.specularColor=preset==="ice"?new BABYLON.Color3(0.30,0.38,0.44):new BABYLON.Color3(0.025,0.025,0.025);
    m.roughness=preset==="ice"?0.42:0.92;
    VISUAL_FLOORS[preset]=m;
    return m;
  }

  function floor(c:any){
    let m=M.stone;
    if(c.MAP.visualFloor)m=visualFloorMaterial(c.MAP.visualFloor);
    else if(c.MAP.floor==="snow")m=M.snow;
    else if(c.MAP.floor==="ice")m=M.ice;
    else if(c.MAP.floor==="stone_tavern")m=M.stoneDark;

    const g=BABYLON.MeshBuilder.CreateGround("floor",{width:c.MAP.size[0],height:c.MAP.size[1]},scene);
    g.material=m;
    g.parent=parentFor("BASE");
    g.receiveShadows=true;

    // Legacy primitive stone floor remains available only when no visual texture preset is set.
    if(!c.MAP.visualFloor&&c.MAP.floor==="stone_tavern"){
      let row=0;
      for(let z=-7.1;z<=7.1;z+=1){
        let col=0;
        for(let x=-11;x<=11;x+=1.15){
          const n=row*37+col*19;
          const stone=box("floorStone",x+(row%2?0.25:0),0.018,z,0.82,0.035,0.65,n%2?M.stone:M.stone2,"BASE");
          stone.rotation.y=Math.sin(n)*0.07;
          col++;
        }
        row++;
      }
    }
  }

  function visualComposition(c:any){
    const preset=c.MAP.visualComposition;
    if(!preset)return;

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
      glowRadial(0.19,0.42,0.20,"rgba(40,150,255,0.23)","rgba(40,150,255,0)");
      glowRadial(0.52,0.50,0.27,"rgba(130,220,255,0.08)","rgba(130,220,255,0)");
      ctx.strokeStyle="rgba(200,238,255,0.18)";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(0.30*W,0.48*H);ctx.lineTo(0.48*W,0.42*H);ctx.lineTo(0.57*W,0.55*H);ctx.lineTo(0.74*W,0.48*H);ctx.stroke();
    }

    tex.update();

    const m=new BABYLON.StandardMaterial("compositionMat_"+preset,scene);
    m.diffuseTexture=tex;
    m.opacityTexture=tex;
    m.useAlphaFromDiffuseTexture=true;
    m.disableLighting=true;
    m.backFaceCulling=false;
    m.alpha=1;

    const size=c.MAP.size;
    const g=BABYLON.MeshBuilder.CreateGround("visualComposition",{width:size[0],height:size[1]},scene);
    g.position.y=0.028;
    g.material=m;
    g.parent=parentFor("BASE");
  }

  function grid(c:any){
    const w=c.MAP.size[0],h=c.MAP.size[1],lines:any[]=[];
    for(let x=-w/2;x<=w/2;x++)lines.push([new BABYLON.Vector3(x,0.07,-h/2),new BABYLON.Vector3(x,0.07,h/2)]);
    for(let z=-h/2;z<=h/2;z++)lines.push([new BABYLON.Vector3(-w/2,0.07,z),new BABYLON.Vector3(w/2,0.07,z)]);
    const g=BABYLON.MeshBuilder.CreateLineSystem("grid",{lines},scene);g.parent=parentFor("DEBUG");g.color=new BABYLON.Color3(0.15,0.13,0.10);g.alpha=0.15;g.setEnabled(gridVisible);rt.grid=g;
  }

  function asset(o:any){
    const x=o.position[0],z=o.position[1],s=o.scale??1;
    if(o.asset==="wall"){
      const h=o.height??1.6,material=M[o.material]??M.stoneDark;
      box("wall",x,h/2,z,o.size[0],h,o.size[1],material);
      collider(x,z,o.size[0],o.size[1]);
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
      light.parent=rt.root; light.diffuse=new BABYLON.Color3(1,0.48,0.13); light.range=o.range??2.7; light.intensity=o.intensity??0.22;
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
      light.parent=rt.root;light.diffuse=new BABYLON.Color3(0.10,0.55,1);light.range=6;light.intensity=o.intensity??0.75;
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
    }
    else if(o.asset==="fireplace"){box("fireplace",x-0.9,0.85,z,1.4,1.7,3.9,M.stoneDark);box("opening",x,0.4,z,0.25,0.8,1.4,M.woodDark);collider(x-0.7,z,1.4,3.9);rt.markers.fireplaces.push({x,z});}
    else if(o.asset==="rug"){box("rugBorder",x,0.075,z,o.size[0],0.04,o.size[1],M.yellow);box("rug",x,0.09,z,o.size[0]-0.25,0.025,o.size[1]-0.25,M.green);}
    else if(o.asset==="pool"){const water=box("poolWater",x,0.055,z,5.3,0.08,1.7,M.water);box("poolGlow",x,0.095,z,4.4,0.02,1,M.waterGlow);for(let i=0;i<13;i++){box("poolStone",x-2.9+i*0.48,0.15,z-1.05,0.4,0.25,0.28,i%2?M.stone:M.stone2);box("poolStone",x-2.9+i*0.48,0.15,z+1.05,0.4,0.25,0.28,i%2?M.stone2:M.stone);}collider(x,z,6.2,2.3);rt.markers.pools.push({x,z,mesh:water,baseY:water.position.y});}
    else if(o.asset==="cabinet"){box("cabinet",x,0.48,z,o.size[0],0.96,o.size[1],M.woodDark);collider(x,z,o.size[0],o.size[1]);}
    else if(o.asset==="crate"){const q=0.8*s;box("crate",x,q/2,z,q,q,q,M.wood);box("crateCross",x,q+0.02,z,q*0.9,0.04,0.1,M.woodDark);collider(x,z,q,q);}
    else if(o.asset==="statue"){box("statueBase",x,0.3,z,2,0.6,1.4,M.stoneLight);box("statue",x,1.5,z,0.8,2.4,0.7,M.stoneLight);collider(x,z,2,1.4);}
    else if(o.asset==="path"){box("path",x,0.04,z,o.size[0],0.08,o.size[1],M.stone);}
    else if(o.asset==="tree"){box("treeTrunk",x,1.2,z,0.7,2.4,0.7,M.woodDark);sph("treeCrown",x,2.5,z,2.8,M.purple);collider(x,z,0.8,0.8);}
    else if(o.asset==="stall"){box("stall",x,0.5,z,4,1,1.4,M.wood);box("canopy",x,1.55,z,4.5,0.12,2,M[o.color]??M.green);collider(x,z,4,1.4);}
    else if(o.asset==="water_area"){box("waterArea",x,0.04,z,o.size[0],0.08,o.size[1],M.water);rt.markers.pools.push({x,z});}
    else if(o.asset==="mirror"){box("mirrorBase",x,0.45,z,2.5,0.9,2.5,M.stoneDark);box("mirror",x,1.8,z,1.6,2.2,0.25,M.gold);collider(x,z,2.5,2.5);}
  }

  function env(c:any){
    const e=c.VTT_AMBIENCE.environment;
    scene.clearColor=new BABYLON.Color4(e.clearColor[0],e.clearColor[1],e.clearColor[2],1);
    if(e.fog){scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=e.fogDensity;scene.fogColor=new BABYLON.Color3(e.clearColor[0],e.clearColor[1],e.clearColor[2]);}
    else scene.fogMode=BABYLON.Scene.FOGMODE_NONE;
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
  function lights(c:any){
    const l=c.VTT_AMBIENCE.lighting??{};
    hemi.intensity=l.ambientIntensity??0.12;
    const hc=l.ambientColor??[1,1,1];
    hemi.diffuse=new BABYLON.Color3(hc[0],hc[1],hc[2]);
    hemi.groundColor=new BABYLON.Color3((hc[0]??1)*0.18,(hc[1]??1)*0.18,(hc[2]??1)*0.18);

    (l.lights??[]).forEach((d:any)=>{
      const q=track(new BABYLON.PointLight("mapLight",new BABYLON.Vector3(d.position[0],d.position[1],d.position[2]),scene));
      q.parent=rt.root;
      q.diffuse=new BABYLON.Color3(d.color[0],d.color[1],d.color[2]);
      q.intensity=d.intensity??0.4;
      q.range=d.range??6;
    });
  }

  function fire(marker:any,v:any){const a=sph("fireOuter",marker.x,0.45,marker.z,0.58,M.fireOuter,"VFX");a.scaling.y=1.75;const b=sph("fireInner",marker.x,0.38,marker.z,0.32,M.fireInner,"VFX");b.scaling.y=1.7;const l=track(new BABYLON.PointLight("fireLight",new BABYLON.Vector3(marker.x,1.2,marker.z),scene));l.parent=rt.root;l.diffuse=new BABYLON.Color3(1,0.24,0.02);l.range=8.2;l.intensity=2.65;const ay=a.position.y,by=b.position.y;rt.updaters.push((t:number)=>{const x=Math.sin(t*9.4),y=Math.sin(t*14.2);a.position.y=ay+x*0.04;b.position.y=by+y*0.025;a.scaling.x=1+x*0.09;l.intensity=2.55+x*0.30+y*0.14;});if(v.smoke)for(let i=0;i<6;i++){const s=sph("smoke",marker.x,0.8+i*0.2,marker.z,0.3+i*0.05,M.smoke,"VFX"),o=i/6;rt.updaters.push((t:number)=>{const c=(t*0.18+o)%1;s.position.y=0.75+c*3;s.position.x=marker.x+Math.sin(t*0.6+i)*0.18;const k=0.7+c*1.4;s.scaling.set(k,k*1.2,k);});}}
  function dust(){for(let i=0;i<16;i++){const x=-9+((i*37)%18),z=-5+((i*23)%10),m=sph("dust",x,0.7+(i%5)*0.42,z,0.035,M.dust,"VFX"),y=m.position.y;rt.updaters.push((t:number)=>m.position.y=y+Math.sin(t*0.7+i)*0.14);}}
  function ripple(x:number,z:number,o:number){const p:any[]=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;p.push(new BABYLON.Vector3(Math.cos(a)*0.45,0,Math.sin(a)*0.45));}const r=BABYLON.MeshBuilder.CreateLines("ripple",{points:p},scene);r.parent=parentFor("VFX");r.position.set(x,0.13,z);r.color=new BABYLON.Color3(0.2,0.75,0.8);rt.updaters.push((t:number)=>{const c=(t*0.2+o)%1,k=0.5+c*4;r.scaling.set(k,1,k);r.alpha=0.3*(1-c);});}
  function embers(marker:any){
    for(let i=0;i<8;i++){
      const e=sph("ember",marker.x,0.35,marker.z,0.035+(i%3)*0.01,M.fireOuter,"VFX"),off=i/8;
      rt.updaters.push((t:number)=>{const c=(t*0.55+off)%1;e.position.y=0.35+c*1.6;e.position.x=marker.x+Math.sin(t*2+i)*0.18*c;e.position.z=marker.z+Math.cos(t*1.7+i)*0.13*c;const k=1-c;e.scaling.set(k,k,k);});
    }
  }
  function snowfall(c:any,v:any){
    const size=c.MAP.size,count=v.snowCount??34;
    for(let i=0;i<count;i++){
      const x=-size[0]/2+((i*47)%100)/100*size[0],z=-size[1]/2+((i*71)%100)/100*size[1];
      const flake=sph("snowFlake",x,0.8+((i*31)%100)/100*4.5,z,0.045+(i%3)*0.018,M.magicWhite,"VFX");
      const startY=flake.position.y,seed=i*0.73;
      rt.updaters.push((t:number)=>{
        let y=startY-((t*(v.snowSpeed??0.45)+seed)%5.2);
        if(y<0.18)y+=5.2;
        flake.position.y=y;flake.position.x=x+Math.sin(t*0.65+seed)*0.28;flake.position.z=z+Math.cos(t*0.4+seed)*0.12;
      });
    }
  }
  function fireflies(c:any,v:any){
    const count=v.fireflyCount??18,size=c.MAP.size;
    for(let i=0;i<count;i++){
      const x=-size[0]*0.38+((i*43)%100)/100*size[0]*0.76,z=-size[1]*0.36+((i*67)%100)/100*size[1]*0.72;
      const f=sph("firefly",x,0.55+(i%5)*0.35,z,0.035,M.lanternGlass,"VFX"),baseY=f.position.y,seed=i*1.17;
      rt.updaters.push((t:number)=>{f.position.y=baseY+Math.sin(t*1.1+seed)*0.22;f.position.x=x+Math.sin(t*0.55+seed)*0.35;f.position.z=z+Math.cos(t*0.72+seed)*0.28;const k=0.65+Math.sin(t*3.2+seed)*0.25;f.scaling.set(k,k,k);});
    }
  }
  function roseSway(){
    rt.markers.roses.forEach((r:any)=>rt.updaters.push((t:number)=>{r.mesh.position.y=r.baseY+Math.sin(t*1.4+r.seed)*0.018;r.mesh.rotation.z=Math.sin(t*1.1+r.seed)*0.08;}));
  }
  function magicMotes(v:any){
    rt.markers.magic.forEach((m:any)=>{
      for(let i=0;i<(v.magicCount??12);i++){
        const p=sph("magicMote",m.x,0.55,m.z,0.045+(i%3)*0.012,i%2?M.magicBlue:M.magicWhite,"VFX"),off=i/12,seed=i*0.9+m.seed;
        rt.updaters.push((t:number)=>{const a=t*0.65+seed,r=0.55+((i%4)*0.16);p.position.x=m.x+Math.cos(a)*r;p.position.z=m.z+Math.sin(a)*r;p.position.y=0.45+((t*0.22+off)%1)*2.7;const k=0.55+Math.sin(t*3+seed)*0.25;p.scaling.set(k,k,k);});
      }
      if(m.light)rt.updaters.push((t:number)=>m.light.intensity=0.70+Math.sin(t*2+m.seed)*0.12);
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
    if(v.roseSway)roseSway();
    if(v.magicMotes)magicMotes(v);
  }

  function shadows(c:any){
    const sh=c.VTT_AMBIENCE.lighting?.shadows;
    if(!sh?.enabled)return;
    const lighting=c.VTT_AMBIENCE.lighting??{};
    const natural=lighting.mode==="exterior"?(lighting.natural??{}):{};
    const p=natural.position??sh.position??[-8,6,-4];
    const d=natural.direction??sh.direction??[0.8,-1,0.25];
    const light=new BABYLON.DirectionalLight(lighting.mode==="exterior"?"naturalLight":"shadowLight",new BABYLON.Vector3(d[0],d[1],d[2]),scene);
    light.position=new BABYLON.Vector3(p[0],p[1],p[2]);
    light.intensity=lighting.mode==="exterior"?(natural.intensity??0.36):(sh.intensity??0.08);
    const sc=lighting.mode==="exterior"?(natural.color??[0.55,0.65,0.82]):(sh.color??[0.75,0.58,0.38]);
    light.diffuse=new BABYLON.Color3(sc[0],sc[1],sc[2]);
    const gen=new BABYLON.ShadowGenerator(sh.mapSize??1024,light); gen.useBlurExponentialShadowMap=true; gen.blurKernel=sh.blurKernel??12;
    rt.root.getChildMeshes().forEach((m:any)=>{m.receiveShadows=true;if(m.name!=="floorStone"&&!m.name.includes("smoke")&&!m.name.includes("dust")&&!m.name.includes("ripple")&&!m.name.includes("poolWater")&&!m.name.includes("poolGlow"))gen.addShadowCaster(m);});
    rt.disposables.push(gen,light);
  }

  const player=BABYLON.MeshBuilder.CreateCylinder("player",{diameter:0.62,height:0.84,tessellation:24},scene);player.material=M.player;
  const arrow=BABYLON.MeshBuilder.CreateCylinder("direction",{diameterTop:0,diameterBottom:0.2,height:0.42,tessellation:3},scene);arrow.parent=player;arrow.position.set(0,0,-0.48);arrow.rotation.z=Math.PI/2;arrow.material=M.gold;

  const ringPts:any[]=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;ringPts.push(new BABYLON.Vector3(Math.cos(a)*0.65,0,Math.sin(a)*0.65));}
  const ring=BABYLON.MeshBuilder.CreateLines("interactionRing",{points:ringPts},scene);ring.color=new BABYLON.Color3(1,0.65,0.12);ring.isVisible=false;

  const ui=BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI"),panel=new BABYLON.GUI.StackPanel();
  panel.width="190px";panel.horizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;panel.paddingLeft="15px";panel.paddingTop="15px";ui.addControl(panel);
  const title=new BABYLON.GUI.TextBlock();title.text="D8 NIGHT · V8";title.height="42px";title.fontSize=20;title.color="#efd5a5";panel.addControl(title);
  const order=["temple","cafe","dinner","garden","market","mirror"],labels:any={temple:"1 · TEMPLO",cafe:"2 · CAFÉ",dinner:"3 · DINNER",garden:"4 · GARDEN",market:"5 · MARKET",mirror:"6 · MIRROR"},buttons:any={};
  order.forEach(id=>{const b=BABYLON.GUI.Button.CreateSimpleButton("btn_"+id,labels[id]);b.width="175px";b.height="37px";b.color="#dfcfb2";b.background="#25252a";b.cornerRadius=5;b.paddingBottom="4px";b.onPointerClickObservable.add(()=>loadMap(id));buttons[id]=b;panel.addControl(b);});
  const help=new BABYLON.GUI.TextBlock();help.text="\nWASD · mover\nE · interactuar\nG · grid\nC · cámara";help.height="100px";help.color="#888";help.fontSize=11;help.textHorizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.addControl(help);
  const ip=new BABYLON.GUI.Rectangle();ip.width="330px";ip.height="48px";ip.cornerRadius=8;ip.color="#c9aa70";ip.background="#101116E8";ip.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;ip.top="-25px";ip.isVisible=false;ui.addControl(ip);
  const it=new BABYLON.GUI.TextBlock();it.color="#fff";it.fontSize=14;ip.addControl(it);
  const msg=new BABYLON.GUI.TextBlock();msg.width="650px";msg.height="55px";msg.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;msg.top="15px";msg.color="#efdfc3";msg.fontSize=13;ui.addControl(msg);
  let timer:any=null;const show=(t:string)=>{msg.text=t;if(timer)clearTimeout(timer);timer=setTimeout(()=>msg.text="",3000);};

  function loadMap(id:string){const c=D8NIGHT.maps[id];if(!c)return;reset(id,c);env(c);floor(c);visualComposition(c);grid(c);c.MAP.objects.forEach(asset);lights(c);vfx(c);shadows(c);rt.interactables=[...(c.CANON.interactables??[]),...(c.VTT_AMBIENCE.interactables??[])];player.position.set(c.spawn[0],c.spawn[1],c.spawn[2]);if(!overview&&c.camera){camera.radius=c.camera.radius??20;camera.beta=c.camera.beta??0.70;camera.alpha=c.camera.alpha??-Math.PI/2.15;}camera.target.set(player.position.x,0,player.position.z);ring.isVisible=false;title.text=c.label+" · V8";Object.keys(buttons).forEach(k=>buttons[k].background=k===id?"#765127":"#25252a");show("Mapa cargado: "+c.label);}

  const keys:any={};
  window.addEventListener("keydown",(e:KeyboardEvent)=>{const k=e.key.toLowerCase();keys[k]=true;if(k>="1"&&k<="6")loadMap(order[Number(k)-1]);if(k==="e"&&!e.repeat&&nearest)show(nearest.message);if(k==="g"&&!e.repeat){gridVisible=!gridVisible;if(rt.grid)rt.grid.setEnabled(gridVisible);show(gridVisible?"Grid activado":"Grid oculto");}if(k==="c"&&!e.repeat){overview=!overview;const cfg=rt.config?.camera??{};const size=rt.config?.MAP?.size??[24,16];if(overview){camera.radius=Math.max(size[0],size[1])*1.05;camera.beta=0.46;}else{camera.radius=cfg.radius??20;camera.beta=cfg.beta??0.70;camera.alpha=cfg.alpha??-Math.PI/2.15;}show(overview?"Cámara general":"Cámara de escena");}});
  window.addEventListener("keyup",(e:KeyboardEvent)=>keys[e.key.toLowerCase()]=false);

  const radius=0.32;
  function blocked(x:number,z:number){const s=rt.config.MAP.size;if(x<-s[0]/2+radius||x>s[0]/2-radius||z<-s[1]/2+radius||z>s[1]/2-radius)return true;for(const c of rt.colliders)if(x>=c.minX-radius&&x<=c.maxX+radius&&z>=c.minZ-radius&&z<=c.maxZ+radius)return true;return false;}
  function interaction(){nearest=null;ip.isVisible=false;ring.isVisible=false;let best=Infinity;rt.interactables.forEach((q:any)=>{const dx=player.position.x-q.position[0],dz=player.position.z-q.position[1],d=Math.sqrt(dx*dx+dz*dz);if(d<=q.radius&&d<best){best=d;nearest=q;}});if(nearest){ip.isVisible=true;it.text="[ E ]   "+nearest.label;ring.position.set(nearest.position[0],0.09,nearest.position[1]);ring.isVisible=true;}}

  scene.onBeforeRenderObservable.add(()=>{if(!rt.config)return;const dt=Math.min(engine.getDeltaTime()/1000,0.05);elapsed+=dt;let dx=0,dz=0;if(keys.w)dz--;if(keys.s)dz++;if(keys.a)dx--;if(keys.d)dx++;if(dx||dz){const l=Math.sqrt(dx*dx+dz*dz);dx/=l;dz/=l;const d=4*dt,nx=player.position.x+dx*d,nz=player.position.z+dz*d;if(!blocked(nx,player.position.z))player.position.x=nx;if(!blocked(player.position.x,nz))player.position.z=nz;player.rotation.y=Math.atan2(dx,dz);}const target=new BABYLON.Vector3(player.position.x,0,player.position.z);camera.target=BABYLON.Vector3.Lerp(camera.target,target,overview?0.035:0.085);interaction();rt.updaters.forEach((u:any)=>u(elapsed));});

  loadMap("cafe");
  return scene;
}
