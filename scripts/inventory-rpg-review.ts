/** Visual fixture of the real widget without loading a 3D map. Server behavior
 * is covered separately in engine/server/inventory.test.ts. */
import { InventoryPanel } from '../apps/web/ui/inventory';
import { inventoryEquals, useInventoryItem } from '../engine/shared/inventory';
import type { PlayerPrivate } from '../engine/shared/protocol';
const source = await (await fetch('/apps/web/player.html')).text();
const template = new DOMParser().parseFromString(source, 'text/html').getElementById('inventory');
if (!template) throw new Error('Inventory template missing');
const dialog = document.importNode(template, true) as HTMLDialogElement; document.body.append(dialog);
let data = {
  characterId: 'aoife', label: 'Silverfarben Hotel', combat: null,
  inventory: ['Arco corto de entrenamiento', '4 dagas', 'Bolsa de componentes', 'Libro de conjuros con musgo', 'Mochila', 'Conocimiento de magia popular', 'Tinta', 'Pluma', '10 hojas de pergamino', 'Bolsa de arena', 'Cuchillo pequeño', '2 antorchas', '23 po', 'Poción de curación ×3']
} as PlayerPrivate;
const results = new Map<string, { ok: boolean; code: string }>();
const panel = new InventoryPanel(dialog, 'd8-night-private', (request, retryId) => {
  const id = retryId ?? crypto.randomUUID();
  setTimeout(() => {
    let result = results.get(id);
    if (!result) {
      if ('items' in request) {
        result = { ok: inventoryEquals(request.expectedItems, data.inventory), code: inventoryEquals(request.expectedItems, data.inventory) ? 'INVENTORY_SAVED' : 'INVENTORY_CHANGED' };
        if (result.ok) data = { ...data, inventory: [...request.items] };
      } else {
        const change = useInventoryItem(data.inventory, request.index, request.expectedItem, request.action);
        result = { ok: change.ok, code: change.code }; if (change.ok) data = { ...data, inventory: change.items };
      }
      results.set(id, result);
    }
    panel.complete({ commandId: id, ...result }); panel.update(data);
  }, 150);
  return id;
}, () => { document.getElementById('reviewOpen')!.textContent = 'Acciones de combate (simulación) · reabrir mochila'; });
document.getElementById('reviewOpen')!.onclick = () => panel.open();
document.getElementById('reviewCombat')!.onclick = () => { data = { ...data, combat: data.combat ? null : {} as NonNullable<PlayerPrivate['combat']> }; panel.update(data); panel.open(); };
panel.update(data); panel.open();
