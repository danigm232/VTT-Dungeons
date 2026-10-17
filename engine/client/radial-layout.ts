export type RadialBox = {left:number;right:number;top:number;bottom:number};
type Point = {x:number;y:number};
export function radialArc(anchorX:number,anchorY:number,width:number,height:number){
  const left=anchorX<width*.28,right=anchorX>width*.72,top=anchorY<height*.28,bottom=anchorY>height*.72;
  if(left&&top)return {kind:'quarter' as const,start:0,end:90};
  if(right&&top)return {kind:'quarter' as const,start:90,end:180};
  if(left&&bottom)return {kind:'quarter' as const,start:270,end:360};
  if(right&&bottom)return {kind:'quarter' as const,start:180,end:270};
  if(left)return {kind:'half' as const,start:-90,end:90};
  if(right)return {kind:'half' as const,start:90,end:270};
  return bottom||!top&&anchorY>height/2 ? {kind:'half' as const,start:180,end:360}:{kind:'half' as const,start:0,end:180};
}
export function radialBoxesOverlap(a:RadialBox,b:RadialBox,gap=0){
  return a.left<b.right+gap && a.right+gap>b.left && a.top<b.bottom+gap && a.bottom+gap>b.top;
}
export function radialNodeBox(point:Point,size:number):RadialBox{
  return {left:point.x-size/2,right:point.x+size/2,top:point.y-size/2,bottom:point.y+size/2};
}
/** Icon-only fallback: compact screens use two arcs instead of fewer actions.
 * Captions are intentionally not part of the collision/visibility contract. */
export function radialIconLayout(origin:Point,arc:{start:number;end:number},count:number,size:number,bounds:RadialBox,reserved:RadialBox[]){
  const point=(radius:number,index:number,length:number)=>{
    const angle=(arc.start+(arc.end-arc.start)*(length===1?.5:index/(length-1)))*Math.PI/180;
    return {x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius};
  };
  const fits=(points:Point[])=>points.every((p,index)=>{
    const box=radialNodeBox(p,size);
    return box.left>=bounds.left && box.right<=bounds.right && box.top>=bounds.top && box.bottom<=bounds.bottom
      && !reserved.some(r=>radialBoxesOverlap(box,r,6))
      && !points.slice(0,index).some(other=>radialBoxesOverlap(box,radialNodeBox(other,size),7));
  });
  for(const rings of [1,2]){
    const innerCount=rings===1?count:Math.ceil(count/2),outerCount=count-innerCount;
    for(let radius=size+24;radius<=360;radius+=4){
      const points=Array.from({length:innerCount},(_,i)=>point(radius,i,innerCount));
      if(outerCount)points.push(...Array.from({length:outerCount},(_,i)=>point(radius+size+20,i,outerCount)));
      if(fits(points))return {radius,points};
    }
  }
  // At very short heights the origin/back controls can block both arcs.
  // Keep all actions reachable in a compact inward fan/grid, never offscreen
  // and never stacked at the origin. Only used when the circular layouts fail.
  let best:Point[]|null=null,bestScore=Infinity;
  for(const columns of [2,4]){
    const rows=Math.ceil(count/columns),step=size+12;
    for(let y=bounds.top+size/2;y+(rows-1)*step+size/2<=bounds.bottom;y+=8){
      for(let x=bounds.left+size/2;x+(Math.min(columns,count)-1)*step+size/2<=bounds.right;x+=8){
        const points=Array.from({length:count},(_,i)=>({x:x+(i%columns)*step,y:y+Math.floor(i/columns)*step}));
        const score=points.reduce((sum,p)=>sum+Math.hypot(p.x-origin.x,p.y-origin.y),0);
        if(score<bestScore&&fits(points)){best=points;bestScore=score;}
      }
    }
  }
  if(best)return {radius:Math.max(...best.map(p=>Math.hypot(p.x-origin.x,p.y-origin.y))),points:best};
  return null;
}
