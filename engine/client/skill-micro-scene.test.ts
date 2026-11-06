import { describe, expect, it } from 'vitest';
import { defaultSkillDC, sampleTrack, SkillMicroScenePlayback } from './skill-micro-scene';
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
        expect(entry.frame(1000).phase, skill.id).toBe(phase);
        expect(entry.frame(4000).phase, skill.id).toBe('AMBIENT_LOOP');
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
    expect([0, 85, 550, 940, 2360, 2870, 3420].map(ms => entry.frame(90_000 + ms).phase)).toEqual([
      'D20_PRESSED', 'ROLL', 'ACTION_PREPARE', 'SUCCESS', 'REACTION', 'RECOVERY', 'AMBIENT_LOOP'
    ]);
    expect(entry.roll(100_000, undefined, () => 0)).toBe(false);
    expect(entry.result?.natural).toBe(12);
    expect(new SkillMicroScenePlayback(scene, 100_000).roll(100_001, undefined, () => 0)).toBe(true);
  });

  it('aplica únicamente un modificador explícito y compara el total con la CD', () => {
    const entry = new SkillMicroScenePlayback(scene, 0, 19);
    expect(entry.roll(0, -2, () => .999)).toBe(true);
    expect(entry.result).toEqual({ natural: 20, modifier: -2, total: 18, success: false });
    expect(entry.frame(940).phase).toBe('FAILURE');
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
});
