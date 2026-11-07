/**
 * Server-side answer checking. The correct option never leaves the server
 * until the player has submitted an answer for that challenge.
 */
import { scoreAnswer } from "./scoring";
import type { AnswerFeedback, Challenge } from "./content/types";

export class InvalidAnswerError extends Error {}

export function checkAnswer(
  challenge: Challenge,
  selectedOptionId: unknown,
  cluesRevealed: unknown,
): AnswerFeedback {
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
