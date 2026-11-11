/**
 * Daily selection.
 *
 * Deterministic: the same date key always yields the same three challenges,
 * for every user, with no database and no per-request randomness.
 *
 * For each challenge type the pool is shuffled with a seeded generator, one
 * shuffle per "cycle" (a cycle = pool-size days). Every challenge is shown once
 * per cycle, in an order that changes every cycle, and the first item of a new
 * cycle is never the last item of the previous one (no repeat on consecutive
 * days). If all three picks happen to share a category, the middle one is
 * swapped for the next candidate of another category.
 *
 * In Phase 2 the pipeline writes rows into `daily_sessions` ahead of time and
 * this becomes the fallback that draws from the verified reserve.
 */
import { daysBetween, DEFAULT_LAUNCH_DATE, FIVE_CHALLENGES_FROM } from "./dates";
import type { Challenge, ChallengeType } from "./content/types";

// The first three keep their original positions so answers saved before the
// two new types existed still line up with the same challenges.
export const TYPE_ORDER: ChallengeType[] = ["headline", "real_or_fake", "who_am_i", "rights", "timeline"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const r = rng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function orderFor(candidates: Challenge[], type: ChallengeType, cycle: number): Challenge[] {
  const order = shuffled(candidates, hash(`${type}:${cycle}`));
  if (order.length > 2) {
    const prevLast = shuffled(candidates, hash(`${type}:${cycle - 1}`)).at(-1)!;
    if (order[0].id === prevLast.id) [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

export function pickDaily(
  pool: Challenge[],
  dateKey: string,
  launchDate: string = DEFAULT_LAUNCH_DATE,
): Challenge[] {
  const day = daysBetween(launchDate, dateKey);

  const candidatesOf = (type: ChallengeType): Challenge[] => {
    const list = pool
      .filter(
        (c) =>
          c.type === type &&
          c.verification === "verified" &&
          (!c.availableFrom || c.availableFrom <= dateKey),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (list.length === 0) {
      throw new Error(`No verified challenges available for type "${type}"`);
    }
    return list;
  };
  /** The plain (un-repaired) pick of `type` for a given day number. */
  const rawPick = (list: Challenge[], type: ChallengeType, d: number): Challenge => {
    const n = list.length;
    return orderFor(list, type, Math.floor(d / n))[mod(d, n)];
  };

  // Days before FIVE_CHALLENGES_FROM have only the original three challenges.
  const types = dateKey < FIVE_CHALLENGES_FROM ? TYPE_ORDER.slice(0, 3) : TYPE_ORDER;
  const lists = types.map(candidatesOf);
  const picks = types.map((type, i) => rawPick(lists[i], type, day));

  // All three on the same topic? Swap the middle one for another candidate of
  // a different category, avoiding anything shown yesterday or tomorrow.
  if (new Set(picks.map((p) => p.category)).size === 1) {
    const type = types[1];
    const list = lists[1];
    const avoid = new Set([
      picks[1].id,
      rawPick(list, type, day - 1).id,
      rawPick(list, type, day + 1).id,
    ]);
    const order = orderFor(list, type, Math.floor(day / list.length));
    const alt = order.find((c) => c.category !== picks[0].category && !avoid.has(c.id));
    if (alt) picks[1] = alt;
  }
  return picks;
}
