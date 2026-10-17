import type { Cell } from './campaign.js';

const wreckPlanScale=41/42;
const originalStations=[[-31.5,4.2],[-30,6.35],[-27,8.8],[-22,10.1],[-18,10.5],
  [0,10.55],[14,10.5],[20,10.3],[24,8.4],[28,5.2],[30,2.4],[31.5,.12]] as const;

/** Metres relative to the keel. Both navigation and the exterior renderer use
 * this profile; changing a beam station cannot leave an old square floor. */
export const WRECK_STRUCTURE = {
  length: 61.5, planScale: wreckPlanScale, tileMeters: 1.5, origin: { x: 42, z: 20.25 },
  sternX: -30.75, bowX: 30.75, listSlope: .015,
  mainHeight: 0, upperHeight: 3, seaHeight: -3.05, keelHeight: -7.1,
  // The torn lip barely breaks the surface; C9 and its traversable entrance
  // stay submerged. This lets the exterior camera read the damage at sea level.
  sternBreachTop: -2.78,
  sternDeckEnd: -13.5, bowDeckStart: 13.5, crowHeight: 15, crowRadius: 2.9,
  // Soft walking bed now fills the cofa. Only the raised outer rim has volume;
  // the original inner exclusion and P10 landing remain unchanged.
  nestRadius: 2.86,
  nestCoreRadius: 1.55,
  stations: originalStations.map(([x,z])=>[x*wreckPlanScale,z*wreckPlanScale] as const)
};
/** A slight starboard rise agrees with C8's 15–45 cm flood gradient. */
export const wreckListHeight = (worldZ: number) => (worldZ - WRECK_STRUCTURE.origin.z) * WRECK_STRUCTURE.listSlope;
export const WRECK_CABINS = {
  c4: { minCol: 12, maxCol: 17, minRow: 9, maxRow: 12 },
  c5: { minCol: 12, maxCol: 17, minRow: 14, maxRow: 18 },
  c6: { minCol: 38, maxCol: 43, minRow: 9, maxRow: 12 },
  c7: { minCol: 38, maxCol: 43, minRow: 14, maxRow: 18 }
} as const;
/** Rebase existing room contents under their corresponding raised decks. */
export function wreckCabinContentCell(id: string, cell: Cell): Cell {
  return { ...cell, col: cell.col + (/^c[45]-|^torch-c[45]$/.test(id) ? -6 : /^c[67]-|^torch-c[67]$/.test(id) ? 5 : 0) };
}
export type PlanPoint = { x: number; z: number };
export function wreckBeamAt(x: number) {
  const stations = WRECK_STRUCTURE.stations;
  if (x < WRECK_STRUCTURE.sternX || x > WRECK_STRUCTURE.bowX) return 0;
  for (let i = 1; i < stations.length; i++) {
    const [ax, az] = stations[i - 1]!, [bx, bz] = stations[i]!;
    if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax);
  }
  return stations.at(-1)![1];
}
export function wreckHullContains(x: number, z: number, inset = 0) {
  return x >= WRECK_STRUCTURE.sternX && x <= WRECK_STRUCTURE.bowX && Math.abs(z) <= wreckBeamAt(x) - inset;
}
export function wreckHullPlan(world = true): PlanPoint[] {
  const { origin, stations } = WRECK_STRUCTURE;
  return [...stations.map(([x, beam]) => ({ x, z: -beam })),
    ...[...stations].reverse().map(([x, beam]) => ({ x, z: beam }))]
    .map(p => ({ x: p.x + (world ? origin.x : 0), z: p.z + (world ? origin.z : 0) }));
}
/** Upper deck edges sheared at the grounding quarter and fallen foremast.
 * These cuts are shared by walkable polygons, deck thickness and rail edges. */
export function wreckUpperDeckPlan(surface:'c2'|'c3',world=true):PlanPoint[] {
  const {origin,planScale:k}=WRECK_STRUCTURE;
  return wreckHullPlan(false).map(p=>{const x=p.x/k,near=(value:number)=>Math.abs(x-value)<.001;
    return {x:p.x,z:surface==='c3'&&p.z>0
      ? near(-31.5)?1.2*k:near(-30)?4.8*k:near(-27)?8.4*k:p.z
      :surface==='c2'&&p.z<0 ? near(28)?-3.8*k:near(30)?-1.8*k:p.z :p.z};})
    .map(p=>({x:p.x+(world?origin.x:0),z:p.z+(world?origin.z:0)}));
}
export function planContains(plan:PlanPoint[],p:PlanPoint):boolean {
  let inside=false;
  for(let i=0,j=plan.length-1;i<plan.length;j=i++){
    const a=plan[i]!,b=plan[j]!;
    if((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
/** Clip a convex plan to an axis-aligned rectangle. Coordinates remain in
 * metres until the final normalization, avoiding seams between adjacent cells. */
export function clipPlanToRect(plan: PlanPoint[], minX: number, minZ: number, maxX: number, maxZ: number): PlanPoint[] {
  let output = plan;
  for (const [axis, limit, direction] of [['x', minX, 1], ['x', maxX, -1], ['z', minZ, 1], ['z', maxZ, -1]] as const) {
    const input = output; output = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i]!, b = input[(i + 1) % input.length]!;
      const ai = (a[axis] - limit) * direction >= -.000001, bi = (b[axis] - limit) * direction >= -.000001;
      if (ai) output.push(a);
      if (ai !== bi) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        output.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
  }
  // Adjacent clipping planes can produce a repeated corner. Degenerate
  // triangles cause unstable normals in WebGL, so drop those repetitions.
  return output.filter((p, i) => Math.hypot(p.x - output[(i + output.length - 1) % output.length]!.x,
    p.z - output[(i + output.length - 1) % output.length]!.z) > .00001);
}
export function planArea(plan: PlanPoint[]) {
  return Math.abs(plan.reduce((sum, p, i) => {
    const next = plan[(i + 1) % plan.length]!; return sum + p.x * next.z - next.x * p.z;
  }, 0)) / 2;
}
export function wreckCellPolygon(cell: Cell,plan=wreckHullPlan()): Array<[number, number]> {
  const m = WRECK_STRUCTURE.tileMeters, minX = cell.col * m, minZ = cell.row * m;
  const clipped = clipPlanToRect(plan, minX, minZ, minX + m, minZ + m);
  return clipped.map(p => [Math.max(0, Math.min(1, (p.x - minX) / m)), Math.max(0, Math.min(1, (p.z - minZ) / m))]);
}
export function circleCellPolygon(cell: Cell, center: PlanPoint, radius: number, tileMeters = 1.5): Array<[number, number]> {
  const ring = Array.from({ length: 40 }, (_, i) => ({ x: center.x + Math.cos(i / 40 * Math.PI * 2) * radius,
    z: center.z + Math.sin(i / 40 * Math.PI * 2) * radius }));
  return clipPlanToRect(ring, cell.col * tileMeters, cell.row * tileMeters, (cell.col + 1) * tileMeters, (cell.row + 1) * tileMeters)
    .map(p => [Math.max(0,Math.min(1,(p.x - cell.col * tileMeters) / tileMeters)), Math.max(0,Math.min(1,(p.z - cell.row * tileMeters) / tileMeters))]);
}
