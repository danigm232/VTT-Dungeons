import { it, expect } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';
import { campRestsPublicCampaign } from '../../campaigns/camp-rests/public/pack';
it('places every camp sitter on the actual bench, not its approach square', () => {
  for (const scene of campRestsPublicCampaign.scenes.filter(scene => scene.seats?.length)) {
    const renderer = Object.create(WorldRenderer.prototype) as any;
    Object.assign(renderer, { campaign: campRestsPublicCampaign, sceneId: scene.id, snapshot: { combat: { active: false } } });
    for (const seat of scene.seats!) {
      const entity = { id: 'maria', tokenId: 'rogue', cell: seat.cell, surfaceId: seat.surfaceId, seatId: seat.id, moving: false, step: null };
      const seated = renderer.interpolatedWorldPosition(entity);
      expect(seated.x).toBe(seat.position.x); expect(seated.z).toBe(seat.position.z);
      delete (entity as any).seatId;
      const standing = renderer.interpolatedWorldPosition(entity);
      expect(standing.x).toBe((seat.cell.col + .5) * scene.terrain!.tileMeters);
      expect(standing.z).toBe((seat.cell.row + .5) * scene.terrain!.tileMeters);
      expect(seated.y).toBe(standing.y);
    }
  }
});
