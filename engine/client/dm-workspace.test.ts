import { describe, expect, it } from 'vitest';
import { createDmWorkspacePreset, recommendedDmWorkspace } from './dm-workspace';

describe('recommended DM workspace', () => {
  it.each(['exploration', 'combat'] as const)('keeps the board first in %s', mode => {
    const layout = recommendedDmWorkspace(mode, 1200);
    expect(layout.order[0]).toBe('mapWindow');
    expect(layout.order[1]).toBe(mode === 'combat' ? 'combatCard' : 'explorationCard');
    expect(layout.windows.mapWindow?.span).toBe(8);
    expect(layout.closed).toEqual(['animationAuditCard']);
  });
  it('gives the board full width on small screens and creates independent layouts', () => {
    const layout = recommendedDmWorkspace('exploration', 740);
    expect(layout.windows.mapWindow?.span).toBe(12);
    layout.closed.push('mapWindow');
    expect(recommendedDmWorkspace('exploration', 740).closed).not.toContain('mapWindow');
  });
  it('keeps secondary windows compact and participants visible', () => {
    const layout = recommendedDmWorkspace('combat', 1366);
    expect(layout.windows.jugadores?.span).toBe(4);
    expect(layout.minimized).not.toContain('pnj-de-escena');
    expect(layout.minimized).not.toContain('combatCard');
    expect(layout.windows['partida-y-copias']?.height).toBeUndefined();
  });
});

describe('DM workspace presets', () => {
  it.each(['exploration', 'combat'] as const)('provides four different views in %s mode', mode => {
    const ids = ['map-scene', 'two-columns', 'tactical', 'overview'] as const;
    const presets = ids.map(id => createDmWorkspacePreset(mode, id));
    expect(new Set(presets.map(layout => JSON.stringify(layout.windows))).size).toBe(4);
    for (const layout of presets) {
      expect(layout.order[0]).toBe('mapWindow');
      expect(layout.order[1]).toBe(mode === 'combat' ? 'combatCard' : 'explorationCard');
      expect(layout.order).not.toContain('connection');
      expect(layout.windows.mapWindow?.span).toBeGreaterThan(0);
    }
  });
});
