"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getDictionary, type Locale } from "./index";
import type { Dictionary } from "./en";

const KEY = "wokle:lang";

interface Ctx {
  locale: Locale;
  t: Dictionary;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<Ctx>({
  locale: "en",
  t: getDictionary("en"),
  setLocale: () => {},
});

/**
 * Picks the language: saved choice first, then the browser language
 * (Portuguese browsers get pt-BR), otherwise English.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "en" || saved === "pt-BR") {
        setLocaleState(saved);
        return;
      }
    } catch {
      /* storage unavailable */
    }
    if (navigator.language?.toLowerCase().startsWith("pt")) setLocaleState("pt-BR");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ locale, t: getDictionary(locale), setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;
