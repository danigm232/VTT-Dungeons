import { describe, expect, it } from 'vitest';
import { D8OcclusionIndex } from './d8-occlusion-index.js';

describe('D8 scenery occlusion index', () => {
  it('keeps candidates along negative and positive map coordinates and excludes distant scenery', () => {
    const index = new D8OcclusionIndex<string>(2);
    index.add({ minX: -4.2, maxX: -3.6, minZ: -0.4, maxZ: 0.4 }, 'west');
    index.add({ minX: 2.2, maxX: 2.8, minZ: -0.4, maxZ: 0.4 }, 'east');
    index.add({ minX: 10, maxX: 12, minZ: 10, maxZ: 12 }, 'distant');

    const candidates = index.segmentCandidates({ x: -6, z: 0 }, { x: 4, z: 0 });
    expect(candidates).toContain('west');
    expect(candidates).toContain('east');
    expect(candidates).not.toContain('distant');
  });

  it('deduplicates wide meshes and includes geometry touching a diagonal cell corner', () => {
    const index = new D8OcclusionIndex<string>(2);
    index.add({ minX: -2, maxX: 2, minZ: -2, maxZ: 2 }, 'wide');
    index.add({ minX: 1.98, maxX: 2.4, minZ: 1.98, maxZ: 2.4 }, 'corner');

    const candidates = index.segmentCandidates({ x: -4, z: -4 }, { x: 4, z: 4 });
    expect(candidates.filter(item => item === 'wide')).toHaveLength(1);
    expect(candidates).toContain('corner');
  });

  it('clears old map buckets before rebuilding', () => {
    const index = new D8OcclusionIndex<string>();
    index.add({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, 'old map');
    index.clear();
    expect(index.segmentCandidates({ x: 0, z: 0 }, { x: 1, z: 1 })).toEqual([]);
  });
});
