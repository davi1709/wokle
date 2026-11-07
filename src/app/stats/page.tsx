"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { categoryName } from "@/lib/categories";
import { clearHistory } from "@/lib/storage";
import { summarise } from "@/lib/stats";
import { MAX_DAILY_SCORE } from "@/lib/scoring";
import { useGame } from "@/lib/use-game";
import { useLocale } from "@/i18n/provider";

export default function StatsPage() {
  const { t, locale } = useLocale();
  const { session, history, setHistory, state } = useGame();
  const [, force] = useState(0);

  if (state !== "ready" || !session) return <p className="py-20 text-center text-mute">…</p>;

  const s = summarise(history, session.date);

  return (
    <div className="pb-6">
      <h1 className="font-display pt-4 text-4xl font-black">{t.stats.title}</h1>

      {s.sessions === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-mute">{t.stats.empty}</p>
          <div className="mt-4"><Button href="/play">{t.home.start}</Button></div>
        </Card>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: t.stats.sessions, value: s.sessions },
              { label: t.stats.challenges, value: s.challengesAnswered },
              { label: t.stats.accuracy, value: `${Math.round(s.accuracy * 100)}%` },
              { label: t.stats.average, value: Math.round(s.averageScore) },
              { label: t.stats.current, value: `🔥 ${s.currentStreak}` },
              { label: t.stats.longest, value: s.longestStreak },
            ].map((x) => (
              <div key={x.label} className="rounded-2xl border border-line bg-card p-4">
                <p className="font-display text-3xl font-black tabular-nums">{x.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-mute">{x.label}</p>
              </div>
            ))}
          </section>

          <h2 className="font-display mt-10 text-2xl font-bold">{t.stats.performance}</h2>
          <Card className="mt-3">
            <div className="flex h-36 items-end gap-1.5" role="img" aria-label={t.stats.performance}>
              {s.timeline.slice(-30).map((p) => (
                <div key={p.date} className="group relative flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-accent transition-opacity group-hover:opacity-70"
                    style={{ height: `${Math.max(4, (p.score / MAX_DAILY_SCORE) * 100)}%` }}
                    title={`${p.date}: ${p.score}/${MAX_DAILY_SCORE}`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-mute">0 – {MAX_DAILY_SCORE}</p>
          </Card>

          <h2 className="font-display mt-10 text-2xl font-bold">{t.stats.favourite}</h2>
          <Card className="mt-3 space-y-3">
            {s.favouriteCategories.slice(0, 6).map((c) => (
              <div key={c.category}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{categoryName(c.category, locale)}</span>
                  <span className="tabular-nums text-mute">{c.correct}/{c.total}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(c.correct / c.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <p className="mt-8 text-xs text-mute">{t.stats.local}</p>
      {s.sessions > 0 && (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-bad underline underline-offset-4"
          onClick={() => {
            if (window.confirm(t.stats.resetConfirm)) {
              clearHistory();
              setHistory({});
              force((n) => n + 1);
            }
          }}
        >
          {t.stats.reset}
        </button>
      )}
    </div>
  );
}
