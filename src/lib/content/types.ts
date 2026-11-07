/**
 * Content model. It mirrors the database schema in db/schema.sql so the demo
 * data (Phase 1) and the Supabase-backed content (Phase 2) share one shape.
 */

export type ChallengeType = "headline" | "real_or_fake" | "who_am_i";

export type VerificationStatus = "verified" | "needs_review" | "rejected";

export type SourceType =
  | "primary" // official / institutional / archive
  | "encyclopedia"
  | "news"
  | "academic";

export interface Source {
  title: string;
  publisher: string;
  url: string;
  /** Publication date of the source, ISO (YYYY or YYYY-MM-DD) when known. */
  publishedAt?: string;
  /** Date WOKLE last checked the source, ISO YYYY-MM-DD. */
  accessedAt: string;
  type: SourceType;
  /** One sentence: what exactly this source substantiates. */
  evidence: string;
}

export interface ChallengeOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/** Full record, including the answer. Server-side only. */
export interface Challenge {
  id: string;
  type: ChallengeType;
  /** Category slug, see src/lib/categories.ts */
  category: string;
  /** The question / statement shown to the player. */
  prompt: string;
  /** Only for who_am_i: exactly three clues, vague → specific. */
  clues?: string[];
  options: ChallengeOption[];
  explanation: string;
  /** Extra historical/social context shown after answering. */
  context: string;
  difficulty: 1 | 2 | 3;
  /** Rough geography, used by the diversity tracker. */
  region: string;
  /** Entities featured (people, organisations), used to avoid repetition. */
  entities: string[];
  verification: VerificationStatus;
  sources: Source[];
  /** Phase 1 content is hand-written and labelled as demo. */
  isDemo: boolean;
}

/** What the browser is allowed to see BEFORE answering. */
export interface PublicChallenge {
  id: string;
  type: ChallengeType;
  category: string;
  prompt: string;
  clues?: string[];
  options: { id: string; text: string }[];
  isDemo: boolean;
}

export interface PublicSession {
  /** YYYY-MM-DD in the publication timezone. */
  date: string;
  /** WOKLE #n */
  number: number;
  timezone: string;
  challenges: PublicChallenge[];
}

export type Locale = "en" | "pt-BR";

/**
 * Translation of one challenge. The factual record (ids, correct option,
 * sources, URLs) stays in the original; only the wording is translated.
 */
export interface Overlay {
  prompt: string;
  clues?: string[];
  /** option id → translated text (omitted for real_or_fake) */
  options?: Record<string, string>;
  explanation: string;
  context: string;
  /** One translated evidence line per source, same order. */
  evidence: string[];
}

/** What the browser gets AFTER answering. */
export interface AnswerFeedback {
  challengeId: string;
  correct: boolean;
  score: number;
  maxScore: number;
  correctOptionId: string;
  correctText: string;
  explanation: string;
  context: string;
  sources: Source[];
}
