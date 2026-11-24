import type { WaveSpec } from "../data/waves";

export interface SpawnEvent {
  /** Seconds after the wave started. */
  time: number;
  type: string;
}

/** Flattens a wave's groups into a single time-ordered list of spawn events. */
export function buildSpawnQueue(spec: WaveSpec): SpawnEvent[] {
  const events: SpawnEvent[] = [];
  for (const g of spec.groups) {
    for (let i = 0; i < g.count; i++) {
      events.push({ time: g.start + i * g.interval, type: g.type });
    }
  }
  // Array.prototype.sort is stable, so equal times keep their group order.
  return events.sort((a, b) => a.time - b.time);
}

/** Releases queued spawn events as their time comes due. */
export class Spawner {
  private elapsed = 0;
  private index = 0;

  constructor(private readonly queue: readonly SpawnEvent[]) {}

  /** True once every event has been released. */
  get done(): boolean {
    return this.index >= this.queue.length;
  }

  /** Advances the clock and returns the events that became due. */
  update(dt: number): SpawnEvent[] {
    this.elapsed += dt;
    const due: SpawnEvent[] = [];
    while (this.index < this.queue.length && this.queue[this.index].time <= this.elapsed) {
      due.push(this.queue[this.index]);
      this.index += 1;
    }
    return due;
  }
}
