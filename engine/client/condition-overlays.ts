import { Graphics } from 'pixi.js';
import type { CombatCondition } from '../shared/protocol';
import { conditionPresentation, displayConditions } from '../shared/conditions';

/** A single HUD row, independent of artwork PNGs and reusable in every campaign. */
export function conditionBadgeLayout(conditions: readonly CombatCondition[]) {
  const ordered = displayConditions(conditions);
  return { visible: ordered.slice(0, ordered.length > 4 ? 3 : 4), extra: ordered.length > 4 ? ordered.length - 3 : 0 };
}
const digits = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
export function drawConditionBadges(graphics: Graphics, conditions: readonly CombatCondition[], radius: number, top: number) {
  graphics.clear();
  const { visible, extra } = conditionBadgeLayout(conditions), count = visible.length + (extra ? 1 : 0), gap = radius * 2.45;
  for (let index = 0; index < count; index++) {
    const condition = visible[index], x = (index - (count - 1) / 2) * gap, y = top - radius, color = condition ? conditionPresentation[condition].color : '#ddd0ad';
    graphics.circle(x, y, radius).fill({ color: '#101c23', alpha: .96 }).stroke({ color, width: radius * .12, alpha: .95 });
    const line = (points: number[]) => { graphics.moveTo(x + points[0]! * radius, y + points[1]! * radius); for (let p = 2; p < points.length; p += 2) graphics.lineTo(x + points[p]! * radius, y + points[p + 1]! * radius); graphics.stroke({ color, width: radius * .16, cap: 'round', join: 'round' }); };
    const circle = (dx: number, dy: number, r: number) => graphics.circle(x + dx * radius, y + dy * radius, r * radius).stroke({ color, width: radius * .12 });
    switch (condition) {
      case 'envenenada': circle(0, -.1, .38); line([-.25, .28, .25, .28, .25, .48, -.25, .48, -.25, .28]); circle(-.14, -.12, .07); circle(.14, -.12, .07); break;
      case 'restringida': case 'apresada': line([-.45, -.45, .45, -.45, .45, .45, -.45, .45, -.45, -.45]); line([-.4, -.4, .4, .4]); line([.4, -.4, -.4, .4]); break;
      case 'agarrada': circle(-.19, -.19, .29); circle(.19, .19, .29); break;
      case 'derribada': line([0, -.52, 0, .28, -.28, -.03]); line([0, .28, .28, -.03]); line([-.48, .5, .48, .5]); break;
      case 'asustada': line([0, -.52, 0, .12]); graphics.circle(x, y + radius * .43, radius * .1).fill(color); break;
      case 'inconsciente': line([.32, -.48, -.1, -.48, -.44, -.12, -.28, .34, .12, .48, .44, .24, .05, .18, -.08, -.05, .32, -.48]); break;
      case 'invisible': line([0, -.55, .5, 0, 0, .55, -.5, 0, 0, -.55]); break;
      case 'oculta': circle(0, 0, .43); line([-.5, .5, .5, -.5]); break;
      case 'hechizada': line([0, .5, -.5, -.02, -.48, -.3, -.23, -.46, 0, -.2, .23, -.46, .48, -.3, .5, -.02, 0, .5]); break;
      case 'paralizada': line([0, -.55, 0, .55]); line([-.48, -.28, .48, .28]); line([-.48, .28, .48, -.28]); break;
      default: {
        line([-.55, 0, -.15, 0]); line([-.35, -.2, -.35, .2]);
        const bitmap = digits[Math.min(9, extra)]!;
        for (let p = 0; p < bitmap.length; p++) if (bitmap[p] === '1') graphics.rect(x + (p % 3) * radius * .17 + radius * .05, y + (Math.floor(p / 3) - 2) * radius * .17, radius * .14, radius * .14).fill(color);
      }
    }
  }
}
