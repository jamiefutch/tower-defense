import { GROUP_STAGGER, TOTAL_WAVES } from "../core/config";

export interface SpawnGroup {
  type: string;
  count: number;
  /** Seconds between each creep in the group. */
  interval: number;
  /** Seconds after the wave starts before this group begins spawning. */
  start: number;
}

export interface WaveSpec {
  wave: number;
  groups: SpawnGroup[];
}

/**
 * Builds the composition of a wave. Waves get larger and introduce new creep types
 * over time. Every tenth wave ends in a boss.
 */
export function buildWave(wave: number): WaveSpec {
  if (!Number.isInteger(wave) || wave < 1 || wave > TOTAL_WAVES) {
    throw new RangeError(`wave must be an integer from 1 to ${TOTAL_WAVES}, got ${wave}`);
  }

  const groups: SpawnGroup[] = [];
  const add = (type: string, count: number, interval: number): void => {
    if (count <= 0) return;
    groups.push({ type, count, interval, start: groups.length * GROUP_STAGGER });
  };

  add("normal", 4 + Math.floor(wave * 1.2), Math.max(0.45, 1 - wave * 0.012));
  if (wave >= 3 && wave % 3 === 0) add("fast", 2 + Math.floor(wave / 4), 0.7);
  if (wave >= 4 && wave % 2 === 0) add("air", 2 + Math.floor(wave / 5), 1);
  if (wave >= 6 && wave % 3 === 0) add("splitter", 1 + Math.floor(wave / 8), 2);
  if (wave >= 8 && wave % 4 === 0) add("armored", 1 + Math.floor(wave / 10), 2);
  if (wave >= 12 && wave % 5 === 0) add("immune", 1 + Math.floor(wave / 12), 1.5);
  if (wave % 10 === 0) add("boss", 1, 0);

  return { wave, groups };
}
