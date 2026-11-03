export type DmMapTarget = { id: string; label: string; project: () => { x: number; y: number } | null; select: (point: { x: number; y: number }) => void };
/** Map-local, keyboard-accessible marks. Camera positions are never cached. */
export class DmMapTargets {
  private layer = document.createElement('div');
  private targets = new Map<string, { target: DmMapTarget; button: HTMLButtonElement; x: number; y: number }>();
  private frame = 0;
  private lastPositionAt = 0;
  constructor(private host: HTMLElement) { this.layer.className = 'dm-map-targets'; this.layer.hidden = true; host.append(this.layer); }
  update(targets: DmMapTarget[], enabled: boolean) {
    this.layer.hidden = !enabled;
    const current = new Set(targets.map(target => target.id));
    for (const [id, entry] of this.targets) if (!current.has(id)) { entry.button.remove(); this.targets.delete(id); }
    for (const target of targets) {
      let entry = this.targets.get(target.id);
      if (!entry) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'dm-map-target'; button.dataset.targetId = target.id;
        button.textContent = '◇'; button.onpointerdown = event => event.stopPropagation();
        entry = { target, button, x: NaN, y: NaN };
        this.targets.set(target.id, entry);
        button.onclick = event => {event.stopPropagation();if(event.detail===0)activate();};
        button.ondblclick = event => {event.stopPropagation();activate();};
        const activate = () => { const active = this.targets.get(target.id)?.target; const point = active?.project(); if (point) active?.select(point); };
        this.layer.append(button);
      }
      entry.target = target;
      if (entry.button.title !== target.label) { entry.button.title = target.label; entry.button.setAttribute('aria-label', `Acciones de ${target.label}`); }
    }
    if (!enabled) { cancelAnimationFrame(this.frame); this.frame = 0; }
    else if (!this.frame) this.frame = requestAnimationFrame(this.position);
  }
  private position = (now: number) => {
    if (this.layer.hidden) { this.frame = 0; return; }
    if (now - this.lastPositionAt < 32) { this.frame = requestAnimationFrame(this.position); return; }
    this.lastPositionAt = now;
    const width = this.host.clientWidth, height = this.host.clientHeight;
    for (const entry of this.targets.values()) {
      const { target, button } = entry, point = target.project();
      const hidden = !point || point.x < 14 || point.x > width - 14 || point.y < 14 || point.y > height - 14;
      if (button.hidden !== hidden) button.hidden = hidden;
      if (point && !hidden) {
        const x = Math.round(point.x), y = Math.round(point.y);
        if (x !== entry.x) { button.style.left = `${x}px`; entry.x = x; }
        if (y !== entry.y) { button.style.top = `${y}px`; entry.y = y; }
      }
    }
    this.frame = requestAnimationFrame(this.position);
  };
}
