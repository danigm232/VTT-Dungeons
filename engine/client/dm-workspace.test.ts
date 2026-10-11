import { describe, expect, it } from 'vitest';
import { packDmWorkspace, createDmWorkspacePreset, recommendedDmWorkspace } from './dm-workspace';

describe('automatic DM row packing', () => {
  it('assigns a distinct row to every narrow-screen panel', () => {
    const packed = packDmWorkspace([{ id: 'map', span: 1 }, { id: 'players', span: 1 }, { id: 'requests', span: 1 }], 1);
    expect(packed.map(item => item.row)).toEqual([1, 2, 3]);
    expect(packed.every(item => item.column === 1 && item.span === 1)).toBe(true);
  });
  it('fills each row without changing requested spans or order', () => {
    const items = [{ id: 'players', span: 4 }, { id: 'map', span: 8 }, { id: 'requests', span: 4 }, { id: 'save', span: 4 }];
    const packed = packDmWorkspace(items);
    expect(packed.map(item => item.id)).toEqual(items.map(item => item.id));
    expect(packed.filter(item => item.row === 1).map(item => item.span)).toEqual([4, 8]);
    expect(packed.filter(item => item.row === 2).map(item => item.span)).toEqual([6, 6]);
    expect(items[2]!.span).toBe(4);
  });
  it('reflows after closing a panel and never leaves empty columns', () => {
    const packed = packDmWorkspace([{ id: 'map', span: 8 }, { id: 'save', span: 4 }, { id: 'players', span: 4 }]);
    for (const row of new Set(packed.map(item => item.row))) expect(packed.filter(item => item.row === row).reduce((sum, item) => sum + item.span, 0)).toBe(12);
    expect(packed.at(-1)).toEqual({ id: 'players', row: 2, column: 1, span: 12 });
  });
});

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
