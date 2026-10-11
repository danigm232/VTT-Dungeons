import type { CampActivityId } from '../shared/camp-activities.js';
import type { InteractionTiming } from './interaction-animation.js';

export type InteractionActorPose = {
  action: CampActivityId; timing: InteractionTiming;
  /** Direction projected onto camera-right, not an assumed front-facing pose. */
  facingX: number; anchorY: number; heightFraction: number;
};

/** Conservative 2.5D articulation for existing painted PNGs. It is not a 3D
 * skeleton and never manufactures missing back views. Boots stay planted;
 * shoulders, forearms and torso move independently instead of rotating a card.
 * Normalised painted height ignores transparent borders and map zoom. */
export function interactionActorVertex(u: number, v: number, pose?: InteractionActorPose) {
  if (!pose) return { x: u - .5, y: .5 - v };
  const height = (pose.anchorY - v) / Math.max(.05, pose.heightFraction);
  const { reach, work, seconds } = pose.timing;
  const torso = Math.max(0, Math.min(1, (height - .3) / .45));
  const armBand = Math.max(0, 1 - Math.abs(height - .59) / .19);
  const arm = armBand * Math.pow(Math.min(1, Math.abs(u - .5) * 2.7), 2);
  let hand = .022, cycle = Math.sin(seconds * 4.5), lower = 0;
  if (pose.action === 'cook') { hand = .04; cycle = Math.sin(seconds * 5); }
  else if (pose.action === 'tend-fire' || pose.action === 'prepare-bed' || pose.action === 'shelter') { hand = .046; lower = .018; }
  else if (pose.action === 'study' || pose.action === 'tools' || pose.action === 'inspect') hand = .034;
  else if (pose.action === 'pray') { hand = .042; cycle = Math.sin(seconds * 2); }
  else if (pose.action === 'guard') { hand = .012; cycle = Math.sin(seconds * 1.7); }
  else if (pose.action === 'rest') { hand = .004; cycle = Math.sin(seconds * 2); }
  const direction = Math.max(-1, Math.min(1, pose.facingX));
  return { x: u - .5 + torso * reach * .012 * direction + arm * (reach * hand * direction + work * .008 * cycle),
    y: .5 - v + arm * reach * hand * .55 + torso * work * .003 * cycle - torso * reach * lower };
}
