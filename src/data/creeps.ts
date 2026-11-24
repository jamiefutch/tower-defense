import { HP_GROWTH } from "../core/config";

export interface CreepType {
  id: string;
  name: string;
  /** HP at wave 1. */
  hp: number;
  /** Cells per second. */
  speed: number;
  /** Gold awarded when killed. */
  bounty: number;
  /** Flat damage reduction applied to every hit (minimum 1 damage gets through). */
  armor: number;
  /** Ignores the maze: flies in straight lines between checkpoints. Only air-capable towers can hit it. */
  air?: boolean;
  /** Ignores slow and stun. */
  immune?: boolean;
  boss?: boolean;
  /** Spawns this many creeps of another type when killed. */
  splitInto?: { type: string; count: number };
  color: string;
  /** Drawn radius in cells. */
  radius: number;
}

export const CREEP_TYPES: Record<string, CreepType> = {
  normal: { id: "normal", name: "Normal", hp: 20, speed: 1.6, bounty: 2, armor: 0, color: "#e8d24a", radius: 0.3 },
  fast: { id: "fast", name: "Fast", hp: 14, speed: 3, bounty: 2, armor: 0, color: "#f59e0b", radius: 0.25 },
  air: { id: "air", name: "Air", hp: 25, speed: 2.2, bounty: 3, armor: 0, air: true, color: "#9fd3ff", radius: 0.3 },
  splitter: {
    id: "splitter",
    name: "Splitter",
    hp: 40,
    speed: 1.2,
    bounty: 4,
    armor: 0,
    splitInto: { type: "normal", count: 2 },
    color: "#c77dff",
    radius: 0.36,
  },
  armored: { id: "armored", name: "Armored", hp: 60, speed: 1.0, bounty: 5, armor: 3, color: "#8a8f98", radius: 0.34 },
  immune: { id: "immune", name: "Immune", hp: 45, speed: 1.4, bounty: 5, armor: 0, immune: true, color: "#ff8fa3", radius: 0.32 },
  boss: { id: "boss", name: "Boss", hp: 300, speed: 0.9, bounty: 30, armor: 2, boss: true, color: "#ff5e3a", radius: 0.46 },
};

export function getCreepType(id: string): CreepType {
  const type = CREEP_TYPES[id];
  if (!type) throw new Error(`unknown creep type "${id}"`);
  return type;
}

/** HP for a creep of this type when it spawns in the given wave. */
export function creepHpAt(type: CreepType, wave: number): number {
  return Math.round(type.hp * HP_GROWTH ** (wave - 1));
}
