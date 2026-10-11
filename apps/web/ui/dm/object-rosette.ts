import { dmRosetteLayout, type RosettePoint } from '../../../../engine/client/dm-rosette-layout';
import { radialActionGlyph } from '../../../../engine/client/radial-action-icons';

/** Uses the existing action buttons as sources; never issues game commands. */
export class DmObjectRosette {
  private layer = document.createElement('div');
  private page = 0;
  private anchor: RosettePoint = { x: 0, y: 0 };
  private title = '';
  private previousFocus: HTMLElement | null = null;
  private timer = 0;
  private description = document.createElement('div');
  private signature = '';
  private open = false;
  private project: (() => RosettePoint | null) | null = null;
  private frame = 0;
  constructor(private host: HTMLElement, private sources: () => HTMLButtonElement[]) {
    this.layer.className = 'dm-object-rosette'; this.layer.hidden = true;
    this.layer.setAttribute('role', 'group');
    host.append(this.layer);
    this.layer.addEventListener('pointerdown', event => event.stopPropagation());
    this.layer.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); this.close(); } });
    new ResizeObserver(() => this.render()).observe(host);
  }
  show(title: string, anchor: RosettePoint, project?: () => RosettePoint | null) {
    cancelAnimationFrame(this.frame); this.project = project ?? null;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.title = title; this.anchor = anchor; this.page = 0; this.open = true; this.signature = ''; this.render();
    this.layer.querySelector<HTMLButtonElement>('.dm-rosette-close')?.focus({ preventScroll: true });
    const track = () => {
      if (!this.open) return;
      const point = this.project?.();
      if (this.project && !point) { this.close(); return; }
      if (point && Math.hypot(point.x - this.anchor.x, point.y - this.anchor.y) >= 1) { this.anchor = point; this.render(); }
      this.frame = requestAnimationFrame(track);
    };
    if (this.project && this.open) this.frame = requestAnimationFrame(track);
  }
  close() {
    this.open = false; this.layer.hidden = true; this.signature = ''; window.clearTimeout(this.timer);
    cancelAnimationFrame(this.frame); this.project = null;
    if (this.layer.contains(document.activeElement)) this.previousFocus?.focus({ preventScroll: true });
  }
  refresh() { this.render(); }
  get isOpen() { return this.open; }
  private render() {
    if (!this.open) return;
    const sources = this.sources(), width = this.host.clientWidth, height = this.host.clientHeight;
    const layout = dmRosetteLayout(width, height, this.anchor, sources.length, this.page);
    if (!layout || !sources.length) { this.close(); return; }
    this.page = layout.page;
    const signature = JSON.stringify([this.title, width, height, this.anchor, this.page, sources.map(button => [button.textContent, button.disabled, button.title])]);
    if (signature === this.signature) return; this.signature = signature;
    const focused = this.layer.querySelector<HTMLButtonElement>('button:focus')?.dataset.action;
    window.clearTimeout(this.timer); this.layer.replaceChildren(); this.layer.hidden = false;
    this.layer.setAttribute('aria-label', `Acciones de ${this.title}`);
    const position = (element: HTMLElement, point: RosettePoint) => { element.style.left = `${point.x}px`; element.style.top = `${point.y}px`; };
    const close = document.createElement('button'); close.type = 'button'; close.className = 'dm-rosette-close'; close.textContent = '×'; close.title = this.title; close.setAttribute('aria-label', `Cerrar acciones de ${this.title}`); close.onclick = () => this.close(); position(close, layout.closePoint); this.layer.append(close);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('dm-rosette-links'); svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height)); svg.setAttribute('aria-hidden', 'true'); this.layer.prepend(svg);
    const visible = sources.slice(this.page * layout.capacity, (this.page + 1) * layout.capacity);
    visible.forEach((source, index) => {
      const point = layout.points[index]!;
      const line = document.createElementNS(svg.namespaceURI, 'line'); for (const [key, value] of Object.entries({ x1: layout.origin.x, y1: layout.origin.y, x2: point.x, y2: point.y })) line.setAttribute(key, String(value)); svg.append(line);
      const node = document.createElement('button'), icon = document.createElement('span'), label = document.createElement('span');
      const text = source.textContent?.trim() || 'Acción';
      node.type = 'button'; node.className = `dm-rosette-action${source.classList.contains('danger') ? ' danger' : ''}`; node.setAttribute('aria-disabled', String(source.disabled)); node.dataset.action = text;
      node.setAttribute('aria-label', text); icon.setAttribute('aria-hidden', 'true');
      node.oncontextmenu = event => event.preventDefault();
      const campGlyphs: Record<string, string> = { warm: '♨', cook: '🍲', 'tend-fire': '🔥', 'prepare-bed': '🛏', rest: '☾', study: '📖', pray: '✦', tools: '⚒', guard: '◉', sit: '🪑', 'chest-toggle': '▣', inspect: '⌕', shelter: '⛺' };
      icon.textContent = campGlyphs[source.dataset.campActivity ?? ''] ?? (/mover|paso/.test(text.toLowerCase()) ? '✥' : /romper|dañar/.test(text.toLowerCase()) ? '⚒' : /botín|paquete|dar a|asignar/.test(text.toLowerCase()) ? '▣' : /separar/.test(text.toLowerCase()) ? '↗' : /bloquear|listón/.test(text.toLowerCase()) ? '⚿' : radialActionGlyph('', text));
      label.className = 'dm-rosette-label'; label.textContent = text; node.append(icon, label); position(node, point);
      if (text.length > 34) { label.style.fontSize = '9px'; label.style.lineHeight = '13px'; }
      const describe = () => { this.description.textContent = `${text}${source.title ? ` · ${source.title}` : ''}`; this.description.hidden = false; };
      let held = false;
      node.onpointerdown = event => { event.stopPropagation(); held = false; window.clearTimeout(this.timer); this.timer = window.setTimeout(() => { held = true; describe(); }, 550); };
      node.onpointerup = node.onpointercancel = node.onpointerleave = () => window.clearTimeout(this.timer);
      node.onfocus = () => { if (node.matches(':focus-visible')) describe(); };
      node.onclick = () => { if (held) { held = false; return; } if (source.disabled) { describe(); return; } source.click(); this.refresh(); };
      this.layer.append(node);
    });
    if (layout.pages > 1) {
      const pager = document.createElement('nav'); pager.className = 'dm-rosette-pager'; pager.setAttribute('aria-label', 'Páginas de acciones'); position(pager, layout.pagerPoint);
      const count = document.createElement('span'); count.textContent = `${this.page + 1}/${layout.pages}`;
      for (const [step, glyph, text] of [[-1, '‹', 'Página anterior'], [1, '›', 'Página siguiente']] as const) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = glyph; button.setAttribute('aria-label', text); button.disabled = this.page + step < 0 || this.page + step >= layout.pages; button.onclick = () => { this.page += step; this.render(); this.layer.querySelector<HTMLButtonElement>('.dm-rosette-close')?.focus({ preventScroll: true }); }; pager.append(button); if (step === -1) pager.append(count);
      }
      this.layer.append(pager);
    }
    this.description = document.createElement('div'); this.description.className = 'dm-rosette-description'; this.description.setAttribute('role', 'status'); this.description.hidden = true; this.layer.append(this.description);
    if (focused) Array.from(this.layer.querySelectorAll<HTMLButtonElement>('[data-action]')).find(button => button.dataset.action === focused)?.focus({ preventScroll: true });
  }
}
