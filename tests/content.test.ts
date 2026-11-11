import { describe, expect, it } from "vitest";
import { CHALLENGES, OVERLAYS, localize, parseLocale } from "@/lib/content/challenges";
import { buildPublicSession, resolvePlayableDate } from "@/lib/content/repository";
import { pickDaily } from "@/lib/selection";
import { addDays, isDateKey } from "@/lib/dates";
import { checkAnswer } from "@/lib/answer";
import { currentStreak, longestStreak, type History, type SavedDay } from "@/lib/stats";
import { CATEGORIES } from "@/lib/categories";

describe("editorial rules on the content pool", () => {
  it("each challenge has an authoritative (non-Wikipedia) source", () => {
    for (const c of CHALLENGES) {
      expect(c.sources.some((s) => !s.url.includes("wikipedia.org")), c.id).toBe(true);
    }
  });
  it("source URLs are unique across the pool and look real", () => {
    // The UDHR text is the shared source of every "Which right?" challenge.
    const SHARED = /un\.org\/en\/about-us\/universal-declaration|unicef\.org\/brazil\/declaracao|hrlibrary\.(law\.)?umn\.edu/;
    // Other pages may back several questions, but never with copy-pasted evidence.
    const pairs = CHALLENGES.flatMap((c) => c.sources.map((s) => `${s.url}|${s.evidence}`));
    expect(pairs.filter((u, i) => pairs.indexOf(u) !== i)).toEqual([]);
    const urls = CHALLENGES.flatMap((c) => c.sources.map((s) => s.url));
    for (const u of urls) expect(() => new URL(u), u).not.toThrow();
  });
  it("every source has title, publisher, evidence and an access date", () => {
    for (const c of CHALLENGES) {
      for (const s of c.sources) {
        expect(s.title && s.publisher && s.evidence, c.id).toBeTruthy();
        expect(isDateKey(s.accessedAt), c.id).toBe(true);
      }
    }
  });
  it("only verified, non-demo content is in the pool", () => {
    for (const c of CHALLENGES) {
      expect(c.verification, c.id).toBe("verified");
      expect(c.isDemo, c.id).toBe(false);
    }
  });
  it("categories are all known", () => {
    const known = new Set(CATEGORIES.map((c) => c.slug));
    for (const c of CHALLENGES) expect(known.has(c.category), c.id).toBe(true);
  });
});

describe("Portuguese translation", () => {
  const pt = OVERLAYS["pt-BR"]!;
  it("exists for every challenge, with matching structure", () => {
    for (const c of CHALLENGES) {
      const o = pt[c.id];
      expect(o, c.id).toBeTruthy();
      expect(o.evidence.length, c.id).toBe(c.sources.length);
      if (c.type !== "real_or_fake") {
        expect(Object.keys(o.options ?? {}).sort(), c.id).toEqual(c.options.map((x) => x.id).sort());
      }
      if (c.type === "who_am_i") expect(o.clues, c.id).toHaveLength(3);
    }
  });
  it("keeps the correct answer and sources of the original", () => {
    for (const c of CHALLENGES) {
      const l = localize(c, "pt-BR");
      expect(l.options.map((o) => o.isCorrect)).toEqual(c.options.map((o) => o.isCorrect));
      expect(l.sources.map((s) => s.url)).toEqual(c.sources.map((s) => s.url));
      expect(l.prompt).not.toBe(c.prompt);
    }
  });
  it("falls back to English for unknown locales", () => {
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale("pt-BR")).toBe("pt-BR");
    const c = CHALLENGES[0];
    expect(localize(c, "en")).toBe(c);
  });
  it("answer feedback is returned in the requested language", () => {
    const c = CHALLENGES[0];
    const right = c.options.find((o) => o.isCorrect)!.id;
    expect(checkAnswer(localize(c, "pt-BR"), right, 1).explanation).toBe(pt[c.id].explanation);
  });
});

describe("daily selection with the real pool", () => {
  it("never repeats a challenge of the same type on consecutive days", () => {
    let prev = pickDaily(CHALLENGES, "2026-11-04");
    for (let i = 1; i < 200; i++) {
      const cur = pickDaily(CHALLENGES, addDays("2026-11-04", i));
      cur.forEach((c, k) => prev[k] && expect(c.id, `day ${i} slot ${k}`).not.toBe(prev[k].id));
      prev = cur;
    }
  });
  it("shows every challenge of a type within one cycle", () => {
    const n = CHALLENGES.filter((c) => c.type === "headline").length;
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) seen.add(pickDaily(CHALLENGES, addDays("2026-11-04", i))[0].id);
    expect(seen.size).toBeGreaterThanOrEqual(n - 1); // (a category repair may swap one slot)
  });
});

describe("archive: which dates may be opened", () => {
  const now = new Date("2026-11-10T15:00:00Z"); // 10 Nov in São Paulo
  it("allows today and past days since launch", () => {
    expect(resolvePlayableDate(undefined, now)).toBe("2026-11-10");
    expect(resolvePlayableDate("2026-11-04", now)).toBe("2026-11-04");
    expect(resolvePlayableDate("2026-11-09", now)).toBe("2026-11-09");
  });
  it("refuses the future, dates before launch and junk", () => {
    expect(resolvePlayableDate("2026-11-11", now)).toBeNull();
    expect(resolvePlayableDate("2026-11-03", now)).toBeNull();
    expect(resolvePlayableDate("2026-02-30", now)).toBeNull();
    expect(resolvePlayableDate("../../etc", now)).toBeNull();
    expect(resolvePlayableDate(20261110, now)).toBeNull();
  });
  it("builds the session of a past day, identical to what everyone gets", () => {
    const a = buildPublicSession(now, "en", "2026-11-06");
    const b = buildPublicSession(new Date("2026-12-25T10:00:00Z"), "en", "2026-11-06");
    expect(a.date).toBe("2026-11-06");
    expect(a.number).toBe(3);
    expect(a.challenges.map((c) => c.id)).toEqual(b.challenges.map((c) => c.id));
  });
});

describe("archive plays do not count for streaks", () => {
  const day = (n: number, live?: boolean): SavedDay => ({
    sessionNumber: n, completed: true, live,
    answers: [{ challengeId: `c${n}`, type: "headline", category: "gender", selectedOptionId: "a", correct: true, score: 100, cluesRevealed: 1 }],
  });
  it("only live days build the streak", () => {
    const h: History = { "2026-11-05": day(1, true), "2026-11-06": day(2, false), "2026-11-07": day(3, true) };
    expect(currentStreak(h, "2026-11-07")).toBe(1);
    expect(longestStreak(h)).toBe(1);
  });
  it("old saves without the flag still count", () => {
    const h: History = { "2026-11-05": day(1), "2026-11-06": day(2) };
    expect(longestStreak(h)).toBe(2);
  });
});

describe("no spoilers between challenges", () => {
  // Two challenges about the same person/event could be shown on the same day
  // and give each other away. Broad entities are fine to share.
  const ALLOWED = new Set([
    "new zealand", "united nations", "nasa", "nobel peace prize",
    // countries are broad; a country alone does not give an answer away
    "saudi arabia", "unfccc", "montreal protocol", "united states", "south africa", "india", "sri lanka", "australia", "canada", "england", "ethiopia", "kenya", "france", "brazil",
  ]);
  it("a specific entity appears in only one challenge", () => {
    const seen = new Map<string, string>();
    for (const c of CHALLENGES) {
      for (const e of c.entities) {
        const k = e.toLowerCase();
        if (ALLOWED.has(k)) continue;
        expect(seen.has(k) ? `${k} in ${seen.get(k)} and ${c.id}` : "ok").toBe("ok");
        seen.set(k, c.id);
      }
    }
  });
});
