/**
 * Content access layer. The rest of the app only talks to this file, so
 * Phase 2 can swap the JSON pool for Supabase without touching the UI/API.
 */
import {
  DEFAULT_LAUNCH_DATE,
  DEFAULT_TIMEZONE,
  dateKeyInZone,
  isDateKey,
  sessionNumber,
} from "../dates";
import { pickDaily } from "../selection";
import { CHALLENGES, localize } from "./challenges";
import type {
  Challenge,
  Locale,
  PublicChallenge,
  PublicSession,
} from "./types";

export interface ContentRepository {
  getSession(dateKey: string): { number: number; challenges: Challenge[] };
  getChallenge(id: string): Challenge | undefined;
}

class StaticRepository implements ContentRepository {
  constructor(private readonly pool: Challenge[], private readonly launch: string) {}

  getSession(dateKey: string) {
    return {
      number: sessionNumber(dateKey, this.launch),
      challenges: pickDaily(this.pool, dateKey, this.launch),
    };
  }

  getChallenge(id: string) {
    return this.pool.find((c) => c.id === id);
  }
}

export function config() {
  return {
    timezone: process.env.WOKLE_TIMEZONE || DEFAULT_TIMEZONE,
    launchDate: process.env.WOKLE_LAUNCH_DATE || DEFAULT_LAUNCH_DATE,
  };
}

export function getRepository(): ContentRepository {
  // Phase 2: if SUPABASE env vars are set, return a SupabaseRepository here.
  return new StaticRepository(CHALLENGES, config().launchDate);
}

/** Strips every answer-bearing field. This is the ONLY shape sent to browsers. */
export function toPublic(c: Challenge): PublicChallenge {
  return {
    id: c.id,
    type: c.type,
    category: c.category,
    prompt: c.prompt,
    clues: c.clues,
    options: c.options.map(({ id, text }) => ({ id, text })),
    isDemo: c.isDemo,
  };
}

/**
 * Which date may the player open? Today or any past day since launch (the
 * archive). Future dates are refused, so tomorrow's questions can't be peeked.
 * Returns null for an invalid / not-allowed date.
 */
export function resolvePlayableDate(param: unknown, now: Date = new Date()): string | null {
  const { timezone, launchDate } = config();
  const today = dateKeyInZone(now, timezone);
  if (param === undefined || param === null || param === "") return today;
  if (!isDateKey(param)) return null;
  if (param > today || param < launchDate) return null;
  return param;
}

export function buildPublicSession(
  now: Date = new Date(),
  locale: Locale = "en",
  forDate?: string,
): PublicSession {
  const { timezone } = config();
  const date = forDate ?? dateKeyInZone(now, timezone);
  const session = getRepository().getSession(date);
  return {
    date,
    number: session.number,
    timezone,
    challenges: session.challenges.map((c) => toPublic(localize(c, locale))),
  };
}

/** True if `challengeId` belongs to the session of `dateKey`. */
export function isInSession(dateKey: string, challengeId: string): boolean {
  return getRepository()
    .getSession(dateKey)
    .challenges.some((c) => c.id === challengeId);
}
