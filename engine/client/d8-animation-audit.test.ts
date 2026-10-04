import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameState } from '../server/game';
import { oneShotBundle } from '../../campaigns/one-shot/server';
import { auditActions, previewFrame, resolveVisualState, visibleAuditActors } from './d8-animation-audit';
import { d8MotionAtlases } from '../../campaigns/one-shot/public/generated-motion-atlases';
import { d8DirectionAtlases } from '../../campaigns/one-shot/public/generated-direction-atlases';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { D8CameraMotion } from './d8-camera';

describe('D8 visual QA without gameplay writes', () => {
  it('preserves Babylon coordinates when preparing the local preview camera', () => {
    const target = new Vector3(3, .8, -4), motion = new D8CameraMotion();
    const pose = motion.update({ alpha: -.7, beta: .8, halfHeight: 6, target: { x: target.x, y: target.y, z: target.z } }, 0);
    expect(pose.target).toEqual({ x: 3, y: .8, z: -4 });
    const next = motion.update({ ...pose, target: { x: 6, y: 1, z: -1 } }, 16);
    expect(Object.values(next.target).every(Number.isFinite)).toBe(true);
  });
  it('lists public entities once and never reveals hidden scenic roses', () => {
    const state = new GameState(oneShotBundle); state.changeScene('garden');
    const snapshot = state.publicSnapshot(), actors = visibleAuditActors(snapshot, 'd8-night-private');
    expect(new Set(actors.map(actor => actor.id)).size).toBe(actors.length);
    expect(actors.some(actor => actor.tokenId === 'roses')).toBe(false);
    expect(visibleAuditActors(snapshot, 'stormwreck-isle')).toEqual([]);
    const rose = [...state.npcs.values()].find(npc => npc.tokenId === 'roses')!;
    expect(state.setNpcVisible(rose.id, true)).toBe(true);
    expect(visibleAuditActors(state.publicSnapshot(), 'd8-night-private').filter(actor => actor.id === rose.id)).toHaveLength(1);
    state.setNpcVisible(rose.id, false);
    expect(visibleAuditActors(state.publicSnapshot(), 'd8-night-private').some(actor => actor.id === rose.id)).toBe(false);
  });
  it('uses the real sheet outside combat and exposes absent sequences', () => {
    const state = new GameState(oneShotBundle); state.claim('a'.repeat(32), 'audit-silver', 'aoife');
    const snapshot = state.publicSnapshot(), dm = state.dmState(), actor = snapshot.entities.find(entity => entity.id === 'aoife')!;
    const before = JSON.stringify(state.captureDurable(123_000));
    const actions = auditActions(actor, snapshot, dm, state.campaign.public);
    expect(actions.find(action => action.id === 'attack:magic-missile')).toMatchObject({ count: 3, attackType: 'magicalProjectile' });
    expect(actions.find(action => action.id === 'attack:feather-fall')).toMatchObject({ effect: 'feather' });
    expect(actions.some(action => action.group === 'Fuera de combate')).toBe(true);
    expect(actions.some(action => action.id === 'basic:help')).toBe(true);
    expect(JSON.stringify(state.captureDurable(123_000))).toBe(before);
    const noFrames = { ...snapshot, tokenAssets: { ...snapshot.tokenAssets, tokenAnimations: { ...snapshot.tokenAssets.tokenAnimations, [actor.tokenId]: {} } } };
    expect(auditActions(actor, noFrames, dm, state.campaign.public).every(action => action.coverage === 'missing')).toBe(true);
  });
  it('resolves direction but never replaces a missing action by idle', () => {
    expect(resolveVisualState({ 'direction-n': {}, moving: {}, idle: {} }, 'moving', 'n')).toBe('direction-n');
    expect(resolveVisualState({ idle: {} }, 'attack')).toBeNull();
    expect(previewFrame(1000, 8, 4, false)).toBe(3);
    expect(previewFrame(1000, 8, 4, true)).toBe(0);
    expect(previewFrame(-100, 8, 4, true)).toBe(0);
  });
  it('has real hurt/fall/stand/run poses for seven NPCs and directional art for Anteros and Fritz', () => {
    const campaign = oneShotBundle.public;
    for (const id of Object.keys(d8MotionAtlases)) for (const key of ['hit', 'fall', 'stand', 'prone', 'defeated', 'running', 'direction-n', 'direction-e', 'direction-w']) expect(campaign.tokenAnimations[id]?.[key]?.frames.length).toBeGreaterThan(0);
    expect(campaign.tokenAnimations.bartender?.moving?.frames).toHaveLength(4);
    expect(campaign.tokenAnimations.roses?.wake?.frames).toHaveLength(3);
    for (const id of ['anteros', 'anteros-dinner', 'fritz']) expect(campaign.tokenAnimations[id]?.['direction-ne']?.frames).toHaveLength(4);
    for (const frames of [...Object.values(d8MotionAtlases), ...Object.values(d8DirectionAtlases)]) for (const frame of frames) {
      const png = readFileSync(resolve('campaigns/one-shot/public', frame.url.slice(1)));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(frame.x + frame.width).toBeLessThanOrEqual(png.readUInt32BE(16));
      expect(frame.y + frame.height).toBeLessThanOrEqual(png.readUInt32BE(20));
      expect(frame.anchorX).toBeGreaterThanOrEqual(0); expect(frame.anchorX).toBeLessThanOrEqual(1);
      expect(frame.anchorY).toBe(1);
    }
  });
});
