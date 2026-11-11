import { en, type Dictionary } from "./en";
import { ptBR } from "./pt-BR";
import type { ChallengeType, Locale } from "@/lib/content/types";

export type { Locale };

const dictionaries: Record<Locale, Dictionary> = { en, "pt-BR": ptBR };

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: Locale[] = ["en", "pt-BR"];

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? en;
}

/** Real/Fake labels come from the dictionary, so they follow the UI language. */
export function optionText(t: Dictionary, type: ChallengeType, id: string, text: string): string {
  if (type !== "real_or_fake") return text;
  return id === "real" ? t.challenge.real : t.challenge.fake;
}
