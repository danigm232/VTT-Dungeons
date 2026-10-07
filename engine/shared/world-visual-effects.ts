import { z } from 'zod';
import { cellSchema, idSchema } from './campaign.js';

/** Visual cues only: these never award damage, light, concealment or a reaction. */
export const worldVisualEffectSchema = z.object({
  id: idSchema, type: z.enum(['fog', 'feather', 'spark']), sceneId: idSchema,
  surfaceId: idSchema, cell: cellSchema, radiusMeters: z.number().finite().positive().max(100),
  startedAt: z.number().int().safe().nonnegative(), expiresAt: z.number().int().safe().nonnegative(),
  entityId: idSchema.optional()
}).strict().refine(effect => effect.expiresAt > effect.startedAt, 'EFFECT_DURATION');
export type WorldVisualEffect = z.infer<typeof worldVisualEffectSchema>;
export const durableVisualEffectSchema = z.object({
  visual: worldVisualEffectSchema, ownerId: idSchema, actionId: idSchema, concentration: z.boolean()
}).strict();
export type DurableVisualEffect = z.infer<typeof durableVisualEffectSchema>;

export function actionVisualEffect(actionId: string) {
  if (actionId === 'fog-cloud' || actionId === 'fog-cloud-exploration') return { type: 'fog' as const, radiusMeters: 6, durationMs: 3_600_000 };
  if (actionId === 'feather-fall') return { type: 'feather' as const, radiusMeters: .8, durationMs: 60_000 };
  if (['mending', 'prestidigitation', 'light-torch', 'identify', 'find-familiar', 'floating-disk'].includes(actionId)) return { type: 'spark' as const, radiusMeters: .6, durationMs: 1_600 };
  return null;
}
