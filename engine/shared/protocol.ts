import { z } from 'zod';
import { cellSchema, idSchema, rotationSchema, sceneIdSchema, type Cell, type PublicCampaignDefinition, type PublicSceneDefinition, type Rotation } from './campaign.js';
import type { CampRestState } from './camp-rest.js';
import type { AdventureView } from './adventure.js';

export type { Cell } from './campaign.js';

export const PROTOCOL_VERSION = 22 as const;
export const OBJECT_MODEL_VERSION = 1 as const;
export const STEP_DURATION_MS = 220;
export type SceneId = string;
export type CameraMode = 'fixed' | 'semiFixed' | 'follow';
export type Facing = 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
export interface StepState { from: Cell; to: Cell; fromSurfaceId?: string; toSurfaceId?: string; startedAt: number; durationMs: number }

export interface PublicEntity {
  id: string;
  kind: 'player' | 'creature' | 'npc';
  label: string;
  cell: Cell;
  surfaceId: string;
  facing: Facing;
  moving: boolean;
  step: StepState | null;
  sceneId: SceneId;
  color: string;
  tokenId: string;
  /** Radius of an explicitly lit carried source; never inferred from an unlit pickup. */
  carriedLightRadiusMeters?: number;
  seatId?: string;
  hp?: number;
  maxHp?: number;
  defeated?: boolean;
  conditions?: CombatCondition[];
}
export type AttackAnimationType = 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile';
export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type CombatRange = { kind: 'melee' | 'ranged'; normalMeters: number; longMeters?: number };
export type CombatSave = { ability: AbilityId; dc: number; failureCondition?: CombatCondition; escapeDc?: number; endsWhenSourceDefeated?: boolean };
export type CombatActionCost = 'action' | 'bonus' | 'reaction';
export type CombatResolution = 'attack' | 'automatic-damage' | 'guided';
/** Las acciones de punto se declaran sobre una casilla, no sobre una ficha. */
export type CombatTargeting = 'creature' | 'point';
/** Acción mágica disponible fuera de combate. El motor valida objetivo,
 * alcance, recursos y concentración; el DM resuelve la consecuencia narrativa. */
export type ExplorationAction = {
  id: string; label: string; kind: 'cantrip' | 'spell';
  target: 'object' | 'living' | 'any' | 'point' | 'self' | 'none';
  rangeMeters: number; guidance: string; castingTime?: string;
  ritual?: boolean; concentration?: boolean; resource?: { id: string; cost: number }; soundId?: string;
};
/** Acciones de exploración que se anuncian al DM y dejan a su criterio la
 * tirada/resultado. No consumen economía de turno fuera del combate. */
export const explorationBasicActionCatalogue = {
  talk: { label: 'Hablar', target: 'living', animation: 'talk', guidance: 'Inicia una conversación. El DM narra la respuesta; si intentas convencer, usa Influir.' },
  influence: { label: 'Influir', target: 'living', animation: 'interact', guidance: 'El DM elige Persuasión, Engaño o Intimidación y fija la CD según la criatura y la situación.' },
  help: { label: 'Ayudar', target: 'living', animation: 'interact', guidance: 'Describe cómo ayudas. El DM decide si es posible y qué prueba puede beneficiarse.' },
  hide: { label: 'Esconderse', target: 'self', animation: 'stealth', guidance: 'El DM confirma cobertura u ocultación y pide Destreza (Sigilo) si corresponde.' },
  search: { label: 'Buscar', target: 'any', animation: 'search', guidance: 'El DM determina si corresponde Percepción o Investigación y establece la CD contextual.' },
  study: { label: 'Estudiar', target: 'any', animation: 'study', guidance: 'El DM elige la habilidad pertinente (p. ej. Investigación, Historia o Arcana) y la CD.' },
  'use-object': { label: 'Utilizar objeto', target: 'any', animation: 'interact', guidance: 'El DM verifica que tienes el objeto y resuelve su uso; registra el gasto si consumes un objeto.' },
  'pick-lock': { label: 'Manipular cerradura', target: 'any', animation: 'interact', guidance: 'El DM comprueba que tienes herramientas de ladrón, consulta la CD de la aventura y pide la prueba pertinente según la ficha.' },
  'disarm-trap': { label: 'Desarmar trampa', target: 'any', animation: 'interact', guidance: 'El DM confirma que la trampa está descubierta, comprueba tus herramientas de ladrón y aplica la CD y consecuencias de la aventura.' },
  climb: { label: 'Trepar', target: 'point', animation: 'climb', guidance: 'Marca el destino propuesto. El DM comprueba la superficie; pide Atletismo solo si una dificultad lo justifica.' },
  swim: { label: 'Nadar', target: 'point', animation: 'swim', guidance: 'Marca el destino propuesto. El DM decide profundidad, corriente y si hay riesgo de agotamiento o ahogamiento.' },
  jump: { label: 'Saltar', target: 'point', animation: 'jump', guidance: 'El salto forma parte del movimiento; no consume una acción. Marca el destino propuesto. El DM valida la distancia y el aterrizaje.' }
} as const;
export type ExplorationBasicAction = keyof typeof explorationBasicActionCatalogue;
export type ExplorationBasicTarget = typeof explorationBasicActionCatalogue[ExplorationBasicAction]['target'];
/** Acciones generales del reglamento 2024. Los ataques y conjuros que se
 * resuelven automáticamente se declaran mediante CombatAction. */
export type BasicCombatAction = 'dash' | 'disengage' | 'dodge' | 'help' | 'hide' | 'influence' | 'magic' | 'ready' | 'search' | 'study' | 'use-object';
/** Visual cue selected whenever a universal combat action is declared. */
export const basicCombatActionAnimationStates: Record<BasicCombatAction, string> = {
  dash: 'running', disengage: 'disengage', dodge: 'dodge', help: 'interact', hide: 'stealth',
  influence: 'interact', magic: 'spell', ready: 'ready', search: 'search', study: 'study', 'use-object': 'interact'
};
/** Definición declarativa de una acción. Los dados se introducen después en el
 * flujo de combate; nunca se aceptan daño o impacto ya resueltos desde el cliente. */
export interface CombatAction {
  id: string; label: string; attackBonus: number; damageDice: string; damageBonus: number;
  damageType?: string; range?: CombatRange; save?: CombatSave; attackCount?: number;
  recharge?: { minimum: number; maximum: number }; finesse?: boolean; automaticHit?: boolean; lockSequenceTarget?: boolean; resource?: { id: string; cost: number }; animationType?: AttackAnimationType;
  inventoryCost?: 'arrow' | 'dagger';
  resolution?: CombatResolution; actionCost?: CombatActionCost; targeting?: CombatTargeting; guidance?: string; concentration?: boolean; magical?: boolean;
  /** Declarative cue chosen by the campaign, with an animation fallback. */
  soundId?: string;
}
/** Estados normalizados. Los efectos de terreno y rasgos no viven aquí. */
export type CombatCondition = 'envenenada' | 'apresada' | 'agarrada' | 'derribada' | 'asustada' | 'inconsciente' | 'oculta' | 'invisible' | 'restringida' | 'hechizada' | 'paralizada';
export interface ConditionSource {
  condition: CombatCondition;
  sourceId?: string;
  sourceAbility?: string;
  sourceLabel?: string;
  escapeDc?: number;
  durationRounds?: number;
  appliedAtRound?: number;
  endsWhenSourceDefeated?: boolean;
}
export interface CombatParticipant { id: string; label: string; kind: 'player' | 'creature' | 'npc'; controller: 'player' | 'dm'; initiative: number; initiativeSubmitted: boolean; active: boolean; hp: number; maxHp: number; armorClass: number; speedMeters: number; attacks: CombatAction[]; conditions: CombatCondition[]; deathSaves?: { successes: number; failures: number; stable: boolean } }
export interface CombatEvent {
  id: string; text: string; kind: 'attack' | 'damage' | 'defeat' | 'turn';
  actorId?: string; targetId?: string; animation?: string;
}
export interface CombatPrompt {
  id: string; stage: 'attack' | 'damage' | 'save' | 'escape' | 'check' | 'death-save' | 'concentration' | 'reaction'; actorId: string; targetId: string;
  title: string; instruction: string; advantage: 'normal' | 'advantage' | 'disadvantage';
  minimum?: number; maximum?: number;
  selectionActorId?: string; cancellable?: boolean;
}
export interface PendingActionSelection { promptId?: string; label: string; cancellable: boolean }

type PropCommon = { id: string; label: string; assetId: string; cell: Cell; surfaceId: string; capabilities: { transform: boolean; detach: boolean; structure: boolean } };
export type PublicObjectInteraction =
  | { kind: 'barred-door'; barrier: 'barred' | 'removed' }
  | { kind: 'trap-stash'; revealed: true; open: boolean; trap: 'armed' | 'spent'; lootTaken: boolean }
  | { kind: 'container'; open: boolean; lootTaken: boolean }
  | { kind: 'chest'; open: boolean; location: 'submerged' | 'surface'; package: 'contained' | 'released' | 'taken'; lootTaken: boolean; openedLocation: 'submerged' | 'surface' | null };
export type DmObjectInteraction =
  | { kind: 'barred-door'; barrier: 'barred' | 'removed' }
  | { kind: 'trap-stash'; revealed: boolean; open: boolean; trap: 'armed' | 'spent'; lootId: string; lootLabel: string; lootOwnerId: string | null }
  | { kind: 'container'; open: boolean; lootId: string; lootLabel: string; lootOwnerId: string | null }
  | { kind: 'chest'; open: boolean; location: 'submerged' | 'surface'; package: 'contained' | 'released' | 'taken'; openedLocation: 'submerged' | 'surface' | null; lootId: string; lootLabel: string; lootOwnerId: string | null; packageId: string; packageLabel: string; packageOwnerId: string | null };
export type PublicProp =
  | (PropCommon & { kind: 'wheel'; rotation: Rotation; footprint: Cell[]; structure: 'intact' | 'damaged' | 'destroyed'; attachment: 'attached' | 'detached'; state: 'upright' | 'caught' | 'fallen'; mount: { cell: Cell; footprint: Cell[]; assetId: string } })
  | (PropCommon & { kind: 'door'; rotation: Rotation; footprint: Cell[]; structure: 'intact' | 'damaged' | 'destroyed'; state: 'open' | 'closed'; interaction?: Extract<PublicObjectInteraction, { kind: 'barred-door' }> })
  | (PropCommon & { kind: 'crate'; rotation: Rotation; footprint: Cell[]; structure: 'intact' | 'damaged' | 'destroyed'; interaction?: Exclude<PublicObjectInteraction, { kind: 'barred-door' }> });
export type DmObject =
  | (PropCommon & { kind: 'wheel'; rotation: Rotation; footprint: Cell[]; allowedRotations: Rotation[]; structure: 'intact' | 'damaged' | 'destroyed'; attachment: 'attached' | 'detached'; state: 'upright' | 'caught' | 'fallen'; mount: { cell: Cell; footprint: Cell[]; assetId: string } })
  | (PropCommon & { kind: 'door'; rotation: Rotation; footprint: Cell[]; structure: 'intact' | 'damaged' | 'destroyed'; state: 'open' | 'closed' | 'locked'; allowedRotations: Rotation[]; interaction?: Extract<DmObjectInteraction, { kind: 'barred-door' }> })
  | (PropCommon & { kind: 'crate'; rotation: Rotation; footprint: Cell[]; structure: 'intact' | 'damaged' | 'destroyed'; allowedRotations: Rotation[]; interaction?: Exclude<DmObjectInteraction, { kind: 'barred-door' }> });

export interface CameraState { mode: CameraMode; focusId: string | null }
export interface EnvironmentState { storm: boolean; lightning: boolean; stormIntensity: number; timeOfDay?: 'auto' | 'day' | 'night' | 'sunset' | 'dawn'; precipitation?: 'none' | 'rain' | 'snow'; precipitationLevel?: 1 | 2 | 3; windIntensity?: number }
export interface AudioTrackState {
  playing: boolean; volume: number; startedAt: number | null; offset: number; assetId?: string;
  /** `loop` means infinite repetition; otherwise `repeats` is the total number of plays. */
  loop: boolean; rate: number; repeats: number;
}
export interface AudioState {
  music: AudioTrackState;
  layers: Record<'ocean' | 'wind' | 'wood' | 'storm', AudioTrackState>;
  /** Disparadores que se repiten deliberadamente (pasos y carrera). */
  sfxLoops: Record<string, AudioTrackState>;
}

export interface WorldSnapshot {
  v: typeof PROTOCOL_VERSION;
  objectModelVersion: typeof OBJECT_MODEL_VERSION;
  revision: number;
  serverTime: number;
  sceneId: SceneId;
  /** Definición única ya autorizada para esta vista; evita publicar el atlas completo. */
  scene: PublicSceneDefinition;
  sceneEpoch: number;
  runtimeEpoch: string;
  entities: PublicEntity[];
  /** Sólo los tokens de entidades visibles en esta escena; no adelanta enemigos ocultos. */
  tokenAssets: { tokens: PublicCampaignDefinition['tokens']; tokenAnimations: PublicCampaignDefinition['tokenAnimations'] };
    props: PublicProp[];
    /** Active, scene-authorized visual cues, including on reconnect. */
    visualEffects?: import('./world-visual-effects.js').WorldVisualEffect[];
  collectedPickups?: string[];
  camera: CameraState;
  environment: EnvironmentState;
  /** Sucesos públicos de escena; no contiene hallazgos ni datos privados. */
  story?: { wreckDisappeared: boolean };
  campRest?: CampRestState | null;
  combat: { active: boolean; round: number; currentId: string | null; movement: { actorId: string; maximumSquares: number; spentSquares: number; remainingSquares: number } | null; participants: CombatParticipant[]; /** Orden confirmado por el DM; respeta los desempates de la mesa. */ order?: Array<{ id: string; label: string; kind: 'player' | 'creature' | 'npc' }>; lastEvent: CombatEvent | null };
}

export interface CharacterPublic {
  id: string;
  label: string;
  archetype: string;
  color: string;
  tokenId: string;
  claimed: boolean;
  connected: boolean;
}

export interface CharacterSheetView {
  level: number; armorClass: number; speedMeters: number; background: string;
  strengthScore?: number;
  features: string[]; attacks: string[]; spells: string[];
  details?: Array<{ title: string; entries: string[] }>;
}

export interface PlayerPrivate {
  runtimeEpoch: string;
  characterId: string | null;
  label: string | null;
  hp: number | null;
  maxHp: number | null;
  inventory: string[];
  conditions: CombatCondition[];
  conditionSources: ConditionSource[];
  resources: Record<string, { label: string; current: number; max: number }>;
  concentration: { actionId: string; label: string } | null;
  deathSaves: { successes: number; failures: number; stable: boolean } | null;
  sheet: CharacterSheetView | null;
  canInteract: boolean;
  nearbyInteraction: string | null;
  interactionTargetId: string | null;
  availableInteractions: Array<{ targetId: string; label: string }>;
  rowboat: { aboard: boolean; pilot: boolean } | null;
  campInteractions: Array<{ pointId: string; label: string; kind: 'bed' | 'tent' | 'fire' | 'seat' | 'guard' | 'chest' | 'personal'; description: string; actionLabel: string; open?: boolean }>;
  explorationActions: ExplorationAction[];
  explorationAttacks: CombatAction[];
  explorationBasics: ExplorationBasicAction[];
  sceneMovementEnabled: boolean;
  combat: { isTurn: boolean; ready: boolean; movement: { remainingSquares: number; maximumSquares: number } | null; attacks: CombatAction[]; conditions: CombatCondition[]; prompt: CombatPrompt | null; pendingAction?: PendingActionSelection; sequence?: { actionId: string; remaining: number }; initiative: { pending: boolean; submitted: boolean; total: number | null; modifier: number }; actionUsed: boolean; bonusActionUsed: boolean; reactionUsed: boolean; basicActions: BasicCombatAction[]; recharge: Record<string, boolean>; resources: Record<string, { label: string; current: number; max: number }>; spellAttackBonus?: number; spellSaveDc?: number } | null;
  notice?: string;
}

export interface InteractionRequest {
  id: string;
  characterId: string;
  characterLabel: string;
  targetId: string;
  createdAt: number;
  status: 'pending' | 'resolved';
}

export interface DmState {
  /** D8-only, DM-only action catalogue for local visual QA; never authorizes gameplay. */
  animationAudit?: Array<{ id: string; attacks: CombatAction[]; explorationActions: ExplorationAction[]; explorationBasics: ExplorationBasicAction[] }>;
  runtimeEpoch: string;
  campaignTitle: string;
  sceneId: SceneId;
  sceneEpoch: number;
  objectRevision: number;
  characters: Array<CharacterPublic & { hp: number; maxHp: number; session: boolean; sceneId: SceneId; cell: Cell; surfaceId: string; step: StepState | null; inventory: string[]; sheet: CharacterSheetView | null; resources: Record<string, { label: string; current: number; max: number }>; concentration: { actionId: string; label: string } | null; deathSaves: { successes: number; failures: number; stable: boolean } }>;
  creature: { id: string; label: string; visible: boolean; cell: Cell; surfaceId: string; sceneId: SceneId; hp: number; maxHp: number; armorClass: number; speedMeters: number; traits: string[]; actions: string[] } | null;
  npcs: Array<{ id: string; label: string; tokenId: string; color: string; cell: Cell; surfaceId: string; hp: number; maxHp: number; armorClass: number; speedMeters: number; traits: string[]; attacks: CombatAction[]; combatEnabled: boolean; visible: boolean }>;
  combat: { sequences: Record<string, { actionId: string; remaining: number; targetId?: string }>; active: boolean; round: number; currentId: string | null; movement: { actorId: string; maximumSquares: number; spentSquares: number; remainingSquares: number } | null; participants: CombatParticipant[]; lastEvent: CombatEvent | null; prompt: CombatPrompt | null; initiativePending: boolean; initiativeSubmitted: Record<string, boolean>; actionUsed: Record<string, boolean>; bonusActionUsed: Record<string, boolean>; reactionUsed: Record<string, boolean>; concentration: Record<string, { actionId: string; label: string }>; recharge: Record<string, Record<string, boolean>>; order: Array<{ id: string; label: string; kind: 'player' | 'creature' | 'npc' }> };
  privateNotes: { creature: string; wheel: string };
  camera: CameraState;
  environment: EnvironmentState;
  campRest?: CampRestState | null;
  audio: AudioState;
  projectorReady: boolean;
  interactions: InteractionRequest[];
  objects: DmObject[];
  pickups?: Array<{ id: string; label: string; sceneId: string; surfaceId: string; cell: Cell; kind: 'unlit-torch' | 'treasure'; collected: boolean; available: boolean }>;
  progress: Record<string, boolean>;
  adventure?: AdventureView;
  encounterGroups?: Array<{ id: string; label: string; sceneId: string; maximum: number; visibleCount: number }>;
  mimicInstruction?: { entityId: string; sourceId: string; actionId: string | null; label: string };
  lastExplorationAction: { id: string; sceneId: SceneId; characterId: string; characterLabel: string; action: ExplorationBasicAction; actionLabel: string; targetLabel: string; guidance: string; createdAt: number } | null;
  undo: { canUndo: boolean; label: string | null; entryId: string | null };
  gameUndo: { canUndo: boolean; label: string | null };
  ports: Array<{ id: string; mode: 'rigging' | 'stairs' | 'road' | 'door' | 'rope-ladder' | 'hatch' | 'hole' | 'swim'; return: 'explicit' | 'adjudicated'; conditionId?: string; from: { mapId: string; zoneId: string; surfaceId: string; cell: Cell }; to: { mapId: string; zoneId: string; surfaceId: string; cell: Cell } }>;
}

const epochSchema = z.number().int().nonnegative();
const commandIdSchema = z.string().uuid();
const runtimeEpochSchema = z.string().uuid();

export const moveInputSchema = z.object({
  runtimeEpoch: runtimeEpochSchema.optional(),
  seq: z.number().int().nonnegative().max(1_000_000_000),
  sceneEpoch: epochSchema,
  x: z.number().finite().min(-1).max(1),
  z: z.number().finite().min(-1).max(1),
  end: z.boolean().optional()
}).strict();
export const sceneReadySchema = z.object({ runtimeEpoch: runtimeEpochSchema.optional(), sceneEpoch: epochSchema }).strict();
export const claimSchema = z.object({ runtimeEpoch: runtimeEpochSchema.optional(), characterId: idSchema }).strict();
export const interactSchema = z.object({ runtimeEpoch: runtimeEpochSchema.optional(), commandId: commandIdSchema, sceneEpoch: epochSchema, targetId: idSchema }).strict();
export const campPlayerInteractSchema = z.object({ runtimeEpoch: runtimeEpochSchema.optional(), commandId: commandIdSchema, sceneEpoch: epochSchema, pointId: idSchema }).strict();
export const explorationActionSchema = z.discriminatedUnion('type', [
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('exploration:action'), commandId: commandIdSchema, sceneEpoch: epochSchema, targetId: idSchema.optional(), targetCell: cellSchema.optional(), actionId: idSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('exploration:attack'), commandId: commandIdSchema, sceneEpoch: epochSchema, targetId: idSchema, actionId: idSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('exploration:basic'), commandId: commandIdSchema, sceneEpoch: epochSchema, action: z.enum(Object.keys(explorationBasicActionCatalogue) as [ExplorationBasicAction, ...ExplorationBasicAction[]]), targetId: idSchema.optional(), targetCell: cellSchema.optional() }).strict()
]);
export const inventoryUpdateSchema = z.object({ runtimeEpoch: runtimeEpochSchema.optional(), commandId: commandIdSchema, items: z.array(z.string().trim().min(1).max(180)).max(80) }).strict();
export const playerCombatSchema = z.discriminatedUnion('type', [
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:cancelAction'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema.optional() }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:flee'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:initiative'), commandId: commandIdSchema, sceneEpoch: epochSchema, total: z.number().int().min(-20).max(40) }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:endTurn'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:endConcentration'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:hp'), commandId: commandIdSchema, sceneEpoch: epochSchema, delta: z.number().int().min(-99).max(99).refine(delta => delta !== 0) }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:declare'), commandId: commandIdSchema, sceneEpoch: epochSchema, targetId: idSchema.optional(), targetCell: cellSchema.optional(), actionId: idSchema, useSneakAttack: z.boolean().optional() }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:basic'), commandId: commandIdSchema, sceneEpoch: epochSchema, action: z.enum(['dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'use-object']), targetId: idSchema.optional() }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:escape'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:stand'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:dropProne'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:rollAttack'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, d20: z.number().int().min(1).max(20) }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:rollDamage'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, diceTotal: z.number().int().min(1).max(200) }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:rollSave'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, total: z.number().int().min(-30).max(100) }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:rollDeathSave'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, d20: z.number().int().min(1).max(20) }).strict(),
  z.object({ runtimeEpoch: runtimeEpochSchema.optional(), type: z.literal('combat:reaction'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, accept: z.boolean() }).strict()
]);
const volumeSchema = z.number().finite().min(0).max(1);
const runtimeField = { runtimeEpoch: runtimeEpochSchema.optional() };
const campRestCommandSchema = z.object({
  ...runtimeField, type: z.literal('camp:rest'), commandId: commandIdSchema, sceneEpoch: epochSchema,
  action: z.enum(['prepare', 'advance', 'set-night', 'interrupt', 'resume', 'finalize']),
  sceneId: sceneIdSchema,
  note: z.string().trim().min(1).max(240).optional(), completed: z.boolean().optional()
}).strict().superRefine((command, context) => {
  if (command.action === 'interrupt' && !command.note) context.addIssue({ code: 'custom', path: ['note'], message: 'La interrupción requiere una nota breve' });
  if (command.action === 'finalize' && command.completed === undefined) context.addIssue({ code: 'custom', path: ['completed'], message: 'La finalización requiere una decisión del DM' });
  if (command.action !== 'interrupt' && command.note !== undefined || command.action !== 'finalize' && command.completed !== undefined)
    context.addIssue({ code: 'custom', message: 'Campos que no corresponden a la acción' });
});

/** El proyector confirma que una secuencia finita ha terminado para que la
 * consola no permanezca visualmente activa después de la última repetición. */
export const sfxLoopEndedSchema = z.object({
  runtimeEpoch: runtimeEpochSchema,
  sfxId: idSchema,
  startedAt: z.number().int().positive()
}).strict();

/** Edición deliberada de la ficha: el cliente solo la envía tras pulsar Editar. */
export const characterSheetUpdateSchema = z.object({
  runtimeEpoch: runtimeEpochSchema.optional(), commandId: commandIdSchema,
  sheet: z.object({
    level: z.number().int().min(1).max(20), armorClass: z.number().int().min(1).max(99), speedMeters: z.number().finite().positive().max(300),
    strengthScore: z.number().int().min(1).max(30).optional(),
    background: z.string().trim().min(1).max(180), features: z.array(z.string().trim().min(1).max(500)).max(40),
    attacks: z.array(z.string().trim().min(1).max(500)).max(40), spells: z.array(z.string().trim().min(1).max(500)).max(80),
    details: z.array(z.object({ title: z.string().trim().min(1).max(120), entries: z.array(z.string().trim().min(1).max(500)).max(30) }).strict()).max(20).optional()
  }).strict()
}).strict();

export const dmCommandSchema = z.discriminatedUnion('type', [
  z.object({ ...runtimeField, type: z.literal('scene'), commandId: commandIdSchema, sceneEpoch: epochSchema, sceneId: sceneIdSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('view:focus'), commandId: commandIdSchema, sceneEpoch: epochSchema, sceneId: sceneIdSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('entity:portal'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema, portId: idSchema, direction: z.enum(['forward', 'return']), adjudicate: z.boolean().optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('scene:animation'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema, state: idSchema, durationMs: z.number().int().min(250).max(10_000).optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('creature'), commandId: commandIdSchema, sceneEpoch: epochSchema, visible: z.boolean(), sourceId: idSchema.optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('npc:visible'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema, visible: z.boolean() }).strict(),
  z.object({ ...runtimeField, type: z.literal('encounter:reveal'), commandId: commandIdSchema, sceneEpoch: epochSchema, groupId: idSchema, count: z.number().int().min(0).max(20) }).strict(),
  z.object({ ...runtimeField, type: z.literal('camera'), commandId: commandIdSchema, sceneEpoch: epochSchema, mode: z.enum(['fixed', 'semiFixed', 'follow']), focusId: z.string().max(40).nullable() }).strict(),
  z.object({ ...runtimeField, type: z.literal('environment'), commandId: commandIdSchema, sceneEpoch: epochSchema, storm: z.boolean(), intensity: volumeSchema.optional(), trackId: idSchema.optional(), timeOfDay: z.enum(['auto', 'day', 'night', 'sunset', 'dawn']).optional(), precipitation: z.enum(['none', 'rain', 'snow']).optional(), precipitationLevel: z.union([z.literal(1),z.literal(2),z.literal(3)]).optional(), windIntensity: volumeSchema.optional() }).strict(),
  campRestCommandSchema,
  z.object({ ...runtimeField, type: z.literal('entity:move'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: z.string().max(40), cell: cellSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('entity:seat'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId:idSchema,seatId:idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('hp'), commandId: commandIdSchema, characterId: z.string().max(40), hp: z.number().int().min(0).max(999) }).strict(),
  z.object({ ...runtimeField, type: z.literal('resource'), commandId: commandIdSchema, characterId: idSchema, resourceId: idSchema, current: z.number().int().min(0).max(99) }).strict(),
  z.object({ ...runtimeField, type: z.literal('entity:hp'), commandId: commandIdSchema, entityId: z.string().max(40), hp: z.number().int().min(0).max(999) }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:start'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:participant'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema, active: z.boolean() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:initiative'), commandId: commandIdSchema, sceneEpoch: epochSchema, entries: z.array(z.object({ id: idSchema, initiative: z.number().int().min(-20).max(40) }).strict()).min(1).max(30) }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:initiativeOrder'), commandId: commandIdSchema, sceneEpoch: epochSchema, order: z.array(idSchema).min(2).max(30), confirm: z.boolean() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:condition'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema, condition: z.enum(['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'inconsciente', 'oculta', 'invisible', 'restringida', 'hechizada', 'paralizada']), active: z.boolean() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:endTurn'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:next'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:end'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:cancel'), commandId: commandIdSchema, sceneEpoch: epochSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:cancelAction'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema, promptId: commandIdSchema.optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:withdraw'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:endConcentration'), commandId: commandIdSchema, sceneEpoch: epochSchema, entityId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:declare'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema, targetId: idSchema.optional(), targetCell: cellSchema.optional(), actionId: idSchema, useSneakAttack: z.boolean().optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:basic'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema, action: z.enum(['dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'use-object']), targetId: idSchema.optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:escape'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:stand'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:dropProne'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:rollAttack'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, d20: z.number().int().min(1).max(20) }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:rollDamage'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, diceTotal: z.number().int().min(1).max(200) }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:rollSave'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, total: z.number().int().min(-30).max(100) }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:rollDeathSave'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, d20: z.number().int().min(1).max(20) }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:reaction'), commandId: commandIdSchema, sceneEpoch: epochSchema, promptId: commandIdSchema, accept: z.boolean() }).strict(),
  z.object({ ...runtimeField, type: z.literal('combat:recharge'), commandId: commandIdSchema, sceneEpoch: epochSchema, attackerId: idSchema, actionId: idSchema, d6: z.number().int().min(1).max(6) }).strict(),
  z.object({ ...runtimeField, type: z.literal('progress:toggle'), commandId: commandIdSchema, sceneEpoch: epochSchema, flag: idSchema, value: z.boolean() }).strict(),
  z.object({ ...runtimeField, type: z.literal('story:choice'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectiveId: idSchema, choiceId: idSchema.nullable(), note: z.string().max(500).default(''), override: z.boolean().default(false) }).strict(),
  z.object({ ...runtimeField, type: z.literal('story:ending'), commandId: commandIdSchema, sceneEpoch: epochSchema, endingId: idSchema.nullable(), reason: z.string().max(500).default(''), override: z.boolean().default(false) }).strict(),
  z.object({ ...runtimeField, type: z.literal('wreck:level-up'), commandId: commandIdSchema, level: z.union([z.literal(2), z.literal(3)]) }).strict(),
  z.object({ ...runtimeField, type: z.literal('pickup:take'), commandId: commandIdSchema, sceneEpoch: epochSchema, pickupId: idSchema, characterId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('game:undo'), commandId: commandIdSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('release'), commandId: commandIdSchema, characterId: z.string().max(40) }).strict(),
  z.object({ ...runtimeField, type: z.literal('audio'), commandId: commandIdSchema, channel: z.enum(['music', 'ocean', 'wind', 'wood', 'storm']), playing: z.boolean(), volume: volumeSchema, loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('audio:select'), commandId: commandIdSchema, channel: z.enum(['music', 'ocean', 'wind', 'wood', 'storm']), trackId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('audio:mix'), commandId: commandIdSchema,
    music: z.object({ playing: z.boolean(), volume: volumeSchema }).strict(),
    layers: z.object({
      ocean: z.object({ trackId: idSchema, playing: z.boolean(), volume: volumeSchema, loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict(),
      wind: z.object({ trackId: idSchema, playing: z.boolean(), volume: volumeSchema, loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict(),
      wood: z.object({ trackId: idSchema, playing: z.boolean(), volume: volumeSchema, loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict(),
      storm: z.object({ trackId: idSchema, playing: z.boolean(), volume: volumeSchema, loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict()
    }).strict()
  }).strict(),
  z.object({ ...runtimeField, type: z.literal('sfx'), commandId: commandIdSchema, sfxId: idSchema }).strict(),
  z.object({ ...runtimeField, type: z.literal('sfx:loop'), commandId: commandIdSchema, sfxId: idSchema, playing: z.boolean(), volume: volumeSchema, loop: z.boolean().optional(), rate: z.number().finite().min(.5).max(1.5).optional(), repeats: z.number().int().min(1).max(12).optional() }).strict(),
  z.object({ ...runtimeField, type: z.literal('resolveInteraction'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), requestId: commandIdSchema, result: z.enum(['caught', 'fallen', 'cancelled']), cell: cellSchema.optional(), rotation: rotationSchema.optional() }).strict().superRefine((command, context) => {
    if (command.result === 'cancelled' && (command.cell || command.rotation !== undefined)) context.addIssue({ code: 'custom', message: 'Cancelar no admite destino' });
    if (command.result !== 'cancelled' && (!command.cell || command.rotation === undefined)) context.addIssue({ code: 'custom', message: 'Resolver exige destino y rotación' });
  }),
  z.object({ ...runtimeField, type: z.literal('object:detach'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), objectId: idSchema, cell: cellSchema, rotation: rotationSchema, outcome: z.enum(['caught', 'fallen']) }).strict(),
  z.object({ ...runtimeField, type: z.literal('object:structure'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), objectId: idSchema, structure: z.enum(['damaged', 'destroyed']) }).strict(),
  z.object({ ...runtimeField, type: z.literal('object:door'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), objectId: z.string().max(40), state: z.enum(['open', 'closed', 'locked']) }).strict(),
  z.object({ ...runtimeField, type: z.literal('object:interact'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), objectId: idSchema, action: z.enum(['remove-bar', 'replace-bar', 'discover', 'open', 'trigger-open', 'rearm', 'assign-result', 'take-loot', 'return-loot', 'take-package', 'return-package']), characterId: idSchema.optional(), resultId: z.number().int().min(1).max(6).optional() }).strict().superRefine((command, context) => {
    if (command.action === 'assign-result' && command.resultId === undefined) context.addIssue({ code: 'custom', message: 'Asignar botín exige resultado del d6' });
    if (command.action !== 'assign-result' && command.resultId !== undefined) context.addIssue({ code: 'custom', message: 'El resultado solo se admite al asignar botín' });
  }),
  z.object({ ...runtimeField, type: z.literal('object:transform'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), objectId: z.string().max(40), cell: cellSchema, surfaceId: idSchema.optional(), rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]) }).strict(),
  z.object({ ...runtimeField, type: z.literal('object:undo'), commandId: commandIdSchema, sceneEpoch: epochSchema, objectRevision: z.number().int().nonnegative(), entryId: commandIdSchema }).strict()
]);

export type DmCommand = z.infer<typeof dmCommandSchema>;
export type CommandResult = { runtimeEpoch?: string; commandId?: string; ok: boolean; code: string; sceneId?: SceneId; sceneEpoch?: number; objectRevision?: number };
