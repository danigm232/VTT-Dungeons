import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';

/** Replace the decorative retaining strip with a continuous rocky face.
 * The back edge remains seated under the original walkway. */
export function sculptRetreatCornice(source: Mesh): Mesh {
  source.computeWorldMatrix(true);
  const { minimumWorld: min, maximumWorld: max } = source.getBoundingInfo().boundingBox;
  const sections = 29;
  const rows = 6;
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], normals: number[] = [];
  const vertex = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    uvs.push((x + .28 * (z - min.z)) / 2.7, (y + .45 * (z - min.z)) / 2.7);
  };
  for (let column = 0; column <= sections; column++) {
    const t = column / sections;
    const x = min.x + (max.x - min.x) * t;
    const envelope = Math.min(1, column / 2, (sections - column) / 2);
    const ridge = (.66 * Math.sin(column * 1.73) + .34 * Math.sin(column * .81 + 1));
    // A sloped cap hides the straight seam beneath the existing paving.
    vertex(x, max.y, min.z);
    for (let row = 0; row < rows; row++) {
      const v = row / (rows - 1);
      const facets = Math.sin(column * 1.91 + row * 1.34);
      const y = max.y - (max.y - min.y) * v - envelope *
        (v === 0 ? .13 + .25 * Math.abs(ridge) : .29 * facets * Math.sin(Math.PI * v));
      const z = max.z - .29 + envelope * (ridge * .56 + facets * .43 * Math.sin(Math.PI * v));
      vertex(x + envelope * .52 * facets * Math.sin(Math.PI * v), y, z);
    }
    vertex(x, min.y, min.z);
  }
  const stride = rows + 2;
  for (let column = 0; column < sections; column++) for (let row = 0; row < stride - 1; row++) {
    const a = column * stride + row, b = a + stride;
    if ((column + row) % 2) indices.push(a, a + 1, b, a + 1, b + 1, b);
    else indices.push(a, a + 1, b + 1, a, b + 1, b);
  }
  for (const end of [0, sections * stride]) {
    for (let row = 1; row < stride - 1; row++) {
      if (end === 0) indices.push(end, end + row + 1, end + row);
      else indices.push(end, end + row, end + row + 1);
    }
  }
  for (let column = 0; column < sections; column++) {
    const a = column * stride, b = a + stride;
    indices.push(a, b, a + stride - 1, a + stride - 1, b, b + stride - 1);
  }
  for (let i = 0; i < indices.length; i += 3) {
    [indices[i + 1], indices[i + 2]] = [indices[i + 2]!, indices[i + 1]!];
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const rock = new Mesh(source.name + ':broken-face', source.getScene());
  const data = new VertexData();
  Object.assign(data, { positions, indices, normals, uvs });
  data.applyToMesh(rock);
  rock.material = source.material;
  rock.receiveShadows = source.receiveShadows;
  rock.isPickable = false;
  rock.checkCollisions = false;
  rock.metadata = { ...source.metadata, content: 'VTT_AMBIENCE', tokenOccluder: false };
  source.setEnabled(false);
  return rock;
}
