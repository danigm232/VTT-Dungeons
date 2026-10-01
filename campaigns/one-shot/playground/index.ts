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
    stone:mat("stone",[0.26,0.21,0.16]), stone2:mat("stone2",[0.34,0.27,0.20]), stoneDark:mat("stoneDark",[0.09,0.07,0.055]),
    stoneLight:mat("stoneLight",[0.47,0.39,0.29]), wood:mat("wood",[0.30,0.12,0.035]), woodLight:mat("woodLight",[0.47,0.23,0.07]),
    woodDark:mat("woodDark",[0.10,0.032,0.01]), green:mat("green",[0.14,0.28,0.07]), red:mat("red",[0.43,0.025,0.018]),
    purple:mat("purple",[0.31,0.13,0.45]), yellow:mat("yellow",[0.70,0.42,0.05]), snow:mat("snow",[0.73,0.79,0.84]),
    ice:mat("ice",[0.15,0.40,0.58],{alpha:0.88,specular:0.5}), water:mat("water",[0.005,0.18,0.24],{alpha:0.75,specular:0.85,emissive:[0,0.03,0.05]}),
    waterGlow:mat("waterGlow",[0.02,0.50,0.52],{alpha:0.15,emissive:[0,0.16,0.17]}),
    fireOuter:mat("fireOuter",[1,0.08,0.005],{emissive:[1,0.08,0]}), fireInner:mat("fireInner",[1,0.62,0.02],{emissive:[1,0.40,0]}),
    smoke:mat("smoke",[0.15,0.14,0.13],{alpha:0.13,disableLighting:true}), dust:mat("dust",[1,0.70,0.25],{alpha:0.5,emissive:[0.35,0.14,0]}),
    player:mat("player",[0.02,0.58,1],{emissive:[0,0.08,0.18]}), gold:mat("gold",[0.72,0.43,0.07]),
    wax:mat("wax",[0.82,0.72,0.53]), ceramic:mat("ceramic",[0.72,0.67,0.56],{specular:0.12}),
    iron:mat("iron",[0.12,0.11,0.10],{specular:0.18}), clothRed:mat("clothRed",[0.34,0.035,0.025]), clothBlue:mat("clothBlue",[0.05,0.12,0.24])
  };

  let rt:any={id:null,config:null,root:null,colliders:[],interactables:[],updaters:[],grid:null,disposables:[],markers:{fireplaces:[],pools:[]}};
  let gridVisible=true, overview=false, nearest:any=null, elapsed=0;
  const reset=(id:string,c:any)=>{ if(rt.disposables)rt.disposables.forEach((d:any)=>{try{d.dispose();}catch{}}); if(rt.root)rt.root.dispose(false,false); rt={id,config:c,root:new BABYLON.TransformNode("MAP_"+id,scene),colliders:[],interactables:[],updaters:[],grid:null,disposables:[],markers:{fireplaces:[],pools:[]}}; };

  const box=(n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:any)=>{const q=BABYLON.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);q.position.set(x,y,z);q.material=m;q.parent=rt.root;return q;};
  const cyl=(n:string,x:number,y:number,z:number,d:number,h:number,m:any)=>{const q=BABYLON.MeshBuilder.CreateCylinder(n,{diameter:d,height:h,tessellation:24},scene);q.position.set(x,y,z);q.material=m;q.parent=rt.root;return q;};
  const sph=(n:string,x:number,y:number,z:number,d:number,m:any)=>{const q=BABYLON.MeshBuilder.CreateSphere(n,{diameter:d,segments:12},scene);q.position.set(x,y,z);q.material=m;q.parent=rt.root;return q;};
  const collider=(x:number,z:number,w:number,d:number)=>rt.colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});

  function floor(c:any){
    let m=M.stone; if(c.MAP.floor==="snow")m=M.snow; if(c.MAP.floor==="ice")m=M.ice; if(c.MAP.floor==="stone_tavern")m=M.stoneDark;
    const g=BABYLON.MeshBuilder.CreateGround("floor",{width:c.MAP.size[0],height:c.MAP.size[1]},scene);g.material=m;g.parent=rt.root;
    if(c.MAP.floor==="stone_tavern"){let row=0;for(let z=-7.1;z<=7.1;z+=1){let col=0;for(let x=-11;x<=11;x+=1.15){const n=row*37+col*19;const s=box("floorStone",x+(row%2?0.25:0),0.018,z,0.82,0.035,0.65,n%2?M.stone:M.stone2);s.rotation.y=Math.sin(n)*0.07;col++;}row++;}}
  }

  function grid(c:any){
    const w=c.MAP.size[0],h=c.MAP.size[1],lines:any[]=[];
    for(let x=-w/2;x<=w/2;x++)lines.push([new BABYLON.Vector3(x,0.07,-h/2),new BABYLON.Vector3(x,0.07,h/2)]);
    for(let z=-h/2;z<=h/2;z++)lines.push([new BABYLON.Vector3(-w/2,0.07,z),new BABYLON.Vector3(w/2,0.07,z)]);
    const g=BABYLON.MeshBuilder.CreateLineSystem("grid",{lines},scene);g.parent=rt.root;g.color=new BABYLON.Color3(0.15,0.13,0.10);g.alpha=0.15;g.setEnabled(gridVisible);rt.grid=g;
  }

  function asset(o:any){
    const x=o.position[0],z=o.position[1],s=o.scale??1;
    if(o.asset==="wall"){box("wall",x,0.8,z,o.size[0],1.6,o.size[1],M.stoneDark);collider(x,z,o.size[0],o.size[1]);}
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
      const light=new BABYLON.PointLight("candleLight",new BABYLON.Vector3(x,0.70+h+0.18,z),scene);
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

  function env(c:any){const e=c.VTT_AMBIENCE.environment;scene.clearColor=new BABYLON.Color4(e.clearColor[0],e.clearColor[1],e.clearColor[2],1);if(e.fog){scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=e.fogDensity;scene.fogColor=new BABYLON.Color3(e.clearColor[0],e.clearColor[1],e.clearColor[2]);}else scene.fogMode=BABYLON.Scene.FOGMODE_NONE;}
  function lights(c:any){const l=c.VTT_AMBIENCE.lighting;hemi.intensity=l.ambientIntensity;(l.lights??[]).forEach((d:any)=>{const q=new BABYLON.PointLight("mapLight",new BABYLON.Vector3(d.position[0],d.position[1],d.position[2]),scene);q.parent=rt.root;q.diffuse=new BABYLON.Color3(d.color[0],d.color[1],d.color[2]);q.intensity=d.intensity;q.range=d.range;});}

  function fire(marker:any,v:any){const a=sph("fireOuter",marker.x,0.45,marker.z,0.58,M.fireOuter);a.scaling.y=1.75;const b=sph("fireInner",marker.x,0.38,marker.z,0.32,M.fireInner);b.scaling.y=1.7;const l=new BABYLON.PointLight("fireLight",new BABYLON.Vector3(marker.x,1.2,marker.z),scene);l.parent=rt.root;l.diffuse=new BABYLON.Color3(1,0.24,0.02);l.range=7;l.intensity=2.1;const ay=a.position.y,by=b.position.y;rt.updaters.push((t:number)=>{const x=Math.sin(t*9.4),y=Math.sin(t*14.2);a.position.y=ay+x*0.04;b.position.y=by+y*0.025;a.scaling.x=1+x*0.09;l.intensity=2+x*0.22+y*0.1;});if(v.smoke)for(let i=0;i<6;i++){const s=sph("smoke",marker.x,0.8+i*0.2,marker.z,0.3+i*0.05,M.smoke),o=i/6;rt.updaters.push((t:number)=>{const c=(t*0.18+o)%1;s.position.y=0.75+c*3;s.position.x=marker.x+Math.sin(t*0.6+i)*0.18;const k=0.7+c*1.4;s.scaling.set(k,k*1.2,k);});}}
  function dust(){for(let i=0;i<16;i++){const x=-9+((i*37)%18),z=-5+((i*23)%10),m=sph("dust",x,0.7+(i%5)*0.42,z,0.035,M.dust),y=m.position.y;rt.updaters.push((t:number)=>m.position.y=y+Math.sin(t*0.7+i)*0.14);}}
  function ripple(x:number,z:number,o:number){const p:any[]=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;p.push(new BABYLON.Vector3(Math.cos(a)*0.45,0,Math.sin(a)*0.45));}const r=BABYLON.MeshBuilder.CreateLines("ripple",{points:p},scene);r.parent=rt.root;r.position.set(x,0.13,z);r.color=new BABYLON.Color3(0.2,0.75,0.8);rt.updaters.push((t:number)=>{const c=(t*0.2+o)%1,k=0.5+c*4;r.scaling.set(k,1,k);r.alpha=0.3*(1-c);});}
  function embers(marker:any){
    for(let i=0;i<8;i++){
      const e=sph("ember",marker.x,0.35,marker.z,0.035+(i%3)*0.01,M.fireOuter),off=i/8;
      rt.updaters.push((t:number)=>{const c=(t*0.55+off)%1;e.position.y=0.35+c*1.6;e.position.x=marker.x+Math.sin(t*2+i)*0.18*c;e.position.z=marker.z+Math.cos(t*1.7+i)*0.13*c;const k=1-c;e.scaling.set(k,k,k);});
    }
  }
  function vfx(c:any){
    const v=c.VTT_AMBIENCE.vfx??{};
    if(v.fireplace)rt.markers.fireplaces.forEach((m:any)=>{fire(m,v);if(v.embers)embers(m);});
    if(v.dust)dust();
    if(v.waterRipples)rt.markers.pools.forEach((m:any)=>{ripple(m.x,m.z,0);ripple(m.x,m.z,0.33);ripple(m.x,m.z,0.66);});
    if(v.waterMotion)rt.markers.pools.forEach((m:any)=>{if(!m.mesh)return;rt.updaters.push((t:number)=>{m.mesh.position.y=m.baseY+Math.sin(t*1.7)*0.016;m.mesh.scaling.z=1+Math.sin(t*1.2)*0.012;});});
  }

  function shadows(c:any){
    const sh=c.VTT_AMBIENCE.lighting?.shadows;
    if(!sh?.enabled)return;
    const p=sh.position??[-8,6,-4],d=sh.direction??[0.8,-1,0.25];
    const light=new BABYLON.DirectionalLight("shadowLight",new BABYLON.Vector3(d[0],d[1],d[2]),scene);
    light.position=new BABYLON.Vector3(p[0],p[1],p[2]); light.intensity=sh.intensity??0.45; light.diffuse=new BABYLON.Color3(1,0.58,0.28);
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
  const title=new BABYLON.GUI.TextBlock();title.text="D8 NIGHT";title.height="42px";title.fontSize=20;title.color="#efd5a5";panel.addControl(title);
  const order=["temple","cafe","dinner","garden","market","mirror"],labels:any={temple:"1 · TEMPLO",cafe:"2 · CAFÉ",dinner:"3 · DINNER",garden:"4 · GARDEN",market:"5 · MARKET",mirror:"6 · MIRROR"},buttons:any={};
  order.forEach(id=>{const b=BABYLON.GUI.Button.CreateSimpleButton("btn_"+id,labels[id]);b.width="175px";b.height="37px";b.color="#dfcfb2";b.background="#25252a";b.cornerRadius=5;b.paddingBottom="4px";b.onPointerClickObservable.add(()=>loadMap(id));buttons[id]=b;panel.addControl(b);});
  const help=new BABYLON.GUI.TextBlock();help.text="\nWASD · mover\nE · interactuar\nG · grid\nC · cámara";help.height="100px";help.color="#888";help.fontSize=11;help.textHorizontalAlignment=BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;panel.addControl(help);
  const ip=new BABYLON.GUI.Rectangle();ip.width="330px";ip.height="48px";ip.cornerRadius=8;ip.color="#c9aa70";ip.background="#101116E8";ip.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;ip.top="-25px";ip.isVisible=false;ui.addControl(ip);
  const it=new BABYLON.GUI.TextBlock();it.color="#fff";it.fontSize=14;ip.addControl(it);
  const msg=new BABYLON.GUI.TextBlock();msg.width="650px";msg.height="55px";msg.verticalAlignment=BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;msg.top="15px";msg.color="#efdfc3";msg.fontSize=13;ui.addControl(msg);
  let timer:any=null;const show=(t:string)=>{msg.text=t;if(timer)clearTimeout(timer);timer=setTimeout(()=>msg.text="",3000);};

  function loadMap(id:string){const c=D8NIGHT.maps[id];if(!c)return;reset(id,c);env(c);floor(c);grid(c);c.MAP.objects.forEach(asset);lights(c);vfx(c);shadows(c);rt.interactables=[...(c.CANON.interactables??[]),...(c.VTT_AMBIENCE.interactables??[])];player.position.set(c.spawn[0],c.spawn[1],c.spawn[2]);camera.target.set(player.position.x,0,player.position.z);ring.isVisible=false;title.text=c.label;Object.keys(buttons).forEach(k=>buttons[k].background=k===id?"#765127":"#25252a");show("Mapa cargado: "+c.label);}

  const keys:any={};
  window.addEventListener("keydown",(e:KeyboardEvent)=>{const k=e.key.toLowerCase();keys[k]=true;if(k>="1"&&k<="6")loadMap(order[Number(k)-1]);if(k==="e"&&!e.repeat&&nearest)show(nearest.message);if(k==="g"&&!e.repeat){gridVisible=!gridVisible;if(rt.grid)rt.grid.setEnabled(gridVisible);show(gridVisible?"Grid activado":"Grid oculto");}if(k==="c"&&!e.repeat){overview=!overview;camera.radius=overview?28:20;camera.beta=overview?0.56:0.70;show(overview?"Cámara general":"Cámara jugador");}});
  window.addEventListener("keyup",(e:KeyboardEvent)=>keys[e.key.toLowerCase()]=false);

  const radius=0.32;
  function blocked(x:number,z:number){const s=rt.config.MAP.size;if(x<-s[0]/2+radius||x>s[0]/2-radius||z<-s[1]/2+radius||z>s[1]/2-radius)return true;for(const c of rt.colliders)if(x>=c.minX-radius&&x<=c.maxX+radius&&z>=c.minZ-radius&&z<=c.maxZ+radius)return true;return false;}
  function interaction(){nearest=null;ip.isVisible=false;ring.isVisible=false;let best=Infinity;rt.interactables.forEach((q:any)=>{const dx=player.position.x-q.position[0],dz=player.position.z-q.position[1],d=Math.sqrt(dx*dx+dz*dz);if(d<=q.radius&&d<best){best=d;nearest=q;}});if(nearest){ip.isVisible=true;it.text="[ E ]   "+nearest.label;ring.position.set(nearest.position[0],0.09,nearest.position[1]);ring.isVisible=true;}}

  scene.onBeforeRenderObservable.add(()=>{if(!rt.config)return;const dt=Math.min(engine.getDeltaTime()/1000,0.05);elapsed+=dt;let dx=0,dz=0;if(keys.w)dz--;if(keys.s)dz++;if(keys.a)dx--;if(keys.d)dx++;if(dx||dz){const l=Math.sqrt(dx*dx+dz*dz);dx/=l;dz/=l;const d=4*dt,nx=player.position.x+dx*d,nz=player.position.z+dz*d;if(!blocked(nx,player.position.z))player.position.x=nx;if(!blocked(player.position.x,nz))player.position.z=nz;player.rotation.y=Math.atan2(dx,dz);}const target=new BABYLON.Vector3(player.position.x,0,player.position.z);camera.target=BABYLON.Vector3.Lerp(camera.target,target,overview?0.035:0.085);interaction();rt.updaters.forEach((u:any)=>u(elapsed));});

  loadMap("cafe");
  return scene;
}
