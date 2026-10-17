import { ConditionNameIndicators, ConditionPanel } from '../apps/web/ui/conditions';
import { conditionOrder } from '../engine/shared/conditions';
import { conditionFromSpriteState, conditionSpriteAnimation, conditionSpriteEnabled, conditionSpriteMotion, conditionSpriteSelection, persistentConditionState } from '../engine/client/condition-sprites';
import { paintConditionEffect } from '../engine/client/condition-effects';
import { alphaGrounding } from '../engine/client/actor-grounding';
import { isolateAtlasRGBA } from '../engine/client/atlas-isolation';
import { clearBlackSpriteMatte } from '../engine/client/sprite-matte';
import { oneShotCampaignDefinition as campaign } from '../campaigns/one-shot/public/pack';
import type { CombatCondition, ConditionSource } from '../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../engine/shared/campaign';

const $ = (id: string) => document.getElementById(id)!;
const entity = { hp: 6, conditions: ['envenenada', 'restringida'] as CombatCondition[], conditionSources: [{ condition: 'envenenada', sourceLabel: 'Veneno de muestra', expiresAt: Date.now() + 600000 }, { condition: 'restringida', sourceLabel: 'Rosa asesina', escapeDc: 11, endsWhenSourceDefeated: true }] as ConditionSource[] };
const indicators = new ConditionNameIndicators(); $('previewIdentity').append(indicators.root);
const dm = new ConditionPanel(change => {
  entity.conditions = entity.conditions.filter(condition => condition !== change.condition); entity.conditionSources = entity.conditionSources.filter(source => source.condition !== change.condition);
  if (change.active) { entity.conditions.push(change.condition); entity.conditionSources.push({ condition: change.condition, sourceLabel: 'Muestra del DM', ...(change.durationSeconds !== undefined ? { expiresAt: Date.now() + change.durationSeconds * 1000 } : {}) }); }
  dm.update(entity); player.update(entity); indicators.update(entity);
}), player = new ConditionPanel();
$('dm').append(dm.root); $('player').append(player.root); dm.update(entity); player.update(entity); indicators.update(entity);
const selector = $('actor') as HTMLSelectElement, action = $('previewAction') as HTMLSelectElement, reduced = $('reducedMotion') as HTMLInputElement;
reduced.checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
const actors: Array<[string, string]> = [['rogue', 'María / Trinity'], ['silverfarben-hotel', 'Silverfarben Hotel'], ['anteros', 'Anteros'], ['fritz', 'Señorita Fritz'], ['bartender', 'Tabernero'], ['patron', 'Parroquiano'], ['patron-woman', 'Aldeana del café'], ['ben', 'Ben'], ['margaret', 'Margaret'], ['boris', 'Carnicero'], ['cow', 'Vaca'], ['roses', 'Rosas asesinas']];
const poseLabels: Record<string, string> = { defeated: 'suelo', prone: 'derribado', fall: 'caída', ready: 'guardia', 'combat-idle': 'guardia', dodge: 'defensa', hit: 'reacción al daño', talk: 'conversación', interact: 'interacción', react: 'reacción', stealth: 'sigilo', idle: 'reposo', 'idle-standing': 'de pie' };
for (const [id, label] of actors) selector.add(new Option(label, id));
type Frame = PublicCampaignDefinition['tokenAnimations'][string][string]['frames'][number];
type Picture = { image: CanvasImageSource; x: number; y: number; width: number; height: number; logicalWidth: number; logicalHeight: number; anchorX: number; ground: { anchorY: number; heightFraction: number } };
const images = new Map<string, Promise<HTMLImageElement>>(), pictures = new Map<string, Picture>(), effects = new Map<CombatCondition, HTMLCanvasElement>();
async function picture(frame: Frame, tokenId: string) {
  const asset = campaign.tokens[tokenId]!, url = typeof frame === 'string' ? frame : frame.url;
  const key = JSON.stringify([tokenId, frame]); if (pictures.has(key)) return pictures.get(key)!;
  if (!images.has(url)) images.set(url, new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`No se ha cargado ${url}`)); image.src = url; }));
  const image = await images.get(url)!;
  const x = typeof frame === 'string' ? 0 : frame.x, y = typeof frame === 'string' ? 0 : frame.y, width = typeof frame === 'string' ? image.naturalWidth : frame.width, height = typeof frame === 'string' ? image.naturalHeight : frame.height;
  const sample = document.createElement('canvas'); sample.width = width; sample.height = height; const ctx = sample.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  if (clearBlackSpriteMatte(data.data, width, height)) ctx.putImageData(data, 0, 0);
  if (typeof frame !== 'string' && frame.alphaSeeds) { data.data.set(isolateAtlasRGBA(data.data, width, height, frame.alphaSeeds)); ctx.putImageData(data, 0, 0); }
  const value: Picture = { image: sample, x: 0, y: 0, width, height, logicalWidth: typeof frame === 'string' ? asset.logicalWidth : frame.logicalWidth ?? asset.logicalWidth, logicalHeight: typeof frame === 'string' ? asset.logicalHeight : frame.logicalHeight ?? asset.logicalHeight, anchorX: typeof frame === 'string' ? asset.anchorX : frame.anchorX ?? asset.anchorX, ground: alphaGrounding(data.data, width, height) };
  pictures.set(key, value); return value;
}
function effect(condition: CombatCondition) {
  let atlas = effects.get(condition); if (!atlas) { atlas = document.createElement('canvas'); atlas.width = 1024; atlas.height = 256; const ctx = atlas.getContext('2d')!; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(i * 256, 0); paintConditionEffect(ctx, condition, i); ctx.restore(); } effects.set(condition, atlas); } return atlas;
}
type Card = { conditions: CombatCondition[]; canvas: HTMLCanvasElement; pictures: Picture[]; fps: number; state: string; groundPose: boolean; flipX: boolean };
let cards: Card[] = [], generation = 0;
async function refresh() {
  const request = ++generation; cards = []; $('gallery').replaceChildren(); $('reviewStatus').textContent = 'Preparando los PNG…';
  const tokenId = selector.value, label = actors.find(([id]) => id === tokenId)![1], asset = campaign.tokens[tokenId]!, animations = campaign.tokenAnimations[tokenId] ?? {};
  $('previewName').textContent = label;
  const states: Array<CombatCondition | undefined> = [undefined, ...conditionOrder.filter(condition => condition !== 'apresada')];
  try {
    const next = await Promise.all(states.map(async condition => {
      const conditions = condition ? [condition] : [], card = document.createElement('article'), header = document.createElement('header'), name = document.createElement('strong'), badges = new ConditionNameIndicators(), canvas = document.createElement('canvas'), note = document.createElement('footer');
      card.className = 'review-card'; name.textContent = label; badges.update({ conditions }); header.append(name, badges.root); canvas.width = 512; canvas.height = 456; card.append(header, canvas, note); $('gallery').append(card);
      const specialPoses = conditionSpriteEnabled(tokenId);
      const frozen = !specialPoses && conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente');
      let state = specialPoses ? persistentConditionState(conditions, action.value === 'moving', action.value === 'attack') ?? action.value : frozen ? 'idle' : action.value;
      if (state === 'crawl' && !animations.crawl) state = 'condition-derribada';
      const poseCondition = conditionFromSpriteState(state), selection = poseCondition ? conditionSpriteSelection(animations, poseCondition) : undefined;
      const clip = animations[state] ?? (specialPoses ? conditionSpriteAnimation(asset, animations, state) : null) ?? animations.idle ?? { frames: [asset.url], fps: 1 };
      note.textContent = !condition ? 'Sin estado · comparación' : !specialPoses ? 'Animación habitual + overlay sutil' : selection?.authored ? 'Sprite propio del estado + efecto sutil' : selection?.source ? `Pose de ${poseLabels[selection.source] ?? 'personaje'} reutilizada + efecto sutil` : 'Pose adaptada + efecto sutil';
      return { conditions, canvas, pictures: await Promise.all((frozen ? clip.frames.slice(0, 1) : clip.frames).map(frame => picture(frame, tokenId))), fps: clip.fps, state, groundPose: selection?.groundPose ?? true, flipX: clip.flipX ?? false };
    }));
    if (request !== generation) return; cards = next; $('reviewStatus').textContent = 'Compara las poses. Cambia de personaje y prueba caminar o atacar para ver cómo se conserva el efecto.';
  } catch (error) { if (request === generation) $('reviewStatus').textContent = String(error); }
}
selector.onchange = () => void refresh(); action.onchange = () => void refresh(); void refresh();
function draw(now: number) {
  for (const card of cards) {
    const ctx = card.canvas.getContext('2d')!, pic = card.pictures[Math.floor(now / 1000 * card.fps) % card.pictures.length]!;
    ctx.clearRect(0, 0, 512, 456); ctx.save(); ctx.scale(2, 2); ctx.fillStyle = '#c5aa7540'; ctx.beginPath(); ctx.ellipse(128, 205, 39, 7, 0, 0, Math.PI * 2); ctx.fill();
    const h = pic.logicalHeight / campaign.tokens[selector.value]!.logicalHeight * 172, w = pic.logicalWidth / campaign.tokens[selector.value]!.logicalHeight * 172;
    const motion = conditionSpriteMotion(card.state, now, h, card.groundPose, reduced.checked);
    ctx.translate(128 + motion.x, 204 + motion.y); ctx.rotate(motion.lean); ctx.scale(motion.scaleX * (card.flipX ? -1 : 1), motion.scaleY);
    ctx.globalAlpha = card.conditions.includes('invisible') ? .28 : card.conditions.includes('oculta') ? .58 : 1;
    ctx.drawImage(pic.image, pic.x, pic.y, pic.width, pic.height, -w * pic.anchorX, -h * pic.ground.anchorY, w, h);
    for (const condition of card.conditions) { const index = reduced.checked ? 0 : Math.floor(now / 900) % 4; ctx.globalAlpha *= .82; ctx.drawImage(effect(condition), index * 256, 0, 256, 256, -w / 2, -h * pic.ground.heightFraction, w, h * pic.ground.heightFraction); }
    ctx.restore();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw); setInterval(() => { dm.updateTimers(); player.updateTimers(); }, 1000);
