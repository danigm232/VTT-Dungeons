import type { InventoryCategory } from '../shared/inventory';
import {normalizeInventoryText} from '../shared/inventory';

const itemGlyphs:Array<[RegExp,string]>=[
  [/\barcos?\b/,'<path d="M7 3c13 6 13 12 0 18M7 3v18m0-9h13m-3-3 3 3-3 3"/>'],
  [/daga|cuchillo/,'<path d="m5 20 4-5m-2-2 4 4m-2-2 8-12c2 5 0 8-6 14"/>'],
  [/flecha|virote/,'<path d="m4 20 15-16m-5 0h6v6M4 15v5h5"/>'],
  [/libro|conjuro/,'<path d="M4 4h13l3 3v14H6a2 2 0 0 1-2-2V4Zm2 13h14M8 8h8m-4-3v6"/>'],
  [/component/,'<path d="m8 3 1 4-5 7c-2 4 1 7 8 7s10-3 8-7l-5-7 1-4H8Zm1 4h6m-3 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3"/>'],
  [/mochila/, 'backpack'],
  [/tinta/,'<path d="M8 4h8v4H8V4Zm-1 4h10l2 4v9H5v-9l2-4Zm1 8h8"/>'],
  [/pluma/,'<path d="M4 21 17 6m-8 8c-2-9 9-12 11-11 1 4-2 14-11 11m4-10 1 5m2-8 1 4"/>'],
  [/pergamino|document|carta/,'<path d="M7 3h12c3 0 3 5 0 5H8v11c0 3-6 3-6 0v-3h12v3c0 3-6 3-6 0M7 3C4 3 4 8 7 8m4 3h5m-5 3h5"/>'],
  [/arena|bolsa|saco/,'<path d="m8 3 2 4-5 6c-4 6-1 9 7 9s11-3 7-9l-5-6 2-4H8Zm1 4h6m-3 7v4"/>'],
  [/vino|botella/,'<path d="M10 2h4v7l3 4v9H7v-9l3-4V2Zm-3 13h10m-7 3h4"/>'],
  [/antorcha|vela/,'<path d="m9 22 2-11h3l1 11M8 9C3 5 10 2 10 2c-1 4 4 1 4-1 6 5 5 9 0 10H8"/>'],
  [/moneda|\b(p[ocpet]+|oro|plata)\b/,'<circle cx="10" cy="10" r="7"/><path d="M15 8c8-1 9 12 1 13a7 7 0 0 1-7-5m1-10v8m-2-2h4m-4-4h4"/>'],
  [/cuerda|cordel/,'<path d="M14 20c-14 0-14-16-2-16s12 12 0 12-9-9 0-9 8 6 0 6m2 7h6"/>'],
  [/linterna|farol/,'<path d="M8 6V4a4 4 0 0 1 8 0v2M5 7h14l-2 3v9l2 3H5l2-3v-9L5 7Zm7 5v6m-3-6h6"/>'],
  [/martillo/,'<path d="M3 5h14v6H3V5Zm7 6-2 10h4l2-10m3-5h4v4h-4"/>'],
  [/palanqueta/,'<path d="M7 21 16 7c4-6-4-7-6-1m-3 15-4-1 1-4"/>'],
  [/campana/,'<path d="M5 17h14l-3-5V8a4 4 0 0 0-8 0v4l-3 5Zm5 3h4M12 2v2"/>'],
  [/yesquero/,'<path d="m3 14 7-5 4 6-7 5-4-6Zm13-9 1-3m3 6 3-1m-6 4 2 3m-6-6 3-4"/>'],
  [/cantimplora/,'<path d="M9 3h6v4c8 7 6 15-3 15S1 14 9 7V3Zm3 8v7"/>'],
  [/racion|comida/,'<path d="M3 15c-1-12 19-12 18 0v6H3v-6Zm5-5 2 5m3-5 2 5"/>'],
  [/ropa|capa|capucha/,'<path d="M8 7c0-7 8-7 8 0l5 14H3L8 7Zm0 0 4 4 4-4m-4 4v10"/>'],
  [/piton|clavo/,'<path d="M4 5h10m-7 0 1 16 3-16m6 5h5m-3 0-1 11"/>'],
  [/mapa/,'<path d="m3 5 6-2 6 3 6-2v17l-6 2-6-3-6 2V5Zm6-2v17m6-14v17"/>'],
  [/llave/,'<circle cx="7" cy="7" r="4"/><path d="m10 10 10 10m-5-5 3-3m-1 5 3-3"/>'],
  [/herramienta/,'tools'],
  [/magia|conocimiento/,'<path d="m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3 2-7Z"/>']
];
export function inventoryItemGlyph(label:string,category:InventoryCategory){
  const found=itemGlyphs.find(([pattern])=>pattern.test(normalizeInventoryText(label)))?.[1];
  if(!found)return inventoryGlyph(category);
  if(!found.startsWith('<'))return inventoryGlyph(found as InventoryCategory|'backpack');
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${found}</svg>`;
}

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
