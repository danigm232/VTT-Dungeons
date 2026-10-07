import { describe, expect, it } from 'vitest';
import { conditionHelp } from './condition-presentation';
describe('condition help for imported characters', () => {
  it('uses the actual escape DC and never invents the rose DC', () => {
    expect(conditionHelp('apresada')).not.toContain('CD 11');
    expect(conditionHelp('apresada', { condition: 'apresada', escapeDc: 17 })).toContain('CD 17');
    expect(conditionHelp('restringida')).toContain('TS Destreza con desventaja');
  });
  it('does not give Brave to another character', () => {
    expect(conditionHelp('asustada')).not.toContain('Valiente');
    expect(conditionHelp('asustada', undefined, ['Valiente'])).toContain('Valiente');
  });
  it('does not require death saves for unconscious creatures with positive HP', () => {
    expect(conditionHelp('inconsciente', undefined, [], 7)).not.toContain('salvaciones contra muerte');
    expect(conditionHelp('inconsciente', undefined, [], 0)).toContain('salvaciones contra muerte');
  });
});
