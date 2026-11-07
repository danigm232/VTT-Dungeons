import { isolateAtlasRGBA } from '../../../engine/client/atlas-isolation';
import type { SkillImageLoader } from './skill-scene-sprite';

type Bounds = readonly [number, number, number, number];
const propBounds: readonly Bounds[] = [
  [76, 17, 234, 343], [403, 94, 300, 238], [754, 126, 311, 175], [1115, 46, 306, 302],
  [35, 429, 313, 233], [405, 486, 298, 119], [854, 407, 95, 254], [1144, 487, 240, 124],
  [32, 779, 316, 248], [446, 756, 215, 269], [743, 747, 325, 285], [1159, 789, 207, 213]
];
const horseBounds: readonly Bounds[] = [
  [17, 17, 462, 453], [515, 54, 507, 416], [1032, 96, 492, 374],
  [12, 618, 500, 366], [466, 578, 561, 409], [1035, 586, 496, 398]
];
const peopleBounds: readonly Bounds[] = [
  [98, 6, 136, 263], [354, 7, 152, 262], [566, 6, 209, 263], [853, 7, 202, 262],
  [100, 288, 129, 260], [331, 291, 180, 257], [581, 288, 203, 259], [906, 289, 123, 259],
  [85, 567, 148, 258], [328, 566, 193, 258], [586, 571, 222, 250], [897, 565, 129, 260],
  [105, 845, 125, 267], [367, 844, 132, 268], [625, 841, 138, 271], [893, 842, 147, 270],
  [40, 1130, 204, 267], [312, 1134, 206, 262], [571, 1129, 222, 267], [848, 1132, 212, 265]
];
const peopleRows: Readonly<Record<string, number>> = { guard: 0, 'sleepy-guard': 0, merchant: 1, bandit: 2, traveler: 3, patient: 4 };

/** Animated pieces share the vignette clock. The source image is decoded once. */
export class SkillPropSprites {
  private objects: HTMLCanvasElement[] = [];
  private horses: HTMLCanvasElement[] = [];
  private people: HTMLCanvasElement[] = [];
  revision = 0;

  constructor(load: SkillImageLoader) {
    const prepare = async (url: string, bounds: readonly Bounds[], group: 'objects' | 'horses' | 'people') => {
      const { image } = await load(url);
      const frames = bounds.map(([x, y, width, height], index) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
        if (group === 'horses' && index === 4) {
          const pixels = ctx.getImageData(0, 0, width, height);
          pixels.data.set(isolateAtlasRGBA(pixels.data, width, height, [[270, 170]]));
          ctx.putImageData(pixels, 0, 0);
        }
        return canvas;
      });
      this[group] = frames;
      this.revision++;
    };
    void prepare(new URL('./art/skill-props-v2.webp', import.meta.url).href, propBounds, 'objects').catch(() => {});
    void prepare(new URL('./art/skill-horse-v2.webp', import.meta.url).href, horseBounds, 'horses').catch(() => {});
    void prepare(new URL('./art/skill-people-v2.webp', import.meta.url).href, peopleBounds, 'people').catch(() => {});
  }

  private object(ctx: CanvasRenderingContext2D, index: number, width: number, x = 0, y = 0, anchorY = 1) {
    const frame = this.objects[index]!;
    const height = width * frame.height / frame.width;
    ctx.drawImage(frame, x - width / 2, y - height * anchorY, width, height);
  }

  draw(ctx: CanvasRenderingContext2D, art: string, cue: number, time: number): boolean {
    const personRow = peopleRows[art];
    if (personRow !== undefined) {
      if (!this.people.length) return false;
      let index = Math.floor(time * 2.8) % 2;
      if (cue < -.65) index = 3;
      if (cue > (art === 'patient' ? .84 : art === 'traveler' ? .05 : .4)) index = 2;
      if (art === 'sleepy-guard') index = cue < 0 ? 0 : 3;
      const frame = this.people[personRow * 4 + index]!;
      const sourceX = peopleBounds[personRow * 4 + index]![0];
      const pivot = index * 280 + 160 - sourceX;
      const scale = (art === 'patient' ? 83 : 108) / 260;
      if (art === 'bandit' && index === 2) ctx.scale(-1, 1);
      ctx.scale(1, 1 + Math.sin(time * 2.4) * .006);
      ctx.drawImage(frame, -pivot * scale, -frame.height * scale, frame.width * scale, frame.height * scale);
      return true;
    }
    if (art === 'horse') {
      if (!this.horses.length) return false;
      const cycle = Math.floor(time * 3.4) % 2;
      const calm = cue > .35;
      const index = calm ? (cue > .65 ? 2 + cycle : 4 + cycle) : cycle;
      const horse = this.horses[index]!;
      const height = 126 * horse.height / 453;
      const width = 126 * horse.width / 453;
      const pivot = ((index % 3) * 512 + 280 - horseBounds[index]![0]) * 126 / 453;
      ctx.drawImage(horse, -pivot, -height, width, height);
      return true;
    }
    if (!this.objects.length) return false;
    switch (art) {
      case 'heraldry':
        this.object(ctx, 0, 71, 0, 48);
        return true;
      case 'scroll':
        ctx.rotate(Math.sin(time * 2.2) * .045); this.object(ctx, 1, 49, 0, 0, .5);
        return true;
      case 'book': {
        this.object(ctx, 2, 55, 0, 0, .5);
        const page = (Math.sin(time * 3) + 1) * .5;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(20 * page, -20, 22 * page, -5);
        ctx.lineTo(0, 10); ctx.closePath(); ctx.fillStyle = '#e2c793'; ctx.fill();
        return true;
      }
      case 'lute':
        ctx.rotate(Math.sin(time * 6) * .045); this.object(ctx, 3, 50, 3, 0, .5);
        ctx.strokeStyle = '#ecd4a2b0'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(7 + Math.sin(time * 18) * 2, -7); ctx.stroke();
        return true;
      case 'mechanism': {
        this.object(ctx, 4, 85);
        ctx.save(); ctx.translate(-9, -24); ctx.rotate(time * .75 + cue);
        ctx.strokeStyle = '#bd8e49'; ctx.lineWidth = 2.6;
        for (let tooth = 0; tooth < 10; tooth++) {
          ctx.rotate(Math.PI / 5);
          ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -11); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fillStyle = '#bf9755'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 3.3, 0, Math.PI * 2); ctx.fillStyle = '#503e2a'; ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(-40, -54); ctx.rotate(-Math.max(0, cue) * .98);
        this.object(ctx, 5, 83, 42, 0, .5); ctx.restore();
        for (let i = 0; i < 2; i++) {
          ctx.save(); ctx.translate(-12 + i * 27, -56);
          ctx.rotate((i === 0 ? Math.max(0, cue) : Math.max(0, -cue)) * .62);
          this.object(ctx, 6, 8.5); ctx.restore();
        }
        return true;
      }
      case 'spring': this.object(ctx, 7, 39, 0, 0, .5); return true;
      case 'plant-broad':
      case 'plant-narrow':
        ctx.rotate(Math.sin(time * 2.4) * .045);
        this.object(ctx, art === 'plant-broad' ? 8 : 9, art === 'plant-broad' ? 47 : 38);
        return true;
      case 'altar': this.object(ctx, 10, 90); return true;
      case 'coin':
        ctx.scale(.14 + Math.abs(Math.cos(time * 6.5)) * .86, 1);
        this.object(ctx, 11, 14, 0, 0, .5); return true;
      default: return false;
    }
  }
}
