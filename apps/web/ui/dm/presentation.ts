/** DM-only presentation. No commands, persistence or duplicated game state. */
export type StateTone = 'positive' | 'pending' | 'error' | 'info';
export function chip(text: string, tone: StateTone = 'info') {
  const element = document.createElement('span');
  element.className = `dm-chip dm-${tone}`; element.textContent = text;
  return element;
}
export function chips(values: Array<string | [string, StateTone]>) {
  const row = document.createElement('div'); row.className = 'dm-chips';
  row.append(...values.map(value => typeof value === 'string' ? chip(value) : chip(...value)));
  return row;
}
export function emptyState(title: string, note?: string) {
  const element = document.createElement('div'), heading = document.createElement('strong');
  element.className = 'dm-empty'; heading.textContent = title; element.append(heading);
  if (note) { const help = document.createElement('small'); help.textContent = note; element.append(help); }
  return element;
}
const expanded = new Set<string>();
export function disclosure(key: string, title: string, ...content: Node[]) {
  const details = document.createElement('details'), summary = document.createElement('summary');
  details.className = 'dm-disclosure'; details.open = expanded.has(key); summary.textContent = title;
  details.ontoggle = () => { if (!details.isConnected) return; if (details.open) expanded.add(key); else expanded.delete(key); };
  details.append(summary, ...content); return details;
}
export function preserveDisclosures(root: HTMLElement, scope: string) {
  const keyFor = (detail: HTMLDetailsElement) => `${scope}:${detail.querySelector('summary')?.textContent ?? ''}`;
  root.querySelectorAll('details').forEach(detail => { if (detail.open) expanded.add(keyFor(detail)); else expanded.delete(keyFor(detail)); });
  queueMicrotask(() => root.querySelectorAll('details').forEach(detail => {
    const key = keyFor(detail); detail.open = expanded.has(key);
    detail.ontoggle = () => { if (!detail.isConnected) return; if (detail.open) expanded.add(key); else expanded.delete(key); };
  }));
}
export function localButton(label: string, action: () => void) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.onclick = action; return button;
}
export function sceneBlock(label: string, values: string[]) {
  const block = document.createElement('section'), heading = document.createElement('small');
  block.className = 'dm-scene-block'; heading.className = 'eyebrow'; heading.textContent = label;
  block.append(heading, values.length ? chips(values) : chip('Ninguno')); return block;
}

const sectionSelections = new Map<string, string>();
/** One visible section, not a column of nested disclosure headings. */
export function sectionDeck(root: HTMLElement, scope: string) {
  const sections = Array.from(root.children).filter((child): child is HTMLDetailsElement => child instanceof HTMLDetailsElement);
  if (sections.length < 2) return;
  const deck = document.createElement('section'), tabs = document.createElement('div'), body = document.createElement('div');
  deck.className = 'dm-section-deck'; tabs.className = 'dm-section-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Información de escena'); body.className = 'dm-section-body';
  const entries = sections.map((details, index) => {
    const title = details.querySelector('summary')?.textContent ?? 'Información';
    const button = localButton(title.replace(/ · solo DM$/, ''), () => select(title)); button.setAttribute('role', 'tab'); button.id = `${scope}-tab-${index}`;
    const panel = document.createElement('div'); panel.setAttribute('role', 'tabpanel'); panel.id = `${scope}-panel-${index}`; panel.setAttribute('aria-labelledby', button.id); button.setAttribute('aria-controls', panel.id);
    panel.append(...Array.from(details.childNodes).filter(node => !(node instanceof HTMLElement && node.tagName === 'SUMMARY')));
    tabs.append(button); body.append(panel); details.remove(); return { title, button, panel };
  });
  function select(title: string) {
    sectionSelections.set(scope, title);
    entries.forEach(entry => { const active = entry.title === title; entry.button.setAttribute('aria-selected', String(active)); entry.button.tabIndex = active ? 0 : -1; entry.panel.hidden = !active; });
  }
  tabs.onkeydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const index = entries.findIndex(entry => entry.button === document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + entries.length) % entries.length;
    select(entries[next]!.title); entries[next]!.button.focus();
  };
  select(entries.some(entry => entry.title === sectionSelections.get(scope)) ? sectionSelections.get(scope)! : entries[0]!.title);
  deck.append(tabs, body); root.append(deck);
}
/** Large scenes show a count first, not dozens of permanent object labels. */
export function sceneActions(label: string, actions: Array<{ label: string; select: () => void }>, extra: string[] = []) {
  const compact = actions.length > 6;
  const block = sceneBlock(label, compact ? [`${actions.length} objetos`, ...extra] : extra);
  const row = document.createElement('div'); row.className = 'dm-chips';
  row.append(...actions.map(action => {
    const button = localButton(action.label, action.select); button.className = 'dm-chip dm-info'; return button;
  }));
  if (compact) block.append(disclosure(`scene-actions:${label}`, `Ver objetos · ${actions.length}`, row));
  else if (actions.length) {
    row.append(...extra.map(value => chip(value))); block.querySelector('.dm-chips, .dm-chip')?.replaceWith(row);
  }
  return block;
}

export type SavePresentationInput = {
  mode: string; dirty: boolean; savedAt: string | null; errorCode: string | null;
  savedStateRevision: number | null; stateRevision: number;
};
/** A successful old copy is not proof that the current revision is saved. */
export function savePresentation(status: SavePresentationInput | null) {
  if (!status) return { title: 'Comprobando guardado', tone: 'pending' as StateTone, alert: false };
  if (['error', 'recovery', 'incompatible'].includes(status.mode)) {
    return { title: status.mode === 'error' ? 'Error de guardado' : 'Recuperación necesaria', tone: 'error' as StateTone, alert: true };
  }
  if (status.mode === 'saving' || status.mode === 'restoring') return { title: status.mode === 'saving' ? 'Guardando…' : 'Restaurando…', tone: 'pending' as StateTone, alert: false };
  if (status.dirty || !status.savedAt || status.savedStateRevision !== status.stateRevision) return { title: 'Cambios pendientes', tone: 'pending' as StateTone, alert: false };
  return { title: 'Partida guardada', tone: 'positive' as StateTone, alert: false };
}

export function relativeTime(date: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(date)) / 1000));
  if (!Number.isFinite(seconds)) return 'Fecha no disponible';
  if (seconds < 60) return 'Hace un momento';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return `Hace ${Math.floor(seconds / 86400)} días`;
}
