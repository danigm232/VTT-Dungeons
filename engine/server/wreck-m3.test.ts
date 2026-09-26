import { describe, expect, it } from 'vitest';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';
import { anonymousCampaignView } from '../shared/campaign-view.js';
import { GameState } from './game.js';

describe('M3 · criaturas en el barco continuo', () => {
  it('mantiene las criaturas en una escena común, en su cubierta real y fuera del catálogo anónimo', () => {
    const actors = stormwreckBundle.privateActors ?? [];
    expect(actors).toHaveLength(12);
    expect(new Set(actors.map(actor => actor.id)).size).toBe(12);
    expect(actors.filter(actor => actor.sceneId === 'wreck-ship')).toHaveLength(9);
    expect(actors.filter(actor => actor.sceneId === 'dragon-rest')).toHaveLength(3);
    expect(actors.filter(actor => actor.id.startsWith('c4-zombie'))).toHaveLength(3);
    expect(actors.filter(actor => actor.id.startsWith('c8-zombie'))).toHaveLength(3);
    expect(actors.filter(actor => actor.tokenId === 'ghoul')).toHaveLength(1);
    expect(actors.filter(actor => actor.tokenId === 'harpy')).toHaveLength(2);
    expect(actors.filter(actor => actor.surfaceId === 'lower-deck')).toHaveLength(4);
    expect(actors.filter(actor => actor.surfaceId === 'crow')).toHaveLength(1);
    expect(actors.find(actor => actor.id === 'upper-harpy-2')?.surfaceId).toBe('c2');
    const anonymous = JSON.stringify(anonymousCampaignView(stormwreckBundle.public));
    expect(anonymous).not.toContain('c8-ghoul');
    expect(anonymous).not.toContain('Marinero ahogado');
    expect(anonymous.toLowerCase()).not.toContain('ghoul');
    expect(anonymous.toLowerCase()).not.toContain('gul');
    expect(anonymous).not.toMatch(/\/art\/m3\/(?:ghoul|zombie|harpy)\//);
    expect(stormwreckBundle.public.roster.find(actor => actor.id === 'maria')?.label).toBe('Trinity');
  });

  it('revela criaturas al DM y solo a jugadores que comparten su cubierta', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    state.focusScene('wreck-ship');
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', sessionToken: 'mike-session' });
    state.focusScene('wreck-ship');
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').entities.map(entity => entity.id)).not.toContain('c8-ghoul');
    expect(state.setNpcVisible('c8-ghoul', true)).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').entities.map(entity => entity.id)).not.toContain('c8-ghoul');
    expect(state.publicSnapshot(true, 'wreck-ship', 'lower-deck').entities.map(entity => entity.id)).toContain('c8-ghoul');
    expect(state.publicSnapshot(false, 'wreck-ship').entities.map(entity => entity.id)).toContain('c8-ghoul');
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').tokenAssets.tokens).not.toHaveProperty('ghoul');
    expect(state.publicSnapshot(true, 'wreck-ship', 'lower-deck').tokenAssets.tokens).toHaveProperty('ghoul');
    expect(state.setNpcVisible('upper-harpy-1', true)).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'crow').entities.map(entity => entity.id)).toContain('upper-harpy-1');
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').entities.map(entity => entity.id)).not.toContain('upper-harpy-1');
    expect(state.setNpcVisible('upper-harpy-2', true)).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'c2').entities.map(entity => entity.id)).toContain('upper-harpy-2');
    expect(state.publicSnapshot(true, 'wreck-ship', 'lower-deck').entities.map(entity => entity.id)).not.toContain('upper-harpy-2');
  });

  it('añade enemigos ocultos a un guardado M2 sin mover personajes ni revelar criaturas', () => {
    const state = new GameState(stormwreckBundle), old = state.captureDurable();
    const characters = structuredClone(old.characters), scenes = structuredClone(old.scenes);
    old.npcs = [];
    const restored = new GameState(stormwreckBundle);
    restored.restoreDurable(old);
    const saved = restored.captureDurable();
    expect(saved.characters).toEqual(characters);
    expect(saved.scenes).toEqual(scenes);
    expect(saved.npcs).toHaveLength(25);
    expect(saved.npcs?.filter(npc => (stormwreckBundle.privateActors ?? []).some(actor => actor.id === npc.id))
      .every(npc => !npc.visible)).toBe(true);
    expect(saved.npcs?.filter(npc => npc.sceneId === 'wreck-ship')).toHaveLength(10);
    expect(saved.npcs?.filter(npc => npc.sceneId === 'dragon-rest')).toHaveLength(15);
  });

  it('conserva condiciones de canto y parálisis en el guardado privado', () => {
    const state = new GameState(stormwreckBundle);
    expect(state.setCombatCondition('c4-zombie-1', 'hechizada', true)).toBe(true);
    expect(state.setCombatCondition('c8-ghoul', 'paralizada', true)).toBe(true);
    const restored = new GameState(stormwreckBundle);
    restored.restoreDurable(state.captureDurable());
    expect(restored.conditionsFor('c4-zombie-1')).toContain('hechizada');
    expect(restored.conditionsFor('c8-ghoul')).toContain('paralizada');
  });

  it('no revela una criatura sobre la casilla ocupada por un personaje', () => {
    const state = new GameState(stormwreckBundle), trinity = state.characters.get('maria')!;
    state.focusScene('wreck-ship');
    const zombie = state.dmState().npcs.find(actor => actor.id === 'c4-zombie-1')!;
    trinity.sceneId = 'wreck-ship'; trinity.surfaceId = zombie.surfaceId; trinity.cell = zombie.cell;
    expect(state.setNpcVisible('c4-zombie-1', true)).toBe(false);
    expect(state.publicSnapshot(true, 'wreck-ship', zombie.surfaceId).entities.some(entity => entity.id === 'c4-zombie-1')).toBe(false);
    trinity.cell = { col: zombie.cell.col - 1, row: zombie.cell.row };
    expect(state.setNpcVisible('c4-zombie-1', true)).toBe(true);
  });
});
