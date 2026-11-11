"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CategoryChip, OrderList, ProgressBar, ReportLink, SourceList } from "@/components/ui";
import { saveAnswer } from "@/lib/storage";
import { useGame } from "@/lib/use-game";
import { WHO_AM_I_POINTS } from "@/lib/scoring";
import { formatDateLong } from "@/lib/dates";
import type { AnswerFeedback, PublicChallenge } from "@/lib/content/types";
import { useLocale } from "@/i18n/provider";
import { optionText } from "@/i18n";

/** The game itself. `date` is set only when playing a past day (archive). */
export function PlayView({ date }: { date?: string }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { session, today, setHistory, state, reload } = useGame(date);
  const base = date ? `/archive/${date}` : "";

  const [view, setView] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [clues, setClues] = useState(1);
  const [order, setOrder] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAnswered, setJustAnswered] = useState<AnswerFeedback | null>(null);

  const answeredCount = today?.answers.length ?? 0;

  // Resume at the first unanswered challenge.
  useEffect(() => {
    if (state !== "ready" || !session || view !== null) return;
    if (answeredCount >= session.challenges.length) router.replace(`${base}/results`);
    else setView(answeredCount);
  }, [state, session, answeredCount, view, router, base]);

  const challenge: PublicChallenge | undefined =
    session && view !== null ? session.challenges[view] : undefined;

  // Timeline: start from the order the server sent, reset for every challenge.
  const challengeId = challenge?.id;
  useEffect(() => {
    if (challenge?.type === "timeline") setOrder(challenge.options.map((o) => o.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  const scores = useMemo<(number | null)[]>(
    () => (session?.challenges ?? []).map((_, i) => today?.answers[i]?.score ?? null),
    [today, session],
  );

  if (state === "error") {
    return (
      <div className="py-20 text-center">
        <p className="text-mute">{t.errors.load}</p>
        <div className="mt-4"><Button onClick={() => void reload()}>{t.errors.retry}</Button></div>
      </div>
    );
  }
  if (!session || !challenge || view === null) {
    return <p className="py-20 text-center text-mute">…</p>;
  }

  const isLast = view === session.challenges.length - 1;
  const feedback = justAnswered?.challengeId === challenge.id ? justAnswered : null;

  async function submit() {
    const isTimeline = challenge?.type === "timeline";
    const picked = isTimeline ? order.join(",") : selected;
    if (!picked || !challenge || !session) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          selectedOptionId: picked,
          cluesRevealed: challenge.type === "who_am_i" ? clues : undefined,
          order: isTimeline ? order : undefined,
          lang: locale,
          date,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const fb = (await res.json()) as AnswerFeedback;
      const history = saveAnswer(
        session.date,
        session.number,
        {
          challengeId: challenge.id,
          type: challenge.type,
          category: challenge.category,
          selectedOptionId: picked,
          order: isTimeline ? order : undefined,
          correct: fb.correct,
          score: fb.score,
          cluesRevealed: clues,
          feedback: fb,
          feedbackLang: locale,
        },
        session.challenges.length,
        !date, // days played from the archive never count for streaks
      );
      setHistory(history);
      setJustAnswered(fb);
    } catch {
      setError(t.errors.load);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (isLast) {
      router.push(`${base}/results`);
      return;
    }
    setView((view ?? 0) + 1);
    setSelected(null);
    setClues(1);
    setOrder([]);
    setJustAnswered(null);
  }

  const potential = challenge.type === "who_am_i" ? WHO_AM_I_POINTS[clues - 1] : 100;
  const isTimeline = challenge.type === "timeline";
  const optionById = new Map(challenge.options.map((o) => [o.id, o.text]));
  const move = (i: number, d: number) =>
    setOrder((o) => {
      const j = i + d;
      if (j < 0 || j >= o.length) return o;
      const c = [...o];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const label = (id: string, text: string) => optionText(t, challenge.type, id, text);

  return (
    <div className="pb-6">
      {date && (
        <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-xs font-semibold text-accent">
          {t.archive.badge} · #{String(session.number).padStart(3, "0")} ·{" "}
          {formatDateLong(session.date, locale === "pt-BR" ? "pt-BR" : "en-GB")}
        </p>
      )}
      <div className="rise">
        <ProgressBar scores={scores} total={session.challenges.length} />
        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            {view + 1} {t.challenge.of} {session.challenges.length} · {t.challenge[challenge.type].name}
          </p>
          <CategoryChip slug={challenge.category} />
        </div>
      </div>

      <Card className="rise mt-4" key={challenge.id}>
        {challenge.type === "who_am_i" ? (
          <div>
            <h1 className="font-display text-3xl font-black">{challenge.prompt}</h1>
            <ol className="mt-4 space-y-3">
              {challenge.clues?.slice(0, clues).map((c, i) => (
                <li key={i} className="pop rounded-xl bg-accent-soft p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {t.challenge.clue} {i + 1}
                  </p>
                  <p className="mt-1 leading-relaxed">{c}</p>
                </li>
              ))}
            </ol>
            {!feedback && clues < (challenge.clues?.length ?? 3) && (
              <div className="mt-3">
                <Button variant="ghost" onClick={() => setClues(clues + 1)} className="w-full !py-2.5 text-sm">
                  {t.challenge.revealClue} ({WHO_AM_I_POINTS[clues]} {t.challenge.points})
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {challenge.type === "rights" && (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">{t.challenge.hypothetical}</p>
            )}
            <h1 className="font-display text-2xl font-bold leading-snug sm:text-3xl">{challenge.prompt}</h1>
          </>
        )}

        {isTimeline && (
          <div className="mt-5">
            <p className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-mute">
              <span>↑ {t.challenge.oldest}</span>
            </p>
            <ol className="mt-2 space-y-2.5">
              {order.map((id, i) => (
                <li key={id} className="flex items-stretch gap-2 rounded-xl border-2 border-line px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full border border-current text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 self-center font-medium">{optionById.get(id)}</span>
                  {!feedback && (
                    <span className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || busy}
                        aria-label={`${t.challenge.moveUp}: ${optionById.get(id)}`}
                        className="h-8 w-10 rounded-lg border border-line text-sm font-bold hover:bg-accent-soft disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === order.length - 1 || busy}
                        aria-label={`${t.challenge.moveDown}: ${optionById.get(id)}`}
                        className="h-8 w-10 rounded-lg border border-line text-sm font-bold hover:bg-accent-soft disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-mute">↓ {t.challenge.newest}</p>
          </div>
        )}

        <fieldset className="mt-5" disabled={!!feedback || busy} hidden={isTimeline}>
          <legend className="sr-only">{t.challenge[challenge.type].hint}</legend>
          <div className={challenge.type === "real_or_fake" ? "grid grid-cols-2 gap-3" : "space-y-2.5"}>
            {challenge.options.map((o, i) => {
              const isSel = selected === o.id;
              const isCorrect = feedback?.correctOptionId === o.id;
              const isWrongPick = !!feedback && isSel && !feedback.correct;
              const look = feedback
                ? isCorrect
                  ? "border-good bg-good-soft"
                  : isWrongPick
                    ? "border-bad bg-bad-soft"
                    : "border-line opacity-60"
                : isSel
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:border-accent hover:bg-accent-soft/50";
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelected(o.id)}
                  aria-pressed={isSel}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left font-medium transition-colors ${look} ${
                    challenge.type === "real_or_fake" ? "justify-center text-lg font-bold" : ""
                  }`}
                >
                  {challenge.type !== "real_or_fake" && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                      {"ABCD"[i]}
                    </span>
                  )}
                  <span>{label(o.id, o.text)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {!feedback && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-mute">
              {potential} {t.challenge.points}
            </p>
            <Button onClick={() => void submit()} disabled={(!isTimeline && !selected) || busy}>
              {t.challenge.submit}
            </Button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      </Card>

      {feedback && (
        <Card className="pop mt-4">
          <div className="flex items-baseline justify-between">
            <p className={`font-display text-2xl font-black ${feedback.correct ? "text-good" : feedback.score > 0 ? "text-warn" : "text-bad"}`}>
              {feedback.correct ? t.challenge.correct : feedback.score > 0 ? t.challenge.partial : t.challenge.incorrect}
            </p>
            <p className="text-sm font-bold tabular-nums">
              +{feedback.score} {t.challenge.points}
            </p>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-mute">
            {isTimeline ? t.challenge.correctOrder : t.challenge.answer}
          </p>
          {isTimeline && feedback.correctOrder ? (
            <OrderList items={feedback.correctOrder} />
          ) : (
            <p className="font-semibold">{label(feedback.correctOptionId, feedback.correctText)}</p>
          )}
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-mute">{t.challenge.explanation}</p>
          <p className="mt-1 leading-relaxed">{feedback.explanation}</p>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-mute">{t.challenge.context}</p>
          <p className="mt-1 leading-relaxed text-mute">{feedback.context}</p>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-mute">{t.challenge.sources}</p>
          <SourceList sources={feedback.sources} />
          <div className="mt-6 flex items-center justify-between gap-3">
            <ReportLink id={challenge.id} />
            <Button onClick={next}>{isLast ? t.challenge.seeResults : t.challenge.next}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
