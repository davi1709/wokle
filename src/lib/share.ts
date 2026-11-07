import { resultSquare, MAX_DAILY_SCORE } from "./scoring";

export interface ShareStrings {
  streak: string;
  survived: string;
  took: string;
  canYou: string;
}

const EN: ShareStrings = {
  streak: "DAY STREAK",
  survived: "I survived today’s WOKLE.",
  took: "I took on today’s WOKLE.",
  canYou: "Can you?",
};

/**
 * Builds the shareable result. It only contains squares and totals, never
 * questions or answers, so it spoils nothing for people who haven't played.
 */
export function buildShareText(opts: {
  sessionNumber: number;
  scores: number[];
  streak: number;
  url?: string;
  strings?: ShareStrings;
}): string {
  const s = opts.strings ?? EN;
  const squares = opts.scores.map(resultSquare).join("");
  const total = opts.scores.reduce((a, b) => a + b, 0);
  const num = String(opts.sessionNumber).padStart(3, "0");
  const lines = [
    `WOKLE #${num}`,
    squares,
    `${total}/${MAX_DAILY_SCORE}`,
    ...(opts.streak > 0 ? [`🔥 ${opts.streak} ${s.streak}`] : []),
    "",
    total === MAX_DAILY_SCORE ? s.survived : s.took,
    s.canYou,
  ];
  if (opts.url) lines.push(opts.url);
  return lines.join("\n");
}
