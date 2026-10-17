import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { CombatCondition } from '../shared/protocol';
import { conditionPresentation, displayConditions } from '../shared/conditions';
import type { BillboardFrame } from './world-billboards';

const SIZE = 256, FRAMES = 4;
type EffectArt = { canvas: HTMLCanvasElement; textures: Texture[]; source: Texture };

export function conditionEffectBounds(width: number, height: number, anchorX: number, anchorY: number, ground: { anchorY: number; heightFraction: number }) {
  return { x: (.5 - anchorX) * width, y: (ground.anchorY - ground.heightFraction - anchorY) * height, width, height: height * ground.heightFraction };
}

/** Transparent, quiet brush strokes rather than the old full-character wreaths. */
export function paintConditionEffect(context: CanvasRenderingContext2D, condition: CombatCondition, phase: number) {
  const c = context;
  c.save(); c.scale(SIZE, SIZE); c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = c.fillStyle = conditionPresentation[condition].color;
  const line = (points: number[], alpha = .32, width = .008) => {
    c.globalAlpha = alpha; c.lineWidth = width; c.beginPath(); c.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2) c.lineTo(points[i]!, points[i + 1]!);
    c.stroke();
  };
  const arc = (x: number, y: number, rx: number, ry: number, start: number, end: number, alpha = .32) => {
    c.globalAlpha = alpha; c.lineWidth = .008; c.beginPath(); c.ellipse(x, y, rx, ry, 0, start, end); c.stroke();
  };
  const mote = (x: number, y: number, radius: number, alpha: number) => {
    c.globalAlpha = alpha; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
  };
  const drift = phase / FRAMES;
  switch (condition) {
    case 'envenenada':
      for (const side of [-1, 1]) {
        c.globalAlpha = .19; c.lineWidth = .026; c.beginPath();
        c.moveTo(.5 + side * .2, .83); c.bezierCurveTo(.5 + side * .38, .6, .5 + side * .12, .5, .5 + side * .28, .28 + drift * .04); c.stroke();
        for (let i = 0; i < 3; i++) mote(.5 + side * (.21 + Math.sin(i * 2 + phase) * .035), .73 - ((i / 3 + drift * .2) % .6), .006 + i * .002, .32);
      }
      break;
    case 'restringida': case 'apresada':
      for (const y of [.42, .65, .82]) { arc(.5, y, .23, .035, 0, Math.PI * 1.85, .48); line([.3, y + .03, .69, y - .02], .3, .012); }
      line([.28, .46, .23, .74, .3, .95], .27); line([.72, .46, .77, .74, .7, .95], .27);
      break;
    case 'agarrada':
      arc(.27, .52, .065, .028, 0, Math.PI * 1.8, .48); arc(.73, .52, .065, .028, 0, Math.PI * 1.8, .48);
      line([.2, .53, .12, .58], .28); line([.8, .53, .88, .58], .28);
      break;
    case 'paralizada':
      line([.32, .22, .29, .42, .33, .45, .27, .69, .32, .85], .33);
      line([.7, .24, .72, .43, .67, .49, .74, .68, .69, .86], .33);
      for (let i = 0; i < 3; i++) mote(i % 2 ? .29 : .72, .35 + i * .17, .008, .3 + drift * .08);
      break;
    case 'asustada':
      line([.2, .29, .16 - drift * .015, .34, .2, .39], .32);
      line([.8, .29, .84 + drift * .015, .34, .8, .39], .32);
      break;
    case 'hechizada':
      arc(.5, .4, .17, .09, drift * .5, Math.PI * 1.45 + drift * .5, .23);
      for (let i = 0; i < 4; i++) mote(.5 + Math.sin(i * 2 + drift) * .19, .28 + i * .07 - drift * .025, .007, .33);
      break;
    case 'inconsciente':
      arc(.53, .33, .13, .035, Math.PI, Math.PI * 1.8, .18 + drift * .05);
      mote(.69, .23 - drift * .025, .009, .18);
      break;
    case 'derribada':
      for (let i = 0; i < 6; i++) mote(.17 + i * .13, .94 - Math.sin(i * 2 + drift) * .018, .007, .2);
      break;
    case 'invisible':
      for (const side of [-1, 1]) { c.globalAlpha = .21; c.lineWidth = .008; c.beginPath(); c.moveTo(.5 + side * .16, .14); c.bezierCurveTo(.5 + side * .29, .33, .5 + side * .14, .65, .5 + side * .2, .9); c.stroke(); }
      arc(.5, .48 + drift * .1, .2, .025, Math.PI, Math.PI * 1.8, .19);
      break;
    case 'oculta':
      arc(.5, .86, .3, .04, 0, Math.PI * .8, .17);
      arc(.5, .65 + drift * .1, .25, .035, Math.PI, Math.PI * 1.8, .16);
      break;
  }
  c.restore();
}

/** One small atlas per state, shared by every character and both renderers. */
export class ConditionEffectLibrary {
  private art = new Map<CombatCondition, EffectArt>();
  get(condition: CombatCondition) {
    const canonical = condition === 'apresada' ? 'restringida' : condition;
    let art = this.art.get(canonical);
    if (!art) {
      const canvas = document.createElement('canvas'); canvas.width = SIZE * FRAMES; canvas.height = SIZE;
      const context = canvas.getContext('2d')!;
      for (let frame = 0; frame < FRAMES; frame++) { context.save(); context.translate(frame * SIZE, 0); paintConditionEffect(context, canonical, frame); context.restore(); }
      const source = Texture.from(canvas), textures = Array.from({ length: FRAMES }, (_, frame) => new Texture({ source: source.source, frame: new Rectangle(frame * SIZE, 0, SIZE, SIZE) }));
      art = { canvas, textures, source }; this.art.set(canonical, art);
    }
    return art;
  }
  dispose() { for (const art of this.art.values()) { for (const texture of art.textures) texture.destroy(); art.source.destroy(true); } this.art.clear(); }
}

export class ConditionEffectView extends Container {
  private layers = new Map<CombatCondition, { sprite: Sprite; art: EffectArt; frame: number }>();
  constructor(private library: ConditionEffectLibrary) { super(); this.eventMode = 'none'; }
  update(conditions: readonly CombatCondition[], width: number, height: number, anchorX: number, anchorY: number, ground: { anchorY: number; heightFraction: number }, now: number, reducedMotion = false) {
    const active: CombatCondition[] = displayConditions(conditions).map(condition => condition === 'apresada' ? 'restringida' : condition);
    for (const [condition, layer] of this.layers) if (!active.includes(condition)) { layer.sprite.destroy(); this.layers.delete(condition); }
    const bounds = conditionEffectBounds(width, height, anchorX, anchorY, ground);
    const frame = reducedMotion ? 0 : Math.floor(now / 900) % FRAMES;
    for (const condition of active) {
      let layer = this.layers.get(condition);
      if (!layer) { const art = this.library.get(condition), sprite = new Sprite(art.textures[frame]!); layer = { sprite, art, frame }; this.layers.set(condition, layer); this.addChild(sprite); }
      layer.frame = frame; layer.sprite.texture = layer.art.textures[frame]!; layer.sprite.anchor.set(.5, 0);
      layer.sprite.position.set(bounds.x, bounds.y); layer.sprite.width = bounds.width; layer.sprite.height = bounds.height;
      layer.sprite.alpha = (reducedMotion ? .88 : .82 + Math.sin(now * .0015) * .06) / Math.sqrt(active.length);
    }
    this.visible = active.length > 0;
  }
  nativeFrames(body: BillboardFrame | null, ground: { anchorY: number; heightFraction: number }): BillboardFrame[] {
    if (!body) return [];
    return [...this.layers].map(([condition, layer]) => ({ ...body,
      url: `condition-art:${condition}`, sourceCanvas: layer.art.canvas, sourceWidth: SIZE * FRAMES, sourceHeight: SIZE,
      x: layer.frame * SIZE, y: 0, width: SIZE, height: SIZE,
      worldWidth: body.worldWidth, worldHeight: body.worldHeight * ground.heightFraction,
      anchorX: .5, anchorY: 1, offsetX: body.offsetX + (.5 - body.anchorX) * body.worldWidth,
      flipX: false, alpha: body.alpha * layer.sprite.alpha, tint: 0xffffff, interactionPose: undefined
    }));
  }
}
