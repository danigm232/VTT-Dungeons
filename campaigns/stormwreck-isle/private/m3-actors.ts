import type { CombatProfile, PrivateActorDefinition } from '../../../engine/server/campaign.js';
import { wreckCellAtMeters } from '../public/wreck-runtime.js';
import { retreatCellAtMeters } from '../public/retreat-runtime.js';

// Basic Rules 2014 creature profiles. Encounter counts remain a DM choice:
// C4 reveals two zombies at level 1 or three at level 2; C8 reveals one or
// three plus the ghoul; upper decks reveal one or two harpies.
export const zombieCombatProfile: CombatProfile = {
  armorClass: 8, speedMeters: 6, maxHp: 22, initiativeBonus: -2,
  attacks: [{ id: 'zombie-slam', label: 'Golpe · +3 · 1d6+1 contundente', attackBonus: 3, damageDice: '1d6', damageBonus: 1,
    damageType: 'contundente', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-zombie-groan' }],
  traits: ['Fortaleza de no muerto: si queda a 0 PG, el DM resuelve la salvación de Constitución CD 5 + daño recibido; no se automatiza.'],
  ruleTraits: { darkvisionMeters: 18 }, damageImmunities: ['veneno'], conditionImmunities: ['envenenada']
};
const zombie = zombieCombatProfile;
const ghoul: CombatProfile = {
  armorClass: 12, speedMeters: 9, maxHp: 22, initiativeBonus: 2,
  attacks: [
    { id: 'ghoul-bite', label: 'Mordisco · +2 · 2d6+2 perforante', attackBonus: 2, damageDice: '2d6', damageBonus: 2,
      damageType: 'perforante', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-undead-cry' },
    { id: 'ghoul-claws', label: 'Garras · +4 · 2d4+2 cortante', attackBonus: 4, damageDice: '2d4', damageBonus: 2,
      damageType: 'cortante', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-undead-cry' }
  ],
  traits: ['Garras: tras impactar a una criatura no elfa ni no muerta, Constitución CD 10. Fallo: parálisis hasta 1 minuto; repetir salvación al final de cada turno. Resolver y marcar en mesa.'],
  ruleTraits: { darkvisionMeters: 18 }, damageImmunities: ['veneno'], conditionImmunities: ['envenenada']
};
const harpy: CombatProfile = {
  armorClass: 11, speedMeters: 6, maxHp: 38, initiativeBonus: 1, ruleTraits: { flightMeters: 12 },
  attacks: [
    { id: 'harpy-claws', label: 'Garras · +3 · 2d4+1 cortante', attackBonus: 3, damageDice: '2d4', damageBonus: 1,
      damageType: 'cortante', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'd8-night-sfx-attack-swing' },
    { id: 'harpy-club', label: 'Porra · +3 · 1d4+1 contundente', attackBonus: 3, damageDice: '1d4', damageBonus: 1,
      damageType: 'contundente', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'd8-night-sfx-attack-swing' }
  ],
  traits: ['Vuelo 12 m. Canto cautivador: el DM resuelve objetivos y salvaciones según la aventura; no hay IA ni aplicación automática.']
};

const actor = (id: string, label: string, tokenId: string, sceneId: string, surfaceId: string,
  x: number, z: number, profile: CombatProfile, color: string): PrivateActorDefinition =>
  ({ id, label, tokenId, sceneId, surfaceId, cell: wreckCellAtMeters(x, z), profile, color });

export const wreckM3Actors: PrivateActorDefinition[] = [
  actor('c4-zombie-1', 'Marinero ahogado · C4 I', 'zombie', 'wreck-ship', 'main', -12, -3, zombie, '#718f7d'),
  actor('c4-zombie-2', 'Marinero ahogado · C4 II', 'zombie', 'wreck-ship', 'main', -9, -4.5, zombie, '#718f7d'),
  actor('c4-zombie-3', 'Marinero ahogado · C4 III', 'zombie', 'wreck-ship', 'main', -13.5, -1.5, zombie, '#718f7d'),
  actor('c8-zombie-1', 'Marinero ahogado · C8 I', 'zombie', 'wreck-ship', 'lower-deck', -16.5, -6, zombie, '#718f7d'),
  actor('c8-zombie-2', 'Marinero ahogado · C8 II', 'zombie', 'wreck-ship', 'lower-deck', -13.5, 5, zombie, '#718f7d'),
  actor('c8-zombie-3', 'Marinero ahogado · C8 III', 'zombie', 'wreck-ship', 'lower-deck', 19.5, 4, zombie, '#718f7d'),
  actor('c8-ghoul', 'Gul de la cubierta inferior', 'ghoul', 'wreck-ship', 'lower-deck', 8, -1.5, ghoul, '#c7d8dc'),
  // Both stay hidden until the DM stages the return. The resident's starting
  // address is the crow's nest; the level-2 reinforcement waits by the C2
  // ballista, as described in chapter 3 (not on the C3 quarterdeck).
  actor('upper-harpy-1', 'Arpía · cofa / regreso a C1', 'harpy', 'wreck-ship', 'crow', 1.5, 0, harpy, '#b76d50'),
  actor('upper-harpy-2', 'Arpía adicional · balista C2 (nivel 2)', 'harpy', 'wreck-ship', 'c2', 24, 0, harpy, '#b76d50')
];

/** Three hidden beach zombies from the official opening encounter. The DM
 * reveals them at the table when the party starts up from the shore. */
export const retreatOpeningZombies: PrivateActorDefinition[] = [
  [-34.5, 14.25], [-33, 15.75], [-36, 12.75]
].map(([x, z], index) => ({
  id: `retreat-beach-zombie-${index + 1}`, label: `Marinero ahogado · playa ${index + 1}`,
  tokenId: 'zombie', color: '#718f7d', sceneId: 'dragon-rest', surfaceId: 'beach',
  cell: retreatCellAtMeters('beach', x!, z!), profile: zombieCombatProfile
}));
