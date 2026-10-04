import crypto from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  OBJECT_MODEL_VERSION, PROTOCOL_VERSION, STEP_DURATION_MS, basicCombatActionAnimationStates, campPlayerInteractSchema, characterSheetUpdateSchema, claimSchema, dmCommandSchema, explorationActionSchema, interactSchema, inventoryUpdateSchema, moveInputSchema, playerCombatSchema, sceneReadySchema, sfxLoopEndedSchema,
  explorationBasicActionCatalogue, type AudioState, type BasicCombatAction, type Cell, type CombatAction, type CombatCondition, type CombatEvent, type CombatParticipant, type CombatPrompt, type CommandResult, type DmCommand, type DmObject, type DmObjectInteraction, type DmState, type EnvironmentState, type ExplorationBasicAction, type Facing, type PlayerPrivate,
  type ExplorationAction, type PublicEntity, type PublicProp, type SceneId, type StepState, type WorldSnapshot
} from '../shared/protocol.js';
import type { CampRestState } from '../shared/camp-rest.js';
import type { PickupDefinition, PropDefinition, Rotation } from '../shared/campaign.js';
import { cellKey, footprintFor, sameCell } from '../shared/geometry.js';
import { supportsCameraOrientation } from '../shared/camera.js';
import { surfaceNeighbors } from '../shared/terrain.js';
import { carriedLightRadiusMeters } from '../shared/carried-light.js';
import { jumpGuidance } from '../shared/jumping.js';
import { compileCampaignBundle, type CampaignServerBundle, type CompiledCampaign, type RuleTraits, type SceneDefinition } from './campaign.js';
import { directionFromVector, isWalkable, resolveStep } from './navigation.js';
import { durablePayloadSchema, type DurablePayload } from './persistence/schema.js';
import type { PersistenceCoordinator } from './persistence/coordinator.js';

export type CharacterState = {
  id: string; label: string; archetype: string; hp: number; maxHp: number; color: string; tokenId: string; inventory: string[];
  deathSaves: { successes: number; failures: number; stable: boolean };
  sheet: NonNullable<CompiledCampaign['characters'][string]['sheet']> | null;
  combat: { armorClass: number; speedMeters: number; initiativeBonus: number; spellAttackBonus?: number; spellSaveDc?: number; attacks: CombatAction[]; resources: Record<string, { label: string; current: number; max: number }>; ruleTraits: RuleTraits; damageResistances: string[]; damageImmunities: string[]; conditionImmunities: CombatCondition[] };
  explorationActions: ExplorationAction[];
  explorationBasics: ExplorationBasicAction[];
  sceneId: SceneId; cell: Cell; surfaceId: string; facing: Facing; moving: boolean; step: StepState | null;
  sessionToken: string | null; socketId: string | null;
  input: { held: Facing | null; seq: number; updatedAt: number };
};
type NpcState = { id: string; identityId: string; label: string; tokenId: string; color: string; cell: Cell; surfaceId: string; sceneId: SceneId; facing: Facing; step?: StepState | null; hp: number; maxHp: number; armorClass: number; speedMeters: number; initiativeBonus: number; attacks: CombatAction[]; traits: string[]; ruleTraits: RuleTraits; damageResistances: string[]; damageImmunities: string[]; conditionImmunities: CombatCondition[]; combatEnabled: boolean; visible: boolean; blocksMovement: boolean };
type CreatureState = NonNullable<CompiledCampaign['encounter']>['creature'] & { sceneId: SceneId; surfaceId: string; facing: Facing; visible: boolean; hp: number; maxHp: number; armorClass: number; speedMeters: number; initiativeBonus: number; attacks: CombatAction[]; traits: string[]; actions: string[]; resources: Record<string, { label: string; current: number; max: number }>; ruleTraits: RuleTraits; damageResistances: string[]; damageImmunities: string[]; conditionImmunities: CombatCondition[]; mimicOfPlayerId: string | null };
type ConditionSource = { condition: CombatCondition; sourceId?: string; sourceAbility?: string; sourceLabel?: string; escapeDc?: number; durationRounds?: number; appliedAtRound?: number; endsWhenSourceDefeated?: boolean };
type PendingMovement = { entityId: string; destination: Cell; destinationSurfaceId?: string; reactorsChecked: string[] };
type PendingCombatResolution = {
  id: string; stage: 'attack' | 'damage' | 'save' | 'escape' | 'death-save' | 'check' | 'concentration' | 'reaction';
  attackerId: string; targetId: string; actionId: string; advantage: CombatPrompt['advantage'];
  critical?: boolean; useSneakAttack?: boolean; sneakAttackDice?: string; diceFormula?: string; damageBonus?: number; source?: ConditionSource;
  concentrationDc?: number; concentrationQueue?: Array<{ entityId: string; dc: number }>;
  opportunity?: boolean; movement?: PendingMovement;
};
type InternalCombatEvent = CombatEvent & { publicText: string };
type CombatState = {
  active: boolean; round: number; order: string[]; turnIndex: number; spentSquares: Record<string, number>; dashSquares: Record<string, number>;
  actionUsed: Record<string, boolean>; bonusActionUsed: Record<string, boolean>; reactionUsed: Record<string, boolean>; sneakAttackUsed: Record<string, boolean>; sneakAttackUsedTurn: Record<string, string>;
  spellSlotUsedTurn: Record<string, string>; stances: Record<string, { action: BasicCombatAction; targetId?: string }>;
  initiative: Record<string, number>; initiativeSubmitted: Record<string, boolean>; initiativePending: boolean; participantIds: string[]; sequences: Record<string, { actionId: string; remaining: number; targetId?: string }>;
  recharge: Record<string, Record<string, boolean>>; openingAction: { attackerId: string; targetId: string; actionId: string } | null;
  pending: PendingCombatResolution | null; lastEvent: InternalCombatEvent | null;
};
type ObjectCommon = {
  id: string; label: string; assetId: string; cell: Cell; surfaceId: string; rotation: Rotation; baseFootprint: Cell[]; allowedRotations: Rotation[];
  capabilities: { transform: boolean; detach: boolean; structure: boolean }; version: number;
};
type Structure = 'intact' | 'damaged' | 'destroyed';
type DoorRuntime = ObjectCommon & { kind: 'door'; structure: Structure; state: 'open' | 'closed' | 'locked'; interaction?: Extract<DmObjectInteraction, { kind: 'barred-door' }> };
type CrateRuntime = ObjectCommon & { kind: 'crate'; structure: Structure; interaction?: Exclude<DmObjectInteraction, { kind: 'barred-door' }> };
type WheelRuntime = ObjectCommon & { kind: 'wheel'; structure: Structure; attachment: 'attached' | 'detached'; state: 'upright' | 'caught' | 'fallen'; mount: { cell: Cell; footprint: Cell[]; assetId: string } };
type ObjectRuntime = DoorRuntime | CrateRuntime | WheelRuntime;
type UndoEntry = { entryId: string; label: string; objectId: string; before: Partial<ObjectRuntime>; after: Partial<ObjectRuntime> };
type SceneObjectState = { objects: ObjectRuntime[]; undo: UndoEntry[]; revision: number };
type RuntimeInteraction = DmState['interactions'][number] & { sceneId: SceneId; sceneEpoch: number; objectVersion: number; sessionToken: string };

const freshTrack = (volume: number) => ({ playing: false, volume, startedAt: null as number | null, offset: 0, loop: true, rate: 1, repeats: 1 });
const cloneCell = (cell: Cell): Cell => ({ col: cell.col, row: cell.row });
const combatActions = (actions: Array<Omit<CombatAction, 'damageBonus'> & { damageBonus?: number }>): CombatAction[] => actions.map(action => ({ ...action, damageBonus: action.damageBonus ?? 0 }));
const emptyCombat = (): CombatState => ({ active: false, round: 0, order: [], turnIndex: 0, spentSquares: {}, dashSquares: {}, actionUsed: {}, bonusActionUsed: {}, reactionUsed: {}, sneakAttackUsed: {}, sneakAttackUsedTurn: {}, spellSlotUsedTurn: {}, stances: {}, initiative: {}, initiativeSubmitted: {}, initiativePending: false, participantIds: [], sequences: {}, recharge: {}, openingAction: null, pending: null, lastEvent: null });
const cloneObject = (object: ObjectRuntime): ObjectRuntime => structuredClone(object);
const isDoor = (object: ObjectRuntime): object is DoorRuntime => object.kind === 'door';
const isWheel = (object: ObjectRuntime): object is WheelRuntime => object.kind === 'wheel';
const visualAnimationType = (action?: CombatAction): NonNullable<CombatAction['animationType']> => {
  if (action?.animationType) return action.animationType;
  const label = `${action?.id ?? ''} ${action?.label ?? ''}`;
  if (/\b(arco|flechas?|bow|arrow)\b/i.test(label)) return 'arrow';
  if (/thrown[- ]dagger|lanzar[- ]daga|daga arrojadiza/i.test(label)) return 'thrownWeapon';
  return 'melee';
};

export class GameState {
  readonly campaign: CompiledCampaign;
  sceneId: SceneId;
  sceneEpoch = 1;
  revision = 0;
  stateRevision = 0;
  runtimeEpoch = crypto.randomUUID();
  characters = new Map<string, CharacterState>();
  creature: CreatureState | null;
  npcs = new Map<string, NpcState>();
  conditions: Record<string, CombatCondition[]> = {};
  conditionSources: Record<string, ConditionSource[]> = {};
  concentration: Record<string, { actionId: string; label: string }> = {};
  combat: CombatState = emptyCombat();
  camera = { mode: 'fixed' as 'fixed' | 'semiFixed' | 'follow', focusId: null as string | null };
  environment: EnvironmentState = { storm: false, lightning: false, stormIntensity: 0.5, timeOfDay: 'auto' };
  campRest: CampRestState | null = null;
  audio: AudioState = {
    music: freshTrack(0.3),
    layers: { ocean: freshTrack(0.5), wind: freshTrack(0.25), wood: freshTrack(0.2), storm: freshTrack(0.25) },
    sfxLoops: {}
  };
  projectorReady = false;
  interactions: RuntimeInteraction[] = [];
  progress: Record<string, boolean> = { wine: false, rose: false, steak: false, mirror: false, ending1: false, ending2: false, ending3: false };
  lastExplorationAction: DmState['lastExplorationAction'] = null;
  private objectScenes = new Map<SceneId, SceneObjectState>();

  private rowboat() { return this.campaign.public.campaignId === 'stormwreck-isle' ? this.npcs.get('wreck-rowboat') ?? null : null; }
  private rowboatFlag(characterId: string) { return `wreck.rowboat.aboard.${characterId}`; }
  private rowboatPilotFlag(characterId: string) { return `wreck.rowboat.pilot.${characterId}`; }
  private rowboatPassengers() {
    const boat = this.rowboat();
    return boat ? [...this.characters.values()].filter(character => this.progress[this.rowboatFlag(character.id)]
      && character.sceneId === boat.sceneId && character.surfaceId === boat.surfaceId && sameCell(character.cell, boat.cell)) : [];
  }
  private rowboatPilot() {
    const passengers = this.rowboatPassengers();
    return passengers.find(character => character.socketId && this.progress[this.rowboatPilotFlag(character.id)])
      ?? passengers.find(character => character.socketId)
      ?? passengers.find(character => this.progress[this.rowboatPilotFlag(character.id)]) ?? passengers[0] ?? null;
  }
  rowboatInteraction(character: CharacterState | null) {
    const boat = this.rowboat();
    if (!boat || !boat.visible || !character || this.combat.active || character.step || boat.step
      || character.sceneId !== boat.sceneId || character.surfaceId !== 'sea') return null;
    const distance = Math.max(Math.abs(character.cell.col - boat.cell.col), Math.abs(character.cell.row - boat.cell.row));
    if (this.progress[this.rowboatFlag(character.id)] && distance === 0) return { targetId: boat.id, label: 'Bajar de la barca' };
    const connected = distance === 0 || distance === 1 && this.terrainStepDestination(
      this.sceneById(boat.sceneId), 'sea', character.cell, boat.cell)?.surfaceId === 'sea';
    return connected ? { targetId: boat.id, label: 'Subir a la barca' } : null;
  }
  interactRowboat(characterId: string) {
    const character = this.characters.get(characterId), boat = this.rowboat();
    if (!character || !boat || !this.rowboatInteraction(character)) return 'TOO_FAR';
    const aboard = Boolean(this.progress[this.rowboatFlag(character.id)]);
    if (aboard) {
      const scene = this.sceneForCharacter(character);
      const exits = [{ col: -1, row: 0 }, { col: 0, row: -1 }, { col: 0, row: 1 }, { col: 1, row: 0 },
        { col: -1, row: -1 }, { col: -1, row: 1 }, { col: 1, row: -1 }, { col: 1, row: 1 }];
      const landing = exits.map(offset => ({ col: boat.cell.col + offset.col, row: boat.cell.row + offset.row }))
        .find(cell => this.terrainStepDestination(scene, 'sea', boat.cell, cell)?.surfaceId === 'sea'
          && !this.publicObjectProps(scene.id).some(prop => prop.surfaceId === 'sea' && prop.structure !== 'destroyed'
            && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(part => sameCell(part, cell)))
          && ![...this.characters.values()].some(other => other.id !== character.id && other.sceneId === scene.id
            && other.surfaceId === 'sea' && sameCell(other.cell, cell)));
      if (!landing) return 'NO_LANDING';
      character.cell = landing; this.progress[this.rowboatFlag(character.id)] = false;
      this.progress[this.rowboatPilotFlag(character.id)] = false;
      const nextPilot = this.rowboatPilot();
      if (nextPilot) this.progress[this.rowboatPilotFlag(nextPilot.id)] = true;
    } else {
      character.cell = cloneCell(boat.cell);
      this.progress[this.rowboatFlag(character.id)] = true;
      if (!this.rowboatPilot()) this.progress[this.rowboatPilotFlag(character.id)] = true;
    }
    character.input.held = null; character.moving = false;
    this.revision++; this.stateRevision++;
    return aboard ? 'ROWBOAT_LEFT' : 'ROWBOAT_BOARDED';
  }

  constructor(bundle: CampaignServerBundle) {
    this.campaign = compileCampaignBundle(bundle);
    this.sceneId = this.campaign.public.initialSceneId;
    this.audio.music.assetId = this.campaign.public.audio.library?.music[0]?.id;
    this.applySceneAudioProfile(this.sceneId);
    const scene = this.currentScene();
    this.campaign.public.roster.forEach((publicSeed, i) => {
      const secret = this.campaign.characters[publicSeed.id]!;
      this.characters.set(publicSeed.id, {
        ...publicSeed, hp: secret.initialHp ?? secret.maxHp, maxHp: secret.maxHp, inventory: [...secret.inventory], deathSaves: { successes: 0, failures: 0, stable: false }, sheet: secret.sheet ? structuredClone(secret.sheet) : null,
        combat: { armorClass: secret.combat?.armorClass ?? secret.sheet?.armorClass ?? 10, speedMeters: secret.combat?.speedMeters ?? secret.sheet?.speedMeters ?? 9, initiativeBonus: secret.combat?.initiativeBonus ?? 0, ...(secret.combat?.spellAttackBonus !== undefined ? { spellAttackBonus: secret.combat.spellAttackBonus } : {}), ...(secret.combat?.spellSaveDc !== undefined ? { spellSaveDc: secret.combat.spellSaveDc } : {}), attacks: combatActions(secret.combat?.attacks ?? [{ id: 'basic-attack', label: secret.sheet?.attacks[0] ?? 'Ataque básico', attackBonus: 0, damageDice: '1d4', damageBonus: 0 }]), resources: structuredClone(secret.combatResources ?? {}), ruleTraits: structuredClone(secret.combat?.ruleTraits ?? {}), damageResistances: [...(secret.combat?.damageResistances ?? [])], damageImmunities: [...(secret.combat?.damageImmunities ?? [])], conditionImmunities: [...(secret.combat?.conditionImmunities ?? [])] }, explorationActions: structuredClone(secret.explorationActions ?? []), explorationBasics: structuredClone(secret.explorationBasics ?? []),
        sceneId: scene.id, cell: cloneCell(scene.spawns[i] ?? scene.spawns[0]!), surfaceId: scene.surfaceId,
        facing: 'north', moving: false, step: null, sessionToken: null, socketId: null,
        input: { held: null, seq: -1, updatedAt: 0 }
      });
    });
    this.creature = this.campaign.encounter ? {
      ...this.campaign.encounter.creature, cell: cloneCell(this.campaign.encounter.creature.cell),
      sceneId: this.campaign.encounter.sceneId, surfaceId: this.sceneById(this.campaign.encounter.sceneId).surfaceId, facing: 'east', visible: false,
      hp: this.campaign.encounter.creature.sheet?.maxHp ?? 1, maxHp: this.campaign.encounter.creature.sheet?.maxHp ?? 1,
      armorClass: this.campaign.encounter.creature.sheet?.armorClass ?? 10, speedMeters: this.campaign.encounter.creature.sheet?.speedMeters ?? 9, initiativeBonus: this.campaign.encounter.creature.sheet?.combat?.initiativeBonus ?? 0,
      attacks: combatActions(this.campaign.encounter.creature.sheet?.combat?.attacks ?? [{ id: 'basic-attack', label: this.campaign.encounter.creature.sheet?.actions[0] ?? 'Ataque básico', attackBonus: 0, damageDice: '1d4', damageBonus: 0 }]),
      traits: structuredClone(this.campaign.encounter.creature.sheet?.traits ?? []), actions: structuredClone(this.campaign.encounter.creature.sheet?.actions ?? []), resources: {}, ruleTraits: structuredClone(this.campaign.encounter.creature.sheet?.combat?.ruleTraits ?? {}), damageResistances: [...(this.campaign.encounter.creature.sheet?.combat?.damageResistances ?? [])], damageImmunities: [...(this.campaign.encounter.creature.sheet?.combat?.damageImmunities ?? [])], conditionImmunities: [...(this.campaign.encounter.creature.sheet?.combat?.conditionImmunities ?? [])], mimicOfPlayerId: null
    } : null;
    for (const definition of this.campaign.public.scenes) for (const actor of definition.stageActors ?? []) {
      const profile = this.campaign.combatProfiles?.[actor.id];
      this.npcs.set(actor.id, { id: actor.id, identityId: profile?.identityId ?? actor.id, label: actor.label, tokenId: actor.tokenId, color: '#c69158', cell: cloneCell(actor.cell), surfaceId: actor.surfaceId ?? definition.surfaceId, sceneId: definition.id, facing: 'south', hp: profile?.maxHp ?? 10, maxHp: profile?.maxHp ?? 10, armorClass: profile?.armorClass ?? 10, speedMeters: profile?.speedMeters ?? 9, initiativeBonus: profile?.initiativeBonus ?? 0, attacks: combatActions(profile?.attacks ?? [{ id: 'basic-attack', label: 'Acción improvisada', attackBonus: 0, damageDice: '1d4', damageBonus: 0 }]), traits: structuredClone(profile?.traits ?? []), ruleTraits: structuredClone(profile?.ruleTraits ?? {}), damageResistances: [...(profile?.damageResistances ?? [])], damageImmunities: [...(profile?.damageImmunities ?? [])], conditionImmunities: [...(profile?.conditionImmunities ?? [])], combatEnabled: Boolean(profile) && (profile?.startsInCombat ?? true), visible: profile?.startsVisible ?? true, blocksMovement: false });
    }
    for (const actor of this.campaign.privateActors ?? []) {
      const profile = actor.profile;
      this.npcs.set(actor.id, { id: actor.id, identityId: profile.identityId ?? actor.id, label: actor.label, tokenId: actor.tokenId, color: actor.color,
        cell: cloneCell(actor.cell), surfaceId: actor.surfaceId, sceneId: actor.sceneId, facing: 'south',
        hp: profile.maxHp, maxHp: profile.maxHp, armorClass: profile.armorClass, speedMeters: profile.speedMeters,
        initiativeBonus: profile.initiativeBonus ?? 0, attacks: combatActions(profile.attacks), traits: structuredClone(profile.traits ?? []),
        ruleTraits: structuredClone(profile.ruleTraits ?? {}), damageResistances: [...(profile.damageResistances ?? [])],
        damageImmunities: [...(profile.damageImmunities ?? [])], conditionImmunities: [...(profile.conditionImmunities ?? [])],
        combatEnabled: profile.startsInCombat ?? true, visible: false, blocksMovement: true });
    }
    for (const sceneDefinition of this.campaign.scenes.values()) {
      const objects: ObjectRuntime[] = sceneDefinition.props.map(prop => {
        const seed = this.campaign.interactiveObjects?.find(candidate => candidate.sceneId === sceneDefinition.id && candidate.objectId === prop.id);
        const common: ObjectCommon = {
          id: prop.id, label: prop.label, assetId: prop.assetId, cell: cloneCell(prop.cell), surfaceId: prop.surfaceId ?? sceneDefinition.surfaceId, rotation: prop.rotation,
          baseFootprint: prop.baseFootprint.map(cloneCell), allowedRotations: [...prop.allowedRotations], capabilities: { ...prop.capabilities }, version: 0
        };
        if (prop.kind === 'wheel') return { ...common, kind: 'wheel', structure: 'intact', attachment: 'attached', state: prop.initialState, mount: { cell: cloneCell(prop.mount.cell), footprint: prop.mount.footprint.map(cloneCell), assetId: prop.mount.assetId } };
        return prop.kind === 'door'
          ? { ...common, kind: 'door', structure: 'intact', state: this.campaign.doorStates?.[sceneDefinition.id]?.[prop.id] ?? prop.initialState,
            ...(seed?.kind === 'barred-door' ? { interaction: { kind: 'barred-door' as const, barrier: seed.barrier } } : {}) }
          : { ...common, kind: 'crate', structure: 'intact', ...(seed && seed.kind !== 'barred-door' ? { interaction: seed.kind === 'trap-stash'
            ? { kind: seed.kind, revealed: seed.revealed, open: seed.open, trap: seed.trap, lootId: seed.lootId, lootLabel: seed.lootLabel, lootOwnerId: null }
            : seed.kind === 'container'
              ? { kind: seed.kind, open: seed.open, lootId: seed.lootId, lootLabel: seed.lootLabel, lootOwnerId: null }
              : { kind: seed.kind, open: seed.open, location: seed.location, package: seed.package, openedLocation: null, lootId: seed.lootId, lootLabel: seed.lootLabel, lootOwnerId: null, packageId: seed.packageId, packageLabel: seed.packageLabel, packageOwnerId: null } } : {}) };
      });
      this.objectScenes.set(sceneDefinition.id, { objects, undo: [], revision: 0 });
    }
  }

  currentScene(): SceneDefinition { return this.sceneById(this.sceneId); }
  sceneById(id: SceneId): SceneDefinition {
    const scene = this.campaign.scenes.get(id);
    if (!scene) throw new Error(`Escena desconocida: ${id}`);
    return scene;
  }
  hasScene(id: SceneId) { return this.campaign.scenes.has(id); }
  sceneForCharacter(character: CharacterState) { return this.sceneById(character.sceneId); }
  private walkableAt(sceneId: SceneId, surfaceId: string, cell: Cell) {
    const scene = this.sceneById(sceneId);
    if (!scene.terrain) return surfaceId === scene.surfaceId && scene.terrainWalkable.has(cellKey(cell));
    const surface = scene.terrain.surfaces.find(item => item.id === surfaceId);
    return Boolean(surface && !surface.visualOnly && surface.tiles.some(tile => sameCell(tile.cell, cell)));
  }
  private objectsFor(sceneId: SceneId) { return this.objectScenes.get(sceneId)?.objects ?? []; }
  /**
   * Collision masks are authored independently from an already-running table.
   * If a later mask marks an old staged-NPC cell as furniture, move only that
   * NPC to the nearest legal cell in the same scene. Invalid ids or surfaces
   * are deliberately left for normal save validation to reject.
   */
  private nearestWalkableCell(scene: SceneDefinition, requested: Cell) {
    if (scene.terrainWalkable.has(cellKey(requested))) return cloneCell(requested);
    let nearest: Cell | null = null, nearestDistance = Number.POSITIVE_INFINITY;
    for (const key of scene.terrainWalkable) {
      const coordinates = key.split(',');
      const col = Number(coordinates[0]!); const row = Number(coordinates[1]!);
      const distance = Math.abs(col - requested.col) + Math.abs(row - requested.row);
      if (!nearest || distance < nearestDistance || distance === nearestDistance && (row < nearest.row || row === nearest.row && col < nearest.col)) {
        nearest = { col, row }; nearestDistance = distance;
      }
    }
    return nearest;
  }
  private nearestTerrainCell(scene: SceneDefinition, surfaceId: string, requested: Cell) {
    const surface = scene.terrain?.surfaces.find(item => item.id === surfaceId && !item.visualOnly);
    if (!surface) return null;
    let nearest: Cell | null = null, nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of surface.tiles) {
      const cell = entry.cell, distance = Math.abs(cell.col - requested.col) + Math.abs(cell.row - requested.row);
      if (!nearest || distance < nearestDistance || distance === nearestDistance && (cell.row < nearest.row || cell.row === nearest.row && cell.col < nearest.col)) {
        nearest = cloneCell(cell); nearestDistance = distance;
      }
    }
    return nearest;
  }

  private wreckCharacterLevel() {
    return Math.max(1, ...[...this.characters.values()].map(character => character.sheet?.level ?? 1));
  }

  private wreckC8LootLabel(resultId: number) {
    return [
      'Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)',
      'Clavo de olor: 10 kg, 60 po',
      'Lingotes de plata: 10 de medio kilo, 5 po cada uno',
      'Candelabros de hueso de dragón tallado: pareja, 25 po cada uno',
      'Laúd: 50 po',
      'Pergamino de Orden imperiosa'
    ][resultId - 1] ?? null;
  }

  private isWreckC8LootObject(objectId: string) {
    // Include legacy barrel assignments for save/undo reconciliation; only
    // crates can receive new d6 rolls under the chapter 3 rules.
    return objectId.startsWith('c8-container-') || objectId.startsWith('c8-barrel-');
  }

  private pickupAvailable(sceneId: SceneId, pickup: PickupDefinition) {
    if (!pickup.unlockObjectId) return true;
    const gate = this.objectsFor(sceneId).find(object => object.id === pickup.unlockObjectId);
    return Boolean(gate?.kind === 'door' && (gate.structure === 'destroyed' || gate.state === 'open'));
  }

  private updateCharacterInventory(characterId: string | null | undefined, item: string, add: boolean) {
    if (!characterId || !item) return;
    const character = this.characters.get(characterId);
    if (!character) return;
    if (add) { if (!character.inventory.includes(item)) character.inventory.push(item); }
    else {
      const index = character.inventory.indexOf(item);
      if (index >= 0) character.inventory.splice(index, 1);
    }
  }

  private nearestFreeWreckCell(surfaceId: string, requested: Cell, exceptNpcId: string) {
    const sceneId = 'wreck-ship';
    const scene = this.sceneById(sceneId);
    const surface = scene.terrain?.surfaces.find(item => item.id === surfaceId && !item.visualOnly);
    if (!surface) return null;
    const occupied = new Set<string>();
    for (const character of this.characters.values()) if (character.sceneId === sceneId && character.surfaceId === surfaceId) {
      occupied.add(cellKey(character.cell));
      if (character.step) occupied.add(cellKey(character.step.from));
    }
    for (const npc of this.npcs.values()) if (npc.id !== exceptNpcId && npc.visible && npc.hp > 0 && npc.sceneId === sceneId && npc.surfaceId === surfaceId) occupied.add(cellKey(npc.cell));
    for (const object of this.objectsFor(sceneId)) if (object.surfaceId === surfaceId)
      for (const cell of this.blockingCells(object)) occupied.add(cellKey(cell));
    const candidates = surface.tiles.map(tile => tile.cell).sort((a, b) => {
      const distance = Math.abs(a.col - requested.col) + Math.abs(a.row - requested.row)
        - Math.abs(b.col - requested.col) - Math.abs(b.row - requested.row);
      return distance || a.row - b.row || a.col - b.col;
    });
    const cell = candidates.find(candidate => !occupied.has(cellKey(candidate)));
    return cell ? cloneCell(cell) : null;
  }

  private revealWreckNpcs(ids: string[], surfaceId: string, requestedCells: Record<string, Cell> = {}, relocateVisible = false) {
    let changed = false;
    for (const id of ids) {
      const npc = this.npcs.get(id);
      if (!npc || npc.hp <= 0 || npc.visible && !relocateVisible) continue;
      const surface = requestedCells[id] ? surfaceId : npc.surfaceId;
      const requested = requestedCells[id] ?? npc.cell;
      if (npc.visible && npc.surfaceId === surface && !requestedCells[id]) continue;
      const cell = this.nearestFreeWreckCell(surface, requested, id);
      if (!cell) continue;
      Object.assign(npc, { sceneId: 'wreck-ship', surfaceId: surface, cell, visible: true, combatEnabled: true });
      changed = true;
    }
    return changed;
  }

  private maybeRevealC4Zombies() {
    const door = this.objectsFor('wreck-ship').find(object => object.id === 'c4-barred-door');
    if (!door || !isDoor(door) || door.state !== 'open') return false;
    const count = this.wreckCharacterLevel() >= 2 ? 3 : 2;
    const alerted = this.progress['wreck.c3-wheel-fell'] || this.progress['wreck.c4-second-force-failed'];
    // Without an alarm they wander at their authored C4 cells. A fallen
    // wheel or a second Strength check puts them just behind the door.
    const nearDoor: Record<string, { col: number; row: number }> = alerted ? {
      'c4-zombie-1': this.expandedWreckCell(17, 4),
      'c4-zombie-2': this.expandedWreckCell(16, 4),
      'c4-zombie-3': this.expandedWreckCell(17, 5)
    } : {};
    return this.revealWreckNpcs(['c4-zombie-1', 'c4-zombie-2', 'c4-zombie-3'].slice(0, count), 'main', nearDoor);
  }

  private triggerHarpyReturn() {
    if (!this.progress['wreck.harpy-return-pending'] || this.progress['wreck.harpy-return-triggered'] || this.progress['wreck.harpy-resolved']) return false;
    const changed = this.revealWreckNpcs(['upper-harpy-1'], 'main', { 'upper-harpy-1': this.expandedWreckCell(23, 9) }, true);
    if (!changed) return false;
    this.progress['wreck.harpy-return-pending'] = false;
    this.progress['wreck.harpy-return-triggered'] = true;
    if (this.wreckCharacterLevel() >= 2) this.revealWreckNpcs(['upper-harpy-2'], 'c2', {}, true);
    return true;
  }

  private observeWreckLocationChange(character: CharacterState, fromSceneId: string, fromSurfaceId: string) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle') return;
    if (fromSceneId === 'dragon-rest' && character.sceneId === 'wreck-ship') this.progress['wreck.boat-arrived'] = true;
    if (fromSceneId !== 'wreck-ship' || character.sceneId !== 'wreck-ship') return;
    if (fromSurfaceId === 'sea' && character.surfaceId !== 'sea') this.progress['wreck.boarded'] = true;
    // The adventure triggers the harpy's return when the party finds (not
    // necessarily opens) the captain's chest. It sits immediately below the
    // C4/C8 shaft, so entering its two-cell vicinity in C9 records discovery.
    if (character.surfaceId === 'hold-air' && !this.progress['wreck.c9-chest-found']) {
      const chest = this.objectsFor('wreck-ship').find(object => object.id === 'c9-iron-chest');
      if (chest && Math.abs(character.cell.col - chest.cell.col) + Math.abs(character.cell.row - chest.cell.row) <= 2) {
        this.progress['wreck.c9-chest-found'] = true;
        this.stateRevision++;
      }
    }
    if (fromSurfaceId === 'hold-air' && character.surfaceId === 'lower-deck' && this.progress['wreck.c9-chest-found']) {
      this.progress['wreck.c9-returned-to-c8'] = true;
      if (!this.progress['wreck.harpy-resolved'] && !this.progress['wreck.harpy-return-triggered']) this.progress['wreck.harpy-return-pending'] = true;
    }
    if (fromSurfaceId !== 'main' && character.surfaceId === 'main') this.triggerHarpyReturn();
  }

  applyWreckProgressToggle(flag: string, value: boolean) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle') { this.progress[flag] = value; return 'APPLIED'; }
    const oneShot = flag.startsWith('wreck.c8-loot-') || [
      'wreck.boat-arrived', 'wreck.boarded', 'wreck.c3-wheel-fell', 'wreck.c4-second-force-failed',
      'wreck.c9-chest-found', 'wreck.c9-returned-to-c8', 'wreck.aboard-rest-completed',
      'wreck.harpy-return-triggered', 'wreck.harpy-resolved', 'wreck.journal-found', 'wreck.talisman-found',
      'wreck.items-given-to-runara', 'wreck.curse-grave', 'wreck.curse-aboard', 'wreck.curse-day-after',
      'wreck.cleric-dream', 'wreck.chapter-level-up'
    ].includes(flag);
    if (oneShot && this.progress[flag] && !value) return 'STORY_EVENT_ALREADY_RECORDED';
    if (flag.startsWith('wreck.c8-loot-') && value && this.progress[flag]) return 'LOOT_RESULT_ALREADY_USED';
    if (flag === 'wreck.curse-grave' && value && this.progress['wreck.curse-aboard']
      || flag === 'wreck.curse-aboard' && value && this.progress['wreck.curse-grave']) return 'CURSE_ALREADY_RESOLVED';
    if (flag === 'wreck.items-given-to-runara' && value && (!this.progress['wreck.journal-found'] || !this.progress['wreck.talisman-found'])) return 'CLUES_NOT_FOUND';
    const c9Chest = this.objectsFor('wreck-ship').find(object => object.id === 'c9-iron-chest');
    if (flag === 'wreck.package-opened' && value && !this.progress['wreck.c9-package-taken']) return 'PACKAGE_NOT_FOUND';
    if (flag === 'wreck.package-opened' && !value && (this.progress['wreck.items-given-to-runara'] || this.progress['wreck.curse-grave'] || this.progress['wreck.curse-aboard'])) return 'STORY_EVENT_ALREADY_RECORDED';
    if (flag === 'wreck.curse-grave' && value && !this.progress['wreck.items-given-to-runara']) return 'ITEMS_NOT_GIVEN_TO_RUNARA';
    if (flag === 'wreck.curse-aboard' && value && (!this.progress['wreck.talisman-found'] || this.progress['wreck.items-given-to-runara'])) return 'TALISMAN_NOT_AVAILABLE';
    if (flag === 'wreck.curse-aboard' && value && ![...this.characters.values()].some(character => character.sceneId === 'wreck-ship')) return 'PARTY_NOT_ABOARD';
    if (flag === 'wreck.aboard-rest-completed' && value && ![...this.characters.values()].some(character => character.sceneId === 'wreck-ship')) return 'PARTY_NOT_ABOARD';
    if (flag === 'wreck.curse-day-after' && value && !this.progress['wreck.curse-grave'] && !this.progress['wreck.curse-aboard']) return 'CURSE_NOT_RESOLVED';
    if (flag === 'wreck.curse-day-after' && value && [...this.characters.values()].some(character => character.sceneId === 'wreck-ship')) return 'PARTY_STILL_ABOARD';
    if (flag === 'wreck.harpy-resolved' && value && !this.progress['wreck.harpy-return-triggered']) return 'HARPY_NOT_RETURNED';
    if (flag === 'wreck.cleric-dream' && value && ((!this.progress['wreck.curse-grave'] && !this.progress['wreck.curse-aboard']) || !this.progress['wreck.curse-day-after'])) return 'DREAM_NOT_READY';
    if (flag === 'wreck.chapter-level-up' && value && !this.progress['wreck.curse-day-after']) return 'CHAPTER_NOT_COMPLETE';
    if (flag === 'wreck.chapter-level-up' && value) return 'USE_LEVEL_UP_ACTION';
    this.progress[flag] = value;
    if (flag === 'wreck.package-opened') {
      this.progress['wreck.journal-found'] = value;
      this.progress['wreck.talisman-found'] = value;
    }
    if (value && flag === 'wreck.items-given-to-runara' && c9Chest?.kind === 'crate' && c9Chest.interaction?.kind === 'chest')
      this.updateCharacterInventory(c9Chest.interaction.packageOwnerId, c9Chest.interaction.packageLabel, false);
    if (value && flag === 'wreck.curse-aboard' && c9Chest?.kind === 'crate' && c9Chest.interaction?.kind === 'chest')
      this.updateCharacterInventory(c9Chest.interaction.packageOwnerId, c9Chest.interaction.packageLabel, false);
    if (value && flag === 'wreck.c4-second-force-failed') this.maybeRevealC4Zombies();
    if (value && flag === 'wreck.aboard-rest-completed' && !this.progress['wreck.harpy-resolved'] && !this.progress['wreck.harpy-return-triggered'])
      this.progress['wreck.harpy-return-pending'] = true;
    if (value && flag === 'wreck.harpy-resolved') this.progress['wreck.harpy-return-pending'] = false;
    if (value && (flag === 'wreck.curse-grave' || flag === 'wreck.curse-aboard')) this.progress['wreck.curse-ended'] = true;
    return 'APPLIED';
  }

  applyWreckChapterLevelUp(level: 2 | 3) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle') return 'WRONG_CAMPAIGN';
    if (!this.progress['wreck.curse-day-after']) return 'CHAPTER_NOT_COMPLETE';
    if (this.progress['wreck.chapter-level-up']) return 'STORY_EVENT_ALREADY_RECORDED';
    if ([...this.characters.values()].some(character => !character.sheet)) return 'SHEET_NOT_FOUND';
    for (const character of this.characters.values()) {
      if (character.sheet && character.sheet.level < level) character.sheet.level = level;
    }
    this.progress['wreck.chapter-level-up'] = true;
    return 'APPLIED';
  }
  private expandedWreckCell(col: number, row: number): Cell {
    const terrain = this.campaign.public.scenes.find(scene => scene.id === 'wreck-ship')?.terrain;
    return {
      col: col + Math.max(0, Math.floor(((terrain?.cols ?? 44) - 44) / 2)),
      row: row + Math.max(0, Math.floor(((terrain?.rows ?? 20) - 20) / 2))
    };
  }
  /** Preserve old ship positions when the navigable sea margin is added, and
   * still migrate earlier 28 × 18 saves into the 66 m hull. */
  private migrateStormwreckGrid(payload: DurablePayload) {
    const version = payload.wreckGridVersion ?? 1;
    if (this.campaign.public.campaignId !== 'stormwreck-isle' || version >= 3) return;
    const mapCell = (sceneId: string, surfaceId: string, cell: Cell) => {
      if (!this.hasScene(sceneId)) return cloneCell(cell);
      const scene = this.sceneById(sceneId), terrain = scene.terrain;
      if (!terrain) return cloneCell(cell);
      if (sceneId === 'wreck-ship') {
        const local = version < 2 ? {
          col: Math.max(0, Math.min(43, Math.round(cell.col * 43 / 27))),
          row: Math.max(0, Math.min(19, Math.round(cell.row * 19 / 17)))
        } : cloneCell(cell);
        const expanded = this.expandedWreckCell(local.col, local.row);
        return this.nearestTerrainCell(scene, surfaceId, expanded) ?? expanded;
      }
      if (version >= 2) return cloneCell(cell);
      const scaled = {
        col: Math.max(0, Math.min(terrain.cols - 1, Math.round(cell.col * (terrain.cols - 1) / 27))),
        row: Math.max(0, Math.min(terrain.rows - 1, Math.round(cell.row * (terrain.rows - 1) / 17)))
      };
      return this.nearestTerrainCell(scene, surfaceId, scaled) ?? scaled;
    };
    for (const saved of payload.characters) saved.cell = mapCell(saved.sceneId ?? payload.sceneId, saved.surfaceId, saved.cell);
    for (const saved of payload.npcs ?? []) saved.cell = mapCell(saved.sceneId, saved.surfaceId, saved.cell);
    if (payload.creature) payload.creature.cell = mapCell(payload.creature.sceneId, payload.creature.surfaceId, payload.creature.cell);
    for (const savedScene of payload.scenes) {
      if (!this.hasScene(savedScene.sceneId)) continue;
      const scene = this.sceneById(savedScene.sceneId), definitions = this.objectScenes.get(savedScene.sceneId)?.objects ?? [];
      const occupied = new Set<string>();
      for (const saved of savedScene.objects) {
        const definition = definitions.find(item => item.id === saved.id);
        if (!definition) continue;
        const surfaceId = definition.capabilities.transform ? saved.surfaceId ?? definition.surfaceId : definition.surfaceId;
        if (!definition.capabilities.transform) {
          saved.cell = cloneCell(definition.cell);
          if (saved.surfaceId !== undefined) saved.surfaceId = surfaceId;
          continue;
        }
        if (saved.kind === 'wheel' && saved.attachment === 'attached' && definition.kind === 'wheel') {
          saved.cell = cloneCell(definition.mount.cell); saved.rotation = definition.rotation;
          if (saved.surfaceId !== undefined) saved.surfaceId = definition.surfaceId;
          continue;
        }
        const scaled = scene.id === 'wreck-ship'
          ? this.expandedWreckCell(version < 2
            ? Math.max(0, Math.min(43, Math.round(saved.cell.col * 43 / 27))) : saved.cell.col,
            version < 2 ? Math.max(0, Math.min(19, Math.round(saved.cell.row * 19 / 17))) : saved.cell.row)
          : version >= 2 ? cloneCell(saved.cell) : {
            col: Math.max(0, Math.min((scene.terrain?.cols ?? 28) - 1, Math.round(saved.cell.col * ((scene.terrain?.cols ?? 28) - 1) / 27))),
            row: Math.max(0, Math.min((scene.terrain?.rows ?? 18) - 1, Math.round(saved.cell.row * ((scene.terrain?.rows ?? 18) - 1) / 17)))
          };
        const surface = scene.terrain?.surfaces.find(item => item.id === surfaceId && !item.visualOnly);
        const candidates = surface?.tiles.map(entry => cloneCell(entry.cell)).sort((a, b) =>
          Math.abs(a.col - scaled.col) + Math.abs(a.row - scaled.row) - Math.abs(b.col - scaled.col) - Math.abs(b.row - scaled.row) || a.row - b.row || a.col - b.col) ?? [];
        const candidate = candidates.find(cell => footprintFor(cell, saved.rotation, definition.baseFootprint).every(part =>
          surface?.tiles.some(entry => sameCell(entry.cell, part)) && !occupied.has(`${surfaceId}:${cellKey(part)}`)));
        if (candidate) saved.cell = candidate;
        if (saved.surfaceId !== undefined) saved.surfaceId = surfaceId;
        for (const part of footprintFor(saved.cell, saved.rotation, definition.baseFootprint)) occupied.add(`${surfaceId}:${cellKey(part)}`);
      }
    }
    payload.wreckGridVersion = 3;
  }
  private migrateSavedNpcCells(payload: DurablePayload) {
    if (!payload.npcs) return;
    for (const saved of payload.npcs) {
      if (!this.hasScene(saved.sceneId)) continue;
      const scene = this.sceneById(saved.sceneId);
      if (this.walkableAt(saved.sceneId, saved.surfaceId, saved.cell)) continue;
      const relocated = this.nearestTerrainCell(scene, saved.surfaceId, saved.cell) ?? this.nearestWalkableCell(scene, saved.cell);
      if (relocated) saved.cell = relocated;
    }
  }

  private migrateCampRestLegacyRoomDoors(payload: DurablePayload) {
    if (!this.campaign.public.scenes.some(scene => scene.id === 'camp-a1-rooms')) return;
    const savedRooms = payload.scenes.find(scene => scene.sceneId === 'camp-a1-rooms');
    if (!savedRooms) return;
    const currentObjectIds = new Set((this.objectScenes.get('camp-a1-rooms')?.objects ?? []).map(object => object.id));
    // V1.3 stored the six room entrances in A1 as editable DM door objects.
    // V1.4 renders those architectural openings in the independent room scene,
    // so retain any still-supported object ID and drop only the removed legacy IDs.
    savedRooms.objects = savedRooms.objects.filter(object => currentObjectIds.has(object.id) || !/^a1-(?:lower|upper)-door-[1-3]$/.test(object.id));
  }
  /** Earlier Stormwreck saves predate the five camp maps. Their scenes have no
   * editable objects, so add only those empty records during restore; preserve
   * all existing character positions, campaign events and map state. */
  private migrateCombinedStormwreckCampScenes(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle') return;
    const savedIds = new Set(payload.scenes.map(scene => scene.sceneId));
    for (const scene of this.campaign.public.scenes.filter(candidate => candidate.camp)) {
      if (savedIds.has(scene.id)) continue;
      const objects = this.objectScenes.get(scene.id)?.objects ?? [];
      if (objects.length !== 0) continue;
      payload.scenes.push({ sceneId: scene.id, objects: [] });
      savedIds.add(scene.id);
    }
  }
  /** Repair actors stranded by geometry changes while keeping each character's
   * map, deck, and relative position whenever that address still exists. */
  private migrateStormwreckActorCells(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle') return;
    const actors = [
      ...payload.characters.map(saved => ({ saved, sceneId: saved.sceneId ?? payload.sceneId })),
      ...(payload.npcs ?? []).map(saved => ({ saved, sceneId: saved.sceneId })),
      ...(payload.creature ? [{ saved: payload.creature, sceneId: payload.creature.sceneId }] : [])
    ];
    const occupied = new Set(actors.map(({ saved, sceneId }) => `${sceneId}:${saved.surfaceId}:${cellKey(saved.cell)}`));
    for (const actor of actors) {
      const saved = actor.saved;
      let sceneId = saved.sceneId ?? actor.sceneId;
      if (sceneId === 'wreck-upper' && saved.surfaceId === 'crow') {
        occupied.delete(`${sceneId}:${saved.surfaceId}:${cellKey(saved.cell)}`);
        sceneId = 'wreck-crow'; saved.sceneId = sceneId;
        saved.cell = this.nearestTerrainCell(this.sceneById(sceneId), 'crow', this.expandedWreckCell(22, 7)) ?? saved.cell;
        occupied.add(`${sceneId}:crow:${cellKey(saved.cell)}`);
      }
      if (!this.hasScene(sceneId)) continue;
      const scene = this.sceneById(sceneId), surface = scene.terrain?.surfaces.find(item => item.id === saved.surfaceId && !item.visualOnly);
      if (!surface) continue; // Invalid surface IDs remain a hard save error.
      const savedScene = payload.scenes.find(item => item.sceneId === sceneId);
      const blocked = new Set((savedScene?.objects ?? []).filter(object => object.structure !== 'destroyed' && (object.kind !== 'door' || object.state !== 'open'))
        .flatMap(object => {
          const definition = this.objectScenes.get(sceneId)?.objects.find(item => item.id === object.id);
          return definition && (object.surfaceId ?? definition.surfaceId) === saved.surfaceId
            ? footprintFor(object.cell, object.rotation, definition.baseFootprint).map(cell => cellKey(cell)) : [];
        }));
      const occupancyKey = `${sceneId}:${saved.surfaceId}:${cellKey(saved.cell)}`;
      occupied.delete(occupancyKey);
      const legal = (cell: Cell) => !blocked.has(cellKey(cell)) && !occupied.has(`${sceneId}:${saved.surfaceId}:${cellKey(cell)}`);
      if (!this.walkableAt(sceneId, saved.surfaceId, saved.cell) || !legal(saved.cell)) {
        const candidates = surface.tiles.map(entry => cloneCell(entry.cell)).filter(legal).sort((a, b) =>
          Math.abs(a.col - saved.cell.col) + Math.abs(a.row - saved.cell.row) - Math.abs(b.col - saved.cell.col) - Math.abs(b.row - saved.cell.row) || a.row - b.row || a.col - b.col);
        if (candidates[0]) saved.cell = candidates[0];
      }
      occupied.add(`${sceneId}:${saved.surfaceId}:${cellKey(saved.cell)}`);
    }
  }
  /** D8 Night originally shared a temporary roster with the Stormwreck demo.
   * Its private saves are now a one-character table (María).  Keep the real
   * D8 state while removing only those obsolete demo records; no other
   * campaign receives this compatibility migration. */
  private migrateD8NightLegacyRoster(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'd8-night-private') return;
    payload.characters = payload.characters.filter(character => this.characters.has(character.id));
    // Silverfarben conserva los valores de su ficha original. Las hojas que
    // el jugador haya editado después siguen siendo la fuente de verdad.
    // Los guardados antiguos no deben impedir añadir nuevos jugadores a D8.
    const presentCharacters = new Set(payload.characters.map(character => character.id));
    const savedScene = this.hasScene(payload.sceneId) ? this.sceneById(payload.sceneId) : this.currentScene();
    for (const character of this.characters.values()) if (!presentCharacters.has(character.id)) payload.characters.push({
      id: character.id, hp: character.hp, inventory: [...character.inventory], resources: structuredClone(character.combat.resources), sceneId: savedScene.id, cell: cloneCell(savedScene.spawns[0] ?? character.cell), surfaceId: savedScene.surfaceId, facing: character.facing
    });
    if (payload.npcs) {
      payload.npcs = payload.npcs.filter(npc => this.npcs.has(npc.id));
      const savedIds = new Set(payload.npcs.map(npc => npc.id));
      for (const npc of this.npcs.values()) if (!savedIds.has(npc.id)) payload.npcs.push({
        id: npc.id, sceneId: npc.sceneId, surfaceId: npc.surfaceId, cell: cloneCell(npc.cell), facing: npc.facing,
        hp: npc.hp, combatEnabled: npc.combatEnabled, visible: npc.visible
      });
    }
    // Before the mirror became a prop it was saved as a scenic NPC. Add the
    // non-character object when opening those campaigns so valid tables do not
    // lose their checkpoint just because the visual model improved.
    const mirrorScene = payload.scenes.find(scene => scene.sceneId === 'mirror');
    if (mirrorScene && !mirrorScene.objects.some(object => object.id === 'true-love-mirror')) {
      const mirror = this.objectScenes.get('mirror')?.objects.find(object => object.id === 'true-love-mirror');
      if (mirror) mirrorScene.objects.push({ id: 'true-love-mirror', kind: 'crate', cell: cloneCell(mirror.cell), rotation: 0, structure: 'intact' });
    }
    const validEntityIds = new Set([...this.characters.keys(), ...this.npcs.keys(), ...(this.creature ? [this.creature.id] : [])]);
    if (payload.combat?.active && (!payload.combat.participantIds.every(id => validEntityIds.has(id)) || !payload.combat.order.every(id => validEntityIds.has(id)))) payload.combat = null;
    if (payload.camera.focusId && !validEntityIds.has(payload.camera.focusId)) payload.camera.focusId = null;
  }
  /** Keep existing private D8 saves on the same locations when the new 2.5D
   * maps replace the provisional 32 × 21 authoring grids with metre-aligned
   * tactical cells. The version marker prevents scaling an already-upgraded
   * save a second time. */
  private migrateD8NightGrid(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'd8-night-private' || (payload.d8GridVersion ?? 1) >= 2) return false;
    const legacySize = (sceneId: string) => sceneId === 'garden' ? { cols: 29, rows: 21 } : { cols: 32, rows: 21 };
    const remap = (sceneId: string, cell: Cell): Cell => {
      const definition = this.campaign.public.scenes.find(scene => scene.id === sceneId);
      if (!definition) return cloneCell(cell);
      const old = legacySize(sceneId), target = {
        col: Math.max(0, Math.min(definition.grid.cols - 1, Math.floor((cell.col + .5) * definition.grid.cols / old.cols))),
        row: Math.max(0, Math.min(definition.grid.rows - 1, Math.floor((cell.row + .5) * definition.grid.rows / old.rows)))
      };
      const walkable = definition.walkable;
      const legal = new Set(walkable.map(item => cellKey(item)));
      if (legal.has(cellKey(target))) return target;
      return [...walkable].sort((a, b) => Math.abs(a.col - target.col) + Math.abs(a.row - target.row)
        - Math.abs(b.col - target.col) - Math.abs(b.row - target.row) || a.row - b.row || a.col - b.col)[0] ?? target;
    };
    for (const saved of payload.scenes) {
      const definition = this.campaign.public.scenes.find(scene => scene.id === saved.sceneId);
      if (!definition) continue;
      for (const object of saved.objects) object.cell = remap(saved.sceneId, object.cell);
    }
    for (const character of payload.characters) character.cell = remap(character.sceneId ?? payload.sceneId, character.cell);
    for (const npc of payload.npcs ?? []) npc.cell = remap(npc.sceneId, npc.cell);
    if (payload.creature) payload.creature.cell = remap(payload.creature.sceneId, payload.creature.cell);
    payload.d8GridVersion = 2;
    return true;
  }
  /** Collapse legacy deck-specific scene IDs into the one physical ship scene.
   * Surface IDs retain each actor's height; no character is teleported to the
   * DM's currently focused area. */
  private migrateStormwreckScenes(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle') return;
    const shipSceneIds = new Set(['wreck-deck', 'wreck-upper', 'wreck-crow', 'wreck-main', 'wreck-lower', 'wreck-hold']);
    const remapSceneId = (id: string) => shipSceneIds.has(id) ? 'wreck-ship' : id;
    const scaleLegacyDeckCell = (cell: Cell): Cell => ({
      col: Math.max(0, Math.min(43, Math.round(cell.col * 43 / 31))),
      row: Math.max(0, Math.min(19, Math.round(cell.row * 19 / 20)))
    });
    const remapSurface = (surfaceId: string) => surfaceId === 'deck' ? 'main'
      : surfaceId === 'lower-water' ? 'lower-deck' : surfaceId === 'hold-water' ? 'hold-air' : surfaceId;
    const remapActor = (actor: { sceneId: string; surfaceId: string; cell: Cell }) => {
      const previousSceneId = actor.sceneId;
      if (previousSceneId === 'wreck-deck') actor.cell = scaleLegacyDeckCell(actor.cell);
      actor.sceneId = remapSceneId(previousSceneId);
      if (shipSceneIds.has(previousSceneId)) actor.surfaceId = remapSurface(actor.surfaceId);
      if (!this.hasScene(actor.sceneId)) return;
      const scene = this.sceneById(actor.sceneId);
      if (!scene.terrain?.surfaces.some(surface => surface.id === actor.surfaceId && !surface.visualOnly)) actor.surfaceId = scene.surfaceId;
      if (!(actor.sceneId === 'wreck-ship' && (payload.wreckGridVersion ?? 1) < 3)
        && !this.walkableAt(actor.sceneId, actor.surfaceId, actor.cell)) actor.cell = this.nearestTerrainCell(scene, actor.surfaceId, actor.cell) ?? scene.spawns[0]!;
    };
    payload.sceneId = remapSceneId(payload.sceneId);
    for (const actor of payload.characters) {
      const entry = { sceneId: actor.sceneId ?? payload.sceneId, surfaceId: actor.surfaceId, cell: actor.cell };
      remapActor(entry); actor.sceneId = entry.sceneId; actor.surfaceId = entry.surfaceId; actor.cell = entry.cell;
    }
    for (const actor of payload.npcs ?? []) remapActor(actor);
    if (payload.creature) remapActor(payload.creature);

    const saveObject = (object: ObjectRuntime) => {
      const common = { id: object.id, cell: cloneCell(object.cell), surfaceId: object.surfaceId, rotation: object.rotation, structure: object.structure };
      if (object.kind === 'door') return { ...common, kind: 'door' as const, state: object.state, ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
      if (object.kind === 'wheel') return { ...common, kind: 'wheel' as const, attachment: object.attachment, state: object.state };
      return { ...common, kind: 'crate' as const, ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
    };
    const merged = new Map<string, { sceneId: string; objects: DurablePayload['scenes'][number]['objects'] }>();
    const existingShipRecord = payload.scenes.find(scene => scene.sceneId === 'wreck-ship');
    const orderedRecords = [...payload.scenes.filter(scene => scene !== existingShipRecord), ...(existingShipRecord ? [existingShipRecord] : [])];
    for (const savedScene of orderedRecords) {
      const previousSceneId = savedScene.sceneId, sceneId = remapSceneId(previousSceneId);
      if (!this.objectScenes.has(sceneId)) continue;
      let target = merged.get(sceneId);
      if (!target) { target = { sceneId, objects: [] }; merged.set(sceneId, target); }
      const definitions = this.objectScenes.get(sceneId)!.objects;
      for (const saved of savedScene.objects) {
        const definition = definitions.find(object => object.id === saved.id);
        if (!definition) continue;
        const object = structuredClone(saved);
        if (previousSceneId === 'wreck-deck') object.cell = scaleLegacyDeckCell(object.cell);
        object.surfaceId = remapSurface(object.surfaceId ?? definition.surfaceId);
        if (!(sceneId === 'wreck-ship' && (payload.wreckGridVersion ?? 1) < 3)
          && !this.walkableAt(sceneId, object.surfaceId, object.cell)) {
          object.surfaceId = definition.surfaceId;
          object.cell = this.nearestTerrainCell(this.sceneById(sceneId), object.surfaceId, object.cell) ?? definition.cell;
        }
        if (object.kind === 'wheel' && definition.kind === 'wheel' && object.attachment === 'attached') {
          object.cell = cloneCell(definition.mount.cell); object.surfaceId = definition.surfaceId; object.rotation = definition.rotation; object.state = 'upright';
        }
        const existingIndex = target.objects.findIndex(candidate => candidate.id === object.id);
        if (existingIndex < 0) target.objects.push(object); else target.objects[existingIndex] = object;
      }
    }
    payload.scenes = [...merged.values()];
    for (const [sceneId, state] of this.objectScenes) {
      let savedScene = payload.scenes.find(scene => scene.sceneId === sceneId);
      if (!savedScene) { savedScene = { sceneId, objects: state.objects.map(saveObject) }; payload.scenes.push(savedScene); continue; }
      const present = new Set(savedScene.objects.map(object => object.id));
      for (const object of state.objects) if (!present.has(object.id)) savedScene.objects.push(saveObject(object));
    }
  }
  /** Add newly prepared M3 enemies to older Stormwreck saves without moving
   * players, replacing existing NPC state, or revealing a creature. */
  private migrateStormwreckM3Actors(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle' || !this.campaign.privateActors?.length) return;
    payload.npcs ??= [];
    const present = new Set(payload.npcs.map(npc => npc.id));
    for (const actor of this.campaign.privateActors) if (!present.has(actor.id)) {
      const npc = this.npcs.get(actor.id)!;
      payload.npcs.push({ id: npc.id, sceneId: npc.sceneId, surfaceId: npc.surfaceId, cell: cloneCell(npc.cell),
        facing: npc.facing, hp: npc.hp, maxHp: npc.maxHp, combatEnabled: npc.combatEnabled, visible: false });
    }
  }
  /** Older saves can predate interaction metadata added to authored doors and
   * containers. Restore only absent metadata from the matching authored object;
   * explicit saved state (open/closed, loot, ownership, etc.) remains intact. */
  private migrateMissingObjectInteractions(payload: DurablePayload) {
    let migrated = false;
    for (const savedScene of payload.scenes) {
      const definitions = this.objectScenes.get(savedScene.sceneId)?.objects;
      if (!definitions) continue;
      for (const saved of savedScene.objects) {
        const definition = definitions.find(object => object.id === saved.id);
        if (saved.kind === 'door' && definition?.kind === 'door' && !saved.interaction && definition.interaction) {
          saved.interaction = structuredClone(definition.interaction);
          migrated = true;
        } else if (saved.kind === 'crate' && definition?.kind === 'crate' && !saved.interaction && definition.interaction) {
          saved.interaction = structuredClone(definition.interaction);
          migrated = true;
        }
      }
    }
    return migrated;
  }
  get objectRevision() { return this.currentObjectState().revision; }
  get wheelState() {
    return this.currentObjects().find(isWheel)?.state ?? 'upright';
  }

  claim(sessionToken: string, socketId: string, characterId: string) {
    const existing = [...this.characters.values()].find(character => character.sessionToken === sessionToken);
    if (existing) {
      const replacedSocketId = existing.socketId && existing.socketId !== socketId ? existing.socketId : null;
      if (replacedSocketId) this.cancelInteractionsForCharacter(existing.id);
      existing.socketId = socketId;
      existing.input = { held: null, seq: -1, updatedAt: 0 };
      return { ok: true, character: existing, replacedSocketId };
    }
    const character = this.characters.get(characterId);
    if (!character || character.sessionToken) return { ok: false, character: null, replacedSocketId: null };
    character.sessionToken = sessionToken; character.socketId = socketId;
    character.input = { held: null, seq: -1, updatedAt: 0 };
    return { ok: true, character, replacedSocketId: null };
  }

  characterForSession(token: string) {
    return [...this.characters.values()].find(character => character.sessionToken === token) ?? null;
  }

  private opportunityAttackFor(moverId: string, destination: Cell, checked: string[], destinationSurfaceId?: string) {
    if (!this.combat.active || this.combat.stances[moverId]?.action === 'disengage' || this.conditionsFor(moverId).includes('invisible')) return null;
    const mover = this.combatEntity(moverId), from = this.entityCell(moverId);
    if (!mover || !from || destinationSurfaceId && destinationSurfaceId !== this.entitySurfaceId(moverId)) return null;
    for (const reactorId of this.combat.participantIds) {
      if (checked.includes(reactorId) || reactorId === moverId || this.combat.reactionUsed[reactorId]) continue;
      const reactor = this.combatEntity(reactorId), reactorCell = this.entityCell(reactorId);
      const conditions = this.conditionsFor(reactorId);
      if (!reactor || !reactorCell || reactor.controller === mover.controller || reactor.hp <= 0 || conditions.includes('inconsciente') || conditions.includes('paralizada')) continue;
      if (this.entitySceneId(reactorId) !== this.entitySceneId(moverId) || this.entitySurfaceId(reactorId) !== this.entitySurfaceId(moverId)) continue;
      const action = reactor.attacks.find(candidate => candidate.range?.kind === 'melee' && candidate.resolution !== 'guided');
      if (!action) continue;
      const reachSquares = Math.max(1, Math.ceil(action.range!.normalMeters / 1.5));
      const before = Math.max(Math.abs(from.col - reactorCell.col), Math.abs(from.row - reactorCell.row));
      const after = Math.max(Math.abs(destination.col - reactorCell.col), Math.abs(destination.row - reactorCell.row));
      if (before <= reachSquares && after > reachSquares) return { reactorId, action };
    }
    return null;
  }

  private queueOpportunityMovement(entityId: string, destination: Cell, destinationSurfaceId?: string, reactorsChecked: string[] = []) {
    const candidate = this.opportunityAttackFor(entityId, destination, reactorsChecked, destinationSurfaceId);
    if (!candidate) return false;
    const movement: PendingMovement = { entityId, destination: cloneCell(destination), ...(destinationSurfaceId ? { destinationSurfaceId } : {}), reactorsChecked: [...reactorsChecked, candidate.reactorId] };
    this.combat.pending = { id: crypto.randomUUID(), stage: 'reaction', attackerId: candidate.reactorId, targetId: entityId, actionId: candidate.action.id, advantage: 'normal', opportunity: true, movement };
    this.setCombatEvent(`${this.combatEntity(candidate.reactorId)?.label ?? 'Una criatura'} puede usar su reacción para un ataque de oportunidad contra ${this.combatEntity(entityId)?.label ?? 'el objetivo'}.`, 'turn');
    return true;
  }

  startStep(character: CharacterState, facing: Facing, now = Date.now()) {
    if (character.step) return false;
    const scene = this.sceneForCharacter(character);
    if (!scene.movementEnabled) { character.moving = false; return false; }
    if (this.progress[this.rowboatFlag(character.id)] && this.rowboatPassengers().includes(character))
      return this.startRowboatStep(character, facing, now);
    const offset = ({ north: [0, -1], 'north-east': [1, -1], east: [1, 0], 'south-east': [1, 1], south: [0, 1], 'south-west': [-1, 1], west: [-1, 0], 'north-west': [-1, -1] } as const)[facing];
    const props = this.publicObjectProps(character.sceneId);
    const horizontal = offset[0] > 0 ? 'east' : 'west', vertical = offset[1] > 0 ? 'south' : 'north';
    // With the ship's 45° camera, one WASD key requests a diagonal grid step.
    // Beside a wall, slide along a free cardinal neighbor instead of sticking.
    const candidateFacings: Facing[] = scene.id === 'wreck-ship' && offset[0] && offset[1]
      ? [facing, horizontal, vertical] : [facing];
    const candidates = candidateFacings.map(candidateFacing => {
      const candidateOffset = ({ north: [0, -1], 'north-east': [1, -1], east: [1, 0], 'south-east': [1, 1], south: [0, 1], 'south-west': [-1, 1], west: [-1, 0], 'north-west': [-1, -1] } as const)[candidateFacing];
      const requested = { col: character.cell.col + candidateOffset[0], row: character.cell.row + candidateOffset[1] };
      const destination = scene.terrain
        ? this.terrainStepDestination(scene, character.surfaceId, character.cell, requested)
        : resolveStep(scene, character.cell, candidateFacing, props)
          ? { surfaceId: character.surfaceId, cell: requested } : null;
      if (!destination) return null;
      const blocked = props.some(prop => prop.surfaceId === destination.surfaceId && prop.structure !== 'destroyed'
        && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(cell => sameCell(cell, destination.cell)));
      const occupied = [...this.characters.values()].some(item => item.id !== character.id && Boolean(item.sessionToken) && item.sceneId === character.sceneId
        && item.surfaceId === destination.surfaceId && sameCell(item.cell, destination.cell));
      return blocked || occupied ? null : { destination, facing: candidateFacing };
    });
    const chosen = candidates.find(candidate => candidate !== null);
    const next = chosen?.destination.cell ?? null, nextSurfaceId = chosen?.destination.surfaceId ?? character.surfaceId;
    character.facing = chosen?.facing ?? facing;
    if (!next) {
      // En una escalera de cuerda o una salida al agua, seguir físicamente
      // hacia el acceso puede ser una acción de portal sin casilla contigua.
      const landing = this.campaign.ports?.find(port => ['rope-ladder', 'rigging', 'swim'].includes(port.mode)
        && port.to.mapId === character.sceneId && port.to.surfaceId === character.surfaceId && sameCell(port.to.cell, character.cell)
        && (port.from.cell.col !== port.to.cell.col || port.from.cell.row !== port.to.cell.row)
        && offset[0] === Math.sign(port.from.cell.col - port.to.cell.col)
        && offset[1] === Math.sign(port.from.cell.row - port.to.cell.row));
      if (landing && this.traversePort(character.id, landing.id, 'return') === 'MOVED') return true;
      character.moving = false; return false;
    }
    const movementCost = this.movementCost(character.sceneId, nextSurfaceId, next);
    if (!this.canSpendMovement(character.id, movementCost)) { character.moving = false; return false; }
    if (this.combat.pending) { character.moving = false; return false; }
    if (this.queueOpportunityMovement(character.id, next, nextSurfaceId)) { character.input.held = null; character.moving = false; this.revision++; this.stateRevision++; return true; }
    this.cancelInteractionsForCharacter(character.id);
    const from = cloneCell(character.cell);
    character.cell = cloneCell(next);
    character.step = { from, to: cloneCell(next), fromSurfaceId: character.surfaceId, toSurfaceId: nextSurfaceId, startedAt: now, durationMs: STEP_DURATION_MS };
    character.moving = true; this.spendMovement(character.id, movementCost); this.revision++; this.stateRevision++;
    return true;
  }

  private startRowboatStep(character: CharacterState, facing: Facing, now: number) {
    const boat = this.rowboat();
    if (!boat || boat.step || this.rowboatPilot()?.id !== character.id || this.combat.active) return false;
    const offsets: Record<Facing, [number, number]> = {
      north: [0, -1], 'north-east': [1, -1], east: [1, 0], 'south-east': [1, 1],
      south: [0, 1], 'south-west': [-1, 1], west: [-1, 0], 'north-west': [-1, -1]
    };
    const offset = offsets[facing], requested = { col: boat.cell.col + offset[0], row: boat.cell.row + offset[1] };
    const destination = this.terrainStepDestination(this.sceneById(boat.sceneId), 'sea', boat.cell, requested);
    if (!destination || destination.surfaceId !== 'sea') return false;
    const blocked = this.publicObjectProps(boat.sceneId).some(prop => prop.surfaceId === 'sea' && prop.structure !== 'destroyed'
      && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(cell => sameCell(cell, requested)));
    const passengers = this.rowboatPassengers();
    const occupied = [...this.characters.values()].some(other => !passengers.includes(other) && other.sceneId === boat.sceneId
      && other.surfaceId === 'sea' && sameCell(other.cell, requested))
      || Boolean(this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === boat.sceneId
        && this.creature.surfaceId === 'sea' && sameCell(this.creature.cell, requested))
      || [...this.npcs.values()].some(npc => npc.id !== boat.id && npc.blocksMovement && npc.visible && npc.hp > 0
        && npc.sceneId === boat.sceneId && npc.surfaceId === 'sea' && sameCell(npc.cell, requested));
    if (blocked || occupied) return false;
    const from = cloneCell(boat.cell), step: StepState = { from, to: cloneCell(requested), fromSurfaceId: 'sea', toSurfaceId: 'sea', startedAt: now, durationMs: STEP_DURATION_MS };
    boat.cell = cloneCell(requested); boat.facing = facing; boat.step = structuredClone(step);
    for (const passenger of passengers) {
      this.cancelInteractionsForCharacter(passenger.id);
      passenger.cell = cloneCell(requested); passenger.facing = facing;
      passenger.step = structuredClone(step); passenger.moving = true;
    }
    this.revision++; this.stateRevision++;
    return true;
  }

  private speedSquares(entityId: string) {
    const character = this.characters.get(entityId);
    const npc = this.npcs.get(entityId);
    const meters = character?.combat.speedMeters ?? (this.creature?.id === entityId ? this.creature.speedMeters : npc?.speedMeters ?? 9);
    return Math.max(1, Math.round(meters / 1.5));
  }
  private currentCombatId() { return this.combat.active && !this.combat.initiativePending ? this.combat.order[this.combat.turnIndex] ?? null : null; }
  private combatMovement() {
    const actorId = this.currentCombatId();
    if (!actorId) return null;
    const maximumSquares = this.speedSquares(actorId) + (this.combat.dashSquares[actorId] ?? 0), spentSquares = this.combat.spentSquares[actorId] ?? 0;
    return { actorId, maximumSquares, spentSquares, remainingSquares: Math.max(0, maximumSquares - spentSquares) };
  }
  combatEntity(id: string) {
    const character = this.characters.get(id);
    if (character) return { id, label: character.label, kind: 'player' as const, controller: 'player' as const, hp: character.hp, maxHp: character.maxHp, armorClass: character.combat.armorClass, speedMeters: character.combat.speedMeters, initiativeBonus: character.combat.initiativeBonus, attacks: character.combat.attacks, ruleTraits: character.combat.ruleTraits, damageResistances: character.combat.damageResistances, damageImmunities: character.combat.damageImmunities, conditionImmunities: character.combat.conditionImmunities, deathSaves: character.deathSaves };
    if (this.creature?.id === id) return { id, label: this.creature.label, kind: 'creature' as const, controller: 'dm' as const, hp: this.creature.hp, maxHp: this.creature.maxHp, armorClass: this.creature.armorClass, speedMeters: this.creature.speedMeters, initiativeBonus: this.creature.initiativeBonus, attacks: this.creature.attacks, ruleTraits: this.creature.ruleTraits, damageResistances: this.creature.damageResistances, damageImmunities: this.creature.damageImmunities, conditionImmunities: this.creature.conditionImmunities };
    const npc = this.npcs.get(id);
    return npc ? { id, label: npc.label, kind: 'npc' as const, controller: 'dm' as const, hp: npc.hp, maxHp: npc.maxHp, armorClass: npc.armorClass, speedMeters: npc.speedMeters, initiativeBonus: npc.initiativeBonus, attacks: npc.attacks, ruleTraits: npc.ruleTraits, damageResistances: npc.damageResistances, damageImmunities: npc.damageImmunities, conditionImmunities: npc.conditionImmunities } : null;
  }
  conditionsFor(entityId: string) { return this.conditions[entityId] ?? []; }
  conditionSourcesFor(entityId: string) { return this.conditionSources[entityId] ?? []; }
  private combatParticipants(): CombatParticipant[] {
    return this.combat.participantIds.map(id => {
      const entity = this.combatEntity(id); if (!entity) throw new Error('COMBAT_ENTITY_MISSING');
      return { ...entity, initiative: this.combat.initiative[id] ?? 0, initiativeSubmitted: Boolean(this.combat.initiativeSubmitted[id]), active: entity.kind === 'player' ? entity.deathSaves.failures < 3 : entity.hp > 0, conditions: [...this.conditionsFor(id)] };
    });
  }
  private animationFor(action: CombatAction): CombatEvent['animation'] {
    if (action.id === 'entangle') return 'entangle';
    const animationType = visualAnimationType(action);
    if (action.magical || animationType === 'magicalProjectile' || animationType === 'fireProjectile') return 'spell';
    if (animationType === 'arrow' || animationType === 'radiantArrow') return 'attack-arrow';
    if (animationType === 'thrownWeapon') return 'attack-throw';
    return 'attack';
  }
  private setCombatEvent(text: string, kind: CombatEvent['kind'], publicText = text, visual: Pick<CombatEvent, 'actorId' | 'targetId' | 'animation'> = {}) {
    this.combat.lastEvent = { id: crypto.randomUUID(), text, publicText, kind, ...visual };
  }
  private startConcentration(entityId: string, actionId: string, label: string) {
    this.concentration[entityId] = { actionId, label };
  }
  private endConcentration(entityId: string) { delete this.concentration[entityId]; }
  private isSlottedSpell(action: CombatAction) { return Boolean(action.magical && action.resource?.id.startsWith('spell-slot'));
  }
  private combatTurnKey() { return `${this.combat.round}:${this.currentCombatId() ?? '-'}`; }
  private spellSlotAvailable(entityId: string, action: CombatAction) {
    return !this.isSlottedSpell(action) || this.combat.spellSlotUsedTurn[entityId] !== this.combatTurnKey();
  }
  private movementCost(sceneId: SceneId, surfaceId: string, cell: Cell) {
    return this.sceneById(sceneId).terrain?.surfaces.find(surface => surface.id === surfaceId)?.tiles.find(tile => sameCell(tile.cell, cell))?.movementCost ?? 1;
  }
  private terrainStepDestination(scene: SceneDefinition, surfaceId: string, from: Cell, to: Cell) {
    if (!scene.terrain) return { surfaceId, cell: to };
    const neighbors = surfaceNeighbors(scene.terrain, { surfaceId, cell: from });
    const dx = to.col - from.col, dy = to.row - from.row;
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      // At stair landings, the same grid coordinate may exist on two stacked
      // surfaces. Prefer the authored cross-surface edge so a cardinal input
      // actually climbs instead of silently staying on the lower mesh.
      return neighbors.find(neighbor => neighbor.surfaceId !== surfaceId && sameCell(neighbor.cell, to))
        ?? neighbors.find(neighbor => sameCell(neighbor.cell, to)) ?? null;
    }
    const connected = (a: Cell, b: Cell) => surfaceNeighbors(scene.terrain!, { surfaceId, cell: a })
      .some(neighbor => neighbor.surfaceId === surfaceId && sameCell(neighbor.cell, b));
    if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) return null;
    const horizontal = { col: to.col, row: from.row }, vertical = { col: from.col, row: to.row };
    // A diagonal may pass a single blocked/missing corner when its other
    // orthogonal route is clear. Requiring both routes made small curved
    // surfaces (notably the crow's nest around the mast) reject the intended
    // WASD direction, after which startStep silently slid the actor sideways.
    const horizontalRoute = connected(from, horizontal) && connected(horizontal, to);
    const verticalRoute = connected(from, vertical) && connected(vertical, to);
    if (horizontalRoute || verticalRoute) return { surfaceId, cell: to };
    return null;
  }
  private canSpendMovement(entityId: string, terrainCost = 1) {
    if (!this.combat.active) return true;
    const movement = this.combatMovement();
    const conditions = this.conditionsFor(entityId);
    const cost = terrainCost * (conditions.includes('derribada') ? 2 : 1);
    return movement?.actorId === entityId && movement.remainingSquares >= cost && !conditions.some(condition => condition === 'restringida' || condition === 'apresada' || condition === 'agarrada' || condition === 'inconsciente' || condition === 'paralizada');
  }
  private spendMovement(entityId: string, terrainCost = 1) { if (this.combat.active) this.combat.spentSquares[entityId] = (this.combat.spentSquares[entityId] ?? 0) + terrainCost * (this.conditionsFor(entityId).includes('derribada') ? 2 : 1); }
  moveEntityOneSquare(entityId: string, destination: Cell) {
    const character = this.characters.get(entityId);
    const creature = this.creature?.id === entityId && this.creature.visible && this.creature.hp > 0 ? this.creature : null;
    const npc = this.npcs.get(entityId)?.visible && (this.npcs.get(entityId)?.hp ?? 0) > 0 ? this.npcs.get(entityId)! : null;
    const entity = character ?? creature ?? npc;
    if (!entity) return 'UNKNOWN_ENTITY';
    if ((npc?.id === 'wreck-rowboat' && this.rowboatPassengers().length > 0)
      || (character && this.rowboatPassengers().includes(character)))
      return 'ENTITY_ABOARD_ROWBOAT';
    const entitySceneId = character?.sceneId ?? creature?.sceneId ?? npc!.sceneId;
    const scene = this.sceneById(entitySceneId);
    if (character?.step) return 'ENTITY_MOVING';
    if (!scene.movementEnabled || Math.abs(destination.col - entity.cell.col) + Math.abs(destination.row - entity.cell.row) !== 1) return 'GRID_STEP_REQUIRED';
    const resolved = scene.terrain ? this.terrainStepDestination(scene, entity.surfaceId, entity.cell, destination) : { surfaceId: entity.surfaceId, cell: destination };
    if (!resolved) return 'BLOCKED_CELL';
    const destinationSurfaceId = resolved.surfaceId;
    const terrainCost = this.movementCost(entitySceneId, destinationSurfaceId, destination);
    if (!this.canSpendMovement(entityId, terrainCost)) return 'MOVEMENT_SPENT';
    if (scene.terrain ? !this.walkableAt(entitySceneId, destinationSurfaceId, destination)
      || this.publicObjectProps(entitySceneId).some(prop => prop.surfaceId === destinationSurfaceId && prop.structure !== 'destroyed' && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(cell => sameCell(cell, destination)))
      : !isWalkable(scene, destination, this.publicObjectProps(entitySceneId))) return 'BLOCKED_CELL';
    const occupied = [...this.characters.values()].filter(item => item.id !== entityId && Boolean(item.sessionToken)).some(item => item.sceneId === entitySceneId && item.surfaceId === destinationSurfaceId && sameCell(item.cell, destination))
      || Boolean(this.creature?.visible && this.creature.hp > 0 && this.creature.id !== entityId && this.creature.sceneId === entitySceneId && this.creature.surfaceId === destinationSurfaceId && sameCell(this.creature.cell, destination))
      || [...this.npcs.values()].some(item => item.blocksMovement && item.visible && item.hp > 0 && item.id !== entityId && item.sceneId === entitySceneId && item.surfaceId === destinationSurfaceId && sameCell(item.cell, destination));
    if (occupied) return 'OCCUPIED_CELL';
    if (this.combat.pending) return 'ROLL_PENDING';
    if (this.queueOpportunityMovement(entityId, destination, destinationSurfaceId)) return 'REACTION_PENDING';
    this.commitGridMove(entityId, destination, destinationSurfaceId);
    return 'MOVED';
  }

  private commitGridMove(entityId: string, destination: Cell, destinationSurfaceId?: string) {
    const character = this.characters.get(entityId);
    const creature = this.creature?.id === entityId ? this.creature : null;
    const npc = this.npcs.get(entityId) ?? null;
    const entity = character ?? creature ?? npc;
    if (!entity) return false;
    const facing: Facing = destination.col > entity.cell.col ? 'east' : destination.col < entity.cell.col ? 'west' : destination.row > entity.cell.row ? 'south' : 'north';
    if (character) {
      if (character.step) return false;
      this.cancelInteractionsForCharacter(character.id); character.facing = facing; character.input.held = null;
      const from = cloneCell(character.cell); character.cell = cloneCell(destination); character.step = { from, to: cloneCell(destination), fromSurfaceId: character.surfaceId, toSurfaceId: destinationSurfaceId ?? character.surfaceId, startedAt: Date.now(), durationMs: STEP_DURATION_MS }; character.moving = true;
    } else if (npc) { npc.cell = cloneCell(destination); npc.surfaceId = destinationSurfaceId ?? npc.surfaceId; npc.facing = facing; }
    else if (creature) { creature.cell = cloneCell(destination); creature.surfaceId = destinationSurfaceId ?? creature.surfaceId; }
    const sceneId = character?.sceneId ?? creature?.sceneId ?? npc!.sceneId;
    this.spendMovement(entityId, this.movementCost(sceneId, destinationSurfaceId ?? entity.surfaceId, destination)); this.revision++; this.stateRevision++;
    return true;
  }

  publicSnapshot(redactCombat = false, viewSceneId: SceneId = this.sceneId, viewSurfaceId?: string): WorldSnapshot {
    const viewScene = this.sceneById(viewSceneId);
    const wreckDisappeared = this.campaign.public.campaignId === 'stormwreck-isle' && Boolean(this.progress['wreck.curse-day-after']);
    const remainsInScene = (sceneId: SceneId, surfaceId: string) => !wreckDisappeared || sceneId !== 'wreck-ship' || surfaceId === 'sea';
    const visibleSurface = (surfaceId: string, step?: StepState | null) => viewSurfaceId === undefined
      || surfaceId === viewSurfaceId || step?.fromSurfaceId === viewSurfaceId || step?.toSurfaceId === viewSurfaceId;
    const props = this.publicObjectProps(viewSceneId).filter(prop => remainsInScene(viewSceneId, prop.surfaceId) && (viewSurfaceId === undefined || prop.surfaceId === viewSurfaceId));
    const visiblePropIds = new Set(props.map(prop => prop.id));
    const authorizedScene = { ...structuredClone(viewScene), props: viewScene.props.filter(prop => visiblePropIds.has(prop.id)).map(prop => structuredClone(prop)),
      ...(wreckDisappeared && viewSceneId === 'wreck-ship' ? { stageActors: [] } : {}),
      pickups: (viewScene.pickups ?? []).filter(pickup => remainsInScene(viewSceneId, pickup.surfaceId) && (viewSurfaceId === undefined || pickup.surfaceId === viewSurfaceId) && (!redactCombat || this.pickupAvailable(viewSceneId, pickup))) };
    const entities: PublicEntity[] = [...this.characters.values()].filter(character => Boolean(character.sessionToken) && character.sceneId === viewSceneId && remainsInScene(character.sceneId, character.surfaceId) && visibleSurface(character.surfaceId, character.step)).map(character => ({
      id: character.id, kind: 'player', label: character.label, sceneId: character.sceneId, cell: cloneCell(character.cell), surfaceId: character.surfaceId,
      facing: character.facing, moving: character.moving, step: character.step ? structuredClone(character.step) : null, color: character.color, tokenId: character.tokenId, conditions: [...this.conditionsFor(character.id)],
      carriedLightRadiusMeters: carriedLightRadiusMeters(character.inventory),
      ...(!redactCombat && this.combat.active && this.combat.participantIds.includes(character.id) ? { hp: character.hp, maxHp: character.maxHp, defeated: character.hp <= 0 } : {})
    }));
    if (this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === viewSceneId && remainsInScene(this.creature.sceneId, this.creature.surfaceId) && visibleSurface(this.creature.surfaceId)) entities.push({
      id: this.creature.id, kind: 'creature', label: this.creature.label, sceneId: this.creature.sceneId, cell: cloneCell(this.creature.cell), surfaceId: this.creature.surfaceId,
      facing: this.creature.facing, moving: false, step: null, color: this.creature.color, tokenId: this.creature.tokenId, conditions: [...this.conditionsFor(this.creature.id)],
      ...(!redactCombat && this.combat.active && this.combat.participantIds.includes(this.creature.id) ? { hp: this.creature.hp, maxHp: this.creature.maxHp, defeated: this.creature.hp <= 0 } : {})
    });
    // The rowboat floats beside C1: it must remain visible from the open-air
    // decks even though its authoritative movement surface is `sea`.
    const visibleNpcSurface = (npc: NpcState) => visibleSurface(npc.surfaceId, npc.step)
      || (npc.id === 'wreck-rowboat' && viewSceneId === 'wreck-ship'
        && ['main', 'c1-hull', 'c2', 'c3', 'crow'].includes(viewSurfaceId ?? ''));
    for (const npc of this.npcs.values()) if (npc.visible && npc.hp > 0 && npc.sceneId === viewSceneId && remainsInScene(npc.sceneId, npc.surfaceId) && visibleNpcSurface(npc)) entities.push({
      id: npc.id, kind: 'npc', label: npc.label, sceneId: npc.sceneId, cell: cloneCell(npc.cell), surfaceId: npc.surfaceId, facing: npc.facing, moving: Boolean(npc.step), step: npc.step ? structuredClone(npc.step) : null, color: npc.color, tokenId: npc.tokenId, conditions: [...this.conditionsFor(npc.id)],
      ...(!redactCombat && this.combat.active && this.combat.participantIds.includes(npc.id) ? { hp: npc.hp, maxHp: npc.maxHp, defeated: npc.hp <= 0 } : {})
    });
    const visibleTokenIds = new Set(entities.map(entity => entity.tokenId));
    const tokenAssets = {
      tokens: Object.fromEntries(Object.entries(this.campaign.public.tokens).filter(([tokenId]) => visibleTokenIds.has(tokenId))),
      tokenAnimations: Object.fromEntries(Object.entries(this.campaign.public.tokenAnimations).filter(([tokenId]) => visibleTokenIds.has(tokenId)))
    };
    const publicFocus = entities.some(entity => entity.id === this.camera.focusId) ? this.camera.focusId : null;
    const visibleIds = new Set(entities.map(entity => entity.id));
    const visibleParticipants = this.combat.active ? this.combatParticipants().filter(participant => !redactCombat || visibleIds.has(participant.id)) : [];
    // El orden no se recalcula en el cliente: el DM puede resolver un empate
    // y ese desempate forma parte de la iniciativa publicada a esta mesa.
    const visibleOrder = this.combat.order.filter(id => visibleIds.has(id)).flatMap(id => {
      const participant = visibleParticipants.find(candidate => candidate.id === id);
      return participant ? [{ id: participant.id, label: participant.label, kind: participant.kind }] : [];
    });
    const visibleCurrentId = !redactCombat || visibleIds.has(this.currentCombatId() ?? '') ? this.currentCombatId() : null;
    const movement = this.combatMovement();
    const visibleEvent = this.combat.lastEvent && (!redactCombat || ((!this.combat.lastEvent.actorId || visibleIds.has(this.combat.lastEvent.actorId)) && (!this.combat.lastEvent.targetId || visibleIds.has(this.combat.lastEvent.targetId)))) ? this.combat.lastEvent : null;
    return {
      v: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, revision: this.revision, serverTime: Date.now(), sceneId: viewSceneId, scene: authorizedScene, sceneEpoch: this.sceneEpoch, runtimeEpoch: this.runtimeEpoch,
      entities, tokenAssets, props, collectedPickups: (viewScene.pickups ?? []).filter(pickup => remainsInScene(viewSceneId, pickup.surfaceId) && (viewSurfaceId === undefined || pickup.surfaceId === viewSurfaceId) && this.pickupAvailable(viewSceneId, pickup) && this.progress[`pickup.${pickup.id}`]).map(pickup => pickup.id), camera: { mode: this.camera.mode, focusId: publicFocus }, environment: { ...this.environment },
      story: { wreckDisappeared },
      campRest: this.campRest?.sceneId === viewSceneId ? structuredClone(this.campRest) : null,
      // La CA es el número público que el jugador necesita superar al atacar.
      combat: { active: this.combat.active && (!redactCombat || visibleParticipants.length > 0), round: this.combat.round, currentId: visibleCurrentId, movement: movement && (!redactCombat || visibleIds.has(movement.actorId)) ? movement : null, participants: visibleParticipants.map(participant => redactCombat ? { ...participant, hp: 0, maxHp: 0, speedMeters: 0, attacks: [] } : participant), order: visibleOrder, lastEvent: visibleEvent ? { id: visibleEvent.id, kind: visibleEvent.kind, text: redactCombat ? visibleEvent.publicText : visibleEvent.text, actorId: visibleEvent.actorId, targetId: visibleEvent.targetId, animation: visibleEvent.animation } : null }
    };
  }

  applyCampRestCommand(command: Extract<DmCommand, { type: 'camp:rest' }>): CommandResult {
    if (command.sceneId !== this.sceneId || command.sceneEpoch !== this.sceneEpoch) return { commandId: command.commandId, ok: false, code: 'STALE_SCENE' };
    const scene = this.currentScene(), camp = scene.camp;
    if (!camp) return { commandId: command.commandId, ok: false, code: 'CAMP_FEATURE_UNAVAILABLE' };
    const prior = this.campRest;
    const activeElsewhere = Boolean(prior && prior.sceneId !== scene.id && prior.phase !== null && prior.phase !== 'finalization');
    if (activeElsewhere) return { commandId: command.commandId, ok: false, code: 'REST_ACTIVE_ELSEWHERE' };

    if (command.action === 'set-night') {
      const sameSceneRest = prior?.sceneId === scene.id ? prior : null;
      this.campRest = {
        sceneId: scene.id, phase: 'night', paused: Boolean(sameSceneRest && sameSceneRest.phase !== null && sameSceneRest.phase !== 'finalization' && sameSceneRest.paused), outcome: null,
        interruptions: sameSceneRest && sameSceneRest.phase !== null && sameSceneRest.phase !== 'finalization' ? structuredClone(sameSceneRest.interruptions) : [],
        interactions: sameSceneRest ? structuredClone(sameSceneRest.interactions) : []
      };
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }

    if (command.action === 'prepare') {
      if (prior?.sceneId === scene.id && prior.phase !== null && prior.phase !== 'finalization') return { commandId: command.commandId, ok: false, code: 'REST_ALREADY_ACTIVE' };
      const interactions = prior?.sceneId === scene.id ? structuredClone(prior.interactions) : [];
      this.campRest = { sceneId: scene.id, phase: 'arrival', paused: false, outcome: null, interruptions: [], interactions };
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }
    if (!prior || prior.sceneId !== scene.id || prior.phase === null || prior.phase === 'finalization') return { commandId: command.commandId, ok: false, code: 'REST_NOT_ACTIVE' };
    if (command.action === 'advance') {
      if (prior.paused) return { commandId: command.commandId, ok: false, code: 'REST_INTERRUPTED' };
      const next: Partial<Record<NonNullable<CampRestState['phase']>, CampRestState['phase']>> = { arrival: 'dusk', dusk: 'night', night: 'dawn' };
      const phase = next[prior.phase];
      if (!phase) return { commandId: command.commandId, ok: false, code: 'REST_NEEDS_FINAL_CONFIRMATION' };
      prior.phase = phase;
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }
    if (command.action === 'interrupt') {
      if (prior.paused) return { commandId: command.commandId, ok: false, code: 'REST_ALREADY_INTERRUPTED' };
      prior.paused = true; prior.interruptions.push({ note: command.note!, at: Date.now() }); prior.interruptions = prior.interruptions.slice(-30);
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }
    if (command.action === 'resume') {
      if (!prior.paused) return { commandId: command.commandId, ok: false, code: 'REST_NOT_INTERRUPTED' };
      prior.paused = false;
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }
    if (command.action === 'finalize') {
      if (prior.paused) return { commandId: command.commandId, ok: false, code: 'REST_INTERRUPTED' };
      if (prior.phase !== 'dawn') return { commandId: command.commandId, ok: false, code: 'REST_NOT_AT_DAWN' };
      prior.phase = 'finalization'; prior.outcome = command.completed ? 'completed' : 'incomplete';
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }
    return { commandId: command.commandId, ok: false, code: 'INVALID_CAMP_ACTION' };
  }

  applyCampPlayerInteraction(characterId: string, pointId: string) {
    const scene = this.currentScene(), camp = scene.camp, character = this.characters.get(characterId);
    if (!camp || !character || character.sceneId !== scene.id) return { ok: false as const, code: 'CAMP_FEATURE_UNAVAILABLE' };
    const point = camp.interactionPoints.find(candidate => candidate.id === pointId);
    if (!point || character.surfaceId !== point.surfaceId || character.step
      || Math.max(Math.abs(character.cell.col - point.cell.col), Math.abs(character.cell.row - point.cell.row)) > 1)
      return { ok: false as const, code: 'CAMP_INTERACTION_OUT_OF_REACH' };
    if (this.combat.active) return { ok: false as const, code: 'IN_COMBAT' };
    if (point.ownerCharacterId && point.ownerCharacterId !== character.id) return { ok: false as const, code: 'CAMP_INTERACTION_NOT_YOURS' };
    const prior = this.campRest;
    if (prior && prior.sceneId !== scene.id && prior.phase !== null && prior.phase !== 'finalization') return { ok: false as const, code: 'REST_ACTIVE_ELSEWHERE' };
    const state = prior?.sceneId === scene.id ? prior : { sceneId: scene.id, phase: null, paused: false, outcome: null, interruptions: [], interactions: [] };
    const previous = [...state.interactions].reverse().find(item => item.pointId === point.id)?.action;
    const action = point.kind === 'chest' ? previous === 'opened' ? 'closed' as const : 'opened' as const : 'used' as const;
    state.interactions.push({ pointId: point.id, pointLabel: point.label, characterId: character.id, characterLabel: character.label, at: Date.now(), action });
    state.interactions = state.interactions.slice(-30);
    this.campRest = state;
    this.revision++; this.stateRevision++;
    const detail = action === 'opened' ? 'abres' : action === 'closed' ? 'cierras' : 'usas';
    const notice = point.kind === 'chest'
      ? `${detail} ${point.label}. ${point.description} El baúl no modifica automáticamente tu mochila.`
      : `${detail} ${point.label}. ${point.description}`;
    return { ok: true as const, code: 'CAMP_INTERACTED', point, action, notice };
  }

  public publicObjectProps(sceneId: SceneId = this.sceneId): PublicProp[] {
    return this.objectsFor(sceneId).filter(object => object.kind !== 'crate' || object.interaction?.kind !== 'trap-stash' || object.interaction.revealed).map(object => {
      const common = { id: object.id, label: object.label, assetId: object.assetId, cell: cloneCell(object.cell), surfaceId: object.surfaceId, capabilities: { ...object.capabilities }, rotation: object.rotation, footprint: object.baseFootprint.map(cloneCell) };
      if (object.kind === 'door') return { ...common, kind: 'door' as const, structure: object.structure, state: object.structure === 'destroyed' || object.state === 'open' ? 'open' as const : 'closed' as const,
        ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
      if (object.kind === 'wheel') return { ...common, kind: 'wheel' as const, structure: object.structure, attachment: object.attachment, state: object.state, mount: { cell: cloneCell(object.mount.cell), footprint: object.mount.footprint.map(cloneCell), assetId: object.mount.assetId } };
      const interaction = object.interaction?.kind === 'trap-stash'
        ? { kind: 'trap-stash' as const, revealed: true as const, open: object.interaction.open, trap: object.interaction.trap, lootTaken: object.interaction.lootOwnerId !== null }
        : object.interaction?.kind === 'container'
          ? { kind: 'container' as const, open: object.interaction.open, lootTaken: object.interaction.lootOwnerId !== null }
          : object.interaction?.kind === 'chest'
            ? { kind: 'chest' as const, open: object.interaction.open, location: object.interaction.location, package: object.interaction.package, lootTaken: object.interaction.lootOwnerId !== null, openedLocation: object.interaction.openedLocation }
            : undefined;
      return { ...common, kind: 'crate' as const, structure: object.structure, ...(interaction ? { interaction } : {}) };
    });
  }

  private dmObjects(): DmObject[] {
    if (this.sceneId === 'wreck-ship' && this.campaign.public.campaignId === 'stormwreck-isle' && this.progress['wreck.curse-day-after']) return [];
    return this.currentObjects().map(object => {
      const common = { id: object.id, label: object.label, assetId: object.assetId, cell: cloneCell(object.cell), surfaceId: object.surfaceId, capabilities: { ...object.capabilities }, rotation: object.rotation, footprint: object.baseFootprint.map(cloneCell), allowedRotations: [...object.allowedRotations] };
      if (object.kind === 'door') return { ...common, kind: 'door' as const, structure: object.structure, state: object.state, ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
      if (object.kind === 'wheel') return { ...common, kind: 'wheel' as const, structure: object.structure, attachment: object.attachment, state: object.state, mount: { cell: cloneCell(object.mount.cell), footprint: object.mount.footprint.map(cloneCell), assetId: object.mount.assetId } };
      return { ...common, kind: 'crate' as const, structure: object.structure, ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
    });
  }

  private publicProps(): PublicProp[] {
    return this.publicObjectProps();
  }

  private nearbyStageActorInteraction(character: CharacterState | null) {
    if (this.combat.active || !character || character.step) return null;
    return this.campaign.stageActorInteractions?.find(interaction => {
      const npc = this.npcs.get(interaction.targetId);
      return interaction.sceneId === this.sceneId && npc?.visible && npc.surfaceId === character.surfaceId
        && character.surfaceId === (interaction.surfaceId ?? this.currentScene().surfaceId)
        && interaction.cells.some(cell => sameCell(cell, character.cell));
    }) ?? null;
  }

  private nearbyMirrorInteraction(character: CharacterState | null) {
    const interaction = this.campaign.mirrorInteraction;
    if (this.combat.active || !interaction || this.creature?.visible || !character || character.step || interaction.sceneId !== this.sceneId || character.surfaceId !== this.currentScene().surfaceId) return null;
    const mirror = this.currentObjects().find(object => object.id === interaction.targetId);
    return mirror && interaction.cells.some(cell => sameCell(cell, character.cell)) ? interaction : null;
  }

  /** Validación autoritativa para los diálogos escénicos: el cliente nunca
   * puede provocar la reacción de un PNJ distante, oculto o de otra escena. */
  stageActorInteractionFor(characterId: string, targetId: string) {
    const interaction = this.nearbyStageActorInteraction(this.characters.get(characterId) ?? null);
    return interaction?.targetId === targetId ? structuredClone(interaction) : null;
  }

  /** Verificación autoritativa: solo quien está junto al objeto puede revelar
   * su propio reflejo; no se acepta un personaje elegido por el cliente. */
  mirrorInteractionFor(characterId: string, targetId: string) {
    const interaction = this.nearbyMirrorInteraction(this.characters.get(characterId) ?? null);
    return interaction?.targetId === targetId ? structuredClone(interaction) : null;
  }

  private nearbyInteractions(character: CharacterState | null) {
    const rowboat = this.rowboatInteraction(character);
    const stage = this.nearbyStageActorInteraction(character);
    const mirror = this.nearbyMirrorInteraction(character);
    const config = this.campaign.wheelInteraction;
    const wheel = config ? this.currentObjects().find((object): object is WheelRuntime => object.id === config.targetId && isWheel(object)) : null;
    const nearWheel = Boolean(!this.combat.active && character && !character.step && config && wheel?.attachment === 'attached' && wheel.structure !== 'destroyed' && character.sceneId === config.sceneId && character.surfaceId === wheel.surfaceId && config.cells.some(cell => sameCell(cell, character.cell)));
    const pickups = character && !this.combat.active && !character.step ? (this.sceneForCharacter(character).pickups ?? []).filter(pickup =>
      this.pickupAvailable(character.sceneId, pickup) && !this.progress[`pickup.${pickup.id}`] && pickup.surfaceId === character.surfaceId && Math.max(Math.abs(pickup.cell.col - character.cell.col), Math.abs(pickup.cell.row - character.cell.row)) <= 1)
      .map(pickup => ({ targetId: pickup.id, label: `Coger ${pickup.label}` })) : [];
    const doors = character && !this.combat.active && !character.step ? this.objectsFor(character.sceneId)
      .filter((object): object is DoorRuntime => isDoor(object) && object.structure !== 'destroyed'
        && object.surfaceId === character.surfaceId
        && Math.max(Math.abs(object.cell.col - character.cell.col), Math.abs(object.cell.row - character.cell.row)) <= 1)
      .map(door => ({ targetId: door.id, label: door.interaction?.barrier === 'barred'
        ? `Retirar listón · ${door.label}` : door.state === 'open' ? `Cerrar · ${door.label}` : `Abrir · ${door.label}` })) : [];
    return [
      ...(rowboat ? [rowboat] : []),
      ...doors,
      ...pickups,
      ...(stage ? [{ targetId: stage.targetId, label: stage.nearbyLabel }] : []),
      ...(mirror ? [{ targetId: mirror.targetId, label: mirror.nearbyLabel }] : []),
      ...(nearWheel ? [{ targetId: config!.targetId, label: config!.nearbyLabel }] : [])
    ];
  }

  /** Player-controlled doors use the same object state and undo history as DM
   * commands, but authorize against this character's own scene and position. */
  interactNearbyDoor(characterId: string, objectId: string): { ok: boolean; code: string } | null {
    const character = this.characters.get(characterId);
    if (!character) return { ok: false, code: 'UNKNOWN_CHARACTER' };
    const door = this.objectsFor(character.sceneId).find(object => object.id === objectId);
    if (!door || !isDoor(door)) return null;
    if (this.combat.active || character.step || character.surfaceId !== door.surfaceId
      || Math.max(Math.abs(character.cell.col - door.cell.col), Math.abs(character.cell.row - door.cell.row)) > 1)
      return { ok: false, code: 'TOO_FAR' };
    if (door.structure === 'destroyed') return { ok: false, code: 'INVALID_TRANSITION' };
    if (door.interaction?.barrier === 'barred') {
      const before = structuredClone(door.interaction);
      this.commitObject(door, { interaction: before }, { interaction: { ...before, barrier: 'removed' } }, 'Listón retirado por jugador', character.sceneId);
      return { ok: true, code: 'DOOR_BAR_REMOVED' };
    }
    if (door.state === 'locked') return { ok: false, code: 'DOOR_LOCKED' };
    const nextState = door.state === 'open' ? 'closed' : 'open';
    if (nextState === 'closed') {
      const error = this.validateObject(door, { state: nextState }, character.sceneId);
      if (error) return { ok: false, code: error };
    }
    this.commitObject(door, { state: door.state }, { state: nextState }, nextState === 'open' ? 'Puerta abierta por jugador' : 'Puerta cerrada por jugador', character.sceneId);
    if (door.id === 'c4-barred-door' && nextState === 'open') this.maybeRevealC4Zombies();
    return { ok: true, code: nextState === 'open' ? 'DOOR_OPENED' : 'DOOR_CLOSED' };
  }

  takePickup(characterId: string, pickupId: string, allowDistance = false): string {
    const character = this.characters.get(characterId);
    if (!character) return 'UNKNOWN_CHARACTER';
    const pickup = this.sceneForCharacter(character).pickups?.find(item => item.id === pickupId);
    if (!pickup || pickup.surfaceId !== character.surfaceId) return 'WRONG_SCENE';
    if (!this.pickupAvailable(character.sceneId, pickup)) return 'PICKUP_LOCKED';
    if (this.progress[`pickup.${pickup.id}`]) return 'ALREADY_TAKEN';
    if (!allowDistance && (this.combat.active || character.step || Math.max(Math.abs(pickup.cell.col - character.cell.col), Math.abs(pickup.cell.row - character.cell.row)) > 1)) return 'TOO_FAR';
    this.progress[`pickup.${pickup.id}`] = true;
    character.inventory.push(pickup.item);
    this.revision++; this.stateRevision++;
    return 'PICKUP_TAKEN';
  }

  playerPrivate(token: string, notice?: string): PlayerPrivate {
    const character = this.characterForSession(token);
    const interactions = this.nearbyInteractions(character);
    const nearbyInteraction = interactions[0] ?? null;
    const campScene = character ? this.sceneForCharacter(character) : null;
    const campInteractions = character && !this.combat.active && !character.step && campScene?.camp ? campScene.camp.interactionPoints
      .filter(point => (!point.ownerCharacterId || point.ownerCharacterId === character.id) && point.surfaceId === character.surfaceId
        && Math.max(Math.abs(character.cell.col - point.cell.col), Math.abs(character.cell.row - point.cell.row)) <= 1)
      .map(point => {
        const open = point.kind === 'chest' && this.campRest?.sceneId === campScene.id
          && [...this.campRest.interactions].reverse().find(item => item.pointId === point.id)?.action === 'opened';
        const actionLabel = point.kind === 'chest' ? open ? `Cerrar ${point.label}` : `Abrir ${point.label}`
          : point.kind === 'tent' ? `Entrar · ${point.label}`
            : point.kind === 'bed' ? `Usar · ${point.label}`
              : point.kind === 'fire' ? 'Acercarte a la hoguera'
                : point.kind === 'seat' ? 'Sentarte'
                  : point.kind === 'guard' ? 'Tomar el puesto de guardia' : `Usar · ${point.label}`;
        return { pointId: point.id, label: point.label, kind: point.kind, description: point.description, actionLabel, ...(point.kind === 'chest' ? { open } : {}) };
      }) : [];
    const movement = this.combatMovement();
    const playerCombat = character && this.combat.active && this.combat.participantIds.includes(character.id)
      ? { isTurn: movement?.actorId === character.id, ready: this.combat.stances[character.id]?.action === 'ready', movement: movement?.actorId === character.id ? { remainingSquares: movement.remainingSquares, maximumSquares: movement.maximumSquares } : null, attacks: structuredClone(character.combat.attacks), conditions: [...this.conditionsFor(character.id)], prompt: this.combatPromptFor('player', character.id), initiative: { pending: this.combat.initiativePending, submitted: Boolean(this.combat.initiativeSubmitted[character.id]), total: this.combat.initiativeSubmitted[character.id] ? this.combat.initiative[character.id] ?? null : null, modifier: character.combat.initiativeBonus }, actionUsed: Boolean(this.combat.actionUsed[character.id]), bonusActionUsed: Boolean(this.combat.bonusActionUsed[character.id]), reactionUsed: Boolean(this.combat.reactionUsed[character.id]), basicActions: ['dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'use-object'] as BasicCombatAction[], recharge: { ...(this.combat.recharge[character.id] ?? {}) }, resources: structuredClone(character.combat.resources), ...(this.combat.sequences[character.id] ? { sequence: { actionId: this.combat.sequences[character.id]!.actionId, remaining: this.combat.sequences[character.id]!.remaining } } : {}), ...(character.combat.spellAttackBonus !== undefined ? { spellAttackBonus: character.combat.spellAttackBonus } : {}), ...(character.combat.spellSaveDc !== undefined ? { spellSaveDc: character.combat.spellSaveDc } : {}) }
      : null;
    const pending = this.combat.pending, opening = this.combat.openingAction;
    if (playerCombat && character && (pending?.attackerId === character.id || (!pending && opening?.attackerId === character.id))) {
      const selection = pending ?? opening!;
      Object.assign(playerCombat, { pendingAction: {
        ...(pending ? { promptId: pending.id } : {}),
        label: character.combat.attacks.find(action => action.id === selection.actionId)?.label ?? 'Acción',
        cancellable: pending ? this.canCancelCombatAction() : true
      } });
    }
    return {
      runtimeEpoch: this.runtimeEpoch,
      characterId: character?.id ?? null, label: character?.label ?? null, hp: character?.hp ?? null, maxHp: character?.maxHp ?? null,
      inventory: character ? [...character.inventory] : [], sheet: character?.sheet ? structuredClone(character.sheet) : null,
      conditions: character ? [...this.conditionsFor(character.id)] : [], conditionSources: character ? structuredClone(this.conditionSourcesFor(character.id)) : [], resources: character ? structuredClone(character.combat.resources) : {}, concentration: character ? structuredClone(this.concentration[character.id] ?? null) : null, deathSaves: character ? { ...character.deathSaves } : null,
      canInteract: Boolean(nearbyInteraction), nearbyInteraction: nearbyInteraction?.label ?? null,
      interactionTargetId: nearbyInteraction?.targetId ?? null,
      availableInteractions: interactions,
      rowboat: character && this.rowboatPassengers().includes(character)
        ? { aboard: true, pilot: this.rowboatPilot()?.id === character.id } : null,
      campInteractions,
      explorationActions: character ? structuredClone(character.explorationActions) : [],
      explorationBasics: character ? [...character.explorationBasics] : [],
      explorationAttacks: character && !this.combat.active ? structuredClone(character.combat.attacks.filter(action => action.resolution !== 'guided')) : [],
      sceneMovementEnabled: character ? this.sceneForCharacter(character).movementEnabled : this.currentScene().movementEnabled, combat: playerCombat, ...(notice ? { notice } : {})
    };
  }

  dmState(): DmState {
    const objectState = this.currentObjectState();
    return {
      runtimeEpoch: this.runtimeEpoch,
      campaignTitle: this.campaign.public.title, sceneId: this.sceneId, sceneEpoch: this.sceneEpoch, objectRevision: objectState.revision,
      ...(this.campaign.public.campaignId === 'd8-night-private' ? { animationAudit: [...this.characters.values()]
        .filter(character => character.sceneId === this.sceneId && Boolean(character.sessionToken))
        .map(character => ({ id: character.id, attacks: structuredClone(character.combat.attacks), explorationActions: structuredClone(character.explorationActions ?? []), explorationBasics: [...(character.explorationBasics ?? [])] })) } : {}),
      characters: [...this.characters.values()].map(character => ({
        id: character.id, label: character.label, archetype: character.archetype, color: character.color, tokenId: character.tokenId,
        claimed: Boolean(character.sessionToken), connected: Boolean(character.socketId), hp: character.hp, maxHp: character.maxHp,
        session: Boolean(character.sessionToken), sceneId: character.sceneId, cell: cloneCell(character.cell), surfaceId: character.surfaceId, step: character.step ? structuredClone(character.step) : null, inventory: [...character.inventory], sheet: character.sheet ? structuredClone(character.sheet) : null, resources: structuredClone(character.combat.resources), concentration: structuredClone(this.concentration[character.id] ?? null), deathSaves: { ...character.deathSaves }
      })),
      creature: this.creature ? { id: this.creature.id, label: this.creature.label, visible: this.creature.visible, cell: cloneCell(this.creature.cell), surfaceId: this.creature.surfaceId, sceneId: this.creature.sceneId, hp: this.creature.hp, maxHp: this.creature.maxHp, armorClass: this.creature.armorClass, speedMeters: this.creature.speedMeters, traits: [...this.creature.traits], actions: [...this.creature.actions] } : null,
      npcs: [...this.npcs.values()].filter(npc => npc.sceneId === this.sceneId).map(npc => ({ id: npc.id, label: npc.label, tokenId: npc.tokenId, color: npc.color, cell: cloneCell(npc.cell), surfaceId: npc.surfaceId, hp: npc.hp, maxHp: npc.maxHp, armorClass: npc.armorClass, speedMeters: npc.speedMeters, traits: [...npc.traits], attacks: structuredClone(npc.attacks), combatEnabled: npc.combatEnabled, visible: npc.visible })),
      combat: { sequences: structuredClone(this.combat.sequences), active: this.combat.active, round: this.combat.round, currentId: this.currentCombatId(), movement: this.combatMovement(), participants: this.combat.active ? this.combatParticipants() : [], lastEvent: this.combat.active ? this.combat.lastEvent : null, prompt: this.combatPromptFor('dm'), initiativePending: this.combat.initiativePending, initiativeSubmitted: { ...this.combat.initiativeSubmitted }, actionUsed: { ...this.combat.actionUsed }, bonusActionUsed: { ...this.combat.bonusActionUsed }, reactionUsed: { ...this.combat.reactionUsed }, concentration: structuredClone(this.concentration), recharge: structuredClone(this.combat.recharge), order: this.combat.order.map(id => {
        const entity = this.combatEntity(id); if (!entity) throw new Error('COMBAT_ENTITY_MISSING'); return { id, label: entity.label, kind: entity.kind };
      }) },
      privateNotes: { creature: this.campaign.encounter?.note ?? '', wheel: this.campaign.wheelInteraction?.note ?? '' },
      camera: { ...this.camera }, environment: { ...this.environment }, campRest: this.campRest ? structuredClone(this.campRest) : null, audio: structuredClone(this.audio), projectorReady: this.projectorReady,
      interactions: this.interactions.map(({ id, characterId, characterLabel, targetId, createdAt, status }) => ({ id, characterId, characterLabel, targetId, createdAt, status })), objects: this.dmObjects(),
      pickups: (this.currentScene().pickups ?? []).map(pickup => ({ id: pickup.id, label: pickup.label, sceneId: this.sceneId, surfaceId: pickup.surfaceId, cell: pickup.cell, kind: pickup.kind, collected: Boolean(this.progress[`pickup.${pickup.id}`]), available: this.pickupAvailable(this.sceneId, pickup) })), progress: { ...this.progress },
      lastExplorationAction: this.lastExplorationAction && this.lastExplorationAction.sceneId === this.sceneId ? structuredClone(this.lastExplorationAction) : null,
      undo: { canUndo: objectState.undo.length > 0, label: objectState.undo.at(-1)?.label ?? null, entryId: objectState.undo.at(-1)?.entryId ?? null },
      gameUndo: { canUndo: false, label: null }, ports: structuredClone(this.campaign.ports ?? [])
    };
  }

  tick(_dt = 0) {
    const now = Date.now(), changedCharacters = new Set<string>();
    const boat = this.rowboat();
    if (boat?.step && now >= boat.step.startedAt + boat.step.durationMs) boat.step = null;
    for (const request of this.interactions) if (request.status === 'pending' && now - request.createdAt >= 120_000) { request.status = 'resolved'; changedCharacters.add(request.characterId); }
    for (const character of this.characters.values()) {
      const scene = this.sceneForCharacter(character);
      if (character.step && now >= character.step.startedAt + character.step.durationMs) {
        const completedStep = character.step;
        const fromSceneId = character.sceneId, fromSurfaceId = character.surfaceId;
        character.surfaceId = completedStep.toSurfaceId ?? character.surfaceId;
        character.step = null; character.moving = false; this.revision++; changedCharacters.add(character.id);
        if (!this.progress[this.rowboatFlag(character.id)] && this.autoTraverseAfterStep(character, completedStep.to)) changedCharacters.add(character.id);
        this.observeWreckLocationChange(character, fromSceneId, fromSurfaceId);
      }
      if (!character.step && character.socketId && scene.movementEnabled && character.input.held && now - character.input.updatedAt <= 220) {
        if (this.startStep(character, character.input.held, now)) changedCharacters.add(character.id);
      }
      if (!character.socketId || now - character.input.updatedAt > 220 || !scene.movementEnabled) character.input.held = null;
    }
    return changedCharacters;
  }

  private autoTraverseAfterStep(character: CharacterState, arrived: Cell) {
    for (const port of this.campaign.ports ?? []) {
      // Hatches/holes with adjudication and doors are not auto-portals: doors
      // are traversed by ordinary collision-aware movement when actually open.
      if (!['stairs', 'rope-ladder', 'rigging', 'swim'].includes(port.mode) || port.autoDirection === 'manual') continue;
      let destination: typeof port.from | null = null;
      if (character.sceneId === port.from.mapId && character.surfaceId === port.from.surfaceId && sameCell(arrived, port.from.cell)) destination = port.to;
      else if (character.sceneId === port.to.mapId && character.surfaceId === port.to.surfaceId
        && port.autoDirection !== 'forward' && (sameCell(arrived, port.to.cell) || sameCell(arrived, port.from.cell))) destination = port.from;
      if (!destination || !this.walkableAt(destination.mapId, destination.surfaceId, destination.cell)) continue;
      const occupied = [...this.characters.values()].some(item => item.id !== character.id && Boolean(item.sessionToken) && item.sceneId === destination!.mapId
        && item.surfaceId === destination!.surfaceId && (sameCell(item.cell, destination!.cell) || Boolean(item.step && sameCell(item.step.from, destination!.cell))))
        || Boolean(this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === destination.mapId
          && this.creature.surfaceId === destination.surfaceId && sameCell(this.creature.cell, destination.cell))
        || [...this.npcs.values()].some(item => item.blocksMovement && item.visible && item.hp > 0 && item.sceneId === destination!.mapId
          && item.surfaceId === destination!.surfaceId && sameCell(item.cell, destination!.cell));
      if (occupied) return false;
      character.sceneId = destination.mapId; character.surfaceId = destination.surfaceId; character.cell = cloneCell(destination.cell);
      this.progress[this.rowboatFlag(character.id)] = false;
      this.progress[this.rowboatPilotFlag(character.id)] = false;
      character.step = null; character.moving = false; character.input = { held: null, seq: -1, updatedAt: 0 };
      this.cancelInteractionsForCharacter(character.id); this.revision++; this.stateRevision++;
      return true;
    }
    return false;
  }

  changeScene(sceneId: SceneId) {
    if (!this.hasScene(sceneId)) return false;
    if (sceneId === 'wreck-ship' && this.campaign.public.campaignId === 'stormwreck-isle' && this.progress['wreck.curse-day-after']) return false;
    this.sceneId = sceneId; this.sceneEpoch++; this.interactions = []; this.camera.focusId = null; this.combat = emptyCombat();
    this.applySceneAudioProfile(sceneId);
    // Un paso repetido no debe seguir sonando al saltar a otro mapa.
    for (const track of Object.values(this.audio.sfxLoops)) { track.playing = false; track.startedAt = null; }
    if (this.creature) this.creature.visible = false;
    const scene = this.currentScene();
    [...this.characters.values()].forEach((character, index) => {
      character.cell = cloneCell(scene.spawns[index] ?? scene.spawns[0]!); character.surfaceId = scene.surfaceId;
      character.sceneId = scene.id;
      character.step = null; character.moving = false; character.input = { held: null, seq: -1, updatedAt: 0 };
      this.progress[this.rowboatFlag(character.id)] = false;
      this.progress[this.rowboatPilotFlag(character.id)] = false;
    });
    this.revision++; this.stateRevision++;
    return true;
  }

  /** Cambia sólo el encuadre de DM/proyector; no toca ubicaciones ni combate. */
  focusScene(sceneId: SceneId) {
    if (!this.hasScene(sceneId)) return false;
    // Es solo el foco DM/proyector. No invalida los controles ni las cámaras
    // individuales de los jugadores que exploran otras plantas.
    this.sceneId = sceneId; this.revision++; this.stateRevision++;
    return true;
  }

  traversePort(entityId: string, portId: string, direction: 'forward' | 'return', adjudicate = false) {
    const port = this.campaign.ports?.find(candidate => candidate.id === portId);
    const character = this.characters.get(entityId);
    if (!port) return 'UNKNOWN_PORT';
    if (this.campaign.public.campaignId === 'stormwreck-isle' && this.progress['wreck.curse-day-after']
      && (port.from.mapId === 'wreck-ship' || port.to.mapId === 'wreck-ship')) return 'WRECK_DISAPPEARED';
    if (!character) return 'UNKNOWN_ENTITY';
    if (character.step) return 'ENTITY_MOVING';
    if (port.return === 'adjudicated' && !adjudicate) return 'PORT_REQUIRES_ADJUDICATION';
    if (port.conditionId) {
      const gate = this.objectsFor(port.from.mapId).find(object => object.id === port.conditionId);
      if (!gate || gate.kind !== 'door' || gate.structure !== 'destroyed' && (gate.state !== 'open' || gate.interaction?.kind === 'barred-door' && gate.interaction.barrier !== 'removed')) return 'PORT_CONDITION_BLOCKED';
    }
    const origin = direction === 'forward' ? port.from : port.to;
    const destination = direction === 'forward' ? port.to : port.from;
    if (character.sceneId !== origin.mapId || character.surfaceId !== origin.surfaceId || !sameCell(character.cell, origin.cell)) return 'PORT_ORIGIN_MISMATCH';
    if (!this.walkableAt(destination.mapId, destination.surfaceId, destination.cell)) return 'BLOCKED_CELL';
    const occupied = (cell: Cell) => [...this.characters.values()].some(item => item.id !== entityId && Boolean(item.sessionToken) && item.sceneId === destination.mapId && item.surfaceId === destination.surfaceId && (sameCell(item.cell, cell) || Boolean(item.step && sameCell(item.step.from, cell))))
      || Boolean(this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === destination.mapId && this.creature.surfaceId === destination.surfaceId && sameCell(this.creature.cell, cell))
      || [...this.npcs.values()].some(item => item.blocksMovement && item.visible && item.hp > 0 && item.sceneId === destination.mapId && item.surfaceId === destination.surfaceId && sameCell(item.cell, cell));
    let landingCell = destination.cell;
    // Several adventurers may return by the same boat while the first still
    // stands at its beach landing. Stage later arrivals on the nearest free
    // beach tile rather than trapping them aboard with OCCUPIED_CELL.
    if (occupied(landingCell) && port.id === 'travel-pecio-boat' && direction === 'return') {
      const terrain = this.sceneById(destination.mapId).terrain;
      if (terrain) {
        const queue = [{ surfaceId: destination.surfaceId, cell: destination.cell }];
        const seen = new Set<string>();
        while (queue.length && seen.size < 64) {
          const current = queue.shift()!;
          const key = cellKey(current.cell);
          if (seen.has(key)) continue;
          seen.add(key);
          if (this.walkableAt(destination.mapId, destination.surfaceId, current.cell) && !occupied(current.cell)) { landingCell = current.cell; break; }
          for (const next of surfaceNeighbors(terrain, current)) if (next.surfaceId === destination.surfaceId && !seen.has(cellKey(next.cell))) queue.push(next);
        }
      }
    }
    if (occupied(landingCell)) return 'OCCUPIED_CELL';
    const fromSceneId = character.sceneId, fromSurfaceId = character.surfaceId;
    character.sceneId = destination.mapId; character.surfaceId = destination.surfaceId; character.cell = cloneCell(landingCell);
    this.progress[this.rowboatFlag(character.id)] = false;
    this.progress[this.rowboatPilotFlag(character.id)] = false;
    character.step = null; character.moving = false; character.input = { held: null, seq: -1, updatedAt: 0 };
    // La localización individual cambia; la época global de la mesa no.
    // Así los demás jugadores no pierden entrada al cruzar una conexión.
    this.cancelInteractionsForCharacter(character.id); this.revision++; this.stateRevision++;
    this.observeWreckLocationChange(character, fromSceneId, fromSurfaceId);
    return 'MOVED';
  }

  private applySceneAudioProfile(sceneId: SceneId, now = Date.now()) {
    const profile = this.campaign.public.audio.sceneProfiles?.[sceneId]; if (!profile) return;
    const apply = (track: AudioState['music'], target: { id: string; playing: boolean; volume: number }) => {
      track.assetId = target.id; track.playing = target.playing; track.volume = target.volume; track.offset = 0; track.startedAt = target.playing ? now : null; track.loop = true; track.rate = 1; track.repeats = 1;
    };
    apply(this.audio.music, profile.music);
    for (const channel of ['ocean', 'wind', 'wood', 'storm'] as const) apply(this.audio.layers[channel], profile.layers[channel]);
  }

  private currentObjectState() { return this.objectScenes.get(this.sceneId)!; }
  private currentObjects() { return this.currentObjectState().objects; }
  public interactionObject(id: string) { return this.currentObjects().find(object => object.id === id) ?? null; }
  public interactionRequestValid(request: RuntimeInteraction) {
    const character = this.characters.get(request.characterId), object = this.interactionObject(request.targetId);
    return Boolean(
      request.status === 'pending' && request.sceneId === this.sceneId && request.sceneEpoch === this.sceneEpoch &&
      character && character.sessionToken === request.sessionToken && character.socketId && !character.step &&
      object && object.version === request.objectVersion && isWheel(object) && object.attachment === 'attached' && object.structure !== 'destroyed' &&
      this.playerPrivate(request.sessionToken).canInteract
    );
  }
  private locationCells(object: ObjectRuntime, candidate: Partial<ObjectRuntime> = {}) {
    const next = { ...object, ...candidate } as ObjectRuntime;
    return footprintFor(next.cell, next.rotation, next.baseFootprint);
  }
  private blockingCells(object: ObjectRuntime, candidate: Partial<ObjectRuntime> = {}) {
    const next = { ...object, ...candidate } as ObjectRuntime;
    if (next.structure === 'destroyed') return [];
    if (isWheel(next) && next.attachment === 'attached') return [];
    if (next.kind === 'crate' && next.interaction?.kind === 'trap-stash') return [];
    return isDoor(next) && next.state === 'open' ? [] : this.locationCells(object, candidate);
  }
  private actorReservations(surfaceId: string, sceneId = this.sceneId) {
    const occupied = new Set<string>();
    for (const character of this.characters.values()) {
      if (character.sceneId !== sceneId || character.surfaceId !== surfaceId) continue;
      occupied.add(cellKey(character.cell));
      if (character.step) occupied.add(cellKey(character.step.from));
    }
    if (this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === sceneId && this.creature.surfaceId === surfaceId) occupied.add(cellKey(this.creature.cell));
    for (const npc of this.npcs.values()) if (npc.visible && npc.hp > 0 && npc.sceneId === sceneId && npc.surfaceId === surfaceId) occupied.add(cellKey(npc.cell));
    return occupied;
  }

  startCombat(openingAction?: { attackerId: string; targetId: string; actionId: string }) {
    if (this.combat.active) return false;
    const players = [...this.characters.values()].filter(character => Boolean(character.sessionToken) && character.sceneId === this.sceneId).map(character => character.id);
    const creature = this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === this.sceneId ? [this.creature.id] : [];
    const npcs = [...this.npcs.values()].filter(npc => npc.sceneId === this.sceneId && npc.visible && npc.combatEnabled).map(npc => npc.id);
    // Los PJ a 0 PG siguen participando para sus salvaciones de muerte.
    const participantIds = [...players, ...creature, ...npcs].filter(id => {
      const entity = this.combatEntity(id);
      return entity && (entity.kind === 'player' ? entity.deathSaves.failures < 3 : entity.hp > 0);
    });
    if (!players.length || participantIds.length < 2) return false;
    // Las tiradas pertenecen a la mesa: el servidor sólo recibe el total que
    // cada participante ha tirado físicamente y nunca genera un d20 aquí.
    const initiative = Object.fromEntries(participantIds.map(id => [id, 0]));
    this.combat = { ...emptyCombat(), active: true, round: 0, order: [...participantIds], turnIndex: 0, initiative, initiativeSubmitted: {}, initiativePending: true, participantIds, openingAction: openingAction ?? null,
      recharge: Object.fromEntries(participantIds.map(id => [id, Object.fromEntries((this.combatEntity(id)?.attacks ?? []).filter(action => action.recharge).map(action => [action.id, true]))])) };
    this.setCombatEvent('Combate iniciado. Cada participante tira iniciativa físicamente e introduce su total.', 'turn');
    return true;
  }

  private activateOpeningAction() {
    const opening = this.combat.openingAction;
    if (!opening || this.currentCombatId() !== opening.attackerId || this.combat.pending) return;
    this.combat.openingAction = null;
    const result = this.declareCombatAction(opening.attackerId, opening.targetId, opening.actionId, true);
    if (!result.ok) this.setCombatEvent(`La acción hostil que inició el combate ya no puede resolverse (${result.code}).`, 'turn');
  }

  private explorationTarget(targetId: string) {
    const object = this.interactionObject(targetId);
    if (object) return { kind: 'object' as const, cell: object.cell, label: object.label };
    const entity = this.combatEntity(targetId);
    if (!entity || entity.hp <= 0 || entity.kind === 'creature' && (!this.creature?.visible || this.creature.sceneId !== this.sceneId) || entity.kind === 'npc' && (!this.npcs.get(targetId)?.visible || this.npcs.get(targetId)?.sceneId !== this.sceneId)) return null;
    return { kind: 'living' as const, cell: this.entityCell(targetId)!, label: entity.label };
  }

  private explorationDistanceMeters(character: CharacterState, cell: Cell) {
    return Math.max(Math.abs(character.cell.col - cell.col), Math.abs(character.cell.row - cell.row)) * 1.5;
  }

  declareExplorationAction(characterId: string, targetId: string | undefined, actionId: string, targetCell?: Cell) {
    if (this.combat.active) return { ok: false as const, code: 'COMBAT_ACTIVE' };
    const character = this.characters.get(characterId);
    const action = character?.explorationActions.find(candidate => candidate.id === actionId);
    if (!character || !action) return { ok: false as const, code: 'INVALID_TARGET' };
    let target: { kind: 'object' | 'living' | 'point' | 'self' | 'none'; cell: Cell; label: string };
    if (action.target === 'point') {
      if (targetId || !targetCell || !this.isCurrentSceneCell(targetCell)) return { ok: false as const, code: 'INVALID_TARGET' };
      target = { kind: 'point', cell: cloneCell(targetCell), label: `casilla ${targetCell.col + 1}, ${targetCell.row + 1}` };
    } else if (action.target === 'self') {
      if (targetId || targetCell) return { ok: false as const, code: 'INVALID_TARGET' };
      target = { kind: 'self', cell: cloneCell(character.cell), label: character.label };
    } else if (action.target === 'none') {
      if (targetId || targetCell) return { ok: false as const, code: 'INVALID_TARGET' };
      target = { kind: 'none', cell: cloneCell(character.cell), label: 'sin objetivo' };
    } else {
      const selected = targetId ? this.explorationTarget(targetId) : null;
      if (!selected || targetCell || targetId === characterId || action.target !== 'any' && action.target !== selected.kind) return { ok: false as const, code: 'INVALID_TARGET' };
      target = selected;
    }
    if (this.explorationDistanceMeters(character, target.cell) > action.rangeMeters + .001) return { ok: false as const, code: 'OUT_OF_RANGE' };
    const resource = action.resource ? character.combat.resources[action.resource.id] : undefined;
    if (!action.ritual && action.resource && (!resource || resource.current < action.resource.cost)) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
    if (!action.ritual && action.resource && resource) resource.current -= action.resource.cost;
    if (action.concentration) this.startConcentration(character.id, action.id, action.label);
    return { ok: true as const, code: 'EXPLORATION_ACTION_DECLARED', action, target };
  }

  declareExplorationBasicAction(characterId: string, actionId: ExplorationBasicAction, targetId?: string, targetCell?: Cell) {
    if (this.combat.active) return { ok: false as const, code: 'COMBAT_ACTIVE' };
    const character = this.characters.get(characterId), action = explorationBasicActionCatalogue[actionId];
    if (!character || !character.explorationBasics.includes(actionId)) return { ok: false as const, code: 'UNKNOWN_ACTION' };
    if (this.conditionsFor(characterId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };

    let targetLabel = 'la zona cercana';
    if (action.target === 'self') {
      if (targetId || targetCell) return { ok: false as const, code: 'INVALID_TARGET' };
      targetLabel = character.label;
    } else if (action.target === 'point') {
      if (targetId || !targetCell || !this.isCurrentSceneCell(targetCell)) return { ok: false as const, code: 'INVALID_TARGET' };
      targetLabel = `casilla ${targetCell.col + 1}, ${targetCell.row + 1}`;
    } else if (action.target === 'living') {
      const selected = targetId ? this.explorationTarget(targetId) : null;
      if (!selected || selected.kind !== 'living' || targetCell || targetId === characterId) return { ok: false as const, code: 'INVALID_TARGET' };
      targetLabel = selected.label;
    } else if (targetId) {
      const selected = this.explorationTarget(targetId);
      if (!selected || targetCell || targetId === characterId) return { ok: false as const, code: 'INVALID_TARGET' };
      targetLabel = selected.label;
    } else if (targetCell) {
      if (!this.isCurrentSceneCell(targetCell)) return { ok: false as const, code: 'INVALID_TARGET' };
      targetLabel = `casilla ${targetCell.col + 1}, ${targetCell.row + 1}`;
    } else if (actionId === 'use-object') targetLabel = 'el equipo que declares';

    const guidance = actionId === 'jump' ? jumpGuidance(character.sheet?.strengthScore) : action.guidance;
    if (actionId === 'jump' && targetCell && character.sheet?.strengthScore !== undefined) {
      const distanceFeet = Math.max(Math.abs(targetCell.col - character.cell.col), Math.abs(targetCell.row - character.cell.row)) * 5;
      if (distanceFeet > character.sheet.strengthScore) return { ok: false as const, code: 'JUMP_OUT_OF_RANGE' };
    }

    this.lastExplorationAction = {
      id: crypto.randomUUID(), sceneId: this.sceneId, characterId, characterLabel: character.label,
      action: actionId, actionLabel: action.label, targetLabel, guidance, createdAt: Date.now()
    };
    return { ok: true as const, code: 'EXPLORATION_BASIC_DECLARED', action, targetLabel, guidance };
  }

  startCombatFromAttack(characterId: string, targetId: string, actionId: string) {
    if (this.combat.active) return { ok: false as const, code: 'COMBAT_ACTIVE' };
    const character = this.characters.get(characterId), action = character?.combat.attacks.find(candidate => candidate.id === actionId);
    const target = this.explorationTarget(targetId);
    if (!character || !action || action.resolution === 'guided' || !target || target.kind !== 'living' || targetId === characterId) return { ok: false as const, code: 'INVALID_TARGET' };
    if (this.attackNeedsThrownDagger(action) && !this.hasInventoryStack(characterId, /\bdagas?\b/i)
      || this.attackNeedsArrows(action) && !this.hasInventoryStack(characterId, /\bflechas?\b/i)) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
    if (this.explorationDistanceMeters(character, target.cell) > (action.range?.longMeters ?? action.range?.normalMeters ?? Number.POSITIVE_INFINITY) + .001) return { ok: false as const, code: 'OUT_OF_RANGE' };
    const npc = this.npcs.get(targetId);
    if (npc) npc.combatEnabled = true;
    if (!this.startCombat({ attackerId: characterId, targetId, actionId })) return { ok: false as const, code: 'COMBATANTS_REQUIRED' };
    this.setCombatEvent(`${character.label} inicia una acción hostil contra ${target.label}; se resolverá al llegar su iniciativa.`, 'turn', undefined, { actorId: characterId, targetId, animation: this.animationFor(action) });
    return { ok: true as const, code: 'COMBAT_STARTED' };
  }

  private beginCombatTurn(currentId: string) {
    this.combat.spentSquares[currentId] = 0; this.combat.dashSquares[currentId] = 0; this.combat.actionUsed[currentId] = false; this.combat.bonusActionUsed[currentId] = false; this.combat.reactionUsed[currentId] = false; this.combat.sneakAttackUsed[currentId] = false; delete this.combat.sequences[currentId]; delete this.combat.stances[currentId];
    for (const character of this.characters.values()) character.input.held = null;
    this.setCombatEvent(`Ronda ${this.combat.round} · turno de ${this.combatEntity(currentId)?.label ?? '—'}`, 'turn');
    const currentCharacter = this.characters.get(currentId);
    if (currentCharacter?.hp === 0) this.combat.pending = { id: crypto.randomUUID(), stage: 'death-save', attackerId: currentId, targetId: currentId, actionId: 'death-save', advantage: 'normal' };
    else this.activateOpeningAction();
  }

  nextCombatTurn() {
    if (!this.combat.active || this.combat.initiativePending || !this.combat.order.length || this.combat.pending) return false;
    let checked = 0;
    do {
      this.combat.turnIndex++;
      if (this.combat.turnIndex >= this.combat.order.length) { this.combat.turnIndex = 0; this.combat.round++; this.expireRoundConditions(); }
      checked++;
    } while (checked < this.combat.order.length && this.combatantCannotTakeTurn(this.currentCombatId()!));
    if (this.combatantCannotTakeTurn(this.currentCombatId()!)) return false;
    const currentId = this.currentCombatId()!;
    this.beginCombatTurn(currentId);
    return true;
  }
  private combatantCannotTakeTurn(entityId: string) {
    const entity = this.combatEntity(entityId); if (!entity) return true;
    if (entity.kind !== 'player') return entity.hp <= 0;
    return entity.deathSaves.failures >= 3 || entity.deathSaves.stable;
  }

  setCombatParticipant(entityId: string, active: boolean) {
    if (this.combat.active) return false;
    const npc = this.npcs.get(entityId); if (!npc || npc.sceneId !== this.sceneId) return false;
    npc.combatEnabled = active; return true;
  }
  setNpcVisible(entityId: string, visible: boolean) {
    if (this.combat.active) return false;
    const npc = this.npcs.get(entityId); if (!npc || npc.sceneId !== this.sceneId) return false;
    if (npc.visible === visible) return true;
    if (visible && (!this.walkableAt(npc.sceneId, npc.surfaceId, npc.cell) || this.actorReservations(npc.surfaceId).has(cellKey(npc.cell)))) return false;
    npc.visible = visible; return true;
  }
  prepareMirrorEncounter(sourceId?: string) {
    if (!this.campaign.encounter?.mirrorPlayer || !this.creature) return;
    const source = sourceId ? this.characters.get(sourceId) : [...this.characters.values()].find(character => Boolean(character.sessionToken)) ?? this.characters.values().next().value as CharacterState | undefined;
    if (!source) return;
    const maxHp = Math.max(1, Math.floor(source.maxHp * 0.75));
    this.creature.label = `Reflejo helado de ${source.label}`;
    this.creature.maxHp = maxHp; this.creature.hp = maxHp;
    this.creature.armorClass = source.combat.armorClass; this.creature.speedMeters = source.combat.speedMeters;
    this.creature.initiativeBonus = source.combat.initiativeBonus; this.creature.attacks = structuredClone(source.combat.attacks); this.creature.tokenId = source.tokenId; this.creature.resources = structuredClone(source.combat.resources); this.creature.ruleTraits = structuredClone(source.combat.ruleTraits); this.creature.damageResistances = [...source.combat.damageResistances]; this.creature.damageImmunities = [...source.combat.damageImmunities]; this.creature.conditionImmunities = [...source.combat.conditionImmunities]; this.creature.mimicOfPlayerId = source.id;
  }
  private allInitiativesSubmitted() { return this.combat.participantIds.every(id => this.combat.initiativeSubmitted[id]); }
  private proposedInitiativeOrder() {
    return [...this.combat.participantIds].sort((left, right) =>
      this.combat.initiative[right]! - this.combat.initiative[left]! ||
      (this.combatEntity(right)?.initiativeBonus ?? 0) - (this.combatEntity(left)?.initiativeBonus ?? 0) ||
      left.localeCompare(right)
    );
  }
  setInitiative(entries: Array<{ id: string; initiative: number }>) {
    if (!this.combat.active || !entries.length || new Set(entries.map(entry => entry.id)).size !== entries.length) return false;
    for (const entry of entries) if (!this.combat.participantIds.includes(entry.id)) return false;
    for (const entry of entries) { this.combat.initiative[entry.id] = entry.initiative; this.combat.initiativeSubmitted[entry.id] = true; }
    const current = this.currentCombatId(); this.combat.order = this.proposedInitiativeOrder(); this.combat.turnIndex = this.combat.initiativePending ? 0 : Math.max(0, this.combat.order.indexOf(current ?? ''));
    if (!this.combat.initiativePending) return true;
    this.setCombatEvent(this.allInitiativesSubmitted() ? 'Todas las iniciativas están registradas. El DM confirma el orden de turnos.' : 'Iniciativa registrada. Esperando los totales restantes.', 'turn');
    return true;
  }
  submitInitiative(characterId: string, initiative: number) {
    if (!this.combat.participantIds.includes(characterId)) return false;
    return this.setInitiative([{ id: characterId, initiative }]);
  }
  setInitiativeOrder(order: string[], confirm: boolean) {
    if (!this.combat.active || !this.combat.initiativePending || !this.allInitiativesSubmitted() || order.length !== this.combat.participantIds.length || new Set(order).size !== order.length || !order.every(id => this.combat.participantIds.includes(id))) return false;
    for (let index = 1; index < order.length; index++) if (this.combat.initiative[order[index - 1]!]! < this.combat.initiative[order[index]!]!) return false;
    this.combat.order = [...order]; this.combat.turnIndex = 0;
    if (!confirm) { this.setCombatEvent('Orden de iniciativa ajustado por el DM. Confírmalo para iniciar los turnos.', 'turn'); return true; }
    this.combat.initiativePending = false; this.combat.round = 1;
    this.beginCombatTurn(this.combat.order[0]!);
    return true;
  }
  setCombatCondition(entityId: string, condition: CombatCondition, active: boolean, source?: ConditionSource) {
    const entity = this.combatEntity(entityId);
    if (!entity || active && entity.conditionImmunities.includes(condition)) return false;
    const current = new Set(this.conditionsFor(entityId));
    const sources = this.conditionSourcesFor(entityId);
    const sameSource = (left: ConditionSource, right: ConditionSource) => left.condition === right.condition && left.sourceId === right.sourceId && left.sourceAbility === right.sourceAbility;
    let nextSources: ConditionSource[];
    if (active) {
      current.add(condition);
      const next = source ? { ...source, ...(source.durationRounds !== undefined && source.appliedAtRound === undefined ? { appliedAtRound: this.combat.round } : {}) } : { condition };
      nextSources = [...sources.filter(item => !sameSource(item, next)), next];
    } else if (source) {
      nextSources = sources.filter(item => !sameSource(item, source));
      if (!nextSources.some(item => item.condition === condition)) current.delete(condition);
    } else {
      current.delete(condition);
      nextSources = sources.filter(item => item.condition !== condition);
    }
    if (current.size) this.conditions[entityId] = [...current]; else delete this.conditions[entityId];
    if (nextSources.length) this.conditionSources[entityId] = nextSources; else delete this.conditionSources[entityId];
    if (active && (condition === 'inconsciente' || condition === 'paralizada')) this.endConcentration(entityId);
    return true;
  }
  private expireRoundConditions() {
    for (const [entityId, sources] of Object.entries(this.conditionSources)) for (const source of [...sources]) {
      if (source.durationRounds !== undefined && source.appliedAtRound !== undefined && this.combat.round >= source.appliedAtRound + source.durationRounds) this.setCombatCondition(entityId, source.condition, false, source);
    }
  }
  private entityCell(id: string) { return this.characters.get(id)?.cell ?? (this.creature?.id === id ? this.creature.cell : this.npcs.get(id)?.cell) ?? null; }
  private entitySceneId(id: string) { return this.characters.get(id)?.sceneId ?? (this.creature?.id === id ? this.creature.sceneId : this.npcs.get(id)?.sceneId) ?? null; }
  private entitySurfaceId(id: string) { return this.characters.get(id)?.surfaceId ?? (this.creature?.id === id ? this.creature.surfaceId : this.npcs.get(id)?.surfaceId) ?? null; }
  private distanceMeters(firstId: string, secondId: string) {
    const first = this.entityCell(firstId), second = this.entityCell(secondId); if (!first || !second) return Number.POSITIVE_INFINITY;
    if (this.entitySceneId(firstId) !== this.entitySceneId(secondId) || this.entitySurfaceId(firstId) !== this.entitySurfaceId(secondId)) return Number.POSITIVE_INFINITY;
    return Math.max(Math.abs(first.col - second.col), Math.abs(first.row - second.row)) * 1.5;
  }
  private distanceToCellMeters(entityId: string, cell: Cell) {
    const source = this.entityCell(entityId); if (!source) return Number.POSITIVE_INFINITY;
    return Math.max(Math.abs(source.col - cell.col), Math.abs(source.row - cell.row)) * 1.5;
  }
  private isCurrentSceneCell(cell: Cell) {
    const { cols, rows } = this.currentScene().grid;
    return Number.isInteger(cell.col) && Number.isInteger(cell.row) && cell.col >= 0 && cell.row >= 0 && cell.col < cols && cell.row < rows;
  }
  private attackAdvantage(attackerId: string, targetId: string, action: CombatAction): CombatPrompt['advantage'] {
    const own = new Set(this.conditionsFor(attackerId)), target = new Set(this.conditionsFor(targetId));
    const distance = this.distanceMeters(attackerId, targetId), ranged = action.range?.kind === 'ranged';
    const attackerController = this.combatEntity(attackerId)?.controller;
    const nearbyHostile = this.combat.participantIds.some(id => {
      const entity = this.combatEntity(id), conditions = this.conditionsFor(id);
      return id !== attackerId && (entity?.hp ?? 0) > 0 && entity?.controller !== attackerController && this.distanceMeters(attackerId, id) <= 1.5 && !conditions.includes('inconsciente') && !conditions.includes('invisible');
    });
    const targetDodging = this.combat.stances[targetId]?.action === 'dodge' && !target.has('apresada') && !target.has('restringida') && !target.has('inconsciente');
    const hasDisadvantage = own.has('envenenada') || own.has('restringida') || own.has('apresada') || own.has('asustada') || own.has('inconsciente') || own.has('paralizada') || own.has('derribada') || target.has('invisible') || targetDodging || Boolean(ranged && (nearbyHostile || action.range?.longMeters && distance > action.range.normalMeters || target.has('derribada') && distance > 1.5));
    // La proximidad se valida al ejecutar Ayudar. Después la distracción sigue
    // valiendo hasta el siguiente ataque aliado o el comienzo del turno de quien ayuda.
    const helped = this.combat.participantIds.some(id => id !== attackerId && this.combatEntity(id)?.controller === attackerController && this.combat.stances[id]?.action === 'help' && this.combat.stances[id]?.targetId === targetId);
    const hasAdvantage = own.has('oculta') || own.has('invisible') || helped || target.has('restringida') || target.has('apresada') || target.has('inconsciente') || target.has('paralizada') || Boolean(target.has('derribada') && distance <= 1.5);
    if (hasAdvantage && hasDisadvantage) return 'normal';
    return hasDisadvantage ? 'disadvantage' : hasAdvantage ? 'advantage' : 'normal';
  }
  private canSneakAttack(attackerId: string, targetId: string, action: CombatAction, advantage: CombatPrompt['advantage']) {
    const attacker = this.combatEntity(attackerId), dice = attacker?.ruleTraits.sneakAttackDice;
    if (!dice || this.combat.sneakAttackUsedTurn[attackerId] === this.combatTurnKey() || !(action.finesse || action.range?.kind === 'ranged') || advantage === 'disadvantage') return false;
    if (advantage === 'advantage') return true;
    const targetCell = this.entityCell(targetId); if (!targetCell) return false;
    return this.combat.participantIds.some(id => id !== attackerId && id !== targetId && this.combatEntity(id)?.controller === attacker.controller && (this.combatEntity(id)?.hp ?? 0) > 0 && Math.max(Math.abs((this.entityCell(id)?.col ?? 999) - targetCell.col), Math.abs((this.entityCell(id)?.row ?? 999) - targetCell.row)) <= 1);
  }
  private actionCost(action: CombatAction) { return action.actionCost ?? 'action'; }
  private combatResourcesFor(entityId: string) {
    return this.characters.get(entityId)?.combat.resources ?? (this.creature?.id === entityId ? this.creature.resources : {});
  }
  private hasActionAvailable(entityId: string, action: CombatAction) {
    if (!this.combat.active || this.combat.initiativePending || !this.combat.participantIds.includes(entityId)) return false;
    const cost = this.actionCost(action);
    const prepared = this.combat.stances[entityId]?.action === 'ready' && !this.combat.reactionUsed[entityId];
    if (this.combat.sequences[entityId]?.actionId === action.id) return this.currentCombatId() === entityId || prepared;
    return cost === 'reaction' ? !this.combat.reactionUsed[entityId] : cost === 'bonus' ? this.currentCombatId() === entityId && !this.combat.bonusActionUsed[entityId] : this.currentCombatId() === entityId && !this.combat.actionUsed[entityId] || prepared;
  }
  private consumeActionCost(entityId: string, action: CombatAction) {
    const cost = this.actionCost(action);
    if (cost === 'reaction') this.combat.reactionUsed[entityId] = true;
    else if (cost === 'bonus') this.combat.bonusActionUsed[entityId] = true;
    else this.combat.actionUsed[entityId] = true;
  }
  private actionConsumed(attackerId: string, action: CombatAction, targetId?: string) {
    const prepared = this.combat.stances[attackerId]?.action === 'ready', finish = () => {
      if (prepared) { this.combat.reactionUsed[attackerId] = true; delete this.combat.stances[attackerId]; }
      else this.consumeActionCost(attackerId, action);
    };
    const sequence = this.combat.sequences[attackerId];
    this.consumeActionResource(attackerId, action, Boolean(sequence));
    if (sequence?.actionId === action.id) { sequence.remaining--; if (sequence.remaining <= 0) { delete this.combat.sequences[attackerId]; finish(); } return; }
    // Extra Attack applies on your own turn, not to a readied weapon attack.
    const count = prepared && !action.magical ? 1 : action.attackCount ?? 1;
    if (count > 1) {
      if (!prepared) this.consumeActionCost(attackerId, action);
      this.combat.sequences[attackerId] = { actionId: action.id, remaining: count - 1, ...(action.lockSequenceTarget && targetId ? { targetId } : {}) };
    }
    else finish();
  }
  private consumeActionResource(attackerId: string, action: CombatAction, continuing = false) {
    if (action.resource && !continuing) {
      const resource = this.combatResourcesFor(attackerId)[action.resource.id];
      if (resource) resource.current = Math.max(0, resource.current - action.resource.cost);
      if (this.isSlottedSpell(action)) this.combat.spellSlotUsedTurn[attackerId] = this.combatTurnKey();
    }
    // A thrown dagger leaves the character's pack whether it hits or misses.
    if (this.attackNeedsThrownDagger(action)) this.consumeInventoryStack(attackerId, /\bdagas?\b/i);
    if (this.attackNeedsArrows(action)) this.consumeInventoryStack(attackerId, /\bflechas?\b/i);
    if (/light-torch|encender-antorcha/i.test(action.id) || /encender antorcha/i.test(action.label)) this.consumeInventoryStack(attackerId, /\bantorchas?\b/i);
  }
  private attackNeedsThrownDagger(action: CombatAction) { return action.inventoryCost === 'dagger' || /thrown-dagger|lanzar-daga/i.test(action.id) || /lanzar daga|daga arrojadiza/i.test(action.label); }
  private attackNeedsArrows(action: CombatAction) { return action.inventoryCost === 'arrow'; }
  private hasInventoryStack(characterId: string, itemPattern: RegExp) {
    return this.characters.get(characterId)?.inventory.some(item => itemPattern.test(item)) ?? false;
  }
  private consumeInventoryStack(characterId: string, itemPattern: RegExp) {
    const character = this.characters.get(characterId); if (!character) return false;
    const index = character.inventory.findIndex(item => itemPattern.test(item));
    if (index < 0) return false;
    const item = character.inventory[index]!;
    const suffix = /^(.*?)\s*(?:×|x)\s*(\d+)\s*$/i.exec(item), prefix = /^(\d+)\s+(.+)$/.exec(item);
    const quantity = suffix ? Number(suffix[2]) : prefix ? Number(prefix[1]) : 1;
    if (quantity <= 1) character.inventory.splice(index, 1);
    else {
      const label = (suffix?.[1] ?? prefix?.[2] ?? item).trim();
      character.inventory[index] = `${label} ×${quantity - 1}`;
    }
    return true;
  }
  private promptFor(pending: PendingCombatResolution): CombatPrompt {
    const attacker = this.combatEntity(pending.attackerId)!, target = this.combatEntity(pending.targetId)!;
    const action = attacker.attacks.find(item => item.id === pending.actionId);
    if (pending.stage === 'death-save') return { id: pending.id, stage: 'death-save', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · salvación de muerte`, instruction: 'Tira 1d20 natural. 10 o más es un éxito; 1 cuenta como dos fallos y 20 recupera 1 PG.', advantage: 'normal', minimum: 1, maximum: 20 };
    if (pending.stage === 'reaction') return { id: pending.id, stage: 'reaction', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · ataque de oportunidad`, instruction: `${target.label} va a salir de tu alcance. ¿Gastas tu reacción para hacer ${action?.label ?? 'un ataque cuerpo a cuerpo'} antes de que se mueva?`, advantage: 'normal' };
    if (pending.stage === 'concentration') return { id: pending.id, stage: 'concentration', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · concentración`, instruction: `Tira salvación de Constitución CD ${pending.concentrationDc ?? 10} e introduce el total con modificador.`, advantage: 'normal', minimum: -30, maximum: 100 };
    if (pending.stage === 'check') return { id: pending.id, stage: 'check', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · esconderse`, instruction: 'Si estás fuera de la vista y tienes oscuridad intensa o cobertura de tres cuartos o total, tira Destreza (Sigilo) CD 15. Si tienes éxito, quedas Invisible; el resultado será la CD para detectarte.', advantage: 'normal', minimum: -30, maximum: 100 };
    if (pending.stage === 'attack') return { id: pending.id, stage: 'attack', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · ${action?.label ?? 'Ataque'}`, instruction: `Tira el d20${pending.advantage === 'advantage' ? ' dos veces y anota el mayor' : pending.advantage === 'disadvantage' ? ' dos veces y anota el menor' : ''}. Introduce solo el resultado natural: el sistema añade ${action?.attackBonus ?? 0 >= 0 ? '+' : ''}${action?.attackBonus ?? 0}. Dificultad de impacto: CA ${target.armorClass}.`, advantage: pending.advantage, minimum: 1, maximum: 20 };
    if (pending.stage === 'damage') {
      const range = this.damageDiceRange(pending.diceFormula ?? '1d1');
      return { id: pending.id, stage: 'damage', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} impacta a ${target.label}`, instruction: `Introduce solo la suma de los dados de daño (${pending.diceFormula}); el modificador se añade automáticamente.`, advantage: 'normal', minimum: range.minimum, maximum: range.maximum };
    }
    if (pending.stage === 'save') return { id: pending.id, stage: 'save', actorId: pending.targetId, targetId: pending.targetId, title: `${target.label} · salvación`, instruction: `Tira salvación de ${action?.save?.ability.toUpperCase()} CD ${action?.save?.dc}${pending.advantage === 'disadvantage' ? ' dos veces y usa el menor' : pending.advantage === 'advantage' ? ' dos veces y usa el mayor' : ''}; introduce el total con modificador.`, advantage: pending.advantage, minimum: -30, maximum: 100 };
    const entangle = pending.source?.sourceAbility === 'entangle';
    return { id: pending.id, stage: 'escape', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · liberarse`, instruction: `Acción: tira ${entangle ? 'Fuerza (Atletismo) o Destreza (Acrobacias)' : 'Atletismo o Acrobacias'} CD ${pending.source?.escapeDc ?? 10}${pending.advantage === 'disadvantage' ? ' dos veces y usa el menor' : ''}; introduce el total con modificador.`, advantage: pending.advantage, minimum: -30, maximum: 100 };
  }
  combatPromptFor(controller: 'player' | 'dm', characterId?: string) {
    const pending = this.combat.pending; if (!pending) return null;
    const rollingId = pending.stage === 'save' ? pending.targetId : pending.attackerId;
    const actor = this.combatEntity(rollingId);
    // El DM puede resolver cualquier dado desde su consola; el jugador solo
    // recibe el suyo propio. Esto mantiene una mesa presencial bajo control.
    if (controller === 'player' && (actor?.controller !== 'player' || rollingId !== characterId)) return null;
    return { ...this.promptFor(pending), selectionActorId: pending.attackerId, cancellable: this.canCancelCombatAction() };
  }

  private continueOpportunityMovement(movement: PendingMovement) {
    const entity = this.combatEntity(movement.entityId), current = this.entityCell(movement.entityId);
    if (!entity || entity.hp <= 0 || !current || Math.abs(movement.destination.col - current.col) + Math.abs(movement.destination.row - current.row) !== 1 || !this.canSpendMovement(movement.entityId)) return false;
    const sceneId = this.entitySceneId(movement.entityId)!, scene = this.sceneById(sceneId), currentSurfaceId = this.entitySurfaceId(movement.entityId)!;
    const destinationSurfaceId = movement.destinationSurfaceId ?? (scene.terrain
      ? this.terrainStepDestination(scene, currentSurfaceId, current, movement.destination)?.surfaceId : currentSurfaceId);
    if (!destinationSurfaceId || !this.walkableAt(sceneId, destinationSurfaceId, movement.destination)
      || this.publicObjectProps(sceneId).some(prop => prop.surfaceId === destinationSurfaceId && prop.structure !== 'destroyed' && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(cell => sameCell(cell, movement.destination)))) return false;
    const occupied = this.combat.participantIds.some(id => id !== movement.entityId && (this.combatEntity(id)?.hp ?? 0) > 0
      && this.entitySceneId(id) === sceneId && this.entitySurfaceId(id) === destinationSurfaceId && sameCell(this.entityCell(id) ?? { col: -999, row: -999 }, movement.destination));
    if (occupied) return false;
    if (this.queueOpportunityMovement(movement.entityId, movement.destination, destinationSurfaceId, movement.reactorsChecked)) return true;
    return this.commitGridMove(movement.entityId, movement.destination, destinationSurfaceId);
  }

  submitCombatReaction(controller: 'player' | 'dm', reactingCharacterId: string | null, promptId: string, accept: boolean) {
    const pending = this.combat.pending;
    if (!pending || pending.id !== promptId) return { ok: false as const, code: 'PROMPT_STALE' };
    if (pending.stage !== 'reaction' || !pending.movement) return { ok: false as const, code: 'PROMPT_STAGE_MISMATCH' };
    const reactor = this.combatEntity(pending.attackerId), target = this.combatEntity(pending.targetId);
    if (!reactor || !target) return { ok: false as const, code: 'INVALID_TARGET' };
    if (controller === 'player' && (reactor.controller !== 'player' || reactingCharacterId !== reactor.id)) return { ok: false as const, code: 'WRONG_ACTOR' };
    const movement = structuredClone(pending.movement);
    if (!accept) {
      this.combat.pending = null;
      this.continueOpportunityMovement(movement);
      return { ok: true as const, code: 'REACTION_DECLINED' };
    }
    if (this.combat.reactionUsed[reactor.id] || reactor.hp <= 0 || this.conditionsFor(reactor.id).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'REACTION_USED' };
    const action = reactor.attacks.find(item => item.id === pending.actionId);
    if (!action || action.range?.kind !== 'melee') return { ok: false as const, code: 'UNKNOWN_ACTION' };
    this.combat.reactionUsed[reactor.id] = true;
    const advantage = this.attackAdvantage(reactor.id, target.id, action);
    const canSneak = this.canSneakAttack(reactor.id, target.id, action, advantage);
    this.combat.pending = { ...pending, id: crypto.randomUUID(), stage: 'attack', advantage, useSneakAttack: canSneak, ...(canSneak ? { sneakAttackDice: reactor.ruleTraits.sneakAttackDice } : {}) };
    for (const condition of ['oculta', 'invisible'] as const) if (this.conditionsFor(reactor.id).includes(condition)) this.setCombatCondition(reactor.id, condition, false);
    return { ok: true as const, code: 'ROLL_REQUIRED' };
  }

  private queueConcentrationChecks(checks: Array<{ entityId: string; dc: number }>) {
    const remaining = checks.filter(check => this.concentration[check.entityId] && (this.combatEntity(check.entityId)?.hp ?? 0) > 0);
    const first = remaining.shift();
    if (!first) return false;
    this.combat.pending = { id: crypto.randomUUID(), stage: 'concentration', attackerId: first.entityId, targetId: first.entityId, actionId: this.concentration[first.entityId]!.actionId, advantage: 'normal', concentrationDc: first.dc, concentrationQueue: remaining };
    return true;
  }
  declareCombatAction(attackerId: string, targetId: string | undefined, actionId: string, useSneakAttack = false, targetCell?: Cell) {
    if (!this.combat.active) return { ok: false as const, code: 'COMBAT_INACTIVE' };
    if (this.combat.pending) return { ok: false as const, code: 'ROLL_PENDING' };
    const attacker = this.combatEntity(attackerId), target = targetId ? this.combatEntity(targetId) : undefined;
    if (!attacker) return { ok: false as const, code: 'UNKNOWN_ACTOR' };
    const action = attacker.attacks.find(item => item.id === actionId); if (!action) return { ok: false as const, code: 'UNKNOWN_ACTION' };
    if (this.characters.has(attackerId) && (this.attackNeedsThrownDagger(action) && !this.hasInventoryStack(attackerId, /\bdagas?\b/i)
      || this.attackNeedsArrows(action) && !this.hasInventoryStack(attackerId, /\bflechas?\b/i))) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
    if (!this.hasActionAvailable(attackerId, action)) return { ok: false as const, code: this.currentCombatId() === attackerId ? 'ACTION_USED' : 'NOT_YOUR_TURN' };
    if (action.targeting === 'point') {
      if (targetId || !targetCell || !this.isCurrentSceneCell(targetCell)) return { ok: false as const, code: 'INVALID_TARGET' };
      const limit = action.range?.longMeters ?? action.range?.normalMeters;
      if (limit !== undefined && this.distanceToCellMeters(attackerId, targetCell) > limit + .001) return { ok: false as const, code: 'OUT_OF_RANGE' };
      if (this.conditionsFor(attackerId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
      const resource = action.resource ? this.combatResourcesFor(attackerId)[action.resource.id] : undefined;
      if (action.resource && (!resource || resource.current < action.resource.cost)) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
      if (action.id === 'light-torch' && !this.hasInventoryStack(attackerId, /\bantorchas?\b/i)) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
      if (!this.spellSlotAvailable(attackerId, action)) return { ok: false as const, code: 'SPELL_SLOT_USED_THIS_TURN' };
      this.consumeActionCost(attackerId, action); this.consumeActionResource(attackerId, action);
      if (action.concentration) this.startConcentration(attackerId, action.id, action.label);
      const location = `casilla ${targetCell.col + 1}, ${targetCell.row + 1}`;
      this.setCombatEvent(`${attacker.label} declara ${action.label} sobre ${location}. Resolver con el DM: ${action.guidance ?? 'aplicar la consecuencia acordada y registrarla.'}`, 'turn', `${attacker.label} declara ${action.label} sobre ${location}. Resolver con el DM.`, { actorId: attacker.id, animation: this.animationFor(action) });
      return { ok: true as const, code: 'GUIDED_RESOLUTION' };
    }
    const targetDefeated = target?.kind === 'player' ? target.deathSaves.failures >= 3 : (target?.hp ?? 0) <= 0;
    if (!target || action.resolution !== 'guided' && attackerId === targetId || !targetId || !this.combat.participantIds.includes(targetId) || targetDefeated) return { ok: false as const, code: 'INVALID_TARGET' };
    if (action.resolution !== 'guided' && target.controller === attacker.controller) return { ok: false as const, code: 'INVALID_TARGET' };
    const combatTargetId = target.id;
    if (this.conditionsFor(attackerId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    const resource = action.resource ? this.combatResourcesFor(attackerId)[action.resource.id] : undefined;
    const sequence = this.combat.sequences[attackerId];
    if (!sequence && action.resource && (!resource || resource.current < action.resource.cost)) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
    if (sequence && sequence.actionId !== actionId) return { ok: false as const, code: 'ACTION_USED' };
    if (sequence?.targetId && sequence.targetId !== targetId) return { ok: false as const, code: 'INVALID_TARGET' };
    if (!sequence && !this.spellSlotAvailable(attackerId, action)) return { ok: false as const, code: 'SPELL_SLOT_USED_THIS_TURN' };
    if (action.recharge && this.combat.recharge[attackerId]?.[action.id] === false && sequence?.actionId !== action.id) return { ok: false as const, code: 'RECHARGE_REQUIRED' };
    const distance = this.distanceMeters(attackerId, combatTargetId), limit = action.range?.longMeters ?? action.range?.normalMeters;
    if (limit !== undefined && distance > limit + .001) return { ok: false as const, code: 'OUT_OF_RANGE' };
    if (action.resolution === 'guided') {
      this.consumeActionCost(attackerId, action); this.consumeActionResource(attackerId, action);
      if (action.concentration) this.startConcentration(attackerId, action.id, action.label);
      this.setCombatEvent(`${attacker.label} declara ${action.label}. Resolver con el DM: ${action.guidance ?? 'aplicar la consecuencia acordada y registrarla.'}`, 'turn', `${attacker.label} declara ${action.label}. Resolver con el DM.`, { actorId: attacker.id, targetId: target.id, animation: this.animationFor(action) });
      return { ok: true as const, code: 'GUIDED_RESOLUTION' };
    }
    if (action.save) {
      const targetConditions = new Set(this.conditionsFor(combatTargetId));
      const targetTraits = target.ruleTraits;
      const saveHasDisadvantage = action.save.ability === 'dex' && (targetConditions.has('restringida') || targetConditions.has('apresada'));
      const targetDodging = this.combat.stances[combatTargetId]?.action === 'dodge' && !targetConditions.has('apresada') && !targetConditions.has('restringida') && !targetConditions.has('inconsciente');
      const saveHasAdvantage = action.save.failureCondition === 'asustada' && targetTraits.brave || action.damageType === 'veneno' && targetTraits.poisonResilience || action.magical && targetTraits.magicResistance || action.save.ability === 'dex' && targetDodging;
      const saveAdvantage: CombatPrompt['advantage'] = saveHasAdvantage && saveHasDisadvantage ? 'normal' : saveHasAdvantage ? 'advantage' : saveHasDisadvantage ? 'disadvantage' : 'normal';
      this.combat.pending = { id: crypto.randomUUID(), stage: 'save', attackerId, targetId: combatTargetId, actionId, advantage: saveAdvantage, source: { condition: action.save.failureCondition ?? 'restringida', sourceId: attackerId, sourceAbility: action.id, escapeDc: action.save.escapeDc, endsWhenSourceDefeated: action.save.endsWhenSourceDefeated } };
    }
    else if (action.automaticHit) {
      this.combat.pending = { id: crypto.randomUUID(), stage: 'damage', attackerId, targetId: combatTargetId, actionId, advantage: 'normal', diceFormula: action.damageDice, damageBonus: action.damageBonus };
    } else {
      const advantage = this.attackAdvantage(attackerId, combatTargetId, action);
      const canSneak = useSneakAttack && this.canSneakAttack(attackerId, combatTargetId, action, advantage);
      this.combat.pending = { id: crypto.randomUUID(), stage: 'attack', attackerId, targetId: combatTargetId, actionId, advantage, useSneakAttack: canSneak, ...(canSneak ? { sneakAttackDice: attacker.ruleTraits.sneakAttackDice } : {}) };
    }
    return { ok: true as const, code: 'ROLL_REQUIRED' };
  }
  private damageDiceRange(formula: string) {
    return formula.split('+').reduce((range, part) => {
      const match = /^(\d+)d(\d+)$/.exec(part);
      if (!match) return range;
      const count = Number(match[1]), sides = Number(match[2]);
      return { minimum: range.minimum + count, maximum: range.maximum + count * sides };
    }, { minimum: 0, maximum: 0 });
  }
  submitCombatRoll(controller: 'player' | 'dm', rollingCharacterId: string | null, expectedStage: PendingCombatResolution['stage'], promptId: string, value: number) {
    const pending = this.combat.pending; if (!pending || pending.id !== promptId) return { ok: false as const, code: 'PROMPT_STALE' };
    if (pending.stage !== expectedStage) return { ok: false as const, code: 'PROMPT_STAGE_MISMATCH' };
    const rollingId = pending.stage === 'save' ? pending.targetId : pending.attackerId;
    if (controller === 'player' && this.combatEntity(rollingId)?.controller !== 'player') return { ok: false as const, code: 'WRONG_CONTROLLER' };
    if (controller === 'player' && rollingCharacterId !== rollingId) return { ok: false as const, code: 'WRONG_ACTOR' };
    const prompt = this.promptFor(pending);
    if (!Number.isInteger(value) || value < (prompt.minimum ?? Number.MIN_SAFE_INTEGER) || value > (prompt.maximum ?? Number.MAX_SAFE_INTEGER)) return { ok: false as const, code: pending.stage === 'damage' ? 'INVALID_DAMAGE_DICE' : 'INVALID_ROLL' };
    const attacker = this.combatEntity(pending.attackerId)!, target = this.combatEntity(pending.targetId)!;
    if (pending.stage === 'death-save') {
      const character = this.characters.get(pending.attackerId); if (!character || character.hp > 0) return { ok: false as const, code: 'INVALID_DEATH_SAVE' };
      if (value === 20) { this.applyHitPoints(character.id, 1); this.combat.pending = null; this.setCombatEvent(`${character.label} obtiene un 20 y recupera 1 PG.`, 'turn'); return { ok: true as const, code: 'DEATH_SAVE_REVIVED' }; }
      if (value === 1) character.deathSaves.failures = Math.min(3, character.deathSaves.failures + 2);
      else if (value >= 10) character.deathSaves.successes = Math.min(3, character.deathSaves.successes + 1);
      else character.deathSaves.failures = Math.min(3, character.deathSaves.failures + 1);
      if (character.deathSaves.successes >= 3) character.deathSaves.stable = true;
      this.combat.pending = null;
      const dead = character.deathSaves.failures >= 3, stable = character.deathSaves.stable;
      this.setCombatEvent(dead ? `${character.label} acumula tres fallos de salvación de muerte.` : stable ? `${character.label} queda estable.` : `${character.label}: salvaciones de muerte ${character.deathSaves.successes} éxitos / ${character.deathSaves.failures} fallos.`, dead ? 'defeat' : 'turn');
      return { ok: true as const, code: dead ? 'DEATH_SAVE_FAILED_FINAL' : stable ? 'DEATH_SAVE_STABLE' : value >= 10 ? 'DEATH_SAVE_SUCCESS' : 'DEATH_SAVE_FAILED' };
    }
    if (pending.stage === 'concentration') {
      const success = value >= (pending.concentrationDc ?? 10), spell = this.concentration[pending.attackerId];
      if (!success) this.endConcentration(pending.attackerId);
      const queue = pending.concentrationQueue ?? [];
      this.combat.pending = null;
      this.setCombatEvent(success ? `${attacker.label} mantiene la concentración en ${spell?.label ?? 'su conjuro'}.` : `${attacker.label} pierde la concentración en ${spell?.label ?? 'su conjuro'}.`, success ? 'turn' : 'damage');
      this.queueConcentrationChecks(queue);
      return { ok: true as const, code: success ? 'CONCENTRATION_MAINTAINED' : 'CONCENTRATION_BROKEN' };
    }
    if (pending.stage === 'escape') {
      const success = value >= (pending.source?.escapeDc ?? 10); this.combat.actionUsed[attacker.id] = true; if (success) this.setCombatCondition(attacker.id, pending.source!.condition, false, pending.source);
      this.combat.pending = null; this.setCombatEvent(success ? `${attacker.label} se libera.` : `${attacker.label} no logra liberarse.`, 'attack'); return { ok: true as const, code: success ? 'ESCAPE_SUCCESS' : 'ESCAPE_FAILED' };
    }
    if (pending.stage === 'check') {
      const success = value >= 15;
      if (success) this.setCombatCondition(attacker.id, 'invisible', true, { condition: 'invisible', sourceAbility: 'hide', sourceLabel: `Sigilo ${value}; CD para detectarle ${value}` });
      this.combat.pending = null;
      this.setCombatEvent(success ? `${attacker.label} se esconde y queda Invisible (CD ${value} para detectarle).` : `${attacker.label} falla Sigilo CD 15.`, 'turn');
      return { ok: true as const, code: success ? 'HIDE_SUCCESS' : 'HIDE_FAILED' };
    }
    const action = attacker.attacks.find(item => item.id === pending.actionId);
    // La selección pendiente todavía no es un lanzamiento ni un ataque.
    // Sus efectos empiezan cuando la mesa confirma la primera tirada.
    if (action && this.canCancelCombatAction()) {
      if (action.concentration && !this.combat.sequences[attacker.id]) this.startConcentration(attacker.id, action.id, action.label);
      for (const condition of ['oculta', 'invisible'] as const) if (this.conditionsFor(attacker.id).includes(condition)) this.setCombatCondition(attacker.id, condition, false);
    }
    if (!action) return { ok: false as const, code: 'UNKNOWN_ACTION' };
    if (pending.stage === 'save') {
      const automaticallyFails = this.conditionsFor(target.id).includes('paralizada') && (action.save?.ability === 'str' || action.save?.ability === 'dex');
      const success = !automaticallyFails && value >= (action.save?.dc ?? 10); if (!pending.opportunity) this.actionConsumed(attacker.id, action, target.id); if (action.recharge && !pending.opportunity) this.combat.recharge[attacker.id]![action.id] = false;
      if (!success && action.save?.failureCondition) this.setCombatCondition(target.id, action.save.failureCondition, true, pending.source);
      this.combat.pending = null; this.setCombatEvent(success ? `${target.label} supera ${action.label}.` : `${target.label} falla ${action.label} y queda ${action.save?.failureCondition ?? 'afectada'}.`, success ? 'attack' : 'damage', undefined, { actorId: attacker.id, targetId: target.id, animation: this.animationFor(action) });
      return { ok: true as const, code: success ? 'SAVE_SUCCESS' : 'SAVE_FAILED' };
    }
    if (pending.stage === 'attack') {
      const total = value + action.attackBonus, automaticCritical = this.conditionsFor(target.id).some(condition => condition === 'inconsciente' || condition === 'paralizada') && this.distanceMeters(attacker.id, target.id) <= 1.5;
      const critical = value === 20 || automaticCritical;
      const hit = value === 20 || value !== 1 && total >= target.armorClass;
      for (const helperId of this.combat.participantIds) if (this.combat.stances[helperId]?.action === 'help' && this.combat.stances[helperId]?.targetId === target.id) delete this.combat.stances[helperId];
      for (const condition of ['oculta', 'invisible'] as const) if (this.conditionsFor(attacker.id).includes(condition)) this.setCombatCondition(attacker.id, condition, false);
      if (!hit) {
        const movement = pending.movement;
        if (!pending.opportunity) this.actionConsumed(attacker.id, action, target.id);
        if (action.recharge && !pending.opportunity) this.combat.recharge[attacker.id]![action.id] = false;
        this.combat.pending = null;
        this.setCombatEvent(`${attacker.label} usa ${action.label}: falla.`, 'attack', `${attacker.label} ataca: falla.`, { actorId: attacker.id, targetId: target.id, animation: this.animationFor(action) });
        if (pending.opportunity && movement) this.continueOpportunityMovement(movement);
        return { ok: true as const, code: 'ATTACK_MISSED' };
      }
      const doubled = (formula: string) => formula.replace(/^(\d+)d(\d+)$/, (_match, count, sides) => `${Number(count) * 2}d${sides}`);
      const sneak = pending.sneakAttackDice ? critical ? doubled(pending.sneakAttackDice) : pending.sneakAttackDice : '';
      const diceFormula = `${critical ? doubled(action.damageDice) : action.damageDice}${sneak ? `+${sneak}` : ''}`;
      this.combat.pending = { ...pending, id: crypto.randomUUID(), stage: 'damage', critical, diceFormula, damageBonus: action.damageBonus };
      return { ok: true as const, code: 'DAMAGE_REQUIRED' };
    }
    const rawDamage = value + (pending.damageBonus ?? 0);
    const damage = action.damageType && target.damageImmunities.includes(action.damageType) ? 0 : action.damageType && target.damageResistances.includes(action.damageType) ? Math.floor(rawDamage / 2) : rawDamage;
    const targetWasAtZero = target.hp === 0;
    this.applyHitPoints(target.id, -damage);
    if (targetWasAtZero && damage > 0 && pending.critical) {
      const downed = this.characters.get(target.id);
      if (downed && downed.deathSaves.failures < 3) downed.deathSaves.failures = Math.min(3, downed.deathSaves.failures + 1);
    }
    if (pending.useSneakAttack) { this.combat.sneakAttackUsed[attacker.id] = true; this.combat.sneakAttackUsedTurn[attacker.id] = this.combatTurnKey(); } if (!pending.opportunity) this.actionConsumed(attacker.id, action, target.id); if (action.recharge && !pending.opportunity) this.combat.recharge[attacker.id]![action.id] = false;
    this.combat.pending = null;
    const targetAfter = this.combatEntity(target.id)!; const suffix = targetAfter.hp <= 0 ? ` ${targetAfter.label} queda fuera de combate.` : '';
    this.setCombatEvent(`${attacker.label} usa ${action.label}: ${damage} PG${action.damageType ? ` ${action.damageType}` : ''}.${suffix}`, targetAfter.hp <= 0 ? 'defeat' : 'damage', undefined, { actorId: attacker.id, targetId: target.id, animation: this.animationFor(action) });
    if (pending.opportunity && pending.movement) this.continueOpportunityMovement(pending.movement);
    const checks: Array<{ entityId: string; dc: number }> = [];
    if (damage > 0 && this.concentration[target.id] && targetAfter.hp > 0) checks.push({ entityId: target.id, dc: Math.max(10, Math.floor(damage / 2)) });
    if (!this.combat.pending) this.queueConcentrationChecks(checks);
    return { ok: true as const, code: 'ATTACK_RESOLVED' };
  }
  useBasicCombatAction(entityId: string, action: BasicCombatAction, targetId?: string) {
    if (!this.combat.active || this.currentCombatId() !== entityId) return { ok: false as const, code: 'NOT_YOUR_TURN' };
    if (this.combat.pending) return { ok: false as const, code: 'ROLL_PENDING' };
    const actor = this.combatEntity(entityId); if (!actor) return { ok: false as const, code: 'UNKNOWN_ACTOR' };
    if (this.conditionsFor(entityId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    if (this.combat.actionUsed[entityId]) return { ok: false as const, code: 'ACTION_USED' };
    if (action === 'help') {
      const target = targetId ? this.combatEntity(targetId) : null;
      if (!target || target.controller === actor.controller || target.id === entityId || this.distanceMeters(entityId, target.id) > 1.5) return { ok: false as const, code: 'INVALID_TARGET' };
    }
    this.combat.actionUsed[entityId] = true;
    if (action === 'dash') this.combat.dashSquares[entityId] = this.speedSquares(entityId);
    // Hide is a Dexterity (Stealth) check. It grants Invisible only after
    // the player succeeds and the table confirms cover or heavy obscurity.
    if (action === 'hide') {
      this.combat.pending = { id: crypto.randomUUID(), stage: 'check', attackerId: entityId, targetId: entityId, actionId: action, advantage: 'normal' };
      this.setCombatEvent(`${actor.label} intenta esconderse. Tira Sigilo CD 15 si está en oscuridad intensa o tras cobertura de tres cuartos o total y fuera de la línea de visión enemiga.`, 'turn');
      return { ok: true as const, code: 'ROLL_REQUIRED' };
    }
    else if (action === 'disengage' || action === 'dodge' || action === 'help' || action === 'ready') this.combat.stances[entityId] = { action, ...(targetId ? { targetId } : {}) };
    const labels: Record<BasicCombatAction, string> = { dash: 'Correr', disengage: 'Destrabarse', dodge: 'Esquivar', help: 'Ayudar', hide: 'Esconderse', influence: 'Influir', magic: 'Acción mágica', ready: 'Preparar', search: 'Buscar', study: 'Estudiar', 'use-object': 'Utilizar' };
    const guided = action === 'ready' || action === 'use-object' || action === 'search' || action === 'study' || action === 'influence' || action === 'magic';
    const effect: Partial<Record<BasicCombatAction, string>> = { dash: ' Ganas movimiento adicional igual a tu velocidad este turno.', disengage: ' Tu movimiento no provoca ataques de oportunidad este turno.', dodge: ' Hasta tu próximo turno, los ataques que ves contra ti tienen desventaja y tus TS de Destreza tienen ventaja; pierdes el beneficio si tu velocidad es 0 o quedas incapacitada.', help: ' El próximo ataque de un aliado contra el enemigo elegido tendrá ventaja; la proximidad se comprueba al ayudar.', hide: ' Requiere oscuridad intensa o cobertura de tres cuartos o total y estar fuera de la línea de visión enemiga; tira Sigilo CD 15 para quedar Invisible.', influence: ' El DM indica la habilidad y CD según la actitud de la criatura.', magic: ' Declara un conjuro o usa un objeto mágico cuya activación requiera una acción; el DM resuelve los efectos no automatizados.', ready: ' Declara un desencadenante perceptible y la acción o movimiento que harás; al ocurrir, puedes gastar tu reacción antes de tu próximo turno.', 'use-object': ' Utilizas un objeto que requiere una acción; el DM resuelve el uso y sus consecuencias.', search: ' El DM indica la habilidad y CD contextual.', study: ' El DM indica la habilidad y CD contextual.' };
    this.setCombatEvent(`${actor.label} usa ${labels[action]}.${effect[action] ?? ''}${guided ? ' Resolver con el DM y registrar la consecuencia.' : ''}`, 'turn');
    return { ok: true as const, code: guided ? 'GUIDED_RESOLUTION' : 'ACTION_RESOLVED' };
  }
  changeCombatPosture(entityId: string, prone: boolean) {
    if (!this.combat.active || this.currentCombatId() !== entityId) return { ok: false as const, code: 'NOT_YOUR_TURN' };
    if (this.combat.pending) return { ok: false as const, code: 'ROLL_PENDING' };
    const actor = this.combatEntity(entityId); if (!actor || actor.hp <= 0 || this.conditionsFor(entityId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    const isProne = this.conditionsFor(entityId).includes('derribada');
    if (isProne === prone) return { ok: true as const, code: 'NO_CHANGE' };
    if (!prone) {
      const conditions = this.conditionsFor(entityId);
      if (conditions.some(condition => condition === 'restringida' || condition === 'apresada' || condition === 'agarrada')) return { ok: false as const, code: 'MOVEMENT_SPENT' };
      const cost = Math.ceil(this.speedSquares(entityId) / 2), movement = this.combatMovement();
      if (!movement || movement.remainingSquares < cost) return { ok: false as const, code: 'MOVEMENT_SPENT' };
      this.combat.spentSquares[entityId] = (this.combat.spentSquares[entityId] ?? 0) + cost;
    }
    this.setCombatCondition(entityId, 'derribada', prone);
    this.setCombatEvent(prone ? `${actor.label} se tira al suelo sin gastar una acción.` : `${actor.label} se levanta gastando la mitad de su velocidad.`, 'turn');
    return { ok: true as const, code: prone ? 'DROPPED_PRONE' : 'STOOD_UP' };
  }
  declareEscape(entityId: string) {
    if (!this.combat.active || this.currentCombatId() !== entityId || this.combat.pending || this.combat.actionUsed[entityId]) return { ok: false as const, code: 'ACTION_USED' };
    const source = this.conditionSourcesFor(entityId).find(item => item.escapeDc !== undefined); if (!source) return { ok: false as const, code: 'NO_ESCAPE' };
    this.combat.pending = { id: crypto.randomUUID(), stage: 'escape', attackerId: entityId, targetId: entityId, actionId: source.sourceAbility ?? 'escape', advantage: this.conditionsFor(entityId).includes('envenenada') ? 'disadvantage' : 'normal', source };
    return { ok: true as const, code: 'ROLL_REQUIRED' };
  }
  rechargeCombatAction(attackerId: string, actionId: string, d6: number) {
    if (!this.combat.active || this.currentCombatId() !== attackerId || this.combat.pending) return false;
    const action = this.combatEntity(attackerId)?.attacks.find(item => item.id === actionId); if (!action?.recharge || this.combat.recharge[attackerId]?.[actionId] !== false) return false;
    const ready = d6 >= action.recharge.minimum && d6 <= action.recharge.maximum; this.combat.recharge[attackerId]![actionId] = ready;
    this.setCombatEvent(ready ? `${action.label}: recargada.` : `${action.label}: no se recarga.`, 'turn'); return true;
  }
  resolveAttack(attackerId: string, targetId: string, actionId: string, rolls?: { attack: number; damage: number }) {
    if (!rolls || !Number.isInteger(rolls.attack) || !Number.isInteger(rolls.damage))
      return { ok: false as const, code: 'ROLL_REQUIRED' };
    const declared = this.declareCombatAction(attackerId, targetId, actionId); if (!declared.ok) return declared;
    const controller = this.combatEntity(attackerId)!.controller;
    const firstStage = this.combat.pending!.stage;
    const firstValue = firstStage === 'damage' ? rolls.damage : rolls.attack;
    const first = this.submitCombatRoll(controller, controller === 'player' ? attackerId : null, firstStage, this.combat.pending!.id, firstValue);
    if (!first.ok || first.code === 'ATTACK_MISSED' || firstStage === 'damage') return first;
    return this.submitCombatRoll(controller, controller === 'player' ? attackerId : null, 'damage', this.combat.pending!.id, rolls.damage);
  }
  private clearConditionsFromDefeatedSource(sourceId: string) {
    for (const [targetId, sources] of Object.entries(this.conditionSources)) for (const source of sources) {
      if (source.sourceId === sourceId && source.endsWhenSourceDefeated) this.setCombatCondition(targetId, source.condition, false, source);
    }
  }
  applyHitPoints(entityId: string, delta: number) {
    const character = this.characters.get(entityId);
    if (character) {
      const previousHp = character.hp, incomingDamage = Math.max(0, -delta);
      character.hp = Math.max(0, Math.min(character.maxHp, character.hp + delta));
      const current = new Set(this.conditionsFor(entityId));
      if (character.hp <= 0) {
        current.add('inconsciente');
        if (previousHp === 0 && incomingDamage > 0) { character.deathSaves.failures = Math.min(3, character.deathSaves.failures + 1); character.deathSaves.stable = false; }
        if (incomingDamage - previousHp >= character.maxHp) character.deathSaves.failures = 3;
      } else {
        current.delete('inconsciente'); character.deathSaves = { successes: 0, failures: 0, stable: false };
      }
      if (current.size) this.conditions[entityId] = [...current]; else delete this.conditions[entityId];
      if (character.hp <= 0) { this.clearConditionsFromDefeatedSource(entityId); this.endConcentration(entityId); }
      return true;
    }
    if (this.creature?.id === entityId) { this.creature.hp = Math.max(0, Math.min(this.creature.maxHp, this.creature.hp + delta)); if (this.creature.hp <= 0) { this.clearConditionsFromDefeatedSource(entityId); this.endConcentration(entityId); } return true; }
    const npc = this.npcs.get(entityId); if (npc) {
      npc.hp = Math.max(0, Math.min(npc.maxHp, npc.hp + delta));
      // A stage actor can be the same person in several scenes.  The pose and
      // position remain scene-local, while health belongs to that one identity.
      for (const counterpart of this.npcs.values()) if (counterpart.id !== npc.id && counterpart.identityId === npc.identityId) counterpart.hp = Math.min(counterpart.maxHp, npc.hp);
      if (npc.hp <= 0) { this.clearConditionsFromDefeatedSource(entityId); this.endConcentration(entityId); }
      return true;
    }
    return false;
  }
  canCancelCombatAction() {
    const pending = this.combat.pending;
    if (!pending || pending.opportunity || this.combat.sequences[pending.attackerId]) return false;
    if (pending.stage === 'attack' || pending.stage === 'save') return true;
    const action = this.combatEntity(pending.attackerId)?.attacks.find(item => item.id === pending.actionId);
    return pending.stage === 'damage' && Boolean(action?.automaticHit) && pending.critical === undefined;
  }

  cancelCombatAction(attackerId: string, promptId?: string) {
    if (!this.combat.active) return { ok: false as const, code: 'COMBAT_INACTIVE' };
    if (!this.combat.pending && this.combat.openingAction?.attackerId === attackerId && !promptId) {
      this.combat.openingAction = null;
    } else {
      const pending = this.combat.pending;
      if (!pending || pending.id !== promptId) return { ok: false as const, code: 'PROMPT_STALE' };
      if (pending.attackerId !== attackerId) return { ok: false as const, code: 'NOT_YOUR_ACTION' };
      // No se permite borrar daño tras ver el d20, salvaciones obligatorias ni
      // ataques de oportunidad ya aceptados. El DM conserva Deshacer para errores.
      if (!this.canCancelCombatAction()) return { ok: false as const, code: 'ACTION_ALREADY_RESOLVING' };
      this.combat.pending = null;
    }
    this.setCombatEvent(`${this.combatEntity(attackerId)?.label ?? 'Combatiente'} cancela su selección antes de tirar; no consume recursos.`, 'turn');
    return { ok: true as const, code: 'ACTION_CANCELLED' };
  }

  requestCombatFlee(entityId: string) {
    if (!this.combat.active || !this.combat.participantIds.includes(entityId)) return { ok: false as const, code: 'COMBAT_INACTIVE' };
    if (this.conditionsFor(entityId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    this.setCombatEvent(`${this.combatEntity(entityId)!.label} quiere huir. Usa su movimiento en su turno, Correr para ganar distancia o Destrabarse para evitar ataques de oportunidad. El DM confirma cuándo está fuera de peligro o inicia una persecución.`, 'turn', undefined, { actorId: entityId });
    return { ok: true as const, code: 'FLEE_REQUESTED' };
  }

  withdrawCombatant(entityId: string) {
    if (!this.combat.active || !this.combat.participantIds.includes(entityId)) return { ok: false as const, code: 'INVALID_COMBATANT' };
    if (this.combat.pending) return { ok: false as const, code: 'ROLL_PENDING' };
    const currentId = this.currentCombatId(), previousIndex = this.combat.order.indexOf(entityId);
    this.combat.participantIds = this.combat.participantIds.filter(id => id !== entityId);
    this.combat.order = this.combat.order.filter(id => id !== entityId);
    for (const record of [this.combat.initiative, this.combat.initiativeSubmitted, this.combat.spentSquares, this.combat.dashSquares, this.combat.actionUsed, this.combat.bonusActionUsed, this.combat.reactionUsed, this.combat.sneakAttackUsed, this.combat.sneakAttackUsedTurn, this.combat.spellSlotUsedTurn, this.combat.stances, this.combat.sequences, this.combat.recharge]) delete record[entityId];
    for (const [id, stance] of Object.entries(this.combat.stances)) if (stance.targetId === entityId) delete this.combat.stances[id];
    for (const [id, sequence] of Object.entries(this.combat.sequences)) if (sequence.targetId === entityId) delete this.combat.sequences[id];
    if (this.combat.openingAction?.attackerId === entityId || this.combat.openingAction?.targetId === entityId) this.combat.openingAction = null;
    // El DM ha adjudicado la salida; el actor sigue en el mapa y conserva PG y efectos.
    if (this.combat.participantIds.length < 2) { this.endCombat(); return { ok: true as const, code: 'COMBAT_ENDED' }; }
    if (this.combat.initiativePending) this.combat.turnIndex = 0;
    else if (currentId === entityId) {
      this.combat.turnIndex = Math.min(previousIndex, this.combat.order.length) - 1;
      this.nextCombatTurn();
    } else this.combat.turnIndex = Math.max(0, this.combat.order.indexOf(currentId!));
    this.setCombatEvent(`${this.combatEntity(entityId)?.label ?? 'Combatiente'} sale del combate por decisión del DM.`, 'turn');
    return { ok: true as const, code: 'COMBATANT_WITHDRAWN' };
  }

  cancelCombat() {
    if (!this.combat.active || !this.combat.initiativePending) return false;
    return this.endCombat();
  }

  endCombat() {
    if (!this.combat.active || this.combat.pending) return false;
    for (const character of this.characters.values()) character.input.held = null;
    this.combat = emptyCombat(); return true;
  }

  private validateObject(object: ObjectRuntime, candidate: Partial<ObjectRuntime>, sceneId = this.sceneId) {
    const scene = this.sceneById(sceneId), next = { ...object, ...candidate } as ObjectRuntime;
    if (!next.allowedRotations.includes(next.rotation)) return 'INVALID_TRANSFORM';
    const location = this.locationCells(object, candidate);
    if (isWheel(next) && next.attachment === 'attached') {
      const mount = footprintFor(next.mount.cell, 0, next.mount.footprint);
      if (location.length !== mount.length || location.some(cell => !mount.some(item => sameCell(item, cell)))) return 'INVALID_TRANSITION';
      return null;
    }
    for (const cell of location) {
      if (!this.walkableAt(scene.id, next.surfaceId, cell)) return 'BLOCKED_CELL';
      if (next.surfaceId === scene.surfaceId && scene.spawns.some(spawn => sameCell(spawn, cell))) return 'SPAWN_RESERVED';
      if (this.campaign.ports?.some(port => [port.from, port.to].some(address => address.mapId === scene.id && address.surfaceId === next.surfaceId && sameCell(address.cell, cell)) && port.conditionId !== object.id)) return 'PORT_RESERVED';
    }
    for (const other of this.objectsFor(sceneId)) {
      if (other.id === object.id) continue;
      if (other.surfaceId !== next.surfaceId) continue;
      const otherLocation = this.locationCells(other);
      if (location.some(cell => otherLocation.some(otherCell => sameCell(cell, otherCell)))) return 'BLOCKED_CELL';
    }
    for (const candidateObject of this.objectsFor(sceneId)) if (candidateObject.kind === 'wheel' && candidateObject.surfaceId === next.surfaceId) {
      const mount = footprintFor(candidateObject.mount.cell, 0, candidateObject.mount.footprint);
      if (location.some(cell => mount.some(mountCell => sameCell(cell, mountCell)))) return 'BLOCKED_CELL';
    }
    const actors = this.actorReservations(next.surfaceId, sceneId);
    if (this.blockingCells(object, candidate).some(cell => actors.has(cellKey(cell)))) return 'OCCUPIED_CELL';
    return null;
  }

  public objectCommandResult(commandId: string, ok: boolean, code: string): CommandResult {
    return { commandId, ok, code, sceneId: this.sceneId, sceneEpoch: this.sceneEpoch, objectRevision: this.objectRevision };
  }

  private commitObject(object: ObjectRuntime, before: Partial<ObjectRuntime>, after: Partial<ObjectRuntime>, label: string, sceneId = this.sceneId) {
    Object.assign(object, structuredClone(after));
    object.version++;
    const state = this.objectScenes.get(sceneId)!;
    state.undo.push({ entryId: crypto.randomUUID(), label, objectId: object.id, before: structuredClone(before), after: structuredClone(after) });
    while (state.undo.length > 50) state.undo.shift();
    this.cancelInteractionsForObject(object.id);
    state.revision++; this.revision++; this.stateRevision++;
  }

  private partialMatches(object: ObjectRuntime, snapshot: Partial<ObjectRuntime>) {
    return Object.entries(snapshot).every(([key, value]) => JSON.stringify((object as unknown as Record<string, unknown>)[key]) === JSON.stringify(value));
  }

  public cancelInteractionsForObject(objectId: string) {
    for (const request of this.interactions) if (request.targetId === objectId && request.status === 'pending') request.status = 'resolved';
  }

  public cancelInteractionsForCharacter(characterId: string) {
    for (const request of this.interactions) if (request.characterId === characterId && request.status === 'pending') request.status = 'resolved';
  }

  public applyObjectCommand(command: Extract<DmCommand, { type: 'object:door' | 'object:interact' | 'object:transform' | 'object:detach' | 'object:structure' | 'object:undo' }>): CommandResult {
    if (command.sceneEpoch !== this.sceneEpoch) return this.objectCommandResult(command.commandId, false, 'STALE_SCENE');
    if (command.objectRevision !== this.objectRevision) return this.objectCommandResult(command.commandId, false, 'STALE_OBJECTS');
    if (this.sceneId === 'wreck-ship' && this.campaign.public.campaignId === 'stormwreck-isle' && this.progress['wreck.curse-day-after'])
      return this.objectCommandResult(command.commandId, false, 'WRECK_DISAPPEARED');
    const state = this.currentObjectState();
    if (command.type === 'object:undo') {
      const entry = state.undo.at(-1);
      if (!entry) return this.objectCommandResult(command.commandId, false, 'UNDO_EMPTY');
      if (entry.entryId !== command.entryId) return this.objectCommandResult(command.commandId, false, 'UNDO_STALE');
      const object = this.currentObjects().find(candidate => candidate.id === entry.objectId);
      if (!object) return this.objectCommandResult(command.commandId, false, 'UNKNOWN_OBJECT');
      if (!this.partialMatches(object, entry.after)) return this.objectCommandResult(command.commandId, false, 'UNDO_STALE');
      const error = this.validateObject(object, entry.before);
      if (error) return this.objectCommandResult(command.commandId, false, error);
      const beforeInteraction = object.kind === 'crate' ? (entry.before as Partial<CrateRuntime>).interaction : undefined;
      const afterInteraction = object.kind === 'crate' ? (entry.after as Partial<CrateRuntime>).interaction : undefined;
      if (beforeInteraction && afterInteraction) {
        if ('lootOwnerId' in beforeInteraction && 'lootOwnerId' in afterInteraction && beforeInteraction.lootOwnerId !== afterInteraction.lootOwnerId) {
          this.updateCharacterInventory(afterInteraction.lootOwnerId, afterInteraction.lootLabel, false);
          this.updateCharacterInventory(beforeInteraction.lootOwnerId, beforeInteraction.lootLabel, true);
        }
        if (beforeInteraction.kind === 'chest' && afterInteraction.kind === 'chest' && beforeInteraction.packageOwnerId !== afterInteraction.packageOwnerId) {
          if (this.campaign.public.campaignId === 'stormwreck-isle' && object.id === 'c9-iron-chest'
            && (this.progress['wreck.items-given-to-runara'] || this.progress['wreck.curse-grave'] || this.progress['wreck.curse-aboard']))
            return this.objectCommandResult(command.commandId, false, 'STORY_EVENT_ALREADY_RECORDED');
          this.updateCharacterInventory(afterInteraction.packageOwnerId, afterInteraction.packageLabel, false);
          this.updateCharacterInventory(beforeInteraction.packageOwnerId, beforeInteraction.packageLabel, true);
          if (this.campaign.public.campaignId === 'stormwreck-isle' && object.id === 'c9-iron-chest') {
            this.progress['wreck.c9-package-taken'] = beforeInteraction.package === 'taken';
            if (beforeInteraction.package !== 'taken' && afterInteraction.package === 'taken') {
              this.progress['wreck.package-opened'] = false;
              this.progress['wreck.journal-found'] = false;
              this.progress['wreck.talisman-found'] = false;
            }
          }
        }
        if (this.campaign.public.campaignId === 'stormwreck-isle' && this.isWreckC8LootObject(object.id)
          && afterInteraction.lootId.startsWith('wreck-c8-result-') && beforeInteraction.lootId !== afterInteraction.lootId) {
          const resultId = Number(afterInteraction.lootId.slice('wreck-c8-result-'.length));
          const usedElsewhere = this.objectsFor('wreck-ship').some(candidate => candidate.id !== object.id && candidate.kind === 'crate' && candidate.interaction?.kind === 'container' && candidate.interaction.lootId === afterInteraction.lootId);
          if (!usedElsewhere && Number.isInteger(resultId)) delete this.progress[`wreck.c8-loot-${resultId}`];
        }
      }
      Object.assign(object, structuredClone(entry.before)); object.version++; this.cancelInteractionsForObject(object.id); state.undo.pop(); state.revision++; this.revision++; this.stateRevision++;
      return this.objectCommandResult(command.commandId, true, 'APPLIED');
    }
    const object = this.currentObjects().find(candidate => candidate.id === command.objectId);
    if (!object) return this.objectCommandResult(command.commandId, false, 'UNKNOWN_OBJECT');
    if (command.type === 'object:interact') {
      if (this.campaign.public.campaignId === 'stormwreck-isle' && object.id.startsWith('c8-barrel-')
        && (command.action === 'assign-result' || command.action === 'take-loot'))
        return this.objectCommandResult(command.commandId, false, 'CAPABILITY_UNAVAILABLE');
      const interaction = object.kind === 'wheel' ? undefined : object.interaction;
      if (!interaction || object.structure === 'destroyed') return this.objectCommandResult(command.commandId, false, 'CAPABILITY_UNAVAILABLE');
      const before = structuredClone(interaction);
      const next = structuredClone(interaction);
      const owner = command.characterId ? this.characters.get(command.characterId) : null;
      let label = object.label;
      if (command.action === 'assign-result') {
        if (this.campaign.public.campaignId !== 'stormwreck-isle' || !this.isWreckC8LootObject(object.id) || next.kind !== 'container' || !next.open || next.lootOwnerId)
          return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        if (next.lootId.startsWith('wreck-c8-result-')) return this.objectCommandResult(command.commandId, false, 'LOOT_ALREADY_ASSIGNED');
        const resultId = command.resultId;
        const lootLabel = resultId === undefined ? null : this.wreckC8LootLabel(resultId);
        if (!lootLabel) return this.objectCommandResult(command.commandId, false, 'INVALID_RESULT');
        const resultFlag = `wreck.c8-loot-${resultId}`;
        if (this.progress[resultFlag]) return this.objectCommandResult(command.commandId, false, 'LOOT_RESULT_ALREADY_USED');
        next.lootId = `wreck-c8-result-${resultId}`; next.lootLabel = lootLabel; label = `Resultado ${resultId} de C8 asignado`;
      } else if (command.action === 'remove-bar' || command.action === 'replace-bar') {
        if (next.kind !== 'barred-door') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        const barrier = command.action === 'remove-bar' ? 'removed' : 'barred';
        if (next.barrier === barrier) return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
        if (barrier === 'barred' && isDoor(object) && object.state === 'open') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        next.barrier = barrier; label = barrier === 'removed' ? 'Listón retirado' : 'Listón recolocado';
      } else if (command.action === 'discover') {
        if (next.kind !== 'trap-stash') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        if (next.revealed) return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
        next.revealed = true; label = 'Alijo descubierto';
      } else if (command.action === 'trigger-open') {
        if (next.kind !== 'trap-stash' || next.open || next.trap !== 'armed') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        next.revealed = true; next.open = true; next.trap = 'spent'; label = 'Trampa resuelta y tablón abierto';
      } else if (command.action === 'rearm') {
        if (next.kind !== 'trap-stash' || next.trap !== 'spent') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        next.revealed = true; next.open = false; next.trap = 'armed'; label = 'Trampa rearmada';
      } else if (command.action === 'open') {
        if (next.kind === 'barred-door' || next.open) return this.objectCommandResult(command.commandId, next.kind !== 'barred-door', next.kind !== 'barred-door' ? 'NO_CHANGE' : 'INVALID_TRANSITION');
        if (next.kind === 'trap-stash' && (!next.revealed || next.trap === 'armed')) return this.objectCommandResult(command.commandId, false, next.revealed ? 'TRAP_ARMED' : 'NOT_REVEALED');
        next.open = true;
        if (next.kind === 'chest') { next.openedLocation = next.location; if (next.location === 'submerged' && next.package === 'contained') next.package = 'released'; label = next.location === 'submerged' ? 'Cofre abierto bajo el agua; paquete liberado' : 'Cofre abierto fuera del agua'; }
        else label = next.kind === 'trap-stash' ? 'Tablón abierto' : 'Contenedor abierto';
      } else if (command.action === 'take-loot' || command.action === 'return-loot') {
        if (next.kind === 'barred-door' || !next.open) return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        if (this.campaign.public.campaignId === 'stormwreck-isle' && this.isWreckC8LootObject(object.id) && next.kind === 'container' && !next.lootId.startsWith('wreck-c8-result-'))
          return this.objectCommandResult(command.commandId, false, 'C8_RESULT_REQUIRED');
        if (command.action === 'take-loot') {
          if (!owner) return this.objectCommandResult(command.commandId, false, 'UNKNOWN_ENTITY');
          if (next.lootOwnerId) return this.objectCommandResult(command.commandId, false, 'LOOT_TAKEN');
          next.lootOwnerId = owner.id; label = `${object.label}: botín asignado a ${owner.label}`;
        } else {
          if (!next.lootOwnerId) return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
          next.lootOwnerId = null; label = `${object.label}: botín devuelto`;
        }
      } else if (command.action === 'take-package' || command.action === 'return-package') {
        if (next.kind !== 'chest' || !next.open) return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
        if (command.action === 'take-package') {
          if (!owner) return this.objectCommandResult(command.commandId, false, 'UNKNOWN_ENTITY');
          if (next.package === 'taken') return this.objectCommandResult(command.commandId, false, 'LOOT_TAKEN');
          next.package = 'taken'; next.packageOwnerId = owner.id; label = `Paquete asignado a ${owner.label}`;
        } else {
          if (next.package !== 'taken') return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
          if (this.progress['wreck.items-given-to-runara'] || this.progress['wreck.curse-grave'] || this.progress['wreck.curse-aboard'])
            return this.objectCommandResult(command.commandId, false, 'STORY_EVENT_ALREADY_RECORDED');
          next.package = 'released'; next.packageOwnerId = null; label = 'Paquete devuelto';
        }
      } else return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
      this.commitObject(object, { interaction: before } as Partial<ObjectRuntime>, { interaction: next } as Partial<ObjectRuntime>, label);
      if (command.action === 'assign-result' && next.kind === 'container') this.progress[`wreck.c8-loot-${command.resultId}`] = true;
      if (command.action === 'take-loot' && owner && next.kind !== 'barred-door') this.updateCharacterInventory(owner.id, next.lootLabel, true);
      if (command.action === 'return-loot' && before.kind !== 'barred-door' && before.lootOwnerId) this.updateCharacterInventory(before.lootOwnerId, before.lootLabel, false);
      if (command.action === 'take-package' && owner && next.kind === 'chest') this.updateCharacterInventory(owner.id, next.packageLabel, true);
      if (command.action === 'return-package' && before.kind === 'chest' && before.packageOwnerId) {
        this.updateCharacterInventory(before.packageOwnerId, before.packageLabel, false);
        this.progress['wreck.c9-package-taken'] = false;
      }
      if (object.id === 'c9-iron-chest' && (command.action === 'open' || command.action === 'take-loot')) this.progress['wreck.c9-chest-found'] = true;
      if (object.id === 'c9-iron-chest' && command.action === 'take-package') {
        this.progress['wreck.c9-chest-found'] = true;
        this.progress['wreck.c9-package-taken'] = true;
      }
      return this.objectCommandResult(command.commandId, true, 'APPLIED');
    }
    if (command.type === 'object:door') {
      if (!isDoor(object)) return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSFORM');
      if (object.structure === 'destroyed') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
      if (object.state === command.state) return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
      if (object.state === 'locked' && command.state === 'open') return this.objectCommandResult(command.commandId, false, 'DOOR_LOCKED');
      if (command.state === 'open' && object.interaction?.barrier === 'barred') return this.objectCommandResult(command.commandId, false, 'DOOR_BARRED');
      const error = command.state === 'open' ? null : this.validateObject(object, { state: command.state });
      if (error) return this.objectCommandResult(command.commandId, false, error);
      this.commitObject(object, { state: object.state }, { state: command.state }, command.state === 'open' ? 'Puerta abierta' : command.state === 'locked' ? 'Puerta bloqueada' : 'Puerta cerrada');
      if (object.id === 'c4-barred-door' && command.state === 'open') this.maybeRevealC4Zombies();
      return this.objectCommandResult(command.commandId, true, 'APPLIED');
    }
    if (command.type === 'object:detach') {
      if (!isWheel(object) || !object.capabilities.detach) return this.objectCommandResult(command.commandId, false, 'CAPABILITY_UNAVAILABLE');
      if (object.structure === 'destroyed') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
      if (object.attachment !== 'attached') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
      const error = this.validateObject(object, { cell: command.cell, rotation: command.rotation, attachment: 'detached', state: command.outcome });
      if (error) return this.objectCommandResult(command.commandId, false, error);
      this.commitObject(object, { cell: cloneCell(object.cell), rotation: object.rotation, attachment: object.attachment, state: object.state }, { cell: cloneCell(command.cell), rotation: command.rotation, attachment: 'detached', state: command.outcome }, command.outcome === 'caught' ? 'Timón separado y sujeto' : 'Timón separado y caído');
      if (object.id === 'wheel' && command.outcome === 'fallen') {
        this.progress['wreck.c3-wheel-fell'] = true;
        this.progress['wreck.c4-knocking-cue'] = true;
        this.maybeRevealC4Zombies();
      }
      return this.objectCommandResult(command.commandId, true, 'APPLIED');
    }
    if (command.type === 'object:structure') {
      if (!object.capabilities.structure) return this.objectCommandResult(command.commandId, false, 'CAPABILITY_UNAVAILABLE');
      if (object.structure === 'destroyed') return this.objectCommandResult(command.commandId, command.structure === 'destroyed', command.structure === 'destroyed' ? 'NO_CHANGE' : 'INVALID_TRANSITION');
      if (command.structure === 'damaged' && object.structure === 'damaged') return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
      if (isWheel(object) && object.attachment === 'attached' && command.structure === 'destroyed') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
      this.commitObject(object, { structure: object.structure }, { structure: command.structure }, command.structure === 'damaged' ? `${object.label} dañado` : `${object.label} roto`);
      return this.objectCommandResult(command.commandId, true, 'APPLIED');
    }
    if (object.structure === 'destroyed') return this.objectCommandResult(command.commandId, false, 'INVALID_TRANSITION');
    if (object.kind !== 'crate' && !(isWheel(object) && object.attachment === 'detached')) return this.objectCommandResult(command.commandId, false, isWheel(object) ? 'OBJECT_ATTACHED' : 'INVALID_TRANSFORM');
    if (object.kind === 'crate' && object.interaction?.kind === 'trap-stash') return this.objectCommandResult(command.commandId, false, 'CAPABILITY_UNAVAILABLE');
    if (object.cell.col === command.cell.col && object.cell.row === command.cell.row && object.rotation === command.rotation && (command.surfaceId === undefined || command.surfaceId === object.surfaceId)) return this.objectCommandResult(command.commandId, true, 'NO_CHANGE');
    const nextSurfaceId = command.surfaceId ?? object.surfaceId;
    const nextInteraction = object.kind === 'crate' && object.interaction?.kind === 'chest'
      ? { ...object.interaction, location: nextSurfaceId === 'hold-water' ? 'submerged' as const : 'surface' as const }
      : object.kind === 'crate' ? object.interaction : undefined;
    const error = this.validateObject(object, { cell: command.cell, surfaceId: nextSurfaceId, rotation: command.rotation, ...(nextInteraction ? { interaction: nextInteraction } : {}) });
    if (error) return this.objectCommandResult(command.commandId, false, error);
    this.commitObject(object, { cell: cloneCell(object.cell), surfaceId: object.surfaceId, rotation: object.rotation, ...(object.kind === 'crate' && object.interaction ? { interaction: structuredClone(object.interaction) } : {}) }, { cell: cloneCell(command.cell), surfaceId: nextSurfaceId, rotation: command.rotation, ...(nextInteraction ? { interaction: nextInteraction } : {}) }, object.kind === 'wheel' ? 'Timón recolocado' : object.kind === 'crate' && object.interaction?.kind === 'chest' ? 'Cofre recolocado' : 'Caja recolocada');
    return this.objectCommandResult(command.commandId, true, 'APPLIED');
  }

  captureDurable(now = Date.now()): DurablePayload {
    const saveTrack = (track: AudioState['music']) => ({
      playing: track.playing, volume: track.volume,
      offsetSeconds: track.offset + (track.playing && track.startedAt !== null ? Math.max(0, now - track.startedAt) / 1000 * track.rate : 0),
      loop: track.loop, rate: track.rate, repeats: track.repeats,
      ...(track.assetId ? { assetId: track.assetId } : {})
    });
    return durablePayloadSchema.parse({
      sceneId: this.sceneId,
      ...(this.campaign.public.campaignId === 'stormwreck-isle' ? { wreckGridVersion: 3 } : {}),
      ...(this.campaign.public.campaignId === 'd8-night-private' ? { d8GridVersion: 2 } : {}),
      ...(this.campRest ? { campRest: structuredClone(this.campRest) } : {}),
      characters: [...this.characters.values()].map(character => ({ id: character.id, hp: character.hp, maxHp: character.maxHp, inventory: [...character.inventory], sheet: character.sheet ? structuredClone(character.sheet) : null, resources: structuredClone(character.combat.resources), deathSaves: { ...character.deathSaves }, sceneId: character.sceneId, cell: cloneCell(character.cell), surfaceId: character.step?.toSurfaceId ?? character.surfaceId, facing: character.facing })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      npcs: [...this.npcs.values()].map(npc => ({ id: npc.id, sceneId: npc.sceneId, surfaceId: npc.surfaceId, cell: cloneCell(npc.cell), facing: npc.facing, hp: npc.hp, maxHp: npc.maxHp, combatEnabled: npc.combatEnabled, visible: npc.visible })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      creature: this.creature ? { id: this.creature.id, sceneId: this.creature.sceneId, surfaceId: this.creature.surfaceId, cell: cloneCell(this.creature.cell), facing: this.creature.facing, visible: this.creature.visible, hp: this.creature.hp,
        runtimeProfile: { label: this.creature.label, tokenId: this.creature.tokenId, maxHp: this.creature.maxHp, armorClass: this.creature.armorClass, speedMeters: this.creature.speedMeters, initiativeBonus: this.creature.initiativeBonus, attacks: structuredClone(this.creature.attacks), traits: [...this.creature.traits], actions: [...this.creature.actions], resources: structuredClone(this.creature.resources), ruleTraits: structuredClone(this.creature.ruleTraits), damageResistances: [...this.creature.damageResistances], damageImmunities: [...this.creature.damageImmunities], conditionImmunities: [...this.creature.conditionImmunities], mimicOfPlayerId: this.creature.mimicOfPlayerId } } : null,
      scenes: [...this.objectScenes].map(([sceneId, scene]) => ({ sceneId, objects: scene.objects.map(object => {
        const common = { id: object.id, cell: cloneCell(object.cell), surfaceId: object.surfaceId, rotation: object.rotation, structure: object.structure };
        if (object.kind === 'door') return { ...common, kind: 'door' as const, state: object.state, ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
        if (object.kind === 'wheel') return { ...common, kind: 'wheel' as const, attachment: object.attachment, state: object.state };
        return { ...common, kind: 'crate' as const, ...(object.interaction ? { interaction: structuredClone(object.interaction) } : {}) };
      }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) })).sort((a, b) => a.sceneId < b.sceneId ? -1 : a.sceneId > b.sceneId ? 1 : 0),
      camera: { ...this.camera }, environment: { storm: this.environment.storm, stormIntensity: this.environment.stormIntensity, timeOfDay: this.environment.timeOfDay ?? 'auto' },
      audio: { music: saveTrack(this.audio.music), layers: {
        ocean: saveTrack(this.audio.layers.ocean), wind: saveTrack(this.audio.layers.wind), wood: saveTrack(this.audio.layers.wood), storm: saveTrack(this.audio.layers.storm)
      }, sfxLoops: Object.fromEntries(Object.entries(this.audio.sfxLoops).map(([id, track]) => [id, saveTrack(track)])) },
      conditions: structuredClone(this.conditions), conditionSources: structuredClone(this.conditionSources), concentration: structuredClone(this.concentration),
      combat: this.combat.active ? { active: true, round: this.combat.round, order: [...this.combat.order], turnIndex: this.combat.turnIndex, participantIds: [...this.combat.participantIds], initiative: { ...this.combat.initiative }, initiativeSubmitted: { ...this.combat.initiativeSubmitted }, initiativePending: this.combat.initiativePending, spentSquares: { ...this.combat.spentSquares }, dashSquares: { ...this.combat.dashSquares }, actionUsed: { ...this.combat.actionUsed }, bonusActionUsed: { ...this.combat.bonusActionUsed }, reactionUsed: { ...this.combat.reactionUsed }, sneakAttackUsed: { ...this.combat.sneakAttackUsed }, sneakAttackUsedTurn: { ...this.combat.sneakAttackUsedTurn }, spellSlotUsedTurn: { ...this.combat.spellSlotUsedTurn }, stances: structuredClone(this.combat.stances), sequences: structuredClone(this.combat.sequences), recharge: structuredClone(this.combat.recharge), openingAction: structuredClone(this.combat.openingAction), pending: structuredClone(this.combat.pending) } : null,
      progress: { ...this.progress }
    });
  }

  restoreDurable(raw: DurablePayload, now = Date.now()) {
    const payload = durablePayloadSchema.parse(structuredClone(raw));
    const migratedD8Grid = this.migrateD8NightGrid(payload);
    this.migrateD8NightLegacyRoster(payload);
    this.migrateStormwreckScenes(payload);
    this.migrateStormwreckGrid(payload);
    this.migrateStormwreckM3Actors(payload);
    this.migrateSavedNpcCells(payload);
    this.migrateStormwreckActorCells(payload);
    this.migrateCampRestLegacyRoomDoors(payload);
    this.migrateCombinedStormwreckCampScenes(payload);
    const migratedObjectInteractions = this.migrateMissingObjectInteractions(payload);
    let migratedCharacterSheets = false;
    const exactIds = (actual: string[], expected: string[]) => actual.length === expected.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
    if (!this.hasScene(payload.sceneId) || !exactIds(payload.characters.map(x => x.id), [...this.characters.keys()]) || !exactIds(payload.scenes.map(x => x.sceneId), [...this.objectScenes.keys()])) throw new Error('SAVE_REFERENCES');
    if (payload.campRest) {
      const campScene = this.campaign.public.scenes.find(scene => scene.id === payload.campRest!.sceneId);
      // Interaction entries are historical log records. A newer camp layout
      // may remove or rename a point without invalidating the player or the
      // rest itself, so only the camp scene and character identities remain
      // authoritative references here.
      if (!campScene?.camp || payload.campRest.interactions.some(item => !this.characters.has(item.characterId))
        || payload.campRest.phase === null && (payload.campRest.paused || payload.campRest.outcome !== null)
        || payload.campRest.phase === 'finalization' && payload.campRest.outcome === null
        || payload.campRest.phase !== 'finalization' && payload.campRest.outcome !== null) throw new Error('SAVE_CAMP_REST');
    }
    for (const savedScene of payload.scenes) {
      const scene = this.sceneById(savedScene.sceneId), objects = this.objectScenes.get(savedScene.sceneId)!.objects;
      if (!exactIds(savedScene.objects.map(x => x.id), objects.map(x => x.id))) throw new Error('SAVE_OBJECT_IDS');
      const occupied = new Set<string>();
      for (const object of objects) if (object.kind === 'wheel') for (const cell of footprintFor(object.mount.cell, 0, object.mount.footprint)) {
        const key = `${object.surfaceId}:${cellKey(cell)}`; if (occupied.has(key)) throw new Error('SAVE_MOUNT_OVERLAP'); occupied.add(key);
      }
      for (const saved of savedScene.objects) {
        const object = objects.find(x => x.id === saved.id)!;
        const savedSurfaceId = saved.surfaceId ?? object.surfaceId;
        if (saved.kind !== object.kind || !object.allowedRotations.includes(saved.rotation) || (saved.structure !== 'intact' && !object.capabilities.structure)) throw new Error('SAVE_OBJECT_CAPABILITY');
        if (!object.capabilities.transform && object.kind !== 'wheel' && (!sameCell(saved.cell, object.cell) || savedSurfaceId !== object.surfaceId)) throw new Error('SAVE_FIXED_OBJECT');
        if (object.kind === 'door' && (saved.kind !== 'door' || object.interaction?.kind !== saved.interaction?.kind)) throw new Error('SAVE_OBJECT_INTERACTION');
        if (object.kind === 'crate' && (saved.kind !== 'crate' || object.interaction?.kind !== saved.interaction?.kind)) throw new Error('SAVE_OBJECT_INTERACTION');
        if (saved.kind === 'crate' && saved.interaction && 'lootOwnerId' in saved.interaction && saved.interaction.lootOwnerId && !this.characters.has(saved.interaction.lootOwnerId)) throw new Error('SAVE_LOOT_OWNER');
        if (saved.kind === 'crate' && saved.interaction?.kind === 'chest' && saved.interaction.packageOwnerId && !this.characters.has(saved.interaction.packageOwnerId)) throw new Error('SAVE_LOOT_OWNER');
        if (saved.kind === 'wheel') {
          const wheel = object as WheelRuntime;
          if (saved.attachment === 'attached') {
            if (!sameCell(saved.cell, wheel.mount.cell) || saved.rotation !== wheel.rotation || saved.state !== 'upright' || saved.structure === 'destroyed') throw new Error('SAVE_WHEEL_ATTACHED');
          } else if (saved.state === 'upright') throw new Error('SAVE_WHEEL_DETACHED');
        }
        if (object.kind === 'wheel' && saved.kind !== 'wheel') throw new Error('SAVE_WHEEL_KIND');
        if (saved.kind === 'wheel' && saved.attachment === 'attached') continue;
        for (const cell of footprintFor(saved.cell, saved.rotation, object.baseFootprint)) {
          const key = `${savedSurfaceId}:${cellKey(cell)}`;
          if (!this.walkableAt(scene.id, savedSurfaceId, cell) || savedSurfaceId === scene.surfaceId && scene.spawns.some(spawn => sameCell(spawn, cell)) || occupied.has(key)) throw new Error('SAVE_OBJECT_POSITION');
          occupied.add(key);
        }
      }
    }
    for (const saved of payload.characters) {
      const actor = this.characters.get(saved.id)!;
      const savedMaxHp = saved.maxHp ?? actor.maxHp;
      const savedSceneId = saved.sceneId ?? payload.sceneId;
      if (saved.hp > savedMaxHp || !this.hasScene(savedSceneId) || !this.walkableAt(savedSceneId, saved.surfaceId, saved.cell)) throw new Error('SAVE_ACTOR_POSITION');
      if (saved.resources) {
        const currentResourceIds = Object.keys(actor.combat.resources), savedResourceIds = Object.keys(saved.resources);
        if (!exactIds(savedResourceIds, currentResourceIds)) throw new Error('SAVE_RESOURCE_IDS');
        for (const [resourceId, savedResource] of Object.entries(saved.resources)) {
          const definition = actor.combat.resources[resourceId]!;
          if (savedResource.label !== definition.label || savedResource.max !== definition.max || savedResource.current > definition.max) throw new Error('SAVE_RESOURCE_DEFINITION');
        }
      }
      if (payload.scenes.find(x => x.sceneId === savedSceneId)!.objects.some(savedObject => {
        const definition = this.objectScenes.get(savedSceneId)!.objects.find(x => x.id === savedObject.id)!;
        const blocks = savedObject.structure !== 'destroyed' && (savedObject.kind !== 'door' || savedObject.state !== 'open') && (savedObject.kind !== 'wheel' || savedObject.attachment === 'detached');
        return blocks && (savedObject.surfaceId ?? definition.surfaceId) === saved.surfaceId && footprintFor(savedObject.cell, savedObject.rotation, definition.baseFootprint).some(cell => sameCell(cell, saved.cell));
      })) throw new Error('SAVE_ACTOR_BLOCKED');
    }
    if (payload.npcs) {
      const savedNpcIds = payload.npcs.map(npc => npc.id);
      // New campaign-authored NPCs may be added between saves. Preserve the
      // old saved actors and leave newly introduced actors at their hidden
      // defaults; duplicate and unknown identities remain invalid.
      if (new Set(savedNpcIds).size !== savedNpcIds.length || savedNpcIds.some(id => !this.npcs.has(id))) throw new Error('SAVE_NPC_IDS');
      for (const saved of payload.npcs) {
        const npc = this.npcs.get(saved.id)!;
        const savedMaxHp = saved.maxHp ?? npc.maxHp;
        if (!this.hasScene(saved.sceneId) || !this.walkableAt(saved.sceneId, saved.surfaceId, saved.cell) || saved.hp !== undefined && saved.hp > savedMaxHp) throw new Error('SAVE_NPC');
      }
    }
    if (payload.creature) {
      const profile = payload.creature.runtimeProfile;
      if (!this.creature || payload.creature.id !== this.creature.id || !this.hasScene(payload.creature.sceneId) || payload.creature.surfaceId !== this.sceneById(payload.creature.sceneId).surfaceId || !this.sceneById(payload.creature.sceneId).terrainWalkable.has(cellKey(payload.creature.cell)) || payload.creature.hp !== undefined && payload.creature.hp > (profile?.maxHp ?? this.creature.maxHp)) throw new Error('SAVE_CREATURE');
      if (profile) {
        if (!this.campaign.public.tokens[profile.tokenId] || profile.mimicOfPlayerId && !this.characters.has(profile.mimicOfPlayerId) || new Set(profile.attacks.map(action => action.id)).size !== profile.attacks.length) throw new Error('SAVE_CREATURE_PROFILE');
      }
      if (payload.creature.visible && payload.creature.sceneId !== payload.sceneId) throw new Error('SAVE_CREATURE_SCENE');
      if (payload.creature.visible && payload.scenes.find(x => x.sceneId === payload.sceneId)!.objects.some(savedObject => {
        const definition = this.objectScenes.get(payload.sceneId)!.objects.find(x => x.id === savedObject.id)!;
        const blocks = savedObject.structure !== 'destroyed' && (savedObject.kind !== 'door' || savedObject.state !== 'open') && (savedObject.kind !== 'wheel' || savedObject.attachment === 'detached');
        return blocks && (savedObject.surfaceId ?? definition.surfaceId) === payload.creature!.surfaceId && footprintFor(savedObject.cell, savedObject.rotation, definition.baseFootprint).some(cell => sameCell(cell, payload.creature!.cell));
      })) throw new Error('SAVE_CREATURE_BLOCKED');
    } else if (this.creature) throw new Error('SAVE_CREATURE_MISSING');
    if (payload.camera.focusId && !this.characters.has(payload.camera.focusId) && !this.npcs.has(payload.camera.focusId) && !(payload.creature?.visible && payload.camera.focusId === payload.creature.id)) throw new Error('SAVE_CAMERA');
    const validEntityIds = new Set([...this.characters.keys(), ...this.npcs.keys(), ...(this.creature ? [this.creature.id] : [])]);
    const savedConditions = payload.conditions ?? payload.combat?.conditions ?? {};
    const savedConditionSources = payload.conditionSources ?? payload.combat?.conditionSources ?? {};
    const savedConcentration = payload.concentration ?? {};
    for (const id of [...Object.keys(savedConditions), ...Object.keys(savedConditionSources), ...Object.keys(savedConcentration)]) if (!validEntityIds.has(id)) throw new Error('SAVE_CONDITION_ENTITY');
    for (const [id, sources] of Object.entries(savedConditionSources)) {
      const active = new Set(savedConditions[id] ?? []);
      if (sources.some(source => !active.has(source.condition) || source.sourceId && !validEntityIds.has(source.sourceId))) throw new Error('SAVE_CONDITION_SOURCE');
    }
    if (payload.combat?.active) {
      if (!payload.combat.participantIds.length || !payload.combat.participantIds.every(id => validEntityIds.has(id)) || !exactIds(payload.combat.order, payload.combat.participantIds) || payload.combat.turnIndex >= payload.combat.order.length) throw new Error('SAVE_COMBAT');
    }
    // Install only after every reference and occupation has been checked on this candidate state.
    this.sceneId = payload.sceneId; this.sceneEpoch = 1; this.revision = 0; this.stateRevision = 0;
    for (const saved of payload.characters) {
      const character = this.characters.get(saved.id)!;
      const restoredSheet = saved.sheet ? structuredClone(saved.sheet) : saved.sheet;
      if (restoredSheet && restoredSheet.strengthScore === undefined && character.sheet?.strengthScore !== undefined) {
        restoredSheet.strengthScore = character.sheet.strengthScore;
        migratedCharacterSheets = true;
      }
      Object.assign(character, { hp: saved.hp, maxHp: saved.maxHp ?? character.maxHp, inventory: [...saved.inventory], ...(saved.sheet === undefined ? {} : { sheet: restoredSheet }), deathSaves: { ...(saved.deathSaves ?? { successes: 0, failures: 0, stable: false }) }, sceneId: saved.sceneId ?? payload.sceneId, cell: cloneCell(saved.cell), surfaceId: saved.surfaceId, facing: saved.facing, moving: false, step: null, sessionToken: null, socketId: null, input: { held: null, seq: -1, updatedAt: 0 } });
      if (saved.sheet) { character.combat.armorClass = saved.sheet.armorClass; character.combat.speedMeters = saved.sheet.speedMeters; }
      if (saved.resources) for (const [resourceId, savedResource] of Object.entries(saved.resources)) character.combat.resources[resourceId]!.current = savedResource.current;
    }
    if (payload.npcs) for (const saved of payload.npcs) Object.assign(this.npcs.get(saved.id)!, { sceneId: saved.sceneId, surfaceId: saved.surfaceId, cell: cloneCell(saved.cell), facing: saved.facing, ...(saved.hp === undefined ? {} : { hp: saved.hp }), ...(saved.maxHp === undefined ? {} : { maxHp: saved.maxHp }), ...(saved.combatEnabled === undefined ? {} : { combatEnabled: saved.combatEnabled }), ...(saved.visible === undefined ? {} : { visible: saved.visible }) });
    // Older saves stored each scene appearance separately. Preserve harm rather
    // than accidentally healing a shared character if such a save disagrees.
    for (const npc of this.npcs.values()) {
      const counterparts = [...this.npcs.values()].filter(candidate => candidate.identityId === npc.identityId);
      if (counterparts.length > 1) {
        const sharedHp = Math.min(...counterparts.map(candidate => candidate.hp));
        for (const counterpart of counterparts) counterpart.hp = Math.min(counterpart.maxHp, sharedHp);
      }
    }
    if (this.creature && payload.creature) {
      if (payload.creature.runtimeProfile) Object.assign(this.creature, structuredClone(payload.creature.runtimeProfile));
      Object.assign(this.creature, { sceneId: payload.creature.sceneId, surfaceId: payload.creature.surfaceId, cell: cloneCell(payload.creature.cell), facing: payload.creature.facing ?? 'east', visible: payload.creature.visible, ...(payload.creature.hp === undefined ? {} : { hp: payload.creature.hp }) });
    }
    for (const savedScene of payload.scenes) {
      const state = this.objectScenes.get(savedScene.sceneId)!; state.undo = []; state.revision = 0;
      for (const saved of savedScene.objects) {
        const target = state.objects.find(x => x.id === saved.id)!;
        Object.assign(target, structuredClone(saved), { surfaceId: saved.surfaceId ?? target.surfaceId, version: 0 });
      }
    }
    this.camera = { ...payload.camera }; this.environment = { storm: payload.environment.storm, lightning: payload.environment.storm, stormIntensity: payload.environment.stormIntensity ?? 0.5, timeOfDay: payload.environment.timeOfDay ?? 'auto' };
    this.campRest = payload.campRest ? structuredClone(payload.campRest) : null;
    const loadTrack = (saved: DurablePayload['audio']['music']) => ({ playing: saved.playing, volume: saved.volume, offset: saved.offsetSeconds, startedAt: saved.playing ? now : null, loop: saved.loop ?? true, rate: saved.rate ?? 1, repeats: saved.repeats ?? 1, ...(saved.assetId ? { assetId: saved.assetId } : {}) });
    const savedSfxLoops = payload.audio.sfxLoops ?? {};
    const loopableSfx = new Set((this.campaign.public.audio.library?.sfx ?? []).filter(effect => effect.loopable).map(effect => effect.id));
    if (Object.entries(savedSfxLoops).some(([id, track]) => !loopableSfx.has(id) || track.assetId !== undefined && track.assetId !== id)) throw new Error('SAVE_AUDIO_LOOP');
    this.audio = { music: loadTrack(payload.audio.music), layers: {
      ocean: loadTrack(payload.audio.layers.ocean), wind: loadTrack(payload.audio.layers.wind), wood: loadTrack(payload.audio.layers.wood), storm: loadTrack(payload.audio.layers.storm)
    }, sfxLoops: Object.fromEntries(Object.entries(savedSfxLoops).map(([id, track]) => [id, { ...loadTrack(track), assetId: id }])) };
    this.progress = { ...this.progress, ...(payload.progress ?? {}) };
    if (this.campaign.public.campaignId === 'stormwreck-isle') {
      const boat = this.rowboat();
      for (const character of this.characters.values()) {
        if (!boat || character.sceneId !== boat.sceneId || character.surfaceId !== 'sea' || !sameCell(character.cell, boat.cell)) {
          this.progress[this.rowboatFlag(character.id)] = false;
          this.progress[this.rowboatPilotFlag(character.id)] = false;
        }
      }
      const pilot = this.rowboatPilot();
      if (pilot) this.progress[this.rowboatPilotFlag(pilot.id)] = true;
      const chest = this.objectsFor('wreck-ship').find(object => object.id === 'c9-iron-chest');
      if (chest?.kind === 'crate' && chest.interaction?.kind === 'chest') {
        if (chest.interaction.package === 'taken') this.progress['wreck.c9-package-taken'] = true;
        else delete this.progress['wreck.c9-package-taken'];
      }
      // Older M2 saves treated taking the parcel as discovering both clues.
      // Preserve that adjudication while keeping new sessions DM-gated.
      if (this.progress['wreck.journal-found'] && this.progress['wreck.talisman-found']) this.progress['wreck.package-opened'] = true;
      for (const object of this.objectsFor('wreck-ship')) if (object.kind === 'crate' && object.interaction && 'lootOwnerId' in object.interaction) {
        const legacyUnlabelledC8Loot = this.isWreckC8LootObject(object.id) && !object.interaction.lootId.startsWith('wreck-c8-result-');
        if (object.interaction.lootOwnerId && !legacyUnlabelledC8Loot) this.updateCharacterInventory(object.interaction.lootOwnerId, object.interaction.lootLabel, true);
        if (object.interaction.kind === 'chest' && object.interaction.packageOwnerId) {
          const delivered = Boolean(this.progress['wreck.items-given-to-runara'] || this.progress['wreck.curse-aboard']);
          this.updateCharacterInventory(object.interaction.packageOwnerId, object.interaction.packageLabel, !delivered);
        }
      }
    }
    this.conditions = structuredClone(savedConditions); this.conditionSources = structuredClone(savedConditionSources); this.concentration = structuredClone(savedConcentration);
    const restoredStances = Object.fromEntries(Object.entries(payload.combat?.stances ?? {}).flatMap(([id, stance]) => stance.action === 'improvise' ? [] : [[id, stance] as const])) as CombatState['stances'];
    const restoredSequences = Object.fromEntries(Object.entries(payload.combat?.sequences ?? {}).map(([id, sequence]) => [id, { actionId: sequence.actionId, remaining: sequence.remaining }])) as CombatState['sequences'];
    this.combat = payload.combat?.active ? { ...emptyCombat(), active: true, round: payload.combat.round, order: [...payload.combat.order], turnIndex: payload.combat.turnIndex, participantIds: [...payload.combat.participantIds], initiative: { ...payload.combat.initiative }, initiativeSubmitted: { ...(payload.combat.initiativeSubmitted ?? Object.fromEntries(payload.combat.participantIds.map(id => [id, true]))) }, initiativePending: payload.combat.initiativePending ?? false, spentSquares: { ...payload.combat.spentSquares }, dashSquares: { ...(payload.combat.dashSquares ?? {}) }, actionUsed: { ...payload.combat.actionUsed }, bonusActionUsed: { ...(payload.combat.bonusActionUsed ?? {}) }, reactionUsed: { ...(payload.combat.reactionUsed ?? {}) }, sneakAttackUsed: { ...(payload.combat.sneakAttackUsed ?? {}) }, sneakAttackUsedTurn: { ...(payload.combat.sneakAttackUsedTurn ?? {}) }, spellSlotUsedTurn: { ...(payload.combat.spellSlotUsedTurn ?? {}) }, stances: restoredStances, sequences: restoredSequences, recharge: structuredClone(payload.combat.recharge ?? {}), openingAction: structuredClone(payload.combat.openingAction ?? null), pending: structuredClone(payload.combat.pending ?? null), lastEvent: { id: crypto.randomUUID(), text: payload.combat.initiativePending ? 'Iniciativa pendiente de completar' : `Ronda ${payload.combat.round} restaurada`, publicText: payload.combat.initiativePending ? 'Iniciativa pendiente de completar' : `Ronda ${payload.combat.round} restaurada`, kind: 'turn' } } : emptyCombat();
    this.interactions = []; this.projectorReady = false;
    return migratedD8Grid || migratedObjectInteractions || migratedCharacterSheets;
  }
}


function parseCookies(raw: unknown) {
  const result: Record<string, string> = {};
  for (const part of String(raw ?? '').split(';')) {
    const divider = part.indexOf('=');
    if (divider < 1) continue;
    try { result[decodeURIComponent(part.slice(0, divider).trim())] = decodeURIComponent(part.slice(divider + 1).trim()); } catch { /* malformed cookie */ }
  }
  return result;
}

export class GameServer {
  state: GameState;
  persistence?: PersistenceCoordinator;
  private simulationTimer?: NodeJS.Timeout;
  private snapshotTimer?: NodeJS.Timeout;
  private lastSnapshotRevision = -1;
  private sessionSockets = new Map<string, string>();
  private processedCommands = new Map<string, { at: number; fingerprint: string; result: CommandResult }>();
  private gameplayUndo: Array<{ label: string; payload: DurablePayload }> = [];
  private sharedCameraOrientations = new Map<SceneId, number>();
  private cameraSharingEnabled = false;

  constructor(private io: Server, private dmSessionToken: string, bundle: CampaignServerBundle) {
    this.state = new GameState(bundle);
  }

  private dmState(): DmState {
    const state = this.state.dmState(), latest = this.gameplayUndo.at(-1);
    state.gameUndo = { canUndo: Boolean(latest), label: latest?.label ?? null };
    return state;
  }

  private rememberUndo(label: string, payload: DurablePayload) {
    this.gameplayUndo.push({ label, payload });
    while (this.gameplayUndo.length > 20) this.gameplayUndo.shift();
  }

  installState(candidate: GameState) {
    candidate.runtimeEpoch = crypto.randomUUID();
    const audioNow = Date.now();
    for (const track of [candidate.audio.music, ...Object.values(candidate.audio.layers), ...Object.values(candidate.audio.sfxLoops)]) if (track.playing) track.startedAt = audioNow;
    this.state = candidate; this.processedCommands.clear(); this.sessionSockets.clear(); this.gameplayUndo = []; this.sharedCameraOrientations.clear(); this.cameraSharingEnabled = false;
    for (const connected of this.io.sockets.sockets.values()) connected.data.sceneReadyEpoch = -1;
    this.io.emit('runtime:reset', { runtimeEpoch: candidate.runtimeEpoch, reason: 'La partida se ha reemplazado; vuelve a elegir personaje.' });
    this.io.to('dm').emit('world:snapshot', candidate.publicSnapshot());
    const publicScene = candidate.campaign.public.scenes.find(scene => scene.access !== 'authorized')?.id ?? candidate.sceneId;
    this.io.to('player').emit('world:snapshot', candidate.publicSnapshot(true, publicScene));
    this.io.to('projector').emit('world:snapshot', candidate.publicSnapshot(true));
    this.io.emit('audio:state', { ...candidate.audio, runtimeEpoch: candidate.runtimeEpoch });
    this.io.to('player').emit('characters:available', { runtimeEpoch: candidate.runtimeEpoch, characters: this.availableCharacters() });
    this.io.to('dm').emit('dm:state', this.dmState());
    return candidate.runtimeEpoch;
  }

  private mutatorAllowed(raw: unknown) {
    return Boolean(raw && typeof raw === 'object' && (raw as Record<string, unknown>).runtimeEpoch === this.state.runtimeEpoch);
  }
  private worldOpen() { return !this.persistence || ['ready', 'saving', 'error'].includes(this.persistence.status().mode); }
  private emitResult(socket: Socket, result: CommandResult) {
    return socket.emit('command:result', { ...result, runtimeEpoch: this.state.runtimeEpoch });
  }

  start() {
    this.io.on('connection', socket => this.connect(socket));
    this.simulationTimer = setInterval(() => {
      if (!this.worldOpen()) return;
      const before = this.state.stateRevision;
      const changedCharacters = this.state.tick();
      if (this.state.stateRevision !== before) this.persistence?.markDirty();
      if (!changedCharacters.size) return;
      // A held movement key creates a new step every few hundred milliseconds.
      // Emit only when a step begins (rather than when it finishes) so player
      // movement has a tactile sound without doubling every footfall.
      this.broadcastSnapshot();
      for (const characterId of changedCharacters) if (this.state.characters.get(characterId)?.step) this.emitMovementSfx(characterId);
      for (const characterId of changedCharacters) this.broadcastPrivateFor(characterId);
      this.io.to('dm').emit('dm:state', this.dmState());
    }, 1000 / 30);
    this.snapshotTimer = setInterval(() => {
      if (this.worldOpen() && this.state.revision !== this.lastSnapshotRevision) this.broadcastSnapshot();
    }, 1000 / 20);
  }

  stop() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
  }

  private canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(item => this.canonical(item)).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${this.canonical(item)}`).join(',')}}`;
    return JSON.stringify(value);
  }

  private previousCommand(scope: string, command: { commandId: string }) {
    const now = Date.now();
    for (const [key, cached] of this.processedCommands) if (now - cached.at > 600_000) this.processedCommands.delete(key);
    const cached = this.processedCommands.get(`${scope}:${command.commandId}`);
    if (!cached) return { kind: 'miss' as const };
    return cached.fingerprint === this.canonical(command) ? { kind: 'same' as const, result: cached.result } : { kind: 'reused' as const };
  }

  private rememberResult(scope: string, command: { commandId: string }, result: CommandResult) {
    while (this.processedCommands.size >= 1_000) this.processedCommands.delete(this.processedCommands.keys().next().value!);
    this.processedCommands.set(`${scope}:${command.commandId}`, { at: Date.now(), fingerprint: this.canonical(command), result: { ...result } });
    return result;
  }

  private revokeController(socketId: string) {
    const previous = this.io.sockets.sockets.get(socketId);
    previous?.emit('player:private', this.state.playerPrivate('__revoked__', 'El control se transfirió a otra pestaña.'));
    previous?.disconnect(true);
  }

  private snapshotForSocket(socket: Socket) {
    if (socket.data.role === 'dm') return this.state.publicSnapshot(false, this.state.sceneId);
    if (socket.data.role === 'projector') return this.state.publicSnapshot(true, this.state.sceneId);
    const character = this.state.characterForSession(String(socket.data.sessionToken ?? ''));
    const publicScene = this.state.campaign.public.scenes.find(scene => scene.access !== 'authorized')?.id ?? this.state.campaign.public.initialSceneId;
    return this.state.publicSnapshot(true, character?.sceneId ?? publicScene, character?.surfaceId);
  }

  private sendSharedCameraOrientation(socket: Socket, sceneId: SceneId, sceneEpoch: number) {
    if (!this.cameraSharingEnabled) return;
    const step = this.sharedCameraOrientations.get(sceneId);
    if (step === undefined) return;
    socket.emit('camera:orientation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch, sceneId, step });
  }

  private handleCameraOrientation(socket: Socket, raw: unknown) {
    if (socket.data.role !== 'dm' || !this.mutatorAllowed(raw) || !raw || typeof raw !== 'object') return;
    const event = raw as Record<string, unknown>;
    if (event.runtimeEpoch !== this.state.runtimeEpoch || event.sceneEpoch !== this.state.sceneEpoch
      || event.sceneId !== this.state.sceneId
      || (event.step !== null && (!Number.isInteger(event.step) || Number(event.step) < 0 || Number(event.step) > 7))) return;
    const scene = this.state.campaign.public.scenes.find(candidate => candidate.id === event.sceneId);
    if (!supportsCameraOrientation(scene)) return;
    if (event.step === null) {
      this.cameraSharingEnabled = false;
      this.sharedCameraOrientations.clear();
      this.io.emit('camera:orientation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, sceneId: event.sceneId, step: null });
      return;
    }
    const step = Number(event.step), sceneId = event.sceneId as SceneId;
    this.cameraSharingEnabled = true;
    this.sharedCameraOrientations.set(sceneId, step);
    this.io.emit('camera:orientation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, sceneId, step });
  }

  private connect(socket: Socket) {
    const wantedRole = socket.handshake.auth?.role;
    const protocolVersion = socket.handshake.auth?.protocolVersion;
    const objectModelVersion = socket.handshake.auth?.objectModelVersion;
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const isDm = wantedRole === 'dm' && cookies.dnd_dm === this.dmSessionToken;
    const isProjector = wantedRole === 'projector';
    const rawSession = socket.handshake.auth?.sessionToken;
    const sessionToken = typeof rawSession === 'string' && /^[a-f0-9]{32,64}$/.test(rawSession) ? rawSession : '';

    if (protocolVersion !== PROTOCOL_VERSION || objectModelVersion !== OBJECT_MODEL_VERSION) { socket.emit('auth:error', { code: 'PROTOCOL_MISMATCH' }); socket.disconnect(); return; }
    if (!['dm', 'projector', 'player'].includes(wantedRole)) { socket.emit('auth:error', { code: 'INVALID_ROLE' }); socket.disconnect(); return; }
    if (wantedRole === 'dm' && !isDm) { socket.emit('auth:error', { code: 'DM_AUTH_REQUIRED' }); socket.disconnect(); return; }
    if (wantedRole === 'player' && !sessionToken) { socket.emit('auth:error', { code: 'INVALID_SESSION' }); socket.disconnect(); return; }
    if (wantedRole !== 'dm' && !this.worldOpen()) { socket.emit('auth:error', { code: 'RECOVERY_REQUIRED' }); socket.disconnect(); return; }

    socket.data.role = isDm ? 'dm' : isProjector ? 'projector' : 'player';
    socket.data.sessionToken = sessionToken;
    socket.data.sceneReadyEpoch = -1;
    socket.join(socket.data.role);
    socket.emit('runtime:reset', { runtimeEpoch: this.state.runtimeEpoch, reason: 'Conexión establecida.' });
    const initialSnapshot = this.snapshotForSocket(socket);
    socket.emit('world:snapshot', initialSnapshot);
    if (socket.data.role !== 'dm') this.sendSharedCameraOrientation(socket, initialSnapshot.sceneId, initialSnapshot.sceneEpoch);
    socket.emit('audio:state', { ...this.state.audio, runtimeEpoch: this.state.runtimeEpoch });
    socket.on('scene:ready', raw => this.handleSceneReady(socket, sessionToken, raw));

    if (isDm) {
      socket.emit('dm:state', this.dmState());
      socket.on('dm:command', raw => this.handleDm(socket, raw));
      socket.on('camera:orientation', raw => this.handleCameraOrientation(socket, raw));
    } else if (isProjector) {
      socket.on('projector:ready', (ready: unknown) => {
        if (!this.mutatorAllowed(ready)) return;
        this.state.projectorReady = (ready as { ready?: unknown }).ready === true;
        this.io.to('dm').emit('dm:state', this.dmState());
      });
      socket.on('sfx:loop:ended', raw => {
        if (!this.mutatorAllowed(raw)) return;
        const parsed = sfxLoopEndedSchema.safeParse(raw);
        if (!parsed.success) return;
        const track = this.state.audio.sfxLoops[parsed.data.sfxId];
        // Si el DM ha reiniciado o ajustado el efecto, el final anterior no
        // debe interrumpir la nueva secuencia.
        if (!track?.playing || track.startedAt !== parsed.data.startedAt) return;
        track.playing = false;
        track.startedAt = null;
        this.state.stateRevision++;
        this.persistence?.markDirty();
        this.io.emit('audio:state', { ...this.state.audio, runtimeEpoch: this.state.runtimeEpoch });
        this.io.to('dm').emit('dm:state', this.dmState());
      });
    } else {
      const current = this.state.characterForSession(sessionToken);
      if (current) {
        const previous = this.sessionSockets.get(sessionToken);
        if (previous && previous !== socket.id) this.revokeController(previous);
        current.socketId = socket.id;
        current.input = { held: null, seq: -1, updatedAt: 0 };
        this.sessionSockets.set(sessionToken, socket.id);
      }
      socket.emit('characters:available', { runtimeEpoch: this.state.runtimeEpoch, characters: this.availableCharacters() });
      socket.emit('player:private', this.state.playerPrivate(sessionToken));
      socket.on('player:claim', raw => this.handleClaim(socket, sessionToken, raw));
      socket.on('input:move', raw => this.handleMove(socket, sessionToken, raw));
      socket.on('player:interact', raw => this.handleInteract(socket, sessionToken, raw));
      socket.on('player:camp-interact', raw => this.handleCampInteract(socket, sessionToken, raw));
      socket.on('player:exploration', raw => this.handleExplorationAction(socket, sessionToken, raw));
      socket.on('player:combat', raw => this.handlePlayerCombat(socket, sessionToken, raw));
      socket.on('player:inventory', raw => this.handleInventory(socket, sessionToken, raw));
      socket.on('player:sheet', raw => this.handleCharacterSheet(socket, sessionToken, raw));
    }

    socket.on('disconnect', () => {
      if (socket.data.role === 'player') {
        const character = this.state.characterForSession(sessionToken);
        if (character?.socketId === socket.id) {
          this.state.cancelInteractionsForCharacter(character.id);
          character.socketId = null;
          character.input = { held: null, seq: -1, updatedAt: 0 };
        }
        if (this.sessionSockets.get(sessionToken) === socket.id) this.sessionSockets.delete(sessionToken);
        if (character?.sceneId === 'wreck-ship' && character.surfaceId === 'sea') this.broadcastPrivate();
      }
      if (socket.data.role === 'projector') this.state.projectorReady = false;
      this.io.to('dm').emit('dm:state', this.dmState());
    });
  }

  private handleSceneReady(socket: Socket, token: string, raw: unknown) {
    if (!this.mutatorAllowed(raw)) return;
    const parsed = sceneReadySchema.safeParse(raw);
    if (!parsed.success || parsed.data.sceneEpoch !== this.state.sceneEpoch) return;
    socket.data.sceneReadyEpoch = parsed.data.sceneEpoch;
    if (socket.data.role === 'player') socket.emit('player:private', this.state.playerPrivate(token));
    if (socket.data.role !== 'dm') {
      const snapshot = this.snapshotForSocket(socket);
      this.sendSharedCameraOrientation(socket, snapshot.sceneId, snapshot.sceneEpoch);
    }
  }

  private availableCharacters() {
    return [...this.state.characters.values()].map(character => ({
      id: character.id, label: character.label, archetype: character.archetype, color: character.color, tokenId: character.tokenId,
      claimed: Boolean(character.sessionToken), connected: Boolean(character.socketId)
    }));
  }

  private handleClaim(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen()) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'STALE_RUNTIME' });
    const parsed = claimSchema.safeParse(raw);
    if (!parsed.success) return this.emitResult(socket, { ok: false, code: 'INVALID_CLAIM' });
    const result = this.state.claim(token, socket.id, parsed.data.characterId);
    if (!result.ok) return this.emitResult(socket, { ok: false, code: 'CHARACTER_UNAVAILABLE' });
    if (result.replacedSocketId) this.revokeController(result.replacedSocketId);
    this.sessionSockets.set(token, socket.id);
    this.emitResult(socket, { ok: true, code: 'CLAIMED' });
    socket.emit('player:private', this.state.playerPrivate(token, `Ahora controlas a ${result.character?.label}.`));
    const snapshot = this.snapshotForSocket(socket);
    socket.emit('world:snapshot', snapshot);
    this.sendSharedCameraOrientation(socket, snapshot.sceneId, snapshot.sceneEpoch);
    this.io.to('player').emit('characters:available', { runtimeEpoch: this.state.runtimeEpoch, characters: this.availableCharacters() });
    this.io.to('dm').emit('dm:state', this.dmState());
  }

  private handleMove(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen()) return;
    if (!this.mutatorAllowed(raw)) return;
    const parsed = moveInputSchema.safeParse(raw);
    const character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id || socket.data.sceneReadyEpoch !== this.state.sceneEpoch) return;
    if (parsed.data.sceneEpoch !== this.state.sceneEpoch || parsed.data.seq <= character.input.seq) return;
    character.input.seq = parsed.data.seq;
    character.input.updatedAt = Date.now();
    if (parsed.data.end) { character.input.held = null; return; }
    const facing = directionFromVector(parsed.data.x, parsed.data.z);
    character.input.held = facing;
    const before = facing && !character.step ? this.state.captureDurable() : null;
    if (facing && !character.step && this.state.startStep(character, facing)) {
      if (before) this.rememberUndo(`Mover ${character.label}`, before);
      this.persistence?.markDirty();
      // El primer paso no pasa por el tick de repetición: se emite aquí para
      // que una sola casilla tenga exactamente el mismo sonido que una ruta.
      // startStep crea siempre un paso con la duración estándar. TypeScript no
      // puede inferir la mutación hecha dentro de startStep, así que no se
      // vuelve a leer character.step tras la comprobación de guarda.
      this.emitMovementSfx(character.id, STEP_DURATION_MS);
      this.broadcastSnapshot();
      this.broadcastPrivateFor(character.id);
      this.io.to('dm').emit('dm:state', this.dmState());
    }
  }

  private handlePlayerCombat(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen()) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'STALE_RUNTIME' });
    const parsed = playerCombatSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id || parsed.data.sceneEpoch !== this.state.sceneEpoch) return this.emitResult(socket, { ok: false, code: 'INVALID_COMBAT_COMMAND' });
    const scope = `player:${token}`;
    const previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const finish = (result: CommandResult) => this.emitResult(socket, this.rememberResult(scope, parsed.data, result));
    const before = this.state.captureDurable();
    const pendingBefore = this.state.combat.pending ? structuredClone(this.state.combat.pending) : null;
    let resultCode = 'APPLIED';
    if (parsed.data.type === 'combat:initiative') {
      if (!this.state.submitInitiative(character.id, parsed.data.total)) return finish({ commandId: parsed.data.commandId, ok: false, code: 'INVALID_INITIATIVE' });
      resultCode = 'INITIATIVE_RECORDED';
    } else if (parsed.data.type === 'combat:cancelAction') {
      const result = this.state.cancelCombatAction(character.id, parsed.data.promptId); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else if (parsed.data.type === 'combat:flee') {
      const result = this.state.requestCombatFlee(character.id); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else if (parsed.data.type === 'combat:endTurn') {
      if (this.state.publicSnapshot().combat.currentId !== character.id) return finish({ commandId: parsed.data.commandId, ok: false, code: 'NOT_YOUR_TURN' });
      if (this.state.combat.pending) return finish({ commandId: parsed.data.commandId, ok: false, code: 'ROLL_PENDING' });
      if (!this.state.nextCombatTurn()) return finish({ commandId: parsed.data.commandId, ok: false, code: 'COMBAT_INACTIVE' });
    } else if (parsed.data.type === 'combat:declare') {
      const result = this.state.declareCombatAction(character.id, parsed.data.targetId, parsed.data.actionId, parsed.data.useSneakAttack, parsed.data.targetCell); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else if (parsed.data.type === 'combat:basic') {
      const result = this.state.useBasicCombatAction(character.id, parsed.data.action, parsed.data.targetId); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
      this.emitBasicActionAnimation(character.id, parsed.data.action);
    } else if (parsed.data.type === 'combat:escape') {
      const result = this.state.declareEscape(character.id); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else if (parsed.data.type === 'combat:stand' || parsed.data.type === 'combat:dropProne') {
      const result = this.state.changeCombatPosture(character.id, parsed.data.type === 'combat:dropProne'); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else if (parsed.data.type === 'combat:reaction') {
      const result = this.state.submitCombatReaction('player', character.id, parsed.data.promptId, parsed.data.accept); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else if (parsed.data.type === 'combat:rollAttack' || parsed.data.type === 'combat:rollDamage' || parsed.data.type === 'combat:rollSave' || parsed.data.type === 'combat:rollDeathSave') {
      const value = parsed.data.type === 'combat:rollAttack' || parsed.data.type === 'combat:rollDeathSave' ? parsed.data.d20 : parsed.data.type === 'combat:rollDamage' ? parsed.data.diceTotal : parsed.data.total;
      const expectedStage = parsed.data.type === 'combat:rollAttack' ? 'attack' : parsed.data.type === 'combat:rollDamage' ? 'damage' : parsed.data.type === 'combat:rollDeathSave' ? 'death-save' : this.state.combat.pending?.stage === 'escape' ? 'escape' : this.state.combat.pending?.stage === 'check' ? 'check' : this.state.combat.pending?.stage === 'concentration' ? 'concentration' : 'save';
      const result = this.state.submitCombatRoll('player', character.id, expectedStage, parsed.data.promptId, value); if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result }); resultCode = result.code;
    } else {
      if (!this.state.combat.active) return finish({ commandId: parsed.data.commandId, ok: false, code: 'COMBAT_INACTIVE' });
      this.state.applyHitPoints(character.id, parsed.data.delta);
    }
    if (JSON.stringify(before) !== JSON.stringify(this.state.captureDurable())) this.rememberUndo(`${character.label}: ${parsed.data.type}`, before);
    this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
    if (pendingBefore && (parsed.data.type === 'combat:rollAttack' || parsed.data.type === 'combat:rollSave' || parsed.data.type === 'combat:rollDamage') && this.combatResolutionHasVisual(pendingBefore)) this.emitCombatAnimation(pendingBefore, resultCode !== 'ATTACK_MISSED' && resultCode !== 'SAVE_SUCCESS');
    if (parsed.data.type === 'combat:declare' && parsed.data.targetCell) this.emitAreaEffect(parsed.data.actionId, parsed.data.targetCell);
    finish({ commandId: parsed.data.commandId, ok: true, code: resultCode }); this.broadcastSnapshot(); this.broadcastPrivate(); this.io.to('dm').emit('dm:state', this.dmState());
  }

  private handleInventory(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen()) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'STALE_RUNTIME' });
    const parsed = inventoryUpdateSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id) return this.emitResult(socket, { ok: false, code: 'INVALID_INVENTORY' });
    const scope = `player:${token}`, previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const before = this.state.captureDurable();
    character.inventory = [...parsed.data.items]; this.state.revision++; this.state.stateRevision++;
    this.rememberUndo(`${character.label}: mochila`, before); this.persistence?.markDirty();
    const result = this.rememberResult(scope, parsed.data, { commandId: parsed.data.commandId, ok: true, code: 'INVENTORY_SAVED' });
    this.emitResult(socket, result); this.broadcastPrivateFor(character.id); this.io.to('dm').emit('dm:state', this.dmState());
  }

  private handleCharacterSheet(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen() || !this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    const parsed = characterSheetUpdateSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id) return this.emitResult(socket, { ok: false, code: 'INVALID_SHEET' });
    const scope = `player:${token}`, previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const before = this.state.captureDurable();
    character.sheet = structuredClone(parsed.data.sheet);
    // These are the values used by the combat engine, so a level-up edit is
    // reflected immediately rather than leaving two contradictory sheets.
    character.combat.armorClass = parsed.data.sheet.armorClass;
    character.combat.speedMeters = parsed.data.sheet.speedMeters;
    this.state.revision++; this.state.stateRevision++; this.rememberUndo(`${character.label}: hoja`, before); this.persistence?.markDirty();
    const result = this.rememberResult(scope, parsed.data, { commandId: parsed.data.commandId, ok: true, code: 'SHEET_SAVED' });
    this.emitResult(socket, result); this.broadcastPrivateFor(character.id); this.io.to('dm').emit('dm:state', this.dmState());
  }

  private handleInteract(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen()) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'STALE_RUNTIME' });
    const parsed = interactSchema.safeParse(raw);
    const character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id) return this.emitResult(socket, { ok: false, code: 'INVALID_INTERACTION' });
    const scope = `player:${token}`;
    const previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const finish = (result: CommandResult) => this.emitResult(socket, this.rememberResult(scope, parsed.data, result));
    if (parsed.data.sceneEpoch !== this.state.sceneEpoch || socket.data.sceneReadyEpoch !== this.state.sceneEpoch) return finish({ commandId: parsed.data.commandId, ok: false, code: 'WRONG_SCENE' });
    const door = this.state.interactNearbyDoor(character.id, parsed.data.targetId);
    if (door) {
      if (!door.ok) return finish({ commandId: parsed.data.commandId, ok: false, code: door.code });
      this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code: door.code });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.broadcastSnapshot(); this.broadcastPrivate(); this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    if (parsed.data.targetId === 'wreck-rowboat') {
      const code = this.state.interactRowboat(character.id);
      if (code !== 'ROWBOAT_BOARDED' && code !== 'ROWBOAT_LEFT') return finish({ commandId: parsed.data.commandId, ok: false, code });
      this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code });
      this.broadcastSnapshot(); this.broadcastPrivate(); this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    if (this.state.sceneForCharacter(character).pickups?.some(pickup => pickup.id === parsed.data.targetId)) {
      const code = this.state.takePickup(character.id, parsed.data.targetId);
      if (code !== 'PICKUP_TAKEN') return finish({ commandId: parsed.data.commandId, ok: false, code });
      this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.broadcastSnapshot(); this.broadcastPrivate(); this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    const stageInteraction = this.state.stageActorInteractionFor(character.id, parsed.data.targetId);
    if (stageInteraction) {
      finish({ commandId: parsed.data.commandId, ok: true, code: 'INTERACTION_RESOLVED' });
      // This is a shared scene beat, not just a local button response.  Broadcast
      // the player's gesture as well as the PNJ reaction so the player, DM and
      // projector stay visually in sync. Tokens without an `interact` animation
      // safely remain on their idle pose in the renderer.
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: stageInteraction.targetId, state: stageInteraction.responseAnimation, durationMs: stageInteraction.durationMs ?? 1_800 });
      this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, stageInteraction.notice));
      this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    const mirrorInteraction = this.state.mirrorInteractionFor(character.id, parsed.data.targetId);
    if (mirrorInteraction && this.state.creature) {
      this.state.prepareMirrorEncounter(character.id);
      this.state.creature.visible = true;
      this.state.progress.mirror = true;
      this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code: 'INTERACTION_RESOLVED' });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.io.emit('mirror:transformation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, propId: mirrorInteraction.targetId, sourceId: character.id, reflectionId: this.state.creature.id, frames: mirrorInteraction.effectFrames, durationMs: mirrorInteraction.durationMs ?? 1_600 });
      this.broadcastSnapshot(); this.broadcastPrivate();
      this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, mirrorInteraction.notice));
      this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    const interaction = this.state.campaign.wheelInteraction;
    if (!interaction || this.state.sceneId !== interaction.sceneId || parsed.data.targetId !== interaction.targetId) {
      return finish({ commandId: parsed.data.commandId, ok: false, code: 'WRONG_SCENE' });
    }
    if (!this.state.playerPrivate(token).canInteract) return finish({ commandId: parsed.data.commandId, ok: false, code: 'TOO_FAR' });
    if (this.state.interactions.some(candidate => candidate.characterId === character.id && candidate.targetId === interaction.targetId && candidate.status === 'pending')) {
      return finish({ commandId: parsed.data.commandId, ok: false, code: 'INTERACTION_PENDING' });
    }
    this.state.interactions = this.state.interactions.filter(candidate => candidate.status === 'pending' || Date.now() - candidate.createdAt < 600_000);
    if (this.state.interactions.length >= 200) return finish({ commandId: parsed.data.commandId, ok: false, code: 'INTERACTION_LIMIT' });
    const wheel = this.state.interactionObject(interaction.targetId);
    if (!wheel || wheel.kind !== 'wheel') return finish({ commandId: parsed.data.commandId, ok: false, code: 'REQUEST_STALE' });
    const request = {
      id: crypto.randomUUID(), characterId: character.id, characterLabel: character.label,
      targetId: interaction.targetId, createdAt: Date.now(), status: 'pending' as const,
      sceneId: this.state.sceneId, sceneEpoch: this.state.sceneEpoch, objectVersion: wheel.version, sessionToken: token
    };
    this.state.interactions.push(request);
    finish({ commandId: parsed.data.commandId, ok: true, code: 'REQUESTED' });
    this.io.to('dm').emit('dm:state', this.dmState());
  }

  private handleCampInteract(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen() || !this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    const parsed = campPlayerInteractSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id) return this.emitResult(socket, { ok: false, code: 'INVALID_INTERACTION' });
    const scope = `player:${token}`, previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const finish = (result: CommandResult) => this.emitResult(socket, this.rememberResult(scope, parsed.data, result));
    if (parsed.data.sceneEpoch !== this.state.sceneEpoch || socket.data.sceneReadyEpoch !== this.state.sceneEpoch)
      return finish({ commandId: parsed.data.commandId, ok: false, code: 'WRONG_SCENE' });
    const result = this.state.applyCampPlayerInteraction(character.id, parsed.data.pointId);
    if (!result.ok) return finish({ commandId: parsed.data.commandId, ok: false, code: result.code });
    this.persistence?.markDirty();
    finish({ commandId: parsed.data.commandId, ok: true, code: result.code });
    this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
    this.broadcastSnapshot();
    this.broadcastPrivate();
    this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, result.notice));
    this.io.to('dm').emit('dm:state', this.dmState());
  }

  private handleExplorationAction(socket: Socket, token: string, raw: unknown) {
    if (!this.worldOpen()) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'STALE_RUNTIME' });
    const parsed = explorationActionSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success || !character || character.socketId !== socket.id || parsed.data.sceneEpoch !== this.state.sceneEpoch) return this.emitResult(socket, { ok: false, code: 'INVALID_EXPLORATION_ACTION' });
    const scope = `player:${token}`, previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const finish = (result: CommandResult) => this.emitResult(socket, this.rememberResult(scope, parsed.data, result));
    if (parsed.data.type === 'exploration:attack') {
      const result = this.state.startCombatFromAttack(character.id, parsed.data.targetId, parsed.data.actionId);
      if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result });
      this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code: result.code }); this.broadcastSnapshot(); this.broadcastPrivate(); this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    if (parsed.data.type === 'exploration:basic') {
      const result = this.state.declareExplorationBasicAction(character.id, parsed.data.action, parsed.data.targetId, parsed.data.targetCell);
      if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result });
      this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: result.action.animation, durationMs: 900 });
      if (result.action.animation === 'interact') this.emitProjectorSfx('d8-night-sfx-world-book-open');
      finish({ commandId: parsed.data.commandId, ok: true, code: result.code });
      this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, `${result.action.label} · ${result.targetLabel}. ${result.guidance}`));
      this.io.to('dm').emit('dm:state', this.dmState());
      return;
    }
    const result = this.state.declareExplorationAction(character.id, parsed.data.targetId, parsed.data.actionId, parsed.data.targetCell);
    if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result });
    this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
    this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'spell', durationMs: 1_000 });
    if (result.action.soundId) this.emitProjectorSfx(result.action.soundId);
    this.emitAreaEffect(result.action.id, result.target.cell);
    finish({ commandId: parsed.data.commandId, ok: true, code: result.code });
    this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, `${result.action.label} sobre ${result.target.label}. ${result.action.guidance}`));
    this.io.to('dm').emit('dm:state', this.dmState());
  }

  applyDmCommand(command: DmCommand): CommandResult {
    const staleTypes = new Set(['scene', 'view:focus', 'entity:portal', 'scene:animation', 'creature', 'npc:visible', 'camera', 'environment', 'camp:rest', 'entity:move', 'resolveInteraction', 'combat:start', 'combat:participant', 'combat:initiative', 'combat:initiativeOrder', 'combat:condition', 'combat:endTurn', 'combat:next', 'combat:end', 'combat:declare', 'combat:basic', 'combat:stand', 'combat:dropProne', 'combat:reaction', 'combat:rollAttack', 'combat:rollDamage', 'combat:rollSave', 'combat:rollDeathSave', 'combat:recharge', 'progress:toggle', 'pickup:take']);
    if ((staleTypes.has(command.type) || command.type.startsWith('combat:')) && 'sceneEpoch' in command && command.sceneEpoch !== this.state.sceneEpoch) {
      return { commandId: command.commandId, ok: false, code: 'STALE_SCENE' };
    }
    if (command.type === 'object:door' || command.type === 'object:interact' || command.type === 'object:transform' || command.type === 'object:detach' || command.type === 'object:structure' || command.type === 'object:undo') {
      return this.state.applyObjectCommand(command);
    } else if (command.type === 'scene') {
      if (command.sceneId === 'wreck-ship' && this.state.campaign.public.campaignId === 'stormwreck-isle' && this.state.progress['wreck.curse-day-after'])
        return { commandId: command.commandId, ok: false, code: 'WRECK_DISAPPEARED' };
      if (!this.state.changeScene(command.sceneId)) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_SCENE' };
    } else if (command.type === 'view:focus') {
      if (!this.state.focusScene(command.sceneId)) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_SCENE' };
    } else if (command.type === 'entity:portal') {
      const result = this.state.traversePort(command.entityId, command.portId, command.direction, command.adjudicate);
      if (result !== 'MOVED') return { commandId: command.commandId, ok: false, code: result };
    } else if (command.type === 'creature') {
      const encounter = this.state.campaign.encounter;
      if (!this.state.creature || !encounter) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_ENTITY' };
      if (command.visible && this.state.sceneId !== encounter.sceneId) return { commandId: command.commandId, ok: false, code: 'WRONG_SCENE' };
      if (command.visible && !isWalkable(this.state.currentScene(), this.state.creature.cell, this.state.publicObjectProps())) return { commandId: command.commandId, ok: false, code: 'CREATURE_BLOCKED' };
      if (command.visible) this.state.prepareMirrorEncounter();
      this.state.creature.visible = command.visible;
      if (!command.visible) this.state.endCombat();
      if (!command.visible && this.state.camera.focusId === this.state.creature.id) this.state.camera.focusId = null;
    } else if (command.type === 'npc:visible') {
      if (!this.state.setNpcVisible(command.entityId, command.visible)) return { commandId: command.commandId, ok: false, code: 'INVALID_COMBATANT' };
    } else if (command.type === 'camera') {
      const validFocus = command.focusId === null || this.state.characters.has(command.focusId) || this.state.npcs.has(command.focusId) || Boolean(this.state.creature?.visible && command.focusId === this.state.creature.id);
      if (!validFocus) return { commandId: command.commandId, ok: false, code: 'INVALID_FOCUS' };
      this.state.camera = { mode: command.mode, focusId: command.focusId };
    } else if (command.type === 'environment') {
      const intensity = command.intensity ?? this.state.environment.stormIntensity;
      if (command.trackId && !this.state.campaign.public.audio.library?.ambience.some(track => track.id === command.trackId)) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_AUDIO_TRACK' };
      if (command.timeOfDay !== undefined) this.state.environment.timeOfDay = command.timeOfDay;
      this.state.environment.storm = command.storm;
      // Llovizna solo moja el mapa; los relámpagos aparecen a partir de tormenta.
      this.state.environment.lightning = command.storm && intensity >= .45;
      this.state.environment.stormIntensity = intensity;
      const stormAudio = this.state.audio.layers.storm, now = Date.now();
      if (command.trackId && stormAudio.assetId !== command.trackId) { stormAudio.assetId = command.trackId; stormAudio.offset = 0; stormAudio.startedAt = command.storm ? now : null; }
      if (command.storm && !stormAudio.playing) stormAudio.startedAt = now;
      if (!command.storm && stormAudio.playing && stormAudio.startedAt) stormAudio.offset += (now - stormAudio.startedAt) / 1000 * stormAudio.rate;
      stormAudio.playing = command.storm;
      stormAudio.startedAt = command.storm ? stormAudio.startedAt ?? now : null;
      stormAudio.volume = intensity;
    } else if (command.type === 'camp:rest') {
      return this.state.applyCampRestCommand(command);
    } else if (command.type === 'entity:move') {
      const result = this.state.moveEntityOneSquare(command.entityId, command.cell);
      if (result !== 'MOVED' && result !== 'REACTION_PENDING') return { commandId: command.commandId, ok: false, code: result };
      if (result === 'MOVED') this.emitMovementSfx(command.entityId);
    } else if (command.type === 'hp') {
      const character = this.state.characters.get(command.characterId);
      if (!character) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_CHARACTER' };
      this.state.applyHitPoints(character.id, command.hp - character.hp);
    } else if (command.type === 'resource') {
      const character = this.state.characters.get(command.characterId), resource = this.state.characters.get(command.characterId)?.combat.resources[command.resourceId];
      if (!character || !resource || command.current > resource.max) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_RESOURCE' };
      resource.current = command.current;
    } else if (command.type === 'entity:hp') {
      const entity = this.state.combatEntity(command.entityId);
      if (!entity) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_ENTITY' };
      this.state.applyHitPoints(entity.id, command.hp - entity.hp);
    } else if (command.type === 'combat:start') {
      if (!this.state.startCombat()) return { commandId: command.commandId, ok: false, code: 'COMBATANTS_REQUIRED' };
    } else if (command.type === 'combat:participant') {
      if (!this.state.setCombatParticipant(command.entityId, command.active)) return { commandId: command.commandId, ok: false, code: 'INVALID_COMBATANT' };
    } else if (command.type === 'combat:initiative') {
      if (!this.state.setInitiative(command.entries)) return { commandId: command.commandId, ok: false, code: 'INVALID_INITIATIVE' };
    } else if (command.type === 'combat:initiativeOrder') {
      if (!this.state.setInitiativeOrder(command.order, command.confirm)) return { commandId: command.commandId, ok: false, code: 'INVALID_INITIATIVE_ORDER' };
    } else if (command.type === 'combat:condition') {
      if (!this.state.setCombatCondition(command.entityId, command.condition, command.active)) return { commandId: command.commandId, ok: false, code: 'INVALID_COMBATANT' };
    } else if (command.type === 'combat:endTurn' || command.type === 'combat:next') {
      if (this.state.combat.pending) return { commandId: command.commandId, ok: false, code: 'ROLL_PENDING' };
      if (!this.state.nextCombatTurn()) return { commandId: command.commandId, ok: false, code: 'COMBAT_INACTIVE' };
    } else if (command.type === 'combat:end') {
      if (this.state.combat.pending) return { commandId: command.commandId, ok: false, code: 'ROLL_PENDING' };
      if (!this.state.endCombat()) return { commandId: command.commandId, ok: false, code: 'COMBAT_INACTIVE' };
    } else if (command.type === 'combat:cancel') {
      if (!this.state.cancelCombat()) return { commandId: command.commandId, ok: false, code: 'COMBAT_ALREADY_STARTED' };
    } else if (command.type === 'combat:cancelAction') {
      const result = this.state.cancelCombatAction(command.attackerId, command.promptId); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:withdraw') {
      const result = this.state.withdrawCombatant(command.entityId); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:declare') {
      const result = this.state.declareCombatAction(command.attackerId, command.targetId, command.actionId, command.useSneakAttack, command.targetCell); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:basic') {
      const result = this.state.useBasicCombatAction(command.attackerId, command.action, command.targetId); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:escape') {
      const result = this.state.declareEscape(command.attackerId); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:stand' || command.type === 'combat:dropProne') {
      const result = this.state.changeCombatPosture(command.attackerId, command.type === 'combat:dropProne'); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:reaction') {
      const result = this.state.submitCombatReaction('dm', null, command.promptId, command.accept); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:rollAttack' || command.type === 'combat:rollDamage' || command.type === 'combat:rollSave' || command.type === 'combat:rollDeathSave') {
      const value = command.type === 'combat:rollAttack' || command.type === 'combat:rollDeathSave' ? command.d20 : command.type === 'combat:rollDamage' ? command.diceTotal : command.total;
      const expectedStage = command.type === 'combat:rollAttack' ? 'attack' : command.type === 'combat:rollDamage' ? 'damage' : command.type === 'combat:rollDeathSave' ? 'death-save' : this.state.combat.pending?.stage === 'escape' ? 'escape' : this.state.combat.pending?.stage === 'check' ? 'check' : this.state.combat.pending?.stage === 'concentration' ? 'concentration' : 'save';
      const result = this.state.submitCombatRoll('dm', null, expectedStage, command.promptId, value); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:recharge') {
      if (!this.state.rechargeCombatAction(command.attackerId, command.actionId, command.d6)) return { commandId: command.commandId, ok: false, code: 'RECHARGE_INVALID' };
    } else if (command.type === 'progress:toggle') {
      const code = this.state.applyWreckProgressToggle(command.flag, command.value);
      if (code !== 'APPLIED') return { commandId: command.commandId, ok: false, code };
    } else if (command.type === 'wreck:level-up') {
      const code = this.state.applyWreckChapterLevelUp(command.level);
      if (code !== 'APPLIED') return { commandId: command.commandId, ok: false, code };
    } else if (command.type === 'pickup:take') {
      const code = this.state.takePickup(command.characterId, command.pickupId, true);
      if (code !== 'PICKUP_TAKEN') return { commandId: command.commandId, ok: false, code };
    } else if (command.type === 'release') {
      const character = this.state.characters.get(command.characterId);
      if (!character) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_CHARACTER' };
      const releasedSocketId = character.socketId;
      const releasedToken = character.sessionToken;
      this.state.cancelInteractionsForCharacter(character.id);
      character.sessionToken = null; character.socketId = null; character.input.held = null;
      if (releasedToken && this.sessionSockets.get(releasedToken) === releasedSocketId) this.sessionSockets.delete(releasedToken);
      if (releasedSocketId) {
        this.io.to(releasedSocketId).emit('player:private', this.state.playerPrivate(releasedToken ?? '__released__', 'El DM ha liberado este personaje. Puedes elegir otro.'));
      }
    } else if (command.type === 'audio') {
      const track = command.channel === 'music' ? this.state.audio.music : this.state.audio.layers[command.channel];
      const now = Date.now();
      if (track.playing && track.startedAt) track.offset += (now - track.startedAt) / 1000 * track.rate;
      if (!track.playing && command.playing) track.startedAt = now;
      if (!command.playing) track.startedAt = null;
      else if (track.playing) track.startedAt = now;
      track.playing = command.playing; track.volume = command.volume;
      if (command.loop !== undefined) track.loop = command.loop;
      if (command.rate !== undefined) track.rate = command.rate;
      if (command.repeats !== undefined) track.repeats = command.repeats;
    } else if (command.type === 'audio:select') {
      const library = command.channel === 'music' ? this.state.campaign.public.audio.library?.music : this.state.campaign.public.audio.library?.ambience;
      if (!library?.some(track => track.id === command.trackId)) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_AUDIO_TRACK' };
      const track = command.channel === 'music' ? this.state.audio.music : this.state.audio.layers[command.channel], now = Date.now();
      track.assetId = command.trackId; track.offset = 0;
      // Elegir una banda sonora en las consolas del DM debe ser suficiente
      // para oírla. Las capas ambientales mantienen su comportamiento de
      // selección independiente, pero un tema musical empieza al seleccionarlo.
      if (command.channel === 'music') { track.playing = true; track.startedAt = now; }
      else track.startedAt = track.playing ? now : null;
    } else if (command.type === 'audio:mix') {
      const library = this.state.campaign.public.audio.library?.ambience;
      if (!library || !Object.values(command.layers).every(setting => library.some(track => track.id === setting.trackId))) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_AUDIO_TRACK' };
      const now = Date.now();
      const setPlaying = (track: AudioState['music'], setting: { playing: boolean; volume: number; trackId?: string; loop?: boolean; rate?: number; repeats?: number }) => {
        const { playing, volume, trackId: assetId } = setting;
        const sourceChanged = assetId !== undefined && track.assetId !== assetId;
        if (track.playing && track.startedAt) track.offset += (now - track.startedAt) / 1000 * track.rate;
        if (sourceChanged) { track.assetId = assetId; track.offset = 0; }
        if (playing && (!track.playing || sourceChanged)) track.startedAt = now;
        if (!playing) track.startedAt = null;
        else if (track.playing) track.startedAt = now;
        track.playing = playing; track.volume = volume;
        if (setting.loop !== undefined) track.loop = setting.loop;
        if (setting.rate !== undefined) track.rate = setting.rate;
        if (setting.repeats !== undefined) track.repeats = setting.repeats;
      };
      setPlaying(this.state.audio.music, command.music);
      for (const channel of ['ocean', 'wind', 'wood', 'storm'] as const) {
        setPlaying(this.state.audio.layers[channel], command.layers[channel]);
      }
    } else if (command.type === 'sfx') {
      const isLegacy = command.sfxId === 'thunder' || command.sfxId === 'creak' || command.sfxId === 'impact';
      if (!isLegacy && !this.state.campaign.public.audio.library?.sfx.some(effect => effect.id === command.sfxId)) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_SOUND_EFFECT' };
    } else if (command.type === 'sfx:loop') {
      const effect = this.state.campaign.public.audio.library?.sfx.find(candidate => candidate.id === command.sfxId);
      if (!effect?.loopable) return { commandId: command.commandId, ok: false, code: 'SOUND_EFFECT_NOT_LOOPABLE' };
      const track = this.state.audio.sfxLoops[command.sfxId] ?? { ...freshTrack(.38), assetId: command.sfxId, loop: false, repeats: 4 };
      const now = Date.now();
      if (track.playing && track.startedAt) track.offset += (now - track.startedAt) / 1000 * track.rate;
      if (!track.playing && command.playing) { track.offset = 0; track.startedAt = now; }
      else if (!command.playing) track.startedAt = null;
      else track.startedAt = now;
      track.playing = command.playing; track.volume = command.volume;
      if (command.loop !== undefined) track.loop = command.loop;
      if (command.rate !== undefined) track.rate = command.rate;
      if (command.repeats !== undefined) track.repeats = command.repeats;
      this.state.audio.sfxLoops[command.sfxId] = track;
    } else if (command.type === 'scene:animation') {
      const actor = this.state.currentScene().stageActors?.find(candidate => candidate.id === command.entityId);
      if (!actor || !this.state.campaign.public.tokenAnimations[actor.tokenId]?.[command.state]) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_ANIMATION' };
    } else if (command.type === 'resolveInteraction') {
      if (command.objectRevision !== this.state.objectRevision) return this.state.objectCommandResult(command.commandId, false, 'STALE_OBJECTS');
      const request = this.state.interactions.find(candidate => candidate.id === command.requestId && candidate.status === 'pending');
      if (!request) return this.state.objectCommandResult(command.commandId, false, 'REQUEST_STALE');
      if (!this.state.interactionRequestValid(request)) { request.status = 'resolved'; return this.state.objectCommandResult(command.commandId, false, 'REQUEST_STALE'); }
      if (command.result === 'cancelled') {
        request.status = 'resolved';
        return this.state.objectCommandResult(command.commandId, true, 'APPLIED');
      }
      const result = this.state.applyObjectCommand({ type: 'object:detach', commandId: command.commandId, sceneEpoch: command.sceneEpoch, objectRevision: command.objectRevision, objectId: request.targetId, cell: command.cell!, rotation: command.rotation!, outcome: command.result });
      if (result.ok) request.status = 'resolved';
      return result;
    }
    this.state.revision++;
    return { commandId: command.commandId, ok: true, code: 'APPLIED' };
  }

  private handleDm(socket: Socket, raw: unknown) {
    if (!this.worldOpen()) return this.emitResult(socket, { ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { ok: false, code: 'STALE_RUNTIME' });
    const parsed = dmCommandSchema.safeParse(raw);
    if (!parsed.success) return this.emitResult(socket, { ok: false, code: 'INVALID_COMMAND' });
    const command = parsed.data;
    const objectCommand = command.type === 'object:door' || command.type === 'object:interact' || command.type === 'object:transform' || command.type === 'object:detach' || command.type === 'object:structure' || command.type === 'object:undo' || command.type === 'resolveInteraction';
    const scope = objectCommand ? 'dm:objects' : 'dm:general';
    const previous = this.previousCommand(scope, command);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') {
      const reused: CommandResult = objectCommand
        ? { commandId: command.commandId, ok: false, code: 'COMMAND_ID_REUSED', sceneId: this.state.sceneId, sceneEpoch: this.state.sceneEpoch, objectRevision: this.state.objectRevision }
        : { commandId: command.commandId, ok: false, code: 'COMMAND_ID_REUSED' };
      return this.emitResult(socket, reused);
    }
    const captureAt = Date.now();
    const pendingBefore = this.state.combat.pending ? structuredClone(this.state.combat.pending) : null;
    const before = this.state.captureDurable(captureAt), priorRevision = this.state.stateRevision;
    let result: CommandResult;
    if (command.type === 'game:undo') {
      const previousState = this.gameplayUndo.pop();
      if (!previousState) result = { commandId: command.commandId, ok: false, code: 'UNDO_EMPTY' };
      else {
        const sessions = [...this.state.characters.values()].map(character => ({ id: character.id, sessionToken: character.sessionToken, socketId: character.socketId }));
        const previousSceneEpoch = this.state.sceneEpoch;
        this.state.restoreDurable(previousState.payload);
        for (const session of sessions) { const character = this.state.characters.get(session.id); if (character) { character.sessionToken = session.sessionToken; character.socketId = session.socketId; } }
        this.state.sceneEpoch = previousSceneEpoch + 1; this.state.revision = Math.max(this.state.revision, priorRevision) + 1; this.state.stateRevision = priorRevision + 1; this.persistence?.markDirty(); result = { commandId: command.commandId, ok: true, code: 'APPLIED' };
      }
    } else result = this.applyDmCommand(command);
    if (result.ok && command.type !== 'sfx' && command.type !== 'release' && JSON.stringify(before) !== JSON.stringify(this.state.captureDurable(captureAt))) {
      if (this.state.stateRevision === priorRevision) this.state.stateRevision++;
      this.persistence?.markDirty();
      if (command.type !== 'audio' && command.type !== 'game:undo' && command.type !== 'object:undo') this.rememberUndo(command.type, before);
    }
    if (result.ok && (command.type === 'scene' || command.type === 'view:focus' || command.type === 'entity:portal' || command.type === 'combat:start' || command.type === 'combat:end')) void this.persistence?.saveNow().catch(() => {});
    this.emitResult(socket, this.rememberResult(scope, command, result));
    if (!result.ok) {
      if (objectCommand && (result.code === 'STALE_OBJECTS' || result.code === 'REQUEST_STALE')) socket.emit('dm:state', this.dmState());
      return;
    }
    if (pendingBefore && result.ok && (command.type === 'combat:rollAttack' || command.type === 'combat:rollSave' || command.type === 'combat:rollDamage') && this.combatResolutionHasVisual(pendingBefore)) this.emitCombatAnimation(pendingBefore, result.code !== 'ATTACK_MISSED' && result.code !== 'SAVE_SUCCESS');
    if (command.type === 'combat:basic') this.emitBasicActionAnimation(command.attackerId, command.action);
    if (command.type === 'combat:declare' && command.targetCell) this.emitAreaEffect(command.actionId, command.targetCell);
    if (command.type === 'scene') {
      for (const connected of this.io.sockets.sockets.values()) connected.data.sceneReadyEpoch = -1;
    }
    if (command.type === 'audio' || command.type === 'audio:select' || command.type === 'audio:mix' || command.type === 'sfx:loop' || command.type === 'environment' || command.type === 'scene' || command.type === 'view:focus') this.io.emit('audio:state', { ...this.state.audio, runtimeEpoch: this.state.runtimeEpoch });
    if (command.type === 'sfx') this.emitProjectorSfx(command.sfxId, command.commandId);
    if (command.type === 'scene:animation') {
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: command.entityId, state: command.state, durationMs: command.durationMs ?? 1_400 });
      this.emitSceneAnimationSfx(command.state);
    }
    if (command.type === 'release') this.io.to('player').emit('characters:available', { runtimeEpoch: this.state.runtimeEpoch, characters: this.availableCharacters() });
    if (command.type === 'resolveInteraction') {
      const request = this.state.interactions.find(candidate => candidate.id === command.requestId);
      if (request) {
        const character = this.state.characters.get(request.characterId);
        if (character?.socketId) this.io.to(character.socketId).emit('player:private', this.state.playerPrivate(character.sessionToken ?? '', command.result === 'cancelled' ? 'La interacción se canceló.' : 'El DM ha resuelto la tirada en mesa.'));
      }
    }
    this.broadcastSnapshot();
    this.broadcastPrivate();
    if (command.type === 'progress:toggle' && command.value) this.emitWreckProgressNotice(command.flag);
    if (command.type === 'wreck:level-up') this.emitWreckLevelNotice(command.level);
    this.io.to('dm').emit('dm:state', this.dmState());
  }

  private broadcastSnapshot() {
    this.lastSnapshotRevision = this.state.revision;
    this.io.to('dm').emit('world:snapshot', this.state.publicSnapshot());
    this.io.to('projector').emit('world:snapshot', this.state.publicSnapshot(true));
    for (const socket of this.io.sockets.sockets.values()) if (socket.data.role === 'player') socket.emit('world:snapshot', this.snapshotForSocket(socket));
  }

  private emitCombatAnimation(pending: PendingCombatResolution, hit: boolean) {
    const action = this.state.combatEntity(pending.attackerId)?.attacks.find(item => item.id === pending.actionId);
    const animationType = visualAnimationType(action);
    this.io.emit('combat:animation', {
      runtimeEpoch: this.state.runtimeEpoch, attackerId: pending.attackerId, targetId: pending.targetId,
      type: animationType, hit,
      sneakAttack: Boolean(pending.sneakAttackDice),
      frozen: pending.attackerId === this.state.creature?.id && this.state.campaign.encounter?.mirrorPlayer === true
    });
    if (!action?.soundId && animationType === 'arrow') {
      const runtimeEpoch = this.state.runtimeEpoch, sceneEpoch = this.state.sceneEpoch;
      this.emitProjectorSfx('d8-night-sfx-bow-release');
      setTimeout(() => {
        if (this.state.runtimeEpoch !== runtimeEpoch || this.state.sceneEpoch !== sceneEpoch) return;
        this.emitProjectorSfx('d8-night-sfx-arrow-swish');
        if (hit) setTimeout(() => {
          if (this.state.runtimeEpoch === runtimeEpoch && this.state.sceneEpoch === sceneEpoch) this.emitProjectorSfx('d8-night-sfx-arrow-hit');
        }, 280);
      }, 110);
      return;
    }
    const sfxId = action?.soundId ?? (action?.animationType === 'fireProjectile' ? 'd8-night-sfx-spell-fire'
      : animationType === 'vine' ? 'd8-night-sfx-attack-whip-crack'
      : action?.magical ? 'd8-night-sfx-spell-arcane'
      : hit ? 'd8-night-sfx-attack-hit' : 'd8-night-sfx-attack-swing');
    this.emitProjectorSfx(sfxId);
  }

  private combatResolutionHasVisual(pending: PendingCombatResolution) {
    if (pending.stage === 'attack' || pending.stage === 'save') return true;
    if (pending.stage !== 'damage') return false;
    return Boolean(this.state.combatEntity(pending.attackerId)?.attacks.find(item => item.id === pending.actionId)?.automaticHit);
  }

  private emitBasicActionAnimation(entityId: string, action: BasicCombatAction) {
    this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId, state: basicCombatActionAnimationStates[action], durationMs: action === 'dash' ? 900 : 700 });
    if (action === 'dash') this.emitMovementSfx(entityId, 900);
    else if (action === 'magic') this.emitProjectorSfx('d8-night-sfx-spell-arcane');
    else if (action === 'hide' || action === 'use-object') this.emitProjectorSfx('d8-night-sfx-world-leather-pack');
    else if (action === 'study') this.emitProjectorSfx('d8-night-sfx-world-book-open');
  }

  private emitAreaEffect(actionId: string, cell: Cell) {
    if (actionId !== 'fog-cloud' && actionId !== 'fog-cloud-exploration') return;
    this.io.emit('scene:area-effect', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, cell, type: 'fog', radiusMeters: 6, durationMs: 5_000 });
    this.emitProjectorSfx('d8-night-sfx-spell-arcane');
  }

  private emitProjectorSfx(sfxId: string, eventId: string = crypto.randomUUID()) {
    this.io.to('projector').emit('sfx:play', { eventId, sfxId, runtimeEpoch: this.state.runtimeEpoch });
  }

  private emitMovementSfx(entityId: string, durationMs = STEP_DURATION_MS) {
    const character = this.state.characters.get(entityId);
    const creature = this.state.creature?.id === entityId ? this.state.creature : null;
    const npc = this.state.npcs.get(entityId) ?? null;
    // La superficie pertenece a la ficha, no a la vista que esté enfocando el
    // DM; así los pasos siguen siendo correctos en mapas con varias plantas.
    const surface = character?.surfaceId ?? creature?.surfaceId ?? npc?.surfaceId ?? this.state.currentScene().surfaceId;
    const sfxId = surface === 'ice'
      ? 'd8-night-sfx-step-ice'
      : surface === 'cafe' || surface === 'village' || surface === 'deck' || surface === 'objects-deck'
      ? 'd8-night-sfx-step-wood'
      : surface === 'garden' || surface === 'market' || surface === 'beach' || surface === 'shore'
        ? 'd8-night-sfx-movement-gravel'
        : 'd8-night-sfx-step-stone';
    this.io.to('projector').emit('sfx:movement', { entityId, sfxId, durationMs: Math.max(1, Math.round(durationMs)), runtimeEpoch: this.state.runtimeEpoch });
  }

  private emitSceneAnimationSfx(state: string) {
    const byAnimation: Record<string, string> = {
      attack: 'd8-night-sfx-attack-swing', entangle: 'd8-night-sfx-attack-whip-crack', transform: 'd8-night-sfx-magic-ritual',
      activate: 'd8-night-sfx-magic-reveal', copy: 'd8-night-sfx-magic-teleport', interact: 'd8-night-sfx-world-book-open',
      give: 'd8-night-sfx-coins', 'receive-coins': 'd8-night-sfx-coins', 'give-beans': 'd8-night-sfx-world-wood-impact',
      'give-steak': 'd8-night-sfx-world-wood-impact', 'throw-cow': 'd8-night-sfx-market-cow-moo', 'guide-cow': 'd8-night-sfx-market-cow-moo'
    };
    if (byAnimation[state]) this.emitProjectorSfx(byAnimation[state]!);
  }

  private broadcastPrivate() {
    for (const character of this.state.characters.values()) {
      if (character.socketId && character.sessionToken) this.io.to(character.socketId).emit('player:private', this.state.playerPrivate(character.sessionToken));
    }
  }

  private broadcastPrivateFor(characterId: string) {
    const character = this.state.characters.get(characterId);
    if (character?.socketId && character.sessionToken) {
      this.io.to(character.socketId).emit('player:private', this.state.playerPrivate(character.sessionToken));
    }
  }

  private emitWreckProgressNotice(flag: string) {
    const notices: Record<string, string> = {
      'wreck.curse-grave': 'Un suspiro recorre el acantilado y la niebla empieza a retirarse del pecio.',
      'wreck.curse-aboard': 'Un suspiro profundo atraviesa las maderas. La niebla os envuelve mientras volvéis a la barca.',
      'wreck.curse-day-after': 'A la mañana siguiente, donde estaba el Rosa de los Vientos solo queda mar: el pecio ha desaparecido.',
      'wreck.cleric-dream': 'Esa noche sueñas con una presencia divina que bendice tu decisión: la maldición del pecio ha terminado.'
    };
    const notice = notices[flag];
    if (!notice) return;
    for (const character of this.state.characters.values()) {
      if (!character.socketId || !character.sessionToken) continue;
      if (flag === 'wreck.curse-aboard' && character.sceneId !== 'wreck-ship') continue;
      if (flag === 'wreck.cleric-dream' && character.id !== 'mia') continue;
      this.io.to(character.socketId).emit('player:private', this.state.playerPrivate(character.sessionToken, notice));
    }
  }

  private emitWreckLevelNotice(level: 2 | 3) {
    const notice = `El DM ha actualizado tu ficha a nivel ${level}. Revisad juntos los PG, rasgos, conjuros y recursos que cambian; el VTT no ha hecho tiradas ni cálculos automáticos.`;
    for (const character of this.state.characters.values()) {
      if (character.socketId && character.sessionToken)
        this.io.to(character.socketId).emit('player:private', this.state.playerPrivate(character.sessionToken, notice));
    }
  }
}
