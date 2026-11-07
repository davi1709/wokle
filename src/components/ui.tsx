"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { categoryName, getCategory } from "@/lib/categories";
import type { Source } from "@/lib/content/types";
import { useLocale, useT } from "@/i18n/provider";

export function CategoryChip({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const c = getCategory(slug);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-mute">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `hsl(${c.hue} 65% 52%)` }} />
      {categoryName(slug, locale)}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)] ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:brightness-110"
      : "border border-line bg-card text-ink hover:bg-accent-soft";
  if (href) {
    return (
      <Link href={href} className={`${base} ${styles} ${className}`}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

function fmtDate(d: string | undefined, locale: string): string | null {
  if (!d) return null;
  if (/^\d{4}$/.test(d)) return d;
  const dt = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return d;
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dt);
}

export function SourceList({ sources }: { sources: Source[] }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <ul className="mt-3 space-y-3">
      {sources.map((s) => {
        const published = fmtDate(s.publishedAt, locale);
        return (
          <li key={s.url} className="rounded-xl border border-line p-3.5">
            <p className="text-sm font-semibold leading-snug">{s.title}</p>
            <p className="mt-0.5 text-xs text-mute">
              {s.publisher}
              {published ? ` · ${t.challenge.published} ${published}` : ""}
              {` · ${t.challenge.accessed} ${fmtDate(s.accessedAt, locale)}`}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-mute">{s.evidence}</p>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-4"
            >
              {t.challenge.readSource} ↗
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function ProgressBar({ scores, total = 3 }: { scores: (number | null)[]; total?: number }) {
  return (
    <div className="flex gap-1.5" role="img" aria-label={`${scores.filter((s) => s !== null).length} / ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const s = scores[i] ?? null;
        const color = s === null ? "bg-line" : s >= 100 ? "bg-good" : s > 0 ? "bg-warn" : "bg-bad";
        return <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${color}`} />;
      })}
    </div>
  );
}

/**
 * "Report an error" link. Set NEXT_PUBLIC_CONTACT_EMAIL (opens an e-mail) or
 * NEXT_PUBLIC_REPO_URL (opens a pre-filled GitHub issue). With neither set,
 * the link is hidden.
 */
export function ReportLink({ id, label }: { id?: string; label?: string }) {
  const t = useT();
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const repo = process.env.NEXT_PUBLIC_REPO_URL;
  const subject = id ? `WOKLE error report: ${id}` : "WOKLE feedback";
  const href = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : repo
      ? `${repo.replace(/\/$/, "")}/issues/new?title=${encodeURIComponent(subject)}`
      : null;
  if (!href) return null;
  return (
    <a
      href={href}
      target={email ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="text-xs font-semibold text-mute underline underline-offset-4 hover:text-ink"
    >
      {label ?? t.challenge.report}
    </a>
  );
}
