/** Only explicitly burning/enchanted items emit light. An unlit torch in a
 * pack must never illuminate the wreck merely because it was picked up. */
export function carriedLightRadiusMeters(inventory: readonly string[]): number {
  if (inventory.some(item => /\b(farol|linterna|l[aá]mpara)\b.*\b(encendid[ao]|iluminad[ao]|prendid[ao])\b/i.test(item))) return 9;
  if (inventory.some(item => /\bantorcha\b.*\b(encendid[ao]|prendid[ao])\b|\bluz m[aá]gica\b/i.test(item))) return 6;
  return 0;
}
