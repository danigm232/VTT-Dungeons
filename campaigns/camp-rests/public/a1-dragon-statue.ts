import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { worldSurfaceUV } from '../../../engine/client/diorama-kit.js';
import { weatherRock } from './camp-detail-kit.js';

/** Astalagan: a peaceful stone dragon, not a living creature or encounter. */
export function createA1DragonStatue(scene: Scene, parent: TransformNode, at: Vector3, stone: StandardMaterial, recess: StandardMaterial) {
  const root=new TransformNode('a1:astalagan-seaward',scene);root.parent=parent;root.position.copyFrom(at);root.rotation.y=Math.PI;
  root.metadata={content:'CANON',facing:'sea',statue:'Astalagan',finish:'VTT_AMBIENCE'};
  stone.backFaceCulling=false;stone.twoSidedLighting=true;
  const parts:Mesh[]=[];
  function keep(mesh:Mesh,material=stone){mesh.material=material;mesh.isPickable=false;mesh.checkCollisions=false;parts.push(mesh);return mesh;}
  function ellipsoid(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,material=stone){const m=keep(MeshBuilder.CreateSphere('a1:dragon:'+name,{diameter:1,segments:12},scene),material);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);return m;}
  function tube(name:string,path:number[][],radius:number,material=stone){return keep(MeshBuilder.CreateTube('a1:dragon:'+name,{path:path.map(p=>Vector3.FromArray(p)),radius,tessellation:8,cap:Mesh.CAP_ALL},scene),material);}
  function cone(name:string,x:number,y:number,z:number,height:number,radius:number){const m=keep(MeshBuilder.CreateCylinder('a1:dragon:'+name,{height,diameterBottom:radius*2,diameterTop:0,tessellation:10},scene));m.position.set(x,y,z);return m;}
  for(const [name,y,h,d] of [['step',.12,.24,2.7],['pedestal',.43,.55,2.03],['plinth',.76,.15,1.78]] as const){const m=keep(MeshBuilder.CreateCylinder('a1:dragon:'+name,{height:h,diameter:d,tessellation:12},scene));m.position.y=y;}
  ellipsoid('haunches',0,1.22,.21,1.08,.82,1.15);
  ellipsoid('body',0,1.65,0,.87,1.21,.79).rotation.x=-.22;
  ellipsoid('breast',0,1.89,-.38,.66,.85,.59);
  tube('curved-neck',[[0,1.83,-.35],[0,2.12,-.53],[0,2.47,-.53],[0,2.69,-.76]],.225);
  ellipsoid('skull',0,2.71,-.85,.57,.41,.74);
  ellipsoid('long-muzzle',0,2.60,-1.25,.44,.26,.72);
  ellipsoid('lower-jaw',0,2.48,-1.22,.37,.13,.65);
  tube('mouth',[[ -.18,2.53,-1.48],[0,2.51,-1.60],[.18,2.53,-1.48]],.014,recess);
  for(const side of [-1,1]){
    ellipsoid('nostril',side*.13,2.65,-1.56,.045,.027,.025,recess);
    ellipsoid('eye-socket',side*.265,2.78,-1.04,.035,.063,.115,recess);
    tube('brow',[[side*.23,2.84,-1.14],[side*.30,2.87,-1.04],[side*.28,2.84,-.93]],.045);
    tube('swept-horn',[[side*.21,2.84,-.67],[side*.33,3.04,-.51],[side*.37,3.20,-.31]],.078);
    cone('horn-tip',side*.37,3.25,-.31,.18,.065).rotation.x=.8;
    ellipsoid('cheek-frill',side*.33,2.66,-.63,.13,.42,.40).rotation.z=side*.23;
    ellipsoid('hind-leg',side*.52,1.13,.27,.42,.55,.70);
    tube('foreleg',[[side*.31,1.97,-.38],[side*.45,1.40,-.60],[side*.44,.97,-.68]],.14);
    ellipsoid('forepaw',side*.43,.90,-.77,.37,.15,.52);
    ellipsoid('hindpaw',side*.58,.87,.41,.36,.13,.48);
    for(let claw=0;claw<3;claw++){
      ellipsoid('front-claw',side*.43+(claw-1)*.10,.89,-1.00,.065,.08,.16);
      tube('paw-carving',[[side*.43+(claw-1)*.105,.96,-.82],[side*.43+(claw-1)*.105,.93,-.97]],.009,recess);
    }
    // Curved, scalloped bat membranes folded back against the seated dragon.
    // Real surfaces move coherently with every camera angle, with no billboard.
    const wingPaths:Vector3[][]=[];
    const tips=[[.57,2.43,.03],[.99,2.81,.31],[1.28,2.60,.55],[1.21,1.91,.81],[.87,1.27,.88],[.46,1.21,.60]];
    for(let row=0;row<5;row++){
      const t=row/4;
      wingPaths.push(tips.map((tip,i)=>new Vector3(side*(.34+(tip[0]!-.34)*t),1.94+(tip[1]!-1.94)*t, .03+(tip[2]!-.03)*t+Math.sin(t*Math.PI)*(.09+i*.008))));
    }
    keep(MeshBuilder.CreateRibbon('a1:dragon:folded-wing',{pathArray:wingPaths,sideOrientation:Mesh.DOUBLESIDE},scene));
    for(const i of [1,2,3,4]){const tip=tips[i]!;tube('wing-bone',[[side*.35,1.96,.03],[side*(.34+(tip[0]!-.34)*.55),1.94+(tip[1]!-1.94)*.55,tip[2]!*.55+.09],[side*tip[0]!,tip[1]!,tip[2]!]],.045);}
    tube('wing-edge',tips.map(p=>[side*p[0]!,p[1]!,p[2]!]),.036);
  }
  tube('curled-tail',[[0,1.04,.58],[.50,.94,.94],[.96,.85,.65],[1.06,.84,.08],[.78,.84,-.42],[.37,.84,-.48]],.12);
  for(let i=0;i<7;i++)cone('back-crest',0,2.68-i*.19,-.32+i*.14,.25-i*.018,.10-i*.009).rotation.x=.48;
  for(let i=0;i<7;i++){const y=1.42+i*.105; tube('breast-scale',[[-.23,y,-.63],[0,y-.025,-.71],[.23,y,-.63]],.022);}
  // Relief and local stone UVs keep the rock pattern at a readable scale.
  for(const [i,m] of parts.entries()){worldSurfaceUV(m,.7);weatherRock(m,183+i);}
  // Two cached draws (stone + carved recesses), including real contact geometry.
  for(const material of [stone,recess]){
    const group=parts.filter(p=>p.material===material);
    const merged=Mesh.MergeMeshes(group,true,true,undefined,false,true)!;
    merged.name=material===stone?'a1:astalagan-sculpted-stone':'a1:astalagan-carved-details';merged.parent=root;merged.isPickable=false;merged.receiveShadows=true;
    merged.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,dragonAnatomy:true};
  }
  return root;
}
