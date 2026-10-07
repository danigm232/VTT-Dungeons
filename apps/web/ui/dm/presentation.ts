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
