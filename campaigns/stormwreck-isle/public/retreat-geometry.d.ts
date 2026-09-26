import type { Scene, TransformNode } from '@babylonjs/core';
export declare function createDragonRestVisuals(scene: Scene): {
  root: TransformNode;
  openLibraryDoor(open: boolean): void;
  stats: { sourceMeshes: number; mergedBatches: number; source: string; tileMeters: number };
};
