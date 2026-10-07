/** Only D8 serves these textures; other campaigns use drawn projectile VFX. */
export const d8CombatProjectileTextures = {
  fireProjectile: '/art/vfx/d8-night/particles/d8-night-vfx-fire-flame.png',
  magicalProjectile: '/art/vfx/d8-night/particles/d8-night-vfx-arcane-spark.png'
} as const;

export function combatProjectileTexture(campaignId: string, type: string): string | null {
  if (campaignId !== 'd8-night-private') return null;
  return type === 'fireProjectile' || type === 'magicalProjectile' ? d8CombatProjectileTextures[type] : null;
}
