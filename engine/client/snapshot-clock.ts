/** Network delay must not rewind a step on each broadcast. Use the lowest
 * observed offset, and never move the presentation clock backwards. */
export class SnapshotClock {
  private offset: number | null = null;
  private last = -Infinity;
  observe(serverTime: number, receivedAt: number) {
    this.offset = this.offset === null ? receivedAt-serverTime : Math.min(this.offset, receivedAt-serverTime);
  }
  now(clientTime: number) { this.last=Math.max(this.last,clientTime-(this.offset??0));return this.last; }
  reset() { this.offset=null;this.last=-Infinity; }
}
