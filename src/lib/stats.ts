/**
 * Streaks and statistics. Pure functions over the saved history, so they are
 * easy to test and work the same for anonymous (localStorage) players and,
 * later, for accounts (rows in `user_attempts`).
 */
import { addDays, daysBetween } from "./dates";
import type { AnswerFeedback, ChallengeType, Locale } from "./content/types";

export interface SavedAnswer {
  challengeId: string;
  type: ChallengeType;
  /** Timeline only: the order the player chose (option ids). */
  order?: string[];
  category: string;
  selectedOptionId: string;
  correct: boolean;
  score: number;
  cluesRevealed: number;
  /** Kept so the explanation/sources can be re-read after a page reload. */
  feedback?: AnswerFeedback;
  /** Language the saved feedback is written in. */
  feedbackLang?: Locale;
}

export interface SavedDay {
  sessionNumber: number;
  answers: SavedAnswer[];
  completed: boolean;
  /**
   * True when every answer was given on the day itself. Days played later from
   * the archive count in the statistics but NOT in streaks. Missing = true
   * (data saved before the archive existed).
   */
  live?: boolean;
}

export type History = Record<string, SavedDay>;

export function completedDates(history: History): string[] {
  return Object.keys(history)
    .filter((d) => history[d].completed)
    .sort();
}

/** Days that count for streaks: finished on the day itself. */
export function streakDates(history: History): string[] {
  return Object.keys(history)
    .filter((d) => history[d].completed && history[d].live !== false)
    .sort();
}

export function dayScore(day: SavedDay): number {
  return day.answers.reduce((sum, a) => sum + a.score, 0);
}

/**
 * Current streak = consecutive completed days ending today, or ending
 * yesterday if today is not finished yet (so the streak is not shown as
 * broken while the player is still allowed to play today).
 */
export function currentStreak(history: History, today: string): number {
  const done = new Set(streakDates(history));
  let cursor = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(history: History): number {
  const dates = streakDates(history);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export interface Summary {
  sessions: number;
  challengesAnswered: number;
  correctAnswers: number;
  accuracy: number; // 0..1
  averageScore: number;
  totalScore: number;
  currentStreak: number;
  longestStreak: number;
  favouriteCategories: { category: string; correct: number; total: number }[];
  /** Chronological, for the performance chart. */
  timeline: { date: string; score: number; max: number }[];
}

export function summarise(history: History, today: string): Summary {
  const dates = completedDates(history);
  const days = dates.map((d) => history[d]);
  const answers = days.flatMap((d) => d.answers);
  const totalScore = days.reduce((s, d) => s + dayScore(d), 0);
  const correct = answers.filter((a) => a.correct).length;

  const perCategory = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const row = perCategory.get(a.category) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (a.correct) row.correct += 1;
    perCategory.set(a.category, row);
  }

  return {
    sessions: days.length,
    challengesAnswered: answers.length,
    correctAnswers: correct,
    accuracy: answers.length ? correct / answers.length : 0,
    averageScore: days.length ? totalScore / days.length : 0,
    totalScore,
    currentStreak: currentStreak(history, today),
    longestStreak: longestStreak(history),
    favouriteCategories: [...perCategory.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total || b.correct - a.correct),
    timeline: dates.map((d) => ({
      date: d,
      score: dayScore(history[d]),
      max: Math.max(100, history[d].answers.length * 100),
    })),
  };
}
