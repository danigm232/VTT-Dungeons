export type RosettePoint = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };
const box = (x: number, y: number, w: number, h: number): Box => ({ left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 });
const overlaps = (a: Box, b: Box) => a.left < b.right + 5 && a.right + 5 > b.left && a.top < b.bottom + 5 && a.bottom + 5 > b.top;
/** DM map-local geometry. Label and pager hitboxes participate in fitting. */
export function dmRosetteLayout(width: number, height: number, anchor: RosettePoint, total: number, requestedPage = 0) {
  const nodeSize = 42, labelWidth = 104, labelHeight = 34;
  const fits = (bounds: Box) => bounds.left >= 8 && bounds.right <= width - 8 && bounds.top >= 8 && bounds.bottom <= height - 8;
  if (width < 120 || height < 100 || anchor.x < 0 || anchor.y < 0 || anchor.x > width || anchor.y > height) return null;
  // Never relocate the hub to a screen edge: it belongs to the selected object.
  const origin = { ...anchor };
  const closePoint = { x: Math.max(29, Math.min(width - 29, anchor.x)), y: Math.max(29, Math.min(height - 29, anchor.y)) };
  const pagerPoint = { x: Math.max(56, Math.min(width - 56, anchor.x)), y: closePoint.y + 48 <= height - 23 ? closePoint.y + 48 : closePoint.y - 48 };
  const nearHorizontalEdge = anchor.x < 100 || width - anchor.x < 100;
  const nearVerticalEdge = anchor.y < 100 || height - anchor.y < 100;
  for (const capacity of nearHorizontalEdge && nearVerticalEdge ? [4, 3, 2, 1] : [8, 4, 3, 2, 1]) {
    const pages = Math.max(1, Math.ceil(total / capacity));
    for (const arc of ['ring', 'half', 'quarter'] as const) {
      for (let radius = 88; radius <= 400; radius += 8) for (let rotation = 0; rotation < 24; rotation++) {
        const pageBox = box(pagerPoint.x, pagerPoint.y, 96, 30);
        const centerBox = box(closePoint.x, closePoint.y, 42, 42);
        const points = Array.from({ length: Math.min(total, capacity) }, (_, index) => {
          const count = Math.min(total, capacity), span = arc === 'ring' ? Math.PI * 2 : arc === 'half' ? Math.PI : Math.PI / 2;
          const angle = -Math.PI / 2 + rotation * Math.PI / 12 + (count === 1 ? 0 : index / (arc === 'ring' ? count : count - 1)) * span;
          return { x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius };
        });
        const boxes = points.flatMap(point => [box(point.x, point.y, nodeSize, nodeSize), box(point.x, point.y + 42, labelWidth, labelHeight)]);
        if (boxes.some(bounds => !fits(bounds) || overlaps(bounds, centerBox) || pages > 1 && overlaps(bounds, pageBox))) continue;
        if (boxes.some((bounds, index) => boxes.some((other, otherIndex) => Math.floor(index / 2) !== Math.floor(otherIndex / 2) && overlaps(bounds, other)))) continue;
        return { origin, closePoint, pagerPoint, points, capacity, pages, page: Math.max(0, Math.min(pages - 1, requestedPage)), nodeSize, labelWidth, labelHeight, arc };
      }
    }
  }
  return null;
}
