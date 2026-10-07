import type { PublicCampaignDefinition, PublicSceneDefinition } from '../shared/campaign.js';
import { explorationBasicActionCatalogue, type ExplorationAction, type ExplorationBasicAction } from '../shared/protocol.js';
import { cellKey, footprintFor } from '../shared/geometry.js';
import { validatePublicCampaign } from '../shared/campaign.js';
import { adventureDefinitionSchema, type AdventureDefinition } from '../shared/adventure.js';

export type CharacterSheet = {
  level: number;
  armorClass: number;
  speedMeters: number;
  /** Optional until transcribed from a verified character sheet. */
  strengthScore?: number;
  background: string;
  features: string[];
  attacks: string[];
  spells: string[];
  /** Transcripción estructurada de los apartados privados de la ficha. */
  details?: Array<{ title: string; entries: string[] }>;
};
export type CombatResourceSeed = { label: string; current: number; max: number };
export type CombatActionSeed = {
  id: string; label: string; attackBonus: number; damageDice: string; damageBonus?: number; damageType?: string;
  range?: { kind: 'melee' | 'ranged'; normalMeters: number; longMeters?: number };
  save?: { ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'; dc: number; failureCondition?: 'envenenada' | 'apresada' | 'agarrada' | 'derribada' | 'asustada' | 'inconsciente' | 'oculta' | 'invisible' | 'restringida' | 'hechizada' | 'paralizada'; escapeDc?: number; endsWhenSourceDefeated?: boolean };
  attackCount?: number; recharge?: { minimum: number; maximum: number }; finesse?: boolean; automaticHit?: boolean; lockSequenceTarget?: boolean; resource?: { id: string; cost: number }; inventoryCost?: 'arrow' | 'dagger';
  animationType?: 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile';
  resolution?: 'attack' | 'automatic-damage' | 'guided'; actionCost?: 'action' | 'bonus' | 'reaction'; targeting?: 'creature' | 'point'; guidance?: string; concentration?: boolean; magical?: boolean; soundId?: string;
};
export type RuleTraits = { sneakAttackDice?: string; brave?: boolean; poisonResilience?: boolean; darkvisionMeters?: number; magicResistance?: boolean; flightMeters?: number };
export type CombatProfile = { armorClass: number; speedMeters: number; maxHp: number; initiativeBonus?: number; spellAttackBonus?: number; spellSaveDc?: number; attacks: CombatActionSeed[]; startsVisible?: boolean; startsInCombat?: boolean; identityId?: string; traits?: string[]; ruleTraits?: RuleTraits; damageResistances?: string[]; damageImmunities?: string[]; conditionImmunities?: Array<'envenenada' | 'apresada' | 'agarrada' | 'derribada' | 'asustada' | 'inconsciente' | 'oculta' | 'invisible' | 'restringida' | 'hechizada' | 'paralizada'> };
export type ExplorationActionSeed = ExplorationAction;
export type CharacterPrivateSeed = { maxHp: number; initialHp?: number; inventory: string[]; sheet?: CharacterSheet; combatResources?: Record<string, CombatResourceSeed>; combat?: Omit<CombatProfile, 'maxHp'>; explorationActions?: ExplorationActionSeed[]; explorationBasics?: ExplorationBasicAction[] };
export type CreatureSheet = {
  armorClass: number;
  speedMeters: number;
  maxHp: number;
  traits: string[];
  actions: string[];
  combat?: Omit<CombatProfile, 'maxHp'>;
};
export type EncounterDefinition = {
  sceneId: string;
  creature: { id: string; label: string; tokenId: string; color: string; cell: { col: number; row: number }; sheet?: CreatureSheet };
  note: string;
  mirrorPlayer?: boolean;
};
/** Enemies prepared for the DM. Unlike stageActors, their identity and
 * starting coordinates are never included in the public campaign definition. */
export type PrivateActorDefinition = {
  id: string; label: string; tokenId: string; color: string; sceneId: string; surfaceId: string;
  cell: { col: number; row: number }; profile: CombatProfile;
};
export type WheelInteractionDefinition = { sceneId: string; targetId: string; cells: Array<{ col: number; row: number }>; nearbyLabel: string; note: string };
/** Un objeto escénico que revela una réplica del PJ que lo activa. El objeto
 * nunca se convierte en PNJ ni en participante de combate. */
export type MirrorInteractionDefinition = { sceneId: string; targetId: string; cells: Array<{ col: number; row: number }>; nearbyLabel: string; notice: string; effectFrames: string[]; durationMs?: number };
/** Interacción de proximidad con un PNJ de escena. Su reacción es visual y no
 * resuelve diálogo, tiradas ni progreso narrativo por cuenta propia. */
export type StageActorInteractionDefinition = { sceneId: string; targetId: string; surfaceId?: string; cells: Array<{ col: number; row: number }>; nearbyLabel: string; responseAnimation: string; notice: string; durationMs?: number };
export type MapAddress = { mapId: string; zoneId: string; surfaceId: string; cell: { col: number; row: number } };
export type PortDefinition = {
  id: string; from: MapAddress; to: MapAddress;
  mode: 'rigging' | 'stairs' | 'road' | 'door' | 'rope-ladder' | 'hatch' | 'hole' | 'swim';
  return: 'explicit' | 'adjudicated'; conditionId?: string;
  /** Restricts automatic traversal to a direction; manual adjudication remains available. */
  autoDirection?: 'both' | 'forward' | 'manual';
  /** Continuous physical approach before an automatic road transition. */
  minimumApproachSteps?: number;
};
export type InteractiveObjectDefinition =
  | { sceneId: string; objectId: string; kind: 'barred-door'; barrier: 'barred' | 'removed' }
  | { sceneId: string; objectId: string; kind: 'trap-stash'; revealed: boolean; open: boolean; trap: 'armed' | 'spent'; lootId: string; lootLabel: string }
  | { sceneId: string; objectId: string; kind: 'container'; open: boolean; lootId: string; lootLabel: string }
  | { sceneId: string; objectId: string; kind: 'chest'; open: boolean; location: 'submerged' | 'surface'; package: 'contained' | 'released' | 'taken'; lootId: string; lootLabel: string; packageId: string; packageLabel: string };
export type CampaignServerBundle = {
  public: PublicCampaignDefinition;
  campaignStateVersion?: number;
  characters: Record<string, CharacterPrivateSeed>;
  encounter?: EncounterDefinition;
  privateActors?: PrivateActorDefinition[];
  encounterGroups?: Array<{ id: string; label: string; sceneId: string; actorIds: string[] }>;
  combatProfiles?: Record<string, CombatProfile>;
  wheelInteraction?: WheelInteractionDefinition;
  mirrorInteraction?: MirrorInteractionDefinition;
  stageActorInteractions?: StageActorInteractionDefinition[];
  adventure?: AdventureDefinition;
  doorStates?: Record<string, Record<string, 'open' | 'closed' | 'locked'>>;
  ports?: PortDefinition[];
  interactiveObjects?: InteractiveObjectDefinition[];
};
export type SceneDefinition = PublicSceneDefinition & { terrainWalkable: ReadonlySet<string> };
export type CompiledCampaign = Omit<CampaignServerBundle, 'public'> & { public: PublicCampaignDefinition; scenes: ReadonlyMap<string, SceneDefinition> };

export function compileCampaignBundle(input: CampaignServerBundle): CompiledCampaign {
  const publicDefinition = validatePublicCampaign(input.public);
  const errors: string[] = [];
  if (input.campaignStateVersion !== undefined && (!Number.isSafeInteger(input.campaignStateVersion) || input.campaignStateVersion < 1)) errors.push('campaignStateVersion inválida');
  const sceneIds = new Set(publicDefinition.scenes.map(scene => scene.id));
  if (input.adventure) {
    const parsed = adventureDefinitionSchema.safeParse(input.adventure);
    if (!parsed.success) errors.push('Definición de aventura inválida');
    else {
      const objectives = new Set(parsed.data.objectives.map(item => item.id)), endings = new Set(parsed.data.endings.map(item => item.id));
      if (objectives.size !== parsed.data.objectives.length || endings.size !== parsed.data.endings.length || Object.keys(parsed.data.sceneGuidance ?? {}).some(id => !sceneIds.has(id))
        || parsed.data.objectives.some(item => !sceneIds.has(item.sceneId) || item.requires.some(id => !objectives.has(id) || id === item.id)
          || new Set(item.choices.map(choice => choice.id)).size !== item.choices.length || item.choices.some(choice => !endings.has(choice.endingId) || `story.${item.id}.${choice.id}`.length > 40))) errors.push('Referencias de aventura inválidas');
    }
  }
  for (const actor of publicDefinition.roster) {
    const seed = input.characters[actor.id];
    if (!seed || !Number.isInteger(seed.maxHp) || seed.maxHp < 1 || seed.initialHp !== undefined && (!Number.isInteger(seed.initialHp) || seed.initialHp < 0 || seed.initialHp > seed.maxHp) || !Array.isArray(seed.inventory) || seed.inventory.some(item => typeof item !== 'string')) errors.push(`Semilla privada inválida para ${actor.id}`);
    else if (seed.sheet && (!Number.isInteger(seed.sheet.level) || seed.sheet.level < 1 || !Number.isInteger(seed.sheet.armorClass) || seed.sheet.armorClass < 1 || !Number.isFinite(seed.sheet.speedMeters) || seed.sheet.speedMeters <= 0 || [seed.sheet.background, ...seed.sheet.features, ...seed.sheet.attacks, ...seed.sheet.spells, ...(seed.sheet.details ?? []).flatMap(section => [section.title, ...section.entries])].some(value => typeof value !== 'string' || value.length > 500) || (seed.sheet.details?.some(section => !section.title || !Array.isArray(section.entries) || section.entries.length > 24) ?? false))) errors.push(`Hoja privada inválida para ${actor.id}`);
    if (seed?.combat && !validCombatProfile({ ...seed.combat, maxHp: seed.maxHp })) errors.push(`Perfil de combate inválido para ${actor.id}`);
    if (seed?.combatResources && Object.entries(seed.combatResources).some(([id, resource]) => !/^[a-z0-9][a-z0-9._-]{0,39}$/.test(id) || !resource || typeof resource.label !== 'string' || resource.label.length > 80 || !Number.isInteger(resource.current) || !Number.isInteger(resource.max) || resource.current < 0 || resource.max < 0 || resource.current > resource.max)) errors.push(`Recursos de combate inválidos para ${actor.id}`);
    if (seed?.explorationActions && !validExplorationActions(seed.explorationActions)) errors.push(`Acciones de exploración inválidas para ${actor.id}`);
    if (seed?.explorationBasics && (!Array.isArray(seed.explorationBasics) || seed.explorationBasics.length > 20
      || new Set(seed.explorationBasics).size !== seed.explorationBasics.length
      || seed.explorationBasics.some(action => !(action in explorationBasicActionCatalogue)))) errors.push(`Acciones básicas de exploración inválidas para ${actor.id}`);
  }
  if (Object.keys(input.characters).some(id => !publicDefinition.roster.some(actor => actor.id === id))) errors.push('Semilla privada sin personaje público');
  if (input.encounter) {
    const scene = publicDefinition.scenes.find(candidate => candidate.id === input.encounter?.sceneId);
    if (!scene) errors.push('Escena del encuentro inexistente');
    else if (!scene.walkable.some(cell => cellKey(cell) === cellKey(input.encounter!.creature.cell))) errors.push('Criatura del encuentro fuera de suelo transitable');
    if (!publicDefinition.tokens[input.encounter.creature.tokenId]) errors.push('Token del encuentro inexistente');
    if (publicDefinition.roster.some(actor => actor.id === input.encounter?.creature.id)) errors.push('ID de criatura duplicado con un personaje');
    const sheet = input.encounter.creature.sheet;
    if (sheet && (!Number.isInteger(sheet.maxHp) || sheet.maxHp < 1 || !Number.isInteger(sheet.armorClass) || sheet.armorClass < 1 || !Number.isFinite(sheet.speedMeters) || sheet.speedMeters <= 0 || [...sheet.traits, ...sheet.actions].some(value => typeof value !== 'string' || value.length > 200) || (sheet.combat && !validCombatProfile({ ...sheet.combat, maxHp: sheet.maxHp })))) errors.push('Hoja de criatura inválida');
  }
  const knownCombatIds = new Set([...publicDefinition.roster.map(actor => actor.id), ...publicDefinition.scenes.flatMap(scene => (scene.stageActors ?? []).map(actor => actor.id)), ...(input.encounter ? [input.encounter.creature.id] : [])]);
  for (const group of input.encounterGroups ?? []) {
    const actorIds = new Set([...(publicDefinition.scenes.find(scene => scene.id === group.sceneId)?.stageActors ?? []).map(actor => actor.id), ...(input.privateActors ?? []).filter(actor => actor.sceneId === group.sceneId).map(actor => actor.id)]);
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(group.id) || !group.label || group.label.length > 160 || !sceneIds.has(group.sceneId) || group.actorIds.length > 20 || new Set(group.actorIds).size !== group.actorIds.length || group.actorIds.some(id => !actorIds.has(id))) errors.push('Grupo de encuentro inválido');
  }
  if (new Set((input.encounterGroups ?? []).map(group => group.id)).size !== (input.encounterGroups ?? []).length) errors.push('ID de grupo duplicado');
  const privateIds = new Set<string>();
  for (const actor of input.privateActors ?? []) {
    const scene = publicDefinition.scenes.find(candidate => candidate.id === actor.sceneId);
    const surface = scene?.terrain?.surfaces.find(candidate => candidate.id === actor.surfaceId);
    const walkable = surface?.tiles.map(tile => tile.cell) ?? (scene?.surfaceId === actor.surfaceId ? scene.walkable : []);
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(actor.id) || knownCombatIds.has(actor.id) || privateIds.has(actor.id)) errors.push(`ID de actor privado duplicado o inválido: ${actor.id}`);
    privateIds.add(actor.id);
    if (!scene || !walkable.some(cell => cellKey(cell) === cellKey(actor.cell))) errors.push(`Actor privado fuera de superficie: ${actor.id}`);
    if (!publicDefinition.tokens[actor.tokenId]) errors.push(`Token de actor privado inexistente: ${actor.id}`);
    if (!actor.label || actor.label.length > 80 || !/^#[0-9a-fA-F]{6}$/.test(actor.color) || !validCombatProfile(actor.profile)) errors.push(`Perfil de actor privado inválido: ${actor.id}`);
  }
  for (const [id, profile] of Object.entries(input.combatProfiles ?? {})) if (!knownCombatIds.has(id) || !validCombatProfile(profile)) errors.push(`Perfil de combate inválido para ${id}`);
  if (input.wheelInteraction) {
    const scene = publicDefinition.scenes.find(candidate => candidate.id === input.wheelInteraction?.sceneId);
    if (!scene || !scene.props.some(prop => prop.kind === 'wheel' && prop.id === input.wheelInteraction?.targetId)) errors.push('Interacción de timón sin prop público');
    else if (input.wheelInteraction.cells.some(cell => !scene.walkable.some(walkable => cellKey(walkable) === cellKey(cell)))) errors.push('Interacción de timón fuera de suelo transitable');
  }
  if (input.mirrorInteraction) {
    const interaction = input.mirrorInteraction, scene = publicDefinition.scenes.find(candidate => candidate.id === interaction.sceneId);
    if (!input.encounter?.mirrorPlayer || !scene || !scene.props.some(prop => prop.id === interaction.targetId)) errors.push('Interacción de espejo sin objeto o encuentro de reflejo');
    else if (!interaction.cells.length || interaction.cells.some(cell => !scene.walkable.some(walkable => cellKey(walkable) === cellKey(cell)))) errors.push('Interacción de espejo fuera de suelo transitable');
    if (!interaction.nearbyLabel || interaction.nearbyLabel.length > 80 || !interaction.notice || interaction.notice.length > 240 || !Array.isArray(interaction.effectFrames) || interaction.effectFrames.length < 1 || interaction.effectFrames.length > 12 || interaction.effectFrames.some(frame => !/^\/art\/[\p{L}\p{N}._,/ &-]+$/u.test(frame))) errors.push('Efecto visual de espejo inválido');
    if (interaction.durationMs !== undefined && (!Number.isInteger(interaction.durationMs) || interaction.durationMs < 250 || interaction.durationMs > 10_000)) errors.push('Duración de espejo inválida');
  }
  for (const interaction of input.stageActorInteractions ?? []) {
    const scene = publicDefinition.scenes.find(candidate => candidate.id === interaction.sceneId);
    const actor = scene?.stageActors?.find(candidate => candidate.id === interaction.targetId);
    if (!scene || !actor) { errors.push(`Interacción de PNJ sin actor público: ${interaction.sceneId}/${interaction.targetId}`); continue; }
    const surfaceId = interaction.surfaceId ?? actor.surfaceId ?? scene.surfaceId;
    const surfaceCells = scene.terrain?.surfaces.find(candidate => candidate.id === surfaceId && !candidate.visualOnly)?.tiles.map(tile => tile.cell)
      ?? (surfaceId === scene.surfaceId ? scene.walkable : []);
    if (surfaceId !== (actor.surfaceId ?? scene.surfaceId) || !interaction.cells.length
      || interaction.cells.some(cell => !surfaceCells.some(walkable => cellKey(walkable) === cellKey(cell))))
      errors.push(`Interacción de PNJ fuera de suelo transitable: ${interaction.targetId}`);
    if (!interaction.nearbyLabel || interaction.nearbyLabel.length > 80 || !interaction.notice || interaction.notice.length > 240) errors.push(`Texto de interacción de PNJ inválido: ${interaction.targetId}`);
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(interaction.responseAnimation) || !publicDefinition.tokenAnimations[actor.tokenId]?.[interaction.responseAnimation]) errors.push(`Reacción visual inexistente para ${interaction.targetId}`);
    if (interaction.durationMs !== undefined && (!Number.isInteger(interaction.durationMs) || interaction.durationMs < 250 || interaction.durationMs > 10_000)) errors.push(`Duración de interacción de PNJ inválida: ${interaction.targetId}`);
  }
  if (input.doorStates) for (const [sceneId, states] of Object.entries(input.doorStates)) {
    const scene = publicDefinition.scenes.find(candidate => candidate.id === sceneId);
    if (!scene) { errors.push(`Override de puerta en escena inexistente: ${sceneId}`); continue; }
    for (const [objectId, state] of Object.entries(states)) {
      if (!scene.props.some(prop => prop.kind === 'door' && prop.id === objectId)) errors.push(`Override de puerta sin puerta pública: ${sceneId}/${objectId}`);
      if (!['open', 'closed', 'locked'].includes(state)) errors.push(`Estado privado de puerta inválido: ${sceneId}/${objectId}`);
    }
  }
  const terrainHas = (address: MapAddress) => {
    const scene = publicDefinition.scenes.find(candidate => candidate.id === address.mapId);
    if (!scene) return false;
    if (!scene.terrain) return scene.surfaceId === address.surfaceId && scene.walkable.some(cell => cellKey(cell) === cellKey(address.cell));
    return Boolean(scene.terrain.surfaces.find(surface => surface.id === address.surfaceId)?.tiles.some(tile => cellKey(tile.cell) === cellKey(address.cell)));
  };
  const portIds = new Set<string>();
  for (const port of input.ports ?? []) {
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/i.test(port.id) || portIds.has(port.id)) errors.push(`Puerto duplicado o inválido: ${port.id}`);
    portIds.add(port.id);
    if(port.minimumApproachSteps!==undefined&&(!Number.isInteger(port.minimumApproachSteps)||port.minimumApproachSteps<1||port.minimumApproachSteps>20||port.mode!=='road'))errors.push(`Aproximación de camino inválida: ${port.id}`);
    if (!terrainHas(port.from) || !terrainHas(port.to)) errors.push(`Puerto fuera de una superficie: ${port.id}`);
    if (port.from.mapId === port.to.mapId && port.from.surfaceId === port.to.surfaceId && cellKey(port.from.cell) === cellKey(port.to.cell)) errors.push(`Puerto sin desplazamiento: ${port.id}`);
  }
  const interactiveKeys = new Set<string>();
  for (const interaction of input.interactiveObjects ?? []) {
    const key = `${interaction.sceneId}/${interaction.objectId}`;
    const scene = publicDefinition.scenes.find(candidate => candidate.id === interaction.sceneId);
    const prop = scene?.props.find(candidate => candidate.id === interaction.objectId);
    if (!scene || !prop || interactiveKeys.has(key)) { errors.push(`Interactivo inválido o duplicado: ${key}`); continue; }
    interactiveKeys.add(key);
    if (interaction.kind === 'barred-door' && prop.kind !== 'door') errors.push(`Listón sin puerta: ${key}`);
    if (interaction.kind !== 'barred-door' && prop.kind !== 'crate') errors.push(`Interactivo de botín sin contenedor: ${key}`);
    for (const value of 'lootId' in interaction ? [interaction.lootId, interaction.lootLabel, ...('packageId' in interaction ? [interaction.packageId, interaction.packageLabel] : [])] : []) if (!value || value.length > 160) errors.push(`Dato privado de interactivo inválido: ${key}`);
  }
  for (const scene of publicDefinition.scenes) {
    const walkable = new Set(scene.walkable.map(cellKey));
    for (const spawn of scene.spawns) if (!walkable.has(cellKey(spawn))) errors.push(`Spawn no transitable en ${scene.id}`);
    for (const actor of scene.stageActors ?? []) {
      const actorSurfaceId = actor.surfaceId ?? scene.surfaceId;
      const actorSurface = scene.terrain?.surfaces.find(surface => surface.id === actorSurfaceId && !surface.visualOnly);
      if (scene.terrain ? !actorSurface?.tiles.some(tile => cellKey(tile.cell) === cellKey(actor.cell))
        : actorSurfaceId !== scene.surfaceId || !walkable.has(cellKey(actor.cell)))
        errors.push(`Actor de escena fuera de suelo transitable: ${scene.id}/${actor.id}`);
    }
    const occupied = new Set<string>();
    for (const prop of scene.props) {
      if (prop.kind === 'wheel') {
        const propSurfaceId = prop.surfaceId ?? scene.surfaceId;
        const propSurfaceExists = scene.terrain
          ? scene.terrain.surfaces.some(surface => surface.id === propSurfaceId && !surface.visualOnly)
          : propSurfaceId === scene.surfaceId;
        const wheelCells = footprintFor(prop.cell, prop.rotation, prop.baseFootprint);
        const mountCells = footprintFor(prop.mount.cell, 0, prop.mount.footprint);
        if (wheelCells.length !== mountCells.length || wheelCells.some(cell => !mountCells.some(mount => cellKey(mount) === cellKey(cell)))) errors.push(`Timón ${prop.id} no coincide con su soporte en ${scene.id}`);
        if (!propSurfaceExists) errors.push(`Soporte ${prop.id} fuera de superficie en ${scene.id}/${propSurfaceId}`);
        for (const cell of mountCells) {
          const key = `${propSurfaceId}:${cellKey(cell)}`; if (occupied.has(key)) errors.push(`Soporte solapado en ${scene.id}:${key}`); occupied.add(key);
          if (propSurfaceId === scene.surfaceId && scene.spawns.some(spawn => cellKey(spawn) === cellKey(cell))) errors.push(`Soporte ${prop.id} ocupa spawn en ${scene.id}`);
        }
        continue;
      }
      const propSurfaceId = prop.surfaceId ?? scene.surfaceId;
      const propWalkable = scene.terrain ? new Set(scene.terrain.surfaces.find(surface => surface.id === propSurfaceId)?.tiles.map(tile => cellKey(tile.cell)) ?? []) : walkable;
      for (const cell of footprintFor(prop.cell, prop.rotation, prop.baseFootprint)) {
        const key = `${propSurfaceId}:${cellKey(cell)}`;
        if (!propWalkable.has(cellKey(cell))) errors.push(`Objeto ${prop.id} fuera de suelo en ${scene.id}/${propSurfaceId}`);
        if (occupied.has(key)) errors.push(`Objetos solapados en ${scene.id}:${key}`);
        occupied.add(key);
        if (scene.spawns.some(spawn => cellKey(spawn) === key)) errors.push(`Objeto ${prop.id} ocupa spawn en ${scene.id}`);
      }
    }
  }
  if (errors.length) throw new Error(`Bundle de campaña inválido:\n- ${errors.join('\n- ')}`);
  return {
    public: structuredClone(publicDefinition),
    adventure: input.adventure ? structuredClone(input.adventure) : undefined,
    encounterGroups: input.encounterGroups ? structuredClone(input.encounterGroups) : undefined,
    characters: structuredClone(input.characters), encounter: input.encounter ? structuredClone(input.encounter) : undefined,
    privateActors: input.privateActors ? structuredClone(input.privateActors) : undefined,
    combatProfiles: input.combatProfiles ? structuredClone(input.combatProfiles) : undefined,
    wheelInteraction: input.wheelInteraction ? structuredClone(input.wheelInteraction) : undefined,
    mirrorInteraction: input.mirrorInteraction ? structuredClone(input.mirrorInteraction) : undefined,
    stageActorInteractions: input.stageActorInteractions ? structuredClone(input.stageActorInteractions) : undefined,
    doorStates: input.doorStates ? structuredClone(input.doorStates) : undefined,
    ports: input.ports ? structuredClone(input.ports) : undefined,
    interactiveObjects: input.interactiveObjects ? structuredClone(input.interactiveObjects) : undefined,
    scenes: new Map(publicDefinition.scenes.map(scene => [scene.id, { ...structuredClone(scene), terrainWalkable: new Set(scene.walkable.map(cellKey)) }]))
  };
}

function validExplorationActions(actions: ExplorationActionSeed[]) {
  return Array.isArray(actions) && actions.length <= 30 && new Set(actions.map(action => action.id)).size === actions.length && actions.every(action =>
    /^[a-z0-9][a-z0-9._-]{0,39}$/.test(action.id) && typeof action.label === 'string' && action.label.length > 0 && action.label.length <= 100
    && (action.kind === 'cantrip' || action.kind === 'spell') && ['object', 'living', 'any', 'point', 'self', 'none'].includes(action.target)
    && Number.isFinite(action.rangeMeters) && action.rangeMeters >= 0 && action.rangeMeters <= 1_000
    && typeof action.guidance === 'string' && action.guidance.length > 0 && action.guidance.length <= 500
    && (action.castingTime === undefined || typeof action.castingTime === 'string' && action.castingTime.length > 0 && action.castingTime.length <= 80)
    && (action.ritual === undefined || typeof action.ritual === 'boolean')
    && (action.concentration === undefined || typeof action.concentration === 'boolean')
    && (action.soundId === undefined || /^[a-z0-9][a-z0-9._-]{0,39}$/.test(action.soundId))
    && (action.resource === undefined || /^[a-z0-9][a-z0-9._-]{0,39}$/.test(action.resource.id) && Number.isInteger(action.resource.cost) && action.resource.cost >= 1 && action.resource.cost <= 9)
  );
}

function validCombatProfile(profile: CombatProfile) {
  return Number.isInteger(profile.maxHp) && profile.maxHp > 0 && Number.isInteger(profile.armorClass) && profile.armorClass > 0 && Number.isFinite(profile.speedMeters) && profile.speedMeters > 0
    && (profile.initiativeBonus === undefined || Number.isInteger(profile.initiativeBonus)) && (profile.spellAttackBonus === undefined || Number.isInteger(profile.spellAttackBonus)) && (profile.spellSaveDc === undefined || Number.isInteger(profile.spellSaveDc) && profile.spellSaveDc >= 1 && profile.spellSaveDc <= 30) && (profile.startsVisible === undefined || typeof profile.startsVisible === 'boolean') && (profile.startsInCombat === undefined || typeof profile.startsInCombat === 'boolean')
    && (profile.identityId === undefined || /^[a-z0-9][a-z0-9._-]{0,39}$/.test(profile.identityId))
    && (profile.traits === undefined || Array.isArray(profile.traits) && profile.traits.length <= 30 && profile.traits.every(value => typeof value === 'string' && value.length > 0 && value.length <= 200))
    && (profile.ruleTraits === undefined || ((profile.ruleTraits.sneakAttackDice === undefined || /^\d+d\d{1,3}$/.test(profile.ruleTraits.sneakAttackDice)) && (profile.ruleTraits.brave === undefined || typeof profile.ruleTraits.brave === 'boolean') && (profile.ruleTraits.poisonResilience === undefined || typeof profile.ruleTraits.poisonResilience === 'boolean') && (profile.ruleTraits.darkvisionMeters === undefined || Number.isFinite(profile.ruleTraits.darkvisionMeters) && profile.ruleTraits.darkvisionMeters > 0) && (profile.ruleTraits.magicResistance === undefined || typeof profile.ruleTraits.magicResistance === 'boolean') && (profile.ruleTraits.flightMeters === undefined || Number.isFinite(profile.ruleTraits.flightMeters) && profile.ruleTraits.flightMeters > 0)))
    && [profile.damageResistances, profile.damageImmunities].every(values => values === undefined || Array.isArray(values) && values.length <= 30 && values.every(value => typeof value === 'string' && value.length > 0 && value.length <= 40))
    && (profile.conditionImmunities === undefined || Array.isArray(profile.conditionImmunities) && profile.conditionImmunities.length <= 11 && profile.conditionImmunities.every(value => ['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'inconsciente', 'oculta', 'invisible', 'restringida', 'hechizada', 'paralizada'].includes(value)))
    && Array.isArray(profile.attacks) && profile.attacks.length <= 12
    && profile.attacks.every(attack => /^[a-z0-9][a-z0-9._-]{0,39}$/.test(attack.id) && typeof attack.label === 'string' && attack.label.length > 0 && attack.label.length <= 200 && Number.isInteger(attack.attackBonus) && /^\d+d\d{1,3}$/.test(attack.damageDice) && (attack.damageBonus === undefined || Number.isInteger(attack.damageBonus)) && (attack.damageType === undefined || typeof attack.damageType === 'string' && attack.damageType.length <= 40)
      && (attack.range === undefined || (['melee', 'ranged'].includes(attack.range.kind) && Number.isFinite(attack.range.normalMeters) && attack.range.normalMeters > 0 && (attack.range.longMeters === undefined || Number.isFinite(attack.range.longMeters) && attack.range.longMeters >= attack.range.normalMeters)))
      && (attack.save === undefined || (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(attack.save.ability) && Number.isInteger(attack.save.dc) && attack.save.dc >= 1 && attack.save.dc <= 30 && (attack.save.failureCondition === undefined || ['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'inconsciente', 'oculta', 'invisible', 'restringida', 'hechizada', 'paralizada'].includes(attack.save.failureCondition)) && (attack.save.escapeDc === undefined || Number.isInteger(attack.save.escapeDc) && attack.save.escapeDc >= 1 && attack.save.escapeDc <= 30) && (attack.save.endsWhenSourceDefeated === undefined || typeof attack.save.endsWhenSourceDefeated === 'boolean')))
      && (attack.attackCount === undefined || Number.isInteger(attack.attackCount) && attack.attackCount >= 1 && attack.attackCount <= 6)
      && (attack.recharge === undefined || Number.isInteger(attack.recharge.minimum) && Number.isInteger(attack.recharge.maximum) && attack.recharge.minimum >= 1 && attack.recharge.maximum <= 6 && attack.recharge.minimum <= attack.recharge.maximum)
      && (attack.finesse === undefined || typeof attack.finesse === 'boolean') && (attack.automaticHit === undefined || typeof attack.automaticHit === 'boolean') && (attack.lockSequenceTarget === undefined || typeof attack.lockSequenceTarget === 'boolean') && (attack.resource === undefined || /^[a-z0-9][a-z0-9._-]{0,39}$/.test(attack.resource.id) && Number.isInteger(attack.resource.cost) && attack.resource.cost >= 1 && attack.resource.cost <= 9) && (attack.inventoryCost === undefined || ['arrow', 'dagger'].includes(attack.inventoryCost)) && (attack.animationType === undefined || ['melee', 'arrow', 'thrownWeapon', 'radiantArrow', 'vine', 'fireProjectile', 'magicalProjectile'].includes(attack.animationType))
      && (attack.resolution === undefined || ['attack', 'automatic-damage', 'guided'].includes(attack.resolution)) && (attack.actionCost === undefined || ['action', 'bonus', 'reaction'].includes(attack.actionCost)) && (attack.targeting === undefined || ['creature', 'point'].includes(attack.targeting)) && (attack.targeting !== 'point' || attack.resolution === 'guided') && (attack.guidance === undefined || typeof attack.guidance === 'string' && attack.guidance.length > 0 && attack.guidance.length <= 500) && (attack.concentration === undefined || typeof attack.concentration === 'boolean') && (attack.magical === undefined || typeof attack.magical === 'boolean') && (attack.soundId === undefined || /^[a-z0-9][a-z0-9._-]{0,39}$/.test(attack.soundId)));
}
