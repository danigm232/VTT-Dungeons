/** Presentation and safe stack operations for legacy string inventories. No
 * migration of campaign saves is needed; unedited item descriptions stay intact. */
export const INVENTORY_MAX_ITEMS = 100;
export const INVENTORY_MAX_LABEL_LENGTH = 200;
export const inventoryCategories = {
  weapons: 'Armas', armor: 'Protección', consumables: 'Consumibles', ammunition: 'Munición',
  tools: 'Equipo', documents: 'Documentos', valuables: 'Tesoros', other: 'Otros'
} as const;
export type InventoryCategory = keyof typeof inventoryCategories;
export type InventoryUse = 'consume' | 'light' | 'extinguish';
export type InventoryEntry = {
  index: number; raw: string; label: string; quantity: number; category: InventoryCategory;
  currency: 'pc' | 'pp' | 'pe' | 'po' | 'ppt' | null; lit: boolean; use: InventoryUse | null;
};
export const normalizeInventoryText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function parseInventoryItem(raw: string, index = 0): InventoryEntry {
  const value = raw.trim();
  // A standalone x must be separated from the name: "Caja x3", not "Caja3".
  const suffix = /^(.*?)\s*(?:×|\s+x)\s*(\d+)\s*$/i.exec(value);
  const prefix = /^(\d+)\s+(.+)$/.exec(value);
  const label = (suffix?.[1] ?? prefix?.[2] ?? value).trim();
  const amount = suffix ? Number(suffix[2]) : prefix ? Number(prefix[1]) : 1;
  const quantity = Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
  const text = normalizeInventoryText(label);
  // A sale price in a description is NOT money carried by the player.
  const currency = /^(pc|pp|pe|po|ppt)$/i.test(label) ? label.toLowerCase() as InventoryEntry['currency'] : null;
  const lit = /\b(encendid[ao]s?|prendid[ao]s?|iluminad[ao]s?)\b/.test(text);
  let category: InventoryCategory = 'other';
  if (currency || /\b(oro|plata|gema\w*|joya\w*|pulsera\w*|pendiente\w*|turquesa\w*|lingote\w*|talisman\w*|heliotropo\w*)\b/.test(text)) category = 'valuables';
  else if (/\b(flechas?|virotes?|municion)\b/.test(text)) category = 'ammunition';
  else if (/\b(dagas?|espadas?|arcos?|ballestas?|hachas?|lanzas?|martillos?|cuchillos?|mazas?|baston(?:es)?)\b/.test(text)) category = 'weapons';
  else if (/\b(armadura\w*|escudos?|cotas?|yelmos?|cascos?)\b/.test(text)) category = 'armor';
  else if (/\b(pocion\w*|racion\w*|antorcha\w*|aceite|comida|vinos?|botellas?|vendas?)\b/.test(text)) category = 'consumables';
  else if (/\b(libros?|pergaminos?|mapas?|diarios?|cartas?|hojas? de pergamino)\b/.test(text)) category = 'documents';
  else if (/\b(cuerdas?|mochilas?|sacos?|herramienta\w*|componentes?|tinta|plumas?|arena|brujulas?|cartograf\w*|laud|botas?|clavos?|farol(?:es)?|linternas?|lamparas?|yesqueros?)\b/.test(text)) category = 'tools';
  const torch = /\bantorchas?\b/.test(text);
  const use = quantity < 1 ? null : torch ? lit ? 'extinguish' : 'light'
    : /\b(pocion(?:es)?|racion(?:es)?|aceite)\b/.test(text) ? 'consume' : null;
  return { index, raw, label, quantity, category, currency, lit, use };
}
export function inventoryItemName(entry: InventoryEntry): string {
  const names = { pc: 'Monedas de cobre', pp: 'Monedas de plata', pe: 'Monedas de electro', po: 'Monedas de oro', ppt: 'Monedas de platino' };
  return entry.currency ? names[entry.currency] : entry.label;
}
export function inventoryWallet(items: readonly string[]) {
  const wallet: Partial<Record<NonNullable<InventoryEntry['currency']>, number>> = {};
  for (const raw of items) { const item = parseInventoryItem(raw); if (item.currency) wallet[item.currency] = (wallet[item.currency] ?? 0) + item.quantity; }
  return wallet;
}
export function inventoryMatches(entry: InventoryEntry, query: string, category: InventoryCategory | 'all') {
  return (category === 'all' || entry.category === category) && normalizeInventoryText(`${entry.raw} ${inventoryItemName(entry)}`).includes(normalizeInventoryText(query.trim()));
}
export function inventoryEquals(a: readonly string[], b: readonly string[]) { return a.length === b.length && a.every((item, index) => item === b[index]); }
export function inventoryStackLabel(label: string, quantity: number) { return quantity === 1 ? label : `${label} ×${quantity}`; }
export function inventoryStackIndex(items: readonly string[], pattern: RegExp) {
  return items.findIndex(raw => { const item = parseInventoryItem(raw); pattern.lastIndex = 0; return item.quantity > 0 && !item.lit && pattern.test(item.label); });
}
export function removeInventoryUnit(items: readonly string[], index: number): string[] | null {
  const raw = items[index]; if (raw === undefined) return null;
  const item = parseInventoryItem(raw); if (item.quantity < 1) return null;
  const next = [...items];
  if (item.quantity === 1) next.splice(index, 1);
  else next[index] = `${item.label} ×${item.quantity - 1}`;
  return next;
}
export function useInventoryItem(items: readonly string[], index: number, expectedItem: string, action: InventoryUse) {
  if (items[index] !== expectedItem) return { ok: false as const, code: 'INVENTORY_CHANGED' };
  const item = parseInventoryItem(expectedItem, index);
  if (!item.quantity) return { ok: false as const, code: 'INVENTORY_DEPLETED' };
  if (item.use !== action) return { ok: false as const, code: 'INVALID_INVENTORY_USE' };
  const next = removeInventoryUnit(items, index)!;
  if (action === 'light') {
    if (next.length >= INVENTORY_MAX_ITEMS) return { ok: false as const, code: 'INVENTORY_FULL' };
    next.push('Antorcha encendida');
  }
  // Extinguishing removes the burning source; it never manufactures a new torch.
  return { ok: true as const, code: action === 'light' ? 'INVENTORY_LIT' : action === 'extinguish' ? 'INVENTORY_EXTINGUISHED' : 'INVENTORY_CONSUMED', items: next };
}
