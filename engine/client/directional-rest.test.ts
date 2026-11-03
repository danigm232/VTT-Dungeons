import { describe, expect, it } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';
import { oneShotCampaignDefinition as d8 } from '../../campaigns/one-shot/public/pack';
import { publicCampaignDefinition as storm } from '../../campaigns/stormwreck-isle/public/pack';
import { installStormwreckFacingSprites } from '../../campaigns/stormwreck-isle/public/facing-sprites';
import { correctDirectionalClip, directionalRestAnimation, mergeDirectionalArt } from './directional-rest';
import { screenVectorToWorldAtAlpha, worldVectorToCellDelta } from './camera-movement';
import type { Facing } from '../shared/protocol';
import { readFileSync } from 'node:fs';

const suffixes = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const facings: Facing[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
function rendererFor(campaign = d8, alpha?: number) {
  const renderer = Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer, { campaign, options: {}, sceneId: 'test', standingActors: new Set(),
    snapshot: { combat: { active: false, participants: [] } }, visualPreview: null, cameraOrientationStep: 0,
    terrainView: alpha === undefined ? null : { camera: { alpha } } });
  return renderer;
}

describe('persistent camera-relative resting direction', () => {
  it('freezes each actor\'s own directional walk without losing crops, flips or scale', () => {
    for (const states of Object.values(d8.tokenAnimations)) for (const direction of suffixes) {
      const source = states[`moving-${direction}`] ?? states[`direction-${direction}`]!;
      for (const state of ['idle', 'idle-standing', 'combat-idle']) {
        const rest = directionalRestAnimation(states, `${state}-${direction}`)!;
        if(states[`${state}-${direction}`]){expect(rest).toBe(states[`${state}-${direction}`]);continue;}
        expect(rest.frames).toHaveLength(1);
        expect(rest.frames[0]).toEqual(source.frames[0]);
        expect(rest.flipX).toBe(source.flipX ?? false);
        expect(rest.motion).toBeUndefined();
        expect(rest).toBe(directionalRestAnimation(states, `${state}-${direction}`));
      }
    }
  });
  it('uses an authored rest when present, does not fake missing rear views, and refreshes replacements', () => {
    const states = { 'direction-n': { frames: ['back.png'], fps: 8 }, 'idle-s': { frames: ['front-idle.png'], fps: 3 } };
    expect(directionalRestAnimation(states, 'idle-s')).toBe(states['idle-s']);
    expect(directionalRestAnimation(states, 'idle-e')).toBeNull();
    expect(directionalRestAnimation(states, 'attack-n')).toBeNull();
    expect(directionalRestAnimation(states, 'idle-n')!.frames).toEqual(['back.png']);
    states['direction-n'] = { frames: ['new-back.png'], fps: 8 };
    expect(directionalRestAnimation(states, 'idle-n')!.frames).toEqual(['new-back.png']);
  });
  it('corrects Silverfarben\'s reversed rear diagonals, including an old server catalogue', () => {
    const frame = { url: '/art/tokens/Silverfarben Hotel/silverfarben_hotel_walk_orientations_atlas.png', x: 0, y: 365, width: 200, height: 340 };
    const states = { 'moving-ne': { frames: [frame], fps: 8 }, 'moving-nw': { frames: [frame], fps: 8, flipX: true } };
    expect(correctDirectionalClip('moving-ne', states['moving-ne'], states).flipX).toBe(true);
    expect(correctDirectionalClip('moving-nw', states['moving-nw'], states).flipX).toBe(false);
    expect(directionalRestAnimation(states, 'idle-ne')!.flipX).toBe(true);
    expect(directionalRestAnimation(states, 'idle-nw')!.flipX).toBe(false);
    const other = { frames: [{ ...frame, url: '/art/other-character.png' }], fps: 8 };
    expect(correctDirectionalClip('moving-ne', other, states)).toBe(other);
    expect(d8.tokenAnimations['silverfarben-hotel']!['running-n']!.frames[0]).not.toEqual(d8.tokenAnimations['silverfarben-hotel']!['direction-n']!.frames[0]);
  });
  it('keeps new facing art with an older running server, without resurrecting removed attacks', () => {
    const local = { 'idle-n': { frames: ['local-back.png'], fps: 1 }, 'direction-w': { frames: ['local-left.png'], fps: 1 }, attack: { frames: ['old-attack.png'], fps: 6 } };
    const remote = { idle: { frames: ['front.png'], fps: 1 }, 'direction-w': { frames: ['remote-left.png'], fps: 8 } };
    const merged = mergeDirectionalArt(local, remote);
    expect(merged['idle-n']).toBe(local['idle-n']);
    expect(merged['direction-w']).toBe(remote['direction-w']);
    expect(merged.attack).toBeUndefined();
    expect(remote).not.toHaveProperty('idle-n');
  });
  it('installs missing views on an old API catalogue, but never onto a different character skin', () => {
    const old = structuredClone(storm);
    for (const id of ['wizard','cleric','zombie','harpy','ghoul']) {
      for (const state of Object.keys(old.tokenAnimations[id]!)) if (/^(idle|idle-standing|combat-idle|direction)-/.test(state)) delete old.tokenAnimations[id]![state];
    }
    old.tokens.wizard!.url = '/art/custom-wizard.png';
    installStormwreckFacingSprites(old);
    expect(old.tokenAnimations.wizard).not.toHaveProperty('idle-n');
    for (const id of ['cleric','zombie','harpy','ghoul']) for (const direction of suffixes) {
      expect(old.tokenAnimations[id]![`idle-${direction}`]!.frames).toHaveLength(1);
    }
    const authored = { frames: ['custom-cleric-back.png'], fps: 1 };
    old.tokenAnimations.cleric!['idle-n'] = authored;
    installStormwreckFacingSprites(old);
    expect(old.tokenAnimations.cleric!['idle-n']).toBe(authored);
  });
  it('adds monster views only once their token is revealed by the runtime', () => {
    const partial = structuredClone(storm), zombie = partial.tokens.zombie!;
    delete partial.tokens.zombie; delete partial.tokenAnimations.zombie;
    installStormwreckFacingSprites(partial);
    expect(partial.tokens).not.toHaveProperty('zombie');
    expect(partial.tokenAnimations).not.toHaveProperty('zombie');
    partial.tokens.zombie = zombie;
    partial.tokenAnimations.zombie = { idle: { frames: [zombie.url], fps: 1 } };
    installStormwreckFacingSprites(partial);
    expect(partial.tokenAnimations.zombie['idle-n']!.frames).toHaveLength(1);
    const installed = partial.tokenAnimations.zombie;
    installStormwreckFacingSprites(partial);
    expect(partial.tokenAnimations.zombie).toBe(installed);
  });
  it('keeps the heading after walk/run release, in and out of combat, for every D8 actor', () => {
    const renderer = rendererFor();
    for (const tokenId of Object.keys(d8.tokenAnimations)) for (const facing of facings) {
      const entity = { id: tokenId, tokenId, facing, conditions: [], moving: true, cell: { col: 0, row: 0 } };
      const view = { entity, animationState: null };
      const walk = renderer.animationFor(tokenId, renderer.activeTokenState(view, 100));
      entity.moving = false;
      for (const combat of [false, true]) {
        renderer.snapshot.combat.active = combat;
        const state = renderer.activeTokenState(view, 200);
        expect(state).toBe(`${combat ? 'combat-idle' : 'idle'}-${suffixes[facings.indexOf(facing)]}`);
        if(tokenId==='silverfarben-hotel')expect(JSON.stringify(renderer.animationFor(tokenId,state).frames)).toContain('silverfarben-v3/model.png');
        else expect(renderer.animationFor(tokenId, state).frames[0]).toEqual(walk.frames[0]);
        expect(entity.facing).toBe(facing);
      }
      renderer.snapshot.combat.active = false;
    }
  });
  it('reprojects a stopped world heading as the camera turns, without mutating gameplay facing', () => {
    for (let step = 0; step < 8; step++) for (const facing of facings) {
      const alpha = -Math.PI / 4 + step * Math.PI / 4, renderer = rendererFor(d8, alpha);
      const view = { entity: { id: 'maria', tokenId: 'rogue', facing, moving: false, cell: { col: 0, row: 0 } }, animationState: null };
      const direction = facings.indexOf(renderer.cameraRelativeFacing(facing));
      expect(renderer.activeTokenState(view, 100)).toBe(`idle-${suffixes[direction]}`);
      expect(view.entity.facing).toBe(facing);
    }
    // Releasing W must leave the back view under every camera resting angle.
    for (let step = 0; step < 8; step++) {
      const alpha = -Math.PI / 4 + step * Math.PI / 4, renderer = rendererFor(d8, alpha);
      const delta = worldVectorToCellDelta(screenVectorToWorldAtAlpha(0, 1, alpha, Math.PI / 4));
      // Use integer offsets to avoid tiny floating-point residuals at cardinal headings.
      const offsets = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
      const worldFacing = facings[offsets.findIndex(([col,row]) => col === delta.col && row === delta.row)]!;
      expect(renderer.cameraRelativeFacing(worldFacing)).toBe('north');
    }
  });
  it('does not replace sitting, falling, attacks or condition poses with an upright rest', () => {
    const renderer = rendererFor();
    const view: any = { entity: { id: 'maria', tokenId: 'rogue', facing: 'north', moving: false, cell: { col: 0, row: 0 }, seatId: 'seat' }, animationState: null };
    expect(renderer.activeTokenState(view, 100)).toBe('sit');
    delete view.entity.seatId;
    view.animationState = 'attack-n'; view.animationUntil = 200;
    expect(renderer.activeTokenState(view, 100)).toBe('attack-n');
    view.animationState = null;
    view.entity.conditions = ['derribada'];
    expect(renderer.activeTokenState(view, 100)).toBe('condition-derribada');
    view.entity.conditions = []; view.entity.defeated = true;
    expect(renderer.activeTokenState(view, 100)).toBe('defeated');
  });
  it('provides all eight distinct transparent resting crops for the five missing Stormwreck bodies', () => {
    for (const id of ['wizard', 'cleric', 'zombie', 'harpy', 'ghoul']) {
      const states = storm.tokenAnimations[id]!;
      const crops = suffixes.map(direction => states[`idle-${direction}`]!.frames[0]!);
      expect(new Set(crops.map(frame => JSON.stringify(frame))).size).toBe(8);
      for (const frame of crops) {
        expect(typeof frame).toBe('object'); if (typeof frame === 'string') continue;
        expect(frame.url).toContain(`${id}-rest-v1.png`);
        expect(frame.alphaSeeds).toHaveLength(1);
        expect(frame.x + frame.width).toBeLessThanOrEqual(1254);
        expect(frame.y + frame.height).toBeLessThanOrEqual(1254);
        expect(frame.anchorY).toBe(1);
        const bytes = readFileSync(`campaigns/stormwreck-isle/public${frame.url}`);
        expect(bytes.readUInt32BE(16)).toBe(1254);
        expect(bytes.readUInt32BE(20)).toBe(1254);
        expect(bytes[25]).toBe(6); // RGBA, not a painted checkerboard.
        for (const [x,y] of frame.alphaSeeds!) {
          expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(frame.width);
          expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(frame.height);
        }
      }
    }
  });
});
