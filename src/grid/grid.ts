export interface Cell {
  x: number;
  y: number;
}

/** Playfield of fixed-size cells. A cell is either open or blocked (by a tower). */
export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly blocked: Uint8Array;

  constructor(width = 30, height = 20) {
    this.width = width;
    this.height = height;
    this.blocked = new Uint8Array(width * height);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isBlocked(x: number, y: number): boolean {
    return this.blocked[y * this.width + x] === 1;
  }

  isOpen(x: number, y: number): boolean {
    return this.inBounds(x, y) && !this.isBlocked(x, y);
  }

  setBlocked(x: number, y: number, value: boolean): void {
    if (!this.inBounds(x, y)) throw new RangeError(`cell (${x},${y}) out of bounds`);
    this.blocked[y * this.width + x] = value ? 1 : 0;
  }

  /**
   * Blocks or unblocks a rectangular footprint (e.g. a 2x2 tower).
   * Returns false, changing nothing, if any cell in the footprint is out of bounds.
   */
  setFootprint(x: number, y: number, w: number, h: number, value: boolean): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (!this.inBounds(x + dx, y + dy)) return false;
      }
    }
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setBlocked(x + dx, y + dy, value);
      }
    }
    return true;
  }

  clone(): Grid {
    const copy = new Grid(this.width, this.height);
    copy.blocked.set(this.blocked);
    return copy;
  }
}
