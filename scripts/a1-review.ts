import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { buildTerrain3D } from '../engine/client/terrain3d.js';
import { campRestsPublicCampaign } from '../campaigns/camp-rests/public/pack.js';
import { createCampVisuals } from '../campaigns/camp-rests/public/visuals.js';
import { A1_ROOMS } from '../campaigns/camp-rests/public/a1-layout.js';
import type { CampRestPhase } from '../engine/shared/camp-rest.js';
const engine = new Engine(document.querySelector<HTMLCanvasElement>('#view')!, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine), definition = campRestsPublicCampaign.scenes.find(s => s.id === 'camp-a1-rooms')!;
const before=new URLSearchParams(location.search).has('before');
const view = buildTerrain3D(scene, definition.terrain!, { batchTiles: true, renderTiles: before, ambientIntensity: before?.9:0 });
view.grids.forEach(g => { g.alpha = .04; g.color = Color3.FromHexString('#8f8879'); });
const visuals = before ? (await import('../output/a1-review/visuals-before.js')).createCampVisuals(scene,definition)! : createCampVisuals(scene, definition)!;
view.camera.target = new Vector3(36, .5, 15.8); view.camera.alpha = Math.PI / 2 + .22; view.camera.beta = .92;
const framing=document.querySelector<HTMLSelectElement>('#framing')!,room=document.querySelector<HTMLSelectElement>('#room')!,pan=document.querySelector<HTMLInputElement>('#pan')!,canvas=document.querySelector<HTMLCanvasElement>('#view')!;
function resize() { canvas.style.height=`${window.innerHeight-document.querySelector('header')!.getBoundingClientRect().height}px`;engine.resize(); const aspect = engine.getRenderWidth()/engine.getRenderHeight(),width=framing.value==='detail'?18:40;view.camera.orthoLeft=-width; view.camera.orthoRight=width; view.camera.orthoTop=width/aspect; view.camera.orthoBottom=-width/aspect; }
resize(); window.addEventListener('resize', resize);
let phase: CampRestPhase = 'arrival', marks = false;
function setPhase(next:CampRestPhase){phase=next;document.querySelector('#day')!.setAttribute('aria-pressed',String(next==='arrival'));document.querySelector('#night')!.setAttribute('aria-pressed',String(next==='night'));}
document.querySelector('#day')!.addEventListener('click', () => setPhase('arrival'));
document.querySelector('#night')!.addEventListener('click', () => setPhase('night'));
document.querySelector('#rotate')!.addEventListener('click', () => view.camera.alpha+=Math.PI/4);
document.querySelector('#marks')!.addEventListener('click', () => { marks=!marks; visuals.setInteractionHighlights(marks);document.querySelector('#marks')!.setAttribute('aria-pressed',String(marks)); });
framing.addEventListener('change',()=>{pan.disabled=framing.value!=='detail';view.camera.target.x=pan.disabled?36:Number(pan.value);resize();});
pan.addEventListener('input',()=>{view.camera.target.x=Number(pan.value);});
  document.querySelector('#capture')!.addEventListener('click',()=>{
    const state=phase==='night'?'noche':'dia',interior=room.value?`celda-${room.value}`:'exterior';
    const framingName=framing.value==='overview'?'general':'detail';
    const filename=`a1-v7-${state}-${framingName}-${interior}.png`;
  const save=async()=>{
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No se pudo crear la captura')),'image/png'));
    try { const response=await fetch(`/__capture?name=${encodeURIComponent(filename)}`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob}); if(response.ok)return; } catch {}
    const link=document.createElement('a');link.download=filename;link.href=URL.createObjectURL(blob);link.click();URL.revokeObjectURL(link.href);
  };
  void save();
});
engine.runRenderLoop(() => { const selectedRoom=A1_ROOMS.find(candidate=>candidate.id===Number(room.value));visuals.update(performance.now()/1000,phase,[],selectedRoom?.interaction); scene.render(); document.querySelector('#stats')!.textContent=`${Math.round(engine.getFps())} FPS · ${scene.meshes.length} mallas`; });
