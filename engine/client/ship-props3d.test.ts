import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import type { PublicProp } from '../shared/protocol.js';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { buildShipPropVisual, shipPropVisualKey } from './ship-props3d.js';

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(engine => engine.dispose()));
const sceneFor = () => { const engine = new NullEngine(); engines.push(engine); return new Scene(engine); };
const common = { label: 'Prueba', assetId: 'ship-prop-m5', surfaceId: 'main', cell: { col: 1, row: 1 },
  footprint: [{ col: 0, row: 0 }], rotation: 0 as const, structure: 'intact' as const,
  capabilities: { transform: false, detach: false, structure: true } };

describe('independent ship artwork', () => {
  it('builds recognizable non-pickable meshes without changing movement geometry', () => {
    const scene = sceneFor();
    const prop = { ...common, id: 'c2-ballista-blockout', kind: 'crate' } as PublicProp;
    const visual = buildShipPropVisual(scene, prop, 3, 2);
    expect(visual.getChildMeshes().some(mesh => mesh.name.includes('bolt'))).toBe(true);
    expect(visual.getChildMeshes().some(mesh => mesh.name.includes('winch'))).toBe(true);
    expect(visual.getChildMeshes().every(mesh => !mesh.isPickable)).toBe(true);
    expect(visual.getChildMeshes().every(mesh => !mesh.checkCollisions)).toBe(true);
  });
  it('changes door visual key and bar when the DM opens the C4 door', () => {
    const scene = sceneFor();
    const closed = { ...common, id: 'c4-barred-door', kind: 'door', state: 'closed',
      interaction: { kind: 'barred-door', barrier: 'barred' } } as PublicProp;
    const opened = { ...closed, state: 'open', interaction: { kind: 'barred-door', barrier: 'removed' } } as PublicProp;
    const closedVisual = buildShipPropVisual(scene, closed, 1.5, 1.5);
    const openVisual = buildShipPropVisual(scene, opened, 1.5, 1.5);
    expect(shipPropVisualKey(closed)).not.toBe(shipPropVisualKey(opened));
    expect(closedVisual.getChildMeshes().some(mesh => mesh.name.includes('wooden-bar'))).toBe(true);
    expect(openVisual.getChildMeshes().some(mesh => mesh.name.includes('wooden-bar'))).toBe(false);
    expect(openVisual.getChildMeshes().some(mesh => mesh.name.includes('hinged-leaf'))).toBe(true);
    expect(closedVisual.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(openVisual.rotation.y).toBeCloseTo(Math.PI / 2);
  });
  it('never displays the C9 package or C6 hidden treasure inside closed furniture', () => {
    const scene = sceneFor();
    const chest = { ...common, id: 'c9-iron-chest', kind: 'crate',
      interaction: { kind: 'chest', open: false, location: 'submerged', package: 'contained', lootTaken: false, openedLocation: null } } as PublicProp;
    const stash = { ...common, id: 'c6-trapped-stash', kind: 'crate',
      interaction: { kind: 'trap-stash', revealed: true, open: false, trap: 'armed', lootTaken: false } } as PublicProp;
    for (const prop of [chest, stash]) {
      const visual = buildShipPropVisual(scene, prop, 1.5, 1.5);
      expect(visual.getChildMeshes().some(mesh => /package|pouch|treasure|gold/i.test(mesh.name))).toBe(false);
    }
  });
  it('has independent artwork for every authored ship prop, not a fallback cube', () => {
    const scene = sceneFor();
    const authored = wreckRuntimeScenes[0]!.props;
    expect(authored.length).toBeGreaterThan(25);
    for (const definition of authored) {
      const prop = { ...definition, footprint: definition.baseFootprint, structure: 'intact',
        ...(definition.kind === 'door' ? { state: 'closed' } : {}),
        ...(definition.kind === 'wheel' ? { state: 'upright', attachment: 'attached' } : {}) } as unknown as PublicProp;
      const visual = buildShipPropVisual(scene, prop, 1.5, 1.5);
      expect(visual.getChildMeshes().length, definition.id).toBeGreaterThan(1);
      expect(visual.getChildMeshes().every(mesh => !mesh.isPickable), definition.id).toBe(true);
    }
  });
});
