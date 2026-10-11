import { describe, it, expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { CampActivityVisuals } from './camp-activity-visuals';
import { campRestsPublicCampaign } from '../../campaigns/camp-rests/public/pack';
import { activitiesForCampPoint } from '../shared/camp-activities';
import type { CampRestState } from '../shared/camp-rest';
import type { PublicEntity } from '../shared/protocol';
describe('camp props and effects', () => {
  it('places held props ahead of the actor in all eight headings, not on their back', () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    new ArcRotateCamera('camera', .8, .9, 40, Vector3.Zero(), scene);
    const definition = campRestsPublicCampaign.scenes.find(s => s.id === 'camp-wreck-beach')!;
    const point = definition.camp!.interactionPoints.find(p => p.kind === 'personal')!;
    const effects = new CampActivityVisuals(scene, definition);
    const actor: PublicEntity = { id: 'actor', label: 'Actor', kind: 'player', tokenId: 'wizard', color: '#cccccc', sceneId: definition.id, surfaceId: point.surfaceId, cell: point.cell, facing: 'north', moving: false, step: null };
    const position = () => new Vector3(20, 0, 20);
    let at = 100000;
    for (const [facing, dx, dz] of [['north', 0, -1], ['north-east', 1, -1], ['east', 1, 0], ['south-east', 1, 1], ['south', 0, 1], ['south-west', -1, 1], ['west', -1, 0], ['north-west', -1, -1]] as const) {
      actor.facing = facing;
      const entry: CampRestState['interactions'][number] = { pointId: point.id, pointLabel: point.label, characterId: actor.id, characterLabel: actor.label, activityId: 'study', action: 'used', at: ++at };
      effects.update(at + 500, [entry], [actor], position, () => 1.8, false);
      const root = scene.meshes[0]!.parent as TransformNode;
      expect(root.position.x).toBeCloseTo(20 + dx / Math.hypot(dx, dz) * .22);
      expect(root.position.z).toBeCloseTo(20 + dz / Math.hypot(dx, dz) * .22);
    }
    effects.dispose(); scene.dispose(); engine.dispose();
  });
  it('does not cancel another actor doing the same activity in the same millisecond', () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    new ArcRotateCamera('camera', .8, .9, 40, Vector3.Zero(), scene);
    const definition = campRestsPublicCampaign.scenes.find(s => s.id === 'camp-wreck-beach')!;
    const point = definition.camp!.interactionPoints.find(p => p.kind === 'fire')!;
    const effects = new CampActivityVisuals(scene, definition);
    const actors: PublicEntity[] = ['first', 'second'].map(id => ({ id, label: id, kind: 'player', tokenId: 'rogue', color: '#cccccc', sceneId: definition.id, surfaceId: point.surfaceId, cell: point.cell, facing: 'north', moving: false, step: null }));
    const entries: CampRestState['interactions'] = actors.map(actor => ({ pointId: point.id, pointLabel: point.label, characterId: actor.id, characterLabel: actor.label, activityId: 'warm', action: 'used', at: 100000 }));
    effects.update(100500, entries, actors, () => Vector3.Zero(), () => 1, false);
    expect(scene.meshes).toHaveLength(18);
    actors[0]!.moving = true;
    effects.update(100600, entries, actors, () => Vector3.Zero(), () => 1, false);
    expect(scene.meshes).toHaveLength(9);
    actors[0]!.moving = false;
    effects.update(100700, entries, actors, () => Vector3.Zero(), () => 1, false);
    expect(scene.meshes).toHaveLength(9);
    effects.update(100800, entries, actors, () => Vector3.Zero(), () => 1, true);
    expect(scene.meshes).toHaveLength(0);
    effects.update(100900, entries, actors, () => Vector3.Zero(), () => 1, false);
    expect(scene.meshes).toHaveLength(0);
    effects.dispose(); scene.dispose(); engine.dispose();
  });
  it('animates depth-tested props, cancels on movement and disposes without leaks', () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    new ArcRotateCamera('camera', .8, .9, 40, Vector3.Zero(), scene);
    const definition = campRestsPublicCampaign.scenes.find(s => s.id === 'camp-wreck-beach')!;
    const effects = new CampActivityVisuals(scene, definition);
    const baseMaterials = scene.materials.length;
    let serial = 100000;
    for (const point of definition.camp!.interactionPoints) for (const action of activitiesForCampPoint(point)) {
      if (['sit', 'chest-toggle'].includes(action.id)) continue;
      const actor: PublicEntity = { id: 'actor', label: 'Actor', kind: 'player', tokenId: 'rogue', color: '#cccccc', sceneId: definition.id, surfaceId: point.surfaceId, cell: point.cell, facing: 'south', moving: false, step: null };
      const entry: CampRestState['interactions'][number] = { pointId: point.id, pointLabel: point.label, characterId: actor.id, characterLabel: actor.label, activityId: action.id, action: 'used', at: ++serial };
      const position = () => new Vector3((point.cell.col + .5) * 1.5, .1, (point.cell.row + .5) * 1.5);
      effects.update(entry.at + 500, [entry], [actor], position, () => 1.05, false);
      expect(scene.meshes.length, action.id).toBeGreaterThan(0);
      expect(scene.meshes.every(m => !m.isPickable && m.metadata?.campActivity === action.id)).toBe(true);
      const transform = (mesh: (typeof scene.meshes)[number]) => JSON.stringify([...mesh.position.asArray(), ...mesh.rotation.asArray(), ...mesh.scaling.asArray()]);
      const before = scene.meshes.map(transform);
      effects.update(entry.at + 1600, [entry], [actor], position, () => 1.05, false);
      expect(scene.meshes.some((mesh, i) => transform(mesh) !== before[i]), action.id).toBe(true);
      actor.moving = true; effects.update(entry.at + 1700, [entry], [actor], position, () => 1.05, false);
      expect(scene.meshes).toHaveLength(0);
      actor.moving = false; effects.update(entry.at + 1800, [entry], [actor], position, () => 1.05, false);
      expect(scene.meshes).toHaveLength(0);
      expect(scene.materials).toHaveLength(baseMaterials);
    }
    effects.dispose(); scene.dispose(); engine.dispose();
  });
});
