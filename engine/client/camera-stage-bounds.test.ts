import {describe,expect,it} from 'vitest';
import {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Viewport} from '@babylonjs/core/Maths/math.viewport.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {MIRROR_WALL_OUTLINE} from '../../campaigns/one-shot/playground/mirror-cave-layout';
import {d8CellToWorld,d8SpatialNavigation} from '../../campaigns/one-shot/public/pack';
import {combatSafeProjection} from './combat-camera';
import {explorationCameraSafeArea} from './camera-viewport';
import {constrainCameraToStage,stageScreenPolygons,rectangularStage,stageHalfHeightLimit,type StageFrame,type StageOutline,type StagePoint} from './camera-stage-bounds';
import {D8CameraMotion} from './d8-camera';
import {boundCameraZoom} from './camera-zoom';

const mirror=MIRROR_WALL_OUTLINE;
function inside(outline:StageOutline,p:{x:number;z:number}){
 return outline.every((a,i)=>{const b=outline[(i+1)%outline.length]!;return (b[0]!-a[0]!)*(p.z-a[1]!)-(b[1]!-a[1]!)*(p.x-a[0]!)>=-1e-4;});
}
function screenInside(polygon:{x:number;y:number}[],x:number,y:number){
 const cross=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length]!;return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x)});
 return cross.every(n=>n>=-1e-4)||cross.every(n=>n<=1e-4);
}
function assertVisibleStage(outline:StageOutline,target:StagePoint,frame:StageFrame,hudFree=true,matte=false){
 const viewport=frame.viewport??{width:1600,height:900},safe=frame.safe??{left:0,top:0,...viewport};
 const point=new Vector3(target.x,target.y,target.z),ca=Math.cos(frame.alpha),sa=Math.sin(frame.alpha),c=Math.cos(frame.beta),s=Math.sin(frame.beta);
 const eye=point.add(new Vector3(ca*s,c,sa*s).scale(200));
 const view=Matrix.LookAtLH(eye,point,Vector3.Up());
 const projection=Matrix.FromArray(combatSafeProjection(Matrix.OrthoLH(2*frame.halfHeight*frame.aspect,2*frame.halfHeight,.1,1000).m,viewport,safe,true));
 for(const x of [0,viewport.width])for(const y of [0,viewport.height]){
  const ray=Ray.CreateNew(x,y,viewport.width,viewport.height,Matrix.Identity(),view,projection);
  const ground=frame.groundY??0,t=(ground-ray.origin.y)/ray.direction.y;
  let hit=t>=0&&inside(outline,ray.origin.add(ray.direction.scale(t)));
  // Mirror's near edge is an open cutaway. Only the authored side/rear
  // walls may fill the frame above the floor, never an invented front wall.
  for(let i=0;i<outline.length&&!hit;i++){
   if(outline===mirror&&i===5)continue;
   const a=outline[i]!,b=outline[(i+1)%outline.length]!,dx=b[0]!-a[0]!,dz=b[1]!-a[1]!;
   const denominator=ray.direction.x*dz-ray.direction.z*dx;
   if(Math.abs(denominator)<1e-8)continue;
   const distance=((a[0]!-ray.origin.x)*dz-(a[1]!-ray.origin.z)*dx)/denominator;
   const p=ray.origin.add(ray.direction.scale(distance)),u=((p.x-a[0]!)*dx+(p.z-a[1]!)*dz)/(dx*dx+dz*dz);
   hit=distance>=0&&u>=-1e-5&&u<=1+1e-5&&p.y>=ground-1e-4&&p.y<=ground+(frame.wallHeight??0)+1e-4;
  }
  expect(hit||matte&&!stageScreenPolygons(outline,target,frame,outline===mirror?[5]:[]).some(p=>screenInside(p,x,y)),`viewport corner ${x},${y} sees outside: ${JSON.stringify({target,focus:frame.focus,alpha:frame.alpha,beta:frame.beta,halfHeight:frame.halfHeight,viewport})}`).toBe(true);
 }
 if(frame.focus){
  const focus=frame.focus,width=(focus.width??focus.height*.55)/2;
  const visible=hudFree?safe:{left:0,top:0,...viewport};
  for(const horizontal of [-width,width])for(const height of [0,focus.height]){
   const p=Vector3.Project(new Vector3(focus.x-sa*horizontal,focus.y+height,focus.z+ca*horizontal),Matrix.Identity(),view.multiply(projection),new Viewport(0,0,viewport.width,viewport.height));
   if(matte)expect(stageScreenPolygons(outline,target,frame,outline===mirror?[5]:[]).some(poly=>screenInside(poly,p.x,p.y)),JSON.stringify({focus,frame})).toBe(true);
   expect(p.x,JSON.stringify({target,frame})).toBeGreaterThanOrEqual(visible.left-1e-3);expect(p.x).toBeLessThanOrEqual(visible.left+visible.width+1e-3);
   const context=JSON.stringify({focus,alpha:frame.alpha,beta:frame.beta,halfHeight:frame.halfHeight,viewport});
   expect(p.y,context).toBeGreaterThanOrEqual(visible.top-1e-3);expect(p.y,context).toBeLessThanOrEqual(visible.top+visible.height+1e-3);
  }
 }
}

describe('bounded following within authored scenery',()=>{
 it('follows normally, stops at a wall and resumes when the actor returns',()=>{
  const frame={alpha:Math.PI/2,beta:65*Math.PI/180,halfHeight:3,aspect:16/9,wallHeight:26};
  const follow=(x:number)=>constrainCameraToStage(mirror,{x,y:1,z:2},{...frame,focus:{x,y:0,z:2,height:1.65,width:.9}});
  expect(follow(1).target.x-follow(0).target.x).toBeCloseTo(1);
  const near=follow(19),edge=follow(20);
  expect(edge.target.x).toBeCloseTo(near.target.x);
  assertVisibleStage(mirror,edge.target,{...frame,halfHeight:edge.halfHeight,focus:{x:20,y:0,z:2,height:1.65,width:.9}});
  expect(follow(0).target.x).toBeCloseTo(0);
 });
 it('keeps the full actor visible at every side, tilt, orbit and phone/desktop aspect',()=>{
  for(const viewport of [{width:390,height:844},{width:1600,height:900}])for(const orbit of [-30,0,30])for(const tilt of [5,7.35,10,12.6,15,20,22.5,25])for(const [x,z] of [[0,0],[-14,0],[20,0],[0,-9],[0,15]]){
   const safe=explorationCameraSafeArea(viewport.width,viewport.height,true);
   const focus={x:x!,y:.045,z:z!,height:1.65,width:.9};
   const frame={alpha:(90+orbit)*Math.PI/180,beta:(90-tilt)*Math.PI/180,halfHeight:3,aspect:safe.width/safe.height,viewport,safe,focus,wallHeight:26};
   const result=constrainCameraToStage(mirror,new Vector3(focus.x,1,focus.z),frame);
   expect(result.halfHeight).toBe(frame.halfHeight);
   assertVisibleStage(mirror,result.target,{...frame,halfHeight:result.halfHeight},false,true);
  }
 });
 it('constrains the interpolated pose too, without changing the chosen orbit',()=>{
  const motion=new D8CameraMotion(),viewport={width:390,height:844},safe=explorationCameraSafeArea(viewport.width,viewport.height,true);
  for(let i=0;i<150;i++){
   const alpha=(60+60*i/149)*Math.PI/180,beta=75*Math.PI/180;
   const focus={x:Math.min(20,i*.2),y:.045,z:2,height:1.65,width:.9};
   const frame={alpha,beta,aspect:safe.width/safe.height,halfHeight:3,wallHeight:26,viewport,safe,focus};
   const request=constrainCameraToStage(mirror,{x:focus.x,y:1,z:focus.z},frame);
   const pose=motion.update({alpha,beta,...request},1000/60);
   const before=pose.alpha;
   motion.constrainFrame(constrainCameraToStage(mirror,pose.target,{...frame,alpha:pose.alpha,beta:pose.beta,halfHeight:pose.halfHeight}));
   expect(pose.alpha).toBe(before);
   assertVisibleStage(mirror,pose.target,{...frame,alpha:pose.alpha,beta:pose.beta,halfHeight:pose.halfHeight},false,true);
  }
 });
 it('keeps actual walkable cave cells visible with the stable per-scene zoom ceiling',()=>{
  const walkable=d8SpatialNavigation('mirror').walkable;
  for(const viewport of [{width:390,height:844},{width:1600,height:900}]){
   const safe=explorationCameraSafeArea(viewport.width,viewport.height,true),aspect=safe.width/safe.height;
   const maxHalfHeight=Math.min(...[-30,-20,-10,0,10,20,30].map(degrees=>stageHalfHeightLimit(mirror,{alpha:(90+degrees)*Math.PI/180,beta:85*Math.PI/180,aspect,viewport,safe,wallHeight:26})))*.9;
   for(const halfHeight of [3,maxHalfHeight])for(const orbit of [-30,0,30])for(const tilt of [5,7.35,10,12.6,15,20,22.5,25])for(const cell of walkable){
    const position=d8CellToWorld('mirror',cell),focus={...position,y:.045,height:1.8,width:1.2};
    const frame={alpha:(90+orbit)*Math.PI/180,beta:(90-tilt)*Math.PI/180,halfHeight,aspect,viewport,safe,focus,wallHeight:26};
    const result=constrainCameraToStage(mirror,{...position,y:1},frame);
    expect(result.halfHeight).toBe(frame.halfHeight);
    assertVisibleStage(mirror,result.target,{...frame,halfHeight:result.halfHeight},false,true);
   }
  }
 },60000);
 it('uses real ground bounds for open maps and preserves Babylon vector height',()=>{
  const outline=rectangularStage(-30,-20,60,40),frame={alpha:Math.PI/2,beta:Math.PI/3,halfHeight:3,aspect:1.6};
  const original=new Vector3(29,2,0),result=constrainCameraToStage(outline,original,frame);
  expect(original.x).toBe(29);expect(result.target.y).toBe(2);
  assertVisibleStage(outline,result.target,{...frame,halfHeight:result.halfHeight});
  expect(stageHalfHeightLimit(outline,frame)).toBeGreaterThan(3);
 });
 it('limits zoom-out at the scene boundary while zoom-in responds immediately',()=>{
  const policy={size:{width:36,depth:27,height:8},beta:85*Math.PI/180,aspect:1.6,baseHalfHeight:24,maxStageHalfHeight:5};
  const zoom=boundCameraZoom(.1,policy);
  expect(zoom.halfHeight).toBe(5);
  expect(boundCameraZoom(zoom.zoom*.8,policy).halfHeight).toBe(5);
  expect(boundCameraZoom(zoom.zoom*1.2,policy).halfHeight).toBeLessThan(5);
 });
});
