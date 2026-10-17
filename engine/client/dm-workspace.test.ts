import { describe, expect, it } from 'vitest';
import { packDmWorkspace, createDmWorkspacePreset, recommendedDmWorkspace } from './dm-workspace';

describe('automatic DM row packing', () => {
  it('assigns a distinct row to every narrow-screen panel', () => {
    const packed = packDmWorkspace([{ id: 'map', span: 1, height: 300 }, { id: 'players', span: 1, height: 160 }, { id: 'requests', span: 1, height: 80 }], 1);
    expect(packed.map(item => item.row)).toEqual([1, 157, 243]);
    expect(packed.every(item => item.column === 1 && item.span === 1)).toBe(true);
  });
  it('places a new panel underneath a short or minimized neighbour', () => {
    const items = [{ id: 'guide', span: 20, height: 400 }, { id: 'players', span: 20, height: 400 }, { id: 'requests', span: 20, height: 38 }, { id: 'encounter', span: 20, height: 160 }];
    const packed = packDmWorkspace(items);
    expect(packed.map(item => item.id)).toEqual(items.map(item => item.id));
    expect(packed[3]).toMatchObject({ column: 41, row: 26, span: 20 });
    expect(packed[3]!.row).toBeLessThan(packed[0]!.rowSpan);
    expect(items[2]!.span).toBe(20);
  });
  it('uses a full-width window as a barrier and restores the original arrangement', () => {
    const items = [{ id: 'map', span: 40, height: 300 }, { id: 'guide', span: 20, height: 180 }, { id: 'players', span: 20, height: 220 }];
    const original = packDmWorkspace(items);
    const enlarged = packDmWorkspace(items.map(item => item.id === 'guide' ? { ...item, span: 60 } : item));
    expect(enlarged.map(item => item.id)).toEqual(items.map(item => item.id));
    expect(enlarged[1]!.row).toBeGreaterThan(enlarged[0]!.row + enlarged[0]!.rowSpan);
    expect(enlarged[2]!.row).toBeGreaterThan(enlarged[1]!.row + enlarged[1]!.rowSpan);
    expect(packDmWorkspace(items)).toEqual(original);
  });
  it('fits five compact windows across and never overlaps mixed window sizes', () => {
    const items = Array.from({ length: 5 }, (_, index) => ({ id: `compact-${index}`, span: 12, height: 60 + index * 20 }));
    const packed = packDmWorkspace([...items, { id: 'wide', span: 36, height: 160 }, { id: 'small', span: 12, height: 90 }]);
    expect(packed.slice(0, 5).map(item => item.row)).toEqual([1, 1, 1, 1, 1]);
    for (let i = 0; i < packed.length; i++) for (let j = i + 1; j < packed.length; j++) {
      const a = packed[i]!, b = packed[j]!;
      const overlap = a.column < b.column + b.span && b.column < a.column + a.span && a.row < b.row + b.rowSpan && b.row < a.row + a.rowSpan;
      expect(overlap).toBe(false);
    }
  });
});

describe('recommended DM workspace', () => {
  it.each(['exploration', 'combat'] as const)('keeps the board first in %s', mode => {
    const layout = recommendedDmWorkspace(mode, 1200);
    expect(layout.order[0]).toBe('mapWindow');
    expect(layout.order[1]).toBe(mode === 'combat' ? 'combatCard' : 'explorationCard');
    expect(layout.windows.mapWindow?.span).toBe(mode === 'combat' ? 7 : 8);
    expect(layout.closed).toEqual(['animationAuditCard']);
    expect(layout.minimized).toEqual([]);
  });
  it('keeps requested proportions across screen sizes and creates independent layouts', () => {
    const layout = recommendedDmWorkspace('exploration', 740);
    expect(layout.windows.mapWindow?.span).toBe(recommendedDmWorkspace('exploration', 1800).windows.mapWindow?.span);
    layout.closed.push('mapWindow');
    expect(recommendedDmWorkspace('exploration', 740).closed).not.toContain('mapWindow');
  });
  it('keeps secondary windows compact and participants visible', () => {
    const layout = recommendedDmWorkspace('combat', 1366);
    expect(layout.windows.jugadores?.span).toBe(5);
    expect(layout.minimized).not.toContain('pnj-de-escena');
    expect(layout.minimized).not.toContain('combatCard');
    expect(layout.order).not.toContain('partida-y-copias');
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
      expect(new Set(layout.order).size).toBe(layout.order.length);
      expect(layout.windows.mapWindow?.span).toBeGreaterThan(0);
    }
  });
});
