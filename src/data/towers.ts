export type TargetMode = "nearest" | "strongest" | "weakest" | "first";

export const TARGET_MODES: readonly TargetMode[] = ["nearest", "strongest", "weakest", "first"];

export const TARGET_LABELS: Record<TargetMode, string> = {
  nearest: "Nearest",
  strongest: "Strongest",
  weakest: "Weakest",
  first: "First",
};

/**
 * One rung of a tower's upgrade ladder. Level 0 is the build; each later entry
 * is an upgrade. `cost` is the build cost for level 0 and the upgrade cost otherwise.
 */
export interface TowerLevel {
  cost: number;
  damage: number;
  range: number;
  /** Shots per second. */
  rate: number;
  /** Splash radius in cells, if the tower hits an area. */
  splash?: number;
  /** Slow duration (frost) or stun duration (bash), in seconds. */
  effectValue?: number;
}

export type TowerEffect = { kind: "slow"; factor: number } | { kind: "stun"; everyShots: number };

export interface TowerType {
  id: string;
  name: string;
  description: string;
  color: string;
  groundTarget: boolean;
  airTarget: boolean;
  effect?: TowerEffect;
  levels: readonly TowerLevel[];
}

export const TOWER_TYPES: Record<string, TowerType> = {
  pellet: {
    id: "pellet",
    name: "Pellet",
    description: "Cheap, fast-firing single-target gun.",
    color: "#f4b860",
    groundTarget: true,
    airTarget: false,
    levels: [
      { cost: 10, damage: 4, range: 2.5, rate: 1.2 },
      { cost: 12, damage: 6, range: 2.5, rate: 1.3 },
      { cost: 20, damage: 9, range: 2.5, rate: 1.4 },
      { cost: 35, damage: 14, range: 2.75, rate: 1.6 },
    ],
  },
  squirt: {
    id: "squirt",
    name: "Squirt",
    description: "Very fast but weak; good against swarms of light creeps.",
    color: "#6ee7b7",
    groundTarget: true,
    airTarget: false,
    levels: [
      { cost: 12, damage: 2, range: 2, rate: 3.5 },
      { cost: 12, damage: 3, range: 2, rate: 4 },
      { cost: 20, damage: 5, range: 2.25, rate: 4.5 },
      { cost: 30, damage: 7, range: 2.25, rate: 5 },
    ],
  },
  dart: {
    id: "dart",
    name: "Dart",
    description: "Hard-hitting, long-range tower that targets ground and air.",
    color: "#93c5fd",
    groundTarget: true,
    airTarget: true,
    levels: [
      { cost: 25, damage: 14, range: 3.5, rate: 0.8 },
      { cost: 20, damage: 20, range: 3.5, rate: 0.9 },
      { cost: 30, damage: 28, range: 3.75, rate: 1 },
      { cost: 45, damage: 40, range: 4, rate: 1.1 },
    ],
  },
  snap: {
    id: "snap",
    name: "Snap",
    description: "Splash damage hits every ground creep near the target.",
    color: "#fca5a5",
    groundTarget: true,
    airTarget: false,
    levels: [
      { cost: 30, damage: 9, range: 3, rate: 0.9, splash: 1 },
      { cost: 25, damage: 13, range: 3, rate: 1, splash: 1 },
      { cost: 40, damage: 18, range: 3.25, rate: 1.1, splash: 1.25 },
      { cost: 55, damage: 25, range: 3.5, rate: 1.2, splash: 1.5 },
    ],
  },
  swarm: {
    id: "swarm",
    name: "Swarm",
    description: "Anti-air specialist. Cannot hit ground creeps.",
    color: "#c4b5fd",
    groundTarget: false,
    airTarget: true,
    levels: [
      { cost: 25, damage: 8, range: 3.5, rate: 2 },
      { cost: 20, damage: 12, range: 3.5, rate: 2.2 },
      { cost: 30, damage: 17, range: 3.75, rate: 2.4 },
      { cost: 45, damage: 24, range: 4, rate: 2.6 },
    ],
  },
  frost: {
    id: "frost",
    name: "Frost",
    description: "Deals no damage but slows its target to half speed.",
    color: "#7dd3fc",
    groundTarget: true,
    airTarget: false,
    effect: { kind: "slow", factor: 0.5 },
    levels: [
      { cost: 20, damage: 0, range: 2.5, rate: 1, effectValue: 2 },
      { cost: 15, damage: 0, range: 2.5, rate: 1, effectValue: 2.5 },
      { cost: 25, damage: 0, range: 2.75, rate: 1, effectValue: 3 },
      { cost: 35, damage: 0, range: 3, rate: 1, effectValue: 3.5 },
    ],
  },
  bash: {
    id: "bash",
    name: "Bash",
    description: "Every 4th shot stuns its target. Immune creeps shrug it off.",
    color: "#fde047",
    groundTarget: true,
    airTarget: false,
    effect: { kind: "stun", everyShots: 4 },
    levels: [
      { cost: 35, damage: 6, range: 2.5, rate: 1, effectValue: 1 },
      { cost: 25, damage: 9, range: 2.5, rate: 1.1, effectValue: 1.25 },
      { cost: 40, damage: 13, range: 2.75, rate: 1.2, effectValue: 1.5 },
      { cost: 55, damage: 18, range: 3, rate: 1.3, effectValue: 1.75 },
    ],
  },
};

/** Tower order for the palette and the 1-7 hotkeys. */
export const TOWER_ORDER: readonly string[] = Object.keys(TOWER_TYPES);

export function getTowerType(id: string): TowerType {
  const type = TOWER_TYPES[id];
  if (!type) throw new Error(`unknown tower type "${id}"`);
  return type;
}
