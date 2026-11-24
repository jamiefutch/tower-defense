const BEST_WAVE_KEY = "tower-defense.bestWave";

/** Highest wave number ever reached on this browser. Returns 0 if unavailable. */
export function loadBestWave(): number {
  try {
    const value = Number(window.localStorage.getItem(BEST_WAVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Stores the best wave, keeping the larger of the old and new values. */
export function saveBestWave(wave: number): number {
  const best = Math.max(loadBestWave(), wave);
  try {
    window.localStorage.setItem(BEST_WAVE_KEY, String(best));
  } catch {
    // Storage can be disabled (private mode, quota). The score just won't persist.
  }
  return best;
}
