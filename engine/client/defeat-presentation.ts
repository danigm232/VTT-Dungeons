import type { PublicEntity } from '../shared/protocol';

export const bloodPoolTexture = 'actor:blood-pool';
export const unconsciousGroundTexture = 'actor:unconscious-ground';
export function defeatGroundStyle(entity: Pick<PublicEntity, 'defeated' | 'defeatStyle' | 'conditions'>) {
  return entity.defeatStyle ?? (entity.defeated ? 'blood' : entity.conditions?.includes('inconsciente') ? 'unconscious' : undefined);
}

/** Procedural shared ground art: two small textures, no per-frame rasterization. */
export function paintDefeatGround(context: CanvasRenderingContext2D, style: 'blood' | 'unconscious', size = 128) {
  context.clearRect(0, 0, size, size);
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    context.fillStyle = color; context.beginPath(); context.ellipse(x * size, y * size, rx * size, ry * size, .18, 0, Math.PI * 2); context.fill();
  };
  if (style === 'blood') {
    ellipse(.5, .5, .32, .23, '#541b27'); ellipse(.3, .47, .18, .13, '#651c2c');
    ellipse(.68, .55, .2, .17, '#701e31'); ellipse(.51, .38, .2, .12, '#812336');
    for (const [x, y, r] of [[.17, .62, .035], [.78, .3, .025], [.73, .75, .045], [.32, .23, .03]]) ellipse(x!, y!, r!, r! * .8, '#701e31');
  } else {
    ellipse(.5, .5, .38, .29, '#243d59');
    context.strokeStyle = '#93b8da'; context.lineWidth = size * .025; context.beginPath(); context.ellipse(size * .5, size * .5, size * .38, size * .29, 0, .1, Math.PI * 1.7); context.stroke();
    context.fillStyle = '#f5d691'; context.font = `bold ${size * .2}px sans-serif`; context.fillText('z', size * .7, size * .25); context.fillText('Z', size * .78, size * .12);
  }
}
