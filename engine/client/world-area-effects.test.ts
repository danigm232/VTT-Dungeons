import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container, Texture, TextureSource } from 'pixi.js';
import { WorldAreaEffects } from '../../apps/web/world-area-effects.js';
import type { WorldVisualEffect } from '../shared/world-visual-effects.js';

afterEach(() => vi.restoreAllMocks());
const effect = (type: WorldVisualEffect['type'] = 'spark'): WorldVisualEffect => ({ id: 'cue', type, sceneId: 'temple', surfaceId: 'ground', cell: { col: 4, row: 4 }, radiusMeters: 6, startedAt: 1000, expiresAt: 10000 });
const project = (cell: { col: number; row: number }) => ({ x: cell.col * 10, y: cell.row * 10 });

describe('world VFX lifecycle and map scale', () => {
  it('preserves the projected fog size rather than resetting to PNG pixel size', () => {
    vi.spyOn(Texture, 'from').mockReturnValue(new Texture({ source: new TextureSource({ width: 512, height: 512 }) }));
    const parent = new Container(), manager: any = new WorldAreaEffects(parent);
    manager.sync([effect('fog')]); manager.update(2000, project, () => undefined);
    const fog = manager.views.get('cue').fog;
    expect(fog.width).toBeGreaterThan(76); expect(fog.width).toBeLessThan(84);
    manager.update(2100, (cell: { col: number; row: number }) => ({ x: cell.col * 20, y: cell.row * 20 }), () => undefined);
    expect(fog.width).toBeGreaterThan(152); expect(fog.width).toBeLessThan(168);
    manager.clear(); expect(parent.children).toHaveLength(0); parent.destroy();
  });
  it('reconciles authoritative effects and expires transients without orphaned objects', () => {
    const parent = new Container(), manager = new WorldAreaEffects(parent);
    manager.sync([effect()]); manager.addTransient({ ...effect(), id: 'preview' });
    manager.sync([]); expect(parent.children).toHaveLength(1);
    manager.update(10000, project, () => undefined); expect(parent.children).toHaveLength(0);
    manager.sync([effect()]); manager.clear(); expect(parent.children).toHaveLength(0); parent.destroy();
  });
});
