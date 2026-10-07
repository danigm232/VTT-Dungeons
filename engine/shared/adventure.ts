import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,39}$/);
export const adventureDefinitionSchema = z.object({
  objectives: z.array(z.object({
    id, sceneId: id, label: z.string().min(1).max(160), item: z.string().min(1).max(160),
    requires: z.array(id).max(20).default([]),
    choices: z.array(z.object({ id, label: z.string().min(1).max(200), endingId: id }).strict()).min(1).max(20)
  }).strict()).min(1).max(20),
  endings: z.array(z.object({ id, label: z.string().min(1).max(160) }).strict()).min(1).max(10),
  sceneGuidance: z.record(id, z.array(z.string().min(1).max(500)).max(12)).optional()
}).strict();
export type AdventureDefinition = z.infer<typeof adventureDefinitionSchema>;
export const choiceFlag = (objectiveId: string, choiceId: string) => `story.${objectiveId}.${choiceId}`;
export const endingFlag = (endingId: string) => `story.final.${endingId}`;

/** Scores are derived, never incremented. Re-entry and retries cannot add points. */
export function adventureView(definition: AdventureDefinition, progress: Record<string, boolean>, notes: Record<string, string>) {
  const objectives = definition.objectives.map(objective => {
    const choice = objective.choices.find(choice => progress[choiceFlag(objective.id, choice.id)]) ?? null;
    return { ...objective, choice, complete: Boolean(choice || progress[objective.id]),
      available: objective.requires.every(id => Boolean(progress[id])), note: notes[objective.id] ?? '' };
  });
  const endings = definition.endings.map(ending => ({ ...ending,
    score: objectives.filter(objective => objective.choice?.endingId === ending.id).length,
    selected: Boolean(progress[endingFlag(ending.id)]), reason: notes[`final.${ending.id}`] ?? '' }));
  const highest = Math.max(0, ...endings.map(ending => ending.score));
  return { objectives, endings, sceneGuidance: definition.sceneGuidance ?? {}, candidates: endings.filter(ending => ending.score === highest).map(ending => ending.id),
    complete: objectives.every(objective => objective.complete),
    inventory: objectives.filter(objective => objective.complete).map(objective => objective.item) };
}
export type AdventureView = ReturnType<typeof adventureView>;
