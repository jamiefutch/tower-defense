/** Short-lived visual effect. Purely cosmetic: it never affects game state. */
export interface Effect {
  kind: "line" | "ring";
  /** For "line": start point. For "ring": center (x1, y1). */
  x1: number;
  y1: number;
  /** For "line": end point. Unused for rings. */
  x2: number;
  y2: number;
  /** For "ring": radius in cells. */
  radius: number;
  color: string;
  ttl: number;
  maxTtl: number;
}

export function lineFx(x1: number, y1: number, x2: number, y2: number, color: string, ttl = 0.12): Effect {
  return { kind: "line", x1, y1, x2, y2, radius: 0, color, ttl, maxTtl: ttl };
}

export function ringFx(x: number, y: number, radius: number, color: string, ttl = 0.35): Effect {
  return { kind: "ring", x1: x, y1: y, x2: x, y2: y, radius, color, ttl, maxTtl: ttl };
}

/** Ages effects in place and drops the expired ones. */
export function tickEffects(list: Effect[], dt: number): void {
  let w = 0;
  for (const e of list) {
    e.ttl -= dt;
    if (e.ttl > 0) list[w++] = e;
  }
  list.length = w;
}
