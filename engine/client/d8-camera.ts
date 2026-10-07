import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Plane } from '@babylonjs/core/Maths/math.plane.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { surfaceHeight, terrainTile, type TerrainDefinition } from '../shared/terrain';
import { CAMERA_DEFAULT_TILT, CAMERA_MAX_TILT, CAMERA_MIN_TILT } from './camera-profile';

export const D8_CAMERA_DEFAULT_TILT = 25;
export type D8CameraPoint = { x: number; y: number; z: number };
export type D8CameraPose = { alpha: number; beta: number; halfHeight: number; target: D8CameraPoint };

/** Keep the authored front of each map, with a diagonal 3/4 starting view. */
export function d8CameraBaseAlpha(authoredAlpha: number) {
  const alpha = Number.isFinite(authoredAlpha) ? authoredAlpha : -Math.PI / 2;
  return Math.round((alpha - Math.PI / 4) / (Math.PI / 2)) * Math.PI / 2 + Math.PI / 4;
}

export function d8GroundHeight(terrain: TerrainDefinition | undefined, col: number, row: number) {
  if (!terrain) return .045;
  const candidates = [{ col: Math.floor(col), row: Math.floor(row) }];
  if (Number.isInteger(col)) candidates.push({ col: col - 1, row: Math.floor(row) });
  if (Number.isInteger(row)) candidates.push({ col: Math.floor(col), row: row - 1 });
  if (Number.isInteger(col) && Number.isInteger(row)) candidates.push({ col: col - 1, row: row - 1 });
  const heights = candidates.filter(cell => terrainTile(terrain, { surfaceId: terrain.baseSurfaceId, cell }))
    .map(cell => surfaceHeight(terrain, { surfaceId: terrain.baseSurfaceId, cell }, col - cell.col, row - cell.row));
  return (heights.length ? Math.max(...heights) : 0) + .045;
}
type D8Grid = {cols:number;rows:number;worldOrigin?:{x:number;z:number}};
export function d8GridWorldPoint(col:number,row:number,size:[number,number],grid:D8Grid) {
  return {x:(grid.worldOrigin?.x??-size[0]/2)+col*(grid.worldOrigin?1.5:size[0]/grid.cols),z:(grid.worldOrigin?.z??-size[1]/2)+row*(grid.worldOrigin?1.5:size[1]/grid.rows)};
}
export function d8CellWorldPoint(cell: { col: number; row: number }, size: [number, number], grid: D8Grid, terrain?: TerrainDefinition): D8CameraPoint {
  return {...d8GridWorldPoint(cell.col+.5,cell.row+.5,size,grid), y: d8GroundHeight(terrain, cell.col + .5, cell.row + .5)};
}

export function d8PickCell(point: { x: number; y: number }, viewport: { width: number; height: number }, view: Matrix, projection: Matrix, size: [number, number], grid: D8Grid, terrain?: TerrainDefinition) {
  // Both sides use screen units, independently of engine hardware scaling.
  const ray = Ray.CreateNew(point.x, point.y, viewport.width, viewport.height, Matrix.Identity(), view, projection);
  if (terrain) {
    let nearest = Infinity, selected: { col: number; row: number } | null = null;
    for (const tile of terrain.surfaces.find(surface => surface.id === terrain.baseSurfaceId)!.tiles) {
      const { col, row } = tile.cell;
      const corners = [[col,row],[col+1,row],[col+1,row+1],[col,row+1]].map(([c,r], index) => {const p=d8GridWorldPoint(c!,r!,size,grid);return new Vector3(p.x,tile.corners[index]!+.045,p.z);});
      for (const [a,b,c] of [[0,1,2],[0,2,3]]) {
        const hit = ray.intersectsTriangle(corners[a!]!, corners[b!]!, corners[c!]!);
        if (hit && hit.distance >= 0 && hit.distance < nearest) { nearest = hit.distance; selected = tile.cell; }
      }
    }
    return selected;
  }
  const distance = ray.intersectsPlane(Plane.FromPositionAndNormal(new Vector3(0, .045, 0), Vector3.Up()));
  if (distance === null || distance < 0) return null;
  const hit = ray.origin.add(ray.direction.scale(distance));
  const origin=grid.worldOrigin??{x:-size[0]/2,z:-size[1]/2};
  const col = Math.floor((hit.x-origin.x)/(grid.worldOrigin?1.5:size[0]/grid.cols)), row = Math.floor((hit.z-origin.z)/(grid.worldOrigin?1.5:size[1]/grid.rows));
  return col >= 0 && row >= 0 && col < grid.cols && row < grid.rows ? { col, row } : null;
}

/** Centers the upright billboard above its ground anchor at any tilt. */
export function d8FocusHeight(height: number, anchorY: number, beta: number) {
  return height * (anchorY - .5) / Math.max(.1, Math.sin(beta));
}

/** Fits the same rectangle throughout an orbit. Scale never breathes at the
 * intermediate angles, and parallel projection preserves the 2.5D look. */
export function d8CameraHalfHeight(size: { width: number; depth: number; height: number }, beta: number, aspect: number) {
  const groundRadius = Math.hypot(size.width, size.depth) / 2;
  return Math.max(groundRadius / Math.max(.01, aspect), groundRadius * Math.cos(beta) + size.height / 2 * Math.sin(beta)) * 1.08;
}

function damp(current: number, target: number, velocity: number, seconds: number, smoothTime: number) {
  const omega = 2 / smoothTime, displacement = current - target, decay = Math.exp(-omega * seconds);
  const change = (velocity + omega * displacement) * seconds;
  const value = target + (displacement + change) * decay;
  const nextVelocity = (velocity - omega * change) * decay;
  return Math.abs(value - target) < .00001 && Math.abs(nextVelocity) < .0001
    ? { value: target, velocity: 0 } : { value, velocity: nextVelocity };
}

/** One motion clock for rotation, zoom and focus. Network packets do not
 * advance it; interrupted turns retain velocity instead of restarting. */
export class D8CameraMotion {
  private pose: D8CameraPose | null = null;
  private velocity = { alpha: 0, beta: 0, halfHeight: 0, x: 0, y: 0, z: 0 };
  reset() { this.pose = null; this.velocity = { alpha: 0, beta: 0, halfHeight: 0, x: 0, y: 0, z: 0 }; }
  update(target: D8CameraPose, deltaMs: number): D8CameraPose {
    if (!this.pose) {
      this.pose = { ...target, target: { x: target.target.x, y: target.target.y, z: target.target.z } };
      return this.pose;
    }
    if (deltaMs <= 0) return this.pose;
    const seconds = Math.min(100, deltaMs) / 1000;
    const alphaTarget = this.pose.alpha + Math.atan2(Math.sin(target.alpha - this.pose.alpha), Math.cos(target.alpha - this.pose.alpha));
    for (const key of ['alpha', 'beta', 'halfHeight'] as const) {
      const next = damp(this.pose[key], key === 'alpha' ? alphaTarget : target[key], this.velocity[key], seconds, .16);
      this.pose[key] = next.value; this.velocity[key] = next.velocity;
    }
    for (const key of ['x', 'y', 'z'] as const) {
      const next = damp(this.pose.target[key], target.target[key], this.velocity[key], seconds, .20);
      this.pose.target[key] = next.value; this.velocity[key] = next.velocity;
    }
    const beta = Math.max((90 - CAMERA_MAX_TILT) * Math.PI / 180, Math.min((90 - CAMERA_MIN_TILT) * Math.PI / 180, this.pose.beta));
    if (beta !== this.pose.beta) { this.pose.beta = beta; this.velocity.beta = 0; }
    if (this.pose.halfHeight < .75) { this.pose.halfHeight = .75; this.velocity.halfHeight = 0; }
    return this.pose;
  }
}
