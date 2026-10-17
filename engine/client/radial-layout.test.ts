import {expect,it} from 'vitest';
import {radialIconLayout,radialNodeBox,radialBoxesOverlap,radialArc} from './radial-layout';
it('fits eight side actions on portrait mobile without overlapping navigation',()=>{
  const origin={x:195,y:750},size=42,bounds={left:10,right:380,top:12,bottom:836};
  const reserved=[radialNodeBox(origin,66),{left:124,right:218,top:685,bottom:717},{left:143,right:247,top:803,bottom:843}];
  const layout=radialIconLayout(origin,{start:180,end:360},8,size,bounds,reserved)!;
  expect(layout).not.toBeNull();expect(layout.points).toHaveLength(8);
  for(const [i,p] of layout.points.entries()){
    const box=radialNodeBox(p,size);expect(box.left).toBeGreaterThanOrEqual(10);expect(box.right).toBeLessThanOrEqual(380);
    expect(box.top).toBeGreaterThanOrEqual(12);expect(box.bottom).toBeLessThanOrEqual(836);
    for(const other of layout.points.slice(0,i))expect(radialBoxesOverlap(box,radialNodeBox(other,size),7)).toBe(false);
  }
});
it('keeps 4/8 icons reachable for corners and sides across phone/landscape/desktop positions',()=>{
  for(const [width,height] of [[320,568],[390,844],[844,390],[1680,900]])for(const px of [.12,.5,.88])for(const py of [.12,.5,.88]){
    const origin={x:Math.max(68,Math.min(width!-68,width!*px)),y:height!*py},size=height!<550?40:width!<=560?42:46;
    const arc=radialArc(origin.x,origin.y,width!,height!),count=arc.kind==='quarter'?4:8;
    const bounds={left:10,right:width!-10,top:12,bottom:height!-8};
    const reserved=[radialNodeBox(origin,66),{left:origin.x-71,right:origin.x+23,top:origin.y-65,bottom:origin.y-33}];
    const layout=radialIconLayout(origin,arc,count,size,bounds,reserved);
    expect(layout,`${width}x${height} at ${px}/${py}`).not.toBeNull();expect(layout!.points).toHaveLength(count);
  }
});
it.each([{x:68,y:68,start:0,end:90},{x:322,y:68,start:90,end:180},{x:68,y:776,start:270,end:360},{x:322,y:776,start:180,end:270}])('fits four corner actions at $x/$y',({x,y,start,end})=>{
  const layout=radialIconLayout({x,y},{start,end},4,42,{left:10,right:380,top:12,bottom:836},[radialNodeBox({x,y},66)])!;
  expect(layout).not.toBeNull();expect(layout.points).toHaveLength(4);
});
