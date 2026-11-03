import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container, Graphics } from 'pixi.js';
import { WorldAreaEffects } from '../../apps/web/world-area-effects.js';
import type { WorldVisualEffect } from '../shared/world-visual-effects.js';

afterEach(() => vi.restoreAllMocks());
const effect = (type: WorldVisualEffect['type'] = 'spark'): WorldVisualEffect => ({ id: 'cue', type, sceneId: 'temple', surfaceId: 'ground', cell: { col: 4, row: 4 }, radiusMeters: 6, startedAt: 1000, expiresAt: 10000 });
const project = (cell: { col: number; row: number }) => ({ x: cell.col * 10, y: cell.row * 10 });

describe('world VFX lifecycle and map scale', () => {
  it('uses transparent procedural lobes rather than a rectangular image and follows map zoom', () => {
    const parent = new Container(), manager: any = new WorldAreaEffects(parent);
    manager.sync([effect('fog')]); manager.update(2000, project, () => undefined);
    const fog = manager.views.get('cue').fog;
    expect(fog).toBeInstanceOf(Graphics);
    const width=fog.width,height=fog.height;
    expect(width).toBeGreaterThan(60);expect(width).toBeLessThan(120);
    manager.update(2000, (cell: { col: number; row: number }) => ({ x: cell.col * 20, y: cell.row * 20 }), () => undefined);
    expect(fog.width).toBeCloseTo(width*2,4);expect(fog.height).toBeCloseTo(height*2,4);
    manager.clear(); expect(parent.children).toHaveLength(0); parent.destroy();
  });
  it('anchors fog to its surface and reprojects the lobes when the camera turns',()=>{
    const parent=new Container(),manager:any=new WorldAreaEffects(parent);
    manager.sync([effect('fog')]);
    const projected=vi.fn((cell:{col:number;row:number})=>({x:cell.col*30+cell.row*10,y:cell.col*4-cell.row*8}));
    manager.update(2000,projected,()=>undefined);
    expect(projected.mock.calls.length).toBe(29);
    expect(projected.mock.calls.every((call:any)=>call[1]==='ground')).toBe(true);
    const root=manager.views.get('cue').root;expect(root.x).toBe(160);expect(root.y).toBe(-16);
    manager.sync([]);expect(parent.children).toHaveLength(0);parent.destroy();
  });
  it('reconciles authoritative effects and expires transients without orphaned objects', () => {
    const parent = new Container(), manager = new WorldAreaEffects(parent);
    manager.sync([effect()]); manager.addTransient({ ...effect(), id: 'preview' });
    manager.sync([]); expect(parent.children).toHaveLength(1);
    manager.update(10000, project, () => undefined); expect(parent.children).toHaveLength(0);
    manager.sync([effect()]); manager.clear(); expect(parent.children).toHaveLength(0); parent.destroy();
  });
});
