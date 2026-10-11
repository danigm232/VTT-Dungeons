import type { CommandResult, PlayerPrivate } from '../../../engine/shared/protocol';
import {
  INVENTORY_MAX_ITEMS, INVENTORY_MAX_LABEL_LENGTH, inventoryCategories, inventoryEquals, inventoryItemName,
  inventoryMatches, inventoryStackLabel, inventoryWallet, parseInventoryItem, type InventoryCategory, type InventoryEntry, type InventoryUse
} from '../../../engine/shared/inventory';
import { inventoryGlyph } from '../../../engine/client/inventory-icons';
import { campaignShipLootIconIndex } from '../../../engine/client/ship-loot-art';

type InventoryRequest = { items: string[]; expectedItems: string[] } | { index: number; expectedItem: string; action: InventoryUse };
type DraftRow = { original: string | null; name: string; quantity: number };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag); node.className = className; if (text) node.textContent = text; return node;
};
const messages: Record<string, string> = {
  INVENTORY_CHANGED: 'La mochila ha cambiado en la partida. Tu borrador se conserva; revísalo antes de guardar.',
  INVENTORY_SAVED: 'Mochila guardada.', INVENTORY_CONSUMED: 'Consumida una unidad. El DM resuelve sus efectos.',
  INVENTORY_LIT: 'Antorcha encendida. El DM controla la fuente de fuego y su duración.',
  INVENTORY_EXTINGUISHED: 'Antorcha apagada; no se recupera una antorcha nueva.',
  INVENTORY_COMBAT_ACTION_REQUIRED: 'En combate, declara el uso del objeto en Acciones y resuélvelo con el DM.',
  INVENTORY_DEPLETED: 'No quedan unidades disponibles.', INVALID_INVENTORY_USE: 'Este objeto no tiene ese uso automático.',
  INVENTORY_FULL: 'No hay espacio para otra entrada. Agrupa o retira objetos al editar.',
  INCAPACITATED: 'Tu personaje no puede utilizar objetos en su estado actual.',
  STALE_RUNTIME: 'La partida se ha restaurado. Reabre la mochila antes de guardar.', SAVE_UNAVAILABLE: 'La partida no está disponible.',
  INVALID_INVENTORY: 'No se pudo modificar la mochila. Comprueba la sesión y los objetos.'
};

/** A campaign-independent view over authoritative inventory, never an optimistic
 * replacement of the complete pack for a quick-use operation. */
export class InventoryPanel {
  private state: PlayerPrivate | null = null;
  private category: InventoryCategory | 'all' = 'all';
  private selected = -1;
  private editing = false;
  private base: string[] = [];
  private draft: DraftRow[] = [];
  private pending: { id: string; request: InventoryRequest; saving: boolean; characterId: string | null } | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private lastViewKey = '';
  private get<T extends HTMLElement>(id: string) { return this.dialog.querySelector<T>(`#${id}`)!; }
  constructor(private dialog: HTMLDialogElement, private campaignId: string,
    private send: (request: InventoryRequest, retryId?: string) => string | null,
    private openCombatActions: () => void) {
    this.get('inventoryEmblem').innerHTML = inventoryGlyph('backpack');
    this.get('inventorySearchGlyph').innerHTML = inventoryGlyph('search');
    this.get('closeInventory').onclick = () => this.close();
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    this.get('inventorySearch').oninput = () => { this.lastViewKey = ''; this.renderItems(); };
    this.get<HTMLSelectElement>('inventorySort').onchange = () => { this.lastViewKey = ''; this.renderItems(); };
    this.get('editInventory').onclick = () => this.startEditing();
    this.get('cancelInventory').onclick = () => this.cancelEditing();
    this.get('saveInventory').onclick = () => this.save();
    this.get('addInventoryItem').onclick = () => {
      if (this.pending || this.draft.length >= INVENTORY_MAX_ITEMS) return;
      this.draft.push({ original: null, name: '', quantity: 1 }); this.renderEditor();
      this.get('inventoryEditor').querySelector<HTMLInputElement>('.inventory-edit-row:last-child input')?.focus();
    };
    this.get('reloadInventoryDraft').onclick = () => this.startEditing();
    this.get('inventoryRetry').onclick = () => { if (this.pending) { this.send(this.pending.request, this.pending.id); this.status('Reintentando la misma operación…'); } };
    this.get('discardInventoryDraft').onclick = () => { this.cancelEditing(); this.dialog.close(); };
    this.get('keepInventoryDraft').onclick = () => { this.get('inventoryDiscardPrompt').hidden = true; };
  }
  update(state: PlayerPrivate) {
    if (this.state?.characterId !== state.characterId) {
      this.cancelEditing(); this.pending = null; clearTimeout(this.retryTimer); this.setBusy(false); this.selected = -1; this.lastViewKey = '';
      this.get('inventoryRetry').hidden = true;
      this.dialog.close();
    }
    this.state = state;
    this.get('inventoryOwner').textContent = state.label ?? 'Aventurero';
    const purse = inventoryWallet(state.inventory);
    const wallet = this.get('inventoryWallet');
    wallet.replaceChildren(...Object.entries(purse).map(([kind, count]) => el('span', `inventory-coin coin-${kind}`, `${count.toLocaleString('es')} ${kind.toUpperCase()}`)));
    wallet.hidden = !Object.keys(purse).length;
    this.get('inventoryCount').textContent = `${state.inventory.length} entradas · ${state.inventory.filter(raw => !parseInventoryItem(raw).currency).length} de equipo`;
    this.get('inventoryConflict').hidden = !this.editing || inventoryEquals(this.base, state.inventory);
    this.get<HTMLButtonElement>('saveInventory').disabled = Boolean(this.pending) || !this.get('inventoryConflict').hidden;
    this.renderItems(); this.renderDetail();
  }
  open() {
    if (!this.state?.characterId) return;
    this.get('inventoryDiscardPrompt').hidden = true;
    if (!this.dialog.open) this.dialog.showModal();
    if (!this.editing && !this.pending) this.status('Selecciona un objeto para ver sus detalles y usos.');
    this.get<HTMLInputElement>('inventorySearch').focus();
  }
  complete(result: CommandResult) {
    if (!this.pending || result.commandId !== this.pending.id) return false;
    const saving = this.pending.saving;
    this.pending = null; clearTimeout(this.retryTimer); this.get('inventoryRetry').hidden = true;
    if (result.ok && saving) this.cancelEditing();
    this.setBusy(false);
    this.status(messages[result.code] ?? `No se pudo aplicar el cambio (${result.code}).`, !result.ok);
    this.renderDetail(); return true;
  }
  reset() {
    this.pending = null; clearTimeout(this.retryTimer); this.cancelEditing(); this.setBusy(false); this.get('inventoryRetry').hidden = true; this.dialog.close(); this.state = null; this.lastViewKey = '';
  }
  private close() {
    if (this.editing && !inventoryEquals(this.base, this.draftItems())) {
      this.get('inventoryDiscardPrompt').hidden = false; this.get('keepInventoryDraft').focus(); return;
    }
    this.dialog.close();
  }
  private status(text: string, error = false) {
    this.get('inventorySummary').textContent = text; this.get('inventorySummary').classList.toggle('is-error', error);
  }
  private icon(item: InventoryEntry, large = false) {
    const icon = el('span', `inventory-item-art${large ? ' large' : ''} category-${item.category}`);
    const atlasIndex = campaignShipLootIconIndex(this.campaignId, item.raw);
    if (atlasIndex !== null) {
      icon.classList.add('has-atlas'); icon.style.backgroundImage = "url('/art/ship/loot-atlas-m5.svg')";
      icon.style.backgroundPosition = `${atlasIndex % 4 * 100 / 3}% ${Math.floor(atlasIndex / 4) * 100 / 4}%`;
    } else icon.innerHTML = inventoryGlyph(item.category);
    icon.setAttribute('aria-hidden', 'true'); return icon;
  }
  private renderItems() {
    if (!this.state) return;
    const query = this.get<HTMLInputElement>('inventorySearch').value;
    const sort = this.get<HTMLSelectElement>('inventorySort').value;
    const key = JSON.stringify([this.state.characterId, this.state.inventory, this.category, query, sort, this.selected]);
    if (key === this.lastViewKey) return;
    this.lastViewKey = key;
    const entries = this.state.inventory.map((raw, index) => parseInventoryItem(raw, index));
    const categories = this.get('inventoryCategories');
    categories.replaceChildren(...(['all', ...Object.keys(inventoryCategories)] as Array<InventoryCategory | 'all'>).map(category => {
      const count = entries.filter(item => category === 'all' || item.category === category).length;
      const button = el('button', 'inventory-category', category === 'all' ? 'Todo' : inventoryCategories[category]);
      button.type = 'button'; button.setAttribute('aria-pressed', String(this.category === category));
      button.append(el('span', '', String(count))); button.onclick = () => { this.category = category; this.lastViewKey = ''; this.selected = -1; this.renderItems(); this.renderDetail(); };
      return button;
    }));
    const visible = entries.filter(item => inventoryMatches(item, query, this.category));
    if (sort === 'name') visible.sort((a, b) => inventoryItemName(a).localeCompare(inventoryItemName(b), 'es', { numeric: true }));
    if (sort === 'category') visible.sort((a, b) => inventoryCategories[a.category].localeCompare(inventoryCategories[b.category], 'es') || inventoryItemName(a).localeCompare(inventoryItemName(b), 'es'));
    if (!visible.some(item => item.index === this.selected)) this.selected = visible[0]?.index ?? -1;
    this.get('inventoryResults').textContent = query || this.category !== 'all' ? `${visible.length} de ${entries.length} entradas` : `${entries.length} entradas`;
    const grid = this.get('inventoryList');
    grid.replaceChildren(...visible.map(item => {
      const button = el('button', `inventory-slot${item.lit ? ' is-lit' : ''}`);
      button.type = 'button'; button.setAttribute('aria-pressed', String(item.index === this.selected));
      button.setAttribute('aria-label', `${inventoryItemName(item)}, ${item.quantity} unidades${item.lit ? ', encendida' : ''}`);
      button.title = item.raw;
      button.append(this.icon(item), el('span', 'inventory-slot-name', inventoryItemName(item)), el('span', 'inventory-quantity', `×${item.quantity}`));
      if (item.lit) button.append(el('span', 'inventory-lit-mark', 'Luz'));
      button.onclick = () => { this.selected = item.index; this.renderItems(); this.renderDetail(); };
      return button;
    }));
    this.get('inventoryEmpty').hidden = visible.length > 0;
    this.get('inventoryEmpty').textContent = entries.length ? 'No hay objetos que coincidan. Prueba otra categoría o búsqueda.' : 'Tu mochila está vacía. Pulsa Editar mochila para añadir equipo.';
    this.renderDetail();
  }
  private renderDetail() {
    const detail = this.get('inventoryDetail'); detail.replaceChildren();
    const raw = this.state?.inventory[this.selected];
    if (!raw) { detail.append(el('p', 'inventory-detail-empty', 'Selecciona un objeto de la mochila.')); return; }
    const item = parseInventoryItem(raw, this.selected);
    detail.append(this.icon(item, true), el('small', 'inventory-detail-category', inventoryCategories[item.category]), el('h3', '', inventoryItemName(item)));
    const facts = el('dl', 'inventory-facts');
    facts.append(el('dt', '', 'Cantidad'), el('dd', '', item.quantity.toLocaleString('es')));
    if (item.lit) facts.append(el('dt', '', 'Estado'), el('dd', '', 'Encendida'));
    detail.append(facts, el('p', 'inventory-original', item.raw));
    if (item.use && this.state?.combat) {
      detail.append(el('p', 'inventory-use-note', 'En combate, usa las acciones de tu turno. Consultar la mochila no gasta una acción.'));
      const actions = el('button', 'inventory-use-button', 'Ir a acciones de combate'); actions.type = 'button';
      actions.onclick = () => { this.close(); if (!this.dialog.open) this.openCombatActions(); }; detail.append(actions);
    } else if (item.use) {
      const label = item.use === 'light' ? 'Encender una antorcha' : item.use === 'extinguish' ? 'Apagar una antorcha' : 'Consumir una unidad';
      const button = el('button', 'inventory-use-button', label); button.type = 'button'; button.disabled = Boolean(this.pending);
      button.onclick = () => this.request({ index: item.index, expectedItem: item.raw, action: item.use! });
      detail.append(button, el('p', 'inventory-use-note', item.use === 'light' ? 'Necesitas una fuente de fuego. Se usa una de tus antorchas; el DM controla su duración.' : item.use === 'extinguish' ? 'Se retira la fuente de luz. La antorcha usada no vuelve a las existencias nuevas.' : 'Descuenta 1 de la mochila. La curación, tiradas y demás efectos los resuelve el DM.'));
    } else detail.append(el('p', 'inventory-use-note', item.currency ? 'Solo se suman monedas registradas, no el valor de venta de los tesoros.' : 'Su uso se declara en las acciones del personaje o se acuerda con el DM.'));
  }
  private draftItems() {
    return this.draft.map(row => {
      if (row.original !== null) { const original = parseInventoryItem(row.original); if (row.name === original.label && row.quantity === original.quantity) return row.original; }
      return inventoryStackLabel(row.name.trim(), row.quantity);
    });
  }
  private startEditing() {
    if (!this.state || this.pending) return;
    this.base = [...this.state.inventory]; this.draft = this.base.map(raw => { const item = parseInventoryItem(raw); return { original: raw, name: item.label, quantity: item.quantity }; });
    this.editing = true; this.dialog.classList.add('is-editing');
    this.get('inventoryBrowse').hidden = true; this.get('inventoryEdit').hidden = false;
    this.get('editInventory').hidden = true; this.get('saveInventory').hidden = false; this.get('cancelInventory').hidden = false;
    this.get('inventoryConflict').hidden = true; this.get<HTMLButtonElement>('saveInventory').disabled = false;
    this.status('Modo edición · los cambios solo se aplican al guardar.'); this.renderEditor();
  }
  private cancelEditing() {
    this.editing = false; this.dialog.classList.remove('is-editing'); this.draft = []; this.base = [];
    this.get('inventoryBrowse').hidden = false; this.get('inventoryEdit').hidden = true;
    this.get('editInventory').hidden = false; this.get('saveInventory').hidden = true; this.get('cancelInventory').hidden = true;
    this.get('inventoryDiscardPrompt').hidden = true; this.get('inventoryConflict').hidden = true;
    this.status('Selecciona un objeto para ver sus detalles y usos.');
  }
  private renderEditor() {
    this.get('inventoryEditor').replaceChildren(...this.draft.map((item, index) => {
      const row = el('div', 'inventory-edit-row'), name = el('input'), quantity = el('input'), remove = el('button', '', 'Retirar');
      name.type = 'text'; name.value = item.name; name.maxLength = INVENTORY_MAX_LABEL_LENGTH; name.placeholder = 'Nombre y descripción'; name.setAttribute('aria-label', `Nombre del objeto ${index + 1}`);
      name.oninput = () => { item.name = name.value; };
      quantity.type = 'number'; quantity.value = String(item.quantity); quantity.min = '1'; quantity.max = String(Number.MAX_SAFE_INTEGER); quantity.step = '1'; quantity.setAttribute('aria-label', `Cantidad del objeto ${index + 1}`);
      quantity.oninput = () => { item.quantity = Number(quantity.value); };
      remove.type = 'button'; remove.setAttribute('aria-label', `Retirar ${item.name || 'objeto'} del borrador`); remove.onclick = () => { this.draft.splice(index, 1); this.renderEditor(); };
      row.append(name, quantity, remove); return row;
    }));
    this.get('inventoryEditCount').textContent = `${this.draft.length}/${INVENTORY_MAX_ITEMS} entradas de registro · sin límite de peso configurado`;
    this.get<HTMLButtonElement>('addInventoryItem').disabled = this.draft.length >= INVENTORY_MAX_ITEMS;
  }
  private save() {
    if (!this.editing || this.pending || !this.state) return;
    if (!inventoryEquals(this.base, this.state.inventory)) { this.status(messages.INVENTORY_CHANGED!, true); return; }
    if (this.draft.some(row => !row.name.trim() || !Number.isSafeInteger(row.quantity) || row.quantity < 1)) { this.status('Cada objeto necesita un nombre y una cantidad entera mayor que cero.', true); return; }
    const items = this.draftItems();
    if (items.length > INVENTORY_MAX_ITEMS || items.some(item => item.length > INVENTORY_MAX_LABEL_LENGTH)) { this.status(`Máximo ${INVENTORY_MAX_ITEMS} entradas de ${INVENTORY_MAX_LABEL_LENGTH} caracteres, incluyendo la cantidad.`, true); return; }
    this.request({ items, expectedItems: this.base });
  }
  private request(request: InventoryRequest) {
    if (this.pending) return;
    const id = this.send(request); if (!id) { this.status('Sin conexión. Tu borrador se conserva; vuelve a intentarlo al conectar.', true); return; }
    this.pending = { id, request, saving: 'items' in request, characterId: this.state?.characterId ?? null };
    this.setBusy(true); this.status('Confirmando el cambio en la partida…');
    this.retryTimer = setTimeout(() => { if (this.pending?.id === id) { this.get('inventoryRetry').hidden = false; this.status('No ha llegado la confirmación. Reintentar no duplica el gasto.', true); } }, 8000);
  }
  private setBusy(busy: boolean) {
    for (const node of this.get('inventoryEdit').querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button')) node.disabled = busy;
    this.get<HTMLButtonElement>('editInventory').disabled = busy;
    this.get<HTMLButtonElement>('saveInventory').disabled = busy || !this.get('inventoryConflict').hidden;
    this.get<HTMLButtonElement>('cancelInventory').disabled = busy;
    this.get<HTMLButtonElement>('discardInventoryDraft').disabled = busy;
    this.dialog.setAttribute('aria-busy', String(busy)); this.renderDetail();
  }
}
