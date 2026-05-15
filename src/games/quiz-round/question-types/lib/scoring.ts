import type { ScoringContext } from "../types";

// Linear time-decay shared across question types: full at 0ms, down to half
// at the timer mark. Stays at half if elapsed exceeds the timer (e.g. when
// the host lets the question run past auto-close).
export function withSpeedBonus(
  basePoints: number,
  elapsedMs: number,
  config: ScoringContext,
): number {
  if (!config.speedBonus || !config.timerSecs) return basePoints;
  const timerMs = config.timerSecs * 1000;
  const ratio = 1 - elapsedMs / (timerMs * 2);
  return Math.round(basePoints * Math.max(0.5, Math.min(1, ratio)));
}
