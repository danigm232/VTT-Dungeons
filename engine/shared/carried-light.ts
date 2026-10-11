/** Only explicitly burning/enchanted items emit light. An unlit torch in a
 * pack must never illuminate the wreck merely because it was picked up. */
import { parseInventoryItem } from './inventory.js';

export function carriedLightRadiusMeters(inventory: readonly string[]): number {
  const sources = inventory.map(item => parseInventoryItem(item)).filter(item => item.quantity > 0);
  if (sources.some(item => /\b(farol(?:es)?|linternas?|l[aá]mparas?)\b/i.test(item.label) && item.lit)) return 9;
  if (sources.some(item => /\bantorchas?\b/i.test(item.label) && item.lit || /\bluz m[aá]gica\b/i.test(item.label))) return 6;
  return 0;
}
