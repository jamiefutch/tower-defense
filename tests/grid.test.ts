import { describe, expect, it } from "vitest";
import { Grid } from "../src/grid/grid";
import { findPath, findRoute } from "../src/grid/pathfinding";
import { canPlaceTower } from "../src/grid/placement";

describe("Grid", () => {
  it("defaults to the 30x20 playfield with all cells open", () => {
    const g = new Grid();
    expect(g.width).toBe(30);
    expect(g.height).toBe(20);
    expect(g.isOpen(0, 0)).toBe(true);
    expect(g.isOpen(29, 19)).toBe(true);
  });

  it("treats out-of-bounds cells as not open", () => {
    const g = new Grid();
    expect(g.isOpen(-1, 0)).toBe(false);
    expect(g.isOpen(30, 0)).toBe(false);
  });

  it("rejects footprints that extend past the edge without changing anything", () => {
    const g = new Grid();
    expect(g.setFootprint(29, 0, 2, 2, true)).toBe(false);
    expect(g.isBlocked(29, 0)).toBe(false);
  });

  it("clone is independent of the original", () => {
    const g = new Grid();
    const c = g.clone();
    c.setBlocked(5, 5, true);
    expect(g.isBlocked(5, 5)).toBe(false);
  });
});

describe("findPath", () => {
  it("returns a straight line on an empty grid", () => {
    const g = new Grid(5, 1);
    const p = findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(p).toHaveLength(5);
    expect(p![0]).toEqual({ x: 0, y: 0 });
    expect(p![4]).toEqual({ x: 4, y: 0 });
  });

  it("returns a shortest path around a wall", () => {
    const g = new Grid(5, 3);
    // Wall down the middle column except the top row.
    g.setBlocked(2, 1, true);
    g.setBlocked(2, 2, true);
    const p = findPath(g, { x: 0, y: 2 }, { x: 4, y: 2 });
    // Must go up through (2,0): 0,2 -> 0,1 -> 0,0 -> 1,0 -> 2,0 -> 3,0 -> 3,1 -> 3,2 -> 4,2 = 9 cells
    expect(p).toHaveLength(9);
  });

  it("returns null when the goal is walled off", () => {
    const g = new Grid(3, 3);
    g.setBlocked(1, 0, true);
    g.setBlocked(1, 1, true);
    g.setBlocked(1, 2, true);
    expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it("returns null when start or goal is blocked", () => {
    const g = new Grid(3, 1);
    g.setBlocked(0, 0, true);
    expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
});

describe("findRoute", () => {
  it("chains legs through checkpoints without duplicating cells", () => {
    const g = new Grid(5, 5);
    const r = findRoute(g, [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
    ]);
    expect(r).not.toBeNull();
    // 5 cells across, then 4 more down = 9 unique cells
    expect(r).toHaveLength(9);
  });
});

describe("canPlaceTower", () => {
  const route = [
    { x: 0, y: 1 },
    { x: 9, y: 1 },
  ];

  it("allows a tower that leaves a detour open (mazing)", () => {
    const g = new Grid(10, 4);
    // 2x2 tower in the middle, top and bottom rows stay open.
    expect(canPlaceTower(g, { x: 4, y: 0, w: 2, h: 2 }, route)).toBe(true);
  });

  it("rejects a tower that seals the route completely", () => {
    const g = new Grid(10, 3);
    // Full-height wall of towers would seal the route; a 2x3 footprint covers the whole column.
    expect(canPlaceTower(g, { x: 4, y: 0, w: 1, h: 3 }, route)).toBe(false);
  });

  it("rejects placement on a waypoint", () => {
    const g = new Grid(10, 4);
    expect(canPlaceTower(g, { x: 0, y: 1, w: 1, h: 1 }, route)).toBe(false);
  });

  it("rejects placement over an existing tower", () => {
    const g = new Grid(10, 4);
    g.setFootprint(4, 0, 2, 2, true);
    expect(canPlaceTower(g, { x: 4, y: 1, w: 2, h: 2 }, route)).toBe(false);
  });

  it("does not modify the grid it checks", () => {
    const g = new Grid(10, 4);
    canPlaceTower(g, { x: 4, y: 0, w: 2, h: 2 }, route);
    expect(g.isBlocked(4, 0)).toBe(false);
  });
});
