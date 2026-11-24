import { INTEREST_CAP, INTEREST_RATE, SELL_RATIO, WAVE_CLEAR_BONUS_BASE } from "../core/config";

/** Interest paid on banked gold after a wave is cleared, capped so hoarding has diminishing returns. */
export function interestOn(gold: number): number {
  return Math.min(INTEREST_CAP, Math.floor(gold * INTEREST_RATE));
}

/** Gold returned for selling a tower that cost `invested` in total. */
export function sellRefund(invested: number): number {
  return Math.floor(invested * SELL_RATIO);
}

/** Flat reward for clearing a wave. Later waves pay more. */
export function waveClearBonus(wave: number): number {
  return WAVE_CLEAR_BONUS_BASE + wave;
}

/** Reward for calling a wave before its countdown ends: half the seconds left, rounded down. */
export function earlyCallBonus(secondsLeft: number): number {
  return Math.max(0, Math.floor(secondsLeft / 2));
}
