import { CELL_PX, FOOTPRINT } from "../core/config";
import type { Game } from "../core/game";
import type { TowerType } from "../data/towers";
import type { Creep } from "../entities/creep";
import type { Effect } from "../entities/effects";
import { BARREL_REACH, towerCenter, towerLevel, type Tower } from "../entities/tower";
import type { Cell } from "../grid/grid";
import { getTheme, type Theme } from "./themes";

/** Per-frame UI state the renderer needs: what the cursor is doing and what is selected. */
export interface ViewState {
  hover: Cell | null;
  /** Tower type being placed, if the player has one selected. */
  ghost: TowerType | null;
  selected: Tower | null;
  showRoute: boolean;
  /** Playfield pixels per cell, relative to CELL_PX. Fits the board to the window. */
  scale: number;
  theme: Theme;
}

// Ink for outlines and glyphs. It stays dark in every theme because it sits on coloured towers and creeps.
const INK = "#111827";

/** Set from the view at the start of each render. Drawing helpers read colours from here. */
let theme: Theme = getTheme(null);

const px = (cells: number): number => cells * CELL_PX;

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/**
 * Darkens (negative amount) or lightens (positive amount) a #rgb or #rrggbb colour.
 * Outlines are derived from each data colour so no per-type outline colour needs to be stored.
 * Any other format is returned unchanged, so a bad colour shows up as an unshaded outline rather than NaN.
 */
export function shade(color: string, amount: number): string {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color);
  if (!m) return color;
  const digits = m[1].length === 3 ? [...m[1]].map((d) => d + d).join("") : m[1];
  const n = parseInt(digits, 16);
  const ch = (shift: number): number => {
    const v = (n >> shift) & 0xff;
    return Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function render(ctx: CanvasRenderingContext2D, game: Game, view: ViewState): void {
  theme = view.theme;
  // Drawing code works in unscaled CSS-pixel units (`px`). The backing store is sized for the
  // device pixel ratio and the fit scale together, so lines and glyphs stay sharp at any board size.
  const cssW = px(game.grid.width);
  const cssH = px(game.grid.height);
  const dpr = window.devicePixelRatio || 1;
  const res = dpr * view.scale;
  const canvas = ctx.canvas;
  const bw = Math.round(cssW * res);
  const bh = Math.round(cssH * res);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  canvas.style.width = `${cssW * view.scale}px`;
  canvas.style.height = `${cssH * view.scale}px`;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(groundLayer(game.grid.width, game.grid.height, res), 0, 0, cssW, cssH);

  if (view.showRoute) drawRoute(ctx, game.route);
  drawMarkers(ctx, game);

  for (const t of game.towers) drawTower(ctx, t, t === view.selected);
  if (view.selected) {
    const c = towerCenter(view.selected);
    drawRange(ctx, c.x, c.y, towerLevel(view.selected).range, theme.field.rangeStroke, theme.field.rangeFill);
  }
  if (view.hover && view.ghost) drawGhost(ctx, game, view.hover, view.ghost);

  for (const c of game.creeps) if (c.status === "alive" && !c.type.air) drawCreep(ctx, c);
  for (const c of game.creeps) if (c.status === "alive" && c.type.air) drawCreep(ctx, c);

  for (const e of game.effects) drawEffect(ctx, e);
}

/**
 * The field never changes during a game, so the current size, resolution and theme are reused each frame.
 * Keeping only the current layer prevents successive resize scales from retaining full-resolution canvases.
 */
let groundCache: { key: string; layer: HTMLCanvasElement } | null = null;

/** `res` is the backing-store pixels per CSS pixel, including the fit scale. */
function groundLayer(width: number, height: number, res: number): HTMLCanvasElement {
  const key = `${theme.id}:${width}x${height}@${res}`;
  if (groundCache?.key === key) return groundCache.layer;

  const layer = document.createElement("canvas");
  layer.width = Math.round(px(width) * res);
  layer.height = Math.round(px(height) * res);
  const g = layer.getContext("2d");
  if (g) {
    const f = theme.field;
    g.setTransform(res, 0, 0, res, 0, 0);
    g.fillStyle = f.fill;
    g.fillRect(0, 0, px(width), px(height));
    g.fillStyle = f.gridLine;
    for (let x = 1; x < width; x++) g.fillRect(px(x), 0, 1, px(height));
    for (let y = 1; y < height; y++) g.fillRect(0, px(y), px(width), 1);
    g.fillStyle = f.edge;
    g.fillRect(0, 0, px(width), 2);
    g.fillRect(0, px(height) - 2, px(width), 2);
    g.fillRect(0, 0, 2, px(height));
    g.fillRect(px(width) - 2, 0, 2, px(height));
  }
  groundCache = { key, layer };
  return layer;
}

function drawRoute(ctx: CanvasRenderingContext2D, route: readonly Cell[]): void {
  ctx.strokeStyle = theme.field.route;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  route.forEach((c, i) => {
    const x = px(c.x + 0.5);
    const y = px(c.y + 0.5);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawZone(ctx: CanvasRenderingContext2D, cell: Cell, style: { fill: string; stroke: string }, label: string): void {
  const x = px(cell.x) + 2;
  const y = px(cell.y) + 2;
  const size = CELL_PX - 4;
  ctx.fillStyle = style.fill;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = style.stroke;
  ctx.fillText(label, px(cell.x + 0.5), px(cell.y + 0.5));
}

function drawMarkers(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const f = theme.field;
  const checkpoint = { fill: f.checkpointFill, stroke: f.checkpointStroke };
  game.map.checkpoints.forEach((cell, i) => drawZone(ctx, cell, checkpoint, String(i + 1)));
  drawZone(ctx, game.map.spawn, { fill: f.spawnFill, stroke: f.spawnStroke }, "S");
  drawZone(ctx, game.map.exit, { fill: f.exitFill, stroke: f.exitStroke }, "E");
}

function drawTower(ctx: CanvasRenderingContext2D, t: Tower, selected: boolean): void {
  drawTowerBody(ctx, t.type, t.x, t.y, t.level, selected);
  drawBarrel(ctx, t);
}

/**
 * A weapon barrel from the tower centre toward its aim. It starts past the glyph and ends at the
 * same point that shots leave from (BARREL_REACH), so the tracer visibly comes out of the barrel.
 */
function drawBarrel(ctx: CanvasRenderingContext2D, t: Tower): void {
  const c = towerCenter(t);
  const cos = Math.cos(t.aim);
  const sin = Math.sin(t.aim);
  const from = BARREL_REACH * 0.35;
  ctx.strokeStyle = shade(t.type.color, -0.6);
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px(c.x + cos * from), px(c.y + sin * from));
  ctx.lineTo(px(c.x + cos * BARREL_REACH), px(c.y + sin * BARREL_REACH));
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Draws a tower whose footprint starts at cell (ox, oy). Shared by placed towers and the placement ghost. */
function drawTowerBody(
  ctx: CanvasRenderingContext2D,
  type: TowerType,
  ox: number,
  oy: number,
  level: number,
  selected: boolean,
): void {
  const size = px(FOOTPRINT) - 6;
  const x = px(ox) + 3;
  const y = px(oy) + 3;

  // Flat bevel: light top and left edges, dark bottom and right edges.
  ctx.fillStyle = type.color;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x, y, size, 4);
  ctx.fillRect(x, y, 4, size);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x, y + size - 4, size, 4);
  ctx.fillRect(x + size - 4, y, 4, size);

  ctx.strokeStyle = selected ? INK : shade(type.color, -0.6);
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  // Each type has its own glyph so towers read apart without relying on colour alone.
  const glyph = TOWER_GLYPHS[type.id] ?? glyphDot;
  ctx.fillStyle = INK;
  glyph(ctx, x + size / 2, y + size / 2, size * 0.22);

  // One pip per upgrade level along the bottom edge.
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  for (let i = 0; i <= level; i++) {
    const pipX = x + 7 + i * 7;
    const pipY = y + size - 10;
    ctx.fillRect(pipX, pipY, 4, 4);
    ctx.strokeRect(pipX + 0.5, pipY + 0.5, 3, 3);
  }
}

type GlyphFn = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

const glyphDot: GlyphFn = (ctx, cx, cy, s) => {
  circle(ctx, cx, cy, s * 0.5);
  ctx.fill();
};

const TOWER_GLYPHS: Partial<Record<string, GlyphFn>> = {
  // Barrel with a muzzle.
  pellet: (ctx, cx, cy, s) => {
    ctx.fillRect(cx - s * 0.8, cy - s * 0.25, s * 1.6, s * 0.5);
    circle(ctx, cx - s * 0.8, cy, s * 0.5);
    ctx.fill();
  },
  // Water drop.
  squirt: (ctx, cx, cy, s) => {
    circle(ctx, cx, cy + s * 0.3, s * 0.6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.5, cy + s * 0.3);
    ctx.lineTo(cx - s * 0.5, cy + s * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  // Arrowhead.
  dart: (ctx, cx, cy, s) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.8, cy + s * 0.8);
    ctx.lineTo(cx - s * 0.8, cy + s * 0.8);
    ctx.closePath();
    ctx.fill();
  },
  // Open jaw.
  snap: (ctx, cx, cy, s) => {
    ctx.lineWidth = s * 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.7, Math.PI * 0.2, Math.PI * 1.8);
    ctx.stroke();
  },
  // Three bugs in a cluster.
  swarm: (ctx, cx, cy, s) => {
    circle(ctx, cx - s * 0.4, cy - s * 0.3, s * 0.35);
    ctx.fill();
    circle(ctx, cx + s * 0.4, cy - s * 0.3, s * 0.35);
    ctx.fill();
    circle(ctx, cx, cy + s * 0.45, s * 0.35);
    ctx.fill();
  },
  // Three-armed snowflake.
  frost: (ctx, cx, cy, s) => {
    ctx.lineWidth = Math.max(2, s * 0.2);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const dx = Math.cos(a) * s;
      const dy = Math.sin(a) * s;
      ctx.moveTo(cx + dx, cy + dy);
      ctx.lineTo(cx - dx, cy - dy);
    }
    ctx.stroke();
    ctx.lineCap = "butt";
  },
  // Hammer.
  bash: (ctx, cx, cy, s) => {
    ctx.fillRect(cx - s * 0.9, cy - s * 0.8, s * 1.8, s * 0.7);
    ctx.fillRect(cx - s * 0.18, cy - s * 0.1, s * 0.36, s * 0.95);
  },
};

function drawRange(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  range: number,
  stroke: string,
  fill?: string,
): void {
  circle(ctx, px(cx), px(cy), px(range));
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Top-left cell of a tower footprint centred on the cursor cell. */
export function footprintOrigin(cursor: Cell): Cell {
  return { x: cursor.x - Math.floor(FOOTPRINT / 2), y: cursor.y - Math.floor(FOOTPRINT / 2) };
}

function drawGhost(ctx: CanvasRenderingContext2D, game: Game, hover: Cell, type: TowerType): void {
  const { x: ox, y: oy } = footprintOrigin(hover);
  const ok = game.buildError(type.id, ox, oy) === null;
  const size = px(FOOTPRINT);

  ctx.globalAlpha = 0.6;
  drawTowerBody(ctx, type, ox, oy, 0, false);
  ctx.globalAlpha = 1;
  ctx.fillStyle = ok ? theme.field.okFill : theme.field.badFill;
  ctx.fillRect(px(ox), px(oy), size, size);
  drawRange(
    ctx,
    ox + FOOTPRINT / 2,
    oy + FOOTPRINT / 2,
    type.levels[0].range,
    ok ? theme.field.okStroke : theme.field.badStroke,
    ok ? theme.field.okFill : theme.field.badFill,
  );
}

/** Regular polygon centred on (x, y), with its first vertex at angle `rot`. */
function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides;
    const vx = x + Math.cos(a) * r;
    const vy = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
}

type Shape = "square" | "diamond" | "triangle" | "hexagon" | "octagon" | "circle";

/** Each creep id gets its own silhouette so waves read at a glance. */
const CREEP_SHAPES: Partial<Record<string, Shape>> = {
  normal: "square",
  fast: "diamond",
  splitter: "hexagon",
  armored: "octagon",
  immune: "circle",
  boss: "octagon",
};

function tracePath(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number): void {
  switch (shape) {
    case "circle":
      circle(ctx, x, y, r);
      return;
    case "square":
      polygon(ctx, x, y, r, 4, Math.PI / 4);
      return;
    case "diamond":
      polygon(ctx, x, y, r, 4, 0);
      return;
    case "triangle":
      polygon(ctx, x, y, r, 3, -Math.PI / 2);
      return;
    case "hexagon":
      polygon(ctx, x, y, r, 6, 0);
      return;
    case "octagon":
      polygon(ctx, x, y, r, 8, Math.PI / 8);
      return;
  }
}

function drawCreep(ctx: CanvasRenderingContext2D, c: Creep): void {
  const x = px(c.x);
  const y = px(c.y);
  const r = px(c.type.radius);

  // Flyers cast a shadow on the ground beneath them.
  if (c.type.air) {
    tracePath(ctx, "triangle", x + 4, y + 6, r);
    ctx.fillStyle = theme.field.shadow;
    ctx.fill();
  }

  const shape: Shape = c.type.air ? "triangle" : (CREEP_SHAPES[c.type.id] ?? "square");
  tracePath(ctx, shape, x, y, r);
  ctx.fillStyle = c.type.color;
  ctx.fill();

  ctx.strokeStyle = shade(c.type.color, -0.6);
  ctx.lineWidth = c.type.boss || c.type.armor > 0 ? 3 : 2;
  if (c.type.immune) ctx.setLineDash([3, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (c.type.boss) {
    // Crown marks the boss apart from the other octagons.
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.75);
    ctx.lineTo(x - r * 0.3, y - r * 1.35);
    ctx.lineTo(x, y - r * 0.9);
    ctx.lineTo(x + r * 0.3, y - r * 1.35);
    ctx.lineTo(x + r * 0.55, y - r * 0.75);
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (c.slowTimer > 0) {
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2;
    circle(ctx, x, y, r + 3);
    ctx.stroke();
  }
  if (c.stunTimer > 0) {
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    circle(ctx, x, y, r + 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (c.hp < c.maxHp) {
    const w = px(0.7);
    const ratio = Math.max(0, c.hp / c.maxHp);
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.fillRect(x - w / 2, y - r - 7, w, 3);
    ctx.fillStyle = ratio > 0.5 ? "#16a34a" : ratio > 0.25 ? "#eab308" : "#dc2626";
    ctx.fillRect(x - w / 2, y - r - 7, w * ratio, 3);
  }
}

function drawEffect(ctx: CanvasRenderingContext2D, e: Effect): void {
  const alpha = Math.max(0, e.ttl / e.maxTtl);
  ctx.globalAlpha = alpha;

  if (e.kind === "line") {
    // A shot is a short tracer with a bullet head that travels from tower to target.
    const p = 1 - alpha;
    const tail = Math.max(0, p - 0.35);
    const sx = px(e.x1);
    const sy = px(e.y1);
    const ex = px(e.x2);
    const ey = px(e.y2);
    const hx = sx + (ex - sx) * p;
    const hy = sy + (ey - sy) * p;
    const tx = sx + (ex - sx) * tail;
    const ty = sy + (ey - sy) * tail;

    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.lineCap = "butt";

    circle(ctx, hx, hy, 3.5);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Splash and death bursts: a translucent fill that grows as it fades.
    const r = px(e.radius) * (1.5 - alpha * 0.5);
    circle(ctx, px(e.x1), px(e.y1), r);
    ctx.globalAlpha = alpha * 0.25;
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = shade(e.color, -0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
