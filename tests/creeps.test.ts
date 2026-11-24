import { describe, expect, it } from "vitest";
import { CREEP_TYPES, creepHpAt } from "../src/data/creeps";
import { Grid } from "../src/grid/grid";
import { advanceCreep, cellOf, createCreep, repathCreep } from "../src/entities/creep";
import { findRoute } from "../src/grid/pathfinding";

const wp = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
];

function spawnOn(path: { x: number; y: number }[], type = CREEP_TYPES.normal) {
  return createCreep(1, type, 1, path[0].x + 0.5, path[0].y + 0.5, path, 1, 1);
}

describe("creep movement", () => {
  it("walks along its path at its speed", () => {
    const c = spawnOn(wp);
    advanceCreep(c, 1, wp); // normal speed is 1.6 cells/s
    expect(c.x).toBeCloseTo(0.5 + 1.6, 5);
    expect(c.y).toBeCloseTo(0.5, 5);
  });

  it("reports arrival at the exit once the path is exhausted", () => {
    const c = spawnOn(wp);
    let arrived = false;
    for (let i = 0; i < 600 && !arrived; i++) arrived = advanceCreep(c, 1 / 60, wp);
    expect(arrived).toBe(true);
  });

  it("slow halves movement while the timer runs", () => {
    const fast = spawnOn(wp);
    const slow = spawnOn(wp);
    slow.slowTimer = 10;
    slow.slowFactor = 0.5;
    advanceCreep(fast, 1, wp);
    advanceCreep(slow, 1, wp);
    expect(slow.x - 0.5).toBeCloseTo((fast.x - 0.5) / 2, 5);
  });

  it("slow expires and speed returns to normal", () => {
    const c = spawnOn(wp);
    c.slowTimer = 0.05;
    c.slowFactor = 0.5;
    advanceCreep(c, 0.1, wp);
    expect(c.slowTimer).toBe(0);
    expect(c.slowFactor).toBe(1);
  });

  it("stun holds the creep in place until it wears off", () => {
    const c = spawnOn(wp);
    const startX = c.x;
    c.stunTimer = 1;
    advanceCreep(c, 0.5, wp);
    expect(c.x).toBe(startX);
    advanceCreep(c, 0.6, wp); // stun runs out during this step, so no movement yet
    expect(c.stunTimer).toBe(0);
    expect(c.x).toBe(startX);
    advanceCreep(c, 0.1, wp);
    expect(c.x).toBeGreaterThan(startX);
  });

  it("counts distance traveled", () => {
    const c = spawnOn(wp);
    advanceCreep(c, 1, wp);
    expect(c.traveled).toBeCloseTo(1.6, 5);
  });
});

describe("creep repathing", () => {
  it("routes around a newly placed wall", () => {
    const grid = new Grid(5, 3);
    const waypoints = [
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    ];
    const path = findRoute(grid, waypoints)!;
    const c = createCreep(1, CREEP_TYPES.normal, 1, 0.5, 1.5, path, 1, 1);

    // Wall the middle of row 1 except the top row; the creep must detour.
    grid.setBlocked(2, 1, true);
    grid.setBlocked(2, 2, true);
    expect(repathCreep(c, grid, waypoints)).toBe(true);
    expect(c.path.some((cell) => cell.x === 2 && cell.y === 1)).toBe(false);
    expect(c.path[c.path.length - 1]).toEqual({ x: 4, y: 1 });
  });

  it("keeps the old path when the maze is sealed", () => {
    const grid = new Grid(3, 1);
    const waypoints = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ];
    const path = findRoute(grid, waypoints)!;
    const c = createCreep(1, CREEP_TYPES.normal, 1, 0.5, 0.5, path, 1, 1);
    grid.setBlocked(1, 0, true);
    expect(repathCreep(c, grid, waypoints)).toBe(false);
    expect(c.path).toBe(path);
  });

  it("returns cell coordinates from its position", () => {
    const c = spawnOn(wp);
    c.x = 2.9;
    c.y = 0.1;
    expect(cellOf(c)).toEqual({ x: 2, y: 0 });
  });
});

describe("creep stats", () => {
  it("HP grows with wave number", () => {
    expect(creepHpAt(CREEP_TYPES.normal, 1)).toBe(20);
    expect(creepHpAt(CREEP_TYPES.normal, 20)).toBeGreaterThan(creepHpAt(CREEP_TYPES.normal, 10));
  });
});
