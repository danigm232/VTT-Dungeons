import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { previewFrame } from '../../engine/client/d8-animation-audit';
import type { VisualAction } from '../../engine/client/d8-animation-audit';

type PreviewView = { root: Container; sprite: Sprite };
export type VisualPreviewOptions = { entityId: string; targetId?: string; state: string; targetState?: string; action: VisualAction; frames: number; fps: number; targetFrames?: number; targetFps?: number; rate: number; loop: boolean; hit: boolean; focusCamera?: boolean; soundUrl?: string; mirrorPosition?: { x: number; y: number } };
/** A local, disposable clock. No socket, resource, condition or position writes. */
export class D8VisualPreview {
  private layer = new Container();
  private graphics = new Graphics();
  private copy: Sprite | null = null;
  private audio: HTMLAudioElement | null = null;
  private lastNow = performance.now();
  private elapsed = 0;
  private previousLap = -1;
  paused = false;
  readonly duration: number;
  constructor(readonly options: VisualPreviewOptions, parent: Container, private view: (id: string) => PreviewView | undefined) {
    this.duration = Math.max(1_600, options.frames * 1000 / Math.max(1, options.fps), (options.action.count ?? 1) * 260 + 900);
    parent.addChild(this.layer); this.layer.addChild(this.graphics);
    if (options.action.effect === 'mirror') { this.copy = new Sprite(Texture.EMPTY); this.copy.anchor.set(.5, .9); this.layer.addChild(this.copy); }
    if (options.soundUrl) { this.audio = new Audio(options.soundUrl); this.audio.volume = .45; this.audio.loop = /^(moving|direction|running)(-|$)/.test(options.state); this.audio.playbackRate = Math.max(.25, Math.min(2, options.rate * (options.state.startsWith('running') ? 1.35 : 1))); }
  }
  setPaused(paused: boolean) { this.paused = paused; this.lastNow = performance.now(); if (paused) this.audio?.pause(); else if (this.audio && this.elapsed < this.duration) void this.audio.play().catch(() => {}); }
  seek(frame: number) { this.elapsed = Math.max(0, Math.min(this.duration, frame * 1000 / Math.max(1, this.options.fps))); this.paused = true; this.audio?.pause(); this.lastNow = performance.now(); }
  frameFor(id: string) {
    if (id === this.options.entityId) return { state: this.options.state, index: previewFrame(this.elapsed, this.options.fps, this.options.frames, this.options.loop) };
    if (id === this.options.targetId && id !== this.options.entityId && this.options.hit && this.options.action.attackType && this.options.targetState && this.elapsed >= 800) return { state: this.options.targetState, index: previewFrame(this.elapsed - 800, this.options.targetFps ?? 8, this.options.targetFrames ?? 1, false) };
    return null;
  }
  get status() { return { paused: this.paused, frame: previewFrame(this.elapsed, this.options.fps, this.options.frames, this.options.loop), frames: this.options.frames, elapsed: this.elapsed, finished: !this.options.loop && this.elapsed >= this.duration }; }
  update(now: number) {
    if (!this.paused) this.elapsed += Math.max(0, Math.min(100, now - this.lastNow)) * this.options.rate;
    this.lastNow = now;
    const restart = this.previousLap < 0 || this.options.loop && this.elapsed >= this.duration;
    if (this.options.loop && this.elapsed >= this.duration) this.elapsed %= this.duration;
    if (!this.options.loop) this.elapsed = Math.min(this.duration, this.elapsed);
    if (this.status.finished) this.audio?.pause();
    if (restart) { this.previousLap++; if (this.audio && !this.paused && !this.status.finished) { this.audio.currentTime = 0; void this.audio.play().catch(() => {}); } }
    const source = this.view(this.options.entityId), target = this.options.targetId ? this.view(this.options.targetId) : undefined;
    if (!source) return;
    const a = source.root, b = target?.root ?? a, scale = Math.max(.12, a.scale.y), h = source.sprite.height * scale, y = a.y - h * .45;
    const endY = b.y - (target ? target.sprite.height * b.scale.y : h) * .45;
    const progress = this.elapsed / this.duration, color = this.options.action.attackType === 'fireProjectile' ? '#ff8a32' : this.options.action.attackType === 'vine' ? '#77bb66' : this.options.action.attackType === 'radiantArrow' ? '#ffe99c' : '#c2a4ff';
    const g = this.graphics; g.clear(); this.layer.zIndex = Math.max(a.y, b.y) + 5;
    const radius = Math.max(3, h * .1);
    if (this.options.action.attackType && !this.options.action.effect) {
      for (let index = 0; index < (this.options.action.count ?? 1); index++) {
        const t = (this.elapsed - 180 - index * 200) / 600;
        if (t < 0 || t > 1.3) continue;
        const dx = b.x - a.x, dy = endY - y, length = Math.hypot(dx, dy) || 1;
        const miss = this.options.hit ? 0 : radius * 3;
        const x = a.x + dx * Math.min(1, t) - dy / length * miss * Math.min(1, t), cy = y + dy * Math.min(1, t) + dx / length * miss * Math.min(1, t);
        if (this.options.action.attackType === 'melee') {
          const slashX = b.x - dy / length * miss, slashY = endY + dx / length * miss;
          if (this.options.action.state === 'attack-unarmed') g.circle(slashX, slashY, radius * 1.5).stroke({ color: '#f7e4b0', width: radius * .35, alpha: Math.max(0, 1 - Math.abs(t - .6)) });
          else g.moveTo(slashX - radius * 2, slashY - radius).quadraticCurveTo(slashX, slashY - radius * 3, slashX + radius * 2, slashY + radius).stroke({ color: '#f7e4b0', width: radius * .4, alpha: Math.max(0, 1 - Math.abs(t - .6)) });
        } else if (t <= 1) {
          if (['arrow', 'radiantArrow', 'thrownWeapon'].includes(this.options.action.attackType)) {
            const twist = this.options.action.attackType === 'thrownWeapon' ? t * Math.PI * 6 : Math.atan2(dy, dx);
            g.moveTo(x - Math.cos(twist) * radius, cy - Math.sin(twist) * radius).lineTo(x + Math.cos(twist) * radius, cy + Math.sin(twist) * radius).stroke({ color: '#efddbb', width: radius * .3 });
          } else g.circle(x, cy, radius * .65).fill({ color, alpha: .95 }).circle(x, cy, radius * 1.1).fill({ color, alpha: .25 });
        }
        if (t > 1 && this.options.hit) g.circle(b.x, endY, radius * (1 + (t - 1) * 4)).stroke({ color, width: radius * .3, alpha: Math.max(0, 1 - (t - 1) / .3) });
      }
    }
    const pulse = Math.sin(Math.PI * progress);
    if (this.options.action.effect === 'fog') {
      for (let i = 0; i < 7; i++) g.ellipse(b.x + Math.sin(i * 2) * h * .5, b.y - h * .1 + Math.cos(i) * h * .1, h * .5, h * .24).fill({ color: '#cfdae0', alpha: .11 * pulse });
    } else if (this.options.action.effect === 'feather') {
      for (let i = 0; i < 6; i++) { const x = b.x + Math.sin(progress * 5 + i) * h * .45, cy = b.y - h + ((progress + i / 6) % 1) * h; g.ellipse(x, cy, radius * .45, radius).fill({ color: '#eff8ff', alpha: pulse }); }
    } else if (this.options.action.effect === 'spark') {
      for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4 + progress * 3; g.circle(a.x + Math.cos(angle) * h * .38, y + Math.sin(angle) * h * .38, radius * .35).fill({ color, alpha: pulse }); }
    } else if (this.copy) {
      const point = this.options.mirrorPosition ?? { x: b.x, y: b.y }; this.copy.texture = source.sprite.texture; this.copy.width = source.sprite.width * scale; this.copy.height = h; this.copy.scale.x = -Math.abs(this.copy.scale.x); this.copy.position.set(point.x, point.y); this.copy.alpha = Math.max(0, Math.min(.9, (progress - .25) * 2)); this.copy.tint = '#b9eeff';
      g.ellipse(point.x, point.y - h * .4, h * .38, h * .6).stroke({ color: '#c9f5ff', width: radius * .25, alpha: pulse });
    }
  }
  destroy() { this.audio?.pause(); if (this.audio) this.audio.src = ''; this.layer.destroy({ children: true }); }
}
