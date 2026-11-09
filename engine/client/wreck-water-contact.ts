import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { WRECK_STRUCTURE as S, wreckListHeight } from '../shared/wreck-structure.js';

export const wreckHullBands = [S.keelHeight, -6.55, -5.8, -4.35, S.sternBreachTop, -1.7, -.48, 0];
export const wreckHullFullness = [.19, .92, .955, .97, .99, 1, 1, 1];
export const wreckSideBreachEnd = S.sternX + 3;

export function wreckStrakeBeam(beam: number, localHeight: number) {
  for(let i=1;i<wreckHullBands.length;i++){
    const top=wreckHullBands[i]!,bottom=wreckHullBands[i-1]!;
    if(localHeight>top)continue;
    const t=Math.max(0,(localHeight-bottom)/(top-bottom));
    return beam*(wreckHullFullness[i-1]!+(wreckHullFullness[i]!-wreckHullFullness[i-1]!)*t);
  }
  return beam;
}

/** The sea intersects the listed hull between the same two strakes used by the shell. */
export function wreckWaterlineBeam(beam: number, side: number) {
  const low = wreckHullBands[3]!, high = wreckHullBands[4]! - .016;
  const lowerBeam = beam * wreckHullFullness[3]!, upperBeam = beam * wreckHullFullness[4]!;
  const t = (S.seaHeight - low - wreckListHeight(S.origin.z + side * lowerBeam))
    / (high - low + S.listSlope * side * (upperBeam - lowerBeam));
  return lowerBeam + (upperBeam - lowerBeam) * t;
}

/** Identical phase and displacement for the sea and its overlays. */
export const wreckWaveGLSL = `float wreckWave(vec2 point, float time) {
  return .035*sin(point.x*.08+point.y*.06+time*.75)+.012*sin(point.y*.11-point.x*.07-time*.93);
}`;

export const wreckBeamGLSL = `float wreckBeam(float x){
  ${S.stations.slice(0,-1).map(([x,w],i)=>{
    const [next,beam]=S.stations[i+1]!;
    return `if(x<=${next.toFixed(3)})return mix(${w.toFixed(3)},${beam.toFixed(3)},clamp((x-(${x.toFixed(3)}))/${(next-x).toFixed(3)},0.,1.));`;
  }).join('\n')}
  return .12;
}`;

export type WaterPoint = { x: number; z: number };

/** Slice the rendered triangles after placement, including clamped rock faces
 * and tapered rib sections. Weld duplicated face vertices into waterlines. */
export function sliceWreckWaterline(mesh: Mesh, level = S.seaHeight): WaterPoint[][] {
  const positions = mesh.getVerticesData('position'), indices = mesh.getIndices();
  if (!positions || !indices) return [];
  const { x, y, z } = mesh.position;
  const points = new Map<string, WaterPoint>(), edges = new Map<string, Set<string>>();
  const key = (p: WaterPoint) => `${Math.round(p.x * 2000)}:${Math.round(p.z * 2000)}`;
  for (let i = 0; i < indices.length; i += 3) {
    const cuts: WaterPoint[] = [];
    for (let j = 0; j < 3; j++) {
      const a = indices[i + j]! * 3, b = indices[i + (j + 1) % 3]! * 3;
      const ay = positions[a + 1]! + y - level, by = positions[b + 1]! + y - level;
      if ((ay < 0) === (by < 0)) continue;
      const t = ay / (ay - by);
      cuts.push({ x: x + positions[a]! + (positions[b]! - positions[a]!) * t,
        z: z + positions[a + 2]! + (positions[b + 2]! - positions[a + 2]!) * t });
    }
    if (cuts.length !== 2) continue;
    const a = key(cuts[0]!), b = key(cuts[1]!);
    if (a === b) continue;
    points.set(a, cuts[0]!); points.set(b, cuts[1]!);
    if (!edges.has(a)) edges.set(a, new Set());
    if (!edges.has(b)) edges.set(b, new Set());
    edges.get(a)!.add(b); edges.get(b)!.add(a);
  }
  const paths: WaterPoint[][] = [];
  for (const [start, neighbours] of edges) while (neighbours.size) {
    const path = [points.get(start)!];
    let at = start;
    while (edges.get(at)?.size) {
      const next = edges.get(at)!.values().next().value!;
      edges.get(at)!.delete(next); edges.get(next)!.delete(at);
      path.push(points.get(next)!); at = next;
      if (at === start) break;
    }
    if (path.length < 3) continue;
    // Clockwise in X/Z means the left normal points out into the sea.
    const area = path.slice(1).reduce((sum, p, i) => sum + path[i]!.x * p.z - p.x * path[i]!.z, 0);
    if (area > 0) path.reverse();
    paths.push(path);
  }
  return paths;
}

/** One static ribbon batch per formation. Only the shader follows the waves. */
export function buildWreckWaterContact(scene: Scene, name: string, paths: WaterPoint[][], width: number, strength: number, inset = .025) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (const path of paths) {
    if (path.length < 2) continue;
    const first = path[0]!, last = path.at(-1)!;
    const closed = Math.hypot(first.x - last.x, first.z - last.z) < .002;
    const origin = positions.length / 3;
    for (let i = 0; i < path.length; i++) {
      const p = path[i]!, prev = path[i - 1] ?? (closed ? path.at(-2)! : p);
      const next = path[i + 1] ?? (closed ? path[1]! : p);
      const dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1;
      const fade = closed || (i > 0 && i < path.length - 1) ? strength : strength * .28;
      for (const [offset, across] of [[-inset, 0], [width, 1]] as const) {
        positions.push(p.x - dz / length * offset, S.seaHeight + .014, p.z + dx / length * offset);
        uvs.push(across, fade);
      }
      if (i) {
        const n = origin + (i - 1) * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
  }
  if (!indices.length) return null;
  const mesh = new Mesh(name, scene), data = new VertexData();
  Object.assign(data, { positions, uvs, indices }); data.applyToMesh(mesh);
  mesh.isPickable = false;mesh.alphaIndex=1;
  mesh.metadata = { visualOnly: true, kind: 'contact-foam', deckSurfaceId: 'sea' };
  return mesh;
}
