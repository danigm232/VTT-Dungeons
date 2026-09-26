import type { CampaignServerBundle } from '../../engine/server/campaign.js';
import { privateCharacterSeeds, privateEncounterSeed } from './private/seed.js';
import { publicCampaignDefinition } from './public/pack.js';
import { wreckCellFromLocal, wreckPorts } from './public/wreck-runtime.js';
import { retreatOpeningZombies, wreckM3Actors } from './private/m3-actors.js';
import { dragonRestPorts, retreatStageActorInteractions } from './public/retreat-runtime.js';

export const stormwreckBundle: CampaignServerBundle = {
  public: publicCampaignDefinition,
  // El campo sceneId por PJ es opcional al decodificar: los guardados 0.3
  // heredan payload.sceneId y por eso no requieren una ruptura de estado.
  campaignStateVersion: 1,
  ports: [...wreckPorts, ...dragonRestPorts],
  privateActors: [...wreckM3Actors, ...retreatOpeningZombies],
  stageActorInteractions: retreatStageActorInteractions,
  interactiveObjects: [
    { sceneId: 'wreck-ship', objectId: 'c4-barred-door', kind: 'barred-door', barrier: 'barred' },
    { sceneId: 'wreck-ship', objectId: 'c6-trapped-stash', kind: 'trap-stash', revealed: false, open: false, trap: 'armed', lootId: 'c6-gold-pouch', lootLabel: 'Bolsa con 200 po' },
    { sceneId: 'wreck-ship', objectId: 'c8-container-01', kind: 'container', open: false, lootId: 'c8-unassigned-01', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c8-container-02', kind: 'container', open: false, lootId: 'c8-unassigned-02', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c8-container-03', kind: 'container', open: false, lootId: 'c8-unassigned-03', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c8-barrel-01', kind: 'container', open: false, lootId: 'c8-unassigned-04', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c8-barrel-02', kind: 'container', open: false, lootId: 'c8-unassigned-05', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c8-barrel-03', kind: 'container', open: false, lootId: 'c8-unassigned-06', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c8-barrel-04', kind: 'container', open: false, lootId: 'c8-unassigned-07', lootLabel: 'Botín de C8 sin resultado asignado' },
    { sceneId: 'wreck-ship', objectId: 'c9-iron-chest', kind: 'chest', open: false, location: 'submerged', package: 'contained', lootId: 'c9-chest-treasure', lootLabel: 'Tesoro C9: 55 po, 3 turquesas (10 po cada una) y botas élficas', packageId: 'c9-waxed-package', packageLabel: 'Paquete encerado' }
  ],
  // La ficha privada conserva equipo y ataques con valores de hoja. Las
  // pruebas de habilidad que la aventura deja abiertas siguen en manos del DM.
  characters: Object.fromEntries(Object.entries(privateCharacterSeeds).map(([id, seed]) => [id, {
    maxHp: seed.maxHp, inventory: [...seed.inventory],
    ...(seed.combat ? { combat: structuredClone(seed.combat) } : {}),
    ...(seed.explorationBasics ? { explorationBasics: [...seed.explorationBasics] } : {}),
    sheet: { ...seed.sheet, features: [...seed.sheet.features], attacks: [...seed.sheet.attacks], spells: [...seed.sheet.spells], ...(seed.sheet.details ? { details: structuredClone(seed.sheet.details) } : {}) }
  }])),
  encounter: { sceneId: 'wreck-ship', creature: { ...privateEncounterSeed.creature, cell: wreckCellFromLocal(25, 7) }, note: privateEncounterSeed.notes.creature },
  doorStates: { 'wreck-objects': { 'practice-door': 'locked' }, 'dragon-rest': { 'a4-library-door': 'closed' } },
  wheelInteraction: {
    sceneId: 'wreck-ship', targetId: 'wheel', cells: [wreckCellFromLocal(3, 7), wreckCellFromLocal(4, 6), wreckCellFromLocal(5, 7), wreckCellFromLocal(4, 8)],
    nearbyLabel: 'Timón del pecio', note: privateEncounterSeed.notes.wheel
  }
};
