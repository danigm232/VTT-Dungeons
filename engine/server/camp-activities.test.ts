import { describe, expect, it } from 'vitest';
import { GameState } from './game.js';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';
import { activitiesForCampPoint } from '../shared/camp-activities.js';
import { durablePayloadSchema } from './persistence/schema.js';

describe('camp activities have authoritative effects and matching animations', () => {
  it('allows another camp’s objects without replacing the active rest, including save/restore', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('camp-forest-pleamar');
    expect(state.applyCampRestCommand({ type: 'camp:rest', action: 'prepare', commandId: 'camp-activity-test', sceneId: state.sceneId, sceneEpoch: state.sceneEpoch }).ok).toBe(true);
    const activeRest = structuredClone(state.campRest);
    state.changeScene('camp-wreck-beach');
    const chest = state.currentScene().camp!.interactionPoints.find(point => point.kind === 'chest' && point.ownerCharacterId === 'mike')!;
    const actor = state.characters.get('mike')!; actor.cell = { ...chest.cell }; actor.surfaceId = chest.surfaceId;
    expect(state.applyCampPlayerInteraction(actor.id, chest.id, 'chest-toggle')).toMatchObject({ ok: true, action: 'opened' });
    expect(state.campRest).toEqual(activeRest);
    expect(state.publicSnapshot().campRest).toMatchObject({ sceneId: 'camp-wreck-beach', phase: null, interactions: [expect.objectContaining({ pointId: chest.id, action: 'opened' })] });
    expect(state.dmState().campActivity?.sceneId).toBe('camp-wreck-beach');
    expect(state.applyCampRestCommand({ type: 'camp:rest', action: 'prepare', commandId: 'camp-other-rest', sceneId: state.sceneId, sceneEpoch: state.sceneEpoch })).toMatchObject({ ok: false, code: 'REST_ACTIVE_ELSEWHERE' });
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(durablePayloadSchema.parse(state.captureDurable()));
    expect(restored.campRest).toEqual(activeRest);
    expect(restored.applyCampPlayerInteraction(actor.id, chest.id, 'chest-toggle')).toMatchObject({ ok: true, action: 'closed' });
    expect(restored.campRest).toEqual(activeRest);
    restored.changeScene(activeRest!.sceneId);
    for (let i = 0; i < 3; i++) expect(restored.applyCampRestCommand({ type: 'camp:rest', action: 'advance', commandId: `camp-advance-${i}`, sceneId: restored.sceneId, sceneEpoch: restored.sceneEpoch }).ok).toBe(true);
    expect(restored.applyCampRestCommand({ type: 'camp:rest', action: 'finalize', completed: false, commandId: 'camp-finalize', sceneId: restored.sceneId, sceneEpoch: restored.sceneEpoch }).ok).toBe(true);
    restored.changeScene('camp-wreck-beach');
    expect(restored.applyCampRestCommand({ type: 'camp:rest', action: 'prepare', commandId: 'camp-next-rest', sceneId: restored.sceneId, sceneEpoch: restored.sceneEpoch }).ok).toBe(true);
    expect(restored.campRest?.interactions.at(-1)).toMatchObject({ pointId: chest.id, action: 'closed' });
  });
  it('migrates existing camp histories and rejects invalid or duplicate camp references', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('camp-wreck-beach');
    const chest = state.currentScene().camp!.interactionPoints.find(point => point.kind === 'chest' && point.ownerCharacterId === 'mike')!;
    const actor = state.characters.get('mike')!; actor.cell = { ...chest.cell }; actor.surfaceId = chest.surfaceId;
    state.applyCampPlayerInteraction(actor.id, chest.id, 'chest-toggle');
    const legacy = state.captureDurable(); delete legacy.campActivities;
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(legacy);
    expect(restored.applyCampPlayerInteraction(actor.id, chest.id, 'chest-toggle')).toMatchObject({ action: 'closed' });
    for (const sceneIds of [['missing-camp'], ['camp-wreck-beach', 'camp-wreck-beach']]) {
      const invalid = structuredClone(legacy); invalid.campActivities = sceneIds.map(sceneId => ({ sceneId, interactions: [] }));
      expect(() => restored.restoreDurable(invalid)).toThrow('SAVE_CAMP_ACTIVITY');
    }
  });
  it('executes every available activity in all five camps for its intended actor', () => {
    for (const scene of stormwreckBundle.public.scenes.filter(scene => scene.camp)) {
      const state = new GameState(stormwreckBundle); state.changeScene(scene.id);
      for (const point of scene.camp!.interactionPoints) {
        const actor = state.characters.get(point.ownerCharacterId ?? 'mike')!;
        actor.cell = { ...point.cell }; actor.surfaceId = point.surfaceId; actor.sceneId = scene.id;
        const before = JSON.stringify({ hp: actor.hp, inventory: actor.inventory, resources: actor.combat.resources });
        for (const activity of activitiesForCampPoint(point)) {
          const result = state.applyCampPlayerInteraction(actor.id, point.id, activity.id);
          expect(result, `${scene.id}/${point.id}/${activity.id}`).toMatchObject({ ok: true, activity: { id: activity.id } });
          if (activity.id !== 'chest-toggle') expect(stormwreckBundle.public.tokenAnimations[actor.tokenId]?.[activity.animation], activity.animation).toBeDefined();
          expect(state.campRest!.interactions.at(-1)!.activityId).toBe(activity.id);
          if (activity.id === 'sit') expect(state.applyCampPlayerInteraction(actor.id, point.id, activity.id).ok).toBe(true);
        }
        expect(JSON.stringify({ hp: actor.hp, inventory: actor.inventory, resources: actor.combat.resources })).toBe(before);
      }
      const payload = durablePayloadSchema.parse(state.captureDurable()), restored = new GameState(stormwreckBundle);
      restored.restoreDurable(payload); expect(restored.campRest).toEqual(state.campRest);
    }
  });
  it('validates activity, ownership, reach, scene, combat and ability to act', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('camp-wreck-beach');
    const scene = state.currentScene(), fire = scene.camp!.interactionPoints.find(p => p.kind === 'fire')!;
    const actor = state.characters.get('maria')!; actor.cell = { ...fire.cell }; actor.surfaceId = fire.surfaceId;
    expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'study')).toMatchObject({ ok: false, code: 'CAMP_ACTIVITY_UNAVAILABLE' });
    expect(state.campRest).toBeNull();
    actor.hp = 0; expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'warm')).toMatchObject({ ok: false, code: 'CANNOT_ACT' });
    actor.hp = actor.maxHp; actor.cell.col += 4;
    expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'warm')).toMatchObject({ ok: false, code: 'CAMP_INTERACTION_OUT_OF_REACH' });
    actor.cell = { ...fire.cell }; state.combat.active = true;
    expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'warm')).toMatchObject({ ok: false, code: 'IN_COMBAT' });
    state.combat.active = false;
    const personal = scene.camp!.interactionPoints.find(p => p.ownerCharacterId === 'mia' && p.kind === 'personal')!;
    actor.cell = { ...personal.cell };
    expect(state.applyCampPlayerInteraction(actor.id, personal.id, 'pray')).toMatchObject({ ok: false, code: 'CAMP_INTERACTION_NOT_YOURS' });
    actor.sceneId = 'dragon-rest';
    expect(state.applyCampPlayerInteraction(actor.id, personal.id, 'pray')).toMatchObject({ ok: false, code: 'CAMP_FEATURE_UNAVAILABLE' });
  });
  it('inspection does not close an open chest and actors face the actual object', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('camp-wreck-beach');
    const point = state.currentScene().camp!.interactionPoints.find(p => p.kind === 'chest' && p.ownerCharacterId === 'mike')!;
    const actor = state.characters.get('mike')!; actor.cell = { ...point.cell }; actor.surfaceId = point.surfaceId;
    expect(state.applyCampPlayerInteraction(actor.id, point.id, 'chest-toggle')).toMatchObject({ action: 'opened' });
    expect(state.applyCampPlayerInteraction(actor.id, point.id, 'inspect')).toMatchObject({ action: 'used' });
    expect(state.applyCampPlayerInteraction(actor.id, point.id, 'chest-toggle')).toMatchObject({ action: 'closed' });
    expect(actor.facing).not.toBe('south');
  });
  it('uses the actual fire as the reach target, from any adjacent side', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('camp-wreck-beach');
    const fire = state.currentScene().camp!.interactionPoints.find(p => p.kind === 'fire')!;
    const actor = state.characters.get('mike')!, target = fire.objectCell!;
    actor.surfaceId = fire.surfaceId;
    for (const [col, row] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
      actor.cell = { col: target.col + col!, row: target.row + row! };
      expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'tend-fire').ok).toBe(true);
    }
    actor.cell = { col: target.col, row: target.row - 2 };
    expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'cook')).toMatchObject({ ok: false, code: 'CAMP_INTERACTION_OUT_OF_REACH' });
  });
  it('keeps a chest open through a full activity feed and save/restore', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('camp-wreck-beach');
    const scene = state.currentScene(), chest = scene.camp!.interactionPoints.find(p => p.kind === 'chest' && p.ownerCharacterId === 'mike')!;
    const fire = scene.camp!.interactionPoints.find(p => p.kind === 'fire')!, actor = state.characters.get('mike')!;
    actor.cell = { ...chest.cell }; actor.surfaceId = chest.surfaceId;
    expect(state.applyCampPlayerInteraction(actor.id, chest.id, 'chest-toggle')).toMatchObject({ action: 'opened' });
    actor.cell = { ...fire.cell }; actor.surfaceId = fire.surfaceId;
    for (let i = 0; i < 40; i++) expect(state.applyCampPlayerInteraction(actor.id, fire.id, 'warm').ok).toBe(true);
    expect(state.campRest!.interactions).toHaveLength(30);
    const restored = new GameState(stormwreckBundle);
    restored.restoreDurable(durablePayloadSchema.parse(state.captureDurable()));
    const after = restored.characters.get('mike')!; after.cell = { ...chest.cell }; after.surfaceId = chest.surfaceId;
    expect(restored.applyCampPlayerInteraction(after.id, chest.id, 'chest-toggle')).toMatchObject({ action: 'closed' });
  });
});
