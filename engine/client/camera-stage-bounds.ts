export type StagePoint = { x:number; y:number; z:number };
export type StageOutline = readonly (readonly number[])[];
export type StageFrame = {
  alpha:number; beta:number; halfHeight:number; aspect:number; groundY?:number; wallHeight?:number; margin?:number;
  viewport?:{width:number;height:number}; safe?:{left:number;top:number;width:number;height:number};
  focus?:StagePoint & {height:number;width?:number};
  focusViewport?:boolean;
};
type Point2 = {x:number;z:number};
type Plane3 = {x:number;z:number;h:number;minimum:number};

function clip(polygon:Point2[],nx:number,nz:number,minimum:number):Point2[] {
  const output:Point2[]=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[(i+polygon.length-1)%polygon.length]!,b=polygon[i]!;
    const av=nx*a.x+nz*a.z-minimum,bv=nx*b.x+nz*b.z-minimum;
    if((av>=-1e-8)!==(bv>=-1e-8)){
      const t=av/(av-bv);output.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
    }
    if(bv>=-1e-8)output.push(b);
  }
  return output;
}

function hull(points:Point2[]):Point2[] {
  const sorted=points.slice().sort((a,b)=>a.x-b.x||a.z-b.z);
  const cross=(a:Point2,b:Point2,c:Point2)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const chain=(list:Point2[])=>{const result:Point2[]=[];for(const p of list){while(result.length>1&&cross(result[result.length-2]!,result[result.length-1]!,p)<=1e-9)result.pop();result.push(p);}return result;};
  const lower=chain(sorted),upper=chain(sorted.slice().reverse());lower.pop();upper.pop();return lower.concat(upper);
}

function constraints(outline:StageOutline,frame:StageFrame,withFocus:boolean) {
  const {alpha,beta,halfHeight:h,aspect}=frame;
  const c=Math.max(.01,Math.cos(beta)),s=Math.sin(beta),ca=Math.cos(alpha),sa=Math.sin(alpha);
  const safe=frame.safe,viewport=frame.viewport;
  const u0=-h*aspect*(safe&&viewport?1+2*safe.left/safe.width:1);
  const u1=h*aspect*(safe&&viewport?2*(viewport.width-safe.left)/safe.width-1:1);
  const v0=-h*(safe&&viewport?2*(viewport.height-safe.top)/safe.height-1:1);
  const v1=h*(safe&&viewport?1+2*safe.top/safe.height:1);
  const projected:Point2[]=[];
  for(const [x,z] of outline)for(const y of [frame.groundY??0,(frame.groundY??0)+(frame.wallHeight??0)])projected.push({x:-sa*x!+ca*z!,z:-ca*c*x!-sa*c*z!+s*y});
  const silhouette=hull(projected);
  const planes:Plane3[]=[];
  for(let i=0;i<silhouette.length;i++){
    const a=silhouette[i]!,b=silhouette[(i+1)%silhouette.length]!,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const nx=-dz/length,nz=dx/length;
    const support=Math.min(nx*u0,nx*u1)+Math.min(nz*v0,nz*v1);
    planes.push({x:nx,z:nz,h:support/h,minimum:nx*a.x+nz*a.z+(frame.margin??.03)});
  }
  const focus=withFocus?frame.focus:undefined;
  if(focus){
    // Use the HUD-free rectangle and the complete upright sprite. A slight
    // inset leaves breathing room before the actor reaches the screen edge.
    const pad=.04,width=(focus.width??focus.height*.55)/2+pad;
    const u=-sa*focus.x+ca*focus.z,v=-ca*c*focus.x-sa*c*focus.z+s*focus.y;
    planes.push({x:1,z:0,h:frame.focusViewport?u1/h:aspect,minimum:u+width},{x:-1,z:0,h:frame.focusViewport?-u0/h:aspect,minimum:-u+width},
      {x:0,z:1,h:frame.focusViewport?v1/h:1,minimum:v+s*focus.height+pad},{x:0,z:-1,h:frame.focusViewport?-v0/h:1,minimum:-v+pad});
  }
  return {silhouette,planes};
}

function permittedTargets(outline:StageOutline,frame:StageFrame,withFocus:boolean) {
  const {silhouette,planes}=constraints(outline,frame,withFocus);
  let polygon=silhouette.slice();
  for(const p of planes){polygon=clip(polygon,p.x,p.z,p.minimum-p.h*frame.halfHeight);if(!polygon.length)break;}
  return polygon;
}

function closest(point:Point2,polygon:Point2[]) {
  const area=polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length]!;return sum+a.x*b.z-b.x*a.z;},0);
  if(area>1e-8&&polygon.every((a,i)=>{const b=polygon[(i+1)%polygon.length]!;return (b.x-a.x)*(point.z-a.z)-(b.z-a.z)*(point.x-a.x)>=-1e-9;}))return point;
  let best=polygon[0]!,distance=Infinity;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/Math.max(1e-12,dx*dx+dz*dz)));
    const p={x:a.x+dx*t,z:a.z+dz*t},d=(p.x-point.x)**2+(p.z-point.z)**2;
    if(d<distance){best=p;distance=d;}
  }
  return best;
}

/** Largest orthographic frame that can fit inside the authored stage. */
export function stageHalfHeightLimit(outline:StageOutline,frame:Omit<StageFrame,'halfHeight'|'focus'>) {
  let low=0,high=Math.hypot(Math.max(...outline.map(p=>p[0]!))-Math.min(...outline.map(p=>p[0]!)),Math.max(...outline.map(p=>p[1]!))-Math.min(...outline.map(p=>p[1]!)));
  for(let i=0;i<23;i++){
    const h=(low+high)/2;
    if(permittedTargets(outline,{...frame,halfHeight:h},false).length>=3)low=h;else high=h;
  }
  return low;
}

/** Follow boundaries only translate the camera. Zoom limits belong to the
 * scene/input policy and must never depend on the actor's distance to a wall. */
export function constrainCameraToStage(outline:StageOutline,target:StagePoint,frame:StageFrame) {
  const halfHeight=frame.halfHeight;
  let allowed=permittedTargets(outline,frame,true);
  if(!allowed.length&&frame.focus){
    // HUD insets reserve a broad strip even though touch controls occupy only
    // its corners. Use the actual viewport at a corner, at the SAME zoom.
    frame={...frame,focusViewport:true};
    allowed=permittedTargets(outline,frame,true);
  }
  if(!allowed.length)allowed=permittedTargets(outline,frame,false);
  const ca=Math.cos(frame.alpha),sa=Math.sin(frame.alpha),c=Math.max(.01,Math.cos(frame.beta)),s=Math.sin(frame.beta);
  const projected={x:-sa*target.x+ca*target.z,z:-ca*c*target.x-sa*c*target.z+s*target.y};
  const bounded=allowed.length?closest(projected,allowed):projected;
  if(frame.focus){
    // At an extreme cutaway corner a fixed-size viewport and its focus may
    // not both fit the stage. Preserve the actor and the manual scale; the
    // renderer masks the uncovered cutaway instead of forcing a zoom-in.
    const {planes}=constraints(outline,{...frame,focusViewport:true},true);
    for(const p of planes.slice(-4)){
      const missing=p.minimum-p.h*halfHeight-p.x*bounded.x-p.z*bounded.z;
      if(missing>0){bounded.x+=p.x*missing;bounded.z+=p.z*missing;}
    }
  }
  const depth=(bounded.z-s*target.y)/c;
  return {halfHeight,target:{x:-sa*bounded.x-ca*depth,y:target.y,z:ca*bounded.x-sa*depth}};
}

/** Authored scenery silhouette in screen pixels, for an opaque cutaway matte. */
export function stageScreenPolygons(outline:StageOutline,target:StagePoint,frame:StageFrame,openEdges:readonly number[]=[]) {
  const ca=Math.cos(frame.alpha),sa=Math.sin(frame.alpha),c=Math.max(.01,Math.cos(frame.beta)),s=Math.sin(frame.beta);
  const u=-sa*target.x+ca*target.z,v=-ca*c*target.x-sa*c*target.z+s*target.y;
  const viewport=frame.viewport??{width:frame.aspect*2,height:2},safe=frame.safe??{left:0,top:0,...viewport};
  const project=(x:number,y:number,z:number)=>({x:safe.left+safe.width/2+(-sa*x+ca*z-u)*safe.width/(2*frame.halfHeight*frame.aspect),y:safe.top+safe.height/2-(-ca*c*x-sa*c*z+s*y-v)*safe.height/(2*frame.halfHeight)});
  const ground=frame.groundY??0,top=ground+(frame.wallHeight??0);
  const polygons=[outline.map(p=>project(p[0]!,ground,p[1]!))];
  if(top>ground)for(let i=0;i<outline.length;i++){
    if(openEdges.includes(i))continue;
    const a=outline[i]!,b=outline[(i+1)%outline.length]!;
    polygons.push([project(a[0]!,ground,a[1]!),project(b[0]!,ground,b[1]!),project(b[0]!,top,b[1]!),project(a[0]!,top,a[1]!)]);
  }
  return polygons;
}

export function rectangularStage(minX:number,minZ:number,width:number,depth:number):StageOutline {
  return [[minX,minZ],[minX+width,minZ],[minX+width,minZ+depth],[minX,minZ+depth]];
}
