import {Engine} from '@babylonjs/core/Engines/engine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {buildTerrain3D} from '../engine/client/terrain3d.js';
import {campRestsPublicCampaign} from '../campaigns/camp-rests/public/pack.js';
import {createCampVisuals,type CampVisuals} from '../campaigns/camp-rests/public/visuals.js';
import type {CampRestPhase} from '../engine/shared/camp-rest.js';
import type {CampRestState} from '../engine/shared/camp-rest.js';
import type {EnvironmentState} from '../engine/shared/protocol.js';
import {WorldWeather} from '../engine/client/world-weather.js';
const canvas=document.querySelector<HTMLCanvasElement>('#view')!,engine=new Engine(canvas,true,{preserveDrawingBuffer:true});
// This evidence viewer records the native render loop. Compile synchronously
// so a background Chromium tab cannot leave a capture with pending shaders.
engine.getCaps().parallelShaderCompile=undefined;
const camp=document.querySelector<HTMLSelectElement>('#camp')!,phase=document.querySelector<HTMLSelectElement>('#phase')!,focus=document.querySelector<HTMLSelectElement>('#focus')!;
campRestsPublicCampaign.scenes.forEach(def=>camp.add(new Option(def.title,def.id)));
let scene:Scene,visuals:CampVisuals,angle=0,marks=false,frames:number[]=[],lastFrame=0,revision=new URLSearchParams(location.search).get('revision')??'after';
let view:ReturnType<typeof buildTerrain3D>,start=performance.now(),busy=false,auditMessage='',renderSubmissionMs=0,framedFocus:string|undefined;
const weather=document.querySelector<HTMLSelectElement>('#weather')!;
document.querySelector('#shadows')!.addEventListener('change',event=>{scene.shadowsEnabled=(event.target as HTMLInputElement).checked;});
let weatherOffset=0,reviewInteractions:CampRestState['interactions']=[],reviewWeather:WorldWeather;
const reviewEnvironment=():EnvironmentState=>({storm:false,lightning:false,stormIntensity:0,precipitation:weather.value.startsWith('rain')?'rain':weather.value.startsWith('snow')?'snow':'none',precipitationLevel:Number(weather.value.match(/[123]$/)?.[0]??2) as 1|2|3});
document.querySelector('#weatherAdvance')!.addEventListener('click',()=>{if(busy)return;const def=campRestsPublicCampaign.scenes.find(s=>s.id===camp.value)!,point=def.camp!.interactionPoints.find(p=>p.id===focus.value),time=(performance.now()-start)/1000+weatherOffset;for(let step=1;step<=60;step++)visuals.update(time+step,phase.value as CampRestPhase,reviewInteractions,point?.cell,reviewEnvironment());weatherOffset+=60;});
document.querySelector('#tendFire')!.addEventListener('click',()=>{const point=campRestsPublicCampaign.scenes.find(s=>s.id===camp.value)!.camp!.interactionPoints.find(p=>p.kind==='fire')!;reviewInteractions=[{pointId:point.id,pointLabel:point.label,characterId:'mike',characterLabel:'Mike',at:Date.now(),activityId:'tend-fire',action:'used'}];visuals.update((performance.now()-start)/1000+weatherOffset,phase.value as CampRestPhase,reviewInteractions,undefined,reviewEnvironment());auditMessage='Leña añadida · '+point.label;});
function resize(){canvas.style.height=`${innerHeight-document.querySelector('header')!.getBoundingClientRect().height}px`;engine.resize();if(!view)return;const def=campRestsPublicCampaign.scenes.find(s=>s.id===camp.value)!,aspect=engine.getRenderWidth()/engine.getRenderHeight(),requestedWidth=Number(new URLSearchParams(location.search).get('viewWidth')),width=requestedWidth>=6&&requestedWidth<=80?requestedWidth:focus.value?8:def.id==='camp-a1-rooms'?42:27;view.camera.orthoLeft=-width;view.camera.orthoRight=width;view.camera.orthoTop=width/aspect;view.camera.orthoBottom=-width/aspect;}
function load(){scene?.dispose();frames=[];scene=new Scene(engine);const def=campRestsPublicCampaign.scenes.find(s=>s.id===camp.value)!;view=buildTerrain3D(scene,def.terrain!,{batchTiles:true,renderTiles:def.id!=='camp-a1-rooms',ambientIntensity:0});view.grids.forEach(g=>g.isVisible=false);visuals=createCampVisuals(scene,def)!;view.camera.target=new Vector3(def.terrain!.cols*.75,.6,def.id==='camp-a1-rooms'?15.8:def.terrain!.rows*.75);view.camera.alpha=Math.PI/2+.15+angle*Math.PI/4;view.camera.beta=Math.PI/4;focus.replaceChildren(new Option('Exterior',''));def.camp!.interactionPoints.filter(p=>p.kind==='bed'||p.kind==='tent').forEach(p=>focus.add(new Option(p.label,p.id)));start=performance.now();resize();return scene;}
camp.value=new URLSearchParams(location.search).get('scene')??camp.value;
camp.onchange=()=>{const params=new URLSearchParams(location.search);params.set('scene',camp.value);location.search=params.toString();};focus.onchange=()=>{};document.querySelector('#rotate')!.addEventListener('click',()=>{angle=(angle+1)%8;view.camera.alpha=Math.PI/2+.15+angle*Math.PI/4;});document.querySelector('#marks')!.addEventListener('click',()=>{marks=!marks;visuals.setInteractionHighlights(marks);});
async function capture(name?:string){
  // Let the complete native frame settle before reading its colour buffer.
  // Keeping the next frame stopped during PNG encoding avoids mixed snapshots
  // of animated geometry after a camera turn on integrated graphics.
  await waitFrames(2);engine.stopRenderLoop(renderFrame);
  let blob:Blob;
  try{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('capture')),'image/png'));}
  finally{engine.runRenderLoop(renderFrame);}
  const weatherTag=revision==='weather'?`-${weather.value}-${weatherOffset}s`:'';
  await fetch(`/__capture?name=${name??`${revision}-${camp.value}-${phase.value}-${angle}-${focus.value?'inside':'outside'}${weatherTag}.png`}`,{method:'POST',headers:{'content-type':'image/png'},body:blob});
}
document.querySelector('#capture')!.addEventListener('click',()=>void(async()=>{
  if(busy)return;busy=true;
  const controls=[...document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select')];controls.forEach(c=>c.disabled=true);
  try{await capture();}
  catch(error){auditMessage='Error de captura: '+String(error);console.error(auditMessage);}
  finally{busy=false;controls.forEach(c=>c.disabled=false);}
})());
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function waitFrames(count=24){return new Promise<void>((resolve,reject)=>{let frames=0;const required=revision==='weather'?Math.min(count,4):count;const timeout=setTimeout(()=>{scene.onAfterRenderObservable.remove(observer);reject(Error('El navegador no está renderizando la vista.'));},30000);const observer=scene.onAfterRenderObservable.add(()=>{if(++frames>=required){clearTimeout(timeout);scene.onAfterRenderObservable.remove(observer);resolve();}});});}
function metrics(id:string,time:string,a:number){const intervals=frames.slice(-60).sort((x,y)=>x-y),median=intervals[Math.floor(intervals.length/2)]??0,heap=(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory;return {scene:id,phase:time,angle:a,meshes:scene.meshes.length,vertices:scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),textureCount:scene.textures.length,heapUsedBytes:heap?.usedJSHeapSize??null,drawCalls:engine._drawCalls.current,particleCapacity:scene.particleSystems.reduce((n,s)=>n+s.getCapacity(),0),activeParticles:scene.particleSystems.reduce((n,s)=>n+s.getActiveCount(),0),ready:scene.isReady(),visibility:document.visibilityState,gpu:engine.getGlInfo(),renderSubmissionMs,observedFps:median?1000/median:0,renderWidth:engine.getRenderWidth(),renderHeight:engine.getRenderHeight(),compact:matchMedia('(pointer: coarse), (max-width:850px)').matches};}
document.querySelector('#audit')!.addEventListener('click',()=>void(async()=>{
  if(busy)return;busy=true;auditMessage='';
  const report:Array<Record<string,unknown>>=[];
  const controls=[...document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select')];
  controls.forEach(c=>c.disabled=true);
  try{
    for(const def of campRestsPublicCampaign.scenes.filter(s=>s.id===camp.value)){
      focus.value='';phase.value='arrival';
      // Keep the engine's normal render loop, including its frame lifecycle and
      // uniform-buffer updates. Manual scene renders can produce stale lighting.
      for(let warm=0;warm<120;warm++){
        if(scene.isReady())break;
        document.querySelector('#stats')!.textContent='Preparando recursos · '+def.title+' · '+warm;
        await wait(250);
      }
      if(!scene.isReady())throw Error('Recursos sin preparar en '+def.id+' '+JSON.stringify({ effects:scene.meshes.slice(0,3).map(m=>({name:m.name,material:m.material?.name,effect:m.subMeshes?.[0]?.effect?.isReady(),error:m.subMeshes?.[0]?.effect?.getCompilationError()})),waiting:scene.getWaitingItemsCount(),textures:scene.textures.filter(t=>!t.isReady()).map(t=>t.name),meshes:scene.meshes.filter(m=>!m.isReady(true)).map(m=>m.name),particles:scene.particleSystems.filter(p=>!p.isReady()).map(p=>p.name),targets:scene.customRenderTargets.filter(t=>!t.isReadyForRendering()).map(t=>t.name),camera:scene.activeCamera?.isReady(true),renderReady:scene.isReady(false)}));
      for(const time of ['arrival','night']){
        phase.value=time;
        for(let a=0;a<8;a++){
          angle=a;view.camera.alpha=Math.PI/2+.15+a*Math.PI/4;
          frames=[];lastFrame=0;
          await waitFrames();
          const sample=metrics(def.id,time,a);
          await capture();
          report.push(sample);
          document.querySelector('#stats')!.textContent='Revisando '+def.title+' · '+time+' · '+(a+1)+'/8';
        }
      }
      // Record phase colour and legibility as well as both camera matrices.
      if(revision==='after')for(const time of ['dusk','dawn']){
        phase.value=time;angle=0;view.camera.alpha=Math.PI/2+.15;
        frames=[];lastFrame=0;await waitFrames(36);const sample=metrics(def.id,time,0);await capture();report.push(sample);
      }
      for(const p of def.camp!.interactionPoints.filter(p=>p.kind==='tent'||p.kind==='bed')){
        phase.value='night';angle=0;focus.value=p.id;view.camera.alpha=Math.PI/2+.15;
        await waitFrames(36);
        await capture(revision+'-'+def.id+'-'+p.id+'-interior.png');
      }
      focus.value='';
    }
    const previousResponse=await fetch('/evidence/visual-report.json');
    const previous:Array<Record<string,unknown>>=previousResponse.ok?await previousResponse.json():[];
    const combined=[...previous.filter(item=>item.scene!==camp.value),...report];
    await fetch('/__report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(combined)});
    auditMessage='Auditoría completa · '+report.length+' vistas + interiores';document.querySelector('#stats')!.textContent=auditMessage;
  }catch(error){auditMessage='Error de auditoría: '+String(error);document.querySelector('#stats')!.textContent=auditMessage;console.error(auditMessage);}
  finally{busy=false;controls.forEach(c=>c.disabled=false);}
})());
addEventListener('resize',resize);reviewWeather=new WorldWeather(load());
function renderFrame(){const before=performance.now();engine._drawCalls.fetchNewFrame();const now=performance.now(),def=campRestsPublicCampaign.scenes.find(s=>s.id===camp.value)!,point=def.camp!.interactionPoints.find(p=>p.id===focus.value);
  if(framedFocus!==focus.value){framedFocus=focus.value;const cell=point?.objectCell??point?.cell,alpha=view.camera.alpha,beta=view.camera.beta,radius=view.camera.radius;view.camera.setTarget(cell?new Vector3((cell.col+.5)*1.5,.6,(cell.row+.5)*1.5):new Vector3(def.terrain!.cols*.75,.6,def.id==='camp-a1-rooms'?15.8:def.terrain!.rows*.75));view.camera.alpha=alpha;view.camera.beta=beta;view.camera.radius=radius;resize();}
  visuals.update((now-start)/1000+weatherOffset,phase.value as CampRestPhase,reviewInteractions,point?.cell,reviewEnvironment());reviewWeather.update(reviewEnvironment(),view.camera.target,false,engine.getDeltaTime(),50,visuals.weatherCovered);scene.render();renderSubmissionMs=performance.now()-before;if(lastFrame){frames.push(now-lastFrame);if(frames.length>180)frames.shift();}lastFrame=now;if(!busy)document.querySelector('#stats')!.textContent=auditMessage||`${Math.round(engine.getFps())} FPS · ${Math.round(renderSubmissionMs)} ms CPU · ${scene.meshes.length} mallas`;}engine.runRenderLoop(renderFrame);
