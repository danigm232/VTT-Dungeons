import {isolateAtlasRGBA} from '../engine/client/atlas-isolation';
import {alphaGrounding} from '../engine/client/actor-grounding';
import {tokenAnimationFrame,directedTokenState} from '../engine/client/token-animation-playback';
import {cameraRelativeHeading} from '../engine/client/camera-movement';
import type {Facing} from '../engine/shared/protocol';
import type {PublicCampaignDefinition,VisualAsset} from '../engine/shared/campaign';
type Clip=PublicCampaignDefinition['tokenAnimations'][string][string];
const $=(id:string)=>document.getElementById(id)!;
const heading=$('heading') as HTMLSelectElement,camera=$('camera') as HTMLSelectElement,seek=$('seek') as HTMLInputElement;
const speed=$('speed') as HTMLSelectElement,scope=$('scope') as HTMLSelectElement;
const facings:Facing[]=['north','north-east','east','south-east','south','south-west','west','north-west'];
const suffixes=['n','ne','e','se','s','sw','w','nw'];
const names=['Norte','Noreste','Este','Sureste','Sur','Suroeste','Oeste','Noroeste'];
names.forEach((name,i)=>heading.add(new Option(name,String(i))));heading.value='3';
names.forEach((_,i)=>camera.add(new Option(`${i*45}°`,String(i))));
const response=await fetch('/art/silverfarben-v3/catalogue.json',{cache:'no-store'});
if(!response.ok)throw new Error('No se ha podido cargar el catálogo de Silverfarben.');
const {states,asset:base,phaseLabels={}}=await response.json() as {asset:VisualAsset;states:PublicCampaignDefinition['tokenAnimations'][string];phaseLabels?:Record<string,string[]>};
const roles=[['original','Original · referencia'],['idle','Reposo'],['moving','Caminar'],['running','Correr'],['jump','Saltar'],['attack','Daga'],['attack-arrow','Arco corto'],['attack-throw','Lanzar daga'],['attack-unarmed','Golpe sin armas'],['spell','Conjurar'],['use-torch','Encender antorcha'],['talk','Hablar'],['help','Ayudar'],['influence','Influir'],['search','Buscar'],['study','Estudiar'],['interact','Interactuar'],['ready','Preparar'],['dodge','Esquivar'],['hit','Recibir impacto'],['climb','Trepar'],['swim','Nadar'],['crawl','Arrastrarse'],['sit','Sentarse'],...['envenenada','asustada','paralizada','restringida','agarrada','hechizada','derribada','inconsciente'].map(c=>[`condition-${c}`,c])];
type Picture={canvas:HTMLCanvasElement;width:number;height:number;ax:number;ay:number};
const images=new Map<string,Promise<HTMLImageElement>>(),pictures=new Map<string,Picture>();
async function picture(frame:Clip['frames'][number]){
  const key=JSON.stringify(frame);if(pictures.has(key))return pictures.get(key)!;
  const url=typeof frame==='string'?frame:frame.url;
  if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`No disponible: ${url}`));img.src=url;}));
  const image=await images.get(url)!,canvas=document.createElement('canvas');
  const crop=typeof frame!=='string'?frame:null;
  canvas.width=crop?.width??image.naturalWidth;canvas.height=crop?.height??image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  ctx.drawImage(image,crop?.x??0,crop?.y??0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height);
  if(crop?.alphaSeeds){data.data.set(isolateAtlasRGBA(data.data,canvas.width,canvas.height,crop.alphaSeeds));ctx.putImageData(data,0,0);}
  const ground=alphaGrounding(data.data,canvas.width,canvas.height);
  const value={canvas,width:crop?.logicalWidth??base.logicalWidth,height:crop?.logicalHeight??base.logicalHeight,ax:crop?.anchorX??base.anchorX,ay:crop?.anchorY??ground.anchorY};pictures.set(key,value);return value;
}
const revised=new Set(['original','idle','spell','climb','swim','crawl','condition-paralizada','condition-restringida','condition-agarrada','condition-hechizada','condition-derribada']);
let cards:Array<{canvas:HTMLCanvasElement;clip:Clip;pictures:Picture[];loop:boolean;phase:HTMLElement;labels:string[]}>=[],version=0,paused=false,start=performance.now();
async function refresh(){
  const request=++version;cards=[];$('gallery').replaceChildren();$('status').textContent='Preparando dibujos…';
  const direction=suffixes[facings.indexOf(cameraRelativeHeading(facings[Number(heading.value)]!,-Math.PI/4+Number(camera.value)*Math.PI/4))]!;
  try{
    const next=await Promise.all(roles.filter(([role])=>scope.value==='all'||revised.has(role!)).map(async([role,title])=>{
      let chosen=directedTokenState(role!,direction,candidate=>Boolean(states[candidate]));
      if(chosen===role&&['attack-arrow','attack-throw'].includes(role!)&&['sw','w','nw'].includes(direction)&&states[`${role}-mirrored`])chosen=`${role}-mirrored`;
      const clip=role==='original'?{frames:[base.url],fps:1}:states[chosen]!;
      const card=document.createElement('article'),h=document.createElement('h2'),canvas=document.createElement('canvas'),note=document.createElement('p');
      card.className='card';h.textContent=title!;canvas.width=400;canvas.height=400;
      note.textContent=role==='original'?'PNG original sin modificar':`${clip.frames.length} poses · ${clip.fps} fps · ${chosen}${chosen===role&&!role!.startsWith('condition-')?' · vista única':''}`;
      const phase=document.createElement('p');phase.className='phase';phase.setAttribute('aria-live','off');
      card.append(h,canvas,note,phase);$('gallery').append(card);
      const loop=clip.loop??/^(idle|moving|running|climb|swim|crawl|stealth|condition-)/.test(role!);
      return {canvas,clip,loop,phase,labels:phaseLabels[role!]??[],pictures:await Promise.all(clip.frames.map(picture))};
    }));
    if(request===version){cards=next;start=performance.now();$('status').textContent=`Vista de cámara: ${names[suffixes.indexOf(direction)]}. La escala cambia con la postura, no con un ajuste automático por imagen.`;}
  }catch(error){if(request===version)$('status').textContent=String(error);}
}
heading.onchange=camera.onchange=scope.onchange=()=>void refresh();
speed.onchange=()=>{start=performance.now();};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Reproducir':'Pausar';start=performance.now();};
seek.oninput=()=>{paused=true;$('pause').textContent='Reproducir';};
function draw(now:number){
  for(const card of cards){
    const duration=card.pictures.length*1000/card.clip.fps;
    const time=(now-start)*Number(speed.value);
    const elapsed=card.loop?time:time%(duration+650);
    const index=paused?tokenAnimationFrame(card.pictures.length,card.clip.fps,0,false,Number(seek.value)/100):tokenAnimationFrame(card.pictures.length,card.clip.fps,elapsed,card.loop);
    const pic=card.pictures[index]!,ctx=card.canvas.getContext('2d')!;ctx.clearRect(0,0,400,400);ctx.save();ctx.translate(200,355);
    card.phase.textContent=`${index+1}/${card.pictures.length}${card.labels[index]?` · ${card.labels[index]}`:''}`;
    ctx.strokeStyle='#75918b';ctx.beginPath();ctx.moveTo(-75,0);ctx.lineTo(75,0);ctx.stroke();ctx.scale(card.clip.flipX?-1:1,1);
    const scale=250/base.logicalHeight,w=pic.width*scale,h=pic.height*scale;
    ctx.drawImage(pic.canvas,-w*pic.ax,-h*pic.ay,w,h);ctx.restore();
  }
  requestAnimationFrame(draw);
}
void refresh();requestAnimationFrame(draw);
