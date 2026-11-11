/**
 * Server-side answer checking. The correct option (or the correct order of a
 * timeline) never leaves the server until the player has submitted an answer.
 */
import { scoreAnswer, scoreTimeline } from "./scoring";
import type { AnswerFeedback, Challenge } from "./content/types";

export class InvalidAnswerError extends Error {}

export function checkAnswer(
  challenge: Challenge,
  selectedOptionId: unknown,
  cluesRevealed: unknown,
  order?: unknown,
): AnswerFeedback {
  if (challenge.type === "timeline") return checkTimeline(challenge, order);

  if (typeof selectedOptionId !== "string") {
    throw new InvalidAnswerError("selectedOptionId must be a string");
  }
  const chosen = challenge.options.find((o) => o.id === selectedOptionId);
  if (!chosen) throw new InvalidAnswerError("Unknown option for this challenge");

  let clues = 1;
  if (challenge.type === "who_am_i") {
    const n = typeof cluesRevealed === "number" ? cluesRevealed : 1;
    if (!Number.isInteger(n) || n < 1 || n > (challenge.clues?.length ?? 3)) {
      throw new InvalidAnswerError("cluesRevealed out of range");
    }
    clues = n;
  }

  const correctOption = challenge.options.find((o) => o.isCorrect)!;
  const score = scoreAnswer(challenge.type, chosen.isCorrect, clues);

  return {
    challengeId: challenge.id,
    correct: chosen.isCorrect,
    score,
    maxScore: 100,
    correctOptionId: correctOption.id,
    correctText: correctOption.text,
    explanation: challenge.explanation,
    context: challenge.context,
    sources: challenge.sources,
  };
}

function checkTimeline(challenge: Challenge, order: unknown): AnswerFeedback {
  const ids = challenge.options.map((o) => o.id);
  if (
    !Array.isArray(order) ||
    order.length !== ids.length ||
    order.some((x) => typeof x !== "string") ||
    new Set(order).size !== ids.length ||
    order.some((x) => !ids.includes(x as string))
  ) {
    throw new InvalidAnswerError("order must list every event id exactly once");
  }

  const chronological = [...challenge.options].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const rank = new Map(chronological.map((o, i) => [o.id, i]));

  let right = 0;
  let total = 0;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      total += 1;
      if (rank.get(order[i] as string)! < rank.get(order[j] as string)!) right += 1;
    }
  }

  return {
    challengeId: challenge.id,
    correct: right === total,
    score: scoreTimeline(right, total),
    maxScore: 100,
    correctOptionId: "",
    correctText: chronological.map((o) => `${o.yearLabel ?? o.year}: ${o.text}`).join(" → "),
    explanation: challenge.explanation,
    context: challenge.context,
    sources: challenge.sources,
    correctOrder: chronological.map((o) => ({ id: o.id, text: o.text, yearLabel: o.yearLabel ?? String(o.year) })),
    pairsCorrect: right,
  };
}
