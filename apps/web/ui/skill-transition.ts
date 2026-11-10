import {
  blendMotion, sampleTrack, skillAbilities, skillSceneRoles, SkillMicroScenePlayback,
  type ActorAnimation, type Motion, type SkillMicroScene, type SkillPhase, type Track
} from '../../../engine/client/skill-micro-scene';
import { drawProp, line, oval } from './skill-scene-art';
import { SkillSceneSprite, type SkillActor, type SkillImageLoader } from './skill-scene-sprite';
import { skillMicroScenes } from './skill-scenes';
import { preparePerformanceSound } from './skill-performance-sound';
import markup from './skill-transition.html?raw';
import chasmPlate from './art/skill-chasm.webp';
import floorPlate from './art/skill-floor.webp';
import { SkillPropSprites } from './skill-prop-sprites';
import { SkillD20 } from './skill-d20';
import { skillRunningGround } from '../../../engine/client/skill-running-ground';
import {drawSkillGroundShadow,drawSkillPropShadow,skillPropFootprints} from './skill-scene-shadows';
import {perceptionGuest,withPerceptionVariant} from './skill-perception-variants';
import './skill-transition.css';

type Frame = ReturnType<SkillMicroScenePlayback['frame']>;
const winding = (phase: SkillPhase) => phase === 'D20_PRESSED' || phase === 'ROLL';
const loopTime = (ms: number) => ms / 3200 % 1;
const eased = (t: number) => t * t * (3 - 2 * t);

function motionAt(frame: Frame, ambient: Track | undefined, action: Track | undefined, reduced: boolean): Motion {
  const idle = sampleTrack(ambient, reduced ? 0 : loopTime(frame.ambientMs));
  if (frame.phase === 'AMBIENT_LOOP' || frame.phase === 'INIT' || winding(frame.phase)) return idle;
  if (!action) return idle;
  if (frame.phase === 'ACTION_PREPARE') return blendMotion(idle, sampleTrack(action, 0), eased(frame.progress));
  if (frame.phase === 'SUCCESS' || frame.phase === 'FAILURE') return sampleTrack(action, reduced ? .7 : frame.progress);
  if (frame.phase === 'REACTION') return sampleTrack(action, reduced ? .7 : 1);
  return sampleTrack(action, 1);
}

function at(ctx: CanvasRenderingContext2D, x: number, y: number, motion: Motion, draw: () => void) {
  if (motion.opacity === 0) return;
  ctx.save();
  ctx.translate(x + (motion.x ?? 0), y + (motion.y ?? 0));
  ctx.rotate(motion.tilt ?? 0);
  ctx.scale((motion.scale ?? 1) * (motion.facing ?? 1), motion.scale ?? 1);
  ctx.globalAlpha = motion.opacity ?? 1;
  draw();
  ctx.restore();
}

export class SkillTransitionScreen {
  readonly dialog: HTMLDialogElement;
  private readonly title: HTMLElement;
  private readonly destination: HTMLElement;
  private readonly ability: HTMLElement;
  private readonly description: HTMLElement;
  private readonly status: HTMLElement;
  private readonly result: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly die: HTMLButtonElement;
  private readonly dieFace: Element;
  private readonly tumblingDie: SkillD20;
  private readonly continueButton: HTMLButtonElement;
  private readonly plate: HTMLImageElement;
  private readonly runningGround = new Image();
  private groundSurface: HTMLCanvasElement | undefined;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly propSprites: SkillPropSprites;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private active: { key: string; playback: SkillMicroScenePlayback; sprite: SkillSceneSprite; guest?:SkillSceneSprite; modifier?: number } | undefined;
  private animation = 0;
  private previousFrame = -Infinity;
  private previousPhase: SkillPhase | undefined;
  private previousPaint = '';
  private startedAt = 0;
  private sound: ReturnType<typeof preparePerformanceSound>;

  constructor(private readonly loadImage: SkillImageLoader, private readonly options: { onContinue?: () => void; random?: () => number; reducedMotion?: () => boolean } = {}) {
    const template = document.createElement('template');
    template.innerHTML = markup;
    const dialog = template.content.querySelector('dialog')!;
    this.dialog = dialog;
    document.body.append(dialog);
    const get = <T extends Element>(selector: string) => dialog.querySelector<T>(selector)!;
    this.title = get('#skillTitle'); this.destination = get('#skillDestination'); this.ability = get('#skillAbility');
    this.description = get('#skillDescription'); this.status = get('#skillStatus'); this.result = get('#skillResult');
    this.caption = get('#skillCaption'); this.die = get('#skillDie'); this.dieFace = get('#skillDieFace');
    this.tumblingDie = new SkillD20(get<SVGElement>('.skill-die svg'));
    this.plate = get('.skill-plate');
    this.runningGround.src = floorPlate;
    this.continueButton = get('#skillContinue'); this.ctx = get<HTMLCanvasElement>('canvas').getContext('2d');
    this.propSprites = new SkillPropSprites(loadImage);
    this.die.addEventListener('click', () => this.roll());
    this.continueButton.addEventListener('click', () => {
      if (this.continueButton.disabled) return;
      if (this.options.onContinue) this.options.onContinue();
      else this.reset();
    });
    dialog.addEventListener('cancel', event => event.preventDefault());
  }

  get open() { return this.dialog.open; }
  private get reduceMotion() { return this.options.reducedMotion?.() ?? this.reduced.matches; }

  show(key: string, destination: string, actor: SkillActor | undefined,
    options: { dc?: number; modifiers?: Readonly<Record<string, number>>; scene?: SkillMicroScene; variant?:string } = {}) {
    if (this.active?.key === key) return;
    const scene = withPerceptionVariant(options.scene ?? skillMicroScenes[Math.floor(Math.random() * skillMicroScenes.length)]!,options.variant);
    const guest=perceptionGuest(scene.variant);
    this.sound?.close(); this.sound = undefined;
    this.startedAt = performance.now();
    this.active = { key, playback: new SkillMicroScenePlayback(scene, this.startedAt, options.dc),
      sprite: new SkillSceneSprite(actor, skillSceneRoles(scene), this.loadImage),
      guest:guest?new SkillSceneSprite(guest,['idle_breath','walk_loop','run_loop'],this.loadImage):undefined,
      modifier: options.modifiers?.[scene.id] };
    this.previousFrame = -Infinity; this.previousPhase = undefined; this.previousPaint = '';
    this.dialog.dataset.skill = scene.id;
    this.dialog.dataset.variant=scene.variant??'';
    this.dialog.dataset.terrain = scene.terrain ?? 'floor';
    const plate = scene.terrain === 'chasm' ? chasmPlate : floorPlate;
    if (this.plate.getAttribute('src') !== plate) this.plate.src = plate;
    this.title.textContent = scene.name;
    this.destination.textContent = destination;
    this.ability.textContent = `${skillAbilities[scene.ability]} · CD ${this.active.playback.dc}`;
    this.description.textContent = scene.description;
    this.result.textContent = '';
    this.result.dataset.visible='false';
    this.result.removeAttribute('data-outcome');
    this.caption.textContent = scene.prompt;
    this.dieFace.textContent = '20';
    this.die.disabled = false;
    this.setLoading('Preparando el mapa…');
    if (!this.dialog.open) this.dialog.showModal();
    this.title.focus();
    cancelAnimationFrame(this.animation);
    this.tick(performance.now());
  }

  setLoading(message: string, key = this.active?.key) {
    if (!this.active || this.active.key !== key) return;
    this.continueButton.disabled = true;
    if (this.status.textContent !== message) this.status.textContent = message;
  }

  ready(key: string) {
    if (this.active?.key !== key || !this.continueButton.disabled) return;
    this.continueButton.disabled = false;
    this.status.textContent = 'Mapa listo';
  }

  reset() {
    cancelAnimationFrame(this.animation);
    this.active = undefined;
    this.sound?.close(); this.sound = undefined;
    if (this.dialog.open) this.dialog.close();
  }

  private roll() {
    const active = this.active;
    if (!active?.playback.roll(performance.now(), active.modifier, this.options.random)) return;
    if (active.playback.scene.sound === 'instrument') this.sound = preparePerformanceSound();
    this.die.disabled = true;
    this.result.textContent = 'Lanzando el d20…';
  }

  private tick = (now: number) => {
    if (!this.active) return;
    this.animation = requestAnimationFrame(this.tick);
    if (now - this.previousFrame < 30) return;
    this.previousFrame = now;
    const { playback, sprite } = this.active;
    const frame = playback.frame(now);
    const result = playback.result;
    this.result.dataset.visible=String(Boolean(result&&!winding(frame.phase)&&(frame.rollElapsedMs??0)<4500));
    this.tumblingDie.paint(frame.phase === 'ROLL' && !this.reduceMotion ? frame.progress : undefined);
    if (this.previousPhase !== frame.phase) {
      this.previousPhase = frame.phase;
      this.dialog.dataset.phase = frame.phase;
      if (result && (frame.phase === 'SUCCESS' || frame.phase === 'FAILURE')) this.sound?.play(result.success);
    }
    if (this.sound && frame.phase === 'OUTCOME_LOOP') {
      this.sound.close(); this.sound = undefined;
    }
    if (result && !winding(frame.phase) && !this.result.dataset.outcome) {
      const total = result.modifier === undefined ? `${result.natural}`
        : `${result.natural} ${result.modifier < 0 ? '−' : '+'} ${Math.abs(result.modifier)} = ${result.total}`;
      this.dieFace.textContent = String(result.natural);
      this.result.textContent = `${result.success ? 'Éxito' : 'Fallo'} · ${total} contra CD ${playback.dc}`;
      this.result.dataset.outcome = result.success ? 'success' : 'failure';
      this.caption.textContent = (result.success ? playback.scene.successAnimation : playback.scene.failureAnimation).caption;
    }
    if (winding(frame.phase) && !this.reduceMotion) this.dieFace.textContent = String(1 + Math.floor(frame.elapsedMs / 45 * 7) % 20);
    const paintKey = `${this.reduceMotion}:${frame.phase}:${sprite.revision}:${this.propSprites.revision}:${this.plate.complete}:${this.plate.naturalWidth}`;
    if (this.ctx && (!this.reduceMotion || paintKey !== this.previousPaint)) {
      this.previousPaint = paintKey;
      this.paint(this.ctx, frame, (now - this.startedAt) / 1000);
    }
  };

  private paint(ctx: CanvasRenderingContext2D, frame: Frame, seconds: number) {
    const { playback, sprite } = this.active!;
    const { scene, result } = playback;
    const paintedPlate = this.plate.complete && this.plate.naturalWidth > 0;
    const reduced = this.reduceMotion;
    const outcome = result?.success ? 'success' : 'failure';
    const action = result?.success ? scene.successAnimation : scene.failureAnimation;
    const ambient = frame.phase === 'AMBIENT_LOOP' || frame.phase === 'INIT' || winding(frame.phase);
    const settled = frame.phase === 'REACTION' || frame.phase === 'OUTCOME_LOOP';
    const actionProgress = reduced ? 1 : settled ? 1 : frame.progress;
    const context={skillId:scene.id,phase:frame.phase,progress:actionProgress,success:result?.success,variant:scene.variant};
    let actionRole = action.animation;
    let beatStart = 0, beatEnd = 1;
    for (const [start, animation] of action.beats ?? []) {
      if (start > actionProgress) { beatEnd = start; break; }
      actionRole = animation; beatStart = start;
    }
    const runningLead=scene.id==='athletics'&&(winding(frame.phase)||frame.phase==='ACTION_PREPARE');
    const role: ActorAnimation = runningLead ? 'run_loop' : winding(frame.phase) ? scene.preparationAnimation : ambient ? scene.ambientAnimation : frame.phase === 'ACTION_PREPARE' ? scene.preparationAnimation
      : settled ? action.settledAnimation ?? 'idle_breath' : actionRole;
    const roleProgress = Math.min(1, Math.max(0, (actionProgress - beatStart) / Math.max(.01, beatEnd - beatStart)));
    const motion = { ...motionAt(frame, scene.actor.ambient, action.actor, reduced) };
    if(scene.id==='acrobatics'&&(role==='walk_loop'||role==='hang')) {
      const x=scene.actor.x+(motion.x??0);
      const ropeY=169+6*Math.max(0,1-((x-324)/137)**2);
      motion.y=ropeY-scene.actor.y+(role==='hang'?sprite.height*.94:0);
    }
    if(scene.id==='animal-handling'&&!ambient) {
      motion.x=(motion.x??0)+(85-sprite.height)*.35*Math.min(1,actionProgress/.25);
    }
    const drawLayer = (front: boolean) => {
      for (const prop of scene.props) {
        if (Boolean(prop.front) !== front) continue;
        if((prop.art==='merchant'||prop.art==='patient'||prop.id==='pocket-owner')&&sprite.usesPair(context))continue;
        if (paintedPlate && (prop.art === 'ledge-left' || prop.art === 'ledge-right')) continue;
        const pose = motionAt(frame, prop.ambient, prop[outcome], reduced);
        const fraction = prop.anchor === 'head' ? .8 : sprite.handFraction;
        const x = prop.anchor ? scene.actor.x + prop.x + (motion.x ?? 0) + sprite.height * fraction * (motion.tilt ?? 0) : prop.x;
        const footprint=skillPropFootprints[prop.art];
        const y = prop.anchor ? scene.actor.y + prop.y + (motion.y ?? 0) - sprite.height * fraction : footprint&&!footprint.floating?202:prop.y;
        at(ctx, x, y, pose, () => {
          if(prop.art==='perception-guest'&&this.active?.guest){
            const guestRole=ambient||settled||result?.success&&actionProgress>=.62?'idle_breath':result?.success?'walk_loop':'run_loop';
            this.active.guest.draw(ctx,guestRole,seconds*1000,undefined,reduced,{...context,skillId:'perception-visitor'});return;
          }
          if (!this.propSprites.draw(ctx, prop.art, pose.cue ?? 0, reduced ? 0 : seconds,
            {...context,height:sprite.height})) {
            drawProp(ctx, prop.art, pose.cue ?? 0, reduced ? 0 : seconds);
          }
        });
      }
    };
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (scene.id === 'athletics' && this.runningGround.complete && this.runningGround.naturalWidth) {
      const ground=skillRunningGround(frame,reduced);
      if(ground.opacity>0) {
        const surface=this.groundSurface??=document.createElement('canvas');
        if(surface.width!==1280||surface.height!==266){surface.width=1280;surface.height=266;}
        const layer=surface.getContext('2d')!;layer.clearRect(0,0,1280,266);
        layer.globalCompositeOperation='source-over';
        for(let tile=-1;tile<3;tile++)layer.drawImage(this.runningGround,0,568,1600,332,tile*1280-ground.travel%1280,0,1280,266);
        const mask=layer.createLinearGradient(Math.max(0,ground.edge-ground.feather),0,ground.edge+.01,0);
        mask.addColorStop(0,'#000');mask.addColorStop(1,'#0000');
        layer.globalCompositeOperation='destination-in';layer.fillStyle=mask;layer.fillRect(0,0,1280,266);
        layer.globalCompositeOperation='source-over';
        ctx.save();ctx.globalAlpha=ground.opacity;ctx.drawImage(surface,0,454);ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(640, 471);
    const scale = scene.terrain === 'chasm' ? 2 : 1.86;
    ctx.scale(scale, scale);
    ctx.translate(-320, -202);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (!scene.terrain && !paintedPlate) line(ctx, [[117, 205], [523, 205]], '#7d998345', 1.5);
    const paired=sprite.usesPair(context);
    if(scene.id==='arcana'&&result?.success&&!ambient){
      const crystal=scene.props.find(p=>p.art==='crystal')!;
      const glow=Math.max(0,motionAt(frame,crystal.ambient,crystal.success,reduced).cue??0);
      ctx.save();ctx.translate(crystal.x,202);ctx.scale(1,.17);
      const light=ctx.createRadialGradient(0,0,0,0,0,90);light.addColorStop(0,`rgba(255,218,140,${glow*.4})`);light.addColorStop(1,'#ffe0a000');
      ctx.fillStyle=light;ctx.fillRect(-90,-90,180,180);ctx.restore();
    }
    for(const prop of scene.props){
      if(paired&&(prop.art==='merchant'||prop.art==='patient'||prop.id==='pocket-owner'))continue;
      const pose=motionAt(frame,prop.ambient,prop[outcome],reduced);
      drawSkillPropShadow(ctx,prop.art,prop.x,prop.y,pose);
    }
    const actorX=scene.actor.x+(motion.x??0);
    if((!scene.terrain||actorX<196||actorX>453)&&(motion.opacity??1)>0){
      drawSkillGroundShadow(ctx,actorX,202,sprite.height*.36,4,Math.max(0,-(motion.y??0)),motion.opacity??1);
      const partnerOffset=paired?sprite.pairShadowOffset(context):undefined;
      if(partnerOffset!==undefined)drawSkillGroundShadow(ctx,actorX+partnerOffset,202,36,5,0,motion.opacity??1);
    }
    drawLayer(false);
    at(ctx, scene.actor.x, scene.actor.y, motion, () => sprite.draw(ctx, role, seconds * 1000,
      role === 'jump' || role === 'slip' ? roleProgress : undefined, reduced,
      context));
    drawLayer(true);
    ctx.restore();
  }
}
