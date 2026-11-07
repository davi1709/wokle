/**
 * Scoring (spec §6). Pure functions → trivially testable.
 *
 *  headline / real_or_fake : correct = 100, wrong = 0
 *  who_am_i                : correct after clue 1 = 100, clue 2 = 75, clue 3 = 50
 */
import type { ChallengeType } from "./content/types";

export const MAX_DAILY_SCORE = 300;
export const WHO_AM_I_POINTS = [100, 75, 50] as const;

export function scoreAnswer(
  type: ChallengeType,
  correct: boolean,
  cluesRevealed = 1,
): number {
  if (!correct) return 0;
  if (type === "who_am_i") {
    const idx = clamp(Math.trunc(cluesRevealed), 1, 3) - 1;
    return WHO_AM_I_POINTS[idx];
  }
  return 100;
}

export function maxScoreFor(): number {
  return 100;
}

/** Colour of the result square in the share text. */
export function resultSquare(score: number): "🟩" | "🟨" | "🟥" {
  if (score >= 100) return "🟩";
  if (score > 0) return "🟨";
  return "🟥";
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
