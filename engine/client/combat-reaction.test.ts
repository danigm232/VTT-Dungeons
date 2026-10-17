import {expect,it,vi} from 'vitest';
import {WorldRenderer} from '../../apps/web/world';
it('animates only the receiving character on a resolved attack snapshot',()=>{
  const renderer:any=Object.create(WorldRenderer.prototype);renderer.playTokenAnimation=vi.fn();
  renderer.playCombatTokenAnimation({id:'hit',kind:'damage',actorId:'caster',targetId:'target',animation:'spell',reactionAnimation:'hit-fire'});
  expect(renderer.playTokenAnimation).toHaveBeenCalledExactlyOnceWith('target','hit-fire',580);
  renderer.playTokenAnimation.mockClear();
  renderer.playCombatTokenAnimation({id:'fall',kind:'defeat',actorId:'caster',targetId:'target',animation:'spell',reactionAnimation:'hit-fire'});
  expect(renderer.playTokenAnimation).toHaveBeenCalledExactlyOnceWith('target','fall',650);
});
it('uses authored reaction art when present and the old hit art otherwise',()=>{
  const renderer:any=Object.create(WorldRenderer.prototype);
  const hit={frames:['old-hit.png'],fps:7},fire={frames:['new-fire.png'],fps:7};
  renderer.campaign={tokens:{},tokenAnimations:{npc:{hit},player:{hit,'hit-fire':fire}}};
  expect(renderer.animationFor('player','hit-fire')).toBe(fire);
  expect(renderer.animationFor('npc','hit-fire')).toBe(hit);
});
