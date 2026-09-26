import { z } from 'zod';
import { idSchema } from './campaign.js';

export const campRestPhaseSchema = z.enum(['arrival', 'dusk', 'night', 'dawn', 'finalization']);
export const campRestStateSchema = z.object({
  sceneId: idSchema,
  /** null means no rest has been prepared at this camp yet. */
  phase: campRestPhaseSchema.nullable(),
  paused: z.boolean(),
  outcome: z.enum(['completed', 'incomplete']).nullable(),
  interruptions: z.array(z.object({ note: z.string().min(1).max(240), at: z.number().int().nonnegative() }).strict()).max(30),
  interactions: z.array(z.object({
    pointId: idSchema, pointLabel: z.string().min(1).max(80), characterId: idSchema,
    characterLabel: z.string().min(1).max(80), at: z.number().int().nonnegative(),
    action: z.enum(['opened', 'closed', 'used']).optional()
  }).strict()).max(30)
}).strict();

export type CampRestPhase = z.infer<typeof campRestPhaseSchema>;
export type CampRestState = z.infer<typeof campRestStateSchema>;
