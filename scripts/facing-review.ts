import { oneShotCampaignDefinition as d8 } from '../campaigns/one-shot/public/pack';
import { publicCampaignDefinition as storm } from '../campaigns/stormwreck-isle/public/pack';
import { cameraRelativeHeading, screenVectorToWorldAtAlpha, worldVectorToCellDelta } from '../engine/client/camera-movement';
import { directionalRestAnimation } from '../engine/client/directional-rest';
import { isolateAtlasRGBA } from '../engine/client/atlas-isolation';
import { clearBlackSpriteMatte } from '../engine/client/sprite-matte';
import { alphaGrounding } from '../engine/client/actor-grounding';
import type { Facing } from '../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../engine/shared/campaign';

const $ = (id: string) => document.getElementById(id)!;
const selector = $('actor') as HTMLSelectElement, camera = $('camera') as HTMLSelectElement;
const headings: Facing[] = ['north','north-east','east','south-east','south','south-west','west','north-west'];
const suffixes = ['n','ne','e','se','s','sw','w','nw'], names = ['Norte','Noreste','Este','Sureste','Sur','Suroeste','Oeste','Noroeste'];
const offsets = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const d8Actors = [['rogue','Trinity'],['silverfarben-hotel','Silverfarben Hotel'],['anteros','Anteros'],['fritz','Señorita Fritz'],['bartender','Tabernero'],['patron','Parroquiano'],['patron-woman','Aldeana del café'],['ben','Ben'],['margaret','Margaret'],['boris','Carnicero'],['cow','Vaca'],['roses','Rosas asesinas']];
const actors = [...d8Actors.map(([id,label]) => ({ id: id!, label: `D8 · ${label}`, campaign: d8 })), ...[['rogue','Trinity'],['wizard','Mike'],['cleric','Mia'],['zombie','Zombi'],['harpy','Arpía'],['ghoul','Ghoul']].map(([id,label]) => ({ id: id!, label: `Stormwreck · ${label}`, campaign: storm }))];
actors.forEach((actor,index) => selector.add(new Option(actor.label, String(index))));
for (let i = 0; i < 8; i++) camera.add(new Option(`${i * 45}°`, String(i)));
const alpha = () => -Math.PI / 4 + Number(camera.value) * Math.PI / 4;
type Clip = PublicCampaignDefinition['tokenAnimations'][string][string];
type Picture = { canvas: HTMLCanvasElement; width: number; height: number; anchor: number; anchorY: number; ground: ReturnType<typeof alphaGrounding> };
type Pose = { walk: Picture[]; rest: Picture[]; fps: number; restFps: number; flip: boolean; restFlip: boolean; canvas: HTMLCanvasElement; direction: string };
const images = new Map<string, Promise<HTMLImageElement>>(), cache = new Map<string, Picture>();
async function picture(frame: Clip['frames'][number]) {
  const key = JSON.stringify(frame); if (cache.has(key)) return cache.get(key)!;
  const url = typeof frame === 'string' ? frame : frame.url;
  if (!images.has(url)) images.set(url, new Promise((resolve,reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`PNG no disponible: ${url}`)); image.src = url; }));
  const image = await images.get(url)!, canvas = document.createElement('canvas');
  canvas.width = typeof frame === 'string' ? image.naturalWidth : frame.width; canvas.height = typeof frame === 'string' ? image.naturalHeight : frame.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, typeof frame === 'string' ? 0 : frame.x, typeof frame === 'string' ? 0 : frame.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0,0,canvas.width,canvas.height);
  clearBlackSpriteMatte(data.data,canvas.width,canvas.height);
  if (typeof frame !== 'string' && frame.alphaSeeds) data.data.set(isolateAtlasRGBA(data.data,canvas.width,canvas.height,frame.alphaSeeds));
  ctx.putImageData(data,0,0);
  const ground = alphaGrounding(data.data,canvas.width,canvas.height);
  const result = { canvas, width: typeof frame === 'string' ? canvas.width : frame.logicalWidth ?? canvas.width,
    height: typeof frame === 'string' ? canvas.height : frame.logicalHeight ?? canvas.height,
    anchor: typeof frame === 'string' ? .5 : frame.anchorX ?? .5,
    anchorY: typeof frame === 'string' ? ground.anchorY : frame.anchorY ?? ground.anchorY, ground };
  cache.set(key,result); return result;
}
let poses: Pose[] = [], generation = 0, demoHeading: Facing = 'south', moving = false;
const mode = $('mode') as HTMLSelectElement, speed = $('speed') as HTMLSelectElement;
const frameControl = $('frame') as HTMLInputElement;
let paused = false, elapsed = 0, lastNow = 0;
const pause = $('pause') as HTMLButtonElement;
pause.onclick = () => { paused = !paused; pause.textContent = paused ? 'Reproducir' : 'Pausar'; };
function seek(frame: number) {
  const count=poses[0]?.walk.length??8;
  paused = true; pause.textContent = 'Reproducir'; frameControl.value = String((frame + count) % count);
  elapsed = Number(frameControl.value) * 1000 / (poses[0]?.fps ?? 16);
}
frameControl.oninput = () => seek(Number(frameControl.value));
frameControl.onchange = () => seek(Number(frameControl.value));
$('previous').onclick = () => seek(Number(frameControl.value) - 1);
$('next').onclick = () => seek(Number(frameControl.value) + 1);
mode.onchange = () => void refresh();
async function refresh() {
  const request = ++generation; poses = []; $('gallery').replaceChildren(); $('status').textContent = 'Preparando las vistas…';
  const actor = actors[Number(selector.value)]!, states = actor.campaign.tokenAnimations[actor.id] ?? {};
  try {
    const next = await Promise.all(headings.map(async (heading,i) => {
      const screen = suffixes[headings.indexOf(cameraRelativeHeading(heading,alpha()))]!;
      const walk = (mode.value === 'run' ? states[`running-${screen}`] : null)
        ?? states[`moving-${screen}`] ?? states[`direction-${screen}`] ?? states.moving ?? { frames: [actor.campaign.tokens[actor.id]!.url], fps: 1 };
      const rest = states[`idle-${screen}`] ?? directionalRestAnimation(states,`idle-${screen}`) ?? states.idle ?? walk;
      const card = document.createElement('article'), title = document.createElement('h2'), description = document.createElement('p'), canvas = document.createElement('canvas');
      card.className = 'card'; title.textContent = names[i]!; description.textContent = `Vista: ${names[headings.indexOf(cameraRelativeHeading(heading,alpha()))]}`;
      canvas.width = 400; canvas.height = 400; card.append(title,description,canvas); $('gallery').append(card);
      return { walk: await Promise.all(walk.frames.map(picture)), rest: await Promise.all(rest.frames.map(picture)), fps: walk.fps, restFps: rest.fps, flip: walk.flipX ?? false, restFlip: rest.flipX ?? false, canvas, direction: screen };
    }));
    if (request === generation) { poses = next; frameControl.max=String(next[0]!.walk.length-1); frameControl.value='0';elapsed=0; $('status').textContent = `Ocho rumbos · ${next[0]!.walk.length} fotogramas por ciclo · escala constante dentro de cada ciclo`; }
  } catch (error) { if (request === generation) $('status').textContent = String(error); }
}
selector.onchange = () => { moving = false; void refresh(); }; camera.onchange = () => void refresh();
const held = new Set<string>();
function aim(x: number, up: number) {
  moving = Boolean(x || up); if (!moving) return;
  const { col, row } = worldVectorToCellDelta(screenVectorToWorldAtAlpha(x,up,alpha(),Math.PI / 4));
  demoHeading = headings[offsets.findIndex(([dx,dy]) => dx === col && dy === row)] ?? demoHeading;
}
function keyboard() { aim(Number(held.has('d')) - Number(held.has('a')), Number(held.has('w')) - Number(held.has('s'))); }
window.addEventListener('keydown', event => { if (!'wasd'.includes(event.key.toLowerCase()) || event.target instanceof HTMLSelectElement) return; event.preventDefault(); held.add(event.key.toLowerCase()); keyboard(); });
window.addEventListener('keyup', event => { held.delete(event.key.toLowerCase()); keyboard(); });
window.addEventListener('blur', () => { held.clear(); moving = false; });
for (const index of [7,0,1,6,-1,2,5,4,3]) {
  if (index < 0) { const center = document.createElement('span'); center.textContent = '●'; $('arrows').append(center); continue; }
  const button = document.createElement('button'); button.type = 'button'; button.textContent = ['↑','↗','→','↘','↓','↙','←','↖'][index]!; button.setAttribute('aria-label',names[index]!);
  button.onpointerdown = event => { button.setPointerCapture(event.pointerId); const [x,y] = offsets[index]!; aim(x!,-y!); };
  button.onpointerup = button.onpointercancel = () => { moving = false; };
  $('arrows').append(button);
}
function draw(canvas: HTMLCanvasElement, pose: Pose, walking: boolean, now: number) {
  const ctx = canvas.getContext('2d')!, frames = walking ? pose.walk : pose.rest;
  const pic = frames[Math.floor(now / 1000 * (walking ? pose.fps : pose.restFps)) % frames.length]!;
  ctx.clearRect(0,0,canvas.width,canvas.height); ctx.save(); ctx.translate(canvas.width / 2,canvas.height - 45);
  ctx.fillStyle = '#c5aa7533'; ctx.beginPath(); ctx.ellipse(0,0,42,8,0,0,Math.PI * 2); ctx.fill();
  // Use one reference scale per clip, never resize every pose to hide gait jitter.
  const actor=actors[Number(selector.value)]!;
  const scale = (canvas.height - 90) / actor.campaign.tokens[actor.id]!.logicalHeight;
  const height = pic.height * scale, width = pic.width * scale;
  ctx.scale((walking ? pose.flip : pose.restFlip) ? -1 : 1,1);
  ctx.drawImage(pic.canvas,-width * pic.anchor,-height * pic.anchorY,width,height); ctx.restore();
}
function render(now: number) {
  if (lastNow && !paused) elapsed += Math.min(100,now - lastNow) * Number(speed.value);
  lastNow = now;
  const count=poses[0]?.walk.length??8;
  if (!paused) frameControl.value = String(Math.floor(elapsed / 1000 * (poses[0]?.fps ?? 16)) % count);
  $('frameLabel').textContent = `Fotograma ${Number(frameControl.value) + 1}/${count}`;
  for (const pose of poses) draw(pose.canvas,pose,mode.value === 'auto' ? elapsed % 3600 < 1500 : mode.value !== 'rest',elapsed);
  const pose = poses[headings.indexOf(demoHeading)];
  if (pose) draw($('demo') as HTMLCanvasElement,pose,moving,elapsed);
  $('demoStatus').textContent = `${moving ? 'Caminando' : 'Quieto'} · vista ${names[headings.indexOf(cameraRelativeHeading(demoHeading,alpha()))]}`;
  requestAnimationFrame(render);
}
void refresh(); requestAnimationFrame(render);
