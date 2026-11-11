import { describe, expect, it, beforeEach } from "vitest";
import {
  addDays, dateKeyInZone, daysBetween, isDateKey, msUntilNextDay, sessionNumber,
} from "@/lib/dates";
import { scoreAnswer, resultSquare, MAX_DAILY_SCORE } from "@/lib/scoring";
import { pickDaily } from "@/lib/selection";
import { CHALLENGES as DEMO_CHALLENGES } from "@/lib/content/challenges";
import { toPublic } from "@/lib/content/repository";
import { checkAnswer, InvalidAnswerError } from "@/lib/answer";
import { currentStreak, longestStreak, summarise, type History, type SavedDay } from "@/lib/stats";
import { buildShareText } from "@/lib/share";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

const day = (n: number, correct = true): SavedDay => ({
  sessionNumber: n,
  completed: true,
  answers: [{ challengeId: `c${n}`, type: "headline", category: "gender", selectedOptionId: "a", correct, score: correct ? 100 : 0, cluesRevealed: 1 }],
});

describe("dates / timezone", () => {
  it("uses the publication timezone, not UTC", () => {
    // 2026-11-05 01:30 UTC is still 4 Nov 22:30 in São Paulo (UTC-3)
    const instant = new Date("2026-11-05T01:30:00Z");
    expect(dateKeyInZone(instant, "America/Sao_Paulo")).toBe("2026-11-04");
    expect(dateKeyInZone(instant, "UTC")).toBe("2026-11-05");
  });
  it("flips exactly at local midnight", () => {
    expect(dateKeyInZone(new Date("2026-11-05T02:59:59Z"), "America/Sao_Paulo")).toBe("2026-11-04");
    expect(dateKeyInZone(new Date("2026-11-05T03:00:00Z"), "America/Sao_Paulo")).toBe("2026-11-05");
  });
  it("counts days and session numbers", () => {
    expect(daysBetween("2026-11-04", "2026-11-06")).toBe(2);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(sessionNumber("2026-11-04", "2026-11-04")).toBe(1);
    expect(sessionNumber("2026-11-14", "2026-11-04")).toBe(11);
    expect(sessionNumber("2026-10-01", "2026-11-04")).toBe(1);
  });
  it("validates date keys", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-11-04")).toBe(true);
    expect(isDateKey("nope")).toBe(false);
  });
  it("computes the countdown to the next local midnight", () => {
    const ms = msUntilNextDay(new Date("2026-11-05T02:00:00Z"), "America/Sao_Paulo");
    expect(Math.abs(ms - 3_600_000)).toBeLessThan(2000);
  });
});

describe("scoring", () => {
  it("scores simple challenges", () => {
    expect(scoreAnswer("headline", true)).toBe(100);
    expect(scoreAnswer("real_or_fake", false)).toBe(0);
  });
  it("scores Who Am I by clues revealed", () => {
    expect(scoreAnswer("who_am_i", true, 1)).toBe(100);
    expect(scoreAnswer("who_am_i", true, 2)).toBe(75);
    expect(scoreAnswer("who_am_i", true, 3)).toBe(50);
    expect(scoreAnswer("who_am_i", false, 1)).toBe(0);
  });
  it("clamps nonsense clue counts", () => {
    expect(scoreAnswer("who_am_i", true, 99)).toBe(50);
    expect(scoreAnswer("who_am_i", true, -5)).toBe(100);
  });
  it("max daily is 500 and squares map to scores", () => {
    expect(MAX_DAILY_SCORE).toBe(500);
    expect(resultSquare(100)).toBe("🟩");
    expect(resultSquare(50)).toBe("🟨");
    expect(resultSquare(0)).toBe("🟥");
  });
});

describe("daily selection", () => {
  it("is deterministic: same date → same challenges", () => {
    const a = pickDaily(DEMO_CHALLENGES, "2026-11-10").map((c) => c.id);
    const b = pickDaily(DEMO_CHALLENGES, "2026-11-10").map((c) => c.id);
    expect(a).toEqual(b);
  });
  it("always returns one of each type, in order", () => {
    for (let i = 0; i < 60; i++) {
      const s = pickDaily(DEMO_CHALLENGES, addDays("2026-11-04", i));
      const date = addDays("2026-11-04", i);
      const three = ["headline", "real_or_fake", "who_am_i"];
      expect(s.map((c) => c.type)).toEqual(date < "2026-11-11" ? three : [...three, "rights", "timeline"]);
    }
  });
  it("rarely puts the same category in all three slots", () => {
    let allSame = 0;
    for (let i = 0; i < 60; i++) {
      const s = pickDaily(DEMO_CHALLENGES, addDays("2026-11-04", i));
      if (new Set(s.map((c) => c.category)).size === 1) allSame++;
    }
    expect(allSame).toBe(0);
  });
  it("never picks unverified content", () => {
    const pool = DEMO_CHALLENGES.map((c) => (c.type === "who_am_i" ? { ...c, verification: "needs_review" as const } : c));
    expect(() => pickDaily(pool, "2026-11-04")).toThrow();
  });
});

describe("content integrity", () => {
  it("every challenge has exactly one correct option (timeline: none, it is an ordering)", () => {
    for (const c of DEMO_CHALLENGES) {
      expect(c.options.filter((o) => o.isCorrect), c.id).toHaveLength(c.type === "timeline" ? 0 : 1);
    }
  });
  it("timeline challenges have four distinct years and are not stored in order", () => {
    for (const c of DEMO_CHALLENGES.filter((x) => x.type === "timeline")) {
      const years = c.options.map((o) => o.year);
      expect(years.every((y) => Number.isInteger(y)), c.id).toBe(true);
      expect(new Set(years).size, c.id).toBe(4);
      const asc = [...years].sort((a, b) => a! - b!);
      const desc = [...asc].reverse();
      expect(years, c.id).not.toEqual(asc);
      expect(years, c.id).not.toEqual(desc);
    }
  });
  it("option counts and clue counts match the format", () => {
    for (const c of DEMO_CHALLENGES) {
      expect(c.options.length, c.id).toBe(c.type === "real_or_fake" ? 2 : 4);
      if (c.type === "who_am_i") expect(c.clues, c.id).toHaveLength(3);
    }
  });
  it("every published challenge has at least two valid https sources", () => {
    for (const c of DEMO_CHALLENGES) {
      expect(c.sources.length, c.id).toBeGreaterThanOrEqual(2);
      for (const s of c.sources) expect(s.url, c.id).toMatch(/^https:\/\//);
    }
  });
  it("ids are unique", () => {
    const ids = DEMO_CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("the public shape never leaks answers", () => {
    for (const c of DEMO_CHALLENGES) {
      const pub = toPublic(c) as unknown as Record<string, unknown>;
      expect(Object.keys(pub)).not.toContain("explanation");
      expect(Object.keys(pub)).not.toContain("sources");
      expect(Object.keys(pub)).not.toContain("context");
      for (const o of pub.options as Record<string, unknown>[]) {
        expect(Object.keys(o).sort()).toEqual(["id", "text"]);
      }
    }
  });
});

describe("answer validation", () => {
  const headline = DEMO_CHALLENGES.find((c) => c.id === "demo-h-01")!;
  const who = DEMO_CHALLENGES.find((c) => c.id === "demo-w-03")!;
  const right = (c: typeof headline) => c.options.find((o) => o.isCorrect)!;
  const wrong = (c: typeof headline) => c.options.find((o) => !o.isCorrect)!;
  it("accepts the right answer", () => {
    const fb = checkAnswer(headline, right(headline).id, undefined);
    expect(fb.correct).toBe(true);
    expect(fb.score).toBe(100);
    expect(fb.correctText).toBe(right(headline).text);
  });
  it("rejects wrong answer with 0", () => {
    expect(checkAnswer(headline, wrong(headline).id, undefined).score).toBe(0);
  });
  it("Who Am I score depends on clues", () => {
    expect(checkAnswer(who, right(who).id, 2).score).toBe(75);
  });
  it("rejects invalid input", () => {
    expect(() => checkAnswer(headline, "zzz", undefined)).toThrow(InvalidAnswerError);
    expect(() => checkAnswer(headline, 5, undefined)).toThrow(InvalidAnswerError);
    expect(() => checkAnswer(who, right(who).id, 7)).toThrow(InvalidAnswerError);
  });
});

describe("streaks and stats", () => {
  it("counts consecutive days ending today", () => {
    const h: History = { "2026-11-02": day(1), "2026-11-03": day(2), "2026-11-04": day(3) };
    expect(currentStreak(h, "2026-11-04")).toBe(3);
  });
  it("keeps the streak alive if today is not played yet", () => {
    const h: History = { "2026-11-02": day(1), "2026-11-03": day(2) };
    expect(currentStreak(h, "2026-11-04")).toBe(2);
  });
  it("breaks after a missed day", () => {
    const h: History = { "2026-11-01": day(1), "2026-11-03": day(2) };
    expect(currentStreak(h, "2026-11-04")).toBe(1);
    expect(currentStreak(h, "2026-11-06")).toBe(0);
  });
  it("ignores unfinished days", () => {
    const h: History = { "2026-11-03": { ...day(1), completed: false } };
    expect(currentStreak(h, "2026-11-03")).toBe(0);
  });
  it("computes the longest streak", () => {
    const h: History = {
      "2026-11-01": day(1), "2026-11-02": day(2), "2026-11-03": day(3),
      "2026-11-10": day(4), "2026-11-11": day(5),
    };
    expect(longestStreak(h)).toBe(3);
  });
  it("summarises accuracy", () => {
    const h: History = { "2026-11-01": day(1, true), "2026-11-02": day(2, false) };
    const s = summarise(h, "2026-11-02");
    expect(s.accuracy).toBe(0.5);
    expect(s.averageScore).toBe(50);
  });
});

describe("share text", () => {
  it("contains squares and totals but no question text", () => {
    const text = buildShareText({ sessionNumber: 42, scores: [100, 100, 100], streak: 12 });
    expect(text).toContain("WOKLE #042");
    expect(text).toContain("🟩🟩🟩");
    expect(text).toContain("300/300");
    expect(text).toContain("🔥 12 DAY STREAK");
  });
  it("shows partial results", () => {
    const text = buildShareText({ sessionNumber: 1, scores: [100, 0, 75], streak: 0 });
    expect(text).toContain("🟩🟥🟨");
    expect(text).toContain("175/300");
    expect(text).not.toContain("STREAK");
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());
  it("blocks after the limit and recovers after the window", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, 10).ok).toBe(false);
    expect(rateLimit("k", 3, 1000, 1500).ok).toBe(true);
  });
});
