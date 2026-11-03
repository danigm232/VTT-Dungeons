import {WorldRenderer} from '../apps/web/world';
import {oneShotCampaignDefinition} from '../campaigns/one-shot/public/pack';
import {actionIcon} from '../engine/client/action-icons';
import type {WorldSnapshot} from '../engine/shared/protocol';
const renderer=new WorldRenderer(document.getElementById('world')!,oneShotCampaignDefinition,{cameraRole:'player',showGrid:true,combatInitiativePosition:'top'});
const status=document.getElementById('status')!;
window.addEventListener('error',event=>{status.textContent='ERROR: '+event.message;});
window.addEventListener('unhandledrejection',event=>{status.textContent='ERROR: '+String(event.reason);});
const fixtures=await(await fetch('/output/d8-mirror-candidate-20261018/safe-snapshots.json')).json();
const snapshot:WorldSnapshot=structuredClone(fixtures[0].snapshot);
snapshot.serverTime=Date.now();snapshot.revision++;
for(const e of snapshot.entities)e.step=null;
await renderer.ready;await renderer.applySnapshot(snapshot);
const actor=snapshot.entities.find(e=>e.id==='aoife')??snapshot.entities.find(e=>e.kind==='player')!;
renderer.setLocalPlayer(actor.id);renderer.setCameraFocusCell(actor.cell,actor.surfaceId);renderer.setCameraTiltDegrees(15);
const names=['Remendar','Prestidigitación','Proyectil de fuego','Encontrar familiar','Disco flotante','Nube de niebla','Identificar','Caída de pluma','Misil mágico'];
for(const label of names){const icon=actionIcon('',label),button=document.createElement('button');button.style.color=icon.color;button.innerHTML=icon.svg;button.append(document.createTextNode(label));button.title=label;document.querySelector('.icons')!.append(button);}
for(let i=0;i<7;i++){const e=snapshot.entities[i%snapshot.entities.length]!,row=document.createElement('button');row.className=`initiative-row timeline-${i===0?'current':i<4?'next':'later'}${i===0?' current':''}`;row.setAttribute('aria-label',e.label);const order=document.createElement('span');order.textContent=i===0?'▶':`+${i}`;const portrait=document.createElement('span');portrait.className='initiative-portrait';const image=document.createElement('img');const token=oneShotCampaignDefinition.tokens[e.tokenId]!;image.src=token.url;image.alt='';portrait.append(image);const copy=document.createElement('span');copy.textContent=i===0?'Ahora':i<4?'Sigue':'Después';row.append(order,portrait,copy);document.querySelector('.combat-initiative-roster')!.append(row);}
const on=(id:string,fn:()=>void)=>{document.getElementById(id)!.onclick=fn;};
on('fog',()=>renderer.playAreaEffect(actor.cell,'fog',6,10000));on('clear',()=>location.reload());
on('range',()=>renderer.showAttackRange(actor.id,36));on('left',()=>renderer.setCameraOrientation(renderer.getCameraAudit().orientation-1));on('right',()=>renderer.setCameraOrientation(renderer.getCameraAudit().orientation+1));on('near',()=>renderer.zoomCameraBy(1.3));on('far',()=>renderer.zoomCameraBy(1/1.3));
(document.getElementById('tilt') as HTMLSelectElement).onchange=e=>renderer.setCameraTiltDegrees(Number((e.target as HTMLSelectElement).value));
(document.getElementById('dock') as HTMLSelectElement).onchange=e=>{const value=(e.target as HTMLSelectElement).value as 'top'|'left'|'right';document.body.dataset.initiativePosition=value;document.getElementById('combatInitiative')!.dataset.position=value;renderer.setCombatInitiativePosition(value);};
status.textContent='Revisión visual · datos de prueba · sin conexión a tu partida';
