import { expect, it } from 'vitest';
import { NullEngine, Scene, Mesh, MeshBuilder, VertexData, Vector3 } from '@babylonjs/core';
import { finishFoliage } from './stormwreck-foliage-finish.js';

it('fills gaps by widening folded leaves inside the existing crown bounds', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const source = new Mesh('R3_Tree_Garden0_crown_R3_Olive', scene);
    const positions = [0,0,0, .5,0,.2, 1,0,0, .5,0,-.2, .5,.1,0, .5,-.1,0];
    const indices = [0,1,4, 1,2,4, 2,3,4, 3,0,4, 1,0,5, 2,1,5, 3,2,5, 0,3,5];
    const data = new VertexData();
    data.positions = [...positions, ...positions.map((v,i) => i%3===0 ? v+2 : v)];
    data.indices = [...indices,...indices.map(i=>i+6)];
    data.applyToMesh(source);
    const finished = finishFoliage(source,'crown');
    const result = finished.getVerticesData('position')!;
    expect(result[6]).toBeCloseTo(1.075);
    expect(result[0]).toBe(0);
    expect(result[24]).toBe(3);
    expect(finished.getTotalIndices()).toBe(source.getTotalIndices());
  } finally { scene.dispose(); engine.dispose(); }
});

it('keeps every original canopy vertex after mirrored import, with shading inside its envelope', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const source = MeshBuilder.CreateSphere('R3_Tree_Garden0_crown_R3_Olive', { diameter: 4, segments: 12 }, scene);
    source.position.set(80, 22, 55); source.scaling.set(-1, 1.2, 1);
    const original = [...source.getVerticesData('position')!], matrix = source.computeWorldMatrix(true).clone();
    const candidate = finishFoliage(source, 'crown'), p = candidate.getVerticesData('position')!;
    expect(candidate.getTotalIndices()).toBe(source.getTotalIndices());
    for (let i = 0; i < original.length; i += 3) expect(Vector3.Distance(Vector3.FromArray(p, i), Vector3.TransformCoordinates(Vector3.FromArray(original, i), matrix))).toBeLessThan(.00001);
    candidate.computeWorldMatrix(true);
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(candidate.getBoundingInfo().boundingBox.minimumWorld[axis]).toBeCloseTo(source.getBoundingInfo().boundingBox.minimumWorld[axis], 4);
      expect(candidate.getBoundingInfo().boundingBox.maximumWorld[axis]).toBeCloseTo(source.getBoundingInfo().boundingBox.maximumWorld[axis], 4);
    }
    expect([...source.getVerticesData('position')!]).toEqual(original);
    expect(candidate.getVerticesData('color')!.length).toBe(candidate.getTotalVertices() * 4);
    expect(candidate.getVerticesData('uv')!.length).toBe(candidate.getTotalVertices() * 2);
  } finally { scene.dispose(); engine.dispose(); }
});

it('groups meadow heights without moving any root or widening the original grass footprint', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const source = MeshBuilder.CreateBox('R3_Garden_Meadow_R3_Grass', { width: 6, depth: 8, height: .24 }, scene);
    source.position.set(80, 18.14, 58); source.computeWorldMatrix(true);
    const before = source.getVerticesData('position')!, matrix = source.getWorldMatrix();
    const mesh = finishFoliage(source, 'meadow'), p = mesh.getVerticesData('position')!;
    expect(mesh.getTotalIndices()).toBe(source.getTotalIndices());
    for (let i = 0; i < p.length; i += 3) {
      const old = Vector3.TransformCoordinates(Vector3.FromArray(before, i), matrix);
      expect(p[i]).toBeCloseTo(old.x, 4); expect(p[i + 2]).toBeCloseTo(old.z, 4);
      expect(p[i + 1]).toBeGreaterThanOrEqual(source.getBoundingInfo().boundingBox.minimumWorld.y - .00001);
      expect(p[i + 1]).toBeLessThanOrEqual(old.y + .00001);
    }
  } finally { scene.dispose(); engine.dispose(); }
});
