import { describe, expect, it } from 'vitest';
import { dmRosetteLayout } from './dm-rosette-layout';

describe('DM map rosette', () => {
  it.each([[850, 360], [600, 450], [320, 330], [450, 220], [320, 170], [1200, 650]])('fits nodes and two-line labels in a %sx%s map', (width, height) => {
    const layout = dmRosetteLayout(width!, height!, { x: width! - 5, y: height! - 5 }, 12);
    expect(layout).not.toBeNull();
    expect(layout!.origin).toEqual({ x: width! - 5, y: height! - 5 });
    for (const point of layout!.points) {
      expect(point.x - 52).toBeGreaterThanOrEqual(8);
      expect(point.x + 52).toBeLessThanOrEqual(width! - 8);
      expect(point.y - 21).toBeGreaterThanOrEqual(8);
      expect(point.y + 59).toBeLessThanOrEqual(height! - 8);
    }
    const boxes = layout!.points.map(p => ({ x: p.x, y: p.y + 42 }));
    for (const [index, a] of boxes.entries()) for (const b of boxes.slice(index + 1)) expect(Math.abs(a.x - b.x) >= 109 || Math.abs(a.y - b.y) >= 39).toBe(true);
  });
  it('clamps pagination after the available actions change', () => {
    const layout = dmRosetteLayout(800, 500, { x: 790, y: 490 }, 2, 30)!;
    expect(layout.page).toBe(layout.pages - 1);
  });
  it('does not emit an overflowing menu for an unusably small map', () => {
    expect(dmRosetteLayout(70, 60, { x: 0, y: 0 }, 4)).toBeNull();
  });
  it('surrounds the actual object in the middle instead of using a screen edge', () => {
    const anchor = { x: 560, y: 340 }, layout = dmRosetteLayout(1200, 750, anchor, 8)!;
    expect(layout.origin).toEqual(anchor); expect(layout.capacity).toBe(8); expect(layout.arc).toBe('ring');
    expect(layout.points.some(point => point.x < anchor.x)).toBe(true);
    expect(layout.points.some(point => point.x > anchor.x)).toBe(true);
    expect(layout.points.some(point => point.y < anchor.y)).toBe(true);
    expect(layout.points.some(point => point.y > anchor.y)).toBe(true);
  });
  it.each([[40, 40], [760, 40], [40, 510], [760, 510], [780, 275], [400, 530]])('keeps actions, close and pager inside the map near %s,%s', (x, y) => {
    const layout = dmRosetteLayout(800, 550, { x: x!, y: y! }, 12)!;
    expect(layout).not.toBeNull(); expect(layout.origin).toEqual({ x, y });
    if ((x! < 100 || x! > 700) && (y! < 100 || y! > 450)) expect(layout.capacity).toBeLessThanOrEqual(4);
    expect(layout.pagerPoint.y - 15).toBeGreaterThanOrEqual(8);
    expect(layout.pagerPoint.y + 15).toBeLessThanOrEqual(542);
    expect(Math.abs(layout.pagerPoint.y - layout.closePoint.y)).toBeGreaterThanOrEqual(41);
  });
  it('does not park an offscreen object menu at the edge', () => {
    expect(dmRosetteLayout(800, 500, { x: -10, y: 300 }, 4)).toBeNull();
  });
});
