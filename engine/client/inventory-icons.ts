import type { InventoryCategory } from '../shared/inventory';

/** Local, resolution-independent RPG glyphs, reusable across campaigns. */
export function inventoryGlyph(category: InventoryCategory | 'backpack' | 'search') {
  const paths: Record<InventoryCategory | 'backpack' | 'search', string> = {
    backpack: '<path d="M9 7V5a3 3 0 0 1 6 0v2M6 8h12l2 12H4L6 8Zm-1 4h14M9 15h6v3H9zM8 7l-2 1m10-1 2 1"/>',
    weapons: '<path d="m5 19 3-3m-1-3 4 4M9 15l9-11 2-1-1 4L11 17M4 20l1 1"/>',
    armor: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Zm0 3v12"/>',
    consumables: '<path d="M9 3h6m-5 0v6l-5 6a4 4 0 0 0 3 6h8a4 4 0 0 0 3-6l-5-6V3M7 14h10M9 17h2"/>',
    ammunition: '<path d="m5 20 13-15m-3 0 5-2-1 6M5 15l-2 4 3 2 4-2M7 17l-2-2"/>',
    tools: '<path d="m5 20 8-8a6 6 0 0 0 7-8l-4 4-3-3 4-4a6 6 0 0 0-8 7l-8 8 4 4Zm0-3h.01"/>',
    documents: '<path d="M5 3h11l3 3v15H5V3Zm10 0v5h4M8 11h8M8 15h8M8 18h5"/>',
    valuables: '<path d="m4 8 4-5h8l4 5-8 13L4 8Zm0 0h16M8 3l4 18 4-18"/>',
    other: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 4 9-4V8M12 13v9"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[category]}</svg>`;
}
