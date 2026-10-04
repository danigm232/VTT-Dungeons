import { basicCombatActionAnimationStates, explorationBasicActionCatalogue } from '../shared/protocol';
import type { AttackAnimationType, CombatAction, DmState, WorldSnapshot } from '../shared/protocol';
import type { PublicCampaignDefinition } from '../shared/campaign';

export type VisualAction = { id: string; label: string; state: string; group: string; coverage: 'own' | 'reused' | 'missing'; attackType?: AttackAnimationType; soundId?: string; effect?: 'fog' | 'feather' | 'spark' | 'mirror'; count?: number };
export const visualStateLabels: Record<string, string> = { idle: 'Reposo', moving: 'Caminar', running: 'Correr', attack: 'Atacar', 'attack-arrow': 'Disparar arco', 'attack-throw': 'Lanzar arma', spell: 'Conjurar', talk: 'Hablar', interact: 'Interactuar', search: 'Buscar', study: 'Examinar', ready: 'Preparar', dodge: 'Esquivar', disengage: 'Destrabarse', stealth: 'Esconderse', jump: 'Saltar', climb: 'Trepar', swim: 'Nadar', hit: 'Recibir impacto', fall: 'Caer', prone: 'Derribado', defeated: 'Inconsciente', stand: 'Levantarse', wake: 'Despertar', sit: 'Sentarse', give: 'Entregar', argue: 'Discutir', negotiate: 'Negociar', react: 'Reaccionar', serve: 'Servir', drink: 'Beber', 'combat-idle': 'Guardia', transform: 'Transformarse', copy: 'Reflejar', activate: 'Activar', entangle: 'Enredar', resist: 'Resistirse', 'throw-cow': 'Lanzar vaca', 'guide-cow': 'Guiar vaca', 'receive-coins': 'Recibir monedas', 'receive-cow': 'Recibir vaca', 'give-beans': 'Dar judías', 'give-steak': 'Dar filete' };
export const visualFacingLabels: Record<string, string> = { n: 'Norte', ne: 'Noreste', e: 'Este', se: 'Sureste', s: 'Sur', sw: 'Suroeste', w: 'Oeste', nw: 'Noroeste' };
export function visualStateLabel(name: string): string {
  const match = /^(direction|moving|running|attack)-(n|ne|e|se|s|sw|w|nw)$/.exec(name);
  if (match) return `${match[1] === 'direction' || match[1] === 'moving' ? 'Caminar' : match[1] === 'running' ? 'Correr' : 'Atacar'} · ${visualFacingLabels[match[2]!]}`;
  return visualStateLabels[name] ?? name.replace(/[-_]+/g, ' ');
}
/** Public entities are authoritative. Stage actors include hidden/private NPCs. */
export function visibleAuditActors(snapshot: WorldSnapshot | null, campaignId: string) {
  return campaignId === 'd8-night-private' && snapshot ? [...new Map(snapshot.entities.filter(entity => entity.sceneId === snapshot.sceneId).map(entity => [entity.id, entity])).values()] : [];
}
export function resolveVisualState(states: Record<string, unknown>, state: string, direction = 's'): string | null {
  const prefix = state === 'moving' ? 'direction' : state;
  for (const candidate of [`${state}-${direction}`, `${prefix}-${direction}`, state]) if (states[candidate]) return candidate;
  return null;
}
export function auditActions(entity: { id: string; tokenId: string; kind: string }, snapshot: WorldSnapshot, dm: DmState | null, campaign: PublicCampaignDefinition): VisualAction[] {
  const states = snapshot.tokenAssets.tokenAnimations[entity.tokenId] ?? campaign.tokenAnimations[entity.tokenId] ?? {};
  const fingerprint = (key: string) => JSON.stringify(states[key]?.frames ?? []);
  const signatureOwners = new Map<string, string>();
  const result: VisualAction[] = [];
  const add = (id: string, label: string, state: string, group: string, extra: Partial<VisualAction> = {}) => {
    const chosen = resolveVisualState(states, state), signature = chosen ? fingerprint(chosen) : '';
    const sharedState = chosen && Object.keys(states).some(other => other !== chosen && !/-(n|ne|e|se|s|sw|w|nw)$/.test(other) && fingerprint(other) === signature);
    result.push({ id, label, state, group, coverage: !chosen ? 'missing' : signatureOwners.has(signature) || sharedState ? 'reused' : 'own', ...extra });
    if (chosen) signatureOwners.set(signature, id);
  };
  for (const name of ['idle', 'moving', 'running', 'jump', 'climb', 'swim', 'hit', 'fall', 'prone', 'defeated', 'stand']) add(`pose:${name}`, visualStateLabel(name), name, 'Movimiento y estados');
  const basicLabels: Record<string, string> = { dash: 'Correr', disengage: 'Destrabarse', dodge: 'Esquivar', help: 'Ayudar', hide: 'Esconderse', influence: 'Influir', magic: 'Magia (gesto)', ready: 'Preparar', search: 'Buscar', study: 'Estudiar', 'use-object': 'Usar objeto' };
  for (const [id, state] of Object.entries(basicCombatActionAnimationStates)) add(`basic:${id}`, basicLabels[id]!, state, 'Acciones universales');
  const own = dm?.animationAudit?.find(actor => actor.id === entity.id);
  if (entity.kind === 'player') {
    for (const [id, action] of Object.entries(explorationBasicActionCatalogue)) {
      if (!own || own.explorationBasics.includes(id as keyof typeof explorationBasicActionCatalogue)) add(`explore:${id}`, action.label, action.animation, 'Fuera de combate');
    }
    for (const action of own?.explorationActions ?? []) {
      const text = `${action.id} ${action.label}`.toLowerCase();
      add(`explore-spell:${action.id}`, action.label, 'spell', 'Fuera de combate', { effect: /pluma|feather/.test(text) ? 'feather' : /niebla|fog/.test(text) ? 'fog' : 'spark' });
    }
  }
  const attacks: CombatAction[] = own?.attacks ?? dm?.npcs.find(npc => npc.id === entity.id)?.attacks ?? dm?.combat.participants.find(actor => actor.id === entity.id)?.attacks ?? [];
  for (const action of attacks) {
    const text = `${action.id} ${action.label}`.toLowerCase(), type = action.animationType ?? (action.magical ? 'magicalProjectile' : 'melee');
    const state = type === 'arrow' || type === 'radiantArrow' ? 'attack-arrow' : type === 'thrownWeapon' ? 'attack-throw' : type === 'melee' ? 'attack' : 'spell';
    add(`attack:${action.id}`, action.label, state, 'Ataques y conjuros de la ficha', { attackType: type, soundId: action.soundId, count: /magic-missile|proyectiles? m[aá]gicos?/.test(text) ? 3 : action.attackCount ?? 1, ...(/niebla|fog/.test(text) ? { effect: 'fog' as const } : /pluma|feather/.test(text) ? { effect: 'feather' as const } : {}) });
  }
  // Older running servers do not publish the DM-only catalogue yet.
  if (entity.kind === 'player' && !own && !attacks.length) {
    const sheet = dm?.characters.find(actor => actor.id === entity.id)?.sheet;
    for (const [index, label] of (sheet?.attacks ?? []).entries()) add(`sheet-attack:${index}`, label, /arco/.test(label.toLowerCase()) ? 'attack-arrow' : 'attack', 'Ficha (compatibilidad)', { attackType: /arco/.test(label.toLowerCase()) ? 'arrow' : 'melee' });
    for (const [index, label] of (sheet?.spells ?? []).entries()) add(`sheet-spell:${index}`, label, 'spell', 'Ficha (compatibilidad)', { effect: /niebla/.test(label.toLowerCase()) ? 'fog' : /pluma/.test(label.toLowerCase()) ? 'feather' : 'spark' });
  }
  for (const name of Object.keys(states)) add(`clip:${name}`, visualStateLabel(name), name, /-(n|ne|e|se|s|sw|w|nw)$/.test(name) ? 'Direcciones PNG' : 'Secuencias PNG');
  if (snapshot.props.some(prop => /mirror|espejo/i.test(`${prop.id} ${prop.label}`))) add('mirror:copy', 'Espejo → reflejo de este personaje', 'idle', 'Escenario', { effect: 'mirror' });
  return result;
}

export function previewFrame(elapsed: number, fps: number, frames: number, loop: boolean) {
  const frame = Math.max(0, Math.floor(elapsed * Math.max(1, fps) / 1000));
  return frames > 0 ? loop ? frame % frames : Math.min(frames - 1, frame) : 0;
}
