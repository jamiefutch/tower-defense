import { CELL_PX, FOOTPRINT } from "../core/config";
import type { Game } from "../core/game";
import type { TowerType } from "../data/towers";
import type { Creep } from "../entities/creep";
import type { Effect } from "../entities/effects";
import { towerCenter, towerLevel, type Tower } from "../entities/tower";
import type { Cell } from "../grid/grid";

/** Per-frame UI state the renderer needs: what the cursor is doing and what is selected. */
export interface ViewState {
  hover: Cell | null;
  /** Tower type being placed, if the player has one selected. */
  ghost: TowerType | null;
  selected: Tower | null;
  showRoute: boolean;
}

const px = (cells: number): number => cells * CELL_PX;

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function render(ctx: CanvasRenderingContext2D, game: Game, view: ViewState): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  drawGround(ctx, game);
  if (view.showRoute) drawRoute(ctx, game.route);
  drawMarkers(ctx, game);

  for (const t of game.towers) drawTower(ctx, t, t === view.selected);
  if (view.selected) {
    const c = towerCenter(view.selected);
    drawRange(ctx, c.x, c.y, towerLevel(view.selected).range, "rgba(255,255,255,0.7)");
  }
  if (view.hover && view.ghost) drawGhost(ctx, game, view.hover, view.ghost);

  for (const c of game.creeps) if (c.status === "alive" && !c.type.air) drawCreep(ctx, c);
  for (const c of game.creeps) if (c.status === "alive" && c.type.air) drawCreep(ctx, c);

  for (const e of game.effects) drawEffect(ctx, e);
}

function drawGround(ctx: CanvasRenderingContext2D, game: Game): void {
  for (let y = 0; y < game.grid.height; y++) {
    for (let x = 0; x < game.grid.width; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#2f4a2c" : "#34532f";
      ctx.fillRect(px(x), px(y), CELL_PX, CELL_PX);
    }
  }
}

function drawRoute(ctx: CanvasRenderingContext2D, route: readonly Cell[]): void {
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 6;
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

function drawMarkers(ctx: CanvasRenderingContext2D, game: Game): void {
  const marks: [Cell, string, string][] = [
    [game.map.spawn, "#3fb950", "S"],
    [game.map.exit, "#f85149", "E"],
  ];
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [cell, color, label] of marks) {
    ctx.fillStyle = color;
    ctx.fillRect(px(cell.x) + 2, px(cell.y) + 2, CELL_PX - 4, CELL_PX - 4);
    ctx.fillStyle = "#0d1117";
    ctx.fillText(label, px(cell.x + 0.5), px(cell.y + 0.5));
  }
}

function drawTower(ctx: CanvasRenderingContext2D, t: Tower, selected: boolean): void {
  const size = px(FOOTPRINT) - 6;
  const x = px(t.x) + 3;
  const y = px(t.y) + 3;
  ctx.fillStyle = "#3a3f47";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = selected ? "#ffffff" : "#111418";
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeRect(x, y, size, size);

  const c = towerCenter(t);
  ctx.fillStyle = t.type.color;
  circle(ctx, px(c.x), px(c.y), size * 0.28);
  ctx.fill();

  // One pip per upgrade level along the bottom edge.
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i <= t.level; i++) {
    ctx.fillRect(x + 6 + i * 7, y + size - 8, 4, 4);
  }
}

function drawRange(ctx: CanvasRenderingContext2D, cx: number, cy: number, range: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  circle(ctx, px(cx), px(cy), px(range));
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
  ctx.fillStyle = ok ? "rgba(74,222,128,0.35)" : "rgba(248,81,73,0.35)";
  ctx.fillRect(px(ox), px(oy), size, size);
  drawRange(ctx, ox + FOOTPRINT / 2, oy + FOOTPRINT / 2, type.levels[0].range, ok ? "rgba(74,222,128,0.8)" : "rgba(248,81,73,0.8)");
}

function drawCreep(ctx: CanvasRenderingContext2D, c: Creep): void {
  const x = px(c.x);
  const y = px(c.y);
  const r = px(c.type.radius);

  if (c.type.air) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    circle(ctx, x + 5, y + 7, r);
    ctx.fill();
  }

  ctx.fillStyle = c.type.color;
  circle(ctx, x, y, r);
  ctx.fill();

  if (c.type.boss) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    circle(ctx, x, y, r);
    ctx.stroke();
  }
  if (c.slowTimer > 0) {
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 2;
    circle(ctx, x, y, r + 3);
    ctx.stroke();
  }
  if (c.stunTimer > 0) {
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    circle(ctx, x, y, r + 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (c.hp < c.maxHp) {
    const w = px(0.7);
    const ratio = Math.max(0, c.hp / c.maxHp);
    ctx.fillStyle = "#000000";
    ctx.fillRect(x - w / 2, y - r - 7, w, 3);
    ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#facc15" : "#f87171";
    ctx.fillRect(x - w / 2, y - r - 7, w * ratio, 3);
  }
}

function drawEffect(ctx: CanvasRenderingContext2D, e: Effect): void {
  const alpha = Math.max(0, e.ttl / e.maxTtl);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = e.color;
  if (e.kind === "line") {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(e.x1), px(e.y1));
    ctx.lineTo(px(e.x2), px(e.y2));
    ctx.stroke();
  } else {
    // Rings grow as they fade.
    ctx.lineWidth = 2;
    circle(ctx, px(e.x1), px(e.y1), px(e.radius) * (1.5 - alpha * 0.5));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
