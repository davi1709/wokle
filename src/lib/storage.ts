/**
 * Anonymous persistence in the browser (localStorage). No account needed.
 * The shape is versioned so Phase 3 can migrate it into `user_attempts` when
 * a player creates an optional account.
 */
import type { History, SavedAnswer, SavedDay } from "./stats";

const KEY = "wokle:v1";

interface Stored {
  version: 1;
  days: History;
}

function empty(): Stored {
  return { version: 1, days: {} };
}

export function loadHistory(): History {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.version !== 1 || typeof parsed.days !== "object" || !parsed.days) return {};
    return parsed.days;
  } catch {
    return {};
  }
}

function write(days: History) {
  try {
    const data: Stored = { ...empty(), days };
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full / private mode: the game still works, just not saved */
  }
}

/** Saves one answer for a day and returns the updated history. */
export function saveAnswer(
  dateKey: string,
  sessionNumber: number,
  answer: SavedAnswer,
  totalChallenges: number,
  live = true,
): History {
  const days = loadHistory();
  const day: SavedDay = days[dateKey] ?? { sessionNumber, answers: [], completed: false, live: true };
  day.live = (day.live ?? true) && live;
  // Never overwrite an answer that was already locked in (no re-rolls).
  if (!day.answers.some((a) => a.challengeId === answer.challengeId)) {
    day.answers = [...day.answers, answer];
  }
  day.completed = day.answers.length >= totalChallenges;
  days[dateKey] = day;
  write(days);
  return days;
}

export function clearHistory() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
