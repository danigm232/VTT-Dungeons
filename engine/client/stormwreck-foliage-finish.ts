import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';

/** Authored folded leaves have six distinct corners. Group duplicated GLTF
 * corners across UV seams, then widen each leaf about its own centre. */
function fillCrown(positions: number[], indices: number[], min: Vector3, max: Vector3) {
  const corners = new Map<string, number>();
  const unique: Vector3[] = [];
  const vertices: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const point = Vector3.FromArray(positions, i);
    const key = point.asArray().join(',');
    let id = corners.get(key);
    if (id === undefined) {
      id = unique.length;
      corners.set(key, id);
      unique.push(point);
    }
    vertices.push(id);
  }
  const parent = unique.map((_, index) => index);
  function root(id: number) {
    while (parent[id] !== id) {
      parent[id] = parent[parent[id]!]!;
      id = parent[id]!;
    }
    return id;
  }
  for (let i = 0; i < indices.length; i += 3) {
    const first = root(vertices[indices[i]!]!);
    parent[root(vertices[indices[i + 1]!]!)] = first;
    parent[root(vertices[indices[i + 2]!]!)] = first;
  }
  const groups = new Map<number, number[]>();
  unique.forEach((_, index) => {
    const id = root(index);
    const group = groups.get(id) ?? [];
    group.push(index);
    groups.set(id, group);
  });
  for (const group of groups.values()) {
    if (group.length !== 6) continue;
    const centre = group.reduce((sum, id) => sum.addInPlace(unique[id]!), Vector3.Zero()).scaleInPlace(1 / 6);
    for (const id of group) unique[id] = Vector3.Clamp(centre.add(unique[id]!.subtract(centre).scale(1.15)), min, max);
  }
  vertices.forEach((id, index) => unique[id]!.toArray(positions, index * 3));
}

/** Reuses delivered foliage with broad interior shading and grouped grass. */
export function finishFoliage(source: Mesh, kind: 'crown' | 'meadow') {
  const matrix = source.computeWorldMatrix(true), normalMatrix = Matrix.Transpose(Matrix.Invert(matrix));
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const original = source.getVerticesData('position')!, sourceNormals = source.getVerticesData('normal'), sourceColors = source.getVerticesData('color');
  const indices = Array.from(source.getIndices()!), uvs = Array.from(source.getVerticesData('uv') ?? []);
  for (let i = 0; i < original.length; i += 3) {
    const p = Vector3.TransformCoordinates(Vector3.FromArray(original, i), matrix);
    positions.push(p.x, p.y, p.z);
    const n = sourceNormals ? Vector3.TransformNormal(Vector3.FromArray(sourceNormals, i), normalMatrix).normalize() : Vector3.Up();
    normals.push(n.x, n.y, n.z);
    colors.push(...(sourceColors ? Array.from(sourceColors.slice(i / 3 * 4, i / 3 * 4 + 4)) : [1, 1, 1, 1]));
  }
  if (matrix.determinant() < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2]!, indices[i + 1]!];
  const box = source.getBoundingInfo().boundingBox;
  if (kind === 'meadow') {
    // Larger quiet patches between tufts. Every original root/triangle stays;
    // existing clear paths, flowers, ground and collision are untouched.
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]!, z = positions[i + 2]!;
      const field = .5 + .30 * Math.sin(x * 1.30 + Math.sin(z * .70)) + .20 * Math.cos(z * 1.60 - x * .42);
      const density = Math.max(0, Math.min(1, (field - .32) / .42));
      positions[i + 1] = box.minimumWorld.y + (positions[i + 1]! - box.minimumWorld.y) * (.30 + .70 * density);
      const tint = .84 + .16 * density; for (let c = 0; c < 3; c++) colors[i / 3 * 4 + c]! *= tint;
    }
  } else {
    fillCrown(positions, indices, box.minimumWorld, box.maximumWorld);
    // Cluster the actual leaf positions, not a new arrangement of trees.
    const points: Vector3[] = [], stride = Math.max(1, Math.floor(positions.length / 3 / 1024));
    for (let i = 0; i < positions.length / 3; i += stride) points.push(Vector3.FromArray(positions, i * 3));
    const count = /Pine_Dark/.test(source.name) ? 8 : 7, centres = [points.reduce((a, b) => a.y > b.y ? a : b).clone()];
    while (centres.length < count) {
      let best = points[0]!, distance = -1;
      for (const p of points) { const d = Math.min(...centres.map(c => Vector3.DistanceSquared(p, c))); if (d > distance) { best = p; distance = d; } }
      centres.push(best.clone());
    }
    let groups: Vector3[][] = [];
    for (let iteration = 0; iteration < 7; iteration++) {
      groups = centres.map(() => []);
      for (const p of points) { let nearest = 0, distance = Infinity; centres.forEach((c, i) => { const d = Vector3.DistanceSquared(p, c); if (d < distance) { distance = d; nearest = i; } }); groups[nearest]!.push(p); }
      groups.forEach((g, i) => { if (g.length) centres[i] = g.reduce((sum, p) => sum.addInPlace(p), Vector3.Zero()).scale(1 / g.length); });
    }
    const radii = groups.map(group => {
      const minimum = new Vector3(Infinity, Infinity, Infinity);
      const maximum = minimum.scale(-1);
      group.forEach(point => { minimum.minimizeInPlace(point); maximum.maximizeInPlace(point); });
      return Math.max(.1, Vector3.Distance(minimum, maximum) * .30);
    });
    for (let i = 0; i < positions.length; i += 3) {
      const point = Vector3.FromArray(positions, i);
      let nearest = 0, distance = Infinity;
      centres.forEach((centre, index) => {
        const value = Vector3.Distance(point, centre);
        if (value < distance) { distance = value; nearest = index; }
      });
      const edge = Math.min(1, distance / radii[nearest]!);
      const height = (point.y - box.minimumWorld.y) / Math.max(.1, box.maximumWorld.y - box.minimumWorld.y);
      const tint = (.57 + .43 * edge) * (.88 + .12 * height);
      for (let channel = 0; channel < 3; channel++) colors[i / 3 * 4 + channel]! *= tint;
    }
  }
  const mesh = new Mesh('finish:' + source.name, source.getScene()), data = new VertexData();
  Object.assign(data, { positions, indices, normals, colors, ...(uvs.length ? { uvs } : {}) }); data.applyToMesh(mesh);
  return mesh;
}
