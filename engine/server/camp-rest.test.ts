import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { campRestsBundle } from '../../campaigns/camp-rests/server.js';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';
import { createCampVisuals } from '../../campaigns/camp-rests/public/visuals.js';
import { buildTerrain3D } from '../client/terrain3d.js';
import { surfaceNeighbors } from '../shared/terrain.js';
import { dmCommandSchema, type DmCommand } from '../shared/protocol.js';
import { durablePayloadSchema } from './persistence/schema.js';
import { GameState } from './game.js';
import { resolveStep } from './navigation.js';

const knownCampIds = ['camp-a1-rooms', 'camp-forest-pleamar', 'camp-wreck-beach', 'camp-cliffs-observatory', 'camp-coastal-refuge'];
const act = (state: GameState, action: Extract<DmCommand, { type: 'camp:rest' }>['action'], fields: Record<string, unknown> = {}) => state.applyCampRestCommand({
  commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, sceneId: state.sceneId, type: 'camp:rest', action, ...fields
} as Extract<DmCommand, { type: 'camp:rest' }>);

describe('módulo autónomo de campamentos', () => {
  it('publica sólo los cinco escenarios, cuadrícula de 1,5 m y el grupo existente', () => {
    const campaign = campRestsBundle.public;
    expect(campaign.scenes.map(scene => scene.id)).toEqual(knownCampIds);
    expect(campRestsBundle.public.campaignId).toBe('camp-rests');
    expect(campRestsBundle.ports ?? []).toEqual([]);
    expect(new Set(campRestsBundle.public.roster.map(actor => actor.id))).toEqual(new Set(Object.keys(campRestsBundle.characters)));
    for (const scene of campaign.scenes) {
      expect(scene.camp).toBeDefined();
      expect(scene.terrain?.tileMeters).toBe(1.5);
      expect(scene.renderer).toBe('babylon-hd2d');
      expect(scene.camp?.interactionPoints.length).toBeGreaterThan(0);
      expect(scene.terrain?.obstacles?.every(obstacle => !scene.walkable.some(cell => cell.col === obstacle.cell.col && cell.row === obstacle.cell.row))).toBe(true);
    }
    const rooms = campaign.scenes[0]!;
    expect(rooms.title).toContain('Habitaciones A1');
    expect(rooms.camp?.canonStatus).toBe('canon');
    expect(rooms.props).toHaveLength(0);
    expect(rooms.camp?.interactionPoints.filter(point => point.kind === 'bed')).toHaveLength(6);
    expect(rooms.camp?.interactionPoints.map(point => point.cell)).toEqual([6, 11, 16, 21, 26, 31].map(col => ({ col, row: 5 })));
    expect(campaign.scenes.some(scene => /dragon-rest|wreck-ship|monastery/i.test(scene.id))).toBe(false);
  });

  it('representa A1 con seis entradas abiertas en línea y el camino compartido delante', () => {
    const state = new GameState(campRestsBundle); state.changeScene('camp-a1-rooms');
    expect(state.publicObjectProps()).toHaveLength(0);
    expect(resolveStep(state.currentScene(), { col: 6, row: 6 }, 'south', [])).toEqual({ col: 6, row: 7 });
    expect(resolveStep(state.currentScene(), { col: 6, row: 7 }, 'south', [])).toEqual({ col: 6, row: 8 });
    expect(resolveStep(state.currentScene(), { col: 5, row: 6 }, 'south', [])).toBeNull();
    expect(state.currentScene().walkable.filter(cell => cell.row === 9)).toHaveLength(34);
  });

  it('mantiene cada punto de interacción conectado a suelo alcanzable desde los spawns', () => {
    for (const scene of campRestsBundle.public.scenes) {
      const terrain = scene.terrain!;
      const reachable = new Set<string>(), queue = scene.spawns.map(cell => ({ surfaceId: scene.surfaceId, cell }));
      const key = (cell: { col: number; row: number }) => `${cell.col},${cell.row}`;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const address = queue[cursor]!;
        if (reachable.has(key(address.cell))) continue;
        reachable.add(key(address.cell));
        for (const next of surfaceNeighbors(terrain, address)) if (!reachable.has(key(next.cell))) queue.push(next);
      }
      for (const point of scene.camp!.interactionPoints) {
        expect(scene.walkable.some(cell => key(cell) === key(point.cell)), `${scene.id}/${point.id} debe ser transitable`).toBe(true);
        expect(reachable.has(key(point.cell)), `${scene.id}/${point.id} debe poder alcanzarse`).toBe(true);
      }
    }
  });

  it('permite al jugador usar su baúl, impide usar el de otro y persiste el estado', () => {
    const state = new GameState(campRestsBundle);
    state.changeScene('camp-forest-pleamar');
    const point = campRestsBundle.public.scenes[1]!.camp!.interactionPoints.find(candidate => candidate.kind === 'chest' && candidate.ownerCharacterId === 'mike')!;
    const character = state.characters.get('mike')!;
    const token = 'a'.repeat(32); state.claim(token, 'socket-mike', character.id);
    character.sceneId = state.sceneId; character.surfaceId = point.surfaceId; character.cell = { col: point.cell.col + 4, row: point.cell.row };
    expect(state.applyCampPlayerInteraction(character.id, point.id)).toMatchObject({ ok: false, code: 'CAMP_INTERACTION_OUT_OF_REACH' });
    character.cell = { ...point.cell };
    expect(state.applyCampPlayerInteraction(character.id, point.id)).toMatchObject({ ok: true, code: 'CAMP_INTERACTED', action: 'opened' });
    expect(state.playerPrivate(token).campInteractions).toContainEqual(expect.objectContaining({ pointId: point.id, open: true, actionLabel: `Cerrar ${point.label}` }));
    expect(state.applyCampPlayerInteraction(character.id, point.id)).toMatchObject({ ok: true, action: 'closed' });
    expect(state.campRest?.interactions).toMatchObject([{ pointId: point.id, characterId: character.id, action: 'opened' }, { pointId: point.id, characterId: character.id, action: 'closed' }]);
    const mia = state.characters.get('mia')!; mia.sceneId = state.sceneId; mia.surfaceId = point.surfaceId; mia.cell = { ...point.cell };
    expect(state.applyCampPlayerInteraction(mia.id, point.id)).toMatchObject({ ok: false, code: 'CAMP_INTERACTION_NOT_YOURS' });
    expect(state.playerPrivate('b'.repeat(32)).campInteractions.some(item => item.pointId === point.id)).toBe(false);
    expect(dmCommandSchema.safeParse({ commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, type: 'camp:rest', action: 'interact', sceneId: state.sceneId, pointId: point.id, characterId: character.id }).success).toBe(false);
    const saved = durablePayloadSchema.parse(state.captureDurable());
    const restored = new GameState(campRestsBundle); restored.restoreDurable(saved);
    expect(restored.campRest?.interactions).toEqual(state.campRest?.interactions);
  });

  it('recupera descansos guardados aunque una actualización haya retirado un punto del mapa', () => {
    const payload = new GameState(campRestsBundle).captureDurable();
    payload.sceneId = 'camp-coastal-refuge';
    const legacyRoomDoors = ['a1-lower-door-1', 'a1-lower-door-2', 'a1-lower-door-3', 'a1-upper-door-1', 'a1-upper-door-2', 'a1-upper-door-3'].map((id, index) => ({
      id, cell: { col: [5, 16, 27][index % 3]!, row: index < 3 ? 10 : 6 }, surfaceId: 'ground', rotation: 0 as const,
      structure: 'intact' as const, kind: 'door' as const, state: 'open' as const
    }));
    payload.scenes.find(scene => scene.sceneId === 'camp-a1-rooms')!.objects = legacyRoomDoors;
    payload.campRest = {
      sceneId: 'camp-coastal-refuge', phase: 'finalization', paused: false, outcome: 'completed', interruptions: [],
      interactions: [{ pointId: 'cove-tent-a-point', pointLabel: 'Tienda · pared oeste', characterId: 'mia', characterLabel: 'Mia', at: 1_790_287_942_985 }]
    };
    const restored = new GameState(campRestsBundle);
    expect(() => restored.restoreDurable(durablePayloadSchema.parse(payload))).not.toThrow();
    expect(restored.campRest?.interactions).toMatchObject([{ pointId: 'cove-tent-a-point', characterId: 'mia' }]);
    expect(restored.captureDurable().scenes.find(scene => scene.sceneId === 'camp-a1-rooms')!.objects).toEqual([]);
  });

  it('da a cada personaje una tienda grande con baúl y equipo propio en los cuatro campamentos exteriores', () => {
    for (const scene of campRestsBundle.public.scenes.slice(1)) {
      const points = scene.camp!.interactionPoints;
      for (const owner of ['mike', 'mia', 'maria']) {
        expect(points.find(point => point.kind === 'tent' && point.ownerCharacterId === owner)).toBeDefined();
        expect(points.find(point => point.kind === 'chest' && point.ownerCharacterId === owner)).toBeDefined();
        expect(points.find(point => point.kind === 'personal' && point.ownerCharacterId === owner)).toBeDefined();
      }
    }
  });

  it('asigna audio ambiental propio a cada campamento exterior y mantiene A1 serena', () => {
    const profiles = campRestsBundle.public.audio.sceneProfiles!;
    expect(campRestsBundle.public.version).toBe('1.4.0');
    expect(profiles['camp-a1-rooms']!.layers).toMatchObject({ ocean: { playing: false }, wind: { id: 'stormwreck-loop-sanctuary', playing: true } });
    expect(profiles['camp-forest-pleamar']!.layers.wind).toMatchObject({ id: 'stormwreck-loop-forest', playing: true });
    expect(profiles['camp-wreck-beach']!.layers).toMatchObject({ ocean: { id: 'stormwreck-loop-boat-waves', playing: true }, wind: { playing: true } });
    expect(profiles['camp-cliffs-observatory']!.layers).toMatchObject({ wind: { id: 'stormwreck-loop-cliff-wind', playing: true }, storm: { id: 'stormwreck-loop-storm', playing: true, volume: .11 } });
    expect(profiles['camp-coastal-refuge']!.layers).toMatchObject({ ocean: { id: 'stormwreck-loop-ocean', playing: true, volume: .1 }, wind: { id: 'stormwreck-loop-sanctuary', playing: true } });
    const state = new GameState(campRestsBundle); state.changeScene('camp-cliffs-observatory');
    expect(state.audio.layers.storm).toMatchObject({ assetId: 'stormwreck-loop-storm', playing: true, volume: .11 });
  });

  it('respeta fases, interrupciones y decisión final del DM sin aplicar beneficios', () => {
    const state = new GameState(campRestsBundle), character = [...state.characters.values()][0]!;
    const hpBefore = character.hp;
    expect(act(state, 'prepare').ok).toBe(true);
    expect(state.campRest?.phase).toBe('arrival');
    expect(act(state, 'advance').ok).toBe(true);
    expect(state.campRest?.phase).toBe('dusk');
    expect(act(state, 'interrupt', { note: 'Voces en el bosque' }).ok).toBe(true);
    expect(act(state, 'advance')).toMatchObject({ ok: false, code: 'REST_INTERRUPTED' });
    expect(act(state, 'resume').ok).toBe(true);
    expect(act(state, 'advance').ok).toBe(true);
    expect(state.campRest?.phase).toBe('night');
    expect(act(state, 'advance').ok).toBe(true);
    expect(state.campRest?.phase).toBe('dawn');
    expect(act(state, 'finalize', { completed: true }).ok).toBe(true);
    expect(state.campRest).toMatchObject({ phase: 'finalization', outcome: 'completed', paused: false });
    expect(character.hp).toBe(hpBefore);
    const restored = new GameState(campRestsBundle); restored.restoreDurable(durablePayloadSchema.parse(state.captureDurable()));
    expect(restored.campRest).toEqual(state.campRest);
  });

  it('bloquea descansos simultáneos entre campamentos', () => {
    const state = new GameState(campRestsBundle);
    expect(act(state, 'prepare').ok).toBe(true);
    state.changeScene('camp-wreck-beach');
    expect(act(state, 'prepare')).toMatchObject({ ok: false, code: 'REST_ACTIVE_ELSEWHERE' });
  });

  it('construye y actualiza las cinco ambientaciones en Babylon NullEngine con lotes de suelo', () => {
    const engine = new NullEngine({ renderWidth: 1280, renderHeight: 720, textureSize: 512, deterministicLockstep: true });
    try {
      for (const definition of campRestsBundle.public.scenes) {
        const scene = new Scene(engine);
        buildTerrain3D(scene, definition.terrain!, { batchTiles: true, ambientIntensity: .4 });
        const visuals = createCampVisuals(scene, definition)!;
        const halos = scene.meshes.filter(mesh => mesh.name.endsWith(':dm-interaction-halo'));
        expect(halos, `${definition.id}: cada punto tiene una marca para el DM`).toHaveLength(definition.camp!.interactionPoints.length);
        expect(halos.every(halo => halo.visibility === 0), `${definition.id}: las marcas empiezan ocultas`).toBe(true);
        visuals.setInteractionHighlights(true); visuals.update(2, 'night');
        expect(halos.every(halo => halo.visibility > 0), `${definition.id}: el botón del DM puede revelar las marcas`).toBe(true);
        visuals.setInteractionHighlights(false); visuals.update(3, 'night');
        expect(halos.every(halo => halo.visibility === 0), `${definition.id}: el botón del DM puede ocultarlas`).toBe(true);
        const ambient = scene.getLightByName(`camp-ambient:${definition.id}`)!;
        const keyLight = scene.getLightByName(`camp-key:${definition.id}`)!;
        if (definition.camp!.visualProfile === 'rooms') {
          visuals.update(1, 'arrival'); const warmArrival = ambient.intensity;
          const roomLamp = scene.getLightByName('room-1:warm-lamp')!; const lampArrival = roomLamp.intensity;
          visuals.update(20, 'night');
          expect(ambient.intensity).toBeLessThan(warmArrival);
          expect(roomLamp.intensity).toBeGreaterThan(lampArrival);
        } else {
          visuals.update(1, 'arrival');
          const daylightAmbient = ambient.intensity, daylightKey = keyLight.intensity;
          const fire = scene.lights.find(light => light.name.includes('fire-point:light'))!;
          const daylightFire = fire.intensity;
          visuals.update(20, 'night');
          expect(ambient.intensity, `${definition.id}: baja la luz general por la noche`).toBeLessThan(daylightAmbient);
          expect(keyLight.intensity, `${definition.id}: baja la luz direccional por la noche`).toBeLessThan(daylightKey);
          expect(fire.intensity, `${definition.id}: la hoguera gana presencia por la noche`).toBeGreaterThan(daylightFire);
          if (definition.camp!.visualProfile === 'forest') {
            expect(scene.fogDensity).toBeGreaterThan(.017);
            expect(Math.abs(scene.getTransformNodeByName('forest:canopy-sway:0')!.rotation.z)).toBeGreaterThan(0);
          }
          if (definition.camp!.visualProfile === 'cliff-observatory') {
            expect(scene.getMaterialByName('camp:camp-cliffs-observatory:aurora-0')!.alpha).toBeGreaterThan(.11);
          }
        }
        const chest = definition.camp!.interactionPoints.find(point => point.kind === 'chest');
        if (chest) {
          const interaction = { pointId: chest.id, pointLabel: chest.label, characterId: chest.ownerCharacterId!, characterLabel: 'Mike', at: 0 };
          visuals.update(8, 'night', [{ ...interaction, action: 'opened' }]);
          expect(scene.getMeshByName(`${chest.id}:lid`)?.rotation.x).toBeCloseTo(-.92);
          visuals.update(9, 'night', [{ ...interaction, action: 'closed' }]);
          expect(scene.getMeshByName(`${chest.id}:lid`)?.rotation.x).toBe(0);
        }
        visuals.update(12, 'night'); visuals.update(19, 'dawn');
        expect(scene.meshes.length, `${definition.id} no debe exceder el presupuesto estático de meshes`).toBeLessThan(128);
        scene.dispose();
      }
    } finally { engine.dispose(); }
  }, 30_000);
});

describe('campamentos integrados en la campaña Stormwreck', () => {
  it('publica las cinco zonas bajo el mismo pack, roster, audio y slot de campaña', () => {
    const campaign = stormwreckBundle.public;
    expect(campaign.campaignId).toBe('stormwreck-isle');
    expect(campaign.scenes.filter(scene => scene.camp).map(scene => scene.id)).toEqual(knownCampIds);
    expect(campaign.audio.sceneProfiles?.['camp-wreck-beach']).toBeDefined();
    expect(campaign.audio.library?.music.some(track => track.id === 'camp-rest-music')).toBe(true);
    expect(new Set(campaign.audio.library?.ambience.map(track => track.id)).size).toBe(campaign.audio.library?.ambience.length);
    const state = new GameState(stormwreckBundle);
    expect(state.changeScene('camp-a1-rooms')).toBe(true);
    expect(act(state, 'prepare').ok).toBe(true);
    const point = campaign.scenes.find(scene => scene.id === 'camp-a1-rooms')!.camp!.interactionPoints.find(item => item.kind === 'bed')!;
    const mike = state.characters.get('mike')!;
    Object.assign(mike, { sceneId: 'camp-a1-rooms', surfaceId: point.surfaceId, cell: { ...point.cell } });
    expect(state.applyCampPlayerInteraction('mike', point.id).ok).toBe(true);
    expect(state.captureDurable().campRest?.sceneId).toBe('camp-a1-rooms');
  });

  it('añade los registros vacíos de campamento al restaurar una partida Stormwreck anterior', () => {
    const state = new GameState(stormwreckBundle), legacy = state.captureDurable();
    legacy.scenes = legacy.scenes.filter(scene => !knownCampIds.includes(scene.sceneId));
    expect(() => state.restoreDurable(legacy)).not.toThrow();
    expect(state.captureDurable().scenes.map(scene => scene.sceneId)).toEqual(expect.arrayContaining(knownCampIds));
  });
});
