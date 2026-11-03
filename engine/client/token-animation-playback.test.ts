import {describe,it,expect} from 'vitest';
import {directedTokenState,sameAnimationAction,tokenAnimationFrame} from './token-animation-playback';

describe('an action has one clock independent of camera facing',()=>{
  it('changes viewpoint without changing action identity, and retains legacy fallback',()=>{
    expect(sameAnimationAction('spell-ne','spell-s')).toBe(true);
    expect(sameAnimationAction('attack-n','attack-arrow-n')).toBe(false);
    expect(directedTokenState('spell-n','w',s=>s==='spell-w')).toBe('spell-w');
    expect(directedTokenState('spell','w',()=>false)).toBe('spell');
  });
  it('holds the final action frame instead of repeating attacks and ignitions',()=>{
    expect(tokenAnimationFrame(6,9,0,false)).toBe(0);
    expect(tokenAnimationFrame(6,9,333,false)).toBe(2);
    expect(tokenAnimationFrame(6,9,800,false)).toBe(5);
    expect(tokenAnimationFrame(6,9,2000,false)).toBe(5);
    expect(tokenAnimationFrame(6,9,800,true)).toBe(1);
  });
  it('uses the complete authoritative flight duration, not the old 333ms loop',()=>{
    for(const [progress,frame] of [[0,0],[.2,1],[.5,3],[.9,5],[1,5]])
      expect(tokenAnimationFrame(6,9,3000,false,progress)).toBe(frame);
    expect(tokenAnimationFrame(0,9,3000,false)).toBe(0);
  });
});
