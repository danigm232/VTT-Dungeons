import { z } from 'zod';
import { cellSchema, idSchema, rotationSchema } from '../../shared/campaign.js';
import { campRestStateSchema } from '../../shared/camp-rest.js';
import { durableVisualEffectSchema } from '../../shared/world-visual-effects.js';

const boundedInt = z.number().int().safe().nonnegative();
const track = z.object({ playing: z.boolean(), volume: z.number().finite().min(0).max(1), offsetSeconds: z.number().finite().min(0).max(1e12), assetId: idSchema.optional(), loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict();
const common = { id: idSchema, cell: cellSchema, surfaceId: idSchema.optional(), rotation: rotationSchema, structure: z.enum(['intact', 'damaged', 'destroyed']) };
const loot = { lootId: idSchema, lootLabel: z.string().min(1).max(160), lootOwnerId: idSchema.nullable() };
const crateInteraction = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('trap-stash'), revealed: z.boolean(), open: z.boolean(), trap: z.enum(['armed', 'spent']), ...loot }).strict(),
  z.object({ kind: z.literal('container'), open: z.boolean(), ...loot }).strict(),
  z.object({ kind: z.literal('chest'), open: z.boolean(), location: z.enum(['submerged', 'surface']), package: z.enum(['contained', 'released', 'taken']), openedLocation: z.enum(['submerged', 'surface']).nullable(), ...loot, packageId: idSchema, packageLabel: z.string().min(1).max(160), packageOwnerId: idSchema.nullable() }).strict()
]);
const object = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('crate'), interaction: crateInteraction.optional() }).strict(),
  z.object({ ...common, kind: z.literal('door'), state: z.enum(['open', 'closed', 'locked']), interaction: z.object({ kind: z.literal('barred-door'), barrier: z.enum(['barred', 'removed']) }).strict().optional() }).strict(),
  z.object({ ...common, kind: z.literal('wheel'), attachment: z.enum(['attached', 'detached']), state: z.enum(['upright', 'caught', 'fallen']) }).strict()
]);
const combatCondition = z.enum(['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'inconsciente', 'oculta', 'invisible', 'restringida', 'hechizada', 'paralizada']);
const conditionSource = z.object({
  condition: combatCondition,
  sourceId: idSchema.optional(),
  sourceAbility: idSchema.optional(),
  sourceLabel: z.string().min(1).max(120).optional(),
  escapeDc: boundedInt.min(1).max(30).optional(),
  durationRounds: boundedInt.max(999).optional(),
  appliedAtRound: boundedInt.max(9999).optional(),
  endsWhenSourceDefeated: z.boolean().optional()
}).strict();
const resource = z.object({ label: z.string().min(1).max(80), current: boundedInt.max(99), max: boundedInt.max(99) }).strict().refine(value => value.current <= value.max, 'RESOURCE_CURRENT');
const characterSheet = z.object({
  level: boundedInt.min(1).max(20), armorClass: boundedInt.min(1).max(99), speedMeters: z.number().finite().positive().max(300), background: z.string().min(1).max(180),
  strengthScore: boundedInt.min(1).max(30).optional(),
  features: z.array(z.string().min(1).max(500)).max(40), attacks: z.array(z.string().min(1).max(500)).max(40), spells: z.array(z.string().min(1).max(500)).max(80),
  details: z.array(z.object({ title: z.string().min(1).max(120), entries: z.array(z.string().min(1).max(500)).max(30) }).strict()).max(20).optional()
}).strict();
const combatRange = z.object({ kind: z.enum(['melee', 'ranged']), normalMeters: z.number().finite().nonnegative().max(1000), longMeters: z.number().finite().nonnegative().max(2000).optional() }).strict();
const combatSave = z.object({ ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']), dc: boundedInt.min(1).max(30), failureCondition: combatCondition.optional(), escapeDc: boundedInt.min(1).max(30).optional(), endsWhenSourceDefeated: z.boolean().optional() }).strict();
const ruleTraits = z.object({ sneakAttackDice: z.string().regex(/^\d+d\d{1,3}$/).optional(), brave: z.boolean().optional(), poisonResilience: z.boolean().optional(), darkvisionMeters: z.number().finite().positive().max(1000).optional(), magicResistance: z.boolean().optional(), flightMeters: z.number().finite().positive().max(1000).optional() }).strict();
const combatAction = z.object({
  id: idSchema, label: z.string().min(1).max(200), attackBonus: z.number().int().safe().min(-100).max(100), damageDice: z.string().min(1).max(40), damageBonus: z.number().int().safe().min(-100).max(100),
  damageType: z.string().min(1).max(80).optional(), range: combatRange.optional(), save: combatSave.optional(), attackCount: boundedInt.min(1).max(12).optional(), recharge: z.object({ minimum: boundedInt.min(1).max(6), maximum: boundedInt.min(1).max(6) }).strict().optional(),
  finesse: z.boolean().optional(), automaticHit: z.boolean().optional(), lockSequenceTarget: z.boolean().optional(), resource: z.object({ id: idSchema, cost: boundedInt.min(1).max(99) }).strict().optional(), animationType: z.enum(['melee', 'arrow', 'thrownWeapon', 'radiantArrow', 'vine', 'fireProjectile', 'magicalProjectile']).optional(),
  inventoryCost: z.enum(['arrow', 'dagger']).optional(),
  resolution: z.enum(['attack', 'automatic-damage', 'guided']).optional(), actionCost: z.enum(['action', 'bonus', 'reaction']).optional(), targeting: z.enum(['creature', 'point']).optional(), guidance: z.string().min(1).max(500).optional(), concentration: z.boolean().optional(), magical: z.boolean().optional(), soundId: idSchema.optional()
}).strict();
const pendingMovement = z.object({ entityId: idSchema, destination: cellSchema, destinationSurfaceId: idSchema.optional(), reactorsChecked: z.array(idSchema).max(120) }).strict();
const pendingCombat = z.object({
  id: z.string().uuid(), stage: z.enum(['attack', 'damage', 'save', 'escape', 'death-save', 'check', 'concentration', 'reaction']), attackerId: idSchema, targetId: idSchema, actionId: idSchema, advantage: z.enum(['normal', 'advantage', 'disadvantage']),
  critical: z.boolean().optional(), useSneakAttack: z.boolean().optional(), sneakAttackDice: z.string().regex(/^\d+d\d{1,3}$/).optional(), diceFormula: z.string().max(40).optional(), damageBonus: z.number().int().safe().min(-100).max(100).optional(), source: conditionSource.optional(),
  concentrationDc: boundedInt.min(1).max(30).optional(), concentrationQueue: z.array(z.object({ entityId: idSchema, dc: boundedInt.min(1).max(30) }).strict()).max(120).optional(), opportunity: z.boolean().optional(), movement: pendingMovement.optional()
}).strict().nullable();
const combat = z.object({
  active: z.boolean(), round: boundedInt.max(9999), order: z.array(idSchema).max(120), turnIndex: boundedInt.max(119), participantIds: z.array(idSchema).max(120),
  initiative: z.record(idSchema, z.number().int().safe().min(-100).max(100)), spentSquares: z.record(idSchema, boundedInt.max(100)),
  initiativeSubmitted: z.record(idSchema, z.boolean()).optional(), initiativePending: z.boolean().optional(),
  actionUsed: z.record(idSchema, z.boolean()), conditions: z.record(idSchema, z.array(combatCondition).max(8)).optional(),
  dashSquares: z.record(idSchema, boundedInt.max(100)).optional(), bonusActionUsed: z.record(idSchema, z.boolean()).optional(), reactionUsed: z.record(idSchema, z.boolean()).optional(), sneakAttackUsed: z.record(idSchema, z.boolean()).optional(), sneakAttackUsedTurn: z.record(idSchema, z.string().regex(/^\d+:[a-z0-9._-]+$/)).optional(),
  spellSlotUsedTurn: z.record(idSchema, z.string().regex(/^\d+:[a-z0-9._-]+$/)).optional(),
  rechargeAttemptTurn: z.record(z.string().max(100), z.string().regex(/^\d+:[a-z0-9._-]+$/)).optional(),
  turnActions: z.record(idSchema, z.object({ actionId: idSchema, label: z.string().max(200), kind: z.enum(['attack', 'basic']) }).strict()).optional(),
  // "improvise" fue una etiqueta temporal en saves previos; se acepta para
  // poder recuperar la partida y el motor la descarta al restaurar.
  stances: z.record(idSchema, z.object({ action: z.enum(['dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'use-object', 'improvise']), targetId: idSchema.optional() }).strict()).optional(),
  conditionSources: z.record(idSchema, z.array(conditionSource).max(7)).optional(),
  sequences: z.record(idSchema, z.object({ actionId: idSchema, remaining: boundedInt.max(6), targetId: idSchema.optional() }).strict()).optional(),
  recharge: z.record(idSchema, z.record(idSchema, z.boolean())).optional(), openingAction: z.object({ attackerId: idSchema, targetId: idSchema, actionId: idSchema }).strict().nullable().optional(), pending: pendingCombat.optional()
}).strict().nullable();
export const durablePayloadSchema = z.object({
  sceneId: idSchema,
  /** Geometry revision for campaigns whose saved grid coordinates can change. */
  wreckGridVersion: boundedInt.min(1).optional(),
  /** Tactical cell layout revision for the private D8 maps. */
  d8GridVersion: boundedInt.min(1).max(9).optional(),
  characters: z.array(z.object({ id: idSchema, hp: boundedInt.max(999), maxHp: boundedInt.min(1).max(999).optional(), inventory: z.array(z.string().min(1).max(200)).max(100), sheet: characterSheet.nullable().optional(), resources: z.record(idSchema, resource).optional(), deathSaves: z.object({ successes: boundedInt.max(3), failures: boundedInt.max(3), stable: z.boolean() }).strict().optional(), sceneId: idSchema.optional(), cell: cellSchema, surfaceId: idSchema, facing: z.enum(['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']) }).strict()).min(1).max(20),
  npcs: z.array(z.object({ id: idSchema, sceneId: idSchema, surfaceId: idSchema, cell: cellSchema, facing: z.enum(['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']), hp: boundedInt.max(999).optional(), maxHp: boundedInt.min(1).max(999).optional(), combatEnabled: z.boolean().optional(), visible: z.boolean().optional() }).strict()).max(100).optional(),
  creature: z.object({
    id: idSchema, sceneId: idSchema, surfaceId: idSchema, cell: cellSchema, facing: z.enum(['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']).optional(), visible: z.boolean(), hp: boundedInt.max(999).optional(),
    runtimeProfile: z.object({ label: z.string().min(1).max(160), tokenId: idSchema, maxHp: boundedInt.min(1).max(999), armorClass: boundedInt.max(99), speedMeters: z.number().finite().nonnegative().max(300), initiativeBonus: z.number().int().safe().min(-100).max(100), attacks: z.array(combatAction).max(30), traits: z.array(z.string().min(1).max(500)).max(50), actions: z.array(z.string().min(1).max(500)).max(50), resources: z.record(idSchema, resource).optional(), ruleTraits: ruleTraits.optional(), damageResistances: z.array(z.string().min(1).max(40)).max(30).optional(), damageImmunities: z.array(z.string().min(1).max(40)).max(30).optional(), conditionImmunities: z.array(combatCondition).max(9).optional(), mimicOfPlayerId: idSchema.nullable().optional() }).strict().optional()
  }).strict().nullable(),
  scenes: z.array(z.object({ sceneId: idSchema, objects: z.array(object).max(100) }).strict()).min(1).max(100),
  camera: z.object({ mode: z.enum(['fixed', 'semiFixed', 'follow']), focusId: idSchema.nullable() }).strict(),
  environment: z.object({ storm: z.boolean(), stormIntensity: z.number().finite().min(0).max(1).optional(), timeOfDay: z.enum(['auto', 'day', 'night','sunset','dawn']).optional(), precipitation: z.enum(['none','rain','snow']).optional(), precipitationLevel: z.union([z.literal(1),z.literal(2),z.literal(3)]).optional(), windIntensity: z.number().finite().min(0).max(1).optional() }).strict(),
  audio: z.object({ music: track, layers: z.object({ ocean: track, wind: track, wood: track, storm: track }).strict(), sfxLoops: z.record(idSchema, track).optional() }).strict(),
  conditions: z.record(idSchema, z.array(combatCondition).max(8)).optional(),
  conditionSources: z.record(idSchema, z.array(conditionSource).max(16)).optional(),
  concentration: z.record(idSchema, z.object({ actionId: idSchema, label: z.string().min(1).max(200) }).strict()).optional(),
  visualEffects: z.array(durableVisualEffectSchema).max(200).optional(),
  combat: combat.optional(),
  progress: z.record(idSchema, z.boolean()).optional(),
  storyNotes: z.record(idSchema, z.string().max(500)).optional(),
  campRest: campRestStateSchema.optional()
}).strict();
export type DurablePayload = z.infer<typeof durablePayloadSchema>;

const envelope = { format: z.literal('dungeons-save'), campaignId: idSchema, campaignVersion: z.string().min(1).max(30), campaignStateVersion: boundedInt.min(1), saveId: z.string().uuid(), generation: boundedInt.min(1), stateRevision: boundedInt, savedAt: z.string().datetime({ offset: true }), checksum: z.string().regex(/^[a-f0-9]{64}$/) };
export const saveV1Schema = z.object({ ...envelope, schemaVersion: z.literal(1), payload: durablePayloadSchema }).strict();
const legacyPayload = durablePayloadSchema.omit({ camera: true });
export const saveV0Schema = z.object({ ...envelope, schemaVersion: z.literal(0), payload: legacyPayload }).strict();
export type SaveV1 = z.infer<typeof saveV1Schema>;
export type SaveV0 = z.infer<typeof saveV0Schema>;
