import { Container, Graphics } from 'pixi.js';
import type { Cell } from '../../engine/shared/protocol';
import type { WorldVisualEffect } from '../../engine/shared/world-visual-effects';

type Point = { x: number; y: number };
/** One lifecycle on the world ticker, not a detached RAF per effect. */
export class WorldAreaEffects {
  private views = new Map<string, { effect: WorldVisualEffect; root: Container; graphics: Graphics; fog?: Graphics }>();
  private transient = new Set<string>();
  constructor(private parent: Container) {}
  sync(effects: WorldVisualEffect[]) {
    const ids = new Set(effects.map(effect => effect.id));
    for (const [id, view] of this.views) if (!ids.has(id) && !this.transient.has(id)) { view.root.destroy({ children: true }); this.views.delete(id); }
    for (const effect of effects) {
      const existing = this.views.get(effect.id);
      if (existing) { existing.effect = effect; continue; }
      const root = new Container(), graphics = new Graphics();
      // Geometry has transparent space outside each lobe: never stretch an
      // opaque rectangular PNG over the map (including its baked-in matte).
      const fog = effect.type === 'fog' ? new Graphics() : undefined;
      if (fog) root.addChild(fog);
      root.addChild(graphics); this.parent.addChild(root);
      this.views.set(effect.id, { effect, root, graphics, fog });
    }
  }
  addTransient(effect: WorldVisualEffect) {
    this.transient.add(effect.id);
    this.sync([...this.views.values()].map(view => view.effect).concat(effect));
  }
  update(now: number, project: (cell: Cell, surfaceId: string) => Point, entity: (id: string) => { point: Point; height: number } | undefined) {
    for (const [id, view] of this.views) {
      const e = view.effect;
      if (now >= e.expiresAt) { view.root.destroy({ children: true }); this.views.delete(id); this.transient.delete(id); continue; }
      const age = Math.max(0, now - e.startedAt), remaining = e.expiresAt - now;
      const attached = e.entityId ? entity(e.entityId) : undefined;
      const center = attached?.point ?? project(e.cell, e.surfaceId), radius = e.radiusMeters / 1.5;
      const east = project({ col: e.cell.col + radius, row: e.cell.row }, e.surfaceId), west = project({ col: e.cell.col - radius, row: e.cell.row }, e.surfaceId);
      const north = project({ col: e.cell.col, row: e.cell.row - radius }, e.surfaceId), south = project({ col: e.cell.col, row: e.cell.row + radius }, e.surfaceId);
      const rx = Math.max(4, Math.hypot(east.x - west.x, east.y - west.y) / 2), ry = Math.max(3, Math.hypot(north.x - south.x, north.y - south.y) / 2);
      const fade = Math.min(1, age / 350, remaining / 350), t = age / 1000;
      view.root.position.set(center.x, center.y); view.root.zIndex = Math.round(center.y) + 1; view.root.alpha = fade;
      const g = view.graphics; g.clear();
      if (view.fog) {
        const fog = view.fog; fog.clear();
        // Project every lobe on the same ground plane as cells and tokens.
        // Unlike an axis-aligned screen ellipse this follows camera orbit.
        const extent = Math.max(rx, ry);
        for (let i=0;i<24;i++) {
          const angle=i*2.399963229728653 + Math.sin(t*.19+i)*.045;
          const spread=Math.sqrt((i+.5)/24)*.76;
          const p=project({col:e.cell.col+Math.cos(angle)*radius*spread,row:e.cell.row+Math.sin(angle)*radius*spread},e.surfaceId);
          const size=extent*(.19+.055*Math.sin(i*7+t*.35));
          const lift=extent*.24*(1-spread*spread);
          // Nested translucent lobes approximate a feathered alpha gradient;
          // the outermost band is nearly invisible, without a hard boundary.
          for(let band=6;band>=1;band--) {
            const scale=.45+band*.13;
            fog.ellipse(p.x-center.x,p.y-center.y-lift,size*scale,size*.62*scale)
              .fill({color:i%3===0?'#a8b9bd':'#d8e3e4',alpha:.014+(7-band)*.006});
          }
        }
      } else if (e.type === 'feather') {
        const h = attached?.height ?? rx * 2;
        for (let i = 0; i < 6; i++) {
          const x = Math.sin(t * 1.8 + i * 2) * rx, y = -h + ((t * .25 + i / 6) % 1) * h;
          g.ellipse(x, y, Math.max(1, h * .015), Math.max(2, h * .055)).fill({ color: '#eff8ff', alpha: .85 });
          g.moveTo(x, y - h * .04).lineTo(x, y + h * .04).stroke({ color: '#9bc8db', width: Math.max(.5, h * .008) });
        }
      } else {
        for (let i = 0; i < 10; i++) {
          const angle = i * Math.PI / 5 + t * 2, r = rx * (.25 + ((t * .8 + i / 10) % 1));
          g.circle(Math.cos(angle) * r, Math.sin(angle) * ry - rx * .5, Math.max(1, rx * .06)).fill({ color: '#e9ccff', alpha: .85 });
        }
      }
    }
  }
  clear() { for (const view of this.views.values()) view.root.destroy({ children: true }); this.views.clear(); this.transient.clear(); }
}
