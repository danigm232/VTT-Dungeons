export type D8OcclusionBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type D8OcclusionPoint = { x: number; z: number };

/** A small XZ spatial hash for the mostly static scenery in D8 maps. */
export class D8OcclusionIndex<T> {
  private readonly cells = new Map<string, Set<T>>();

  constructor(readonly cellSize = 2.5) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('cellSize must be positive');
  }

  add(bounds: D8OcclusionBounds, item: T) {
    if (![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite)) return;
    // Include meshes which only touch a cell edge in both adjacent cells.
    const epsilon = 1e-6;
    const left = Math.floor((bounds.minX - epsilon) / this.cellSize);
    const right = Math.floor((bounds.maxX + epsilon) / this.cellSize);
    const top = Math.floor((bounds.minZ - epsilon) / this.cellSize);
    const bottom = Math.floor((bounds.maxZ + epsilon) / this.cellSize);
    for (let x = left; x <= right; x++) for (let z = top; z <= bottom; z++) {
      const key = `${x}:${z}`;
      let bucket = this.cells.get(key);
      if (!bucket) this.cells.set(key, bucket = new Set<T>());
      bucket.add(item);
    }
  }

  /** Returns a conservative, de-duplicated candidate set along an XZ segment. */
  segmentCandidates(start: D8OcclusionPoint, end: D8OcclusionPoint): T[] {
    if (![start.x, start.z, end.x, end.z].every(Number.isFinite)) return [];
    const dx = end.x - start.x, dz = end.z - start.z;
    let x = Math.floor(start.x / this.cellSize), z = Math.floor(start.z / this.cellSize);
    const endX = Math.floor(end.x / this.cellSize), endZ = Math.floor(end.z / this.cellSize);
    const stepX = Math.sign(dx), stepZ = Math.sign(dz);
    const deltaX = stepX ? this.cellSize / Math.abs(dx) : Infinity;
    const deltaZ = stepZ ? this.cellSize / Math.abs(dz) : Infinity;
    let maxX = stepX > 0 ? ((x + 1) * this.cellSize - start.x) / dx
      : stepX < 0 ? (x * this.cellSize - start.x) / dx : Infinity;
    let maxZ = stepZ > 0 ? ((z + 1) * this.cellSize - start.z) / dz
      : stepZ < 0 ? (z * this.cellSize - start.z) / dz : Infinity;
    const found = new Set<T>();
    const addCell = (cx: number, cz: number) => {
      const bucket = this.cells.get(`${cx}:${cz}`);
      if (bucket) for (const item of bucket) found.add(item);
    };
    const maxSteps = Math.abs(endX - x) + Math.abs(endZ - z) + 2;
    for (let i = 0; i < maxSteps; i++) {
      addCell(x, z);
      if (x === endX && z === endZ) break;
      if (Math.abs(maxX - maxZ) < 1e-10) {
        // A ray through a grid corner touches both side cells as well as the
        // diagonal cell; include all three to avoid missing edge geometry.
        addCell(x + stepX, z);
        addCell(x, z + stepZ);
        x += stepX; z += stepZ; maxX += deltaX; maxZ += deltaZ;
      } else if (maxX < maxZ) {
        x += stepX; maxX += deltaX;
      } else {
        z += stepZ; maxZ += deltaZ;
      }
    }
    return [...found];
  }

  clear() { this.cells.clear(); }
}
