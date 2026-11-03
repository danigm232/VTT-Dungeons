import type {Cell} from '../shared/protocol';
export type DmMapHit={cell:Cell;surfaceId:string;entityId?:string};
export type DmMapInteraction={
  canPan:()=>boolean; singleClick:()=>boolean;
  context:(hit:DmMapHit,x:number,y:number)=>void;
};
/** DM input never selects on pointer-down, or treats a drag as a placement. */
export function installDmMapInput(canvas:HTMLCanvasElement, options:{
  pick:(x:number,y:number)=>DmMapHit|null; select:(hit:DmMapHit)=>void;
  interaction:()=>DmMapInteraction|null; pan:(dx:number,dy:number)=>void;
}) {
  let drag:{id:number;x:number;y:number;startX:number;startY:number;pan:boolean;moved:boolean}|null=null;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||!options.interaction())return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,pan:options.interaction()!.canPan(),moved:false};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    drag.moved=true;
    if(drag.pan){event.preventDefault();options.pan(dx,dy);canvas.style.cursor='grabbing';}
    drag.x=event.clientX;drag.y=event.clientY;
  });
  const finish=(event:PointerEvent)=>{
    if(!drag||event.pointerId!==drag.id)return;
    const click=event.type==='pointerup'&&!drag.moved&&options.interaction()?.singleClick();
    drag=null;canvas.style.cursor='';
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(click){const hit=options.pick(event.clientX,event.clientY);if(hit)options.select(hit);}
  };
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
  canvas.addEventListener('dblclick',event=>{
    if(!options.interaction()||options.interaction()?.singleClick())return;
    event.preventDefault();const hit=options.pick(event.clientX,event.clientY);if(hit)options.select(hit);
  });
  canvas.addEventListener('contextmenu',event=>{
    if(!options.interaction())return;
    event.preventDefault();const hit=options.pick(event.clientX,event.clientY);
    if(hit)options.interaction()?.context(hit,event.clientX,event.clientY);
  });
}
