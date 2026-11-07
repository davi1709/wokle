"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CategoryChip, ReportLink, SourceList } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { buildShareText } from "@/lib/share";
import { currentStreak, dayScore, longestStreak } from "@/lib/stats";
import { MAX_DAILY_SCORE } from "@/lib/scoring";
import { useGame } from "@/lib/use-game";
import type { AnswerFeedback } from "@/lib/content/types";
import { useLocale } from "@/i18n/provider";
import { optionText } from "@/i18n";

/** Results of today (no `date`) or of a past day played from the archive. */
export function ResultsView({ date }: { date?: string }) {
  const { t, locale } = useLocale();
  const { session, history, today, state } = useGame(date);
  const [copied, setCopied] = useState(false);
  // Feedback re-fetched in the current language, keyed "<locale>:<challengeId>".
  const [fresh, setFresh] = useState<Record<string, AnswerFeedback>>({});

  // If the player switched language after answering, ask the server for the
  // same answer in the new language (same inputs → same score).
  useEffect(() => {
    if (!session || !today?.completed) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, AnswerFeedback> = {};
      for (const a of today.answers) {
        if (a.feedbackLang === locale) continue;
        try {
          const res = await fetch("/api/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              challengeId: a.challengeId,
              selectedOptionId: a.selectedOptionId,
              cluesRevealed: a.type === "who_am_i" ? a.cluesRevealed : undefined,
              lang: locale,
              date,
            }),
          });
          if (res.ok) out[`${locale}:${a.challengeId}`] = (await res.json()) as AnswerFeedback;
        } catch {
          /* keep the saved text */
        }
      }
      if (!cancelled && Object.keys(out).length) setFresh((prev) => ({ ...prev, ...out }));
    })();
    return () => {
      cancelled = true;
    };
  }, [session, today, locale, date]);

  if (state !== "ready" || !session) {
    return <p className="py-20 text-center text-mute">…</p>;
  }

  const playPath = date ? `/archive/${date}` : "/play";

  if (!today?.completed) {
    return (
      <div className="py-20 text-center">
        <p className="text-mute">{t.results.notFinished}</p>
        <div className="mt-4"><Button href={playPath}>{t.results.continue}</Button></div>
      </div>
    );
  }

  const score = dayScore(today);
  const correct = today.answers.filter((a) => a.correct).length;
  const streak = currentStreak(history, date ? session.date : session.date);
  const best = longestStreak(history);

  async function share() {
    const text = buildShareText({
      sessionNumber: session!.number,
      scores: today!.answers.map((a) => a.score),
      streak: date ? 0 : streak,
      url: process.env.NEXT_PUBLIC_SITE_URL,
      strings: t.share,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      /* user cancelled the share sheet: fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy:", text);
    }
  }

  return (
    <div className="pb-6">
      <section className="rise pt-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">
          {date ? `${t.archive.badge} · ` : ""}WOKLE #{String(session.number).padStart(3, "0")} · {t.results.title}
        </p>
        <p className="font-display mt-2 text-7xl font-black tabular-nums">
          {score}<span className="text-3xl text-mute">/{MAX_DAILY_SCORE}</span>
        </p>
        <div className="mt-3 flex justify-center gap-2 text-3xl" aria-hidden>
          {today.answers.map((a, i) => (
            <span key={i}>{a.score >= 100 ? "🟩" : a.score > 0 ? "🟨" : "🟥"}</span>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-4 gap-2 text-center">
        {[
          { label: t.results.correct, value: correct },
          { label: t.results.incorrect, value: today.answers.length - correct },
          { label: t.results.streak, value: `🔥${streak}` },
          { label: t.stats.longest, value: best },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-card px-1 py-3">
            <p className="font-display text-2xl font-black">{s.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mute">{s.label}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button onClick={() => void share()} className="w-full sm:w-auto">
          {copied ? t.results.copied : t.results.share}
        </Button>
        <p className="text-xs text-mute">{t.results.shareHint}</p>
        {date ? (
          <p className="mt-2 text-sm">
            <Link href="/archive" className="font-semibold text-accent underline underline-offset-4">
              {t.archive.back}
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm text-mute">
            {t.home.next} <Countdown timeZone={session.timezone} />
          </p>
        )}
      </div>

      <h2 className="font-display mt-10 text-2xl font-bold">{t.results.highlights}</h2>
      <div className="mt-3 space-y-4">
        {today.answers.map((a) => {
          const fb = a.feedbackLang === locale ? a.feedback : (fresh[`${locale}:${a.challengeId}`] ?? a.feedback);
          const ch = session.challenges.find((c) => c.id === a.challengeId);
          if (!fb || !ch) return null;
          return (
            <Card key={a.challengeId}>
              <div className="flex items-center justify-between gap-2">
                <CategoryChip slug={a.category} />
                <span className={`text-sm font-bold ${a.correct ? "text-good" : "text-bad"}`}>
                  {a.score} {t.challenge.points}
                </span>
              </div>
              <p className="mt-3 text-sm text-mute">{ch.type === "who_am_i" ? ch.clues?.[2] : ch.prompt}</p>
              <p className="mt-2 font-semibold">{optionText(t, ch.type, fb.correctOptionId, fb.correctText)}</p>
              <p className="mt-2 leading-relaxed">{fb.explanation}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-accent">
                  {t.challenge.sources} ({fb.sources.length})
                </summary>
                <SourceList sources={fb.sources} />
              </details>
              <div className="mt-3"><ReportLink id={a.challengeId} /></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
