/** Shared retry scheduling; world snapshots remain the single source of state. */
export class SceneLoadRecovery {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  failed(retry: () => void): boolean {
    if (this.timer !== null) return false;
    const first = this.attempt === 0;
    const delay = Math.min(1_000 * 2 ** this.attempt, 10_000);
    this.attempt = Math.min(this.attempt + 1, 4);
    this.timer = setTimeout(() => { this.timer = null; retry(); }, delay);
    return first;
  }
  reset() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null; this.attempt = 0;
  }
}
