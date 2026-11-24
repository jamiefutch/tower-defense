/** Pixel size of one grid cell on screen. */
export const CELL_PX = 32;

/** Simulation step in seconds. Game logic always advances in fixed steps of this size. */
export const FIXED_DT = 1 / 60;

/** Side length of every tower footprint, in cells. */
export const FOOTPRINT = 2;

export const START_GOLD = 60;
export const START_LIVES = 20;
export const TOTAL_WAVES = 40;

/** Seconds between waves before the next one starts automatically. */
export const AUTO_WAVE_DELAY = 20;

/** Fraction of invested gold returned when a tower is sold. */
export const SELL_RATIO = 0.7;

/** Interest earned on banked gold after each wave, and its cap. */
export const INTEREST_RATE = 0.05;
export const INTEREST_CAP = 25;

/** Flat bonus per cleared wave, plus the wave number. */
export const WAVE_CLEAR_BONUS_BASE = 5;

/** Creep HP at wave N is base HP * HP_GROWTH^(N-1). */
export const HP_GROWTH = 1.1;

/** Seconds between the start of consecutive spawn groups within a wave. */
export const GROUP_STAGGER = 2.5;
