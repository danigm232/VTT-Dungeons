import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Cell, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { CampRestPhase, CampRestState } from '../../../engine/shared/camp-rest.js';
import type { EnvironmentState } from '../../../engine/shared/protocol.js';
import { createA1Visuals } from './a1-visuals.js';
import { createOutdoorVisuals } from './outdoor-visuals.js';

export type CampVisuals = {
  root: TransformNode;
  update: (elapsedSeconds: number, phase?: CampRestPhase | null, interactions?: CampRestState['interactions'], focusCell?: Cell | null, environment?: EnvironmentState, serverNow?: number) => void;
  weatherCovered?: (x: number, z: number) => boolean;
  setInteractionHighlights: (target: boolean | string | null) => void;
};

/** Reuses the authoritative grid, cameras, characters and interactions of the VTT. */
export function createCampVisuals(scene: Scene, definition: PublicSceneDefinition): CampVisuals | null {
  if (!definition.camp) return null;
  return definition.id === 'camp-a1-rooms' ? createA1Visuals(scene, definition) : createOutdoorVisuals(scene, definition);
}
