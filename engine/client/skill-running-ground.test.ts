import {describe,it,expect} from 'vitest';
import {SkillMicroScenePlayback,sampleTrack} from './skill-micro-scene';
import {skillRunningGround} from './skill-running-ground';
import {skillMicroScenes} from '../../apps/web/ui/skill-scenes';

describe('continuidad del suelo de Atletismo y caída de Acrobacias',()=>{
  it('no detiene la textura ni elimina el suelo al cambiar de fase',()=>{
    const scene=skillMicroScenes.find(s=>s.id==='athletics')!;
    const playback=new SkillMicroScenePlayback(scene,0);playback.roll(1000,undefined,()=>.99);
    for(const boundary of [85,1200,1600,2208,2688]) {
      const a=skillRunningGround(playback.frame(1000+boundary-1));
      const b=skillRunningGround(playback.frame(1000+boundary+1));
      expect(b.travel-a.travel).toBeCloseTo(.24,8);
      expect(Math.abs(b.edge-a.edge)).toBeLessThan(3);
      expect(Math.abs(b.opacity-a.opacity)).toBeLessThan(.01);
    }
    expect(skillRunningGround(playback.frame(2600)).opacity).toBe(1);
    expect(skillRunningGround(playback.frame(4000)).opacity).toBe(0);
  });

  it('conserva la carrera infinita antes de la tirada y respeta movimiento reducido',()=>{
    const scene=skillMicroScenes.find(s=>s.id==='athletics')!;
    const playback=new SkillMicroScenePlayback(scene,0);
    expect(skillRunningGround(playback.frame(90_000))).toMatchObject({opacity:1,edge:1280,travel:10800});
    expect(skillRunningGround(playback.frame(90_000),true).travel).toBe(0);
  });

  it('Acrobacias sigue cayendo después del resbalón hasta desaparecer, sin un agarre detenido',()=>{
    const failure=skillMicroScenes.find(s=>s.id==='acrobatics')!.failureAnimation;
    let y=-Infinity;
    for(let t=.54;t<=1;t+=.01) {
      const pose=sampleTrack(failure.actor,t);
      expect(pose.y??0).toBeGreaterThan(y);y=pose.y??0;
    }
    expect(sampleTrack(failure.actor,1)).toMatchObject({opacity:0,y:178});
    expect(failure.beats?.some(([,role])=>role==='hang')).toBe(false);
  });
});
