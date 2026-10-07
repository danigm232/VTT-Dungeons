import type { PublicEntity, StepState } from '../shared/protocol';

/** A short, authoritative playback buffer bridges packet boundaries. It never
 * invents a destination or extrapolates through an obstacle. */
export class MovementTimeline {
  private steps = new Map<string, StepState[]>();
  constructor(readonly delayMs = 80) {}
  clear() { this.steps.clear(); }
  observe(entities: PublicEntity[]) {
    const live = new Set(entities.map(e => e.id));
    for (const id of this.steps.keys()) if (!live.has(id)) this.steps.delete(id);
    for (const entity of entities) {
      let history = this.steps.get(entity.id) ?? [];
      const last = history.at(-1);
      if (!entity.step && last && (entity.seatId || entity.cell.col !== last.to.col || entity.cell.row !== last.to.row)) history = [];
      if (entity.step && last?.startedAt !== entity.step.startedAt) {
        if (last && (last.to.col !== entity.step.from.col || last.to.row !== entity.step.from.row)) history = [];
        history.push(structuredClone(entity.step));
      }
      this.steps.set(entity.id, history.slice(-3));
    }
  }
  sample(entity: PublicEntity, serverTime: number): PublicEntity {
    const time = serverTime - this.delayMs, history = this.steps.get(entity.id) ?? [];
    const step = history.find(s => time < s.startedAt + s.durationMs && time >= s.startedAt)
      ?? history.find(s => time < s.startedAt);
    return step ? { ...entity, cell: step.to, step, moving: true } : entity;
  }
}
