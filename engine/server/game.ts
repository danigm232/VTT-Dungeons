import { strongWind, seaState, precipitationKind, weatherMode, resolveWeatherChange, type WeatherChange } from '../shared/weather.js';
import { A1_ROOM_CELL_KEYS } from '../../campaigns/camp-rests/public/a1-layout.js';
import crypto from 'node:crypto';
import {journeyReturnKey} from '../shared/journey.js';
import type { Server, Socket } from 'socket.io';
import {
  OBJECT_MODEL_VERSION, PROTOCOL_VERSION, STEP_DURATION_MS, basicCombatActionAnimationStates, campPlayerInteractSchema, characterSheetUpdateSchema, claimSchema, dmCommandSchema, explorationActionSchema, interactSchema, inventoryUpdateSchema, inventoryUseSchema, moveInputSchema, playerCombatSchema, sceneReadySchema, sfxLoopEndedSchema,
  explorationBasicActionCatalogue, type AudioState, type BasicCombatAction, type Cell, type CombatAction, type CombatCondition, type ConditionSource, type CombatEvent, type CombatParticipant, type CombatPrompt, type CommandResult, type DmCommand, type DmObject, type DmObjectInteraction, type DmState, type EnvironmentState, type ExplorationBasicAction, type Facing, type PlayerPrivate,
  type ExplorationAction, type PublicEntity, type PublicProp, type SceneId, type StepState, type WorldSnapshot
} from '../shared/protocol.js';
import type { CampRestState } from '../shared/camp-rest.js';
import { activitiesForCampPoint, campPointInReach } from '../shared/camp-activities.js';
import { adventureView, choiceFlag, endingFlag } from '../shared/adventure.js';
import type { PickupDefinition, PropDefinition, Rotation } from '../shared/campaign.js';
import { cellKey, footprintFor, sameCell, segmentCrossesBox } from '../shared/geometry.js';
import { supportsCameraOrientation, validCameraOrbitStep, validSharedCameraFrame, CAMERA_ORBIT_PROFILE, type SharedCameraFrame } from '../shared/camera.js';
import { validCameraTiltForScene } from '../shared/camera-profile.js';
import { surfaceNeighbors, surfaceHeight } from '../shared/terrain.js';
import { carriedLightRadiusMeters } from '../shared/carried-light.js';
import { inventoryEquals, inventoryStackIndex, removeInventoryUnit, useInventoryItem, type InventoryUse } from '../shared/inventory.js';
import { wreckCabinContentCell } from '../shared/wreck-structure.js';
import { jumpGuidance,jumpDistances } from '../shared/jumping.js';
import { planJumpRunUp, type JumpMode, type RunUpStep } from '../shared/jump-run-up.js';
import { conditionRemainingMs, ROUND_DURATION_MS } from '../shared/conditions.js';
import { actionVisualEffect, type DurableVisualEffect } from '../shared/world-visual-effects.js';
import { combatActionVisualState, combatTargetReactionState } from '../shared/combat-animation.js';
import { compileCampaignBundle, type CampaignServerBundle, type CompiledCampaign, type RuleTraits, type SceneDefinition } from './campaign.js';
import { directionFromVector, isWalkable, resolveStep } from './navigation.js';
import { durablePayloadSchema, type DurablePayload } from './persistence/schema.js';
import {migrateRetreatAssembly,RETREAT_SAVE_GRID_VERSION} from './retreat-migration.js';
import type { PersistenceCoordinator } from './persistence/coordinator.js';
import { advanceClimate, emptyClimateState, initialGameTimeSeconds, nextTimeOfDaySeconds, LONG_REST_SECONDS, SHORT_REST_SECONDS, SECONDS_PER_DAY, type ClimateState, type GameClockSnapshot } from '../shared/game-time.js';

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
  turnActions: Record<string, { actionId: string; label: string; kind: 'attack' | 'basic' }>;
  initiative: Record<string, number>; initiativeSubmitted: Record<string, boolean>; initiativePending: boolean; participantIds: string[]; sequences: Record<string, { actionId: string; remaining: number; targetId?: string }>;
  recharge: Record<string, Record<string, boolean>>; rechargeAttemptTurn: Record<string, string>; openingAction: { attackerId: string; targetId: string; actionId: string } | null;
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
const emptyCombat = (): CombatState => ({ active: false, round: 0, order: [], turnIndex: 0, spentSquares: {}, dashSquares: {}, actionUsed: {}, bonusActionUsed: {}, reactionUsed: {}, sneakAttackUsed: {}, sneakAttackUsedTurn: {}, spellSlotUsedTurn: {}, stances: {}, initiative: {}, initiativeSubmitted: {}, initiativePending: false, participantIds: [], sequences: {}, turnActions: {}, recharge: {}, rechargeAttemptTurn: {}, openingAction: null, pending: null, lastEvent: null });
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

const WRECK_SAVE_GRID_VERSION = 6;
const D8_SAVE_GRID_VERSION = 3;

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
  visualEffects: DurableVisualEffect[] = [];
  combat: CombatState = emptyCombat();
  camera = { mode: 'fixed' as 'fixed' | 'semiFixed' | 'follow', focusId: null as string | null };
  environment: EnvironmentState = { storm: false, lightning: false, stormIntensity: 0.5, timeOfDay: 'auto', temperatureC: 0, fogTarget: 0, floodTarget: 0, snowDifficultTerrain: false };
  private gameClockSeconds = 0;
  private gameClockAnchorMs = Date.now();
  private gameClockManuallyPaused = false;
  private gameClockDecisionPauses = new Set<string>();
  private climateStates = new Map<SceneId, ClimateState>();
  campRest: CampRestState | null = null;
  private campActivities = new Map<string, CampRestState['interactions']>();
  audio: AudioState = {
    music: freshTrack(0.3),
    layers: { ocean: freshTrack(0.5), wind: freshTrack(0.25), wood: freshTrack(0.2), storm: freshTrack(0.25) },
    sfxLoops: {}
  };
  projectorReady = false;
  interactions: RuntimeInteraction[] = [];
  private sceneNpcRoutes = new Map<string, Cell[]>();
  private walkingRunUp=new Map<string,{feet:number;facing:Facing;at:number;sceneId:string;surfaceId:string;cell:Cell}>();
  private plannedJumps = new Map<string, { sceneId: string; surfaceId: string; origin: Cell; expected: Cell;
    landing: Cell; steps: RunUpStep[]; socketId: string | null }>();
  blessingFor(characterId:string){
    const expiry=Number(this.storyNotes[`prayer.${characterId}.expiry`]);
    if(!this.progress[`prayer.${characterId}.inspiration`]||!Number.isFinite(expiry)||this.gameClockSnapshot().seconds>=expiry)return undefined;
    return {label:'Inspiración de Sylvania · 24 h',expiresGameSeconds:expiry,advice:'Gasta una vez para tener ventaja en un d20 físico. Recompensa del DM; no añade rasgos de clase o especie.'};
  }
  prayAtShrine(characterId:string){
    const character=this.characters.get(characterId),shrine=this.campaign.prayerShrine;
    if(this.conditionsFor(characterId).some(condition=>condition==='inconsciente'||condition==='paralizada'))return 'INCAPACITATED';
    if(!character||!shrine||character.sceneId!==shrine.sceneId||character.hp<=0||character.step||this.combat.active||Math.max(Math.abs(character.cell.col-shrine.cell.col),Math.abs(character.cell.row-shrine.cell.row))>2)return 'TOO_FAR';
    if(this.blessingFor(characterId))return 'BLESSING_ACTIVE';
    if(this.interactions.some(request=>request.characterId===characterId&&request.kind==='prayer'&&request.status==='pending'))return 'PRAYER_PENDING';
    this.interactions.push({id:crypto.randomUUID(),characterId,characterLabel:character.label,targetId:'temple-prayer',targetLabel:shrine.label,kind:'prayer',createdAt:Date.now(),status:'pending',sceneId:character.sceneId,sceneEpoch:this.sceneEpoch,objectVersion:0,sessionToken:character.sessionToken??''});this.revision++;return 'PRAYER_REQUESTED';
  }
  fleeSceneAnimal(){
    const id=this.campaign.proximityEncounter?.distraction?.actorId,animal=id?this.npcs.get(id):null;
    if(!animal||animal.hp<=0||!this.campaign.animalFleeDestination)return false;
    animal.combatEnabled=false;this.progress['cafe.horse-fleeing']=true;this.sceneNpcRoutes.delete(animal.id);this.revision++;this.stateRevision++;return true;
  }
  breakSceneWindow(characterId:string,windowId:string){
    if(this.conditionsFor(characterId).some(condition=>condition==='inconsciente'||condition==='paralizada'))return 'INCAPACITATED';
    const character=this.characters.get(characterId),window=this.campaign.sceneWindows?.find(window=>window.id===windowId),prop=window?this.objectsFor(window.sceneId).find(prop=>prop.id===window.id):null;
    if(!character||!window||!prop||character.hp<=0||character.step||this.combat.active||character.sceneId!==window.sceneId||Math.max(Math.abs(character.cell.col-window.cell.col),Math.abs(character.cell.row-window.cell.row))>2)return 'TOO_FAR';
    if(prop.structure==='destroyed')return 'ALREADY_BROKEN';
    this.commitObject(prop,{structure:prop.structure},{structure:'destroyed'},'Ventana rota por jugador',window.sceneId);
    const rule=this.campaign.proximityEncounter!;
    if(!this.storyNotes['cafe.window-homes'])this.storyNotes['cafe.window-homes']=JSON.stringify(Object.fromEntries(rule.actorIds.map(id=>{const npc=this.npcs.get(id)!;return[id,{cell:npc.cell,facing:npc.facing}];})));
    this.storyNotes['cafe.window-focus']=window.id;this.storyNotes['cafe.window-phase']='walking';delete this.storyNotes['cafe.window-until'];this.progress[`distraction.${rule.id}`]=true;
    for(const pending of this.interactions)if(pending.kind==='proximity-check')pending.status='resolved';
    for(const id of rule.actorIds)this.sceneNpcRoutes.delete(id);return 'WINDOW_BROKEN';
  }
  private cafeWindowHomes(){
    const rule=this.campaign.proximityEncounter,homes:Record<string,{cell:Cell;facing:Facing}>={};
    if(!rule)return homes;
    let saved:Record<string,unknown>={};
    try{const value:unknown=JSON.parse(this.storyNotes['cafe.window-homes']??'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value as Record<string,unknown>;}catch{/* Legacy notes use authored seats. */}
    const facings:Facing[]=['north','north-east','east','south-east','south','south-west','west','north-west'];
    const scene=this.sceneById(rule.sceneId);
    for(const id of rule.actorIds){
      const actor=scene.stageActors?.find(actor=>actor.id===id);if(!actor)continue;
      const value=saved[id],point=value&&typeof value==='object'?value as {cell?:Cell;facing?:Facing}:null;
      const cell=point?.cell&&Number.isSafeInteger(point.cell.col)&&Number.isSafeInteger(point.cell.row)&&this.walkableAt(rule.sceneId,scene.surfaceId,point.cell)?point.cell:actor.cell;
      homes[id]={cell:cloneCell(cell),facing:point?.facing&&facings.includes(point.facing)?point.facing:actor.facing??'north'};
    }
    return homes;
  }
  jumpThroughSceneWindow(characterId:string,windowId:string){
    if(this.conditionsFor(characterId).some(condition=>condition==='inconsciente'||condition==='paralizada'))return 'INCAPACITATED';
    const character=this.characters.get(characterId),window=this.campaign.sceneWindows?.find(window=>window.id===windowId),prop=window?this.objectsFor(window.sceneId).find(prop=>prop.id===window.id):null;
    if(!character||!window||!prop||character.sceneId!==window.sceneId||character.step||character.hp<=0||this.combat.active)return 'TOO_FAR';
    if(prop.structure!=='destroyed'&&(!isDoor(prop)||prop.state!=='open'))return 'WINDOW_CLOSED';
    const near=(cell:Cell)=>Math.max(Math.abs(character.cell.col-cell.col),Math.abs(character.cell.row-cell.row))<=1;
    const target=near(window.inside)?window.outside:near(window.outside)?window.inside:null;
    if(!target)return 'TOO_FAR';
    const strength=character.sheet?.strengthScore;if(strength===undefined)return 'STRENGTH_REQUIRED';
    // The sill can be climbed with arms: allow a controlled vault, not an
    // unrestricted long jump through solid walls. DM resolves difficult vaults.
    if(jumpDistances(strength).highJumpFeet*.3048+1.1<window.sillMeters)return 'WINDOW_TOO_HIGH';
    if(this.occupiedByActor(character.sceneId,character.surfaceId,target,characterId))return 'OCCUPIED_CELL';
    if(!this.walkableAt(character.sceneId,character.surfaceId,target)||this.publicObjectProps(character.sceneId).some(prop=>prop.structure!=='destroyed'&&(prop.kind!=='door'||prop.state!=='open')&&footprintFor(prop.cell,prop.rotation,prop.footprint).some(cell=>sameCell(cell,target))))return 'BLOCKED_CELL';
    this.clearSeat(characterId);const from=cloneCell(character.cell);character.cell=cloneCell(target);character.step={from,to:cloneCell(target),startedAt:Date.now(),durationMs:1000,movementKind:'jump'};character.moving=true;character.input.held=null;this.revision++;this.stateRevision++;return 'JUMP_COMPLETED';
  }

  checkSceneProximity(characterId: string, from?: Cell) {
    const rule=this.campaign.proximityEncounter,character=this.characters.get(characterId);
    if(!rule||!character||character.sceneId!==rule.sceneId||character.hp<=0||this.combat.active||this.progress[`distraction.${rule.id}`])return;
    const scene=this.sceneForCharacter(character),grid=scene.grid,meters=scene.terrain?.tileMeters??1.5;
    const origin=grid.worldOrigin??{x:0,z:0};
    const point=(cell:Cell)=>({x:origin.x+(cell.col+.5)*meters,z:origin.z+(cell.row+.5)*meters});
    const a=point(from??character.cell),b=point(character.cell),dx=b.x-a.x,dz=b.z-a.z;
    for(const id of rule.actorIds){
      const npc=this.npcs.get(id);if(!npc?.visible||npc.hp<=0||npc.surfaceId!==character.surfaceId)continue;
      const authored=scene.stageActors?.find(actor=>actor.id===id&&sameCell(actor.cell,npc.cell));
      const p=authored?.seatedAt??point(npc.cell),flag=`proximity.${rule.id}.${characterId}.${id}`;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
      const distance=Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
      if(distance>=rule.radiusMeters){delete this.progress[flag];continue;}
      if(this.progress[flag]||this.interactions.some(request=>request.status==='pending'&&request.kind==='proximity-check'&&request.characterId===characterId&&request.targetId===id))continue;
      if(this.interactions.filter(request=>request.status==='pending').length>=200)break;
      this.interactions.push({id:crypto.randomUUID(),characterId,characterLabel:character.label,targetId:id,targetLabel:npc.label,kind:'proximity-check',skill:rule.skill,dc:this.progress[`stealth.${characterId}`]?(rule.quietDc??rule.dc):rule.dc,createdAt:Date.now(),status:'pending',sceneId:character.sceneId,sceneEpoch:this.sceneEpoch,objectVersion:0,sessionToken:character.sessionToken??''});
      character.input.held=null;this.revision++;
    }
  }

  resolveSceneCheck(requestId:string,total:number|null) {
    const prayer=this.interactions.find(item=>item.id===requestId&&item.status==='pending'&&item.kind==='prayer');
    if(prayer){if(prayer.sceneEpoch!==this.sceneEpoch||prayer.sceneId!==this.sceneId)return 'REQUEST_STALE';prayer.status='resolved';if(total!==null&&total>0){this.storyNotes[`prayer.${prayer.characterId}.expiry`]=String(this.gameClockSnapshot().seconds+86400);this.progress[`prayer.${prayer.characterId}.inspiration`]=true;}this.revision++;this.stateRevision++;return total!==null&&total>0?'BLESSING_GRANTED':'CHECK_CANCELLED';}
    const request=this.interactions.find(item=>item.id===requestId&&item.status==='pending'&&item.kind==='proximity-check'),rule=this.campaign.proximityEncounter;
    if(!request||!rule||request.sceneEpoch!==this.sceneEpoch||request.sceneId!==this.sceneId)return 'REQUEST_STALE';
    const character=this.characters.get(request.characterId),npc=this.npcs.get(request.targetId);
    if(!character||character.sceneId!==rule.sceneId||!npc?.visible||npc.hp<=0)return 'REQUEST_STALE';
    request.status='resolved';this.revision++;this.stateRevision++;
    if(total===null)return 'CHECK_CANCELLED';
    this.progress[`proximity.${rule.id}.${character.id}.${npc.id}`]=true;
    if(total>=(request.dc??rule.dc))return 'CHECK_PASSED';
    this.progress[`disturbed.${rule.id}.${npc.id}`]=true;
    const disturbed=rule.actorIds.filter(id=>this.progress[`disturbed.${rule.id}.${id}`]);
    if(disturbed.length>=rule.failuresBeforeCombat){
      for(const id of rule.actorIds){const actor=this.npcs.get(id);if(actor?.visible&&actor.hp>0)actor.combatEnabled=true;}
      for(const pending of this.interactions)if(pending.kind==='proximity-check')pending.status='resolved';
      this.startCombat();return 'ENCOUNTER_ALERTED';
    }
    return 'CLIENT_DISTURBED';
  }

  private sceneNpcRoute(id:string,goal:Cell) {
    const npc=this.npcs.get(id);if(!npc)return [];
    const scene=this.sceneById(npc.sceneId);if(!scene.terrain)return [];
    const queue=[npc.cell],parent=new Map<string,Cell|null>([[cellKey(npc.cell),null]]),props=this.publicObjectProps(npc.sceneId);
    for(let i=0;i<queue.length;i++){
      const current=queue[i]!;if(sameCell(current,goal))break;
      for(const neighbor of surfaceNeighbors(scene.terrain,{surfaceId:npc.surfaceId,cell:current})){
        if(neighbor.surfaceId!==npc.surfaceId||parent.has(cellKey(neighbor.cell))||this.occupiedByActor(npc.sceneId,npc.surfaceId,neighbor.cell,id)||props.some(prop=>prop.structure!=='destroyed'&&(prop.kind!=='door'||prop.state!=='open')&&footprintFor(prop.cell,prop.rotation,prop.footprint).some(cell=>sameCell(cell,neighbor.cell))))continue;
        parent.set(cellKey(neighbor.cell),current);queue.push(neighbor.cell);
      }
    }
    if(!parent.has(cellKey(goal)))return [];
    const result:Cell[]=[];let cursor:Cell|null=goal;
    while(cursor&&!sameCell(cursor,npc.cell)){result.unshift(cursor);cursor=parent.get(cellKey(cursor))??null;}
    return result;
  }

  scareSceneAnimal(characterId:string) {
    const rule=this.campaign.proximityEncounter,character=this.characters.get(characterId),distraction=rule?.distraction;
    if(!rule||!distraction||!character||character.sceneId!==rule.sceneId||character.hp<=0||character.step||this.combat.active)return 'TOO_FAR';
    const animal=this.npcs.get(distraction.actorId);if(!animal?.visible||animal.surfaceId!==character.surfaceId||Math.max(Math.abs(animal.cell.col-character.cell.col),Math.abs(animal.cell.row-character.cell.row))>1)return 'TOO_FAR';
    if(this.progress[`distraction.${rule.id}`])return 'ALREADY_ALERTED';
    const door=this.objectsFor(rule.sceneId).find(prop=>prop.id===distraction.entranceDoorId);
    if(door&&isDoor(door)&&door.structure!=='destroyed'&&door.state!=='open')this.commitObject(door,{state:door.state},{state:'open'},'Los clientes salen a comprobar el ruido',rule.sceneId);
    this.progress[`distraction.${rule.id}`]=true;
    for(const pending of this.interactions)if(pending.kind==='proximity-check')pending.status='resolved';
    for(const [i,id] of rule.actorIds.entries())this.sceneNpcRoutes.set(id,this.sceneNpcRoute(id,distraction.destinations[i]!));
    this.revision++;this.stateRevision++;return 'ANIMAL_STARTLED';
  }
  progress: Record<string, boolean> = {};
  storyNotes: Record<string, string> = {};

  resolveAdventureChoice(objectiveId: string, choiceId: string | null, note: string, override = false) {
    const definition = this.campaign.adventure, objective = definition?.objectives.find(item => item.id === objectiveId);
    if (!definition || !objective || choiceId && !objective.choices.some(choice => choice.id === choiceId)) return 'UNKNOWN_STORY_CHOICE';
    if (this.combat.active) return 'COMBAT_ACTIVE';
    if (choiceId && !objective.requires.every(id => this.progress[id]) && (!override || !note.trim())) return 'STORY_PREREQUISITES';
    const selected = objective.choices.find(choice => this.progress[choiceFlag(objective.id, choice.id)])?.id ?? null;
    if (selected === choiceId && Boolean(this.progress[objective.id]) === (choiceId !== null) && (this.storyNotes[objective.id] ?? '') === note.trim()) return 'APPLIED';
    for (const choice of objective.choices) this.progress[choiceFlag(objective.id, choice.id)] = choice.id === choiceId;
    this.progress[objective.id] = choiceId !== null; this.storyNotes[objective.id] = note.trim();
    // A changed decision invalidates the former conclusion, not the other objectives.
    for (const ending of definition.endings) { this.progress[ending.id] = false; this.progress[endingFlag(ending.id)] = false; delete this.storyNotes[`final.${ending.id}`]; }
    if (choiceId && this.campaign.encounter?.sceneId === objective.sceneId && this.creature) this.creature.visible = false;
    return 'APPLIED';
  }

  resolveAdventureEnding(endingId: string | null, reason: string, override = false) {
    const definition = this.campaign.adventure; if (!definition || endingId && !definition.endings.some(ending => ending.id === endingId)) return 'UNKNOWN_STORY_ENDING';
    if (this.combat.active) return 'COMBAT_ACTIVE';
    const view = adventureView(definition, this.progress, this.storyNotes);
    if (endingId && (!view.complete || !view.candidates.includes(endingId)) && (!override || !reason.trim())) return 'STORY_PREREQUISITES';
    if (endingId && view.candidates.length > 1 && !reason.trim()) return 'STORY_TIE_REASON';
    for (const ending of definition.endings) { this.progress[ending.id] = ending.id === endingId; this.progress[endingFlag(ending.id)] = ending.id === endingId; delete this.storyNotes[`final.${ending.id}`]; }
    if (endingId) this.storyNotes[`final.${endingId}`] = reason.trim();
    return 'APPLIED';
  }
  lastExplorationAction: DmState['lastExplorationAction'] = null;
  private objectScenes = new Map<SceneId, SceneObjectState>();

  private rowboat() { return this.campaign.public.campaignId === 'stormwreck-isle' ? this.npcs.get('wreck-rowboat') ?? null : null; }

  private seatFlag(characterId:string,seatId:string){return `seat.${characterId}.${seatId}`;}
  clearSeat(characterId:string){for(const key of Object.keys(this.progress))if(key.startsWith(`seat.${characterId}.`))delete this.progress[key];}
  seatFor(characterId:string){
    const character=this.characters.get(characterId);
    if(!character||character.step||this.combat.active||character.hp<=0)return null;
    return this.sceneForCharacter(character).seats?.find(seat=>seat.surfaceId===character.surfaceId&&sameCell(seat.cell,character.cell)&&this.progress[this.seatFlag(characterId,seat.id)])??null;
  }
  interactSeat(characterId:string,seatId:string):{ok:boolean;code:string}|null{
    const character=this.characters.get(characterId);if(!character)return {ok:false,code:'UNKNOWN_CHARACTER'};
    const seat=this.sceneForCharacter(character).seats?.find(seat=>seat.id===seatId);if(!seat)return null;
    if(this.combat.active||character.step||character.hp<=0||seat.surfaceId!==character.surfaceId||Math.max(Math.abs(seat.cell.col-character.cell.col),Math.abs(seat.cell.row-character.cell.row))>1)return {ok:false,code:'TOO_FAR'};
    if(this.seatFor(characterId)?.id===seat.id){this.clearSeat(characterId);this.revision++;this.stateRevision++;return {ok:true,code:'SEAT_LEFT'};}
    const reserved=seat.reservedActorId?this.npcs.get(seat.reservedActorId):null;
    if(reserved?.visible&&sameCell(reserved.cell,seat.cell))return {ok:false,code:'SEAT_OCCUPIED'};
    if(!sameCell(character.cell,seat.cell)){
      const horizontal=seat.cell.col===character.cell.col?'':seat.cell.col>character.cell.col?'east':'west',vertical=seat.cell.row===character.cell.row?'':seat.cell.row>character.cell.row?'south':'north';
      const facing=(vertical&&horizontal?`${vertical}-${horizontal}`:vertical||horizontal) as Facing,scene=this.sceneForCharacter(character);
      const destination=scene.terrain?this.terrainStepDestination(scene,character.surfaceId,character.cell,seat.cell):resolveStep(scene,character.cell,facing,this.publicObjectProps(character.sceneId))?{cell:seat.cell,surfaceId:seat.surfaceId}:null;
      if(!destination||destination.surfaceId!==seat.surfaceId||!sameCell(destination.cell,seat.cell))return {ok:false,code:'SEAT_BLOCKED'};
    }
    if(this.occupiedByActor(character.sceneId,seat.surfaceId,seat.cell,characterId))return {ok:false,code:'SEAT_OCCUPIED'};
    if(this.publicObjectProps(character.sceneId).some(prop=>prop.surfaceId===seat.surfaceId&&prop.structure!=='destroyed'&&(prop.kind!=='door'||prop.state!=='open')&&footprintFor(prop.cell,prop.rotation,prop.footprint).some(cell=>sameCell(cell,seat.cell))))return {ok:false,code:'SEAT_BLOCKED'};
    this.clearSeat(characterId);character.cell=cloneCell(seat.cell);character.facing=seat.facing;character.moving=false;character.input.held=null;
    this.progress[this.seatFlag(characterId,seat.id)]=true;this.revision++;this.stateRevision++;return {ok:true,code:'SEAT_TAKEN'};
  }
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
    this.gameClockSeconds = initialGameTimeSeconds(this.campaign.public.campaignId);
    this.gameClockAnchorMs = Date.now();
    for (const scene of this.campaign.public.scenes) this.climateStates.set(scene.id, emptyClimateState(this.gameClockSeconds));
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
      this.npcs.set(actor.id, { id: actor.id, identityId: profile?.identityId ?? actor.id, label: actor.label, tokenId: actor.tokenId, color: '#c69158', cell: cloneCell(actor.cell), surfaceId: actor.surfaceId ?? definition.surfaceId, sceneId: definition.id, facing: 'south', hp: profile?.maxHp ?? 10, maxHp: profile?.maxHp ?? 10, armorClass: profile?.armorClass ?? 10, speedMeters: profile?.speedMeters ?? 9, initiativeBonus: profile?.initiativeBonus ?? 0, attacks: combatActions(profile?.attacks ?? [{ id: 'basic-attack', label: 'Acción improvisada', attackBonus: 0, damageDice: '1d4', damageBonus: 0 }]), traits: structuredClone(profile?.traits ?? []), ruleTraits: structuredClone(profile?.ruleTraits ?? {}), damageResistances: [...(profile?.damageResistances ?? [])], damageImmunities: [...(profile?.damageImmunities ?? [])], conditionImmunities: [...(profile?.conditionImmunities ?? [])], combatEnabled: Boolean(profile) && (profile?.startsInCombat ?? true), visible: profile?.startsVisible ?? true, blocksMovement: this.campaign.public.campaignId === 'd8-night-private' });
    }
    for(const definition of this.campaign.public.scenes)for(const actor of definition.stageActors??[])if(actor.facing)this.npcs.get(actor.id)!.facing=actor.facing;
    for(const scene of this.campaign.public.scenes)for(const actor of scene.stageActors??[]){const npc=this.npcs.get(actor.id);if(npc&&actor.facing)npc.facing=actor.facing;}
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

  private gameClockRuns() { return !this.combat.active && !this.gameClockManuallyPaused && this.gameClockDecisionPauses.size === 0; }
  private gameClockSecondsAt(now = Date.now()) {
    return this.gameClockSeconds + (this.gameClockRuns() ? Math.max(0, now - this.gameClockAnchorMs) / 1_000 : 0);
  }
  private settleGameClock(now = Date.now()) {
    this.gameClockSeconds = this.gameClockSecondsAt(now);
    this.gameClockAnchorMs = now;
    return this.gameClockSeconds;
  }
  gameClockSnapshot(now = Date.now()): GameClockSnapshot {
    const pausedBy = this.gameClockManuallyPaused ? 'dm' as const : this.gameClockDecisionPauses.size ? 'decision' as const : null;
    const running = this.gameClockRuns();
    return { seconds: this.gameClockSecondsAt(now), serverTime: now, running,
      mode: this.combat.active ? 'combat' : running ? 'exploration' : 'paused', pauseReason: pausedBy };
  }
  private climateAt(sceneId: SceneId, gameSeconds = this.gameClockSecondsAt()) {
    return advanceClimate(this.climateStates.get(sceneId) ?? emptyClimateState(gameSeconds), this.environment, gameSeconds);
  }
  materializeClimates(gameSeconds = this.gameClockSecondsAt()) {
    for (const scene of this.campaign.public.scenes) this.climateStates.set(scene.id, this.climateAt(scene.id, gameSeconds));
  }
  applyEnvironmentChange(patch: WeatherChange) {
    const now = Date.now();
    this.settleGameClock(now); this.materializeClimates(this.gameClockSeconds);
    this.environment = resolveWeatherChange(this.environment, patch);
    if (patch.timeOfDay !== undefined) {
      if (patch.timeOfDay !== 'auto') this.gameClockSeconds = nextTimeOfDaySeconds(this.gameClockSeconds, patch.timeOfDay);
      this.environment.timeOfDay = 'auto'; this.gameClockAnchorMs = now;
    }
    this.applyWeatherAudio(now);
  }
  setClockDecisionPause(key: string, open: boolean, now = Date.now()) {
    this.settleGameClock(now);
    if (open) this.gameClockDecisionPauses.add(key); else this.gameClockDecisionPauses.delete(key);
    this.gameClockAnchorMs = now;
  }
  clearClockDecisionPauses(socketId: string, now = Date.now()) {
    const prefix = `${socketId}:`;
    if (![...this.gameClockDecisionPauses].some(key => key.startsWith(prefix))) return false;
    this.settleGameClock(now);
    for (const key of this.gameClockDecisionPauses) if (key.startsWith(prefix)) this.gameClockDecisionPauses.delete(key);
    this.gameClockAnchorMs = now;
    return true;
  }
  applyClockControl(action: 'pause' | 'resume' | 'advance' | 'set-time' | 'short-rest' | 'long-rest' | 'travel', value?: number | string) {
    const now = Date.now();
    this.settleGameClock(now);
    if (action === 'pause') this.gameClockManuallyPaused = true;
    else if (action === 'resume') this.gameClockManuallyPaused = false;
    else if (action === 'advance') this.gameClockSeconds += Number(value);
    else if (action === 'set-time') {
      // Preserve accumulated surfaces when setting an earlier hour. Otherwise
      // climate stays anchored in the future and freezes until that hour returns.
      this.materializeClimates(this.gameClockSeconds);
      this.gameClockSeconds = Math.floor(this.gameClockSeconds / SECONDS_PER_DAY) * SECONDS_PER_DAY + Number(value);
      this.environment.timeOfDay = 'auto';
      for (const [id, climate] of this.climateStates) this.climateStates.set(id, { ...climate, updatedAtGameSeconds: this.gameClockSeconds });
    }
    else if (action === 'short-rest') this.gameClockSeconds += SHORT_REST_SECONDS;
    else if (action === 'long-rest') this.gameClockSeconds += LONG_REST_SECONDS;
    else if (action === 'travel') {
      const port = this.campaign.ports?.find(candidate => candidate.id === value);
      if (!port?.travelSeconds) return false;
      this.gameClockSeconds += port.travelSeconds;
    }
    this.gameClockAnchorMs = now;
    return true;
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
      'c4-zombie-1': this.expandedWreckCell(11, 4),
      'c4-zombie-2': this.expandedWreckCell(10, 4),
      'c4-zombie-3': this.expandedWreckCell(11, 5)
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
    if (this.campaign.adventure && (flag.startsWith('story.') || this.campaign.adventure.objectives.some(item => item.id === flag) || this.campaign.adventure.endings.some(item => item.id === flag))) return 'USE_STORY_CONTROLS';
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
  private migrateStormwreckCabins(payload:DurablePayload){
    if(this.campaign.public.campaignId!=='stormwreck-isle'||(payload.wreckGridVersion??1)>=4)return;
    const roomAt=(cell:Cell)=>cell.col>=17&&cell.col<=24&&cell.row>=8&&cell.row<=19?'c4':cell.col>=32&&cell.col<=39&&cell.row>=8&&cell.row<=19?'c6':null;
    for(const saved of [...payload.characters,...(payload.npcs??[]),...(payload.creature?[payload.creature]:[])]){
      if((saved.sceneId??payload.sceneId)!=='wreck-ship')continue;
      const room=saved.surfaceId==='main'?roomAt(saved.cell):null;
      if(room)saved.cell=wreckCabinContentCell(`${room}-occupant`,saved.cell);
      else if(['lower-deck','hold-air'].includes(saved.surfaceId)&&saved.cell.col>=19&&saved.cell.col<=20&&saved.cell.row===10)saved.cell={...saved.cell,col:saved.cell.col-6};
    }
    for(const saved of payload.scenes.find(s=>s.sceneId==='wreck-ship')?.objects??[]){
      const definition=this.objectScenes.get('wreck-ship')?.objects.find(o=>o.id===saved.id);if(!definition)continue;
      if(saved.kind==='door'){saved.cell=cloneCell(definition.cell);continue;}
      if(sameCell(saved.cell,definition.cell))continue;
      if(/^c[4-7]-/.test(saved.id)&&(!saved.surfaceId||saved.surfaceId==='main')&&roomAt(saved.cell))saved.cell=wreckCabinContentCell(saved.id,saved.cell);
      if(saved.id==='c9-iron-chest'&&saved.surfaceId==='hold-air'&&saved.cell.col===21&&saved.cell.row===10)saved.cell=cloneCell(definition.cell);
    }
    // Cropped edges and legacy remaps can invalidate a *part* of a movable
    // object's footprint. Repair the whole footprint without resetting loot,
    // door, trap, attachment or damage states, then repair actors around it.
    const scene=this.sceneById('wreck-ship'),occupied=new Set<string>();
    const savedObjects=payload.scenes.find(s=>s.sceneId==='wreck-ship')?.objects??[];
    for(const saved of [...savedObjects].sort((a,b)=>Number(b.kind==='door')-Number(a.kind==='door'))){
      const definition=this.objectScenes.get('wreck-ship')?.objects.find(o=>o.id===saved.id);if(!definition)continue;
      const surfaceId=saved.surfaceId??definition.surfaceId;
      const legal=(cell:Cell)=>footprintFor(cell,saved.rotation,definition.baseFootprint).every(p=>this.walkableAt('wreck-ship',surfaceId,p)
        &&!occupied.has(`${surfaceId}:${cellKey(p)}`)&&!(surfaceId===scene.surfaceId&&scene.spawns.some(s=>sameCell(s,p))));
      if(!legal(saved.cell)){
        const candidates=scene.terrain?.surfaces.find(s=>s.id===surfaceId)?.tiles.map(t=>t.cell).sort((a,b)=>
          Math.abs(a.col-saved.cell.col)+Math.abs(a.row-saved.cell.row)-Math.abs(b.col-saved.cell.col)-Math.abs(b.row-saved.cell.row))??[];
        const next=candidates.find(legal);if(next)saved.cell=cloneCell(next);
      }
      for(const p of footprintFor(saved.cell,saved.rotation,definition.baseFootprint))occupied.add(`${surfaceId}:${cellKey(p)}`);
    }
    payload.wreckGridVersion=4;
  }
  private migrateStormwreckHelm(payload:DurablePayload){
    if(this.campaign.public.campaignId!=='stormwreck-isle'||(payload.wreckGridVersion??1)>=5)return;
    const saved=payload.scenes.find(s=>s.sceneId==='wreck-ship')?.objects.find(o=>o.id==='wheel');
    const wheel=this.objectScenes.get('wreck-ship')?.objects.find(o=>o.id==='wheel');
    // Preserve a detached wheel and all adventure states. Only its attached
    // mount moves to the canonical forward-looking station on the poop deck.
    if(saved?.kind==='wheel'&&saved.attachment==='attached'&&wheel?.kind==='wheel'){
      saved.cell=cloneCell(wheel.mount.cell);saved.rotation=wheel.rotation;
    }
    payload.wreckGridVersion=5;
  }
  private migrateStormwreckActorCells(payload: DurablePayload) {
    if (this.campaign.public.campaignId !== 'stormwreck-isle' && !this.campaign.public.scenes.some(scene=>scene.camp)) return;
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
  /** The compact hull can trim a formerly valid edge cell. Repair only
   * footprints that no longer exist, keeping every object state and legal
   * custom placement intact. Actors are repaired by the existing migration. */
  private migrateStormwreckCompactHull(payload:DurablePayload){
    if(this.campaign.public.campaignId!=='stormwreck-isle'||(payload.wreckGridVersion??1)>=6)return;
    const scene=this.sceneById('wreck-ship'),objects=payload.scenes.find(s=>s.sceneId==='wreck-ship')?.objects??[];
    const definitions=this.objectScenes.get('wreck-ship')?.objects??[];
    for(const saved of objects){
      const definition=definitions.find(o=>o.id===saved.id);if(!definition)continue;
      const surface=saved.surfaceId??definition.surfaceId;
      if(footprintFor(saved.cell,saved.rotation,definition.baseFootprint).every(c=>this.walkableAt('wreck-ship',surface,c)))continue;
      const occupied=new Set(objects.filter(o=>o.id!==saved.id).flatMap(o=>{const d=definitions.find(d=>d.id===o.id);return d&&(o.surfaceId??d.surfaceId)===surface?footprintFor(o.cell,o.rotation,d.baseFootprint).map(cellKey):[];}));
      const candidates=scene.terrain?.surfaces.find(s=>s.id===surface)?.tiles.map(t=>t.cell).sort((a,b)=>Math.abs(a.col-saved.cell.col)+Math.abs(a.row-saved.cell.row)-Math.abs(b.col-saved.cell.col)-Math.abs(b.row-saved.cell.row)||a.row-b.row||a.col-b.col)??[];
      const next=candidates.find(c=>footprintFor(c,saved.rotation,definition.baseFootprint).every(p=>this.walkableAt('wreck-ship',surface,p)&&!occupied.has(cellKey(p))&&!(surface===scene.surfaceId&&scene.spawns.some(s=>sameCell(s,p)))));
      if(next)saved.cell=cloneCell(next);
    }
    payload.wreckGridVersion=6;
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
    if (this.campaign.public.campaignId !== 'd8-night-private' || (payload.d8GridVersion ?? 1) >= 3) return false;
    const previousVersion = payload.d8GridVersion ?? 1;
    const legacySize = (sceneId: string) => sceneId === 'garden' ? { cols: 29, rows: 21 } : { cols: 32, rows: 21 };
    const remap = (sceneId: string, cell: Cell): Cell => {
      const definition = this.campaign.public.scenes.find(scene => scene.id === sceneId);
      if (!definition) return cloneCell(cell);
      // Road extensions do not enlarge the historical authoring rectangle.
      const baseRows=definition.grid.worldOrigin?Math.round(-2*definition.grid.worldOrigin.z/1.5):definition.grid.rows;
      // The expanded cave keeps the old origin. Its oldest 32-column saves
      // still map into the original 20 columns, never into the new fringe.
      const baseCols=sceneId==='mirror'&&definition.grid.worldOrigin?Math.round(-2*definition.grid.worldOrigin.x/1.5):definition.grid.cols;
      const old = legacySize(sceneId), target = previousVersion >= 2 ? cloneCell(cell) : {
        col: Math.max(0, Math.min(baseCols - 1, Math.floor((cell.col + .5) * baseCols / old.cols))),
        row: Math.max(0, Math.min(baseRows - 1, Math.floor((cell.row + .5) * baseRows / old.rows)))
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
      for (const object of saved.objects){const authored=definition.props.find(prop=>prop.id===object.id);object.cell=authored&&!authored.capabilities.transform?cloneCell(authored.cell):remap(saved.sceneId,object.cell);}
    }
    for (const character of payload.characters) character.cell = remap(character.sceneId ?? payload.sceneId, character.cell);
    for (const npc of payload.npcs ?? []) npc.cell = remap(npc.sceneId, npc.cell);
    if (payload.creature) payload.creature.cell = remap(payload.creature.sceneId, payload.creature.cell);
    payload.d8GridVersion = 3;
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
  private migrateAuthoredActorLayout(payload:DurablePayload){
    const layout=this.campaign.actorLayout;if(!layout||(payload.actorLayoutVersion??0)>=layout.version)return;
    payload.npcs??=[];const present=new Set(payload.npcs.map(npc=>npc.id));
    for(const npc of this.npcs.values())if(!present.has(npc.id))payload.npcs.push({id:npc.id,sceneId:npc.sceneId,surfaceId:npc.surfaceId,cell:cloneCell(npc.cell),facing:npc.facing,hp:npc.hp,maxHp:npc.maxHp,combatEnabled:npc.combatEnabled,visible:npc.visible});
    for(const correction of layout.corrections){
      const npc=payload.npcs.find(npc=>npc.id===correction.id&&npc.sceneId===correction.sceneId),authored=this.npcs.get(correction.id);
      if(!npc||!authored||npc.hp===0||!correction.previousCells.some(cell=>sameCell(cell,npc.cell)))continue;
      const occupied=payload.characters.some(character=>(character.sceneId??payload.sceneId)===npc.sceneId&&character.surfaceId===npc.surfaceId&&sameCell(character.cell,authored.cell));
      if(!occupied)npc.cell=cloneCell(authored.cell);
    }
    payload.actorLayoutVersion=layout.version;
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
  /** Add only campaign-authored objects that are absent from an otherwise
   * valid older save. Unknown or duplicated saved IDs remain invalid so an
   * object that was renamed or removed can never be silently discarded. */
  private migrateAddedCampaignObjects(payload: DurablePayload) {
    const expectedByScene = new Map([...this.objectScenes].map(([sceneId, state]) => [sceneId, new Set(state.objects.map(object => object.id))]));
    const needsDefaults = payload.scenes.some(savedScene => {
      const expected = expectedByScene.get(savedScene.sceneId);
      if (!expected) return false;
      const ids = savedScene.objects.map(object => object.id), saved = new Set(ids);
      return ids.length < expected.size && saved.size === ids.length && ids.every(id => expected.has(id));
    });
    if (!needsDefaults) return false;
    const defaultsByScene = new Map(new GameState(this.campaign).captureDurable().scenes.map(scene => [scene.sceneId, scene.objects]));
    let migrated = false;
    for (const savedScene of payload.scenes) {
      const expected = expectedByScene.get(savedScene.sceneId), defaults = defaultsByScene.get(savedScene.sceneId);
      if (!expected || !defaults) continue;
      const ids = savedScene.objects.map(object => object.id), present = new Set(ids);
      if (present.size !== ids.length || ids.some(id => !expected.has(id))) continue;
      for (const object of defaults) if (!present.has(object.id)) {
        savedScene.objects.push(structuredClone(object)); migrated = true;
      }
    }
    return migrated;
  }
  get objectRevision() { return this.currentObjectState().revision; }
  /** Only saves predating this passage need placement repair. Existing modern
   * states remain strict, including an invalid character placed inside ice. */
  private migrateEncounterPassage(payload:DurablePayload,raw:DurablePayload){
    const encounter=this.campaign.encounter,id=encounter?.defeatUnlockObjectId;if(!encounter||!id)return;
    if(raw.scenes.find(s=>s.sceneId===encounter.sceneId)?.objects.some(o=>o.id===id))return;
    const saved=payload.scenes.find(s=>s.sceneId===encounter.sceneId)?.objects.find(o=>o.id===id),definition=this.sceneById(encounter.sceneId).props.find(o=>o.id===id);
    if(!saved||saved.kind!=='door'||!definition)return;
    if(payload.creature?.hp===0&&(!encounter.mirrorPlayer||payload.creature.runtimeProfile?.mimicOfPlayerId)){saved.structure='destroyed';saved.state='open';return;}
    const blocked=new Set(footprintFor(saved.cell,saved.rotation,definition.baseFootprint).map(cellKey)),scene=this.sceneById(encounter.sceneId),hazards=new Set((scene.movementHazards??[]).flatMap(h=>h.cells.map(cellKey)));
    const actors=[...payload.characters.filter(c=>(c.sceneId??payload.sceneId)===encounter.sceneId),...(payload.npcs??[]).filter(c=>c.sceneId===encounter.sceneId),...(payload.creature?.sceneId===encounter.sceneId?[payload.creature]:[])];
    const occupied=new Set(actors.map(c=>cellKey(c.cell)));
    for(const actor of actors)if(blocked.has(cellKey(actor.cell))){const nearest=scene.walkable.filter(c=>!blocked.has(cellKey(c))&&!hazards.has(cellKey(c))&&!occupied.has(cellKey(c))).sort((a,b)=>Math.abs(a.col-actor.cell.col)+Math.abs(a.row-actor.cell.row)-Math.abs(b.col-actor.cell.col)-Math.abs(b.row-actor.cell.row))[0];if(nearest){occupied.delete(cellKey(actor.cell));actor.cell=cloneCell(nearest);occupied.add(cellKey(nearest));}}
  }
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
    if(character.hp<=0 || this.conditionsFor(character.id).includes('inconsciente') || this.conditionsFor(character.id).includes('paralizada')){character.moving=false;return false;}
    if(this.interactions.some(request=>request.characterId===character.id&&request.status==='pending'&&request.kind==='proximity-check')){character.input.held=null;character.moving=false;return false;}
    const scene = this.sceneForCharacter(character);
    if (!scene.movementEnabled) { character.moving = false; return false; }
    if (this.progress[this.rowboatFlag(character.id)] && this.rowboatPassengers().includes(character))
      return this.startRowboatStep(character, facing, now);
    const offset = ({ north: [0, -1], 'north-east': [1, -1], east: [1, 0], 'south-east': [1, 1], south: [0, 1], 'south-west': [-1, 1], west: [-1, 0], 'north-west': [-1, -1] } as const)[facing];
    const props = this.publicObjectProps(character.sceneId);
    const horizontal = offset[0] > 0 ? 'east' : 'west', vertical = offset[1] > 0 ? 'south' : 'north';
    // With the ship's 45° camera, one WASD key requests a diagonal grid step.
    // Beside a wall, slide along a free cardinal neighbor instead of sticking.
    const candidateFacings: Facing[] = (scene.id === 'wreck-ship' || this.campaign.public.campaignId === 'd8-night-private') && offset[0] && offset[1]
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
      const occupied = this.occupiedByActor(character.sceneId, destination.surfaceId, destination.cell, character.id);
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
    this.clearSeat(character.id);
    const from = cloneCell(character.cell);
    this.recordRoadApproach(character,from,next);
    character.cell = cloneCell(next);
    character.step = { from, to: cloneCell(next), fromSurfaceId: character.surfaceId, toSurfaceId: nextSurfaceId, startedAt: now, durationMs: this.progress[`stealth.${character.id}`]?STEP_DURATION_MS*1.5:STEP_DURATION_MS };
    character.moving = true; this.spendMovement(character.id, movementCost); this.revision++; this.stateRevision++;
    this.applyMovementHazard(character.id);
    this.checkSceneProximity(character.id,from);
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
      return { ...entity, initiative: this.combat.initiative[id] ?? 0, initiativeSubmitted: Boolean(this.combat.initiativeSubmitted[id]), active: !this.combatantCannotTakeTurn(id), conditions: [...this.conditionsFor(id)] };
    });
  }
  private endCombatIfSideDefeated(finalEvent?: InternalCombatEvent, endingText?: string) {
    if (!this.combat.active || this.combat.pending) return false;
    const hasPlayers = this.combat.participantIds.some(id => {
      const entity = this.combatEntity(id);
      return entity?.controller === 'player' && (entity.hp > 0 ? !this.conditionsFor(id).includes('inconsciente') : entity.deathSaves.failures < 3);
    });
    const hasOpponents = this.combat.participantIds.some(id => {
      const entity = this.combatEntity(id);
      return entity?.controller === 'dm' && entity.hp > 0 && !this.conditionsFor(id).includes('inconsciente');
    });
    if (hasPlayers && hasOpponents) return false;
    const text = !hasOpponents && hasPlayers
      ? 'No quedan combatientes enemigos en pie. El combate termina.'
      : hasOpponents && !hasPlayers
        ? 'El grupo ya no puede continuar. El combate termina.'
        : 'El combate termina: no quedan combatientes capaces de continuar.';
    this.endCombat(endingText ?? text, finalEvent);
    return true;
  }
  private animationFor(action: CombatAction): CombatEvent['animation'] {
    return combatActionVisualState(action, visualAnimationType(action));
  }
  private setCombatEvent(text: string, kind: CombatEvent['kind'], publicText = text, visual: Pick<CombatEvent, 'actorId' | 'targetId' | 'animation' | 'reactionAnimation'> = {}) {
    this.combat.lastEvent = { id: crypto.randomUUID(), text, publicText, kind, ...visual };
  }
  private startConcentration(entityId: string, actionId: string, label: string) {
    this.endConcentration(entityId);
    this.concentration[entityId] = { actionId, label };
  }
  private endConcentration(entityId: string) {
    delete this.concentration[entityId];
    this.visualEffects = this.visualEffects.filter(effect => effect.ownerId !== entityId || !effect.concentration);
  }
  stopConcentration(entityId: string) {
    if (!this.concentration[entityId]) return false;
    this.endConcentration(entityId); return true;
  }
  private activeVisualEffects(now = Date.now()) {
    return this.visualEffects.filter(effect => effect.visual.expiresAt > now &&
      (!effect.concentration || this.concentration[effect.ownerId]?.actionId === effect.actionId));
  }
  private recordVisualEffect(ownerId: string, actionId: string, cell: Cell, concentration = false, entityId?: string) {
    const cue = actionVisualEffect(actionId), owner = this.characters.get(ownerId) ?? this.npcs.get(ownerId) ?? (this.creature?.id === ownerId ? this.creature : null);
    if (!cue || !owner) return;
    const now = Date.now();
    this.visualEffects = this.activeVisualEffects(now).slice(-199);
    this.visualEffects.push({ ownerId, actionId, concentration, visual: {
      id: crypto.randomUUID(), type: cue.type, sceneId: owner.sceneId, surfaceId: owner.surfaceId,
      cell: cloneCell(cell), radiusMeters: cue.radiusMeters, startedAt: now, expiresAt: now + cue.durationMs,
      ...(entityId ? { entityId } : {})
    } });
  }
  private isSlottedSpell(action: CombatAction) { return Boolean(action.magical && action.resource?.id.startsWith('spell-slot'));
  }
  private combatTurnKey() { return `${this.combat.round}:${this.currentCombatId() ?? '-'}`; }
  private spellSlotAvailable(entityId: string, action: CombatAction) {
    return !this.isSlottedSpell(action) || this.combat.spellSlotUsedTurn[entityId] !== this.combatTurnKey();
  }
  private movementCost(sceneId: SceneId, surfaceId: string, cell: Cell) {
    const scene = this.sceneById(sceneId);
    const base = scene.terrain?.surfaces.find(surface => surface.id === surfaceId)?.tiles.find(tile => sameCell(tile.cell, cell))?.movementCost ?? (scene.difficultCells?.some(candidate => sameCell(candidate, cell)) ? 2 : 1);
    const covered=Boolean(scene.camp&&(scene.id==='camp-a1-rooms'?A1_ROOM_CELL_KEYS.has(`${cell.col},${cell.row}`):scene.camp.interactionPoints.some(p=>p.kind==='tent'&&p.objectCell&&Math.abs(cell.col-p.objectCell.col)<=2&&Math.abs(cell.row-p.objectCell.row)<=2)));
    return base===1&&!covered&&this.environment.snowDifficultTerrain&&this.climateAt(sceneId).snowDepthCm>=15?2:base;
  }
  private terrainStepDestination(scene: SceneDefinition, surfaceId: string, from: Cell, to: Cell) {
    if(surfaceId===scene.surfaceId&&(this.campaign.movementDoorEdges??[]).some(barrier=>barrier.sceneId===scene.id&&barrier.edges.some(edge=>sameCell(edge.from,from)&&sameCell(edge.to,to)||sameCell(edge.from,to)&&sameCell(edge.to,from))&&this.objectsFor(scene.id).some(prop=>prop.id===barrier.propId&&isDoor(prop)&&prop.structure!=='destroyed'&&prop.state!=='open')))return null;
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
    // Authored narrow passages carry physical cardinal paths. A diagonal input
    // uses the existing cardinal fallback, avoiding a shortcut through furniture.
    if(scene.terrain.edgePaths?.length)return null;
    const horizontal = { col: to.col, row: from.row }, vertical = { col: from.col, row: to.row };
    // A diagonal may pass a single blocked/missing corner when its other
    // orthogonal route is clear. Requiring both routes made small curved
    // surfaces (notably the crow's nest around the mast) reject the intended
    // WASD direction, after which startStep silently slid the actor sideways.
    const horizontalRoute = connected(from, horizontal) && connected(horizontal, to);
    const verticalRoute = connected(from, vertical) && connected(vertical, to);
    if (scene.renderer === 'babylon-d8' ? horizontalRoute && verticalRoute : horizontalRoute || verticalRoute) return { surfaceId, cell: to };
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
  /** DM placement is instantaneous and does not run movement, attacks or hazards. */
  placeEntity(entityId:string,sceneId:SceneId,surfaceId:string,cell:Cell) {
    const character=this.characters.get(entityId),npc=this.npcs.get(entityId);
    const entity=character??npc??(this.creature?.id===entityId?this.creature:null);
    if(!entity)return 'UNKNOWN_ENTITY';
    if(npc?.id==='wreck-rowboat'&&this.rowboatPassengers().length)return 'ENTITY_ABOARD_ROWBOAT';
    if(!this.hasScene(sceneId))return 'UNKNOWN_SCENE';
    if(this.combat.pending)return 'ROLL_PENDING';
    if(sceneId==='wreck-ship'&&this.progress['wreck.curse-day-after'])return 'WRECK_DISAPPEARED';
    if(!Number.isInteger(cell.col)||!Number.isInteger(cell.row)||!this.walkableAt(sceneId,surfaceId,cell))return 'BLOCKED_CELL';
    const props=this.publicObjectProps(sceneId);
    if(props.some(prop=>prop.surfaceId===surfaceId&&prop.structure!=='destroyed'&&(prop.kind!=='door'||prop.state!=='open')&&footprintFor(prop.cell,prop.rotation,prop.footprint).some(c=>sameCell(c,cell))))return 'BLOCKED_CELL';
    if(this.occupiedByActor(sceneId,surfaceId,cell,entityId)||[...this.characters.values()].some(actor=>actor.id!==entityId&&actor.sceneId===sceneId&&this.occupiesAddress(actor,surfaceId,cell)))return 'OCCUPIED_CELL';
    if(entity.sceneId!==sceneId&&this.combat.active&&this.combat.participantIds.includes(entityId))this.withdrawCombatant(entityId);
    if(character){
      this.cancelPlannedJump(entityId);this.walkingRunUp.delete(entityId);this.clearSeat(entityId);this.cancelInteractionsForCharacter(entityId);
      character.step=null;character.moving=false;character.input.held=null;character.input.updatedAt=Date.now();
      this.progress[this.rowboatFlag(entityId)]=false;this.progress[this.rowboatPilotFlag(entityId)]=false;
      for(const key of Object.keys(this.progress))if(key.startsWith('road.'+entityId+'.'))delete this.progress[key];
    }
    if(npc){npc.step=null;this.sceneNpcRoutes.delete(entityId);}
    entity.sceneId=sceneId;entity.surfaceId=surfaceId;entity.cell=cloneCell(cell);
    this.revision++;this.stateRevision++;return 'PLACED';
  }

  moveEntityOneSquare(entityId: string, destination: Cell) {
    const character = this.characters.get(entityId);
    const creature = this.creature?.id === entityId && this.creature.visible && this.creature.hp > 0 ? this.creature : null;
    const npc = this.npcs.get(entityId)?.visible && (this.npcs.get(entityId)?.hp ?? 0) > 0 ? this.npcs.get(entityId)! : null;
    const entity = character ?? creature ?? npc;
    if (!entity) return 'UNKNOWN_ENTITY';
    const rescue = entity.hp <= 0;
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
    if (!rescue && !this.canSpendMovement(entityId, terrainCost)) return 'MOVEMENT_SPENT';
    if (scene.terrain ? !this.walkableAt(entitySceneId, destinationSurfaceId, destination)
      || this.publicObjectProps(entitySceneId).some(prop => prop.surfaceId === destinationSurfaceId && prop.structure !== 'destroyed' && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(cell => sameCell(cell, destination)))
      : !isWalkable(scene, destination, this.publicObjectProps(entitySceneId))) return 'BLOCKED_CELL';
    const occupied = this.occupiedByActor(entitySceneId, destinationSurfaceId, destination, entityId);
    if (occupied) return 'OCCUPIED_CELL';
    if (!rescue && this.combat.pending) return 'ROLL_PENDING';
    if (!rescue && this.queueOpportunityMovement(entityId, destination, destinationSurfaceId)) return 'REACTION_PENDING';
    this.commitGridMove(entityId, destination, destinationSurfaceId);
    return 'MOVED';
  }

  private commitGridMove(entityId: string, destination: Cell, destinationSurfaceId?: string) {
    const character = this.characters.get(entityId);
    const creature = this.creature?.id === entityId ? this.creature : null;
    const npc = this.npcs.get(entityId) ?? null;
    const entity = character ?? creature ?? npc;
    if (!entity) return false;
    const previousCell=cloneCell(entity.cell);
    const facing = directionFromVector(destination.col - entity.cell.col, destination.row - entity.cell.row) ?? entity.facing ?? 'north';
    if (character) {
      if (character.step) return false;
      this.cancelInteractionsForCharacter(character.id); this.clearSeat(character.id); character.facing = facing; character.input.held = null;
      const from = cloneCell(character.cell); this.recordRoadApproach(character,from,destination);character.cell = cloneCell(destination); character.step = { from, to: cloneCell(destination), fromSurfaceId: character.surfaceId, toSurfaceId: destinationSurfaceId ?? character.surfaceId, startedAt: Date.now(), durationMs: STEP_DURATION_MS }; character.moving = true;
    } else if (npc) { npc.cell = cloneCell(destination); npc.surfaceId = destinationSurfaceId ?? npc.surfaceId; npc.facing = facing; }
    else if (creature) { creature.cell = cloneCell(destination); creature.surfaceId = destinationSurfaceId ?? creature.surfaceId; }
    const sceneId = character?.sceneId ?? creature?.sceneId ?? npc!.sceneId;
    if(entity.hp>0)this.spendMovement(entityId, this.movementCost(sceneId, destinationSurfaceId ?? entity.surfaceId, destination)); this.revision++; this.stateRevision++;
    this.applyMovementHazard(entityId);
    if(character)this.checkSceneProximity(entityId,previousCell);
    return true;
  }

  private applyMovementHazard(entityId: string) {
    const entity = this.characters.get(entityId) ?? this.npcs.get(entityId) ?? (this.creature?.id === entityId ? this.creature : undefined);
    if(!entity||entity.hp<=0)return;
    const hazard=this.sceneById(entity.sceneId).movementHazards?.find(h=>h.cells.some(cell=>sameCell(cell,entity.cell)));
    if(!hazard)return;
    this.applyHitPoints(entityId,-entity.hp);
    const player=this.characters.get(entityId);
    if(player){player.input.held=null;player.moving=false;player.deathSaves={successes:0,failures:3,stable:false};}
    this.setCombatEvent(`${entity.label}: ${hazard.label}.`, 'defeat', `${entity.label} cae a través del hielo fino.`, {targetId:entityId,animation:'fall'});
    this.endCombatIfSideDefeated(this.combat.lastEvent??undefined);
  }

  private recordRoadApproach(character:CharacterState,from:Cell,to:Cell){
    for(const port of this.campaign.ports??[]){
      if(!port.minimumApproachSteps)continue;
      const origin=port.from.mapId===character.sceneId?port.from:port.to.mapId===character.sceneId?port.to:null;
      if(!origin)continue;
      const key=`road.${character.id}.${port.id}.`,distance=(c:Cell)=>Math.abs(c.col-origin.cell.col)+Math.abs(c.row-origin.cell.row);
      const previous=Array.from({length:port.minimumApproachSteps},(_,i)=>this.progress[key+(i+1)]).filter(Boolean).length;
      for(let i=1;i<=port.minimumApproachSteps;i++)delete this.progress[key+i];
      if(distance(from)<=7&&distance(to)<distance(from))for(let i=1;i<=Math.min(port.minimumApproachSteps,previous+1);i++)this.progress[key+i]=true;
    }
  }

  private publicDefeatState(id: string, hp: number) {
    const style = hp <= 0 ? 'blood' as const : this.conditionsFor(id).includes('inconsciente') ? 'unconscious' as const : undefined;
    return { defeated: Boolean(style), ...(style ? { defeatStyle: style } : {}) };
  }

  publicSnapshot(redactCombat = false, viewSceneId: SceneId = this.sceneId, viewSurfaceId?: string, includeUnclaimed=false): WorldSnapshot {
    const now = Date.now(), gameClock = this.gameClockSnapshot(now);
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
    const entities: PublicEntity[] = [...this.characters.values()].filter(character => (includeUnclaimed || Boolean(character.sessionToken) || character.hp <= 0 || this.conditionsFor(character.id).includes('inconsciente')) && character.sceneId === viewSceneId && remainsInScene(character.sceneId, character.surfaceId) && visibleSurface(character.surfaceId, character.step)).map(character => ({
      id: character.id, kind: 'player', label: character.label, sceneId: character.sceneId, cell: cloneCell(character.cell), surfaceId: character.surfaceId,
      facing: character.facing, moving: character.moving, step: character.step ? structuredClone(character.step) : null, color: character.color, tokenId: character.tokenId, conditions: [...this.conditionsFor(character.id)],
      carriedLightRadiusMeters: carriedLightRadiusMeters(character.inventory),
      stealth:Boolean(this.progress[`stealth.${character.id}`]),
      ...(character.sceneId==='wreck-ship' && (character.surfaceId==='sea'||character.surfaceId==='hold-air'||character.step?.movementKind==='dive')
        ? {waterMovement:this.progress[this.rowboatFlag(character.id)]?'rowboat' as const:character.surfaceId==='hold-air'||character.step?.movementKind==='dive'?'dive' as const:'swim' as const}:{}),
      ...(this.seatFor(character.id)?{seatId:this.seatFor(character.id)!.id}:{}),
      ...(!redactCombat && this.combat.active && this.combat.participantIds.includes(character.id) ? { hp: character.hp, maxHp: character.maxHp } : {}), ...this.publicDefeatState(character.id, character.hp)
    }));
    if (this.creature && (includeUnclaimed||this.creature.visible) && this.creature.sceneId === viewSceneId && remainsInScene(this.creature.sceneId, this.creature.surfaceId) && visibleSurface(this.creature.surfaceId)) entities.push({
      id: this.creature.id, kind: 'creature',...(includeUnclaimed&&!this.creature.visible?{dmHidden:true}:{}), label: this.creature.label, sceneId: this.creature.sceneId, cell: cloneCell(this.creature.cell), surfaceId: this.creature.surfaceId,
      facing: this.creature.facing, moving: false, step: null, color: this.creature.color, tokenId: this.creature.tokenId, conditions: [...this.conditionsFor(this.creature.id)],
      ...(!redactCombat && this.combat.active && this.combat.participantIds.includes(this.creature.id) ? { hp: this.creature.hp, maxHp: this.creature.maxHp } : {}), ...this.publicDefeatState(this.creature.id, this.creature.hp)
    });
    // The rowboat floats beside C1: it must remain visible from the open-air
    // decks even though its authoritative movement surface is `sea`.
    const visibleNpcSurface = (npc: NpcState) => visibleSurface(npc.surfaceId, npc.step)
      || (npc.id === 'wreck-rowboat' && viewSceneId === 'wreck-ship'
        && ['main', 'c1-hull', 'c2', 'c3', 'crow'].includes(viewSurfaceId ?? ''));
    for (const npc of this.npcs.values()) if ((includeUnclaimed||npc.visible) && npc.sceneId === viewSceneId && remainsInScene(npc.sceneId, npc.surfaceId) && visibleNpcSurface(npc)) entities.push({
      id: npc.id, kind: 'npc',...(includeUnclaimed&&!npc.visible?{dmHidden:true}:{}), label: npc.label, sceneId: npc.sceneId, cell: cloneCell(npc.cell), surfaceId: npc.surfaceId, facing: npc.facing, moving: Boolean(npc.step), step: npc.step ? structuredClone(npc.step) : null, color: npc.color, tokenId: npc.tokenId, conditions: [...this.conditionsFor(npc.id)],
      ...(!redactCombat && this.combat.active && this.combat.participantIds.includes(npc.id) ? { hp: npc.hp, maxHp: npc.maxHp } : {}), ...this.publicDefeatState(npc.id, npc.hp)
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
    const eventEntityVisible = (id: string | undefined) => {
      if (!id || visibleIds.has(id)) return true;
      // The defeated creature has already left the tactical map. Its final
      // hit still belongs to this audience, provided it was revealed here.
      const entity = this.creature?.id === id ? this.creature : this.npcs.get(id);
      return this.combat.lastEvent?.kind === 'defeat' && entity?.visible === true && entity.hp === 0
        && entity.sceneId === viewSceneId && remainsInScene(entity.sceneId, entity.surfaceId) && visibleSurface(entity.surfaceId);
    };
    const visibleEvent = this.combat.lastEvent && (!redactCombat || (eventEntityVisible(this.combat.lastEvent.actorId) && eventEntityVisible(this.combat.lastEvent.targetId))) ? this.combat.lastEvent : null;
    return {
      v: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, revision: this.revision, serverTime: now, gameClock, sceneId: viewSceneId, scene: authorizedScene, sceneEpoch: this.sceneEpoch, runtimeEpoch: this.runtimeEpoch,
      entities, tokenAssets, props, collectedPickups: (viewScene.pickups ?? []).filter(pickup => remainsInScene(viewSceneId, pickup.surfaceId) && (viewSurfaceId === undefined || pickup.surfaceId === viewSurfaceId) && this.pickupAvailable(viewSceneId, pickup) && this.progress[`pickup.${pickup.id}`]).map(pickup => pickup.id), camera: { mode: this.camera.mode, focusId: publicFocus }, environment: { ...this.environment }, climate: this.climateAt(viewSceneId, gameClock.seconds),
      story: { wreckDisappeared, ...(this.campaign.public.campaignId === 'd8-night-private' && ['temple','cafe','market','garden','dinner'].includes(viewSceneId) && this.campaign.adventure?.endings.some(ending => this.progress[endingFlag(ending.id)]) ? { d8TimeLoopBroken: true, ...(['temple','dinner'].includes(viewSceneId) ? { d8EndingVisual: this.progress[endingFlag('ending3')] ? 'darkness' as const : this.progress[endingFlag('ending2')] ? 'solitude' as const : 'celebration' as const } : {}) } : {}) },
      ...(viewSceneId==='dragon-rest'?{retreat:{winchLowered:Boolean(this.progress['retreat.winch.lowered'])}}:{}),
      visualEffects: this.activeVisualEffects().filter(effect => effect.visual.sceneId === viewSceneId &&
        (viewSurfaceId === undefined || effect.visual.surfaceId === viewSurfaceId) &&
        (!effect.visual.entityId || visibleIds.has(effect.visual.entityId))).map(effect => structuredClone(effect.visual)),
      campRest: this.campStateFor(viewSceneId),
      // La CA es el número público que el jugador necesita superar al atacar.
      combat: { active: this.combat.active && (!redactCombat || visibleParticipants.length > 0), round: this.combat.round, currentId: visibleCurrentId, movement: movement && (!redactCombat || visibleIds.has(movement.actorId)) ? movement : null, participants: visibleParticipants.map(participant => redactCombat ? { ...participant, hp: 0, maxHp: 0, armorClass: participant.controller === 'player' ? participant.armorClass : 0, speedMeters: 0, attacks: [] } : participant), order: visibleOrder, lastEvent: visibleEvent ? { id: visibleEvent.id, kind: visibleEvent.kind, text: redactCombat ? visibleEvent.publicText : visibleEvent.text, actorId: visibleEvent.actorId, targetId: visibleEvent.targetId, animation: visibleEvent.animation, reactionAnimation: visibleEvent.reactionAnimation } : null }
    };
  }

  private campStateFor(sceneId: string): CampRestState | null {
    if (this.campRest?.sceneId === sceneId) return structuredClone(this.campRest);
    const interactions = this.campActivities.get(sceneId);
    return interactions ? { sceneId, phase: null, paused: false, outcome: null, interruptions: [], interactions: structuredClone(interactions) } : null;
  }

  applyCampRestCommand(command: Extract<DmCommand, { type: 'camp:rest' }>): CommandResult {
    if (command.sceneId !== this.sceneId || command.sceneEpoch !== this.sceneEpoch) return { commandId: command.commandId, ok: false, code: 'STALE_SCENE' };
    const scene = this.currentScene(), camp = scene.camp;
    if (!camp) return { commandId: command.commandId, ok: false, code: 'CAMP_FEATURE_UNAVAILABLE' };
    const prior = this.campRest;
    const activeElsewhere = Boolean(prior && prior.sceneId !== scene.id && prior.phase !== null && prior.phase !== 'finalization');
    if (activeElsewhere) return { commandId: command.commandId, ok: false, code: 'REST_ACTIVE_ELSEWHERE' };

    if (command.action === 'set-night') {
      if (prior) this.campActivities.set(prior.sceneId, structuredClone(prior.interactions));
      const sameSceneRest = prior?.sceneId === scene.id ? prior : null;
      this.campRest = {
        sceneId: scene.id, phase: 'night', paused: Boolean(sameSceneRest && sameSceneRest.phase !== null && sameSceneRest.phase !== 'finalization' && sameSceneRest.paused), outcome: null,
        interruptions: sameSceneRest && sameSceneRest.phase !== null && sameSceneRest.phase !== 'finalization' ? structuredClone(sameSceneRest.interruptions) : [],
        interactions: this.campStateFor(scene.id)?.interactions ?? []
      };
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }

    if (command.action === 'prepare') {
      if (prior?.sceneId === scene.id && prior.phase !== null && prior.phase !== 'finalization') return { commandId: command.commandId, ok: false, code: 'REST_ALREADY_ACTIVE' };
      if (prior) this.campActivities.set(prior.sceneId, structuredClone(prior.interactions));
      const interactions = this.campStateFor(scene.id)?.interactions ?? [];
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
      // The DM confirms the completed rest; benefits remain a table decision.
      if (command.completed) this.applyClockControl('long-rest');
      return { commandId: command.commandId, ok: true, code: 'APPLIED' };
    }
    return { commandId: command.commandId, ok: false, code: 'INVALID_CAMP_ACTION' };
  }

  applyCampPlayerInteraction(characterId: string, pointId: string, activityId?: string) {
    const scene = this.currentScene(), camp = scene.camp, character = this.characters.get(characterId);
    if (!camp || !character || character.sceneId !== scene.id) return { ok: false as const, code: 'CAMP_FEATURE_UNAVAILABLE' };
    const point = camp.interactionPoints.find(candidate => candidate.id === pointId);
    if (!point || character.step || character.moving || !campPointInReach(character, point))
      return { ok: false as const, code: 'CAMP_INTERACTION_OUT_OF_REACH' };
    if (this.combat.active) return { ok: false as const, code: 'IN_COMBAT' };
    if (character.hp <= 0 || this.conditionsFor(character.id).some(condition => ['inconsciente', 'paralizada'].includes(condition)))
      return { ok: false as const, code: 'CANNOT_ACT' };
    if (point.ownerCharacterId && point.ownerCharacterId !== character.id) return { ok: false as const, code: 'CAMP_INTERACTION_NOT_YOURS' };
    const available = activitiesForCampPoint(point), activity = activityId ? available.find(item => item.id === activityId) : available[0];
    if (!activity) return { ok: false as const, code: 'CAMP_ACTIVITY_UNAVAILABLE' };
    const prior = this.campRest;
    let seatLeft = false;
    if (point.kind === 'seat') {
      const result = this.interactSeat(characterId, point.id);
      if (!result?.ok) return { ok: false as const, code: result?.code ?? 'SEAT_UNAVAILABLE' };
      seatLeft = result.code === 'SEAT_LEFT';
    }
    const state = prior?.sceneId === scene.id ? prior : this.campStateFor(scene.id) ?? { sceneId: scene.id, phase: null, paused: false, outcome: null, interruptions: [], interactions: [] };
    const previous = [...state.interactions].reverse().find(item => item.pointId === point.id && (item.action === 'opened' || item.action === 'closed'))?.action;
    const action = activity.id === 'chest-toggle' ? previous === 'opened' ? 'closed' as const : 'opened' as const : 'used' as const;
    if (point.kind !== 'seat') {
      const object = point.objectCell ?? point.cell, dc = object.col - character.cell.col, dr = object.row - character.cell.row;
      if (dc || dr) character.facing = directionFromVector(dc, dr) ?? character.facing;
    }
    state.interactions.push({ pointId: point.id, pointLabel: point.label, characterId: character.id, characterLabel: character.label, at: Date.now(), action, activityId: activity.id });
    // The bounded activity feed is also the existing chest-state source.
    // Keep each chest's latest open/close record when other actions fill it.
    const chestStates = new Map<string, (typeof state.interactions)[number]>();
    for (const entry of state.interactions) if (entry.action === 'opened' || entry.action === 'closed') chestStates.set(entry.pointId, entry);
    const protectedEntries = new Set([...chestStates.values()].slice(-30));
    const recentBudget = 30 - protectedEntries.size;
    const recentEntries = new Set(recentBudget ? state.interactions.filter(entry => !protectedEntries.has(entry)).slice(-recentBudget) : []);
    state.interactions = state.interactions.filter(entry => protectedEntries.has(entry) || recentEntries.has(entry));
    this.campActivities.set(scene.id, structuredClone(state.interactions));
    // Using a different camp must neither cancel nor overwrite an active rest.
    if (!prior || prior.sceneId === scene.id) this.campRest = state;
    this.revision++; this.stateRevision++;
    const detail = action === 'opened' ? 'abres' : action === 'closed' ? 'cierras' : 'usas';
    const notice = activity.id === 'chest-toggle'
      ? `${detail} ${point.label}. ${point.description} El baúl no modifica automáticamente tu mochila.`
      : point.kind === 'seat' ? `${seatLeft ? 'Te levantas de' : 'Te sientas en'} ${point.label}.` : `${activity.label} · ${point.label}. ${activity.guidance}`;
    return { ok: true as const, code: 'CAMP_INTERACTED', point, action, activity, notice };
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

  private dmObjects(sceneId=this.sceneId): DmObject[] {
    if (sceneId === 'wreck-ship' && this.campaign.public.campaignId === 'stormwreck-isle' && this.progress['wreck.curse-day-after']) return [];
    return this.objectsFor(sceneId).map(object => {
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
    if (this.combat.active || !character || character.hp <= 0 || character.step || this.conditionsFor(character.id).some(c=>c==='inconsciente'||c==='paralizada')) return null;
    const scene=this.sceneForCharacter(character);
    return this.campaign.stageActorInteractions?.find(interaction => {
      const npc = this.npcs.get(interaction.targetId);
      if(!npc||npc.sceneId!==character.sceneId||!npc.visible||npc.hp<=0||this.conditionsFor(npc.id).includes('inconsciente'))return false;
      const site=interaction.siteAnchor===true&&scene.stageActors?.some(a=>a.id===interaction.targetId&&a.interactionOnly===true);
      return interaction.sceneId === character.sceneId && (site||npc.surfaceId === character.surfaceId)
        && character.surfaceId === (interaction.surfaceId ?? scene.surfaceId)
        && interaction.cells.some(cell => sameCell(cell, character.cell));
    }) ?? null;
  }

  /** Choices come from authored manual ports at the character's real location. */
  manualJourneyOptions(characterId:string,targetId:string):Array<{portId:string;direction:'forward'|'return'}>{
    const character=this.characters.get(characterId);
    if(!character?.sessionToken||!character.socketId||character.hp<=0||character.step||this.combat.active||this.conditionsFor(characterId).some(c=>c==='inconsciente'||c==='paralizada'))return [];
    const remembered=(this.campaign.ports??[]).filter(p=>p.rememberReturn&&this.progress[journeyReturnKey(characterId,p.id)]);
    return (this.campaign.ports??[]).flatMap((port):Array<{portId:string;direction:'forward'|'return'}>=>{
      if(port.autoDirection!=='manual'||port.return!=='adjudicated')return [];
      const authoredPoint=port.interactionTargetId||this.campaign.public.scenes.find(s=>s.id===port.from.mapId)?.stageActors?.some(a=>a.id===port.id&&a.interactionOnly);
      if(!authoredPoint)return [];
      const matches=(a:typeof port.from)=>a.mapId===character.sceneId&&a.surfaceId===character.surfaceId&&sameCell(a.cell,character.cell);
      if(targetId==='manual-journey-return'&&matches(port.to)){
        if(port.rememberReturn&&remembered.length&&!remembered.some(p=>p.id===port.id))return [];
        return [{portId:port.id,direction:'return' as const}];
      }
      if(targetId===(port.interactionTargetId??port.id)&&matches(port.from)&&this.stageActorInteractionFor(characterId,targetId))return [{portId:port.id,direction:'forward' as const}];
      return [];
    });
  }

  requestManualJourney(characterId:string,targetId:string){
    const character=this.characters.get(characterId),options=this.manualJourneyOptions(characterId,targetId);
    if(!character||!options.length)return 'TOO_FAR';
    if(this.interactions.some(r=>r.characterId===characterId&&r.kind==='journey'&&r.status==='pending'))return 'INTERACTION_PENDING';
    this.interactions=this.interactions.filter(r=>r.status==='pending'||Date.now()-r.createdAt<600_000);
    if(this.interactions.length>=200)return 'INTERACTION_LIMIT';
    this.interactions.push({id:crypto.randomUUID(),characterId,characterLabel:character.label,targetId,createdAt:Date.now(),status:'pending',kind:'journey',journeyOptions:options,
      targetLabel:targetId==='manual-journey-return'?'Preparar el regreso':'Preparar la continuación del viaje',sceneId:character.sceneId,sceneEpoch:this.sceneEpoch,objectVersion:0,sessionToken:character.sessionToken!});
    this.revision++;return 'REQUESTED';
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
    if (!character || character.hp <= 0 || this.conditionsFor(character.id).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return [];
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
        && footprintFor(object.cell,object.rotation,object.baseFootprint).some(cell=>Math.max(Math.abs(cell.col-character.cell.col),Math.abs(cell.row-character.cell.row))<=1))
      .map(door => ({ targetId: door.id, label: door.interaction?.barrier === 'barred'
        ? `Retirar listón · ${door.label}` : door.state === 'open' ? `Cerrar · ${door.label}` : `Abrir · ${door.label}` })) : [];
    return [
      ...(this.campaign.proximityEncounter?.distraction&&character&&!character.step&&!this.combat.active&&!this.progress[`distraction.${this.campaign.proximityEncounter.id}`]&&this.campaign.proximityEncounter.sceneId===character.sceneId&&(()=>{const animal=this.npcs.get(this.campaign.proximityEncounter!.distraction!.actorId);return animal?.visible&&animal.surfaceId===character.surfaceId&&Math.max(Math.abs(animal.cell.col-character.cell.col),Math.abs(animal.cell.row-character.cell.row))<=1;})()?[{targetId:'scene-animal-distraction',label:'Espantar al caballo'}]:[]),
      ...(rowboat ? [rowboat] : []),
      ...(character&&this.manualJourneyOptions(character.id,'manual-journey-return').length?[{targetId:'manual-journey-return',label:'Solicitar regreso',cell:cloneCell(character.cell),surfaceId:character.surfaceId}]:[]),
      ...(character&&!character.step&&!this.combat.active?[
        ...(this.campaign.sceneWindows??[]).filter(window=>window.sceneId===character.sceneId&&Math.max(Math.abs(character.cell.col-window.cell.col),Math.abs(character.cell.row-window.cell.row))<=2).flatMap(window=>[{targetId:window.id+'.break',label:'Romper ventana',cell:window.cell,surfaceId:character.surfaceId},{targetId:window.id+'.vault',label:'Saltar por la ventana',cell:window.cell,surfaceId:character.surfaceId}]),
        ...(this.campaign.prayerShrine?.sceneId===character.sceneId&&Math.max(Math.abs(character.cell.col-this.campaign.prayerShrine.cell.col),Math.abs(character.cell.row-this.campaign.prayerShrine.cell.row))<=2?[{targetId:'temple-prayer',label:'Rezar a Sylvania',cell:this.campaign.prayerShrine.cell,surfaceId:character.surfaceId}]:[]),
        ...(this.blessingFor(character.id)?[{targetId:'temple-inspiration-spend',label:'Usar Inspiración · ventaja en un d20',cell:character.cell,surfaceId:character.surfaceId}]:[])
      ]:[]),
      ...(this.cofaClimbAvailable(character.id)?[{targetId:'P10',label:'Subir a la cofa · Atletismo CD 10 (DM)',cell:cloneCell(character.cell),surfaceId:character.surfaceId}]:[]),
      ...(this.cofaDescentAvailable(character.id)?[{targetId:'P10',label:'Bajar de la cofa · escalera de cuerda',cell:cloneCell(character.cell),surfaceId:character.surfaceId}]:[]),
      ...doors,
      ...pickups,
      ...(character&&!character.step&&!this.combat.active?(this.sceneForCharacter(character).readableSigns??[]).filter(sign=>Math.max(Math.abs(sign.cell.col-character.cell.col),Math.abs(sign.cell.row-character.cell.row))<=1).map(sign=>({targetId:sign.id,label:`Leer · ${sign.label}`})):[]),
      ...(stage ? [{ targetId: stage.targetId, label: stage.nearbyLabel,...(stage.siteAnchor&&character?{cell:cloneCell(character.cell),surfaceId:character.surfaceId}:{}) }] : []),
      ...(mirror ? [{ targetId: mirror.targetId, label: mirror.nearbyLabel }] : []),
      ...(nearWheel ? [{ targetId: config!.targetId, label: config!.nearbyLabel }] : []),
      ...(character&&!character.step&&!this.combat.active?(this.sceneForCharacter(character).seats??[]).filter(seat=>!this.sceneForCharacter(character).camp?.interactionPoints.some(point=>point.id===seat.id)&&(!seat.reservedActorId||!this.npcs.get(seat.reservedActorId)?.visible||!sameCell(this.npcs.get(seat.reservedActorId)!.cell,seat.cell))&&seat.surfaceId===character.surfaceId&&Math.max(Math.abs(seat.cell.col-character.cell.col),Math.abs(seat.cell.row-character.cell.row))<=1).map(seat=>({targetId:seat.id,label:`${this.seatFor(character.id)?.id===seat.id?'Levantarte':'Sentarte'} · ${seat.label}`})):[]),
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
      || !footprintFor(door.cell,door.rotation,door.baseFootprint).some(cell=>Math.max(Math.abs(character.cell.col-cell.col),Math.abs(character.cell.row-cell.row))<=1))
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
    const skillModifiers = character ? this.campaign.characters[character.id]?.skillModifiers : undefined;
    const sceneCheck=character&&this.interactions.find(request=>request.status==='pending'&&request.characterId===character.id&&request.kind==='proximity-check');
    notice??=sceneCheck?`${sceneCheck.skill} CD ${sceneCheck.dc}: pasas junto a ${sceneCheck.targetLabel}. Tira el dado físico e introduce el total en el panel; el DM lo confirma.`:undefined;
    const canAct = Boolean(character && character.hp > 0 && !this.conditionsFor(character.id).some(condition => condition === 'inconsciente' || condition === 'paralizada'));
    const interactions = this.nearbyInteractions(character);
    const nearbyInteraction = interactions[0] ?? null;
    const campScene = character ? this.sceneForCharacter(character) : null;
    const campInteractions = canAct && character && !this.combat.active && !character.step && !character.moving && campScene?.camp ? campScene.camp.interactionPoints
      .filter(point => (!point.ownerCharacterId || point.ownerCharacterId === character.id) && campPointInReach(character, point))
      .map(point => {
        const open = point.kind === 'chest' && [...(this.campStateFor(campScene.id)?.interactions ?? [])].reverse().find(item => item.pointId === point.id && (item.action === 'opened' || item.action === 'closed'))?.action === 'opened';
        const actionLabel = point.kind === 'chest' ? open ? `Cerrar ${point.label}` : `Abrir ${point.label}`
          : point.kind === 'tent' ? `Entrar · ${point.label}`
            : point.kind === 'bed' ? `Usar · ${point.label}`
              : point.kind === 'fire' ? 'Acercarte a la hoguera'
                : point.kind === 'seat' ? this.seatFor(character!.id)?.id === point.id ? 'Levantarte' : 'Sentarte'
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
      ...(skillModifiers ? { skillModifiers: { ...skillModifiers } } : {}),
      inventory: character ? [...character.inventory] : [], sheet: character?.sheet ? structuredClone(character.sheet) : null,
      conditions: character ? [...this.conditionsFor(character.id)] : [], conditionSources: character ? structuredClone(this.conditionSourcesFor(character.id)) : [], resources: character ? structuredClone(character.combat.resources) : {}, concentration: character ? structuredClone(this.concentration[character.id] ?? null) : null, deathSaves: character ? { ...character.deathSaves } : null,
      canInteract: Boolean(nearbyInteraction), nearbyInteraction: nearbyInteraction?.label ?? null,
      interactionTargetId: nearbyInteraction?.targetId ?? null,
      availableInteractions: interactions,
      ...(sceneCheck?{sceneCheck:{id:sceneCheck.id,skill:sceneCheck.skill,dc:sceneCheck.dc,targetLabel:sceneCheck.targetLabel,playerTotal:sceneCheck.playerTotal}}:{}),
      ...(character?{stealth:Boolean(this.progress[`stealth.${character.id}`]),blessing:this.blessingFor(character.id)}:{}),
      rowboat: character && this.rowboatPassengers().includes(character)
        ? { aboard: true, pilot: this.rowboatPilot()?.id === character.id } : null,
      campInteractions,
      explorationActions: canAct && character ? structuredClone(character.explorationActions) : [],
      explorationBasics: canAct && character ? [...character.explorationBasics] : [],
      explorationAttacks: canAct && character && !this.combat.active ? structuredClone(character.combat.attacks.filter(action => action.resolution !== 'guided')) : [],
      sceneMovementEnabled: character ? this.sceneForCharacter(character).movementEnabled : this.currentScene().movementEnabled, combat: playerCombat, ...(notice ? { notice } : {})
    };
  }

  dmState(viewSceneId=this.sceneId): DmState {
    const gameClock = this.gameClockSnapshot();
    const objectState = this.objectScenes.get(viewSceneId)!;
    return {
      runtimeEpoch: this.runtimeEpoch, tableSceneId:this.sceneId,
      campaignTitle: this.campaign.public.title, sceneId: viewSceneId, sceneEpoch: this.sceneEpoch, objectRevision: objectState.revision,
      ...(this.campaign.public.campaignId === 'd8-night-private' ? { animationAudit: [...this.characters.values()]
        .filter(character => character.sceneId === viewSceneId && Boolean(character.sessionToken))
        .map(character => ({ id: character.id, attacks: structuredClone(character.combat.attacks), explorationActions: structuredClone(character.explorationActions ?? []), explorationBasics: [...(character.explorationBasics ?? [])] })) } : {}),
      characters: [...this.characters.values()].map(character => ({
        id: character.id, label: character.label, archetype: character.archetype, color: character.color, tokenId: character.tokenId, conditions: [...this.conditionsFor(character.id)], conditionSources: structuredClone(this.conditionSourcesFor(character.id)),
        claimed: Boolean(character.sessionToken), connected: Boolean(character.socketId), hp: character.hp, maxHp: character.maxHp,
        session: Boolean(character.sessionToken), sceneId: character.sceneId, cell: cloneCell(character.cell), surfaceId: character.surfaceId, step: character.step ? structuredClone(character.step) : null, inventory: [...character.inventory], sheet: character.sheet ? structuredClone(character.sheet) : null, resources: structuredClone(character.combat.resources), concentration: structuredClone(this.concentration[character.id] ?? null), deathSaves: { ...character.deathSaves }
      })),
      creature: this.creature ? { id: this.creature.id, label: this.creature.label, visible: this.creature.visible, cell: cloneCell(this.creature.cell), surfaceId: this.creature.surfaceId, sceneId: this.creature.sceneId, hp: this.creature.hp, maxHp: this.creature.maxHp, armorClass: this.creature.armorClass, speedMeters: this.creature.speedMeters, traits: [...this.creature.traits], actions: [...this.creature.actions], conditions: [...this.conditionsFor(this.creature.id)], conditionSources: structuredClone(this.conditionSourcesFor(this.creature.id)) } : null,
      npcs: [...this.npcs.values()].filter(npc => npc.sceneId === viewSceneId).map(npc => ({ id: npc.id, label: npc.label, tokenId: npc.tokenId, color: npc.color, cell: cloneCell(npc.cell), surfaceId: npc.surfaceId, hp: npc.hp, maxHp: npc.maxHp, armorClass: npc.armorClass, speedMeters: npc.speedMeters, traits: [...npc.traits], attacks: structuredClone(npc.attacks), combatEnabled: npc.combatEnabled, visible: npc.visible, conditions: [...this.conditionsFor(npc.id)], conditionSources: structuredClone(this.conditionSourcesFor(npc.id)) })),
      combat: { sequences: structuredClone(this.combat.sequences), active: this.combat.active, round: this.combat.round, currentId: this.currentCombatId(), movement: this.combatMovement(), participants: this.combat.active ? this.combatParticipants() : [], lastEvent: this.combat.lastEvent, prompt: this.combatPromptFor('dm'), initiativePending: this.combat.initiativePending, initiativeSubmitted: { ...this.combat.initiativeSubmitted }, actionUsed: { ...this.combat.actionUsed }, bonusActionUsed: { ...this.combat.bonusActionUsed }, reactionUsed: { ...this.combat.reactionUsed }, concentration: structuredClone(this.concentration), recharge: structuredClone(this.combat.recharge), order: this.combat.order.map(id => {
        const entity = this.combatEntity(id); if (!entity) throw new Error('COMBAT_ENTITY_MISSING'); return { id, label: entity.label, kind: entity.kind };
      }) },
      privateNotes: { creature: this.campaign.encounter?.note ?? '', wheel: this.campaign.wheelInteraction?.note ?? '' },
      camera: { ...this.camera }, environment: { ...this.environment }, gameClock, climate: this.climateAt(viewSceneId, gameClock.seconds), campRest: this.campRest ? structuredClone(this.campRest) : null, campActivity: this.campStateFor(viewSceneId), audio: structuredClone(this.audio), projectorReady: this.projectorReady,
      interactions: this.interactions.map(({ id, characterId, characterLabel, targetId, createdAt, status, kind,skill,dc,targetLabel,playerTotal,journeyOptions }) => ({ id, characterId, characterLabel, targetId, createdAt, status,...(kind?{kind,skill,dc,targetLabel,playerTotal,journeyOptions}:{}) })), objects: this.dmObjects(viewSceneId),
      pickups: (this.sceneById(viewSceneId).pickups ?? []).map(pickup => ({ id: pickup.id, label: pickup.label, sceneId: viewSceneId, surfaceId: pickup.surfaceId, cell: pickup.cell, kind: pickup.kind, collected: Boolean(this.progress[`pickup.${pickup.id}`]), available: this.pickupAvailable(viewSceneId, pickup) })), progress: { ...this.progress },
      ...(this.campaign.adventure ? { adventure: adventureView(this.campaign.adventure, this.progress, this.storyNotes) } : {}),
      encounterGroups: (this.campaign.encounterGroups ?? []).map(group => ({ id: group.id, label: group.label, sceneId: group.sceneId, maximum: group.actorIds.length, visibleCount: group.actorIds.filter(id => this.npcs.get(id)?.visible).length })),
      ...(this.creature?.mimicOfPlayerId ? { mimicInstruction: { entityId: this.creature.id, sourceId: this.creature.mimicOfPlayerId, actionId: this.combat.turnActions[this.creature.mimicOfPlayerId]?.actionId ?? null, label: this.combat.turnActions[this.creature.mimicOfPlayerId]?.label ?? 'Espera a la acción del original. Sin acción posible: resolver excepción con el DM.' } } : {}),
      lastExplorationAction: this.lastExplorationAction && this.lastExplorationAction.sceneId === viewSceneId ? structuredClone(this.lastExplorationAction) : null,
      undo: { canUndo: objectState.undo.length > 0, label: objectState.undo.at(-1)?.label ?? null, entryId: objectState.undo.at(-1)?.entryId ?? null },
      gameUndo: { canUndo: false, label: null }, ports: structuredClone(this.campaign.ports ?? [])
    };
  }

  tick(_dt = 0) {
    this.unlockDefeatedEncounterPassage();
    const now = Date.now(), changedCharacters = new Set<string>();
    for (const [entityId, sources] of Object.entries(this.conditionSources)) for (const source of [...sources]) {
      if (source.expiresAt !== undefined && now >= source.expiresAt) {
        this.setCombatCondition(entityId, source.condition, false, source);
        this.revision++; this.stateRevision++; changedCharacters.add(entityId);
      }
    }
    for (const effect of this.visualEffects) if (effect.concentration && effect.visual.expiresAt <= now && this.concentration[effect.ownerId]?.actionId === effect.actionId) {
      this.endConcentration(effect.ownerId); this.revision++; this.stateRevision++; changedCharacters.add(effect.ownerId);
    }
    this.visualEffects = this.activeVisualEffects(now);
    const boat = this.rowboat();
    if (boat?.step && now >= boat.step.startedAt + boat.step.durationMs) boat.step = null;
    const encounter=this.campaign.proximityEncounter,distraction=encounter?.distraction;
    if(encounter&&distraction&&this.sceneId===encounter.sceneId){
      const window=this.campaign.sceneWindows?.find(window=>window.id===this.storyNotes['cafe.window-focus']);
      if(window&&!this.combat.active&&this.storyNotes['cafe.window-phase']==='watching'&&now>=Number(this.storyNotes['cafe.window-until'])){this.storyNotes['cafe.window-phase']='returning';for(const id of encounter.actorIds)this.sceneNpcRoutes.delete(id);this.stateRevision++;this.revision++;}
      const returning=Boolean(window&&this.storyNotes['cafe.window-phase']==='returning'),homes=window?this.cafeWindowHomes():{};
      const goals=!this.combat.active&&this.progress[`distraction.${encounter.id}`]?encounter.actorIds.map((id,i)=>({id,cell:returning?homes[id]?.cell:(window?.destinations??distraction.destinations)[i]!})):[];
      if(this.progress['cafe.horse-fleeing']&&this.campaign.animalFleeDestination)goals.push({id:distraction.actorId,cell:this.campaign.animalFleeDestination});
      for(const {id,cell:goal} of goals){
        const npc=this.npcs.get(id);if(!npc?.visible||npc.hp<=0||!goal)continue;
        if(npc.step){if(now<npc.step.startedAt+npc.step.durationMs)continue;npc.step=null;this.revision++;changedCharacters.add(id);}
        if(sameCell(npc.cell,goal)){if(window){const facing=returning?homes[id]?.facing:directionFromVector(window.cell.col-npc.cell.col,window.cell.row-npc.cell.row);if(facing&&npc.facing!==facing){npc.facing=facing;this.revision++;this.stateRevision++;changedCharacters.add(id);}}continue;}
        if(!this.sceneNpcRoutes.get(id)?.length)this.sceneNpcRoutes.set(id,this.sceneNpcRoute(id,goal));
        const route=this.sceneNpcRoutes.get(id),next=route?.[0];if(!next)continue;if(this.occupiedByActor(npc.sceneId,npc.surfaceId,next,id)){this.sceneNpcRoutes.delete(id);continue;}
        const resolved=this.terrainStepDestination(this.sceneById(npc.sceneId),npc.surfaceId,npc.cell,next);
        if(!resolved){this.sceneNpcRoutes.delete(id);continue;}
        const from=cloneCell(npc.cell);this.commitGridMove(id,next,resolved.surfaceId);
        npc.step={from,to:cloneCell(next),fromSurfaceId:npc.surfaceId,toSurfaceId:resolved.surfaceId,startedAt:now,durationMs:360};route!.shift();changedCharacters.add(id);
      }
      if(window&&!this.combat.active&&this.progress[`distraction.${encounter.id}`]&&(returning||this.storyNotes['cafe.window-phase']!=='watching')&&encounter.actorIds.every((id,i)=>{const npc=this.npcs.get(id),goal=returning?homes[id]?.cell:window.destinations[i];return npc&&goal&&!npc.step&&sameCell(npc.cell,goal);})){
        if(returning){this.progress[`distraction.${encounter.id}`]=false;for(const key of ['cafe.window-focus','cafe.window-phase','cafe.window-until','cafe.window-homes'])delete this.storyNotes[key];}
        else if(this.storyNotes['cafe.window-phase']!=='watching'){this.storyNotes['cafe.window-phase']='watching';this.storyNotes['cafe.window-until']=String(now+10_000);}
        this.stateRevision++;this.revision++;for(const id of encounter.actorIds)changedCharacters.add(id);
      }
    }
    for (const request of this.interactions) if (request.status === 'pending' && now - request.createdAt >= 120_000) { request.status = 'resolved'; changedCharacters.add(request.characterId); }
    for (const character of this.characters.values()) {
      const scene = this.sceneForCharacter(character);
      let nextStepAt=now;
      if (character.step && now >= character.step.startedAt + character.step.durationMs) {
        const completedStep = character.step;
        if (!completedStep.movementKind && character.hp > 0) {
          const previous = this.walkingRunUp.get(character.id), feet = Math.max(Math.abs(completedStep.to.col-completedStep.from.col),Math.abs(completedStep.to.row-completedStep.from.row))*5;
          const connected = previous?.facing === character.facing && now-previous.at < 2500 && previous.sceneId === character.sceneId
            && previous.surfaceId === character.surfaceId && sameCell(previous.cell,completedStep.from);
          this.walkingRunUp.set(character.id,{feet:connected ? previous!.feet+feet : feet,facing:character.facing,at:now,
            sceneId:character.sceneId,surfaceId:completedStep.toSurfaceId ?? character.surfaceId,cell:cloneCell(completedStep.to)});
        }
        nextStepAt=Math.max(now-100,completedStep.startedAt+completedStep.durationMs);
        const fromSceneId = character.sceneId, fromSurfaceId = character.surfaceId;
        character.surfaceId = completedStep.toSurfaceId ?? character.surfaceId;
        character.step = null; character.moving = false; this.revision++; changedCharacters.add(character.id);
        if (!this.plannedJumps.has(character.id) && (!completedStep.movementKind||completedStep.movementKind==='passage') && !this.progress[this.rowboatFlag(character.id)] && this.autoTraverseAfterStep(character, completedStep.to,completedStep.passage?.portId)) changedCharacters.add(character.id);
        this.observeWreckLocationChange(character, fromSceneId, fromSurfaceId);
      }
      if (!character.step && this.advancePlannedJump(character,nextStepAt)) changedCharacters.add(character.id);
      if (!character.step && character.socketId && scene.movementEnabled && character.input.held && now - character.input.updatedAt <= 650) {
        if (this.startStep(character, character.input.held, nextStepAt)) changedCharacters.add(character.id);
      }
      if (!character.socketId || now - character.input.updatedAt > 650 || !scene.movementEnabled) character.input.held = null;
    }
    return changedCharacters;
  }

  private beginPortDeparture(character:CharacterState,port:NonNullable<CampaignServerBundle['ports']>[number]){
    const walk=port.departureWalk;if(!walk||character.hp<=0)return false;
    character.step={from:cloneCell(character.cell),to:cloneCell(character.cell),fromSurfaceId:character.surfaceId,toSurfaceId:character.surfaceId,startedAt:Date.now(),durationMs:walk.durationMs,movementKind:'passage',passage:{portId:port.id,points:structuredClone(walk.points)}};
    character.moving=true;character.facing=port.id==='travel-pecio-boat'?'south':'north';character.input.held=null;
    this.cancelInteractionsForCharacter(character.id);this.revision++;return true;
  }
  private autoTraverseAfterStep(character: CharacterState, arrived: Cell,finishedDeparture?:string) {
    if (this.combat.active && this.campaign.public.campaignId === 'd8-night-private') return false;
    for (const port of this.campaign.ports ?? []) {
      if(finishedDeparture&&port.id!==finishedDeparture)continue;
      // Reuse manual traversal after its authorised departure animation. This
      // rechecks party occupancy; walking onto the berth never starts a trip.
      if(finishedDeparture===port.id&&port.autoDirection==='manual')return this.traversePort(character.id,port.id,'forward',true,undefined,true)==='MOVED';
      // Hatches/holes with adjudication and doors are not auto-portals: doors
      // are traversed by ordinary collision-aware movement when actually open.
      if (!['stairs', 'road', 'rope-ladder', 'rigging', 'swim'].includes(port.mode) || port.autoDirection === 'manual') continue;
      let destination: typeof port.from | null = null;
      if (character.sceneId === port.from.mapId && character.surfaceId === port.from.surfaceId && sameCell(arrived, port.from.cell)) destination = port.to;
      else if (character.sceneId === port.to.mapId && character.surfaceId === port.to.surfaceId
        && port.autoDirection !== 'forward' && (sameCell(arrived, port.to.cell) || sameCell(arrived, port.from.cell))) destination = port.from;
      if (!destination || !this.walkableAt(destination.mapId, destination.surfaceId, destination.cell)) continue;
      if(port.conditionId){const gate=this.objectsFor(port.from.mapId).find(o=>o.id===port.conditionId);if(!gate||!isDoor(gate)||gate.structure!=='destroyed'&&(gate.state!=='open'||gate.interaction?.barrier==='barred'))continue;}
      if(port.minimumApproachSteps&&!this.progress[`road.${character.id}.${port.id}.${port.minimumApproachSteps}`])continue;
      const occupied = this.occupiedByActor(destination.mapId, destination.surfaceId, destination.cell, character.id);
      if (occupied) return false;
      if(port.departureWalk&&character.sceneId===port.from.mapId&&!finishedDeparture)return this.beginPortDeparture(character,port);
      if (['rope-ladder','rigging','swim'].includes(port.mode) && character.sceneId === destination.mapId) {
        if(port.id==='P10'&&destination.surfaceId==='crow'&&this.progress['wreck.cofa-free-climb']!==true)continue;
        this.startClimb(character,destination.surfaceId,destination.cell,port.mode==='swim'?'dive':'climb');
        return true;
      }
      for(const key of Object.keys(this.progress))if(key.startsWith(`road.${character.id}.`))delete this.progress[key];
      this.clearSeat(character.id);character.sceneId = destination.mapId; character.surfaceId = destination.surfaceId; character.cell = cloneCell(destination.cell);
      this.progress[this.rowboatFlag(character.id)] = false;
      this.progress[this.rowboatPilotFlag(character.id)] = false;
      character.step = null; character.moving = false; character.input = { held: null, seq: -1, updatedAt: 0 };
      this.cancelInteractionsForCharacter(character.id); this.revision++; this.stateRevision++;
      if (this.campaign.public.campaignId === 'd8-night-private' && this.sceneId !== destination.mapId) {
        // The DM/projector follows the one-shot traveller, while each other
        // player's own scene and control remain independent.
        this.focusScene(destination.mapId);
        this.applySceneAudioProfile(destination.mapId);
      }
      return true;
    }
    return false;
  }

  changeScene(sceneId: SceneId) {
    if (!this.hasScene(sceneId)) return false;
    if (sceneId === 'wreck-ship' && this.campaign.public.campaignId === 'stormwreck-isle' && this.progress['wreck.curse-day-after']) return false;
    this.plannedJumps.clear(); this.walkingRunUp.clear();
    this.sceneId = sceneId; this.sceneEpoch++; this.interactions = []; this.camera.focusId = null; this.combat = emptyCombat();
    this.applySceneAudioProfile(sceneId);
    // Un paso repetido no debe seguir sonando al saltar a otro mapa.
    for (const track of Object.values(this.audio.sfxLoops)) { track.playing = false; track.startedAt = null; }
    if (this.creature) this.creature.visible = false;
    const scene = this.currentScene();
    [...this.characters.values()].forEach((character, index) => {
      for (const key of Object.keys(this.progress)) if (key.startsWith(`road.${character.id}.`)) delete this.progress[key];
      character.cell = cloneCell(scene.spawns[index] ?? scene.spawns[0]!); character.surfaceId = scene.surfaceId;
      this.clearSeat(character.id);character.sceneId = scene.id;
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

  traversePort(entityId: string, portId: string, direction: 'forward' | 'return', adjudicate = false, checkTotal?:number,completedDeparture=false) {
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
    if(port.id==='P10'&&direction==='forward'&&this.progress['wreck.cofa-free-climb']!==true){
      if(checkTotal===undefined)return 'COFA_CHECK_REQUIRED';
      if(checkTotal<10)return 'COFA_CHECK_FAILED';
    }
    if (!this.walkableAt(destination.mapId, destination.surfaceId, destination.cell)) return 'BLOCKED_CELL';
    const occupied = (cell: Cell) => this.occupiedByActor(destination.mapId, destination.surfaceId, cell, entityId);
    let landingCell = destination.cell;
    // Stage a manual party arrival on nearby real floor. The existing wreck
    // boat also accepts several adventurers without overlapping them.
    const partyArrival=port.id==='travel-pecio-boat'||Boolean(port.rememberReturn&&port.autoDirection==='manual'&&port.return==='adjudicated');
    const blockedLanding=(cell:Cell)=>this.publicObjectProps(destination.mapId).some(prop=>prop.surfaceId===destination.surfaceId&&prop.structure!=='destroyed'&&(prop.kind!=='door'||prop.state!=='open')&&footprintFor(prop.cell,prop.rotation,prop.footprint).some(p=>sameCell(p,cell)));
    if (partyArrival&&(occupied(landingCell)||blockedLanding(landingCell))) {
      const terrain = this.sceneById(destination.mapId).terrain;
      if (terrain) {
        const queue = [{ surfaceId: destination.surfaceId, cell: destination.cell }];
        const seen = new Set<string>();
        while (queue.length && seen.size < 64) {
          const current = queue.shift()!;
          const key = cellKey(current.cell);
          if (seen.has(key)) continue;
          seen.add(key);
          if (this.walkableAt(destination.mapId, destination.surfaceId, current.cell) && !occupied(current.cell)&&!blockedLanding(current.cell)) { landingCell = current.cell; break; }
          for (const next of surfaceNeighbors(terrain, current)) if (next.surfaceId === destination.surfaceId && !seen.has(cellKey(next.cell))) queue.push(next);
        }
      }
    }
    if (occupied(landingCell)) return 'OCCUPIED_CELL';
    if(partyArrival&&blockedLanding(landingCell))return 'BLOCKED_CELL';
    if(port.departureWalk&&direction==='forward'&&!completedDeparture)return this.beginPortDeparture(character,port)?'MOVED':'ENTITY_UNAVAILABLE';
    if (['rope-ladder','rigging','swim'].includes(port.mode) && character.sceneId === destination.mapId) {
      this.startClimb(character,destination.surfaceId,landingCell,port.mode==='swim'?'dive':'climb');
      return 'MOVED';
    }
    const fromSceneId = character.sceneId, fromSurfaceId = character.surfaceId;
    this.clearSeat(character.id);character.sceneId = destination.mapId; character.surfaceId = destination.surfaceId; character.cell = cloneCell(landingCell);
    if(port.rememberReturn){
      for(const route of this.campaign.ports??[])if(route.rememberReturn&&this.progress[journeyReturnKey(entityId,route.id)])this.progress[journeyReturnKey(entityId,route.id)]=false;
      if(direction==='forward')this.progress[journeyReturnKey(entityId,port.id)]=true;
    }
    this.progress[this.rowboatFlag(character.id)] = false;
    this.progress[this.rowboatPilotFlag(character.id)] = false;
    character.step = null; character.moving = false; character.input = { held: null, seq: -1, updatedAt: 0 };
    // La localización individual cambia; la época global de la mesa no.
    // Así los demás jugadores no pierden entrada al cruzar una conexión.
    this.cancelInteractionsForCharacter(character.id); this.revision++; this.stateRevision++;
    this.observeWreckLocationChange(character, fromSceneId, fromSurfaceId);
    return 'MOVED';
  }

  cofaClimbAvailable(characterId:string){
    const c=this.characters.get(characterId),port=this.campaign.ports?.find(p=>p.id==='P10');
    return Boolean(c&&port&&c.sceneId===port.from.mapId&&c.surfaceId===port.from.surfaceId&&sameCell(c.cell,port.from.cell)&&!c.step&&!this.combat.active&&c.hp>0&&!this.conditionsFor(c.id).some(s=>s==='inconsciente'||s==='paralizada'));
  }
  requestCofaClimb(characterId:string){
    const c=this.characters.get(characterId);
    if(c?.sessionToken&&c.socketId&&this.cofaDescentAvailable(characterId))return this.traversePort(characterId,'P10','return');
    if(!c?.sessionToken||!c.socketId||!this.cofaClimbAvailable(characterId))return 'TOO_FAR';
    if(this.interactions.some(r=>r.characterId===characterId&&r.targetId==='P10'&&r.status==='pending'))return 'REQUESTED';
    if(this.interactions.filter(r=>r.status==='pending').length>=200)return 'INTERACTION_LIMIT';
    this.interactions.push({id:crypto.randomUUID(),characterId,characterLabel:c.label,targetId:'P10',createdAt:Date.now(),status:'pending',sceneId:c.sceneId,sceneEpoch:this.sceneEpoch,objectVersion:0,sessionToken:c.sessionToken});
    this.revision++;return 'REQUESTED';
  }

  private cofaDescentAvailable(characterId:string){
    const c=this.characters.get(characterId),port=this.campaign.ports?.find(p=>p.id==='P10');
    return Boolean(c&&port&&c.sceneId===port.to.mapId&&c.surfaceId===port.to.surfaceId&&sameCell(c.cell,port.to.cell)&&!c.step&&!this.combat.active&&c.hp>0&&!this.conditionsFor(c.id).some(s=>s==='inconsciente'||s==='paralizada'));
  }

  private startClimb(character: CharacterState, surfaceId: string, cell: Cell,kind:'climb'|'dive'='climb') {
    const terrain = this.sceneForCharacter(character).terrain!;
    const from = cloneCell(character.cell), fromSurfaceId = character.surfaceId;
    const rise = Math.abs(surfaceHeight(terrain,{surfaceId,cell}) - surfaceHeight(terrain,{surfaceId:fromSurfaceId,cell:from}));
    this.clearSeat(character.id);
    this.progress[this.rowboatFlag(character.id)]=false;
    this.progress[this.rowboatPilotFlag(character.id)]=false;
    character.cell = cloneCell(cell);
    character.step = {from,to:cloneCell(cell),fromSurfaceId,toSurfaceId:surfaceId,startedAt:Date.now(),durationMs:Math.max(kind==='dive'?1800:STEP_DURATION_MS,Math.round(rise/1.5*1000)),movementKind:kind};
    character.moving=true;character.input={held:null,seq:-1,updatedAt:0};
    this.cancelInteractionsForCharacter(character.id);this.revision++;this.stateRevision++;
  }

  private applySceneAudioProfile(sceneId: SceneId, now = Date.now()) {
    const profile = this.campaign.public.audio.sceneProfiles?.[sceneId]; if (!profile) return;
    const apply = (track: AudioState['music'], target: { id: string; playing: boolean; volume: number }) => {
      track.assetId = target.id; track.playing = target.playing; track.volume = target.volume; track.offset = 0; track.startedAt = target.playing ? now : null; track.loop = true; track.rate = 1; track.repeats = 1;
    };
    apply(this.audio.music, profile.music);
    for (const channel of ['ocean', 'wind', 'wood', 'storm'] as const) apply(this.audio.layers[channel], profile.layers[channel]);
    this.applyWeatherAudio(now);
  }

  applyWeatherAudio(now=Date.now()) {
    const weather=this.environment, library=this.campaign.public.audio.library?.ambience??[];
    const kind=precipitationKind(weather),mode=weatherMode(weather),level=weather.precipitationLevel??2;
    const rain=library.find(t=>/(?:^|-)rain(?:-|$)/.test(t.id))??library.find(t=>/(?:^|-)storm$/.test(t.id));
    const thunder=library.find(t=>/loop-thunder/.test(t.id))??library.find(t=>/(?:^|-)storm$/.test(t.id));
    const tempest=library.find(t=>/(?:^|-)tempest$/.test(t.id));
    const coldWind=library.find(t=>/icy-wind|cliff-wind/.test(t.id));
    const wind=library.find(t=>/(?:^|-)wind$/.test(t.id))??coldWind;
    const apply=(track:AudioState['music'],assetId:string|undefined,volume:number)=>{
      if(!assetId)return;
      const changed=track.assetId!==assetId;if(changed){track.offset=0;track.assetId=assetId;}
      track.playing=volume>0;track.volume=volume;track.startedAt=track.playing?(changed?now:track.startedAt??now):null;track.loop=true;
    };
    // An explicit thunderstorm keeps its thunder loop, including across maps.
    // Plain rain uses the quiet rain loop with three audible intensities.
    if(mode==='storm')apply(this.audio.layers.storm,thunder?.id??rain?.id,[0,.25,.48,.68][level]!);
    else if(mode==='tempest')apply(this.audio.layers.storm,tempest?.id??thunder?.id??rain?.id,[0,.55,.75,.95][level]!);
    else if(kind==='snow')apply(this.audio.layers.storm,coldWind?.id??wind?.id,[0,.10,.18,.28][level]!);
    else if(weather.precipitation!==undefined)apply(this.audio.layers.storm,rain?.id,kind==='rain'?[0,.18,.42,.72][level]!:0);
    if(weather.windIntensity!==undefined) {
      const authored=this.campaign.public.audio.sceneProfiles?.[this.sceneId]?.layers.wind;
      if(weather.windIntensity===0&&authored?.playing&&authored.id!==wind?.id)apply(this.audio.layers.wind,authored.id,authored.volume);
      else apply(this.audio.layers.wind,wind?.id,weather.windIntensity*.65);
    }
    if(this.currentScene().camp&&this.currentScene().camp?.visualProfile!=='forest') {
      const profile=this.currentScene().camp!.visualProfile,strength=seaState(weather,profile==='wreck-beach'?.8:profile==='coastal-refuge'?.22:.35);
      const ocean=library.find(t=>/camp-wave-surge/.test(t.id))??library.find(t=>/ocean|surf|sea/.test(t.id));
      if(weather.seaIntensity!==undefined||weather.storm||weather.windIntensity!==undefined)apply(this.audio.layers.ocean,ocean?.id,.08+strength*(profile==='coastal-refuge'?.30:.65));
    }
  }

  private currentObjectState() { return this.objectScenes.get(this.sceneId)!; }
  private currentObjects() { return this.currentObjectState().objects; }
  public interactionObject(id: string) { return this.currentObjects().find(object => object.id === id) ?? null; }
  public interactionRequestValid(request: RuntimeInteraction) {
    const character = this.characters.get(request.characterId), object = this.interactionObject(request.targetId);
    if(request.kind==='journey'){
      const options=this.manualJourneyOptions(request.characterId,request.targetId);
      return Boolean(request.status==='pending'&&request.sceneEpoch===this.sceneEpoch&&character?.sceneId===request.sceneId&&character?.sessionToken===request.sessionToken&&character?.socketId&&request.journeyOptions?.length&&request.journeyOptions.every(o=>options.some(live=>live.portId===o.portId&&live.direction===o.direction)));
    }
    if(request.targetId==='P10')return Boolean(request.status==='pending'&&request.sceneId===this.sceneId&&request.sceneEpoch===this.sceneEpoch&&character?.sessionToken===request.sessionToken&&character?.socketId&&this.cofaClimbAvailable(request.characterId));
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
  private occupiesAddress(actor: { cell: Cell; surfaceId: string; step?: StepState | null }, surfaceId: string, cell: Cell) {
    const step = actor.step;
    if (!step) return actor.surfaceId === surfaceId && sameCell(actor.cell, cell);
    return (step.fromSurfaceId ?? actor.surfaceId) === surfaceId && sameCell(step.from, cell)
      || (step.toSurfaceId ?? actor.surfaceId) === surfaceId && sameCell(step.to, cell);
  }
  private occupiedByActor(sceneId: string, surfaceId: string, cell: Cell, exceptId?: string) {
    return [...this.characters.values()].some(character => character.id !== exceptId && Boolean(character.sessionToken)
      && character.hp > 0 && !this.conditionsFor(character.id).includes('inconsciente')
      && character.sceneId === sceneId && this.occupiesAddress(character, surfaceId, cell))
      || Boolean(this.creature && this.creature.id !== exceptId && this.creature.visible && this.creature.hp > 0 && !this.conditionsFor(this.creature.id).includes('inconsciente')
        && this.creature.sceneId === sceneId && this.occupiesAddress(this.creature, surfaceId, cell))
      || [...this.npcs.values()].some(npc => npc.id !== exceptId && npc.blocksMovement && npc.visible && npc.hp > 0 && !this.conditionsFor(npc.id).includes('inconsciente')
        && npc.sceneId === sceneId && this.occupiesAddress(npc, surfaceId, cell));
  }
  private actorReservations(surfaceId: string, sceneId = this.sceneId) {
    const occupied = new Set<string>();
    for (const character of this.characters.values()) {
      if (character.sceneId !== sceneId) continue;
      if (character.step) {
        if ((character.step.fromSurfaceId ?? character.surfaceId) === surfaceId) occupied.add(cellKey(character.step.from));
        if ((character.step.toSurfaceId ?? character.surfaceId) === surfaceId) occupied.add(cellKey(character.step.to));
      } else if (character.surfaceId === surfaceId) occupied.add(cellKey(character.cell));
    }
    if (this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === sceneId && this.creature.surfaceId === surfaceId) occupied.add(cellKey(this.creature.cell));
    for (const npc of this.npcs.values()) if (npc.visible && npc.hp > 0 && npc.sceneId === sceneId) {
      if (npc.step) {
        if ((npc.step.fromSurfaceId ?? npc.surfaceId) === surfaceId) occupied.add(cellKey(npc.step.from));
        if ((npc.step.toSurfaceId ?? npc.surfaceId) === surfaceId) occupied.add(cellKey(npc.step.to));
      } else if (npc.surfaceId === surfaceId) occupied.add(cellKey(npc.cell));
    }
    return occupied;
  }

  startCombat(openingAction?: { attackerId: string; targetId: string; actionId: string }) {
    if (this.combat.active) return false;
    const players = [...this.characters.values()].filter(character => Boolean(character.sessionToken) && character.sceneId === this.sceneId).map(character => character.id);
    const creature = this.creature?.visible && this.creature.hp > 0 && this.creature.sceneId === this.sceneId ? [this.creature.id] : [];
    const npcs = [...this.npcs.values()].filter(npc => npc.sceneId === this.sceneId && npc.visible && npc.combatEnabled).map(npc => npc.id);
    // Los PJ a 0 PG siguen participando para sus salvaciones de muerte.
    const participantIds = [...players, ...creature, ...npcs].filter(id => !this.combatantCannotTakeTurn(id));
    if (!participantIds.some(id => this.characters.has(id)) || participantIds.length < 2) return false;
    this.settleGameClock();
    // Las tiradas pertenecen a la mesa: el servidor sólo recibe el total que
    // cada participante ha tirado físicamente y nunca genera un d20 aquí.
    const initiative = Object.fromEntries(participantIds.map(id => [id, 0]));
    for(const id of participantIds)this.clearSeat(id);
    this.combat = { ...emptyCombat(), active: true, round: 0, order: [...participantIds], turnIndex: 0, initiative, initiativeSubmitted: {}, initiativePending: true, participantIds, openingAction: openingAction ?? null,
      recharge: Object.fromEntries(participantIds.map(id => [id, Object.fromEntries((this.combatEntity(id)?.attacks ?? []).filter(action => action.recharge).map(action => [action.id, true]))])) };
    this.syncConditionClocks();
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
    if (character.hp <= 0 || this.conditionsFor(characterId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
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
    this.recordVisualEffect(character.id, action.id, target.cell, Boolean(action.concentration), target.kind === 'living' ? targetId : undefined);
    return { ok: true as const, code: 'EXPLORATION_ACTION_DECLARED', action, target };
  }

  cancelPlannedJump(characterId: string) {
    if (this.plannedJumps.delete(characterId)) this.walkingRunUp.delete(characterId);
  }

  private jumpPreparationStepAllowed(character: CharacterState, from: Cell, to: Cell) {
    const scene = this.sceneForCharacter(character), surfaceId = character.surfaceId;
    if (!scene.movementEnabled || this.progress[this.rowboatFlag(character.id)]) return false;
    const props = this.publicObjectProps(character.sceneId);
    const safeCell = (cell: Cell) => this.walkableAt(scene.id,surfaceId,cell)
      && !this.occupiedByActor(scene.id,surfaceId,cell,character.id)
      && !props.some(prop => prop.surfaceId === surfaceId && prop.structure !== 'destroyed'
        && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell,prop.rotation,prop.footprint).some(p => sameCell(p,cell)))
      && !scene.movementHazards?.some(hazard => hazard.cells.some(p => sameCell(p,cell)))
      && !scene.terrain?.surfaces.find(surface => surface.id === surfaceId)?.tiles.some(tile => sameCell(tile.cell,cell) && tile.medium === 'water')
      && !this.campaign.ports?.some(port => port.from.mapId === scene.id && port.from.surfaceId === surfaceId && sameCell(port.from.cell,cell)
        || port.to.mapId === scene.id && port.to.surfaceId === surfaceId && sameCell(port.to.cell,cell));
    const dx = to.col - from.col, dy = to.row - from.row;
    if (Math.max(Math.abs(dx),Math.abs(dy)) !== 1 || !safeCell(from) || !safeCell(to)) return false;
    if (dx && dy && (!safeCell({col:from.col,row:to.row}) || !safeCell({col:to.col,row:from.row}))) return false;
    if (scene.effectWalls?.some(wall => segmentCrossesBox(from,to,wall))) return false;
    if (!scene.terrain) return Boolean(resolveStep(scene,from,directionFromVector(dx,dy)!,props));
    const destination = this.terrainStepDestination(scene,surfaceId,from,to);
    return destination?.surfaceId === surfaceId && sameCell(destination.cell,to)
      && Math.abs(surfaceHeight(scene.terrain,{surfaceId,cell:to})-surfaceHeight(scene.terrain,{surfaceId,cell:from})) <= .6;
  }

  private jumpLandingProblem(character: CharacterState, origin: Cell, target: Cell, running: boolean) {
    const strength = character.sheet?.strengthScore;
    if (strength === undefined) return 'STRENGTH_REQUIRED';
    const distances = jumpDistances(strength), feet = Math.max(Math.abs(target.col-origin.col),Math.abs(target.row-origin.row))*5;
    if (feet > (running ? distances.longJumpFeet : distances.standingLongJumpFeet)) return feet <= distances.longJumpFeet ? 'JUMP_NEEDS_RUN_UP' : 'JUMP_OUT_OF_RANGE';
    const scene = this.sceneForCharacter(character), terrain = scene.terrain;
    if (terrain) {
      const rise = surfaceHeight(terrain,{surfaceId:character.surfaceId,cell:target})-surfaceHeight(terrain,{surfaceId:character.surfaceId,cell:origin});
      if (rise > (running ? distances.highJumpFeet : distances.standingHighJumpFeet)*.3048+.01) return 'JUMP_TOO_HIGH';
      if (rise < -1.8) return 'FALL_ADJUDICATION_REQUIRED';
    }
    if (!feet || !scene.movementEnabled || !this.walkableAt(scene.id,character.surfaceId,target)
      || this.occupiedByActor(scene.id,character.surfaceId,target,character.id) || !this.clearLineOfEffect(character.id,target,origin)
      || this.publicObjectProps(scene.id).some(prop => prop.surfaceId === character.surfaceId && prop.structure !== 'destroyed'
        && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell,prop.rotation,prop.footprint).some(cell => sameCell(cell,target)))) return 'JUMP_BLOCKED';
    return null;
  }

  private launchCharacterJump(character: CharacterState, target: Cell, now: number) {
    this.cancelPlannedJump(character.id); this.walkingRunUp.delete(character.id);
    this.cancelInteractionsForCharacter(character.id); this.clearSeat(character.id);
    const from = cloneCell(character.cell);
    character.facing = directionFromVector(target.col-from.col,target.row-from.row) ?? character.facing;
    character.cell = cloneCell(target);
    character.step = {from,to:cloneCell(target),fromSurfaceId:character.surfaceId,toSurfaceId:character.surfaceId,startedAt:now,durationMs:900,movementKind:'jump'};
    character.moving = true; character.input.held = null;
    this.applyMovementHazard(character.id); this.checkSceneProximity(character.id,from);
    this.revision++; this.stateRevision++;
  }

  private advancePlannedJump(character: CharacterState, now: number) {
    const plan = this.plannedJumps.get(character.id); if (!plan || character.step) return false;
    if (this.combat.active || character.hp <= 0 || character.sceneId !== plan.sceneId || character.surfaceId !== plan.surfaceId
      || character.socketId !== plan.socketId || !sameCell(character.cell,plan.expected) || character.input.held
      || this.conditionsFor(character.id).some(condition => ['inconsciente','paralizada','apresada','agarrada','restringida','derribada'].includes(condition))
      || this.interactions.some(request => request.characterId === character.id && request.status === 'pending')
      || this.jumpLandingProblem(character,plan.origin,plan.landing,true)) {
      this.cancelPlannedJump(character.id); character.moving = false; return false;
    }
    const next = plan.steps[0];
    if (!next) { this.launchCharacterJump(character,plan.landing,now); return true; }
    if (!this.jumpPreparationStepAllowed(character,character.cell,next.cell)) { this.cancelPlannedJump(character.id); character.moving = false; return false; }
    const from = cloneCell(character.cell); plan.steps.shift(); plan.expected = cloneCell(next.cell);
    this.clearSeat(character.id);
    character.facing = directionFromVector(next.cell.col-from.col,next.cell.row-from.row)!;
    character.cell = cloneCell(next.cell);
    character.step = {from,to:cloneCell(next.cell),fromSurfaceId:character.surfaceId,toSurfaceId:character.surfaceId,
      startedAt:now,durationMs:next.running ? 180 : STEP_DURATION_MS,...(next.running ? {movementKind:'run-up' as const} : {})};
    character.moving = true; character.input.held = null;
    this.applyMovementHazard(character.id); this.checkSceneProximity(character.id,from);
    this.revision++; this.stateRevision++; return true;
  }

  declareExplorationBasicAction(characterId: string, actionId: ExplorationBasicAction, targetId?: string, targetCell?: Cell, jumpMode: JumpMode = 'auto') {
    if (this.combat.active) return { ok: false as const, code: 'COMBAT_ACTIVE' };
    const character = this.characters.get(characterId), action = explorationBasicActionCatalogue[actionId];
    if (!character || !character.explorationBasics.includes(actionId)) return { ok: false as const, code: 'UNKNOWN_ACTION' };
    if (this.conditionsFor(characterId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };

    let targetLabel = 'la zona cercana';
    if (action.target === 'self') {
      if (targetId || targetCell) return { ok: false as const, code: 'INVALID_TARGET' };
      targetLabel = character.label;
    } else if (action.target === 'point') {
      const grid = this.sceneForCharacter(character).grid;
      if (targetId || !targetCell || !Number.isInteger(targetCell.col) || !Number.isInteger(targetCell.row) || targetCell.col < 0 || targetCell.row < 0 || targetCell.col >= grid.cols || targetCell.row >= grid.rows) return { ok: false as const, code: 'INVALID_TARGET' };
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

    let guidance = actionId === 'jump' ? jumpGuidance(character.sheet?.strengthScore) : action.guidance;
    if(actionId==='hide'){this.progress[`stealth.${characterId}`]=!this.progress[`stealth.${characterId}`];this.revision++;this.stateRevision++;}
    if (actionId === 'jump' && targetCell) {
      if (this.plannedJumps.has(characterId)) return {ok:false as const,code:'JUMP_IN_PROGRESS'};
      if (character.hp <= 0 || character.step || this.conditionsFor(characterId).some(condition => ['apresada','agarrada','restringida','derribada'].includes(condition))) return {ok:false as const,code:'INCAPACITATED'};
      const now = Date.now(), run = this.walkingRunUp.get(characterId);
      const facing = directionFromVector(targetCell.col-character.cell.col,targetCell.row-character.cell.row);
      const recentRun = Boolean(run && now-run.at <= 2500 && run.feet >= 10 && run.facing === facing
        && run.sceneId === character.sceneId && run.surfaceId === character.surfaceId && sameCell(run.cell,character.cell));
      const standingProblem = this.jumpLandingProblem(character,character.cell,targetCell,false);
      const running = jumpMode !== 'standing' && (jumpMode === 'running' || recentRun || standingProblem === 'JUMP_NEEDS_RUN_UP' || standingProblem === 'JUMP_TOO_HIGH');
      const problem = this.jumpLandingProblem(character,character.cell,targetCell,running);
      if (problem) return {ok:false as const,code:problem};
      if (running && !recentRun) {
        const steps = planJumpRunUp(character.cell,targetCell,(from,to) => this.jumpPreparationStepAllowed(character,from,to));
        if (!steps) return {ok:false as const,code:'JUMP_RUN_UP_BLOCKED'};
        this.cancelInteractionsForCharacter(characterId); character.input.held = null;
        this.plannedJumps.set(characterId,{sceneId:character.sceneId,surfaceId:character.surfaceId,origin:cloneCell(character.cell),expected:cloneCell(character.cell),landing:cloneCell(targetCell),steps,socketId:character.socketId});
        this.advancePlannedJump(character,now);
        guidance = `Carrerilla automática: retrocede 3 m, avanza 3 m y salta al destino. ${guidance}`;
      } else this.launchCharacterJump(character,targetCell,now);
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
    if (!this.clearLineOfEffect(characterId, target.cell)) return { ok: false as const, code: 'LINE_OF_EFFECT_BLOCKED' };
    if (this.conditionsFor(characterId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    const npc = this.npcs.get(targetId);
    if(npc?.id===this.campaign.proximityEncounter?.distraction?.actorId){this.fleeSceneAnimal();return {ok:true as const,code:'ANIMAL_FLED'};}
    if (npc) npc.combatEnabled = true;
    if (!this.startCombat({ attackerId: characterId, targetId, actionId })) return { ok: false as const, code: 'COMBATANTS_REQUIRED' };
    this.setCombatEvent(`${character.label} inicia una acción hostil contra ${target.label}; se resolverá al llegar su iniciativa.`, 'turn', undefined, { actorId: characterId, targetId, animation: this.animationFor(action) });
    return { ok: true as const, code: 'COMBAT_STARTED' };
  }

  private beginCombatTurn(currentId: string) {
    for (const [entityId, sources] of Object.entries(this.conditionSources)) for (const source of [...sources]) if (source.roundAnchorId === currentId) this.advanceConditionSource(entityId, source);
    this.advanceConditionTurns(currentId, 'start');
    delete this.combat.turnActions[currentId];
    this.combat.spentSquares[currentId] = 0; this.combat.dashSquares[currentId] = 0; this.combat.actionUsed[currentId] = false; this.combat.bonusActionUsed[currentId] = false; this.combat.reactionUsed[currentId] = false; this.combat.sneakAttackUsed[currentId] = false; delete this.combat.sequences[currentId]; delete this.combat.stances[currentId];
    for (const character of this.characters.values()) character.input.held = null;
    this.setCombatEvent(`Ronda ${this.combat.round} · turno de ${this.combatEntity(currentId)?.label ?? '—'}`, 'turn');
    const currentCharacter = this.characters.get(currentId);
    if (currentCharacter?.hp === 0) this.combat.pending = { id: crypto.randomUUID(), stage: 'death-save', attackerId: currentId, targetId: currentId, actionId: 'death-save', advantage: 'normal' };
    else this.activateOpeningAction();
  }

  nextCombatTurn(skipCurrentEnd = false) {
    if (!this.combat.active || this.combat.initiativePending || !this.combat.order.length || this.combat.pending) return false;
    const priorRound = this.combat.round, now = Date.now();
    this.settleGameClock(now);
    if (!skipCurrentEnd) this.advanceConditionTurns(this.currentCombatId()!, 'end');
    let checked = 0;
    do {
      this.combat.turnIndex++;
      if (this.combat.turnIndex >= this.combat.order.length) { this.combat.turnIndex = 0; this.combat.round++; this.expireRoundConditions(); }
      checked++;
      if (this.combatantCannotTakeTurn(this.currentCombatId()!)) {
        for (const [entityId, sources] of Object.entries(this.conditionSources)) for (const source of [...sources]) if (source.roundAnchorId === this.currentCombatId()) this.advanceConditionSource(entityId, source);
        this.advanceConditionTurns(this.currentCombatId()!, 'start'); this.advanceConditionTurns(this.currentCombatId()!, 'end');
      }
    } while (checked < this.combat.order.length && this.combatantCannotTakeTurn(this.currentCombatId()!));
    if (this.combat.round > priorRound) {
      this.gameClockSeconds += (this.combat.round - priorRound) * 6;
      this.gameClockAnchorMs = now;
    }
    if (this.combatantCannotTakeTurn(this.currentCombatId()!)) return false;
    const currentId = this.currentCombatId()!;
    this.beginCombatTurn(currentId);
    return true;
  }
  private combatantCannotTakeTurn(entityId: string) {
    const entity = this.combatEntity(entityId); if (!entity) return true;
    if (entity.hp > 0 && this.conditionsFor(entityId).includes('inconsciente')) return true;
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
  revealEncounterGroup(groupId: string, count: number) {
    const group = this.campaign.encounterGroups?.find(group => group.id === groupId);
    if (!group || group.sceneId !== this.sceneId || this.combat.active || !Number.isInteger(count) || count < 0 || count > group.actorIds.length) return false;
    const selected = group.actorIds.slice(0, count).map(id => this.npcs.get(id));
    const reservations = this.actorReservations(this.currentScene().surfaceId);
    if (selected.some(npc => !npc || npc.hp <= 0 || !this.walkableAt(npc.sceneId, npc.surfaceId, npc.cell) || !npc.visible && reservations.has(cellKey(npc.cell)))) return false;
    for (const [index, id] of group.actorIds.entries()) this.npcs.get(id)!.visible = index < count;
    return true;
  }
  prepareMirrorEncounter(sourceId?: string) {
    if (!this.campaign.encounter?.mirrorPlayer || !this.creature) return;
    const mirror=this.objectScenes.get(this.creature.sceneId)?.objects.find(o=>o.id===this.campaign.mirrorInteraction?.targetId);
    if(mirror)mirror.structure='destroyed';
    if(!this.creature.visible){
      // Spawn at the authored platform, not at the mirror frame. Preserve a
      // previously selected spot while the encounter is being restored.
      this.creature.cell=cloneCell(this.campaign.encounter.creature.cell);
      const scene=this.sceneById(this.creature.sceneId), blocked=this.actorReservations(this.creature.surfaceId);
      const props=this.publicObjectProps(scene.id);
      const cells=[...scene.walkable].sort((a,b)=>Math.abs(a.col-this.creature!.cell.col)+Math.abs(a.row-this.creature!.cell.row)-Math.abs(b.col-this.creature!.cell.col)-Math.abs(b.row-this.creature!.cell.row));
      const free=cells.find(cell=>!blocked.has(cellKey(cell))&&!scene.movementHazards?.some(h=>h.cells.some(c=>sameCell(c,cell)))&&isWalkable(scene,cell,props));
      if(free)this.creature.cell=cloneCell(free);
    }
    if (this.creature.mimicOfPlayerId) return; // Reveal/restore must not heal or re-copy.
    const source = sourceId ? this.characters.get(sourceId) : [...this.characters.values()].find(character => Boolean(character.sessionToken)) ?? this.characters.values().next().value as CharacterState | undefined;
    if (!source) return;
    const maxHp = Math.max(1, Math.floor(source.maxHp * 0.75));
    this.creature.label = `Reflejo helado de ${source.label}`;
    this.creature.maxHp = maxHp; this.creature.hp = maxHp;
    this.creature.armorClass = source.combat.armorClass; this.creature.speedMeters = source.combat.speedMeters;
    this.creature.initiativeBonus = source.combat.initiativeBonus; this.creature.attacks = structuredClone(source.combat.attacks); this.creature.tokenId = source.tokenId; this.creature.resources = structuredClone(source.combat.resources); this.creature.ruleTraits = structuredClone(source.combat.ruleTraits); this.creature.damageResistances = [...source.combat.damageResistances]; this.creature.damageImmunities = [...source.combat.damageImmunities]; this.creature.conditionImmunities = [...source.combat.conditionImmunities]; this.creature.mimicOfPlayerId = source.id;
    if(mirror)mirror.structure='destroyed';
  }
  private allInitiativesSubmitted() { return this.combat.participantIds.every(id => this.combat.initiativeSubmitted[id]); }
  private proposedInitiativeOrder() {
    const order = [...this.combat.participantIds].sort((left, right) =>
      this.combat.initiative[right]! - this.combat.initiative[left]! ||
      (this.combatEntity(right)?.initiativeBonus ?? 0) - (this.combatEntity(left)?.initiativeBonus ?? 0) ||
      left.localeCompare(right)
    );
    const reflection = this.creature, sourceId = reflection?.mimicOfPlayerId;
    if (reflection && sourceId && order.includes(reflection.id) && order.includes(sourceId)) {
      order.splice(order.indexOf(reflection.id), 1); order.splice(order.indexOf(sourceId) + 1, 0, reflection.id);
    }
    return order;
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
    const reflectionId = this.creature?.mimicOfPlayerId ? this.creature.id : null;
    const ordinaryOrder = order.filter(id => id !== reflectionId);
    for (let index = 1; index < ordinaryOrder.length; index++) if (this.combat.initiative[ordinaryOrder[index - 1]!]! < this.combat.initiative[ordinaryOrder[index]!]!) return false;
    if (reflectionId && order.includes(reflectionId) && order.indexOf(reflectionId) !== order.indexOf(this.creature!.mimicOfPlayerId!) + 1) return false;
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
      const next: ConditionSource = source ? { ...source, condition, ...(source.durationRounds !== undefined && source.appliedAtRound === undefined ? { appliedAtRound: this.combat.round } : {}) } : { condition };
      const remaining = conditionRemainingMs(next, Date.now(), this.combat.round);
      if (remaining !== undefined) {
        next.remainingMs = remaining;
        if (this.conditionUsesTurns(entityId)) {
          delete next.expiresAt;
          if (!next.expiryTurn && !this.combat.initiativePending) next.roundAnchorId = this.currentCombatId() ?? undefined;
          if (next.expiryTurn === 'end' && this.currentCombatId() === entityId && !this.combat.initiativePending) next.skipNextTurnEnd = true;
        } else next.expiresAt = Date.now() + remaining;
      }
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
      if (this.conditionUsesTurns(entityId) && !source.expiryTurn && !source.roundAnchorId) this.advanceConditionSource(entityId, source);
    }
  }
  private conditionUsesTurns(entityId: string) { return this.combat.active && this.combat.participantIds.includes(entityId); }
  private advanceConditionSource(entityId: string, source: ConditionSource) {
    const remaining = conditionRemainingMs(source, Date.now(), this.combat.round - 1);
    if (remaining === undefined) return;
    source.remainingMs = Math.max(0, remaining - ROUND_DURATION_MS);
    if (!source.remainingMs) this.setCombatCondition(entityId, source.condition, false, source);
  }
  private advanceConditionTurns(entityId: string, boundary: 'start' | 'end') {
    for (const source of [...this.conditionSourcesFor(entityId)]) if (source.expiryTurn === boundary) {
      if (boundary === 'end' && source.skipNextTurnEnd) { delete source.skipNextTurnEnd; continue; }
      this.advanceConditionSource(entityId, source);
    }
  }
  /** Only participants use initiative time; other scenes continue in exploration time. */
  private syncConditionClocks(now = Date.now()) {
    for (const [entityId, sources] of Object.entries(this.conditionSources)) for (const source of [...sources]) {
      const remaining = conditionRemainingMs(source, now, this.combat.round);
      if (remaining === undefined) continue;
      if (remaining <= 0) { this.setCombatCondition(entityId, source.condition, false, source); continue; }
      source.remainingMs = remaining;
      if (this.conditionUsesTurns(entityId)) {
        delete source.expiresAt;
        if (source.roundAnchorId && !this.combat.participantIds.includes(source.roundAnchorId)) delete source.roundAnchorId;
      } else { if (source.expiresAt === undefined) source.expiresAt = now + remaining; delete source.skipNextTurnEnd; delete source.roundAnchorId; }
    }
  }
  /** DM replacement preserves an effect's escape/source metadata but replaces its timer. */
  setDmCondition(entityId: string, condition: CombatCondition, active: boolean, durationSeconds?: number, expiryTurn?: 'start' | 'end') {
    if (!active) return this.setCombatCondition(entityId, condition, false);
    if (!this.combatEntity(entityId) || this.combatEntity(entityId)!.conditionImmunities.includes(condition)) return false;
    const existing = this.conditionSourcesFor(entityId).filter(source => source.condition === condition);
    const sources: ConditionSource[] = existing.length ? existing : [{ condition, sourceLabel: 'Decisión del DM' }];
    for (const source of sources) {
      const next = { ...source };
      delete next.durationRounds; delete next.appliedAtRound; delete next.durationSeconds;
      delete next.remainingMs; delete next.expiresAt; delete next.expiryTurn; delete next.skipNextTurnEnd; delete next.roundAnchorId;
      if (durationSeconds !== undefined && !(source.sourceAbility === 'zero-hp' && this.combatEntity(entityId)!.hp <= 0)) { next.durationSeconds = durationSeconds; if (expiryTurn) next.expiryTurn = expiryTurn; }
      this.setCombatCondition(entityId, condition, true, next);
    }
    return true;
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
  private clearLineOfEffect(entityId: string, cell: Cell, fromOverride?: Cell) {
    const from = fromOverride ?? this.entityCell(entityId), sceneId = this.entitySceneId(entityId); if (!from || !sceneId) return false;
    const scene = this.sceneById(sceneId);
    if (scene.effectWalls?.some(wall => segmentCrossesBox(from, cell, wall))) return false;
    return !this.publicObjectProps(sceneId).some(prop => prop.surfaceId === this.entitySurfaceId(entityId)
      && prop.kind === 'door' && prop.structure !== 'destroyed' && prop.state !== 'open'
      && footprintFor(prop.cell, prop.rotation, prop.footprint).some(occupied => segmentCrossesBox(from, cell, { minCol: occupied.col, maxCol: occupied.col + 1, minRow: occupied.row, maxRow: occupied.row + 1 })));
  }
  private isCurrentSceneCell(cell: Cell) {
    const { cols, rows } = this.currentScene().grid;
    return Number.isInteger(cell.col) && Number.isInteger(cell.row) && cell.col >= 0 && cell.row >= 0 && cell.col < cols && cell.row < rows;
  }
  private campWeatherExposed(actorId: string) {
    const cell=this.entityCell(actorId),sceneId=this.entitySceneId(actorId); if (!cell || !sceneId) return false;
    const scene=this.sceneById(sceneId);if(!scene.camp)return false;
    if (scene.id === 'camp-a1-rooms') return !A1_ROOM_CELL_KEYS.has(`${cell.col},${cell.row}`);
    if (scene.camp.visualProfile === 'coastal-refuge') return false;
    return !scene.camp.interactionPoints.some(p=>p.kind==='tent'&&p.objectCell&&Math.abs(cell.col-p.objectCell.col)<=1&&Math.abs(cell.row-p.objectCell.row)<=1);
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
    const windPenalty = Boolean(this.environment.weatherRules && ranged && !action.magical && strongWind(this.environment) && this.campWeatherExposed(attackerId));
    const hasDisadvantage = windPenalty || own.has('envenenada') || own.has('restringida') || own.has('apresada') || own.has('asustada') || own.has('inconsciente') || own.has('paralizada') || own.has('derribada') || target.has('invisible') || targetDodging || Boolean(ranged && (nearbyHostile || action.range?.longMeters && distance > action.range.normalMeters || target.has('derribada') && distance > 1.5));
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
    return this.combat.participantIds.some(id => id !== attackerId && id !== targetId && this.combatEntity(id)?.controller === attacker.controller && (this.combatEntity(id)?.hp ?? 0) > 0 && !this.conditionsFor(id).some(condition => condition === 'inconsciente' || condition === 'paralizada') && this.distanceMeters(id, targetId) <= 1.5);
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
    if (cost === 'action') this.combat.turnActions[entityId] = { actionId: action.id, label: action.label, kind: 'attack' };
    if (cost === 'reaction') this.combat.reactionUsed[entityId] = true;
    else if (cost === 'bonus') this.combat.bonusActionUsed[entityId] = true;
    else this.combat.actionUsed[entityId] = true;
  }
  private actionConsumed(attackerId: string, action: CombatAction, targetId?: string) {
    this.combat.turnActions[attackerId] = { actionId: action.id, label: action.label, kind: 'attack' };
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
    if (/light-torch|encender-antorcha/i.test(action.id) || /encender antorcha/i.test(action.label)) {
      const character = this.characters.get(attackerId);
      if (character) {
        const index = inventoryStackIndex(character.inventory, /\bantorchas?\b/i);
        if (index >= 0) {
          const result = useInventoryItem(character.inventory, index, character.inventory[index]!, 'light');
          if (result.ok) character.inventory = result.items;
        }
      }
    }
  }
  private attackNeedsThrownDagger(action: CombatAction) { return action.inventoryCost === 'dagger' || /thrown-dagger|lanzar-daga/i.test(action.id) || /lanzar daga|daga arrojadiza/i.test(action.label); }
  private attackNeedsArrows(action: CombatAction) { return action.inventoryCost === 'arrow'; }
  private hasInventoryStack(characterId: string, itemPattern: RegExp) {
    return inventoryStackIndex(this.characters.get(characterId)?.inventory ?? [], itemPattern) >= 0;
  }
  private consumeInventoryStack(characterId: string, itemPattern: RegExp) {
    const character = this.characters.get(characterId); if (!character) return false;
    const index = inventoryStackIndex(character.inventory, itemPattern);
    const next = removeInventoryUnit(character.inventory, index); if (!next) return false;
    character.inventory = next;
    return true;
  }
  useBackpackItem(characterId: string, index: number, expectedItem: string, action: InventoryUse) {
    const character = this.characters.get(characterId);
    if (!character) return { ok: false as const, code: 'INVALID_INVENTORY' };
    // Reading/editing a sheet does not confer a free combat action. Combat uses
    // remain in the existing turn-aware action workflow, supervised by the DM.
    if (this.combat.active) return { ok: false as const, code: 'INVENTORY_COMBAT_ACTION_REQUIRED' };
    if (character.hp <= 0 || this.conditionsFor(characterId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    const result = useInventoryItem(character.inventory, index, expectedItem, action);
    if (result.ok) character.inventory = result.items;
    return result;
  }
  private promptFor(pending: PendingCombatResolution): CombatPrompt {
    const attacker = this.combatEntity(pending.attackerId)!, target = this.combatEntity(pending.targetId)!;
    const action = attacker.attacks.find(item => item.id === pending.actionId);
    if (pending.stage === 'death-save') return { id: pending.id, stage: 'death-save', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · salvación de muerte`, instruction: 'Tira 1d20 natural. 10 o más es un éxito; 1 cuenta como dos fallos y 20 recupera 1 PG.', advantage: 'normal', minimum: 1, maximum: 20 };
    if (pending.stage === 'reaction') return { id: pending.id, stage: 'reaction', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · ataque de oportunidad`, instruction: `${target.label} va a salir de tu alcance. ¿Gastas tu reacción para hacer ${action?.label ?? 'un ataque cuerpo a cuerpo'} antes de que se mueva? Es un único ataque, no el multiataque completo.`, advantage: 'normal' };
    if (pending.stage === 'concentration') return { id: pending.id, stage: 'concentration', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · concentración`, instruction: `Tira salvación de Constitución CD ${pending.concentrationDc ?? 10} e introduce el total con modificador.`, advantage: 'normal', minimum: -30, maximum: 100 };
    if (pending.stage === 'check') return { id: pending.id, stage: 'check', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · esconderse`, instruction: 'Si estás fuera de la vista y tienes oscuridad intensa o cobertura de tres cuartos o total, tira Destreza (Sigilo) CD 15. Si tienes éxito, quedas Invisible; el resultado será la CD para detectarte.', advantage: 'normal', minimum: -30, maximum: 100 };
    if (pending.stage === 'attack') return { id: pending.id, stage: 'attack', actorId: pending.attackerId, targetId: pending.targetId, title: `${attacker.label} · ${action?.label ?? 'Ataque'}`, instruction: `Tira el d20${pending.advantage === 'advantage' ? ' dos veces y anota el mayor' : pending.advantage === 'disadvantage' ? ' dos veces y anota el menor' : ''}. Introduce solo el resultado natural: el sistema añade ${(action?.attackBonus ?? 0) >= 0 ? '+' : ''}${action?.attackBonus ?? 0}. Dificultad de impacto: CA ${target.armorClass}.`, advantage: pending.advantage, minimum: 1, maximum: 20 };
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
    const prompt = this.promptFor(pending);
    if (controller === 'player' && pending.stage === 'attack') prompt.instruction = prompt.instruction.replace(/ Dificultad de impacto: CA \d+\./, ' El DM recibe el resultado de impacto.');
    return { ...prompt, selectionActorId: pending.attackerId, cancellable: this.canCancelCombatAction() };
  }

  private continueOpportunityMovement(movement: PendingMovement) {
    const entity = this.combatEntity(movement.entityId), current = this.entityCell(movement.entityId);
    if (!entity || entity.hp <= 0 || !current || Math.max(Math.abs(movement.destination.col - current.col), Math.abs(movement.destination.row - current.row)) !== 1) return false;
    const sceneId = this.entitySceneId(movement.entityId)!, scene = this.sceneById(sceneId), currentSurfaceId = this.entitySurfaceId(movement.entityId)!;
    const facing = directionFromVector(movement.destination.col - current.col, movement.destination.row - current.row)!;
    const resolved = scene.terrain ? this.terrainStepDestination(scene, currentSurfaceId, current, movement.destination)
      : resolveStep(scene, current, facing, this.publicObjectProps(sceneId)) ? { surfaceId: currentSurfaceId } : null;
    if (!resolved || (movement.destinationSurfaceId && movement.destinationSurfaceId !== resolved.surfaceId)) return false;
    const destinationSurfaceId = resolved.surfaceId;
    if (!this.canSpendMovement(movement.entityId, this.movementCost(sceneId, destinationSurfaceId, movement.destination))) return false;
    if (!destinationSurfaceId || !this.walkableAt(sceneId, destinationSurfaceId, movement.destination)
      || this.publicObjectProps(sceneId).some(prop => prop.surfaceId === destinationSurfaceId && prop.structure !== 'destroyed' && (prop.kind !== 'door' || prop.state !== 'open') && footprintFor(prop.cell, prop.rotation, prop.footprint).some(cell => sameCell(cell, movement.destination)))) return false;
    const occupied = this.occupiedByActor(sceneId, destinationSurfaceId, movement.destination, movement.entityId)
      || this.combat.participantIds.some(id => id !== movement.entityId && (this.combatEntity(id)?.hp ?? 0) > 0
        && this.entitySceneId(id) === sceneId && this.entitySurfaceId(id) === destinationSurfaceId
        && sameCell(this.entityCell(id) ?? { col: -999, row: -999 }, movement.destination));
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
      this.endCombatIfSideDefeated();
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
    const mimicSource = attackerId === this.creature?.id ? this.creature.mimicOfPlayerId : null;
    if (mimicSource && this.combat.turnActions[mimicSource]?.actionId !== actionId) return { ok: false as const, code: 'MIMIC_ACTION_MISMATCH' };
    const attacker = this.combatEntity(attackerId), target = targetId ? this.combatEntity(targetId) : undefined;
    if (!attacker) return { ok: false as const, code: 'UNKNOWN_ACTOR' };
    const action = attacker.attacks.find(item => item.id === actionId); if (!action) return { ok: false as const, code: 'UNKNOWN_ACTION' };
    if (this.characters.has(attackerId) && (/light-torch|encender-antorcha/i.test(action.id) || /encender antorcha/i.test(action.label))) {
      const inventory = this.characters.get(attackerId)!.inventory, index = inventoryStackIndex(inventory, /\bantorchas?\b/i);
      if (index < 0) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
      const lighting = useInventoryItem(inventory, index, inventory[index]!, 'light');
      if (!lighting.ok) return { ok: false as const, code: lighting.code };
    }
    if (this.characters.has(attackerId) && (this.attackNeedsThrownDagger(action) && !this.hasInventoryStack(attackerId, /\bdagas?\b/i)
      || this.attackNeedsArrows(action) && !this.hasInventoryStack(attackerId, /\bflechas?\b/i))) return { ok: false as const, code: 'RESOURCE_DEPLETED' };
    if (!this.hasActionAvailable(attackerId, action)) return { ok: false as const, code: this.currentCombatId() === attackerId ? 'ACTION_USED' : 'NOT_YOUR_TURN' };
    if (action.targeting === 'point') {
      if (targetId || !targetCell || !this.isCurrentSceneCell(targetCell)) return { ok: false as const, code: 'INVALID_TARGET' };
      if (!this.clearLineOfEffect(attackerId, targetCell)) return { ok: false as const, code: 'LINE_OF_EFFECT_BLOCKED' };
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
      this.recordVisualEffect(attackerId, action.id, targetCell, Boolean(action.concentration));
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
    if (!this.clearLineOfEffect(attackerId, this.entityCell(combatTargetId)!)) return { ok: false as const, code: 'LINE_OF_EFFECT_BLOCKED' };
    if (action.resolution === 'guided') {
      this.consumeActionCost(attackerId, action); this.consumeActionResource(attackerId, action);
      if (action.concentration) this.startConcentration(attackerId, action.id, action.label);
      this.recordVisualEffect(attackerId, action.id, this.entityCell(combatTargetId)!, Boolean(action.concentration), combatTargetId);
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
      this.combat.pending = { id: crypto.randomUUID(), stage: 'save', attackerId, targetId: combatTargetId, actionId, advantage: saveAdvantage, source: { condition: action.save.failureCondition ?? 'restringida', sourceId: attackerId, sourceAbility: action.id, escapeDc: action.save.escapeDc, endsWhenSourceDefeated: action.save.endsWhenSourceDefeated, durationRounds: action.save.durationRounds, durationSeconds: action.save.durationSeconds, expiryTurn: action.save.expiryTurn } };
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
  submitCombatRoll(controller: 'player' | 'dm', rollingCharacterId: string | null, expectedStage: PendingCombatResolution['stage'], promptId: string, value: number): { ok: true; code: string } | { ok: false; code: string } {
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
      if (value === 20) { this.applyHitPoints(character.id, 1); this.combat.pending = null; this.setCombatEvent(`${character.label} obtiene un 20 y recupera 1 PG.`, 'turn'); this.endCombatIfSideDefeated(); return { ok: true as const, code: 'DEATH_SAVE_REVIVED' }; }
      if (value === 1) character.deathSaves.failures = Math.min(3, character.deathSaves.failures + 2);
      else if (value >= 10) character.deathSaves.successes = Math.min(3, character.deathSaves.successes + 1);
      else character.deathSaves.failures = Math.min(3, character.deathSaves.failures + 1);
      if (character.deathSaves.successes >= 3) character.deathSaves.stable = true;
      this.combat.pending = null;
      const dead = character.deathSaves.failures >= 3, stable = character.deathSaves.stable;
      this.setCombatEvent(dead ? `${character.label} acumula tres fallos de salvación de muerte.` : stable ? `${character.label} queda estable.` : `${character.label}: salvaciones de muerte ${character.deathSaves.successes} éxitos / ${character.deathSaves.failures} fallos.`, dead ? 'defeat' : 'turn');
      this.endCombatIfSideDefeated();
      return { ok: true as const, code: dead ? 'DEATH_SAVE_FAILED_FINAL' : stable ? 'DEATH_SAVE_STABLE' : value >= 10 ? 'DEATH_SAVE_SUCCESS' : 'DEATH_SAVE_FAILED' };
    }
    if (pending.stage === 'concentration') {
      const success = value >= (pending.concentrationDc ?? 10), spell = this.concentration[pending.attackerId];
      if (!success) this.endConcentration(pending.attackerId);
      const queue = pending.concentrationQueue ?? [];
      this.combat.pending = null;
      this.setCombatEvent(success ? `${attacker.label} mantiene la concentración en ${spell?.label ?? 'su conjuro'}.` : `${attacker.label} pierde la concentración en ${spell?.label ?? 'su conjuro'}.`, success ? 'turn' : 'damage');
      this.queueConcentrationChecks(queue);
      this.endCombatIfSideDefeated();
      return { ok: true as const, code: success ? 'CONCENTRATION_MAINTAINED' : 'CONCENTRATION_BROKEN' };
    }
    if (pending.stage === 'escape') {
      const success = value >= (pending.source?.escapeDc ?? 10); this.combat.actionUsed[attacker.id] = true; if (success) this.setCombatCondition(attacker.id, pending.source!.condition, false, pending.source);
      this.combat.pending = null; this.setCombatEvent(success ? `${attacker.label} se libera.` : `${attacker.label} no logra liberarse.`, 'attack'); this.endCombatIfSideDefeated(); return { ok: true as const, code: success ? 'ESCAPE_SUCCESS' : 'ESCAPE_FAILED' };
    }
    if (pending.stage === 'check') {
      const success = value >= 15;
      if (success) this.setCombatCondition(attacker.id, 'invisible', true, { condition: 'invisible', sourceAbility: 'hide', sourceLabel: `Sigilo ${value}; CD para detectarle ${value}` });
      this.combat.pending = null;
      this.setCombatEvent(success ? `${attacker.label} se esconde y queda Invisible (CD ${value} para detectarle).` : `${attacker.label} falla Sigilo CD 15.`, 'turn');
      this.endCombatIfSideDefeated();
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
      this.endCombatIfSideDefeated();
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
        this.endCombatIfSideDefeated();
        return { ok: true as const, code: 'ATTACK_MISSED' };
      }
      const doubled = (formula: string) => formula.replace(/^(\d+)d(\d+)$/, (_match, count, sides) => Number(sides) === 1 ? `${count}d${sides}` : `${Number(count) * 2}d${sides}`);
      const sneak = pending.sneakAttackDice ? critical ? doubled(pending.sneakAttackDice) : pending.sneakAttackDice : '';
      const diceFormula = `${critical ? doubled(action.damageDice) : action.damageDice}${sneak ? `+${sneak}` : ''}`;
      this.combat.pending = { ...pending, id: crypto.randomUUID(), stage: 'damage', critical, diceFormula, damageBonus: action.damageBonus };
      // Fixed damage (the unarmed 1d1 representation) has no physical damage
      // die to request. Resolve it through the same authoritative damage path.
      const fixed = this.damageDiceRange(diceFormula);
      if (fixed.minimum > 0 && fixed.minimum === fixed.maximum) return this.submitCombatRoll(controller, rollingCharacterId, 'damage', this.combat.pending.id, fixed.minimum);
      return { ok: true as const, code: 'DAMAGE_REQUIRED' };
    }
    const rawDamage = Math.max(0, value + (pending.damageBonus ?? 0));
    const damage = action.damageType && target.damageImmunities.includes(action.damageType) ? 0 : action.damageType && target.damageResistances.includes(action.damageType) ? Math.floor(rawDamage / 2) : rawDamage;
    const targetWasAtZero = target.hp === 0;
    // House rule requested for both campaigns: a mundane bludgeoning finish
    // knocks out at 1 HP. Spells and other damage still use the 0-HP path.
    const knockout = target.hp > 0 && damage >= target.hp && damage > 0 && (action.damageType === 'contundente' || this.animationFor(action) === 'attack-unarmed') && !action.magical && !target.conditionImmunities.includes('inconsciente');
    if (knockout) {
      this.applyHitPoints(target.id, 1 - target.hp);
      const identity = this.npcs.get(target.id)?.identityId;
      const ids = identity ? [...this.npcs.values()].filter(npc => npc.identityId === identity).map(npc => npc.id) : [target.id];
      for (const id of ids) {
        this.setCombatCondition(id, 'inconsciente', true, { condition: 'inconsciente', sourceAbility: 'nonlethal-finish', sourceLabel: 'Golpe contundente · inconsciente a 1 PG' });
        this.setCombatCondition(id, 'derribada', true);
        this.clearConditionsFromDefeatedSource(id); this.endConcentration(id);
      }
      const character = this.characters.get(target.id);
      if (character) { character.input.held = null; character.step = null; character.moving = false; }
    } else this.applyHitPoints(target.id, -damage);
    if (targetWasAtZero && damage > 0 && pending.critical) {
      const downed = this.characters.get(target.id);
      if (downed && downed.deathSaves.failures < 3) downed.deathSaves.failures = Math.min(3, downed.deathSaves.failures + 1);
    }
    if (pending.useSneakAttack) { this.combat.sneakAttackUsed[attacker.id] = true; this.combat.sneakAttackUsedTurn[attacker.id] = this.combatTurnKey(); } if (!pending.opportunity) this.actionConsumed(attacker.id, action, target.id); if (action.recharge && !pending.opportunity) this.combat.recharge[attacker.id]![action.id] = false;
    this.combat.pending = null;
    const targetAfter = this.combatEntity(target.id)!; const suffix = knockout ? ` ${targetAfter.label} queda inconsciente a 1 PG.` : targetAfter.hp <= 0 ? ` ${targetAfter.label} queda fuera de combate.` : '';
    this.setCombatEvent(`${attacker.label} usa ${action.label}: ${damage} PG${action.damageType ? ` ${action.damageType}` : ''}.${suffix}`, knockout || targetAfter.hp <= 0 ? 'defeat' : 'damage', `${attacker.label} impacta a ${target.label}: ${damage} PG.${suffix}`, { actorId: attacker.id, targetId: target.id, animation: this.animationFor(action), reactionAnimation: damage>0 ? combatTargetReactionState(action) : undefined });
    const resolvedEvent = this.combat.lastEvent!;
    if (pending.opportunity && pending.movement) this.continueOpportunityMovement(pending.movement);
    const checks: Array<{ entityId: string; dc: number }> = [];
    if (damage > 0 && this.concentration[target.id] && targetAfter.hp > 0) checks.push({ entityId: target.id, dc: Math.max(10, Math.floor(damage / 2)) });
    if (!this.combat.pending) this.queueConcentrationChecks(checks);
    this.endCombatIfSideDefeated(resolvedEvent);
    return { ok: true as const, code: 'ATTACK_RESOLVED' };
  }
  useBasicCombatAction(entityId: string, action: BasicCombatAction, targetId?: string) {
    if (!this.combat.active || this.currentCombatId() !== entityId) return { ok: false as const, code: 'NOT_YOUR_TURN' };
    if (this.combat.pending) return { ok: false as const, code: 'ROLL_PENDING' };
    const actor = this.combatEntity(entityId); if (!actor) return { ok: false as const, code: 'UNKNOWN_ACTOR' };
    if (this.conditionsFor(entityId).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return { ok: false as const, code: 'INCAPACITATED' };
    if (this.combat.actionUsed[entityId]) return { ok: false as const, code: 'ACTION_USED' };
    const mimicSource = entityId === this.creature?.id ? this.creature.mimicOfPlayerId : null;
    if (mimicSource && action !== 'magic' && this.combat.turnActions[mimicSource]?.actionId !== action) return { ok: false as const, code: 'MIMIC_ACTION_MISMATCH' };
    if (action === 'help') {
      const target = targetId ? this.combatEntity(targetId) : null;
      if (!target || target.controller === actor.controller || target.id === entityId || this.distanceMeters(entityId, target.id) > 1.5) return { ok: false as const, code: 'INVALID_TARGET' };
    }
    this.combat.actionUsed[entityId] = true;
    this.combat.turnActions[entityId] = { actionId: action, label: action, kind: 'basic' };
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
    if (!Number.isInteger(d6) || d6 < 1 || d6 > 6) return false;
    const key = `${attackerId}.${actionId}`;
    if (this.combat.rechargeAttemptTurn[key] === this.combatTurnKey() || this.combat.actionUsed[attackerId]) return false;
    const action = this.combatEntity(attackerId)?.attacks.find(item => item.id === actionId); if (!action?.recharge || this.combat.recharge[attackerId]?.[actionId] !== false) return false;
    this.combat.rechargeAttemptTurn[key] = this.combatTurnKey();
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
  private unlockDefeatedEncounterPassage(){
    const encounter=this.campaign.encounter,creature=this.creature;
    if(!encounter?.defeatUnlockObjectId||!creature||creature.hp>0||encounter.mirrorPlayer&&!creature.mimicOfPlayerId)return;
    const state=this.objectScenes.get(encounter.sceneId),gate=state?.objects.find(o=>o.id===encounter.defeatUnlockObjectId);
    if(!state||!gate||!isDoor(gate)||gate.structure==='destroyed')return;
    // Derived from real HP adjudication. It neither resolves the adventure
    // objective nor picks up the mirror, rolls dice or moves another player.
    gate.structure='destroyed';gate.state='open';gate.version++;state.revision++;
    this.cancelInteractionsForObject(gate.id);this.revision++;this.stateRevision++;
  }
  applyHitPoints(entityId: string, delta: number) {
    if (delta > 0 && this.conditionSourcesFor(entityId).some(source => source.sourceAbility === 'nonlethal-finish')) this.setCombatCondition(entityId, 'inconsciente', false, { condition: 'inconsciente', sourceAbility: 'nonlethal-finish' });
    const character = this.characters.get(entityId);
    if (character) {
      const previousHp = character.hp, incomingDamage = Math.max(0, -delta);
      character.hp = Math.max(0, Math.min(character.maxHp, character.hp + delta));
      if (character.hp <= 0) {
        this.setCombatCondition(entityId, 'inconsciente', true, { condition: 'inconsciente', sourceAbility: 'zero-hp', sourceLabel: 'A 0 PG' });
        this.setCombatCondition(entityId, 'derribada', true);
        if (previousHp === 0 && incomingDamage > 0) { character.deathSaves.failures = Math.min(3, character.deathSaves.failures + 1); character.deathSaves.stable = false; }
        if (incomingDamage - previousHp >= character.maxHp) character.deathSaves.failures = 3;
      } else {
        if (previousHp === 0) {
          const sources = this.conditionSourcesFor(entityId).filter(source => source.condition === 'inconsciente');
          if (!sources.length) this.setCombatCondition(entityId, 'inconsciente', false);
          else this.setCombatCondition(entityId, 'inconsciente', false, { condition: 'inconsciente', sourceAbility: 'zero-hp' });
        }
        character.deathSaves = { successes: 0, failures: 0, stable: false };
      }
      if (character.hp <= 0) { this.clearConditionsFromDefeatedSource(entityId); this.endConcentration(entityId); }
      this.endCombatIfSideDefeated();
      return true;
    }
    if (this.creature?.id === entityId) { this.creature.hp = Math.max(0, Math.min(this.creature.maxHp, this.creature.hp + delta)); if (this.creature.hp <= 0) { this.clearConditionsFromDefeatedSource(entityId); this.endConcentration(entityId);this.unlockDefeatedEncounterPassage(); } this.endCombatIfSideDefeated(); return true; }
    const npc = this.npcs.get(entityId); if (npc) {
      npc.hp = Math.max(0, Math.min(npc.maxHp, npc.hp + delta));
      // A stage actor can be the same person in several scenes.  The pose and
      // position remain scene-local, while health belongs to that one identity.
      for (const counterpart of this.npcs.values()) if (counterpart.id !== npc.id && counterpart.identityId === npc.identityId) {
        counterpart.hp = Math.min(counterpart.maxHp, npc.hp);
        if (delta > 0) this.setCombatCondition(counterpart.id, 'inconsciente', false, { condition: 'inconsciente', sourceAbility: 'nonlethal-finish' });
      }
      if (npc.hp <= 0) { this.clearConditionsFromDefeatedSource(entityId); this.endConcentration(entityId); }
      this.endCombatIfSideDefeated();
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
    this.endCombatIfSideDefeated();
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
    this.syncConditionClocks();
    this.combat.order = this.combat.order.filter(id => id !== entityId);
    for (const record of [this.combat.initiative, this.combat.initiativeSubmitted, this.combat.spentSquares, this.combat.dashSquares, this.combat.actionUsed, this.combat.bonusActionUsed, this.combat.reactionUsed, this.combat.sneakAttackUsed, this.combat.sneakAttackUsedTurn, this.combat.spellSlotUsedTurn, this.combat.stances, this.combat.sequences, this.combat.recharge]) delete record[entityId];
    for (const [id, stance] of Object.entries(this.combat.stances)) if (stance.targetId === entityId) delete this.combat.stances[id];
    for (const [id, sequence] of Object.entries(this.combat.sequences)) if (sequence.targetId === entityId) delete this.combat.sequences[id];
    if (this.combat.openingAction?.attackerId === entityId || this.combat.openingAction?.targetId === entityId) this.combat.openingAction = null;
    // El DM ha adjudicado la salida; el actor sigue en el mapa y conserva PG y efectos.
    if (this.endCombatIfSideDefeated(undefined, `${this.combatEntity(entityId)?.label ?? 'Combatiente'} sale del enfrentamiento por decisión del DM. El combate termina por retirada.`)) return { ok: true as const, code: 'COMBAT_ENDED' };
    if (this.combat.participantIds.length < 2) { this.endCombat(); return { ok: true as const, code: 'COMBAT_ENDED' }; }
    if (this.combat.initiativePending) this.combat.turnIndex = 0;
    else if (currentId === entityId) {
      this.combat.turnIndex = Math.min(previousIndex, this.combat.order.length) - 1;
      this.nextCombatTurn(true);
    } else this.combat.turnIndex = Math.max(0, this.combat.order.indexOf(currentId!));
    this.setCombatEvent(`${this.combatEntity(entityId)?.label ?? 'Combatiente'} sale del combate por decisión del DM.`, 'turn');
    return { ok: true as const, code: 'COMBATANT_WITHDRAWN' };
  }

  cancelCombat() {
    if (!this.combat.active || !this.combat.initiativePending) return false;
    return this.endCombat();
  }

  endCombat(reason?: string, finalEvent?: InternalCombatEvent) {
    if (!this.combat.active || this.combat.pending) return false;
    this.settleGameClock();
    for (const character of this.characters.values()) character.input.held = null;
    this.combat = emptyCombat();
    this.gameClockAnchorMs = Date.now();
    this.syncConditionClocks();
    if (reason) this.combat.lastEvent = finalEvent
      ? { ...finalEvent, text: `${finalEvent.text} ${reason}`, publicText: `${finalEvent.publicText} ${reason}` }
      : { id: crypto.randomUUID(), text: reason, publicText: reason, kind: 'defeat' };
    return true;
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
    const clockSeconds = Math.floor(this.gameClockSecondsAt(now));
    const saveTrack = (track: AudioState['music']) => ({
      playing: track.playing, volume: track.volume,
      offsetSeconds: track.offset + (track.playing && track.startedAt !== null ? Math.max(0, now - track.startedAt) / 1000 * track.rate : 0),
      loop: track.loop, rate: track.rate, repeats: track.repeats,
      ...(track.assetId ? { assetId: track.assetId } : {})
    });
    return durablePayloadSchema.parse({
      sceneId: this.sceneId,
      gameClock: { seconds: Math.floor(clockSeconds), manuallyPaused: this.gameClockManuallyPaused },
      climates: this.campaign.public.scenes.map(scene => ({ sceneId: scene.id, state: this.climateAt(scene.id, clockSeconds) })),
      ...(this.campaign.public.campaignId === 'stormwreck-isle' ? { wreckGridVersion: WRECK_SAVE_GRID_VERSION,retreatGridVersion:RETREAT_SAVE_GRID_VERSION } : {}),
      ...(this.campaign.public.campaignId === 'd8-night-private' ? { d8GridVersion: D8_SAVE_GRID_VERSION } : {}),
      ...(this.campaign.actorLayout?{actorLayoutVersion:this.campaign.actorLayout.version}:{}),
      ...(this.campRest ? { campRest: structuredClone(this.campRest) } : {}),
      ...(this.campActivities.size ? { campActivities: [...this.campActivities].map(([sceneId, interactions]) => ({ sceneId, interactions: structuredClone(interactions) })) } : {}),
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
      camera: { ...this.camera }, environment: { storm:this.environment.storm, stormIntensity:this.environment.stormIntensity, timeOfDay:this.environment.timeOfDay??'auto', precipitation:this.environment.precipitation, precipitationLevel:this.environment.precipitationLevel, windIntensity:this.environment.windIntensity, temperatureC:this.environment.temperatureC??0, fogTarget:this.environment.fogTarget??0, floodTarget:this.environment.floodTarget??0, snowDifficultTerrain:this.environment.snowDifficultTerrain??false, seaIntensity:this.environment.seaIntensity, weatherRules:this.environment.weatherRules??false },
      audio: { music: saveTrack(this.audio.music), layers: {
        ocean: saveTrack(this.audio.layers.ocean), wind: saveTrack(this.audio.layers.wind), wood: saveTrack(this.audio.layers.wood), storm: saveTrack(this.audio.layers.storm)
      }, sfxLoops: Object.fromEntries(Object.entries(this.audio.sfxLoops).map(([id, track]) => [id, saveTrack(track)])) },
      conditions: structuredClone(this.conditions), conditionSources: Object.fromEntries(Object.entries(this.conditionSources).map(([id, sources]) => [id, sources.map(source => ({ ...source, ...(source.expiresAt !== undefined ? { remainingMs: conditionRemainingMs(source, now) } : {}) }))])), concentration: structuredClone(this.concentration),
      visualEffects: structuredClone(this.activeVisualEffects(now)),
      combat: this.combat.active ? { active: true, round: this.combat.round, order: [...this.combat.order], turnIndex: this.combat.turnIndex, participantIds: [...this.combat.participantIds], initiative: { ...this.combat.initiative }, initiativeSubmitted: { ...this.combat.initiativeSubmitted }, initiativePending: this.combat.initiativePending, spentSquares: { ...this.combat.spentSquares }, dashSquares: { ...this.combat.dashSquares }, actionUsed: { ...this.combat.actionUsed }, bonusActionUsed: { ...this.combat.bonusActionUsed }, reactionUsed: { ...this.combat.reactionUsed }, sneakAttackUsed: { ...this.combat.sneakAttackUsed }, sneakAttackUsedTurn: { ...this.combat.sneakAttackUsedTurn }, spellSlotUsedTurn: { ...this.combat.spellSlotUsedTurn }, stances: structuredClone(this.combat.stances), sequences: structuredClone(this.combat.sequences), recharge: structuredClone(this.combat.recharge), rechargeAttemptTurn: { ...this.combat.rechargeAttemptTurn }, turnActions: structuredClone(this.combat.turnActions), openingAction: structuredClone(this.combat.openingAction), pending: structuredClone(this.combat.pending) } : null,
      progress: { ...this.progress }, storyNotes: { ...this.storyNotes }
    });
  }

  restoreDurable(raw: DurablePayload, now = Date.now()) {
    const payload = durablePayloadSchema.parse(structuredClone(raw));
    if ((this.campaign.public.campaignId === 'stormwreck-isle' && (payload.wreckGridVersion ?? 1) > WRECK_SAVE_GRID_VERSION)
      || (this.campaign.public.campaignId === 'stormwreck-isle' && (payload.retreatGridVersion??1)>RETREAT_SAVE_GRID_VERSION)
      || (this.campaign.public.campaignId === 'd8-night-private' && (payload.d8GridVersion ?? 1) > D8_SAVE_GRID_VERSION)
      || (this.campaign.actorLayout && (payload.actorLayoutVersion ?? 1) > this.campaign.actorLayout.version)) {
      throw new Error('SAVE_GEOMETRY_INCOMPATIBLE');
    }
    const beforeMigrations = JSON.stringify(payload);
    if (payload.climates) {
      const ids = payload.climates.map(item => item.sceneId);
      if (new Set(ids).size !== ids.length || ids.some(id => !this.hasScene(id))) throw new Error('SAVE_CLIMATE_SCENES');
    }
    const migratedD8Grid = this.migrateD8NightGrid(payload);
    this.migrateD8NightLegacyRoster(payload);
    this.migrateAuthoredActorLayout(payload);
    migrateRetreatAssembly(payload,this.campaign);
    this.migrateStormwreckScenes(payload);
    this.migrateStormwreckGrid(payload);
    this.migrateStormwreckCabins(payload);
    this.migrateStormwreckHelm(payload);
    this.migrateStormwreckCompactHull(payload);
    this.migrateStormwreckM3Actors(payload);
    this.migrateSavedNpcCells(payload);
    this.migrateStormwreckActorCells(payload);
    this.migrateCampRestLegacyRoomDoors(payload);
    this.migrateCombinedStormwreckCampScenes(payload);
    const migratedObjectInteractions = this.migrateMissingObjectInteractions(payload);
    const migratedCampaignObjects = this.migrateAddedCampaignObjects(payload);
    this.migrateEncounterPassage(payload,raw);
    const migratedPayload = beforeMigrations !== JSON.stringify(payload);
    let migratedCharacterSheets = false;
    const exactIds = (actual: string[], expected: string[]) => actual.length === expected.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
    if (!this.hasScene(payload.sceneId) || !exactIds(payload.characters.map(x => x.id), [...this.characters.keys()]) || !exactIds(payload.scenes.map(x => x.sceneId), [...this.objectScenes.keys()])) throw new Error('SAVE_REFERENCES');
    const activityScenes = new Set<string>();
    for (const activity of payload.campActivities ?? []) {
      if (activityScenes.has(activity.sceneId) || !this.campaign.public.scenes.some(scene => scene.id === activity.sceneId && scene.camp)
        || activity.interactions.some(item => !this.characters.has(item.characterId))) throw new Error('SAVE_CAMP_ACTIVITY');
      activityScenes.add(activity.sceneId);
    }
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
    const savedVisualEffects = payload.visualEffects ?? [];
    const visualEffectIds = new Set<string>();
    for (const effect of savedVisualEffects) {
      const scene = this.campaign.scenes.get(effect.visual.sceneId);
      const definition = actionVisualEffect(effect.actionId);
      if (!validEntityIds.has(effect.ownerId) || effect.visual.entityId && !validEntityIds.has(effect.visual.entityId) ||
          !scene || effect.visual.cell.col >= scene.grid.cols || effect.visual.cell.row >= scene.grid.rows ||
          !definition || definition.type !== effect.visual.type || definition.radiusMeters !== effect.visual.radiusMeters ||
          effect.visual.expiresAt - effect.visual.startedAt !== definition.durationMs || effect.concentration !== (definition.type === 'fog') ||
          visualEffectIds.has(effect.visual.id) || (scene.terrain ? !scene.terrain.surfaces.some(surface => surface.id === effect.visual.surfaceId) : scene.surfaceId !== effect.visual.surfaceId)) throw new Error('SAVE_VISUAL_EFFECT');
      visualEffectIds.add(effect.visual.id);
    }
    for (const id of [...Object.keys(savedConditions), ...Object.keys(savedConditionSources), ...Object.keys(savedConcentration)]) if (!validEntityIds.has(id)) throw new Error('SAVE_CONDITION_ENTITY');
    for (const [id, sources] of Object.entries(savedConditionSources)) {
      const active = new Set(savedConditions[id] ?? []);
      if (sources.some(source => !active.has(source.condition) || source.sourceId && !validEntityIds.has(source.sourceId) || source.roundAnchorId && !validEntityIds.has(source.roundAnchorId))) throw new Error('SAVE_CONDITION_SOURCE');
    }
    if (payload.combat?.active) {
      if (!payload.combat.participantIds.length || !payload.combat.participantIds.every(id => validEntityIds.has(id)) || !exactIds(payload.combat.order, payload.combat.participantIds) || payload.combat.turnIndex >= payload.combat.order.length) throw new Error('SAVE_COMBAT');
      const actionsFor = (id: string) => id === payload.creature?.id && payload.creature.runtimeProfile ? payload.creature.runtimeProfile.attacks : this.combatEntity(id)?.attacks ?? [];
      const basics = new Set(['dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'use-object']);
      for (const [id, used] of Object.entries(payload.combat.turnActions ?? {}))
        if (!validEntityIds.has(id) || (used.kind === 'basic' ? !basics.has(used.actionId) : !actionsFor(id).some(action => action.id === used.actionId))) throw new Error('SAVE_TURN_ACTION');
      const rechargeKeys = new Set([...validEntityIds].flatMap(id => actionsFor(id).filter(action => action.recharge).map(action => `${id}.${action.id}`)));
      if (Object.keys(payload.combat.rechargeAttemptTurn ?? {}).some(key => !rechargeKeys.has(key))) throw new Error('SAVE_RECHARGE_ATTEMPT');
    }
    if (this.campaign.adventure) {
      for (const goal of this.campaign.adventure.objectives)
        if (goal.choices.filter(choice => payload.progress?.[choiceFlag(goal.id, choice.id)]).length > 1) throw new Error('SAVE_STORY_CHOICES');
      if (this.campaign.adventure.endings.filter(ending => payload.progress?.[endingFlag(ending.id)]).length > 1) throw new Error('SAVE_STORY_ENDINGS');
    }
    const savedSfxLoops = payload.audio.sfxLoops ?? {};
    const loopableSfx = new Set((this.campaign.public.audio.library?.sfx ?? []).filter(effect => effect.loopable).map(effect => effect.id));
    if (Object.entries(savedSfxLoops).some(([id, track]) => !loopableSfx.has(id) || track.assetId !== undefined && track.assetId !== id)) throw new Error('SAVE_AUDIO_LOOP');
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
    this.camera = { ...payload.camera }; this.environment = { ...payload.environment, storm: payload.environment.storm, lightning: payload.environment.storm && (payload.environment.stormIntensity ?? .5) >= .45, stormIntensity: payload.environment.stormIntensity ?? 0.5, timeOfDay: payload.environment.timeOfDay ?? 'auto', temperatureC: payload.environment.temperatureC ?? 0, fogTarget: payload.environment.fogTarget ?? 0, floodTarget: payload.environment.floodTarget ?? 0, snowDifficultTerrain: payload.environment.snowDifficultTerrain ?? false, seaIntensity: payload.environment.seaIntensity, weatherRules: payload.environment.weatherRules ?? false };
    if (this.environment.precipitation === 'snow') this.environment.storm = false;
    this.environment.lightning = weatherMode(this.environment) === 'storm';
    this.gameClockSeconds = payload.gameClock?.seconds ?? initialGameTimeSeconds(this.campaign.public.campaignId);
    this.gameClockAnchorMs = now; this.gameClockManuallyPaused = payload.gameClock?.manuallyPaused ?? false; this.gameClockDecisionPauses.clear();
    this.climateStates = new Map(this.campaign.public.scenes.map(scene => [scene.id, emptyClimateState(this.gameClockSeconds)]));
    for (const item of payload.climates ?? []) this.climateStates.set(item.sceneId, { ...item.state });
    this.campRest = payload.campRest ? structuredClone(payload.campRest) : null;
    this.campActivities = new Map((payload.campActivities ?? []).map(activity => [activity.sceneId, structuredClone(activity.interactions)]));
    if (this.campRest) this.campActivities.set(this.campRest.sceneId, structuredClone(this.campRest.interactions));
    const loadTrack = (saved: DurablePayload['audio']['music']) => ({ playing: saved.playing, volume: saved.volume, offset: saved.offsetSeconds, startedAt: saved.playing ? now : null, loop: saved.loop ?? true, rate: saved.rate ?? 1, repeats: saved.repeats ?? 1, ...(saved.assetId ? { assetId: saved.assetId } : {}) });
    this.audio = { music: loadTrack(payload.audio.music), layers: {
      ocean: loadTrack(payload.audio.layers.ocean), wind: loadTrack(payload.audio.layers.wind), wood: loadTrack(payload.audio.layers.wood), storm: loadTrack(payload.audio.layers.storm)
    }, sfxLoops: Object.fromEntries(Object.entries(savedSfxLoops).map(([id, track]) => [id, { ...loadTrack(track), assetId: id }])) };
    this.progress = { ...this.progress, ...(payload.progress ?? {}) };
    this.storyNotes = { ...(payload.storyNotes ?? {}) };
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
    this.visualEffects = structuredClone(savedVisualEffects).filter(effect => effect.visual.expiresAt > now &&
      (!effect.concentration || savedConcentration[effect.ownerId]?.actionId === effect.actionId));
    const restoredStances = Object.fromEntries(Object.entries(payload.combat?.stances ?? {}).flatMap(([id, stance]) => stance.action === 'improvise' ? [] : [[id, stance] as const])) as CombatState['stances'];
    const restoredSequences = Object.fromEntries(Object.entries(payload.combat?.sequences ?? {}).map(([id, sequence]) => [id, { actionId: sequence.actionId, remaining: sequence.remaining, ...(sequence.targetId ? { targetId: sequence.targetId } : {}) }])) as CombatState['sequences'];
    this.combat = payload.combat?.active ? { ...emptyCombat(), active: true, round: payload.combat.round, order: [...payload.combat.order], turnIndex: payload.combat.turnIndex, participantIds: [...payload.combat.participantIds], initiative: { ...payload.combat.initiative }, initiativeSubmitted: { ...(payload.combat.initiativeSubmitted ?? Object.fromEntries(payload.combat.participantIds.map(id => [id, true]))) }, initiativePending: payload.combat.initiativePending ?? false, spentSquares: { ...payload.combat.spentSquares }, dashSquares: { ...(payload.combat.dashSquares ?? {}) }, actionUsed: { ...payload.combat.actionUsed }, bonusActionUsed: { ...(payload.combat.bonusActionUsed ?? {}) }, reactionUsed: { ...(payload.combat.reactionUsed ?? {}) }, sneakAttackUsed: { ...(payload.combat.sneakAttackUsed ?? {}) }, sneakAttackUsedTurn: { ...(payload.combat.sneakAttackUsedTurn ?? {}) }, spellSlotUsedTurn: { ...(payload.combat.spellSlotUsedTurn ?? {}) }, stances: restoredStances, sequences: restoredSequences, recharge: structuredClone(payload.combat.recharge ?? {}), rechargeAttemptTurn: { ...(payload.combat.rechargeAttemptTurn ?? {}) }, turnActions: structuredClone(payload.combat.turnActions ?? {}), openingAction: structuredClone(payload.combat.openingAction ?? null), pending: structuredClone(payload.combat.pending ?? null), lastEvent: { id: crypto.randomUUID(), text: payload.combat.initiativePending ? 'Iniciativa pendiente de completar' : `Ronda ${payload.combat.round} restaurada`, publicText: payload.combat.initiativePending ? 'Iniciativa pendiente de completar' : `Ronda ${payload.combat.round} restaurada`, kind: 'turn' } } : emptyCombat();
    for (const sources of Object.values(this.conditionSources)) for (const source of sources) if (source.expiresAt !== undefined && source.remainingMs !== undefined) source.expiresAt = now + source.remainingMs;
    this.syncConditionClocks(now);
    this.plannedJumps.clear(); this.walkingRunUp.clear();
    this.interactions = []; this.projectorReady = false;
    return migratedPayload || migratedD8Grid || migratedObjectInteractions || migratedCampaignObjects || migratedCharacterSheets
      || raw.gameClock === undefined || raw.climates === undefined;
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
  private sharedCameraOrientations = new Map<SceneId, { step:number; tilt?:number; frame?:SharedCameraFrame }>();
  private cameraSharingEnabled = false;

  constructor(private io: Server, private dmSessionToken: string, bundle: CampaignServerBundle) {
    this.state = new GameState(bundle);
  }

  private dmState(socket?:Socket): DmState {
    const state = this.state.dmState(socket?.data.previewSceneId ?? this.state.sceneId), latest = this.gameplayUndo.at(-1);
    state.gameUndo = { canUndo: Boolean(latest), label: latest?.label ?? null };
    return state;
  }

  private broadcastDmState() {
    for(const socket of this.io.sockets.sockets.values())if(socket.data.role==='dm')socket.emit('dm:state',this.dmState(socket));
  }

  private rememberUndo(label: string, payload: DurablePayload) {
    this.gameplayUndo.push({ label, payload });
    while (this.gameplayUndo.length > 10) this.gameplayUndo.shift();
  }

  installState(candidate: GameState) {
    // Rebind only the currently connected owners from memory, never credentials
    // from a save. This keeps each player on their restored scene immediately.
    const owners = this.state.campaign.public.campaignId === candidate.campaign.public.campaignId
      ? [...this.state.characters.values()].filter(character => character.socketId && character.sessionToken)
        .map(character => ({ id: character.id, socketId: character.socketId!, token: character.sessionToken! })) : [];
    candidate.runtimeEpoch = crypto.randomUUID();
    const audioNow = Date.now();
    for (const track of [candidate.audio.music, ...Object.values(candidate.audio.layers), ...Object.values(candidate.audio.sfxLoops)]) if (track.playing) track.startedAt = audioNow;
    this.state = candidate; this.processedCommands.clear(); this.sessionSockets.clear(); this.gameplayUndo = []; this.sharedCameraOrientations.clear(); this.cameraSharingEnabled = false;
    for (const owner of owners) {
      const connected = this.io.sockets.sockets.get(owner.socketId);
      if (connected?.data.role === 'player' && connected.data.sessionToken === owner.token && candidate.characters.has(owner.id) && candidate.claim(owner.token, owner.socketId, owner.id).ok)
        this.sessionSockets.set(owner.token, owner.socketId);
    }
    for (const connected of this.io.sockets.sockets.values()) connected.data.sceneReadyEpoch = -1;
    this.io.emit('runtime:reset', { runtimeEpoch: candidate.runtimeEpoch, cause: 'restore', reason: 'Partida restaurada. Sincronizando la mesa…' });
    for(const socket of this.io.sockets.sockets.values())if(socket.data.role==='dm'){socket.data.previewSceneId=null;socket.emit('world:snapshot',this.snapshotForSocket(socket));}
    for (const connected of this.io.sockets.sockets.values()) if (connected.data.role === 'player') connected.emit('world:snapshot', this.snapshotForSocket(connected));
    this.io.to('projector').emit('world:snapshot', candidate.publicSnapshot(true));
    this.io.emit('audio:state', { ...candidate.audio, runtimeEpoch: candidate.runtimeEpoch });
    this.broadcastPrivate();
    this.io.to('player').emit('characters:available', { runtimeEpoch: candidate.runtimeEpoch, characters: this.availableCharacters() });
    this.broadcastDmState();
    return candidate.runtimeEpoch;
  }

  private mutatorAllowed(raw: unknown) {
    return Boolean(raw && typeof raw === 'object' && (raw as Record<string, unknown>).runtimeEpoch === this.state.runtimeEpoch);
  }
  private worldOpen() { return !this.persistence || !this.persistence.isClosing && ['ready', 'saving', 'error'].includes(this.persistence.status().mode); }
  private emitResult(socket: Socket, result: CommandResult) {
    return socket.emit('command:result', { ...result, runtimeEpoch: this.state.runtimeEpoch });
  }

  start() {
    this.io.on('connection', socket => this.connect(socket));
    let lastClockCheckpointAt = Date.now();
    this.simulationTimer = setInterval(() => {
      if (!this.worldOpen()) return;
      const before = this.state.stateRevision;
      const beforeScene = this.state.sceneId;
      const changedCharacters = this.state.tick();
      if (this.state.stateRevision !== before) this.persistence?.markDirty();
      if (this.state.sceneId !== beforeScene) void this.persistence?.saveAutomaticNow().catch(() => {});
      const clockNow = Date.now();
      if (this.persistence && clockNow - lastClockCheckpointAt >= 300_000 && this.state.gameClockSnapshot(clockNow).running) {
        lastClockCheckpointAt = clockNow; void this.persistence.saveTime().catch(() => {});
      }
      if (!changedCharacters.size) return;
      // A held movement key creates a new step every few hundred milliseconds.
      // Emit only when a step begins (rather than when it finishes) so player
      // movement has a tactile sound without doubling every footfall.
      this.broadcastSnapshot();
      for (const characterId of changedCharacters) if (this.state.characters.get(characterId)?.step) this.emitMovementSfx(characterId);
      for (const characterId of changedCharacters) this.broadcastPrivateFor(characterId);
      this.broadcastDmState();
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
    if (socket.data.role === 'dm') {
      const snapshot=this.state.publicSnapshot(false,socket.data.previewSceneId??this.state.sceneId,undefined,true);
      if(!snapshot.entities.some(e=>snapshot.combat.participants.some(p=>p.id===e.id)))snapshot.combat={...snapshot.combat,active:false,currentId:null,movement:null,participants:[]};
      return snapshot;
    }
    if (socket.data.role === 'projector') return this.state.publicSnapshot(true, this.state.sceneId);
    const character = this.state.characterForSession(String(socket.data.sessionToken ?? ''));
    const publicScene = this.state.campaign.public.scenes.find(scene => scene.access !== 'authorized')?.id ?? this.state.campaign.public.initialSceneId;
    return this.state.publicSnapshot(true, character?.sceneId ?? publicScene, character?.surfaceId);
  }

  private sendSharedCameraOrientation(socket: Socket, sceneId: SceneId, sceneEpoch: number) {
    if (!this.cameraSharingEnabled) return;
    const orientation = this.sharedCameraOrientations.get(sceneId);
    if (orientation === undefined) return;
    socket.emit('camera:orientation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch, sceneId, ...orientation, profile: CAMERA_ORBIT_PROFILE });
  }

  private handleCameraOrientation(socket: Socket, raw: unknown) {
    if (socket.data.role !== 'dm' || !this.mutatorAllowed(raw) || !raw || typeof raw !== 'object') return;
    const event = raw as Record<string, unknown>;
    if (event.runtimeEpoch !== this.state.runtimeEpoch || event.sceneEpoch !== this.state.sceneEpoch
      || event.sceneId !== this.state.sceneId
      || (event.step !== null && (event.profile !== CAMERA_ORBIT_PROFILE || !validCameraOrbitStep(event.step)
        || (event.tilt !== undefined && !validCameraTiltForScene(String(event.sceneId),event.tilt))
        || (event.frame !== undefined && !validSharedCameraFrame(event.frame))))) return;
    const scene = this.state.campaign.public.scenes.find(candidate => candidate.id === event.sceneId);
    if (!supportsCameraOrientation(scene)) return;
    if (event.step === null) {
      this.cameraSharingEnabled = false;
      this.sharedCameraOrientations.clear();
      this.io.emit('camera:orientation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, sceneId: event.sceneId, step: null });
      return;
    }
    const step = Number(event.step), sceneId = event.sceneId as SceneId;
    const orientation = { step, ...(typeof event.tilt === 'number' ? { tilt:event.tilt } : {}),
      ...(validSharedCameraFrame(event.frame) ? { frame:event.frame } : {}) };
    this.cameraSharingEnabled = true;
    this.sharedCameraOrientations.set(sceneId, orientation);
    this.io.emit('camera:orientation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, sceneId, ...orientation, profile: CAMERA_ORBIT_PROFILE });
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
    socket.emit('runtime:reset', { runtimeEpoch: this.state.runtimeEpoch, cause: 'connection', reason: 'Conexión establecida.' });
    const initialSnapshot = this.snapshotForSocket(socket);
    socket.emit('world:snapshot', initialSnapshot);
    if (socket.data.role !== 'dm') this.sendSharedCameraOrientation(socket, initialSnapshot.sceneId, initialSnapshot.sceneEpoch);
    socket.emit('audio:state', { ...this.state.audio, runtimeEpoch: this.state.runtimeEpoch });
    if (isProjector) socket.emit('save:activity', { runtimeEpoch: this.state.runtimeEpoch, active: this.persistence?.status().mode === 'saving', campaignId: this.state.campaign.public.campaignId });
    socket.on('scene:ready', raw => this.handleSceneReady(socket, sessionToken, raw));

    if (isDm) {
      socket.emit('dm:state', this.dmState(socket));
      socket.on('dm:command', raw => this.handleDm(socket, raw));
      socket.on('dm:view', raw => {
        if(!this.mutatorAllowed(raw)||!raw||typeof raw!=='object')return;
        const sceneId=(raw as {sceneId?:unknown}).sceneId;
        if(sceneId!==null&&(typeof sceneId!=='string'||!this.state.hasScene(sceneId)))return;
        socket.data.previewSceneId=sceneId;
        socket.emit('world:snapshot',this.snapshotForSocket(socket));socket.emit('dm:state',this.dmState(socket));
      });
      socket.on('camera:orientation', raw => this.handleCameraOrientation(socket, raw));
    } else if (isProjector) {
      socket.on('projector:ready', (ready: unknown) => {
        if (!this.mutatorAllowed(ready)) return;
        this.state.projectorReady = (ready as { ready?: unknown }).ready === true;
        this.broadcastDmState();
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
        this.broadcastDmState();
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
      socket.on('player:inventory-use', raw => this.handleInventoryUse(socket, sessionToken, raw));
      socket.on('player:sheet', raw => this.handleCharacterSheet(socket, sessionToken, raw));
    }

    socket.on('disconnect', () => {
      if (socket.data.role === 'dm') this.state.clearClockDecisionPauses(socket.id);
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
      this.broadcastDmState();
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
    // Joining changes the visible party. Send the authoritative world to DM,
    // projector and the other players immediately, not only after movement.
    this.state.revision++;
    this.broadcastSnapshot();
    this.sendSharedCameraOrientation(socket, snapshot.sceneId, snapshot.sceneEpoch);
    this.io.to('player').emit('characters:available', { runtimeEpoch: this.state.runtimeEpoch, characters: this.availableCharacters() });
    this.broadcastDmState();
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
    if (parsed.data.turnOnly) {
      character.input.held = null;
      if (character.step || character.hp <= 0 || this.state.conditionsFor(character.id).some(condition => condition === 'inconsciente' || condition === 'paralizada')) return;
      const facing = directionFromVector(parsed.data.x, parsed.data.z);
      if (!facing || facing === character.facing) return;
      this.state.cancelPlannedJump(character.id);
      character.facing = facing;
      this.state.revision++; this.state.stateRevision++;
      this.persistence?.markDirty();
      this.broadcastSnapshot();
      this.broadcastPrivateFor(character.id);
      this.broadcastDmState();
      return;
    }
    if (parsed.data.end) { character.input.held = null; return; }
    const facing = directionFromVector(parsed.data.x, parsed.data.z);
    if (facing) this.state.cancelPlannedJump(character.id);
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
      this.broadcastDmState();
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
    } else if (parsed.data.type === 'combat:endConcentration') {
      if (!this.state.stopConcentration(character.id)) return finish({ commandId: parsed.data.commandId, ok: false, code: 'NO_CONCENTRATION' });
      resultCode = 'CONCENTRATION_ENDED';
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
    if (pendingBefore && (parsed.data.type === 'combat:rollAttack' || parsed.data.type === 'combat:rollSave' || parsed.data.type === 'combat:rollDamage') && this.combatRollCompletesVisual(pendingBefore, resultCode)) this.emitCombatAnimation(pendingBefore, resultCode !== 'ATTACK_MISSED' && resultCode !== 'SAVE_SUCCESS');
    if (parsed.data.type === 'combat:declare' && resultCode === 'GUIDED_RESOLUTION') this.emitGuidedCombatSound(character.id, parsed.data.actionId);
    finish({ commandId: parsed.data.commandId, ok: true, code: resultCode }); this.broadcastSnapshot(); this.broadcastPrivate(); this.broadcastDmState();
  }

  private handleInventory(socket: Socket, token: string, raw: unknown) {
    const parsed = inventoryUpdateSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success) return this.emitResult(socket, { ok: false, code: 'INVALID_INVENTORY' });
    if (!this.worldOpen()) return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'STALE_RUNTIME' });
    if (!character || character.socketId !== socket.id) return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'INVALID_INVENTORY' });
    const scope = `player:${token}`, previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    if (parsed.data.expectedItems && !inventoryEquals(character.inventory, parsed.data.expectedItems)) {
      const result = this.rememberResult(scope, parsed.data, { commandId: parsed.data.commandId, ok: false, code: 'INVENTORY_CHANGED' });
      this.emitResult(socket, result); this.broadcastPrivateFor(character.id); return;
    }
    const before = this.state.captureDurable();
    character.inventory = [...parsed.data.items]; this.state.revision++; this.state.stateRevision++;
    this.rememberUndo(`${character.label}: mochila`, before); this.persistence?.markDirty();
    const result = this.rememberResult(scope, parsed.data, { commandId: parsed.data.commandId, ok: true, code: 'INVENTORY_SAVED' });
    this.emitResult(socket, result); this.broadcastSnapshot(); this.broadcastPrivateFor(character.id); this.broadcastDmState();
  }

  private handleInventoryUse(socket: Socket, token: string, raw: unknown) {
    const parsed = inventoryUseSchema.safeParse(raw), character = this.state.characterForSession(token);
    if (!parsed.success) return this.emitResult(socket, { ok: false, code: 'INVALID_INVENTORY' });
    if (!this.worldOpen()) return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'SAVE_UNAVAILABLE' });
    if (!this.mutatorAllowed(raw)) return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'STALE_RUNTIME' });
    if (!character || character.socketId !== socket.id) return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'INVALID_INVENTORY' });
    const scope = `player:${token}`, previous = this.previousCommand(scope, parsed.data);
    if (previous.kind === 'same') return this.emitResult(socket, previous.result);
    if (previous.kind === 'reused') return this.emitResult(socket, { commandId: parsed.data.commandId, ok: false, code: 'COMMAND_ID_REUSED' });
    const before = this.state.captureDurable();
    const change = this.state.useBackpackItem(character.id, parsed.data.index, parsed.data.expectedItem, parsed.data.action);
    const result = this.rememberResult(scope, parsed.data, { commandId: parsed.data.commandId, ok: change.ok, code: change.code });
    this.emitResult(socket, result);
    if (!change.ok) { this.broadcastPrivateFor(character.id); return; }
    this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
    this.rememberUndo(`${character.label}: ${parsed.data.action} · mochila`, before);
    this.emitBasicActionAnimation(character.id, 'use-object');
    this.broadcastSnapshot(); this.broadcastPrivateFor(character.id); this.broadcastDmState();
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
    this.emitResult(socket, result); this.broadcastPrivateFor(character.id); this.broadcastDmState();
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
    if(parsed.data.targetId==='temple-prayer'||parsed.data.targetId==='temple-inspiration-spend'){
      const spend=parsed.data.targetId==='temple-inspiration-spend';
      const code=spend?(this.state.blessingFor(character.id)?'INSPIRATION_SPENT':'BLESSING_EXPIRED'):this.state.prayAtShrine(character.id);
      if(code==='INSPIRATION_SPENT'){this.state.progress[`prayer.${character.id}.inspiration`]=false;this.state.revision++;this.state.stateRevision++;}
      finish({commandId:parsed.data.commandId,ok:['INSPIRATION_SPENT','PRAYER_REQUESTED'].includes(code),code});
      if(code==='PRAYER_REQUESTED')this.io.emit('scene:animation',{runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,entityId:character.id,state:'pray',durationMs:6000});
      this.persistence?.markDirty();this.broadcastSnapshot();this.broadcastPrivate();this.broadcastDmState();return;
    }
    const window=this.state.campaign.sceneWindows?.find(window=>parsed.data.targetId===window.id+'.break'||parsed.data.targetId===window.id+'.vault');
    if(window){const breaking=parsed.data.targetId.endsWith('.break'),code=breaking?this.state.breakSceneWindow(character.id,window.id):this.state.jumpThroughSceneWindow(character.id,window.id);finish({commandId:parsed.data.commandId,ok:['WINDOW_BROKEN','JUMP_COMPLETED'].includes(code),code});
      if(code==='WINDOW_BROKEN')this.emitProjectorSfx('d8-night-sfx-cafe-glass');
      if(code==='JUMP_COMPLETED')this.io.emit('scene:animation',{runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,entityId:character.id,state:'jump',durationMs:1000});
      this.persistence?.markDirty();this.broadcastSnapshot();this.broadcastPrivate();this.broadcastDmState();return;}
    const seat=this.state.interactSeat(character.id,parsed.data.targetId);
    if(seat){
      if(!seat.ok)return finish({commandId:parsed.data.commandId,ok:false,code:seat.code});
      this.persistence?.markDirty();finish({commandId:parsed.data.commandId,ok:true,code:seat.code});
      this.broadcastSnapshot();this.broadcastPrivate();this.broadcastDmState();return;
    }
    const sign=this.state.sceneForCharacter(character).readableSigns?.find(sign=>sign.id===parsed.data.targetId);
    if(sign){
      if(character.step||this.state.combat.active||Math.max(Math.abs(sign.cell.col-character.cell.col),Math.abs(sign.cell.row-character.cell.row))>1)return finish({commandId:parsed.data.commandId,ok:false,code:'TOO_FAR'});
      finish({commandId:parsed.data.commandId,ok:true,code:'SIGN_READ'});
      this.io.emit('scene:sign-read',{runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,signId:sign.id,text:sign.text});
      this.io.to(socket.id).emit('player:private',this.state.playerPrivate(token,sign.text));return;
    }
    if (door) {
      if (!door.ok) return finish({ commandId: parsed.data.commandId, ok: false, code: door.code });
      this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code: door.code });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.broadcastSnapshot(); this.broadcastPrivate(); this.broadcastDmState();
      return;
    }
    if(parsed.data.targetId==='scene-animal-distraction'){
      const code=this.state.scareSceneAnimal(character.id);finish({commandId:parsed.data.commandId,ok:code==='ANIMAL_STARTLED',code});
      if(code==='ANIMAL_STARTLED'){
        this.persistence?.markDirty();this.broadcastSnapshot();this.broadcastPrivate();this.broadcastDmState();
        this.io.emit('scene:animation',{runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,entityId:this.state.campaign.proximityEncounter!.distraction!.actorId,state:'react',durationMs:1800});
      }
      return;
    }
    if (parsed.data.targetId === 'wreck-rowboat') {
      const code = this.state.interactRowboat(character.id);
      if (code !== 'ROWBOAT_BOARDED' && code !== 'ROWBOAT_LEFT') return finish({ commandId: parsed.data.commandId, ok: false, code });
      this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code });
      this.broadcastSnapshot(); this.broadcastPrivate(); this.broadcastDmState();
      return;
    }
    if(parsed.data.targetId==='P10'){
      const code=this.state.requestCofaClimb(character.id);finish({commandId:parsed.data.commandId,ok:code==='REQUESTED'||code==='MOVED',code});
      if(code==='MOVED'){this.persistence?.markDirty();this.broadcastSnapshot();this.broadcastPrivate();}
      if(code==='REQUESTED')this.io.to(socket.id).emit('player:private',this.state.playerPrivate(token,'El mástil se inclina y balancea. Tira Fuerza (Atletismo) CD 10 e indica el total al DM; no hay caída ni daño automáticos.'));
      this.broadcastDmState();return;
    }
    if (this.state.sceneForCharacter(character).pickups?.some(pickup => pickup.id === parsed.data.targetId)) {
      const code = this.state.takePickup(character.id, parsed.data.targetId);
      if (code !== 'PICKUP_TAKEN') return finish({ commandId: parsed.data.commandId, ok: false, code });
      this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.broadcastSnapshot(); this.broadcastPrivate(); this.broadcastDmState();
      return;
    }
    if(parsed.data.targetId==='manual-journey-return'||this.state.manualJourneyOptions(character.id,parsed.data.targetId).length){
      const code=this.state.requestManualJourney(character.id,parsed.data.targetId);
      finish({commandId:parsed.data.commandId,ok:code==='REQUESTED',code});
      if(code==='REQUESTED'){
        this.io.emit('scene:animation',{runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,entityId:character.id,state:'interact',durationMs:650});
        this.io.to(socket.id).emit('player:private',this.state.playerPrivate(token,'Has solicitado continuar el viaje. El DM confirma la ruta, el tiempo y los acontecimientos.'));
      }
      this.broadcastDmState();return;
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
      this.broadcastDmState();
      return;
    }
    const mirrorInteraction = this.state.mirrorInteractionFor(character.id, parsed.data.targetId);
    if (mirrorInteraction && this.state.creature) {
      this.state.prepareMirrorEncounter(character.id);
      this.state.creature.visible = true;
      this.state.progress['mirror-revealed'] = true; // Reveal is not completion.
      this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
      finish({ commandId: parsed.data.commandId, ok: true, code: 'INTERACTION_RESOLVED' });
      this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: 'interact', durationMs: 650 });
      this.io.emit('mirror:transformation', { eventId: parsed.data.commandId, serverTime: Date.now(), runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, propId: mirrorInteraction.targetId, sourceId: character.id, reflectionId: this.state.creature.id, frames: mirrorInteraction.effectFrames, durationMs: mirrorInteraction.durationMs ?? 1_600 });
      this.emitProjectorSfx('d8-night-sfx-mirror',parsed.data.commandId);
      this.broadcastSnapshot(); this.broadcastPrivate();
      this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, mirrorInteraction.notice));
      this.broadcastDmState();
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
    this.broadcastDmState();
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
    const result = this.state.applyCampPlayerInteraction(character.id, parsed.data.pointId, parsed.data.activityId);
    if (!result.ok) return finish({ commandId: parsed.data.commandId, ok: false, code: result.code });
    this.persistence?.markDirty();
    finish({ commandId: parsed.data.commandId, ok: true, code: result.code });
    if (result.point.kind !== 'seat') this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: result.activity.animation, durationMs: result.activity.durationMs });
    if (result.activity.id === 'chest-toggle') this.emitProjectorSfx('creak');
    this.broadcastSnapshot();
    this.broadcastPrivate();
    this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, result.notice));
    this.broadcastDmState();
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
      finish({ commandId: parsed.data.commandId, ok: true, code: result.code }); this.broadcastSnapshot(); this.broadcastPrivate(); this.broadcastDmState();
      return;
    }
    if(parsed.data.type==='exploration:check'){
      const data=parsed.data,request=this.state.interactions.find(request=>request.id===data.requestId&&request.characterId===character.id&&request.kind==='proximity-check'&&request.status==='pending'&&request.sceneEpoch===this.state.sceneEpoch);
      if(!request)return finish({commandId:parsed.data.commandId,ok:false,code:'REQUEST_STALE'});
      request.playerTotal=parsed.data.total;finish({commandId:parsed.data.commandId,ok:true,code:'CHECK_SUBMITTED'});this.broadcastPrivate();this.broadcastDmState();return;
    }
    if (parsed.data.type === 'exploration:basic') {
      const result = this.state.declareExplorationBasicAction(character.id, parsed.data.action, parsed.data.targetId, parsed.data.targetCell, parsed.data.jumpMode);
      if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result });
      this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
      // Jump/run-up poses follow authoritative movement steps. Emitting jump
      // here would make the actor leap during the backward preparation.
      if (parsed.data.action !== 'jump') this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: result.action.animation, durationMs: 900 });
      if (result.action.animation === 'interact') this.emitProjectorSfx('d8-night-sfx-world-book-open');
      finish({ commandId: parsed.data.commandId, ok: true, code: result.code });
       const playerNotice = parsed.data.action === 'jump' ? `Salto hacia ${result.targetLabel}.`
         : `${result.action.label} · ${result.targetLabel}. ${result.guidance}`;
       this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, playerNotice));
      this.broadcastDmState();
      this.broadcastSnapshot();this.broadcastPrivate();
      return;
    }
    const result = this.state.declareExplorationAction(character.id, parsed.data.targetId, parsed.data.actionId, parsed.data.targetCell);
    if (!result.ok) return finish({ commandId: parsed.data.commandId, ...result });
    this.state.revision++; this.state.stateRevision++; this.persistence?.markDirty();
    this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: character.id, state: combatActionVisualState({id:result.action.id.replace(/-exploration$/,''),magical:true}), durationMs: 1_000 });
    if (result.action.soundId) this.emitProjectorSfx(result.action.soundId);
    if (!result.action.soundId) this.emitAreaEffect(result.action.id, result.target.cell);
    finish({ commandId: parsed.data.commandId, ok: true, code: result.code });
    this.io.to(socket.id).emit('player:private', this.state.playerPrivate(token, `${result.action.label} sobre ${result.target.label}. ${result.action.guidance}`));
    this.broadcastDmState();
  }

  applyDmCommand(command: DmCommand, decisionSocketId = 'dm'): CommandResult {
    let resultCode = 'APPLIED';
    const staleTypes = new Set(['encounter:reveal', 'story:choice', 'story:ending', 'scene', 'view:focus', 'entity:portal', 'scene:animation', 'creature', 'npc:visible', 'camera', 'environment', 'camp:rest', 'entity:move', 'entity:place', 'resolveInteraction', 'combat:start', 'combat:participant', 'combat:initiative', 'combat:initiativeOrder', 'combat:condition', 'combat:endTurn', 'combat:next', 'combat:end', 'combat:declare', 'combat:basic', 'combat:stand', 'combat:dropProne', 'combat:reaction', 'combat:rollAttack', 'combat:rollDamage', 'combat:rollSave', 'combat:rollDeathSave', 'combat:recharge', 'progress:toggle', 'pickup:take']);
    if ((staleTypes.has(command.type) || command.type==='scene:resolveCheck' || command.type.startsWith('camp:') || command.type==='entity:seat' || command.type.startsWith('combat:')) && 'sceneEpoch' in command && command.sceneEpoch !== this.state.sceneEpoch) {
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
      const result = this.state.traversePort(command.entityId, command.portId, command.direction, command.adjudicate,command.checkTotal);
      if (result !== 'MOVED') return { commandId: command.commandId, ok: false, code: result };
    } else if (command.type === 'creature') {
      const encounter = this.state.campaign.encounter;
      if (!this.state.creature || !encounter) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_ENTITY' };
      if (command.visible && this.state.sceneId !== encounter.sceneId) return { commandId: command.commandId, ok: false, code: 'WRONG_SCENE' };
      if (command.visible && encounter.mirrorPlayer && !this.state.creature.mimicOfPlayerId) {
        const candidates = [...this.state.characters.values()].filter(character => character.sessionToken && character.sceneId === this.state.sceneId);
        if (!command.sourceId && candidates.length !== 1) return { commandId: command.commandId, ok: false, code: 'MIMIC_TARGET_REQUIRED' };
        const source = candidates.find(character => character.id === (command.sourceId ?? candidates[0]?.id));
        if (!source) return { commandId: command.commandId, ok: false, code: 'INVALID_TARGET' };
      }
      if(command.visible&&encounter.mirrorPlayer)this.state.prepareMirrorEncounter(command.sourceId);
      if(command.visible&&encounter.mirrorPlayer)this.state.progress['mirror-revealed']=true;
      if(command.visible&&!isWalkable(this.state.currentScene(),this.state.creature.cell,this.state.publicObjectProps()))return {commandId:command.commandId,ok:false,code:'CREATURE_BLOCKED'};
      this.state.creature.visible = command.visible;
      if (!command.visible) this.state.endCombat();
      if (!command.visible && this.state.camera.focusId === this.state.creature.id) this.state.camera.focusId = null;
    } else if (command.type === 'entity:seat') {
      const character=this.state.characters.get(command.entityId);
      if(!character||character.sceneId!==this.state.sceneId)return {commandId:command.commandId,ok:false,code:'WRONG_SCENE'};
      const result=this.state.interactSeat(command.entityId,command.seatId);if(!result?.ok)return {commandId:command.commandId,ok:false,code:result?.code??'UNKNOWN_SEAT'};
    } else if (command.type === 'npc:visible') {
      if (!this.state.setNpcVisible(command.entityId, command.visible)) return { commandId: command.commandId, ok: false, code: 'INVALID_COMBATANT' };
    } else if (command.type === 'encounter:reveal') {
      if (!this.state.revealEncounterGroup(command.groupId, command.count)) return { commandId: command.commandId, ok: false, code: 'ENCOUNTER_BLOCKED' };
    } else if (command.type === 'camera') {
      const validFocus = command.focusId === null || this.state.characters.has(command.focusId) || this.state.npcs.has(command.focusId) || Boolean(this.state.creature?.visible && command.focusId === this.state.creature.id);
      if (!validFocus) return { commandId: command.commandId, ok: false, code: 'INVALID_FOCUS' };
      this.state.camera = { mode: command.mode, focusId: command.focusId };
    } else if (command.type === 'environment') {
      if (command.trackId && !this.state.campaign.public.audio.library?.ambience.some(track => track.id === command.trackId)) return { commandId: command.commandId, ok: false, code: 'UNKNOWN_AUDIO_TRACK' };
      this.state.applyEnvironmentChange(command);
    } else if (command.type === 'clock:control') {
      const guidedRest = this.state.campRest;
      if ((command.action === 'short-rest' || command.action === 'long-rest') && (this.state.combat.active || Boolean(guidedRest?.phase && !guidedRest.outcome))) return { commandId: command.commandId, ok: false, code: 'REST_ALREADY_IN_PROGRESS' };
      const value = command.action === 'advance' ? command.seconds : command.action === 'set-time' ? command.secondsOfDay : command.action === 'travel' ? command.portId : undefined;
      if (!this.state.applyClockControl(command.action, value)) return { commandId: command.commandId, ok: false, code: 'TRAVEL_TIME_UNAVAILABLE' };
    } else if (command.type === 'clock:decision') {
      this.state.setClockDecisionPause(`${decisionSocketId}:${command.dialogId}`, command.action === 'open');
    } else if (command.type === 'camp:rest') {
      return this.state.applyCampRestCommand(command);
    } else if (command.type === 'camp:interact') {
      const result = this.state.applyCampPlayerInteraction(command.characterId, command.pointId, command.activityId);
      if (!result.ok) return { commandId: command.commandId, ok: false, code: result.code };
      if (result.activity.durationMs) this.io.emit('scene:animation', { runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, entityId: command.characterId, state: result.activity.animation, durationMs: result.activity.durationMs });
      if (result.activity.id === 'chest-toggle') this.emitProjectorSfx('creak');
    } else if (command.type === 'entity:place') {
      const result=this.state.placeEntity(command.entityId,command.sceneId,command.surfaceId,command.cell);
      if(result!=='PLACED')return {commandId:command.commandId,ok:false,code:result};
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
    } else if (command.type === 'scene:resolveCheck') {
      resultCode=this.state.resolveSceneCheck(command.requestId,command.total);
      if(resultCode==='REQUEST_STALE')return {commandId:command.commandId,ok:false,code:resultCode};
      if(resultCode==='BLESSING_GRANTED'){const request=this.state.interactions.find(request=>request.id===command.requestId)!;this.io.emit('scene:reward',{runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,entityId:request.characterId,effect:'inspiration'});}
    } else if (command.type === 'combat:start') {
      if (!this.state.startCombat()) return { commandId: command.commandId, ok: false, code: 'COMBATANTS_REQUIRED' };
    } else if (command.type === 'combat:participant') {
      if (!this.state.setCombatParticipant(command.entityId, command.active)) return { commandId: command.commandId, ok: false, code: 'INVALID_COMBATANT' };
    } else if (command.type === 'combat:initiative') {
      if (!this.state.setInitiative(command.entries)) return { commandId: command.commandId, ok: false, code: 'INVALID_INITIATIVE' };
    } else if (command.type === 'combat:initiativeOrder') {
      if (!this.state.setInitiativeOrder(command.order, command.confirm)) return { commandId: command.commandId, ok: false, code: 'INVALID_INITIATIVE_ORDER' };
    } else if (command.type === 'combat:condition') {
      if (!this.state.setDmCondition(command.entityId, command.condition, command.active, command.durationSeconds, command.expiryTurn)) return { commandId: command.commandId, ok: false, code: 'INVALID_COMBATANT' };
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
    } else if (command.type === 'combat:endConcentration') {
      if (!this.state.stopConcentration(command.entityId)) return { commandId: command.commandId, ok: false, code: 'NO_CONCENTRATION' };
    } else if (command.type === 'combat:withdraw') {
      const result = this.state.withdrawCombatant(command.entityId); if (!result.ok) return { commandId: command.commandId, ...result };
    } else if (command.type === 'combat:declare') {
      const result = this.state.declareCombatAction(command.attackerId, command.targetId, command.actionId, command.useSneakAttack, command.targetCell); if (!result.ok) return { commandId: command.commandId, ...result };
      resultCode = result.code;
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
      // The completion code drives animation and audio after the final die.
      // Flattening it to APPLIED silently suppresses every DM attack visual.
      resultCode = result.code;
    } else if (command.type === 'combat:recharge') {
      if (!this.state.rechargeCombatAction(command.attackerId, command.actionId, command.d6)) return { commandId: command.commandId, ok: false, code: 'RECHARGE_INVALID' };
    } else if (command.type === 'progress:toggle') {
      const code = this.state.applyWreckProgressToggle(command.flag, command.value);
      if (code !== 'APPLIED') return { commandId: command.commandId, ok: false, code };
    } else if (command.type === 'story:choice') {
      const code = this.state.resolveAdventureChoice(command.objectiveId, command.choiceId, command.note, command.override);
      if (code !== 'APPLIED') return { commandId: command.commandId, ok: false, code };
    } else if (command.type === 'story:ending') {
      const code = this.state.resolveAdventureEnding(command.endingId, command.reason, command.override);
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
      if(request.kind==='journey')return this.state.objectCommandResult(command.commandId,false,'INVALID_TRANSITION');
      const result = this.state.applyObjectCommand({ type: 'object:detach', commandId: command.commandId, sceneEpoch: command.sceneEpoch, objectRevision: command.objectRevision, objectId: request.targetId, cell: command.cell!, rotation: command.rotation!, outcome: command.result });
      if (result.ok) request.status = 'resolved';
      return result;
    }
    this.state.revision++;
    return { commandId: command.commandId, ok: true, code: resultCode };
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
    } else result = this.applyDmCommand(command, socket.id);
    const durableChanged = result.ok && command.type !== 'sfx' && command.type !== 'release' && command.type !== 'clock:decision' && JSON.stringify(before) !== JSON.stringify(this.state.captureDurable(captureAt));
    if (durableChanged) {
      if (this.state.stateRevision === priorRevision) this.state.stateRevision++;
      this.persistence?.markDirty();
      if (command.type !== 'audio' && command.type !== 'game:undo') this.rememberUndo(command.type, before);
    }
    if (durableChanged && (before.sceneId !== this.state.sceneId || command.type === 'story:choice' || command.type === 'story:ending' || command.type === 'combat:start' || command.type === 'combat:end')) void this.persistence?.saveAutomaticNow().catch(() => {});
    this.emitResult(socket, this.rememberResult(scope, command, result));
    if (!result.ok) {
      if (objectCommand && (result.code === 'STALE_OBJECTS' || result.code === 'REQUEST_STALE')) socket.emit('dm:state', this.dmState(socket));
      return;
    }
    if (pendingBefore && result.ok && (command.type === 'combat:rollAttack' || command.type === 'combat:rollSave' || command.type === 'combat:rollDamage') && this.combatRollCompletesVisual(pendingBefore, result.code)) this.emitCombatAnimation(pendingBefore, result.code !== 'ATTACK_MISSED' && result.code !== 'SAVE_SUCCESS');
    if (command.type === 'combat:basic') this.emitBasicActionAnimation(command.attackerId, command.action);
    if (command.type === 'combat:declare' && result.code === 'GUIDED_RESOLUTION') this.emitGuidedCombatSound(command.attackerId, command.actionId);
    if (command.type === 'scene') {
      for (const connected of this.io.sockets.sockets.values()) connected.data.sceneReadyEpoch = -1;
    }
    if (command.type === 'audio' || command.type === 'audio:select' || command.type === 'audio:mix' || command.type === 'sfx:loop' || command.type === 'environment' || command.type === 'scene' || command.type === 'view:focus') this.io.emit('audio:state', { ...this.state.audio, runtimeEpoch: this.state.runtimeEpoch });
    if (command.type === 'sfx') this.emitProjectorSfx(command.sfxId, command.commandId);
    if(command.type==='creature'&&command.visible&&this.state.creature?.mimicOfPlayerId&&this.state.campaign.mirrorInteraction){
      const mirror=this.state.campaign.mirrorInteraction;
      this.io.emit('mirror:transformation',{eventId:command.commandId,serverTime:Date.now(),runtimeEpoch:this.state.runtimeEpoch,sceneEpoch:this.state.sceneEpoch,propId:mirror.targetId,sourceId:this.state.creature.mimicOfPlayerId,reflectionId:this.state.creature.id,frames:mirror.effectFrames,durationMs:mirror.durationMs??1600});
      this.emitProjectorSfx('d8-night-sfx-mirror',command.commandId);
    }
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
    this.broadcastDmState();
  }

  private broadcastSnapshot() {
    this.lastSnapshotRevision = this.state.revision;
    for(const socket of this.io.sockets.sockets.values())if(socket.data.role==='dm')socket.emit('world:snapshot',this.snapshotForSocket(socket));
    this.io.to('projector').emit('world:snapshot', this.state.publicSnapshot(true));
    for (const socket of this.io.sockets.sockets.values()) if (socket.data.role === 'player') socket.emit('world:snapshot', this.snapshotForSocket(socket));
  }

  private emitCombatAnimation(pending: PendingCombatResolution, hit: boolean) {
    const action = this.state.combatEntity(pending.attackerId)?.attacks.find(item => item.id === pending.actionId);
    const animationType = visualAnimationType(action);
    this.io.emit('combat:animation', {
      runtimeEpoch: this.state.runtimeEpoch, sceneEpoch: this.state.sceneEpoch, attackerId: pending.attackerId, targetId: pending.targetId,
      bodyState: action ? combatActionVisualState(action, animationType) : undefined,
      type: animationType, hit,
      sneakAttack: Boolean(pending.sneakAttackDice),
      frozen: pending.attackerId === this.state.creature?.id && this.state.campaign.encounter?.mirrorPlayer === true
    });
    if (!action?.soundId && (animationType === 'arrow' || animationType === 'radiantArrow')) {
      const runtimeEpoch = this.state.runtimeEpoch, sceneEpoch = this.state.sceneEpoch;
      this.emitProjectorSfx('d8-night-sfx-bow-release');
      if (animationType === 'radiantArrow') this.emitProjectorSfx('d8-night-sfx-magic-spark');
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

  private combatRollCompletesVisual(pending: PendingCombatResolution, resultCode: string) {
    // A hit still needs its damage roll. Play the attack only once that result
    // is in; a miss has no follow-up roll, so its d20 completes the action.
    if (pending.stage === 'attack') return resultCode === 'ATTACK_MISSED' || resultCode === 'ATTACK_RESOLVED';
    if (pending.stage === 'save') return resultCode === 'SAVE_SUCCESS' || resultCode === 'SAVE_FAILED';
    if (pending.stage === 'damage') return resultCode === 'ATTACK_RESOLVED';
    return false;
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
    // The authoritative snapshot now carries the effect and its actual lifetime.
    // Keeping only the sound here avoids duplicate clouds and lost reconnects.
    this.emitProjectorSfx('d8-night-sfx-spell-arcane');
  }

  private emitGuidedCombatSound(entityId: string, actionId: string) {
    const action = this.state.combatEntity(entityId)?.attacks.find(candidate => candidate.id === actionId);
    if (action?.soundId) this.emitProjectorSfx(action.soundId);
    else if (action?.magical) this.emitProjectorSfx('d8-night-sfx-spell-arcane');
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
