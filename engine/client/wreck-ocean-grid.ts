import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** One connected ocean: 4 m cells throughout the playable water, then shared
 * concentric rings out to the original 1,600 m extent. Adjacent bands share
 * vertex indices, so world-space wave displacement cannot open a seam.
 * This replaces a uniform 12.5 m grid with finer local water and fewer distant
 * triangles; neither the shader nor the authoritative swimming grid changes.
 */
export function buildWreckOceanGrid(scene: Scene) {
  const segments = 24, innerRadius = 48, positions: number[] = [], indices: number[] = [];
  const stride = segments + 1;
  for (let z = 0; z <= segments; z++) for (let x = 0; x <= segments; x++) {
    positions.push(-innerRadius + x * 4, 0, -innerRadius + z * 4);
    if (x < segments && z < segments) {
      const a = z * stride + x;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  // Counter-clockwise boundary, each corner once. Use those exact indices
  // as the first band's inner edge rather than duplicating its perimeter.
  let edge = [
    ...Array.from({length:segments}, (_, i) => i),
    ...Array.from({length:segments}, (_, i) => i * stride + segments),
    ...Array.from({length:segments}, (_, i) => segments * stride + segments - i),
    ...Array.from({length:segments}, (_, i) => (segments - i) * stride)
  ];
  const boundary = edge.map(i => [positions[i * 3]!, positions[i * 3 + 2]!] as const);
  for (const radius of [96, 192, 384, 800]) {
    const outer = boundary.map(([x, z]) => {
      const index = positions.length / 3;
      positions.push(x * radius / innerRadius, 0, z * radius / innerRadius); return index;
    });
    for (let i = 0; i < edge.length; i++) {
      const j = (i + 1) % edge.length;
      indices.push(edge[i]!, edge[j]!, outer[i]!, edge[j]!, outer[j]!, outer[i]!);
    }
    edge = outer;
  }
  // Babylon's left-handed front-face convention is the reverse of the
  // mathematical X/Z cross product used above. Match CreateGround winding.
  for(let i=0;i<indices.length;i+=3){const swap=indices[i+1]!;indices[i+1]=indices[i+2]!;indices[i+2]=swap;}
  const data = new VertexData(), normals: number[] = [];
  Object.assign(data, { positions, indices }); VertexData.ComputeNormals(positions, indices, normals);
  data.normals = normals;
  const mesh = new Mesh('wreck-ocean', scene); data.applyToMesh(mesh);
  // The vertex shader displaces waves by at most 4.7 cm. Include that margin
  // in CPU bounds without forcing an update of the static vertex buffer.
  mesh.setBoundingInfo(new BoundingInfo(new Vector3(-800,-.05,-800),new Vector3(800,.05,800)));
  return mesh;
}
