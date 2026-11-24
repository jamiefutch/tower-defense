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

const THEME_KEY = "tower-defense.theme";

/** The saved colour theme id, or null if none is stored. Callers validate it against the theme table. */
export function loadThemeId(): string | null {
  try {
    return window.localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveThemeId(id: string): void {
  try {
    window.localStorage.setItem(THEME_KEY, id);
  } catch {
    // Storage can be disabled. The theme just won't be remembered.
  }
}
