"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Countdown } from "@/components/Countdown";
import { Button, CategoryChip, ProgressBar } from "@/components/ui";
import { formatDateLong } from "@/lib/dates";
import { currentStreak } from "@/lib/stats";
import { useGame } from "@/lib/use-game";
import { useLocale } from "@/i18n/provider";

const DEFAULT_TYPES = ["headline", "real_or_fake", "who_am_i", "rights", "timeline"] as const;

export default function HomePage() {
  const { t, locale } = useLocale();
  const { session, history, today, state, reload } = useGame();

  if (state === "error") {
    return (
      <div className="py-20 text-center">
        <p className="text-mute">{t.errors.load}</p>
        <div className="mt-4">
          <Button onClick={() => void reload()}>{t.errors.retry}</Button>
        </div>
      </div>
    );
  }

  const answered = today?.answers.length ?? 0;
  const finished = !!today?.completed;
  const streak = session ? currentStreak(history, session.date) : 0;
  const types = session ? session.challenges.map((c) => c.type) : [...DEFAULT_TYPES];
  const scores: (number | null)[] = types.map((_, i) => today?.answers[i]?.score ?? null);
  const hasDemo = !!session?.challenges.some((c) => c.isDemo);

  return (
    <div className="pb-4">
      <section className="rise pt-8 text-center sm:pt-14">
        <Logo size="xl" />
        <p className="font-display mx-auto mt-5 max-w-md text-xl leading-snug sm:text-2xl">{t.slogan}</p>
        <p className="mt-2 text-sm text-mute">{t.slogan2}</p>
      </section>

      <section className="mt-10 flex items-end justify-between gap-3 border-y border-line py-3 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">{t.home.todayIs}</p>
          <p className="font-semibold">
            {session ? formatDateLong(session.date, locale === "pt-BR" ? "pt-BR" : "en-GB") : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">{t.home.issue}</p>
          <p className="font-semibold">#{session ? String(session.number).padStart(3, "0") : "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">{t.home.streak}</p>
          <p className="font-semibold">🔥 {streak}</p>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {types.map((type, i) => {
          const challenge = session?.challenges[i];
          const done = today?.answers[i];
          return (
            <div
              key={type}
              className="rise flex items-center gap-4 rounded-2xl border border-line bg-card p-4"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-black text-accent">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">{t.challenge[type].name}</p>
                <p className="text-sm text-mute">{t.challenge[type].hint}</p>
                {challenge && (
                  <div className="mt-2">
                    <CategoryChip slug={challenge.category} />
                  </div>
                )}
              </div>
              {done && (
                <span className={`text-sm font-bold tabular-nums ${done.score > 0 ? "text-good" : "text-bad"}`}>
                  {done.score}
                </span>
              )}
            </div>
          );
        })}
      </section>

      <section className="mt-6">
        <ProgressBar scores={scores} total={types.length} />
        <div className="mt-6 flex flex-col items-center gap-3">
          {finished ? (
            <Button href="/results" className="w-full sm:w-auto">{t.home.done}</Button>
          ) : (
            <Button href="/play" className="w-full sm:w-auto">
              {answered > 0 ? t.home.resume : t.home.start}
            </Button>
          )}
          {finished && session && (
            <p className="text-sm text-mute">
              {t.home.next} <Countdown timeZone={session.timezone} />
            </p>
          )}
          <Link href="/archive" className="text-sm font-semibold text-accent underline underline-offset-4">
            {t.archive.browse}
          </Link>
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-accent-soft p-6">
        <h2 className="font-display text-xl font-bold">{t.home.what}</h2>
        <p className="mt-2 leading-relaxed">{t.home.whatBody}</p>
      </section>

      {hasDemo && (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-3 text-xs text-mute">
          {t.home.demoBanner}
        </p>
      )}
    </div>
  );
}
