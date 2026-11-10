import { describe, expect, it } from 'vitest';
import { defaultSkillDC, sampleTrack, SkillMicroScenePlayback, skillOutcomeTime } from './skill-micro-scene';
import { skillMicroScenes } from '../../apps/web/ui/skill-scenes';

const scene = skillMicroScenes[0]!;

describe('microescenas de transición', () => {
  it('cubre las 18 habilidades con descripciones breves y dos desenlaces', () => {
    expect(Object.fromEntries(skillMicroScenes.map(skill => [skill.id, skill.ability]))).toEqual({
      acrobatics: 'dex', athletics: 'str', arcana: 'int', deception: 'cha', history: 'int', performance: 'cha',
      intimidation: 'cha', investigation: 'int', 'sleight-of-hand': 'dex', medicine: 'wis', nature: 'int', perception: 'wis',
      insight: 'wis', persuasion: 'cha', religion: 'int', stealth: 'dex', survival: 'wis', 'animal-handling': 'wis'
    });
    expect(skillMicroScenes).toHaveLength(18);
    for (const skill of skillMicroScenes) {
      const words = skill.description.split(/\s+/).length;
      expect(words, skill.id).toBeGreaterThanOrEqual(18);
      expect(words, skill.id).toBeLessThanOrEqual(30);
      expect(skill.successAnimation.caption, skill.id).not.toBe(skill.failureAnimation.caption);
      for (const [random, phase] of [[0, 'FAILURE'], [.999, 'SUCCESS']] as const) {
        const entry = new SkillMicroScenePlayback(skill, 0);
        entry.roll(0, undefined, () => random);
        expect(entry.frame(2000).phase, skill.id).toBe(phase);
        const end=skillOutcomeTime(skill,phase==='SUCCESS');
        expect(entry.frame(end-701).phase, skill.id).toBe(phase);
        expect(entry.frame(end).phase, skill.id).toBe('OUTCOME_LOOP');
        expect(entry.frame(90_000).phase, skill.id).toBe('OUTCOME_LOOP');
      }
    }
  });
  it('mantiene el bucle sin tirada y consume una sola tirada por entrada', () => {
    const entry = new SkillMicroScenePlayback(scene, 100);
    expect(entry.frame(99).phase).toBe('INIT');
    expect(entry.frame(90_000).phase).toBe('AMBIENT_LOOP');
    expect(entry.result).toBeUndefined();
    expect(entry.roll(90_000, undefined, () => .55)).toBe(true);
    expect(entry.result).toEqual({ natural: 12, modifier: undefined, total: 12, success: true });
    expect([0, 85, 1200, 1600, 5400, 6100, 90000].map(ms => entry.frame(90_000 + ms).phase)).toEqual([
      'D20_PRESSED', 'ROLL', 'ACTION_PREPARE', 'SUCCESS', 'REACTION', 'OUTCOME_LOOP', 'OUTCOME_LOOP'
    ]);
    expect(entry.roll(100_000, undefined, () => 0)).toBe(false);
    expect(entry.result?.natural).toBe(12);
    expect(new SkillMicroScenePlayback(scene, 100_000).roll(100_001, undefined, () => 0)).toBe(true);
  });

  it('aplica únicamente un modificador explícito y compara el total con la CD', () => {
    const entry = new SkillMicroScenePlayback(scene, 0, 19);
    expect(entry.roll(0, -2, () => .999)).toBe(true);
    expect(entry.result).toEqual({ natural: 20, modifier: -2, total: 18, success: false });
    expect(entry.frame(1600).phase).toBe('FAILURE');
    const defaultEntry = new SkillMicroScenePlayback(scene, 0, Number.NaN);
    expect(defaultEntry.dc).toBe(defaultSkillDC);
    defaultEntry.roll(0, 2.5, () => 0);
    expect(defaultEntry.result?.total).toBe(1);
  });

  it('interpola utilería y actor con el mismo reloj, manteniendo los extremos', () => {
    const track = [[0, { x: 0 }], [1, { x: 100, opacity: 0 }]] as const;
    expect(sampleTrack(track, .5)).toMatchObject({ x: 50, opacity: .5 });
    expect(sampleTrack(track, 1)).toMatchObject({ x: 100, opacity: 0 });
  });

  it('mantiene los recorridos terrestres sobre su apoyo y conserva los saltos explícitos', () => {
    for (const skill of skillMicroScenes) {
      if (skill.terrain) continue;
      expect(skill.actor.y, skill.id).toBe(202);
      for(const action of [skill.successAnimation,skill.failureAnimation]) {
        for(let t=0;t<=1;t+=.025) expect(sampleTrack(action.actor,t).y??0,skill.id).toBe(0);
      }
    }
    const athletics=skillMicroScenes.find(skill=>skill.id==='athletics')!;
    expect(sampleTrack(athletics.successAnimation.actor,.52).y).toBeLessThan(-50);
    expect(sampleTrack(athletics.failureAnimation.actor,.9).y).toBeGreaterThan(90);
  });

  it('el guardia persigue por detrás después de que el protagonista lo rebase',()=>{
    const skill=skillMicroScenes.find(s=>s.id==='deception')!;
    const guard=skill.props.find(p=>p.art==='guard')!;
    for(let t=.38;t<=1;t+=.01){
      const heroX=skill.actor.x+(sampleTrack(skill.failureAnimation.actor,t).x??0);
      const guardX=guard.x+(sampleTrack(guard.failure,t).x??0);
      expect(guardX,`Persecución en ${t}`).toBeLessThan(heroX);
    }
  });
});
