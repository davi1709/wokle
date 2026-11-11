/**
 * The content pool. Facts live in JSON so they can be reviewed and edited
 * without touching code:
 *
 *   data/en.json    : the factual records (question, options, sources…)
 *   data/pt-BR.json : Portuguese wording, keyed by challenge id
 *
 * Phase 2 (automation) replaces this with rows from the database.
 */
import en from "./data/en.json";
import ptBR from "./data/pt-BR.json";
import type { Challenge, Locale, Overlay } from "./types";

export const CHALLENGES = en as unknown as Challenge[];

export const OVERLAYS: Partial<Record<Locale, Record<string, Overlay>>> = {
  "pt-BR": ptBR as unknown as Record<string, Overlay>,
};

/** Returns the challenge written in `locale` (falls back to English). */
export function localize(c: Challenge, locale: Locale): Challenge {
  const o = OVERLAYS[locale]?.[c.id];
  if (!o) return c;
  return {
    ...c,
    prompt: o.prompt,
    clues: o.clues ?? c.clues,
    options: c.options.map((opt) => ({ ...opt, text: o.options?.[opt.id] ?? opt.text })),
    explanation: o.explanation,
    context: o.context,
    sources: c.sources.map((s, i) => ({ ...s, evidence: o.evidence?.[i] ?? s.evidence })),
  };
}

export function parseLocale(value: unknown): Locale {
  return value === "pt-BR" ? "pt-BR" : "en";
}
