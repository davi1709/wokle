import { NextResponse } from "next/server";
import { checkAnswer, InvalidAnswerError } from "@/lib/answer";
import { localize, parseLocale } from "@/lib/content/challenges";
import { getRepository, isInSession, resolvePlayableDate } from "@/lib/content/repository";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * Validates an answer and returns the feedback (correct option, explanation,
 * sources, score). Only challenges that belong to TODAY'S session can be
 * answered, so the endpoint cannot be used to browse answers for other days.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`answer:${clientKey(req)}`, 90);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { challengeId, selectedOptionId, cluesRevealed, order, lang, date: dateParam } = body as Record<string, unknown>;
  if (typeof challengeId !== "string" || challengeId.length > 100) {
    return NextResponse.json({ error: "Invalid challengeId" }, { status: 400 });
  }

  // Today by default; past days (archive) are allowed, future days are not.
  const date = resolvePlayableDate(dateParam);
  if (!date) {
    return NextResponse.json({ error: "Invalid or unavailable date" }, { status: 400 });
  }
  if (!isInSession(date, challengeId)) {
    return NextResponse.json({ error: "Challenge is not part of that day's session" }, { status: 404 });
  }

  const original = getRepository().getChallenge(challengeId);
  if (!original) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }
  const challenge = localize(original, parseLocale(lang));

  try {
    return NextResponse.json(checkAnswer(challenge, selectedOptionId, cluesRevealed, order), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof InvalidAnswerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[api/answer]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
