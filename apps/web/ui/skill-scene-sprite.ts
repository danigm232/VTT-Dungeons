import { Assets, type Texture } from 'pixi.js';
import type { PublicCampaignDefinition } from '../../../engine/shared/campaign';
import type { WorldSnapshot } from '../../../engine/shared/protocol';
import { isolateAtlasRGBA } from '../../../engine/client/atlas-isolation';
import { correctDirectionalClip, directionalRestAnimation, mergeDirectionalArt } from '../../../engine/client/directional-rest';
import type { ActorAnimation } from '../../../engine/client/skill-micro-scene';
import { clearBlackSpriteMatte } from '../../../engine/client/sprite-matte';
import { tokenAnimationFrame } from '../../../engine/client/token-animation-playback';
import { drawFallbackActor } from './skill-scene-art';

type Animations = PublicCampaignDefinition['tokenAnimations'][string];
type Frame = Animations[string]['frames'][number];
type Actor = { asset: PublicCampaignDefinition['tokens'][string]; animations: Animations };

export function selectSkillActor(campaign: PublicCampaignDefinition, current: WorldSnapshot, previous: WorldSnapshot, characterId: string): Actor | undefined {
  const roster = campaign.roster.find(character => character.id === characterId);
  const tokenId = current.entities.find(entity => entity.id === characterId)?.tokenId
    ?? previous.entities.find(entity => entity.id === characterId)?.tokenId ?? roster?.tokenId
    ?? current.entities.find(entity => entity.kind === 'player')?.tokenId;
  if (!tokenId) return undefined;
  const source = current.tokenAssets.tokens[tokenId] ? current : previous;
  const incoming = source.tokenAssets.tokens[tokenId], local = campaign.tokens[tokenId];
  const asset = incoming ?? local;
  if (!asset) return undefined;
  const supplied = source.tokenAssets.tokenAnimations[tokenId] ?? {};
  const animations = !incoming ? campaign.tokenAnimations[tokenId] ?? supplied
    : incoming.url === local?.url ? mergeDirectionalArt(campaign.tokenAnimations[tokenId] ?? {}, supplied) : supplied;
  return { asset, animations };
}

const spriteRoles: Record<ActorAnimation, readonly string[]> = {
  idle_balance: ['balance'], run_loop: ['running', 'moving'], idle_inspect: ['inspect'],
  idle_talk: ['talk', 'influence'], idle_read: ['read'], idle_play: ['perform'],
  idle_brace: ['intimidate'], idle_crouch: ['crouch', 'kneel', 'stealth'], idle_listen: ['listen'],
  sneak_loop: ['sneak', 'sneaking', 'stealth', 'moving'], idle_reach: ['idle-reach'], hand_interact: ['interact', 'search'],
  idle_prepare: ['prepare'], point: ['point', 'help', 'interact'], jump: ['jump', 'jumping'], slip: ['slip'],
  walk_loop: ['moving'], reach: ['reach', 'interact', 'help'], idle_breath: [], idle_listen_away: ['listen'], hang: ['hang', 'climb'], climb: ['climb']
};

type SpriteFrame = { image: HTMLCanvasElement; width: number; height: number; pivot: number };

export class SkillSceneSprite {
  private readonly images = new Map<string, CanvasImageSource | null>();
  private readonly frames = new Map<Frame, SpriteFrame | null>();
  private readonly clips = new Map<ActorAnimation, { clip?: Animations[string]; mirror: boolean; authored: boolean }>();
  revision = 0;

  get height() { return 108 * ((this.actor?.asset.worldHeightMeters ?? 1.65) / 1.65); }

  constructor(private readonly actor: Actor | undefined, roles: ActorAnimation[]) {
    if (!actor) return;
    this.load(actor.asset.url);
    for (const role of roles) {
      const facing = role === 'idle_listen_away' ? ['w', 'sw', 'e', 'se', 's'] : ['e', 'se', 'ne', 'w', 'sw', 's'];
      const resolve = (options: readonly string[]) => options.flatMap(state => [...facing.map(dir => `${state}-${dir}`), state])
        .find(state => actor.animations[state]?.frames.length);
      const specific = resolve(spriteRoles[role]);
      const state = specific ?? resolve(['idle-standing', 'idle', 'combat-idle']);
      const clip = state ? correctDirectionalClip(state, actor.animations[state]!, actor.animations)
        : directionalRestAnimation(actor.animations, `idle-${facing[0]}`) ?? undefined;
      const wrongSide = role === 'idle_listen_away' ? /-(e|se|ne)$/ : /-(w|sw)$/;
      this.clips.set(role, { clip, mirror: Boolean(clip?.flipX) !== Boolean(state && wrongSide.test(state)), authored: Boolean(specific) });
      for (const frame of clip?.frames ?? []) this.load(typeof frame === 'string' ? frame : frame.url);
    }
  }

  private load(url: string) {
    if (this.images.has(url)) return;
    this.images.set(url, null);
    void Assets.load<Texture>(url).then(texture => {
      this.images.set(url, texture.source.resource as CanvasImageSource);
      this.revision++;
    }).catch(() => { /* The actor can use another pose or its base art. */ });
  }

  private frame(source: Frame): SpriteFrame | null {
    if (this.frames.has(source)) return this.frames.get(source) ?? null;
    const asset = this.actor!.asset;
    const crop = typeof source === 'string' ? null : source;
    const image = this.images.get(typeof source === 'string' ? source : source.url);
    if (!image) return null;
    const texture = Assets.get<Texture>(typeof source === 'string' ? source : source.url);
    const width = crop?.width ?? texture?.source.pixelWidth ?? 0;
    const height = crop?.height ?? texture?.source.pixelHeight ?? 0;
    if (!width || !height) return null;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, crop?.x ?? 0, crop?.y ?? 0, width, height, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height);
    if (crop?.alphaSeeds) {
      pixels.data.set(isolateAtlasRGBA(pixels.data, width, height, crop.alphaSeeds)); ctx.putImageData(pixels, 0, 0);
    } else if (clearBlackSpriteMatte(pixels.data, width, height)) ctx.putImageData(pixels, 0, 0);
    let top = height, floor = 0, left = width, right = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels.data[(y * width + x) * 4 + 3]! < 48) continue;
        top = Math.min(top, y); floor = y + 1; left = Math.min(left, x); right = Math.max(right, x + 1);
      }
    }
    if (floor <= top) { this.frames.set(source, null); return null; }
    const paintedWidth = right - left, paintedHeight = floor - top;
    const factor = Math.min(1, 256 / paintedHeight);
    const tile = document.createElement('canvas');
    tile.width = Math.max(1, Math.round(paintedWidth * factor)); tile.height = Math.max(1, Math.round(paintedHeight * factor));
    tile.getContext('2d')!.drawImage(canvas, left, top, paintedWidth, paintedHeight, 0, 0, tile.width, tile.height);
    const trimmed = { image: tile, width: paintedWidth, height: paintedHeight, pivot: width * (crop?.anchorX ?? asset.anchorX) - left };
    this.frames.set(source, trimmed);
    return trimmed;
  }

  draw(ctx: CanvasRenderingContext2D, role: ActorAnimation, elapsed: number, progress: number | undefined, reduced: boolean) {
    if (!this.actor) { drawFallbackActor(ctx); return; }
    const selection = this.clips.get(role), clip = selection?.clip;
    const idle = this.clips.get('idle_breath')?.clip?.frames[0] ?? this.actor.asset.url;
    const frame = clip?.frames[tokenAnimationFrame(clip.frames.length, clip.fps, reduced || role === 'idle_crouch' || role === 'hang' ? 0 : elapsed,
      progress === undefined && (clip.loop ?? true), reduced ? undefined : progress)];
    const painted = frame === undefined ? null : this.frame(frame);
    const fallback = painted ?? this.frame(idle) ?? this.frame(this.actor.asset.url);
    if (!fallback) { drawFallbackActor(ctx); return; }
    const reference = this.frame(clip?.frames[0] ?? idle) ?? fallback;
    const scale = this.height / reference.height;
    const sway = reduced ? 0 : Math.sin(elapsed * .004);
    if (painted && selection?.mirror) ctx.scale(-1, 1);
    if (!selection?.authored) {
      const bend = role === 'idle_crouch' ? .15 : role === 'sneak_loop' ? .11 : 0;
      const attentive = ['idle_inspect', 'idle_read', 'idle_reach', 'hand_interact', 'reach', 'point'].includes(role);
      ctx.rotate((attentive ? .075 : bend) + sway * (attentive ? .035 : .02));
      ctx.scale(1, 1 - bend * .6 + sway * .012);
      ctx.translate(0, (role === 'run_loop' ? -5 : role === 'walk_loop' ? -2.5 : 0) * Math.abs(sway));
    }
    ctx.drawImage(fallback.image, -fallback.pivot * scale, -fallback.height * scale,
      fallback.width * scale, fallback.height * scale);
  }
}
