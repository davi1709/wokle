"use client";

import { CATEGORIES, categoryName } from "@/lib/categories";
import { ReportLink } from "@/components/ui";
import { useLocale } from "@/i18n/provider";

export function AboutContent() {
  const { t, locale } = useLocale();
  const a = t.about;
  return (
    <article className="pb-6 leading-relaxed">
      <h1 className="font-display pt-4 text-4xl font-black">{a.title}</h1>
      <p className="mt-4 text-lg">{a.intro}</p>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.wokeTitle}</h2>
      <p className="mt-2">{a.wokeBody}</p>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.challengesTitle}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {a.challengesList.map((c) => (
          <li key={c.name}><strong>{c.name}</strong>: {c.text}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-mute">{a.sameForAll}</p>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.principlesTitle}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {a.principles.map((p) => <li key={p}>{p}</li>)}
      </ul>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.checkedTitle}</h2>
      <p className="mt-2">{a.checkedBody}</p>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.correctionsTitle}</h2>
      <p className="mt-2">{a.correctionsBody}</p>
      <p className="mt-2"><ReportLink /></p>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.topicsTitle}</h2>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <li key={c.slug} className="text-sm">
            <span
              aria-hidden
              className="mr-2 inline-block h-2 w-2 rounded-full"
              style={{ background: `hsl(${c.hue} 65% 52%)` }}
            />
            {categoryName(c.slug, locale)}
          </li>
        ))}
      </ul>

      <h2 className="font-display mt-10 text-2xl font-bold">{a.privacyTitle}</h2>
      <p className="mt-2">{a.privacyBody}</p>
    </article>
  );
}
