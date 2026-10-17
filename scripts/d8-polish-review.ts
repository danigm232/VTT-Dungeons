/** Development-only, isolated review. Exercises the real player renderer, never a saved session. */
import type { WorldRenderer } from '../apps/web/world';
import type { WorldSnapshot } from '../engine/shared/protocol';
import { d8NearestWalkableCell } from '../campaigns/one-shot/public/pack';
import { cameraProfileForScene } from '../engine/client/camera-profile';

type Review = { renderer:WorldRenderer; rendererOptions:{cameraRole:'dm'|'player'|'projector'};
  getSnapshot:()=>WorldSnapshot; update:()=>Promise<void>; settle:()=>Promise<void>; frame:()=>Promise<void>; errors:string[] };

export async function runD8PolishReview({renderer,rendererOptions,getSnapshot,update,settle,frame,errors}:Review) {
  const snapshot=getSnapshot(),id=snapshot.sceneId,host=document.getElementById('world')!;
  const stage=(document.getElementById('polish-stage') as HTMLSelectElement).value;
  const output=document.getElementById('polish-status')!,button=document.getElementById('polish-audit') as HTMLButtonElement;
  const actor=snapshot.entities.find(e=>e.kind==='player')!,saved=structuredClone(snapshot),oldRole=rendererOptions.cameraRole;
  const savedSize={width:host.style.width,height:host.style.height};
  const interior:Record<string,[number,number]>={temple:[0,-2],garden:[6,-1.5],market:[2,3],cafe:[0,1],mirror:[-9.2,-2.5],dinner:[-3.36,-4.5]};
  const profile=cameraProfileForScene(id),rows:unknown[]=[];
  const beforeDefinition=JSON.stringify(snapshot.scene);
  const prefix=`d8-${id}-polish-${stage}`;
  const save=async(canvas:HTMLCanvasElement,name:string)=>{
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG vacío')),'image/png'));
    const response=await fetch(`/__camera_capture?name=${name}.png`,{method:'POST',body:blob});
    if(!response.ok)throw new Error('No se pudo guardar '+name);
  };
  const image=()=>{
    // Camera damping alone does not finish the wall/furniture cutaway easing.
    for(let i=0;i<14;i++)renderer.renderCaptureFrame(32);
    renderer.renderCaptureFrame();
    const canvas=document.createElement('canvas');canvas.width=host.clientWidth;canvas.height=host.clientHeight;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#172635';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(const layer of host.querySelectorAll('canvas'))if(!layer.hidden)ctx.drawImage(layer,0,0,canvas.width,canvas.height);
    return canvas;
  };
  const state=()=>({actors:JSON.stringify(snapshot.entities),props:JSON.stringify(snapshot.props),scene:JSON.stringify(snapshot.scene)});
  const sheet=()=>{const c=document.createElement('canvas');c.width=1440;c.height=894;return c;};
  const tile=(c:HTMLCanvasElement,view:HTMLCanvasElement,n:number,label:string)=>{
    const ctx=c.getContext('2d')!,x=n%3*480,y=Math.floor(n/3)*298;
    ctx.fillStyle='#101b23';ctx.fillRect(x,y,480,298);ctx.drawImage(view,x,y+28,480,270);
    ctx.fillStyle='#ead8aa';ctx.font='14px system-ui';ctx.fillText(label,x+10,y+19);
  };
  try{
    button.disabled=true;host.style.width='1280px';host.style.height='720px';renderer.refreshLayout();await frame();
    rendererOptions.cameraRole='player';renderer.setLocalPlayer(actor.id);renderer.setSelectedEntity(null);
    snapshot.camera={mode:'fixed',focusId:actor.id};snapshot.environment.timeOfDay='sunset';
    snapshot.environment.precipitation='none';snapshot.combat.active=false;snapshot.combat.participants=[];await update();
    for(const [distance,zoom] of [['far',1],['mid',2],['near',3.8]] as const){
      actor.cell=distance==='near'?d8NearestWalkableCell(id as any,...interior[id]!):{...saved.scene.spawns[0]!};
      delete actor.seatId;actor.step=null;actor.moving=false;await update();
      if(distance==='far')renderer.frameSceneOverview();else renderer.setCameraFocusCell(actor.cell,actor.surfaceId);
      renderer.zoomCameraBy(zoom/renderer.getCameraAudit().zoom);await settle();
      const contact=sheet();let n=0;
      for(const tilt of [profile.min,profile.default,profile.max])for(const yaw of [-2,0,2]){
        output.textContent=`${id} · ${stage} · ${distance} · ${tilt}° / ${yaw*15}°`;
        const unchanged=state();renderer.setCameraTiltDegrees(tilt);renderer.setCameraOrientation(yaw);await settle();
        const audit=renderer.getCameraAudit(),view=image();
        rows.push({distance,requestedTilt:tilt,requestedYaw:yaw*15,...audit,unchanged:JSON.stringify(unchanged)===JSON.stringify(state())});
        tile(contact,view,n++,`${distance} · ${tilt}° / ${yaw*15}° · ${audit.zoom.toFixed(2)}x`);
        if(tilt===profile.default&&yaw===0)await save(view,`${prefix}-${distance}`);
        await frame();
      }
      await save(contact,`${prefix}-${distance}-angles`);
    }
    renderer.setCameraTiltDegrees(profile.default);renderer.setCameraOrientation(0);renderer.zoomCameraBy(2.5/renderer.getCameraAudit().zoom);
    const lighting=sheet();let n=0;
    for(const time of ['day','sunset','night'] as const){
      snapshot.environment.timeOfDay=time;await update();await settle();const view=image();
      tile(lighting,view,n++,`Interior / detalle · ${time}`);await save(view,`${prefix}-${time}`);
      rows.push({distance:'lighting',time,...renderer.getCameraAudit()});
    }
    await save(lighting,`${prefix}-lighting`);
    snapshot.environment.timeOfDay='sunset';await update();await settle();
    const costs=renderer.measureCaptureFrameCosts();
    // The two temple rooms must share cutaway; other maps test return outdoors.
    const boundaryPositions=id==='temple'?[[0,12],[0,-2]]:[saved.scene.spawns[0]!];
    for(let i=0;i<boundaryPositions.length;i++){
      const p=boundaryPositions[i]!;actor.cell=Array.isArray(p)?d8NearestWalkableCell(id as any,p[0]!,p[1]!):{...p};
      renderer.setGridVisible(true);await update();renderer.setCameraFocusCell(actor.cell,actor.surfaceId);await settle();
      await save(image(),`${prefix}-boundary-${i}`);rows.push({distance:'boundary',...renderer.getCameraAudit()});
    }
    snapshot.combat.active=true;snapshot.combat.round=1;snapshot.combat.currentId=actor.id;
    snapshot.combat.participants=snapshot.entities.map(e=>({id:e.id,label:e.label,kind:e.kind,controller:e.kind==='player'?'player':'dm',initiative:0,initiativeSubmitted:true,active:true,hp:e.hp??10,maxHp:e.maxHp??10,armorClass:16,speedMeters:9,attacks:[],conditions:[]}));
    await update();await settle();await save(image(),`${prefix}-combat`);rows.push({distance:'combat',...renderer.getCameraAudit()});
    const report={kind:'polish',campaign:'d8',scene:id,stage,capturedAt:new Date().toISOString(),viewport:{width:1280,height:720},profile,
      sceneDefinitionUnchanged:beforeDefinition===JSON.stringify(snapshot.scene),errors:[...errors],costs,rows};
    const response=await fetch('/__camera_report',{method:'POST',body:JSON.stringify(report)});if(!response.ok)throw new Error('No se pudo guardar el informe');
    output.textContent=`Completado: ${id} · ${stage} · ${rows.length} vistas · ${errors.length} errores`;
  }finally{
    Object.assign(snapshot,saved);rendererOptions.cameraRole=oldRole;renderer.setLocalPlayer(oldRole==='player'?actor.id:null);renderer.setGridVisible(false);
    host.style.width=savedSize.width;host.style.height=savedSize.height;renderer.refreshLayout();await update();button.disabled=false;
  }
}
