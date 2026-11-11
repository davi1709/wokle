"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { addDays, formatDateLong } from "@/lib/dates";
import { dayScore } from "@/lib/stats";
import { useGame } from "@/lib/use-game";
import { useLocale } from "@/i18n/provider";

const MAX_ROWS = 365;

export default function ArchivePage() {
  const { t, locale } = useLocale();
  const { session, history, state } = useGame();

  if (state !== "ready" || !session) return <p className="py-20 text-center text-mute">…</p>;

  // Past days only (today lives on the home page). #1 is the launch day.
  const days: { date: string; number: number }[] = [];
  for (let n = session.number - 1; n >= 1 && days.length < MAX_ROWS; n--) {
    days.push({ date: addDays(session.date, n - session.number), number: n });
  }
  const fmt = locale === "pt-BR" ? "pt-BR" : "en-GB";

  return (
    <div className="pb-6">
      <h1 className="font-display pt-4 text-4xl font-black">{t.archive.title}</h1>
      <p className="mt-3 text-mute">{t.archive.intro}</p>

      {days.length === 0 ? (
        <Card className="mt-6 text-center text-mute">{t.archive.empty}</Card>
      ) : (
        <ul className="mt-6 space-y-2">
          {days.map((d) => {
            const saved = history[d.date];
            const done = !!saved?.completed;
            const started = !done && (saved?.answers.length ?? 0) > 0;
            return (
              <li key={d.date}>
                <Link
                  href={done ? `/archive/${d.date}/results` : `/archive/${d.date}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 transition-colors hover:bg-accent-soft"
                >
                  <span>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
                      WOKLE #{String(d.number).padStart(3, "0")}
                    </span>
                    <span className="font-semibold">{formatDateLong(d.date, fmt)}</span>
                  </span>
                  <span className={`text-sm font-bold ${done ? "text-good" : "text-accent"}`}>
                    {done ? `${dayScore(saved)}/${saved.answers.length * 100} · ${t.archive.view}` : started ? t.archive.resume : t.archive.play}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
