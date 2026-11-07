"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { ReportLink } from "./ui";
import { useLocale, useT } from "@/i18n/provider";

export function Header() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-3 px-5 py-5">
      <Link href="/" aria-label="WOKLE">
        <Logo />
      </Link>
      <nav className="flex w-full items-center justify-between text-sm font-medium sm:w-auto sm:justify-start sm:gap-0.5">
        {[
          { href: "/play", label: t.nav.play },
          { href: "/archive", label: t.nav.archive },
          { href: "/stats", label: t.nav.stats },
          { href: "/about", label: t.nav.about },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-1.5 py-1.5 text-mute transition-colors hover:bg-accent-soft hover:text-ink min-[360px]:px-2 sm:px-3"
          >
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setLocale(locale === "en" ? "pt-BR" : "en")}
          aria-label={t.lang.switchTo}
          title={t.lang.switchTo}
          className="rounded-full border border-line px-2.5 py-1 text-xs sm:ml-1 font-bold text-ink transition-colors hover:bg-accent-soft"
        >
          {locale === "en" ? "PT" : "EN"}
        </button>
      </nav>
    </header>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="mx-auto mt-16 w-full max-w-2xl px-5 pb-10 text-xs text-mute">
      <div className="border-t border-line pt-5">
        <p>{t.footer.line}</p>
        <p className="mt-1">
          <ReportLink label={t.footer.feedback} />
        </p>
      </div>
    </footer>
  );
}
