import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine, Scene, MeshBuilder, StandardMaterial, Vector3, PointLight } from '@babylonjs/core';
import { chamferedTimber, createStormwreckObjectFinish } from './stormwreck-object-finish.js';
import { buildShipPropVisual } from './ship-props3d.js';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import type { PublicProp } from '../shared/protocol.js';

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(e => e.dispose()));
function sceneFor() { const e = new NullEngine(); engines.push(e); return new Scene(e); }

describe('Stormwreck object finish sample', () => {
  it('keeps a closed box envelope and outward normals on faces and chamfers', () => {
    const scene = sceneFor(), mesh = chamferedTimber(scene, 'test', 2, .12, .9);
    const p = mesh.getVerticesData('position')!, n = mesh.getVerticesData('normal')!, ind = mesh.getIndices()!, edges = new Map<string, number>();
    expect(mesh.getBoundingInfo().boundingBox.extendSize.asArray()).toEqual([1, expect.closeTo(.06), expect.closeTo(.45)]);
    for (let i = 0; i < p.length; i += 3) expect(Vector3.Dot(Vector3.FromArray(p, i), Vector3.FromArray(n, i))).toBeGreaterThan(0);
    for (let i = 0; i < ind.length; i += 3) for (let j = 0; j < 3; j++) {
      const points = [ind[i + j]!, ind[i + (j + 1) % 3]!].map(v => p.slice(v * 3, v * 3 + 3).join(',')).sort();
      const key = points.join('|'); edges.set(key, (edges.get(key) ?? 0) + 1);
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
  });
  it('preserves originals, furniture envelopes, shared materials and reversible visibility', () => {
    const scene = sceneFor(), mat = new StandardMaterial('oak', scene), originals = [];
    for (const [id, w, h, d] of [['CANON_Long_Table', 8, .73, .85], ['CANON_Bench_North', 8.7, .46, .28], ['CANON_Bench_South', 8.7, .46, .28], ['CANON_Only_Head_Chair', .52, 1.06, .5]] as const) {
      for (const [i, height, y] of [[0, .085, h - .0425], [1, h - .085, (h - .085) / 2]]) {
        const m = MeshBuilder.CreateBox(id + '_primitive' + i, { width: w, height, depth: d }, scene);
        m.position.set(120, 18 + y!, 60 + (id.includes('North') ? -1 : id.includes('South') ? 1 : 0)); m.material = mat;
        originals.push({ m, p: [...m.getVerticesData('position')!], matrix: [...m.computeWorldMatrix(true).asArray()] });
      }
    }
    const light = new PointLight('existing-room-fill', new Vector3(120, 20, 60), scene);
    light.includedOnlyMeshes = originals.map(o => o.m);
    const finish = createStormwreckObjectFinish(scene, 'dragon-rest')!; finish.refresh();
    expect(finish.stats.groups).toBe(4); expect(finish.stats.candidateMeshes).toBe(8);
    for (const record of finish.audit()) for (const axis of ['x', 'y', 'z'] as const) {
      expect(record.afterBounds.min[axis]).toBeGreaterThanOrEqual(record.beforeBounds.min[axis] - .0001);
      expect(record.afterBounds.max[axis]).toBeLessThanOrEqual(record.beforeBounds.max[axis] + .0001);
    }
    for (const { m, p, matrix } of originals) { expect(m.getVerticesData('position')).toEqual(p); expect([...m.getWorldMatrix().asArray()]).toEqual(matrix); expect(m.isEnabled(false)).toBe(false); }
    expect(scene.meshes.filter(m => m.metadata?.objectFinishV1).every(m => !m.isPickable && !m.checkCollisions && m.material === mat)).toBe(true);
    expect(scene.meshes.filter(m => m.metadata?.objectFinishV1).every(m => light.includedOnlyMeshes.includes(m))).toBe(true);
    const faded = scene.meshes.find(m => m.metadata?.objectFinishV1)!;
    faded.visibility = .18; faded.metadata.retreatOcclusionOpacity = .18;
    finish.refresh(); expect(faded.visibility).toBe(.18);
    delete faded.metadata.retreatOcclusionOpacity;
    finish.refresh(); expect(faded.visibility).toBe(1);
    finish.setEnabled(false); expect(originals.every(({ m }) => m.isEnabled(false))).toBe(true);
    finish.setEnabled(true); expect(finish.stats.groups).toBe(4);
    finish.dispose(); expect(scene.meshes).toHaveLength(8); expect(scene.materials.includes(mat)).toBe(true);
  });
  it('finishes C4 and deck props while preserving three desk legs, broken ballista and unrelated cabins', () => {
    const scene = sceneFor(), props = wreckRuntimeScenes[0]!.props;
    for (const id of ['c4-desk-blockout', 'c4-bed-blockout', 'c2-ballista-blockout', 'wheel', 'c6-bunk-01']) {
      const definition = props.find(p => p.id === id)!;
      expect(definition, id).toBeDefined();
      const prop = { ...definition, footprint: definition.baseFootprint, structure: 'intact', state: 'upright', attachment: 'attached' } as unknown as PublicProp;
      buildShipPropVisual(scene, prop, 3, 1.5);
    }
    const before = scene.meshes.filter(m => !m.name.includes('finish:')).map(m => ({ m, p: [...m.getVerticesData('position')!], enabled: m.isEnabled(false) }));
    const finish = createStormwreckObjectFinish(scene, 'wreck-ship')!; finish.refresh();
    const audit = finish.audit();
    expect(audit.some(r => r.id.startsWith('wheel:'))).toBe(true);
    expect(audit.filter(r => /c4-desk.*:leg:/.test(r.id))).toHaveLength(3);
    expect(audit.some(r => r.id.startsWith('c2-ballista'))).toBe(true);
    expect(audit.some(r => r.id.startsWith('c6'))).toBe(false);
    expect(scene.meshes.find(m => m.name.includes('fractured-stock'))!.isEnabled(false)).toBe(true);
    for (const { m, p } of before) expect(m.getVerticesData('position')).toEqual(p);
    finish.setEnabled(false); for (const { m, enabled } of before) expect(m.isEnabled(false)).toBe(enabled);
  });
  it('leaves other campaigns untouched', () => { const s = sceneFor(); expect(createStormwreckObjectFinish(s, 'dinner')).toBeNull(); expect(s.meshes).toHaveLength(0); });
  it('waits for the landscape owner to finish GLTF handedness before baking herbs', () => {
    const scene = sceneFor(), leaf = MeshBuilder.CreateBox('R3_Upper_Planter_7_R3_Olive', { width: 2, height: .4, depth: .6 }, scene);
    leaf.material = new StandardMaterial('R3_Olive', scene); leaf.position.set(-120, 18.8, -72);
    let ready = false; const finish = createStormwreckObjectFinish(scene, 'dragon-rest', () => ready)!;
    finish.refresh(); expect(finish.stats.groups).toBe(0); expect(leaf.isEnabled()).toBe(true);
    leaf.position.set(120, 18.8, 72); ready = true; finish.refresh();
    const record = finish.audit()[0]!; expect(record.id).toBe(leaf.name);
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(record.afterBounds.min[axis]).toBeGreaterThanOrEqual(record.beforeBounds.min[axis] - .0001);
      expect(record.afterBounds.max[axis]).toBeLessThanOrEqual(record.beforeBounds.max[axis] + .0001);
    }
  });
  it('releases replaced prop bindings and keeps visibility under the existing parent', () => {
    const scene = sceneFor(), definition = wreckRuntimeScenes[0]!.props.find(p => p.id === 'c4-desk-blockout')!;
    const prop = { ...definition, footprint: definition.baseFootprint, structure: 'intact' } as unknown as PublicProp;
    let root = buildShipPropVisual(scene, prop, 3, 1.5);
    const finish = createStormwreckObjectFinish(scene, 'wreck-ship')!; finish.refresh(); const stats = { ...finish.stats };
    root.setEnabled(false); expect(root.getChildMeshes().filter(m => m.metadata?.objectFinishV1).every(m => !m.isEnabled())).toBe(true);
    root.dispose(); root = buildShipPropVisual(scene, prop, 3, 1.5); finish.refresh();
    expect(finish.stats).toEqual(stats); expect(finish.audit().length).toBe(stats.groups);
    for (const entry of finish.audit()) for (const axis of ['x', 'y', 'z'] as const) {
      expect(entry.afterBounds.min[axis]).toBeGreaterThanOrEqual(entry.beforeBounds.min[axis] - .0001);
      expect(entry.afterBounds.max[axis]).toBeLessThanOrEqual(entry.beforeBounds.max[axis] + .0001);
    }
  });
  it('uses each planter soil elevation and restores the sample without reallocating objects', () => {
    const scene=sceneFor(),mat=new StandardMaterial('R3_Olive',scene);
    for(const [id,ground]of [['R3_Upper_Planter_7',18],['R3_A1_Trailing_Herbs_0',9],['R3_Lower_Stair_Planter_0',1]] as const){
      const soil=MeshBuilder.CreateBox(id+'_a1_earth-v6',{width:1.4,height:.035,depth:.48},scene);soil.position.set(120,ground+.575,72);
      const herb=MeshBuilder.CreateBox(id+'_R3_Olive',{width:1.5,height:.42,depth:.6},scene);herb.position.set(120,ground+.79,72);herb.material=mat;
    }
    const finish=createStormwreckObjectFinish(scene,'dragon-rest',()=>true,'zones')!;finish.refresh();expect(finish.stats.groups).toBe(3);
    for(const record of finish.audit())for(const axis of ['x','y','z'] as const){
      expect(record.afterBounds.min[axis]).toBeGreaterThanOrEqual(record.beforeBounds.min[axis]-.0001);
      expect(record.afterBounds.max[axis]).toBeLessThanOrEqual(record.beforeBounds.max[axis]+.0001);
    }
    const count=scene.meshes.length;
    finish.setScope('sample');expect(finish.audit().filter(r=>r.active)).toHaveLength(1);
    expect(scene.getMeshByName('R3_Lower_Stair_Planter_0_R3_Olive')!.isEnabled()).toBe(true);
    finish.setScope('zones');expect(finish.audit().every(r=>r.active)).toBe(true);expect(scene.meshes).toHaveLength(count);
  });
});
